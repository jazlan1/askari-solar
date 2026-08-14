import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

// POST — Protected: add internal note to a complaint
export async function POST(
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

    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Note content is required." }, { status: 400 });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return NextResponse.json({ error: "Complaint not found" }, { status: 404 });

    const note = await prisma.complaintNote.create({
      data: {
        complaintId,
        authorId: payload.userId,
        content: content.trim(),
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (error) {
    console.error("ComplaintNote POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
