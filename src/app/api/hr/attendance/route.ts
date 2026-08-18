import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { getPKTDateString, getPKTTimeString } from "@/lib/dateUtils";

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
    const filterUserId = searchParams.get("userId");
    const targetDate = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const department = searchParams.get("department");
    
    const userRoles = (payload.role || "").split(",").map(r => r.trim());
    const isHrPrivileged = userRoles.some(r => ["Admin", "Super Admin", "Management", "HR"].includes(r));
    
    // 1. Daily Roster list (For Daily Register Manager tab)
    if (isHrPrivileged && targetDate) {
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
        },
        orderBy: { name: "asc" },
      });

      const logsForDate = await prisma.attendance.findMany({
        where: { date: targetDate },
      });

      // Exclude Admin and Super Admin from attendance roster
      const filteredUsers = allUsers.filter((u) => {
        const roles = (u.role || "").split(",").map((r) => r.trim());
        return !roles.some((r) => ["Admin", "Super Admin"].includes(r));
      });

      const dailyRecords = filteredUsers.map((u) => {
        const log = logsForDate.find((l) => l.userId === u.id);
        return {
          employee: u,
          attendance: log || null,
        };
      });

      return NextResponse.json({
        success: true,
        dailyRecords,
      });
    }

    // 2. Fetch list of all employees to populate filters (for Admin/HR)
    let allEmployees: any[] = [];
    if (isHrPrivileged) {
      const allEmployeesList = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
        },
        orderBy: { name: "asc" },
      });
      // Exclude Admin and Super Admin from the employee filter dropdown
      allEmployees = allEmployeesList.filter((u) => {
        const roles = (u.role || "").split(",").map((r) => r.trim());
        return !roles.some((r) => ["Admin", "Super Admin"].includes(r));
      });
    }

    // 3. Timesheet Logs (with filters)
    let whereClause: any = {};

    if (isHrPrivileged) {
      if (filterUserId && filterUserId !== "all" && filterUserId !== "") {
        whereClause.userId = parseInt(filterUserId);
      } else {
        if (department && department !== "all") {
          whereClause.user = { department };
        }
      }
    } else {
      whereClause.userId = payload.userId;
    }

    // Date range filtering
    if (startDate && endDate) {
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const attendanceLogs = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      include: {
        user: {
          select: {
            name: true,
            role: true,
            department: true,
          }
        }
      }
    });

    const filteredLogs = attendanceLogs.filter(log => {
      const roles = (log.user?.role || "").split(",").map(r => r.trim());
      return !roles.some(r => ["Admin", "Super Admin", "Management"].includes(r));
    });

    return NextResponse.json({
      success: true,
      logs: filteredLogs,
      employees: allEmployees,
    });
  } catch (error) {
    console.error("Attendance fetch error:", error);
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

    const { action, manualUserId, manualDate, manualStatus, manualCheckIn, manualCheckOut, manualNotes } = await req.json();

    const userRoles = (payload.role || "").split(",").map(r => r.trim());
    const isHrPrivileged = userRoles.some(r => ["Admin", "Super Admin", "Management", "HR"].includes(r));

    // 1. Standard PUNCH In
    if (action === "CHECKIN") {
      const today = getPKTDateString(new Date());
      const formatTime = getPKTTimeString(new Date());
      
      const existing = await prisma.attendance.findFirst({
        where: { userId: payload.userId, date: today }
      });
      
      if (existing) {
        return NextResponse.json({ error: "Attendance already marked for today" }, { status: 400 });
      }

      // Check PKT time for late check-in (after 09:30:00)
      let status = "Present";
      if (formatTime > "09:30:00") {
        status = "Late";
      }

      const created = await prisma.attendance.create({
        data: {
          userId: payload.userId,
          date: today,
          checkIn: formatTime,
          status,
          notes: "Marked Present (Self check-in)",
        }
      });
      return NextResponse.json({ success: true, record: created });
    }

    // 1.2 CHECKOUT Action
    if (action === "CHECKOUT") {
      const targetUserId = manualUserId ? parseInt(manualUserId.toString()) : payload.userId;
      if (manualUserId && !isHrPrivileged) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const dateStr = manualDate || getPKTDateString(new Date());
      const existing = await prisma.attendance.findFirst({
        where: { userId: targetUserId, date: dateStr }
      });

      if (!existing) {
        return NextResponse.json({ error: "Check-in record not found for this date" }, { status: 400 });
      }

      const formatTime = getPKTTimeString(new Date());
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOut: manualCheckOut || formatTime,
        }
      });
      return NextResponse.json({ success: true, record: updated });
    }

    // 2. Administrative MANUAL entry creation/modification
    if (manualUserId && manualDate) {
      if (!isHrPrivileged) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const existingRecord = await prisma.attendance.findFirst({
        where: { userId: parseInt(manualUserId), date: manualDate },
      });

      if (existingRecord) {
        // Update
        const updated = await prisma.attendance.update({
          where: { id: existingRecord.id },
          data: {
            checkIn: manualCheckIn || null,
            checkOut: manualCheckOut || null,
            status: manualStatus,
            notes: manualNotes || null,
          },
        });
        return NextResponse.json({ success: true, record: updated });
      } else {
        // Create
        const created = await prisma.attendance.create({
          data: {
            userId: parseInt(manualUserId),
            date: manualDate,
            checkIn: manualCheckIn || null,
            checkOut: manualCheckOut || null,
            status: manualStatus,
            notes: manualNotes || null,
          },
        });
        return NextResponse.json({ success: true, record: created });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Attendance log write error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
