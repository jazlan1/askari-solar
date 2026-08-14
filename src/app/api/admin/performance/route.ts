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
    const userRoles = (payload?.role || "").split(",").map(r => r.trim());
    if (!payload || !userRoles.some(r => ["Admin", "Super Admin"].includes(r))) {
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
        // Fetch feedbacks where customer contact number matches
        const allFeedbacks = await prisma.feedback.findMany({});
        feedbacks = allFeedbacks.filter((fb) => {
          const cleanFbPhone = fb.contactNumber?.replace(/\s+/g, "").trim();
          return cleanFbPhone && combinedPhones.includes(cleanFbPhone);
        });
      }

      // Calculations
      // Attendance Score
      const totalAttendance = attendance.length;
      let attendanceScore = null;
      if (totalAttendance > 0) {
        const points = attendance.reduce((acc, curr) => {
          if (curr.status === "Present" || curr.status === "Leave") return acc + 1;
          if (curr.status === "Late") return acc + 0.9;
          if (curr.status === "Half Day") return acc + 0.5;
          return acc; // Absent is 0 points
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

      // Feedback Score (Overall rating out of 5 stars)
      const totalFeedbacks = feedbacks.length;
      let feedbackScore = null;
      if (totalFeedbacks > 0) {
        const sumRatings = feedbacks.reduce((acc, curr) => acc + curr.overallRating, 0);
        feedbackScore = (sumRatings / (totalFeedbacks * 5)) * 100;
      }

      // Determine evaluation category weights
      const isFieldStaff =
        u.role.toLowerCase().includes("field staff") ||
        u.department.toLowerCase() === "field";

      const scoresToAverage = [];
      if (attendanceScore !== null) scoresToAverage.push(attendanceScore);
      if (tasksScore !== null) scoresToAverage.push(tasksScore);

      if (isFieldStaff) {
        if (complaintsScore !== null) scoresToAverage.push(complaintsScore);
        if (feedbackScore !== null) scoresToAverage.push(feedbackScore);
      }

      const overallScore =
        scoresToAverage.length > 0
          ? scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length
          : 100.0;

      performanceData.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        isFieldStaff,
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
            avgStars: totalFeedbacks > 0
              ? (feedbacks.reduce((acc, curr) => acc + curr.overallRating, 0) / totalFeedbacks).toFixed(1)
              : null,
            items: feedbacks.map((f) => ({
              id: f.id,
              customerName: f.customerName,
              overallRating: f.overallRating,
              commentsSuggestions: f.commentsSuggestions,
            })),
          },
        },
        overallScore: Math.round(overallScore),
      });
    }

    return NextResponse.json({ success: true, performance: performanceData });
  } catch (error) {
    console.error("Performance GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
