import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET — Public: list field staff members for the feedback form
// No authentication required — this is used on the public feedback page
export async function GET(req: NextRequest) {
  try {
    const fieldStaff = await prisma.user.findMany({
      where: {
        role: { contains: "Field" },
      },
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, fieldStaff });
  } catch (error: any) {
    console.error("Field staff list error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
