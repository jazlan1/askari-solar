import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Parallel queries
    const [trainingFiles, products, adFiles, quotationFiles] = await Promise.all([
      prisma.fileItem.findMany({
        where: {
          department: "Sales",
          docType: "Training",
        },
        orderBy: { isFolder: "desc" },
      }),
      prisma.product.findMany({
        orderBy: { category: "asc" },
      }),
      prisma.fileItem.findMany({
        where: {
          docType: "Advertisements",
        },
        orderBy: { isFolder: "desc" },
      }),
      prisma.fileItem.findMany({
        where: {
          docType: "Quotations",
        },
        orderBy: { isFolder: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      trainingFiles,
      products,
      adFiles,
      quotationFiles,
    });
  } catch (error) {
    console.error("Sales data fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
