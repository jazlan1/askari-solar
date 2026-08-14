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

    const userRoles = (payload.role || "")
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);
    const isManager = userRoles.some((r) =>
      ["admin", "super admin", "superadmin", "management"].includes(r)
    );
    const isSales = userRoles.some((r) =>
      ["sales & marketing department", "sales & marketing", "sales", "marketing"].includes(r)
    );

    if (!isManager && !isSales) {
      return NextResponse.json({ error: "Access denied: unauthorized role." }, { status: 403 });
    }

    // Parallel queries to fetch entire CRM state
    const [leads, customers, projects, products, tickets, quotations] = await Promise.all([
      prisma.lead.findMany({
        where: isManager ? {} : { salesPersonId: payload.userId },
        orderBy: { createdAt: "desc" },
        include: {
          salesPerson: { select: { id: true, name: true, role: true } }
        }
      }),
      prisma.customer.findMany({
        orderBy: { name: "asc" },
        include: { projects: true, tickets: true },
      }),
      prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true, phone: true } } },
      }),
      prisma.product.findMany({ orderBy: { category: "asc" } }),
      prisma.supportTicket.findMany({
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } } },
      }),
      prisma.quotation.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({
      success: true,
      leads,
      customers,
      projects,
      products,
      tickets,
      quotations,
    });
  } catch (error) {
    console.error("CRM data fetch error:", error);
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

    const userRoles = (payload.role || "")
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);
    const isAllowed = userRoles.some((r) =>
      ["admin", "super admin", "superadmin", "management", "sales & marketing department", "sales & marketing", "sales", "marketing"].includes(r)
    );
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied: unauthorized role." }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. UPDATE LEAD STATUS (for Kanban drag & drop / card clicks)
    if (action === "UPDATE_LEAD_STATUS") {
      const { leadId, status, completionProof } = body;
      if (!leadId || !status) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }

      if (status === "Won" && !completionProof) {
        return NextResponse.json({ error: "Completion proof file is mandatory before winning lead." }, { status: 400 });
      }

      const updatedLead = await prisma.lead.update({
        where: { id: parseInt(leadId) },
        data: {
          status,
          completionProof: completionProof || undefined,
        },
      });

      // Special trigger: if status changes to "Won", automatically register as Customer!
      if (status === "Won") {
        const existingCust = await prisma.customer.findFirst({
          where: { phone: updatedLead.phone },
        });

        if (!existingCust) {
          const newCust = await prisma.customer.create({
            data: {
              name: updatedLead.name,
              phone: updatedLead.phone,
              cnic: updatedLead.cnic,
              address: updatedLead.address,
              city: updatedLead.city,
              email: `${updatedLead.name.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
            },
          });

          // Also register an installation project automatically!
          await prisma.project.create({
            data: {
              customerId: newCust.id,
              name: `${updatedLead.name}'s Solar System`,
              stage: "Survey",
              surveyDetails: `Initial structural survey for load capacity (${updatedLead.load || 5} kW)`,
              notes: `Lead reference id: ${updatedLead.id}`,
            },
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: "UPDATE_LEAD_STATUS",
          details: `Updated Lead #${leadId} status to ${status}`,
        },
      });

      return NextResponse.json({ success: true, lead: updatedLead });
    }

    // 2. CREATE NEW LEAD
    if (action === "CREATE_LEAD") {
      const { name, phone, cnic, address, city, electricityBill, monthlyUnits, load, source, campaign, notes, salesPersonId } = body;
      if (!name || !phone || !city) {
        return NextResponse.json({ error: "Name, Phone and City are required" }, { status: 400 });
      }

      const newLead = await prisma.lead.create({
        data: {
          name,
          phone,
          cnic: cnic || null,
          address: address || null,
          city,
          electricityBill: electricityBill ? parseFloat(electricityBill) : null,
          monthlyUnits: monthlyUnits ? parseInt(monthlyUnits) : null,
          load: load ? parseFloat(load) : null,
          source: source || "Direct",
          campaign: campaign || null,
          status: "New",
          notes: notes || null,
          salesPersonId: salesPersonId ? parseInt(salesPersonId.toString()) : payload.userId,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: "CREATE_LEAD",
          details: `Created Lead #${newLead.id} for ${name}.`,
        },
      });

      return NextResponse.json({ success: true, lead: newLead });
    }

    // 2.5 REASSIGN LEAD
    if (action === "REASSIGN_LEAD") {
      const { leadId, salesPersonId } = body;
      if (!leadId) {
        return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
      }

      const updatedLead = await prisma.lead.update({
        where: { id: parseInt(leadId) },
        data: {
          salesPersonId: salesPersonId ? parseInt(salesPersonId.toString()) : null,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: "REASSIGN_LEAD",
          details: `Reassigned Lead #${leadId} to sales person ID ${salesPersonId || "unassigned"}`,
        },
      });

      return NextResponse.json({ success: true, lead: updatedLead });
    }

    // 3. CREATE QUOTATION
    if (action === "CREATE_QUOTATION") {
      const { title, clientName, clientNumber, location, amount, details } = body;
      if (!title || !clientName || !clientNumber || !location || !amount) {
        return NextResponse.json({ error: "All quote details are required" }, { status: 400 });
      }

      const quote = await prisma.quotation.create({
        data: {
          title,
          clientName,
          clientNumber,
          location,
          amount: parseFloat(amount),
          details: JSON.stringify(details),
          status: "Pending",
        },
      });

      return NextResponse.json({ success: true, quotation: quote });
    }

    // 4. CREATE SUPPORT TICKET
    if (action === "CREATE_TICKET") {
      const { customerId, subject, description, type } = body;
      if (!customerId || !subject || !description || !type) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }

      const ticket = await prisma.supportTicket.create({
        data: {
          customerId: parseInt(customerId),
          subject,
          description,
          type,
          status: "Open",
        },
      });

      return NextResponse.json({ success: true, ticket });
    }

    // 5. UPDATE LEAD DETAILS
    if (action === "UPDATE_LEAD") {
      const { leadId, name, phone, cnic, address, city, electricityBill, monthlyUnits, load, source, campaign, notes } = body;
      if (!leadId) {
        return NextResponse.json({ error: "leadId is required" }, { status: 400 });
      }

      const updatedLead = await prisma.lead.update({
        where: { id: parseInt(leadId) },
        data: {
          name: name !== undefined ? name : undefined,
          phone: phone !== undefined ? phone : undefined,
          cnic: cnic !== undefined ? cnic : undefined,
          address: address !== undefined ? address : undefined,
          city: city !== undefined ? city : undefined,
          electricityBill: electricityBill !== undefined ? (electricityBill ? parseFloat(electricityBill) : null) : undefined,
          monthlyUnits: monthlyUnits !== undefined ? (monthlyUnits ? parseInt(monthlyUnits) : null) : undefined,
          load: load !== undefined ? (load ? parseFloat(load) : null) : undefined,
          source: source !== undefined ? source : undefined,
          campaign: campaign !== undefined ? campaign : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: payload.userId,
          action: "UPDATE_LEAD",
          details: `Updated Lead #${leadId} details.`,
        },
      });

      return NextResponse.json({ success: true, lead: updatedLead });
    }

    // 6. UPDATE CUSTOMER
    if (action === "UPDATE_CUSTOMER") {
      const { customerId, name, phone, cnic, address, city, email } = body;
      if (!customerId) {
        return NextResponse.json({ error: "customerId is required" }, { status: 400 });
      }

      const updated = await prisma.customer.update({
        where: { id: parseInt(customerId) },
        data: {
          name: name !== undefined ? name : undefined,
          phone: phone !== undefined ? phone : undefined,
          cnic: cnic !== undefined ? cnic : undefined,
          address: address !== undefined ? address : undefined,
          city: city !== undefined ? city : undefined,
          email: email !== undefined ? email : undefined,
        },
      });

      return NextResponse.json({ success: true, customer: updated });
    }

    // 7. UPDATE PROJECT
    if (action === "UPDATE_PROJECT") {
      const { projectId, name, stage, surveyDetails, approvalStatus, materialOrdered, installationDate, inspectionDate, netMeteringStatus, warrantyYears, notes } = body;
      if (!projectId) {
        return NextResponse.json({ error: "projectId is required" }, { status: 400 });
      }

      const updated = await prisma.project.update({
        where: { id: parseInt(projectId) },
        data: {
          name: name !== undefined ? name : undefined,
          stage: stage !== undefined ? stage : undefined,
          surveyDetails: surveyDetails !== undefined ? surveyDetails : undefined,
          approvalStatus: approvalStatus !== undefined ? approvalStatus : undefined,
          materialOrdered: materialOrdered !== undefined ? materialOrdered : undefined,
          installationDate: installationDate !== undefined ? installationDate : undefined,
          inspectionDate: inspectionDate !== undefined ? inspectionDate : undefined,
          netMeteringStatus: netMeteringStatus !== undefined ? netMeteringStatus : undefined,
          warrantyYears: warrantyYears !== undefined ? (warrantyYears ? parseInt(warrantyYears) : null) : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });

      return NextResponse.json({ success: true, project: updated });
    }

    // 8. UPDATE TICKET
    if (action === "UPDATE_TICKET") {
      const { ticketId, subject, description, type, status } = body;
      if (!ticketId) {
        return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
      }

      const updated = await prisma.supportTicket.update({
        where: { id: parseInt(ticketId) },
        data: {
          subject: subject !== undefined ? subject : undefined,
          description: description !== undefined ? description : undefined,
          type: type !== undefined ? type : undefined,
          status: status !== undefined ? status : undefined,
        },
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("CRM action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
