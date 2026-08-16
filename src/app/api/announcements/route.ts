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

    // Fetch recent activity audit logs
    const auditLogs = await prisma.auditLog.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true, role: true, department: true },
        },
      },
    });

    return NextResponse.json({ success: true, announcements, auditLogs });
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

    const userRoles = (payload.role || "").split(",").map((r) => r.trim().toLowerCase());
    const isPrivileged = userRoles.some((r) =>
      ["admin", "super admin", "superadmin", "management", "hr"].includes(r)
    );
    if (!isPrivileged) {
      return NextResponse.json({ error: "Forbidden: Unauthorized to publish announcements" }, { status: 403 });
    }

    const { title, content, department, attachmentUrl, isPinned } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        department: department || "All",
        attachmentUrl: attachmentUrl || null,
        isPinned: !!isPinned,
        createdById: payload.userId,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "ANNOUNCEMENT_POST",
        details: `Published company notice "${title}" for department: ${department || "All"}`,
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
