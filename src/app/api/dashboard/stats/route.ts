import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { getPKTDateString } from "@/lib/dateUtils";

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

    // Multi-role checks
    const userRoles = (payload.role || "").split(",").map(r => r.trim());
    const isManager = userRoles.some(r => ["Admin", "Super Admin", "Management"].includes(r));
    const isSales = userRoles.includes("Sales & Marketing Department");
    const isFieldStaff = userRoles.includes("Field Staff");

    let leadFilter = {};
    if (!isManager && isSales) {
      leadFilter = { salesPersonId: payload.userId };
    }

    // Parallel queries for speed and efficiency
    const [
      totalLeads,
      wonLeads,
      newLeads,
      totalProjects,
      completedProjects,
      totalProducts,
      recentAnnouncements,
      recentFiles,
      todayAttendance,
      recentTasks,
      recentComplaints,
    ] = await Promise.all([
      prisma.lead.count({ where: leadFilter }),
      prisma.lead.count({ where: { ...leadFilter, status: "Won" } }),
      prisma.lead.count({ where: { ...leadFilter, status: "New" } }),
      prisma.project.count(),
      prisma.project.count({ where: { stage: "Completed" } }),
      prisma.product.count(),
      prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { createdBy: { select: { name: true } } },
      }),
      prisma.fileItem.findMany({
        where: { isFolder: false },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.attendance.findFirst({
        where: {
          userId: payload.userId,
          date: getPKTDateString(new Date()),
        },
      }),
      prisma.task.findMany({
        where: isManager ? {} : { assignedTo: { some: { id: payload.userId } } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          assignedTo: { select: { name: true } },
          assignedBy: { select: { name: true } }
        }
      }),
      prisma.complaint.findMany({
        where: isManager ? {} : { assignedToId: payload.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          assignedTo: { select: { name: true } },
        }
      }),
    ]);

    // Format revenue (mock estimation based on won projects or product rate)
    const totalRevenue = wonLeads * 1250000; // estimation: average 1.25M PKR per won system

    let fieldStaffTasks = { total: 0, pending: 0, completed: 0 };
    const fieldStaffComplaints = {
      totalAssigned: 0,
      completedResolved: 0,
      pending: 0,
      overdue: 0,
      resolvedWithin24h: 0,
      resolvedNotWithin24h: 0,
      overdue24hPlus: 0,
    };
    let fieldStaffPerformance = null;

    if (isFieldStaff) {
      const [totalT, pendingT, completedT, assignedComplaints, totalAttendance, presentAttendance] = await Promise.all([
        prisma.task.count({ where: { assignedTo: { some: { id: payload.userId } } } }),
        prisma.task.count({ where: { assignedTo: { some: { id: payload.userId } }, status: "Pending" } }),
        prisma.task.count({ where: { assignedTo: { some: { id: payload.userId } }, status: "Completed" } }),
        prisma.complaint.findMany({
          where: { assignedToId: payload.userId },
          include: {
            history: {
              orderBy: { createdAt: "asc" }
            }
          }
        }),
        prisma.attendance.count({ where: { userId: payload.userId } }),
        prisma.attendance.count({ where: { userId: payload.userId, status: { in: ["Present", "Late", "Half Day"] } } }),
      ]);
      fieldStaffTasks = { total: totalT, pending: pendingT, completed: completedT };

      fieldStaffComplaints.totalAssigned = assignedComplaints.length;
      const now = new Date();

      assignedComplaints.forEach((c) => {
        const isResolved = ["Resolved", "Closed"].includes(c.status);

        // Find assignment time
        let assignedAt = c.createdAt;
        const assignHistory = c.history.find(
          (h) => h.field === "assignedTo" && h.newValue === String(payload.userId)
        );
        if (assignHistory) {
          assignedAt = assignHistory.createdAt;
        }

        if (isResolved) {
          fieldStaffComplaints.completedResolved++;
          // Find resolution time
          let resolvedAt = c.updatedAt;
          const resolveHistory = c.history.find(
            (h) => h.field === "status" && ["Resolved", "Closed"].includes(h.newValue || "")
          );
          if (resolveHistory) {
            resolvedAt = resolveHistory.createdAt;
          }

          const diffMs = resolvedAt.getTime() - assignedAt.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours <= 24) {
            fieldStaffComplaints.resolvedWithin24h++;
          } else {
            fieldStaffComplaints.resolvedNotWithin24h++;
          }
        } else {
          fieldStaffComplaints.pending++;
          
          const diffMs = now.getTime() - assignedAt.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours > 24) {
            fieldStaffComplaints.overdue++;
            fieldStaffComplaints.overdue24hPlus++;
          }
        }
      });

      // Performance index calculations
      const taskScore = totalT > 0 ? Math.round((completedT / totalT) * 100) : 100;
      const complaintScore = assignedComplaints.length > 0
        ? Math.round((fieldStaffComplaints.completedResolved / assignedComplaints.length) * 100)
        : 100;
      const attendanceScore = totalAttendance > 0
        ? Math.round((presentAttendance / totalAttendance) * 100)
        : 100;
      
      const overallScore = Math.round((taskScore * 0.4) + (complaintScore * 0.4) + (attendanceScore * 0.2));
      let grade = "Excellent";
      if (overallScore >= 90) grade = "Excellent";
      else if (overallScore >= 75) grade = "Very Good";
      else if (overallScore >= 50) grade = "Satisfactory";
      else grade = "Needs Improvement";

      fieldStaffPerformance = {
        score: overallScore,
        grade,
        taskScore,
        complaintScore,
        attendanceScore,
        attendanceLogs: { total: totalAttendance, present: presentAttendance }
      };
    }

    // Calculate real sales chart data dynamically from last 7 months of leads
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const chartLeads = await prisma.lead.findMany({
      where: {
        ...leadFilter,
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartDataMap: Record<string, { month: string; sales: number; leads: number; revenue: number }> = {};

    // Initialize last 7 months
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];
      chartDataMap[mName] = { month: mName, sales: 0, leads: 0, revenue: 0 };
    }

    chartLeads.forEach((lead) => {
      const mName = monthNames[lead.createdAt.getMonth()];
      if (chartDataMap[mName]) {
        chartDataMap[mName].leads++;
        if (lead.status === "Won") {
          chartDataMap[mName].sales++;
          chartDataMap[mName].revenue += 1.25; // Estimate 1.25 Million PKR per system
        }
      }
    });

    const salesChartData = Object.values(chartDataMap);

    return NextResponse.json({
      success: true,
      stats: {
        leads: { total: totalLeads, won: wonLeads, new: newLeads },
        projects: { total: totalProjects, completed: completedProjects },
        products: { total: totalProducts },
        revenue: totalRevenue,
        fieldStaffTasks,
        fieldStaffComplaints,
      },
      performance: fieldStaffPerformance,
      recentAnnouncements,
      recentFiles,
      todayAttendance: todayAttendance
        ? {
            checkIn: todayAttendance.checkIn,
            checkOut: todayAttendance.checkOut,
            status: todayAttendance.status,
            notes: todayAttendance.notes,
          }
        : null,
      recentTasks,
      recentComplaints,
      salesChartData,
    });
  } catch (error) {
    console.error("Dashboard stats fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error. Could not load dashboard stats." },
      { status: 500 }
    );
  }
}
