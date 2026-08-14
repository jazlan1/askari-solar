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

    const { role, userId } = payload;
    const { searchParams } = new URL(req.url);

    const userRoles = (role || "").split(",").map(r => r.trim());
    const isManager = userRoles.some(r => ["Admin", "HR", "Accountant", "Sales & Marketing Department", "Super Admin", "Management"].includes(r));

    if (!isManager) {
      // Field Staff: Return only their assigned tasks
      const tasks = await prisma.task.findMany({
        where: {
          assignedTo: {
            some: { id: userId }
          }
        },
        orderBy: { dueDate: "asc" },
        include: {
          assignedBy: { select: { name: true, role: true } },
          assignedTo: { select: { id: true, name: true, role: true, department: true } },
        },
      });

      return NextResponse.json({ success: true, tasks });
    }

    // Manager View: Fetch all tasks with optional filters
    const assignedToIdParam = searchParams.get("assignedToId");
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const searchQuery = searchParams.get("search");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let whereClause: any = {};

    if (assignedToIdParam) {
      whereClause.assignedTo = {
        some: { id: parseInt(assignedToIdParam) }
      };
    }
    if (statusParam) {
      whereClause.status = statusParam;
    }
    if (priorityParam) {
      whereClause.priority = priorityParam;
    }
    if (searchQuery) {
      whereClause.OR = [
        { title: { contains: searchQuery } },
        { description: { contains: searchQuery } },
      ];
    }
    if (startDateParam && endDateParam) {
      whereClause.dueDate = {
        gte: startDateParam,
        lte: endDateParam,
      };
    }

    const [tasks, fieldStaff] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          assignedBy: { select: { name: true, role: true } },
          assignedTo: { select: { name: true, role: true, department: true } },
        },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ success: true, tasks, fieldStaff });
  } catch (error: any) {
    console.error("Tasks GET error:", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
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

    const userRoles = (payload.role || "").split(",").map(r => r.trim());
    const isManager = userRoles.some(r => ["Admin", "HR", "Accountant", "Sales & Marketing Department", "Super Admin", "Management"].includes(r));
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden: Only authorized roles can assign tasks" }, { status: 403 });
    }

    const { title, description, priority, dueDate, assignedToIds, attachmentUrl, charges, clientName, clientNumber, clientLocation } = await req.json();

    if (!title || !description || !priority || !dueDate || !assignedToIds || !Array.isArray(assignedToIds) || assignedToIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields (title, description, priority, dueDate, assignees)" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        dueDate,
        assignedById: payload.userId,
        assignedTo: {
          connect: assignedToIds.map((id: any) => ({ id: parseInt(id.toString()) }))
        },
        charges: charges || null,
        clientName: clientName || null,
        clientNumber: clientNumber || null,
        clientLocation: clientLocation || null,
        attachmentUrl: attachmentUrl || null,
        status: "Pending",
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        action: "TASK_ASSIGNED",
        details: `Assigned task "${title}" to User IDs: ${assignedToIds.join(", ")}.`,
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Task creation error:", error);
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
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, action, completionPhoto, completionNotes } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id: parseInt(taskId.toString()) },
      include: { assignedTo: { select: { id: true } } },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const userRoles = (payload.role || "").split(",").map(r => r.trim());
    const isManager = userRoles.some(r => ["Admin", "HR", "Accountant", "Sales & Marketing Department", "Super Admin", "Management"].includes(r));
    const isFieldStaffOnly = userRoles.includes("Field Staff") && !isManager;

    // 1. Worker completing their task
    if (isFieldStaffOnly) {
      const isAssignee = existingTask.assignedTo.some((u: any) => u.id === payload.userId);
      if (!isAssignee) {
        return NextResponse.json({ error: "Unauthorized to complete this task" }, { status: 403 });
      }

      if (!completionPhoto) {
        return NextResponse.json({ error: "Upload proof is mandatory before completing task." }, { status: 400 });
      }

      const updated = await prisma.task.update({
        where: { id: existingTask.id },
        data: {
          status: "Completed",
          completionPhoto: completionPhoto || null,
          completionNotes: completionNotes || null,
          completedAt: new Date(),
        },
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: "TASK_COMPLETED",
          details: `Completed task ID ${taskId}: "${existingTask.title}".`,
        },
      });

      return NextResponse.json({ success: true, task: updated });
    }

    // 2. Manager updating task status/deleting/reviewing
    if (!isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "DELETE") {
      await prisma.task.delete({
        where: { id: existingTask.id },
      });

      await prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: "TASK_DELETED",
          details: `Deleted task ID ${taskId}: "${existingTask.title}".`,
        },
      });

      return NextResponse.json({ success: true, message: "Task deleted successfully" });
    }

    // Otherwise, edit general details or review task
    const { title, description, priority, dueDate, status, assignedToIds, charges, clientName, clientNumber, clientLocation } = body;
    
    const updateData: any = {
      title: title !== undefined ? title : undefined,
      description: description !== undefined ? description : undefined,
      priority: priority !== undefined ? priority : undefined,
      dueDate: dueDate !== undefined ? dueDate : undefined,
      status: status !== undefined ? status : undefined,
      charges: charges !== undefined ? charges : undefined,
      clientName: clientName !== undefined ? clientName : undefined,
      clientNumber: clientNumber !== undefined ? clientNumber : undefined,
      clientLocation: clientLocation !== undefined ? clientLocation : undefined,
    };

    if (assignedToIds !== undefined) {
      if (Array.isArray(assignedToIds)) {
        updateData.assignedTo = {
          set: assignedToIds.map((id: any) => ({ id: parseInt(id.toString()) }))
        };
      }
    }

    const updated = await prisma.task.update({
      where: { id: existingTask.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (error) {
    console.error("Task update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
