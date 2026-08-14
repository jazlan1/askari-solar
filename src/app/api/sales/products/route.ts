import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function getUploadsDirs() {
  const rootDir = process.cwd();
  
  const isInsideStandalone =
    rootDir.endsWith(".next/standalone") ||
    rootDir.endsWith(".next\\standalone") ||
    fs.existsSync(path.join(rootDir, "server.js"));

  let portalRoot = rootDir;
  let current = rootDir;
  for (let i = 0; i < 10; i++) {
    const buildsPath = path.join(current, ".builds");
    if (fs.existsSync(buildsPath) && fs.statSync(buildsPath).isDirectory()) {
      portalRoot = current;
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  let outerUploadsDir: string;
  let standaloneUploadsDir: string;

  if (isInsideStandalone) {
    standaloneUploadsDir = path.join(rootDir, "public", "uploads");
    outerUploadsDir = path.join(portalRoot, "public", "uploads");
  } else {
    standaloneUploadsDir = path.join(rootDir, ".next", "standalone", "public", "uploads");
    outerUploadsDir = path.join(portalRoot, "public", "uploads");
  }

  return {
    outerUploadsDir,
    standaloneUploadsDir,
  };
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userRoles = (payload.role || "").split(",").map(r => r.trim());
    const isHrOrAdmin = userRoles.some(r => ["Admin", "HR", "Sales & Marketing Department", "Management", "Super Admin"].includes(r));
    if (!isHrOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Unauthorized role" }, { status: 403 });
    }

    const body = await req.json();
    const { products, headers } = body; // products: array of rows, headers: array of column names

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: "Missing products array" }, { status: 400 });
    }

    // 1. Process database updates
    const currentProductIds = products
      .map((p: any) => p.id)
      .filter((id: any) => id !== undefined && id !== null);

    // Delete products that are no longer in the grid
    await prisma.product.deleteMany({
      where: {
        id: {
          notIn: currentProductIds.map((id: any) => parseInt(id.toString())),
        },
      },
    });

    const savedProducts = [];

    for (const row of products) {
      const id = row.id ? parseInt(row.id.toString()) : undefined;
      const parsedStock = parseInt(row.stock?.toString() || "0");
      const parsedRate = parseFloat(row.rate?.toString() || "0");
      const parsedPurchasePrice = parseFloat(row.purchasePrice?.toString() || "0");
      const parsedWholesalePrice = parseFloat(row.wholesalePrice?.toString() || "0");
      
      const productData = {
        category: row.category || "Other",
        brand: row.brand || "",
        name: row.name || "",
        spec: row.spec || "",
        stock: isNaN(parsedStock) ? 0 : parsedStock,
        rate: isNaN(parsedRate) ? 0 : parsedRate,
        purchasePrice: isNaN(parsedPurchasePrice) ? null : parsedPurchasePrice,
        wholesalePrice: isNaN(parsedWholesalePrice) ? null : parsedWholesalePrice,
        warranty: row.warranty || "",
      };

      if (id) {
        // Update existing product
        const updated = await prisma.product.update({
          where: { id },
          data: productData,
        });
        savedProducts.push(updated);
      } else {
        // Create new product
        const created = await prisma.product.create({
          data: productData,
        });
        savedProducts.push(created);
        
        // Attach auto-incremented ID to the row so it maps correctly in Excel
        row.id = created.id;
      }
    }

    // 2. Generate and overwrite static Excel file (Price Lists.xlsx)
    // We clean rows of database attributes that aren't headers, but we keep custom columns
    const excelRows = products.map((row: any) => {
      const cleanRow: any = {};
      
      // Order headers as requested, standard ones first
      const displayHeaders = headers || ["category", "brand", "name", "spec", "purchasePrice", "wholesalePrice", "rate", "warranty"];
      
      displayHeaders.forEach((col: string) => {
        cleanRow[col] = row[col] !== undefined ? row[col] : "";
      });
      return cleanRow;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);
    XLSX.utils.book_append_sheet(wb, ws, "Price List");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const { outerUploadsDir, standaloneUploadsDir } = getUploadsDirs();
    const relativeSubPath = "Price Lists.xlsx";
    const outerPath = path.join(outerUploadsDir, relativeSubPath);
    const standalonePath = path.join(standaloneUploadsDir, relativeSubPath);

    await fs.promises.mkdir(path.dirname(outerPath), { recursive: true });
    await fs.promises.writeFile(outerPath, excelBuffer);

    await fs.promises.mkdir(path.dirname(standalonePath), { recursive: true });
    await fs.promises.writeFile(standalonePath, excelBuffer);

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "PRICE_LIST_UPDATED",
        details: `Updated Product Price list tables and regenerated Price Lists.xlsx. Rows: ${excelRows.length}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Products saved and Excel generated successfully.",
      count: savedProducts.length,
    });
  } catch (error: any) {
    console.error("Products pricing POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
