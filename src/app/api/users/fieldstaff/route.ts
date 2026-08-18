import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET — Public: list field staff and technicians for the customer feedback form
// No authentication required — used on public feedback page
export async function GET(req: NextRequest) {
  try {
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    // Exclude Admin and Super Admin, include all technicians, TAs, field staff, etc.
    const fieldStaff = (allUsers || []).filter((u) => {
      const roles = (u.role || "").split(",").map((r) => r.trim());
      return !roles.some((r) => ["Admin", "Super Admin"].includes(r));
    });

    return NextResponse.json({ success: true, fieldStaff });
  } catch (error: any) {
    console.error("Field staff list error:", error);
    return NextResponse.json(
      { success: false, fieldStaff: [], error: error?.message || "Error fetching field staff" },
      { status: 200 }
    );
  }
}
