import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

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

    // Fetch announcements, tasks, and files in parallel
    const [announcements, tasks, files] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
        take: 2,
        include: { createdBy: { select: { name: true } } },
      }),
      prisma.task.findMany({
        where: {
          assignedTo: { some: { id: payload.userId } },
          status: "Pending",
        },
        orderBy: { createdAt: "desc" },
        take: 2,
      }),
      prisma.fileItem.findMany({
        where: { isFolder: false },
        orderBy: { createdAt: "desc" },
        take: 2,
      }),
    ]);

    const notifications: any[] = [];

    announcements.forEach((a) => {
      notifications.push({
        id: `ann-${a.id}`,
        title: "New Announcement",
        content: a.title,
        time: formatTimeAgo(a.createdAt),
        read: false,
      });
    });

    tasks.forEach((t) => {
      notifications.push({
        id: `task-${t.id}`,
        title: "New Task Assigned",
        content: t.title,
        time: formatTimeAgo(t.createdAt),
        read: false,
      });
    });

    files.forEach((f) => {
      notifications.push({
        id: `file-${f.id}`,
        title: "File Uploaded",
        content: f.name,
        time: formatTimeAgo(f.createdAt),
        read: false,
      });
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
