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

    // Employees only see announcements matching "All" or their specific department
    const userDept = payload.department || "Sales";
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { department: "All" },
          { department: userDept },
        ],
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        createdBy: {
          select: { name: true, role: true },
        },
      },
    });

    return NextResponse.json({ success: true, announcements });
  } catch (error) {
    console.error("Announcements GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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

    // Restrict publishing to Super Admin, Admin, Management, and HR
    const isPrivileged = ["Super Admin", "Admin", "Management", "HR"].includes(payload.role);
    if (!isPrivileged) {
      return NextResponse.json({ error: "Forbidden: Unauthorized to publish announcements" }, { status: 403 });
    }

    const { title, content, department, attachmentUrl, isPinned } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        department: department || "All",
        attachmentUrl: attachmentUrl || null,
        isPinned: !!isPinned,
        createdById: payload.userId,
      },
    });

    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    console.error("Announcement CREATE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
