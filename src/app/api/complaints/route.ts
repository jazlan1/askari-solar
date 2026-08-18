import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

// Combined list: matches both frontend labels and any legacy production data
const COMPLAINT_CATEGORIES = [
  "Inverter Problem",
  "Solar Panel Problem",
  "Battery Problem",
  "Monitoring/App Problem",
  "Wiring Problem",
  "Installation Problem",
  "Netmetering/Net billing problem",
  "IESCO Bill Issue",
  "Service & Maintenance",
  "Other",
  // Legacy aliases kept for backward compatibility with existing production records
  "Inverter Issue",
  "Solar Panels Not Producing",
  "Battery Issue",
  "Monitoring/App Issue",
  "Installation Issue",
  "Net Metering Issue",
  "Billing Issue",
  "Maintenance Request",
  "Warranty Claim",
  "Service Request",
];

// Generate a unique complaint ID like COMPLAINT/YYYY/MM/001
async function generateComplaintId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `COMPLAINT/${year}/${month}/`;
  const latest = await prisma.complaint.findFirst({
    where: { complaintId: { startsWith: prefix } },
    orderBy: { id: "desc" },
  });

  let nextNum = 1;
  if (latest) {
    const parts = latest.complaintId.split("/");
    const lastNum = parseInt(parts[parts.length - 1] || "0");
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

// GET — Protected: list complaints with optional filters
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

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const categoryParam = searchParams.get("category");
    const priorityParam = searchParams.get("priority");
    const assignedToIdParam = searchParams.get("assignedToId");
    const searchQuery = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};

    if (statusParam) where.status = statusParam;
    if (categoryParam) where.category = categoryParam;
    if (priorityParam) where.priority = priorityParam;
    if (assignedToIdParam) where.assignedToId = parseInt(assignedToIdParam);
    if (searchQuery) {
      where.OR = [
        { complaintId: { contains: searchQuery } },
        { fullName: { contains: searchQuery } },
        { phone: { contains: searchQuery } },
        { subject: { contains: searchQuery } },
        { description: { contains: searchQuery } },
      ];
    }
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59Z"),
      };
    }

    if (payload.role === "Field Staff") {
      where.assignedToId = payload.userId;
    }

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedTo: { select: { id: true, name: true, role: true } },
          _count: { select: { notes: true } },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    const [newCount, inProgressCount, resolvedCount, urgentCount] = await Promise.all([
      prisma.complaint.count({ where: { status: "New" } }),
      prisma.complaint.count({ where: { status: { in: ["In Progress", "Assigned"] } } }),
      prisma.complaint.count({ where: { status: { in: ["Resolved", "Closed"] } } }),
      prisma.complaint.count({ where: { priority: "Urgent" } }),
    ]);

    return NextResponse.json({
      success: true,
      complaints,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: { new: newCount, inProgress: inProgressCount, resolved: resolvedCount, urgent: urgentCount },
    });
  } catch (error: any) {
    console.error("Complaints GET error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

// POST — Public: submit a new complaint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      phone,
      email,
      address,
      projectId,
      installedBy,
      category,
      subject,
      description,
      contactMethod,
      contactTime,
      screenshotUrl,
      attachmentUrl,
    } = body;

    if (!fullName || !fullName.trim() || !phone || !phone.trim() || !address || !address.trim() || !category || !subject || !description || !contactMethod) {
      return NextResponse.json(
        { error: "Full name, phone, address, category, subject, description, and contact method are required." },
        { status: 400 }
      );
    }

    if (!COMPLAINT_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid complaint category: "${category}". Please select a valid category from the list.` },
        { status: 400 }
      );
    }

    const complaintId = await generateComplaintId();

    const complaint = await prisma.complaint.create({
      data: {
        complaintId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        address: address.trim(),
        projectId: projectId?.trim() || null,
        installedBy: installedBy?.trim() || "Askari Solar Energy",
        category,
        subject: subject.trim(),
        description: description.trim(),
        contactMethod,
        contactTime: contactTime?.trim() || null,
        screenshotUrl: screenshotUrl || null,
        attachmentUrl: attachmentUrl || null,
        status: "New",
        priority: "Medium",
        invoiceGenerated: false,
      },
    });

    // Create initial history record (use undefined not null for optional String? in Prisma)
    await prisma.complaintHistory.create({
      data: {
        complaintId: complaint.id,
        field: "status",
        newValue: "New",
      },
    });

    return NextResponse.json({ success: true, complaintId, id: complaint.id }, { status: 201 });
  } catch (error: any) {
    console.error("Complaints POST error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
