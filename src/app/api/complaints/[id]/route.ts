import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

// GET — Protected: single complaint with notes + history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { id } = await params;
    const complaintId = parseInt(id);
    if (isNaN(complaintId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        notes: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        history: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!complaint) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userRoles = (payload.role || "").split(",").map(r => r.trim());
    const isManager = userRoles.some(r => ["Admin", "HR", "Accountant", "Sales & Marketing Department", "Super Admin", "Management"].includes(r));
    const isFieldStaffOnly = userRoles.includes("Field Staff") && !isManager;

    if (isFieldStaffOnly && complaint.assignedToId !== payload.userId) {
      return NextResponse.json({ error: "Access denied: this complaint is not assigned to you." }, { status: 403 });
    }

    return NextResponse.json({ success: true, complaint });
  } catch (error) {
    console.error("Complaint GET [id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — Protected: update status, priority, assignedToId
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { id } = await params;
    const complaintId = parseInt(id);
    if (isNaN(complaintId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const existing = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userRoles = (payload.role || "").split(",").map(r => r.trim());
    const isManager = userRoles.some(r => ["Admin", "HR", "Accountant", "Sales & Marketing Department", "Super Admin", "Management"].includes(r));
    const isFieldStaffOnly = userRoles.includes("Field Staff") && !isManager;

    if (isFieldStaffOnly) {
      if (existing.assignedToId !== payload.userId) {
        return NextResponse.json({ error: "Access denied: this complaint is not assigned to you." }, { status: 403 });
      }
    }

    const body = await req.json();
    const {
      status,
      priority,
      assignedToId,
      resolutionProof,
      category,
      subject,
      description,
      fullName,
      phone,
      email,
      address,
      projectId,
      installedBy,
      contactMethod,
      contactTime
    } = body;

    if (isFieldStaffOnly) {
      // Field Staff are only allowed to update status. Reject priority or assignedToId changes.
      if (priority && priority !== existing.priority) {
        return NextResponse.json({ error: "Access denied: you cannot modify complaint priority." }, { status: 403 });
      }
      if (assignedToId !== undefined && assignedToId !== existing.assignedToId) {
        return NextResponse.json({ error: "Access denied: you cannot modify complaint assignment." }, { status: 403 });
      }
    }

    if (["Resolved", "Closed"].includes(status) && status !== existing.status) {
      if (!resolutionProof && !existing.resolutionProof) {
        return NextResponse.json({ error: "Resolution proof file is mandatory before resolving complaint." }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    const historyEntries: Array<{
      complaintId: number;
      changedById: number;
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    if (status && status !== existing.status) {
      updateData.status = status;
      historyEntries.push({
        complaintId,
        changedById: payload.userId,
        field: "status",
        oldValue: existing.status,
        newValue: status,
      });
    }

    if (resolutionProof && resolutionProof !== existing.resolutionProof) {
      updateData.resolutionProof = resolutionProof;
      historyEntries.push({
        complaintId,
        changedById: payload.userId,
        field: "resolutionProof",
        oldValue: existing.resolutionProof,
        newValue: resolutionProof,
      });
    }

    if (priority && priority !== existing.priority) {
      updateData.priority = priority;
      historyEntries.push({
        complaintId,
        changedById: payload.userId,
        field: "priority",
        oldValue: existing.priority,
        newValue: priority,
      });
    }

    if (assignedToId !== undefined) {
      const newAssignedId = assignedToId === null ? null : parseInt(assignedToId);
      if (newAssignedId !== existing.assignedToId) {
        updateData.assignedToId = newAssignedId;
        historyEntries.push({
          complaintId,
          changedById: payload.userId,
          field: "assignedTo",
          oldValue: existing.assignedToId ? String(existing.assignedToId) : null,
          newValue: newAssignedId ? String(newAssignedId) : null,
        });
      }
    }

    if (category !== undefined) updateData.category = category;
    if (subject !== undefined) updateData.subject = subject;
    if (description !== undefined) updateData.description = description;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (projectId !== undefined) updateData.projectId = projectId;
    if (installedBy !== undefined) updateData.installedBy = installedBy;
    if (contactMethod !== undefined) updateData.contactMethod = contactMethod;
    if (contactTime !== undefined) updateData.contactTime = contactTime;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: "No changes" });
    }

    const [updated] = await prisma.$transaction([
      prisma.complaint.update({ where: { id: complaintId }, data: updateData }),
      ...historyEntries.map((h) => prisma.complaintHistory.create({ data: h })),
    ]);

    return NextResponse.json({ success: true, complaint: updated });
  } catch (error) {
    console.error("Complaint PATCH [id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
