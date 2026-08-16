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
    const userRoles = (payload?.role || "").split(",").map((r) => r.trim().toLowerCase());
    if (!payload || !userRoles.some((r) => ["admin", "super admin", "superadmin", "management", "hr"].includes(r))) {
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
      },
    });

    const performanceData = [];

    for (const u of users) {
      const lowerRole = (u.role || "").toLowerCase();
      const lowerDept = (u.department || "").toLowerCase();

      // 1. Fetch Attendance
      const attendance = await prisma.attendance.findMany({
        where: { userId: u.id },
      });

      // 2. Fetch Tasks assigned to this user
      const tasks = await prisma.task.findMany({
        where: {
          assignedTo: {
            some: { id: u.id },
          },
        },
      });

      // 3. Fetch Complaints assigned to this user
      const complaints = await prisma.complaint.findMany({
        where: { assignedToId: u.id },
      });

      // 4. Fetch Feedback by matching phone numbers
      const taskPhones = tasks
        .map((t) => t.clientNumber?.replace(/\s+/g, "").trim())
        .filter(Boolean) as string[];
      const complaintPhones = complaints
        .map((c) => c.phone?.replace(/\s+/g, "").trim())
        .filter(Boolean) as string[];

      const combinedPhones = Array.from(new Set([...taskPhones, ...complaintPhones]));

      let feedbacks: any[] = [];
      if (combinedPhones.length > 0) {
        const allFeedbacks = await prisma.feedback.findMany({});
        feedbacks = allFeedbacks.filter((fb) => {
          const cleanFbPhone = fb.contactNumber?.replace(/\s+/g, "").trim();
          return cleanFbPhone && combinedPhones.includes(cleanFbPhone);
        });
      }

      // 5. Fetch CRM Leads for Sales & Marketing / Office
      const assignedLeads = await prisma.lead.findMany({
        where: { salesPersonId: u.id },
        include: { quotations: true },
      });

      // Attendance Score
      const totalAttendance = attendance.length;
      let attendanceScore = null;
      if (totalAttendance > 0) {
        const points = attendance.reduce((acc, curr) => {
          if (curr.status === "Present" || curr.status === "Leave") return acc + 1;
          if (curr.status === "Late") return acc + 0.9;
          if (curr.status === "Half Day") return acc + 0.5;
          return acc;
        }, 0);
        attendanceScore = (points / totalAttendance) * 100;
      }

      // Tasks Score
      const totalTasks = tasks.length;
      let tasksScore = null;
      if (totalTasks > 0) {
        const completedTasks = tasks.filter((t) => t.status === "Completed").length;
        tasksScore = (completedTasks / totalTasks) * 100;
      }

      // Complaints Score
      const totalComplaints = complaints.length;
      let complaintsScore = null;
      if (totalComplaints > 0) {
        const resolvedComplaints = complaints.filter((c) =>
          ["Resolved", "Closed"].includes(c.status)
        ).length;
        complaintsScore = (resolvedComplaints / totalComplaints) * 100;
      }

      // Feedback Score
      const totalFeedbacks = feedbacks.length;
      let feedbackScore = null;
      if (totalFeedbacks > 0) {
        const sumRatings = feedbacks.reduce((acc, curr) => acc + curr.overallRating, 0);
        feedbackScore = (sumRatings / (totalFeedbacks * 5)) * 100;
      }

      // CRM Score
      const totalLeads = assignedLeads.length;
      let crmScore = null;
      if (totalLeads > 0) {
        const wonCount = assignedLeads.filter((l) => l.status === "Won").length;
        const activeCount = assignedLeads.filter((l) =>
          ["Contacted", "Survey Scheduled", "Quotation Sent", "Negotiation"].includes(l.status)
        ).length;
        crmScore = Math.min(100, ((wonCount * 1.0 + activeCount * 0.7) / totalLeads) * 100);
      }

      // Categorization
      const isFieldStaff =
        lowerRole.includes("field") ||
        lowerRole.includes("technical") ||
        lowerDept === "field";

      const isManagement =
        lowerRole.includes("management") ||
        lowerRole.includes("super admin");

      const isSales =
        lowerRole.includes("sales") ||
        lowerRole.includes("crm") ||
        lowerDept === "sales" ||
        lowerDept === "crm";

      let categoryGroup = "Office Staff";
      if (isFieldStaff) categoryGroup = "Technical / Field Staff";
      else if (isManagement) categoryGroup = "Management";
      else if (isSales) categoryGroup = "Sales & Marketing";

      // Overall Score Calculation based on user prompt rules:
      // Field: Attendance + Tasks + Complaints + Feedback
      // Office / Sales: Attendance + Tasks + CRM
      // Management: Tasks
      let overallScore = 100.0;
      const componentScores: number[] = [];

      if (isFieldStaff) {
        if (attendanceScore !== null) componentScores.push(attendanceScore);
        if (tasksScore !== null) componentScores.push(tasksScore);
        if (complaintsScore !== null) componentScores.push(complaintsScore);
        if (feedbackScore !== null) componentScores.push(feedbackScore);
      } else if (isManagement) {
        if (tasksScore !== null) componentScores.push(tasksScore);
        else if (attendanceScore !== null) componentScores.push(attendanceScore);
      } else {
        // Office Staff & Sales
        if (attendanceScore !== null) componentScores.push(attendanceScore);
        if (tasksScore !== null) componentScores.push(tasksScore);
        if (crmScore !== null) componentScores.push(crmScore);
      }

      if (componentScores.length > 0) {
        overallScore = componentScores.reduce((a, b) => a + b, 0) / componentScores.length;
      }

      performanceData.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        categoryGroup,
        isFieldStaff,
        isSales,
        isManagement,
        metrics: {
          attendance: {
            score: attendanceScore,
            total: totalAttendance,
            present: attendance.filter((a) => a.status === "Present").length,
            late: attendance.filter((a) => a.status === "Late").length,
            halfDay: attendance.filter((a) => a.status === "Half Day").length,
            leave: attendance.filter((a) => a.status === "Leave").length,
            absent: attendance.filter((a) => a.status === "Absent").length,
          },
          tasks: {
            score: tasksScore,
            total: totalTasks,
            completed: tasks.filter((t) => t.status === "Completed").length,
            pending: tasks.filter((t) => t.status === "Pending").length,
            items: tasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              dueDate: t.dueDate,
            })),
          },
          complaints: {
            score: complaintsScore,
            total: totalComplaints,
            resolved: complaints.filter((c) => ["Resolved", "Closed"].includes(c.status)).length,
            pending: complaints.filter((c) => !["Resolved", "Closed"].includes(c.status)).length,
            items: complaints.map((c) => ({
              id: c.id,
              complaintId: c.complaintId,
              subject: c.subject,
              status: c.status,
            })),
          },
          feedback: {
            score: feedbackScore,
            total: totalFeedbacks,
            avgStars:
              totalFeedbacks > 0
                ? (feedbacks.reduce((acc, curr) => acc + curr.overallRating, 0) / totalFeedbacks).toFixed(1)
                : null,
            items: feedbacks.map((f) => ({
              id: f.id,
              customerName: f.customerName,
              overallRating: f.overallRating,
              commentsSuggestions: f.commentsSuggestions,
            })),
          },
          crm: {
            score: crmScore,
            total: totalLeads,
            won: assignedLeads.filter((l) => l.status === "Won").length,
            active: assignedLeads.filter((l) =>
              ["Contacted", "Survey Scheduled", "Quotation Sent", "Negotiation"].includes(l.status)
            ).length,
            items: assignedLeads.map((l) => ({
              id: l.id,
              name: l.name,
              status: l.status,
              city: l.city,
            })),
          },
        },
        overallScore: Math.round(overallScore),
      });
    }

    return NextResponse.json({ success: true, performance: performanceData });
  } catch (error) {
    console.error("Performance GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
