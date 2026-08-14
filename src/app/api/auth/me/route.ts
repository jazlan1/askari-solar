import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
        },
      });

      if (user) {
        return NextResponse.json({ success: true, user });
      }
      
      console.warn("User not found in DB, falling back to JWT payload:", payload.email);
    } catch (dbError) {
      console.error("Database error in /api/auth/me, falling back to JWT payload:", dbError);
    }

    // Fallback: use verified payload fields directly if DB lookup failed
    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        name: payload.name || "User",
        email: payload.email,
        role: payload.role || "Employee",
        department: payload.department || "None",
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

