import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { hashPassword } from "@/lib/hash";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
        documents: true,
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Users GET error:", error);
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
    const userRoles = (payload?.role || "").split(",").map(r => r.trim());
    if (!payload || !userRoles.some(r => ["Admin", "Super Admin", "HR"].includes(r))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, department, documents } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashPassword(password),
        role,
        department: department || "None",
        documents: documents || null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "CREATE_USER",
        details: `Created user ${name} (${email}) with role ${role}.`,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
      },
    });
  } catch (error) {
    console.error("User create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const userRoles = (payload?.role || "").split(",").map(r => r.trim());
    if (!payload || !userRoles.some(r => ["Admin", "Super Admin", "HR"].includes(r))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, role, department, password, documents } = body;

    if (!id || !name || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing && existing.id !== parseInt(id)) {
      return NextResponse.json(
        { error: "This email is already in use by another user" },
        { status: 400 }
      );
    }

    const updateData: any = {
      name,
      email: email.toLowerCase().trim(),
      role,
      department: department || "None",
      documents: documents !== undefined ? documents : undefined,
    };

    if (password && password.trim() !== "") {
      updateData.password = hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "UPDATE_USER",
        details: `Updated user ID ${id}: Name=${name}, Role=${role}, Dept=${department}.`,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const userRoles = (payload?.role || "").split(",").map(r => r.trim());
    if (!payload || !userRoles.some(r => ["Admin", "Super Admin"].includes(r))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userIdStr = searchParams.get("id");
    if (!userIdStr) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const targetUserId = parseInt(userIdStr);
    if (targetUserId === payload.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Disconnect user from relation references first to prevent DB FK constraint errors
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { userId: targetUserId } }),
      prisma.auditLog.deleteMany({ where: { userId: targetUserId } }),
      prisma.announcement.deleteMany({ where: { createdById: targetUserId } }),
      prisma.task.deleteMany({
        where: { assignedById: targetUserId }
      }),
      prisma.complaint.updateMany({
        where: { assignedToId: targetUserId },
        data: { assignedToId: null }
      }),
      prisma.complaintNote.deleteMany({
        where: { authorId: targetUserId }
      }),
      prisma.complaintHistory.updateMany({
        where: { changedById: targetUserId },
        data: { changedById: null }
      }),
      prisma.fileItem.updateMany({
        where: { uploadedById: targetUserId },
        data: { uploadedById: null }
      }),
      prisma.lead.updateMany({
        where: { salesPersonId: targetUserId },
        data: { salesPersonId: null }
      }),
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          receivedTasks: { set: [] }
        }
      }),
      prisma.user.delete({ where: { id: targetUserId } }),
    ]);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "DELETE_USER",
        details: `Deleted user ${targetUser.name} (${targetUser.email}).`,
      },
    });

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("User delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
