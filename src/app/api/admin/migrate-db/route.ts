import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== "askari-unzip-secret-987") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exportPath = path.join(process.cwd(), "prisma", "db-export.json");
  if (!fs.existsSync(exportPath)) {
    return NextResponse.json({ error: "db-export.json not found" }, { status: 404 });
  }

  try {
    const rawData = fs.readFileSync(exportPath, "utf8");
    const data = JSON.parse(rawData);

    // Run everything in a single transaction on the same connection
    const stats = await prisma.$transaction(async (tx) => {
      // 1. Disable foreign key checks for this session connection
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0;");

      // 2. Clear existing data
      await tx.attendance.deleteMany();
      await tx.announcement.deleteMany();
      await tx.workSchedule.deleteMany();
      await tx.supportTicket.deleteMany();
      await tx.project.deleteMany();
      await tx.customer.deleteMany();
      await tx.lead.deleteMany();
      await tx.product.deleteMany();
      await tx.fileItem.deleteMany();
      await tx.user.deleteMany();

      // 3. Reset auto-increment counters
      const tables = ["User", "FileItem", "Product", "Lead", "Customer", "Project", "SupportTicket", "WorkSchedule", "Announcement", "Attendance"];
      for (const t of tables) {
        await tx.$executeRawUnsafe(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1;`);
      }

      // Helper to map and validate User ID references to prevent foreign key violations
      const validUserIds = data.User ? data.User.map((u: any) => u.id) : [];
      const mapUserId = (id: number | null | undefined): number | null => {
        if (id === null || id === undefined) return null;
        if (validUserIds.includes(id)) return id;
        
        // Map common mismatched IDs from development SQLite database
        if (id === 3) return 23; // Sales Specialist
        if (id === 4) return 22; // Accounts Accountant
        if (id === 7) return 24; // Field Staff Worker
        
        // Fallback to first user ID if invalid
        return validUserIds[0] || null;
      };

      // 4. Insert Users
      if (data.User) {
        for (const row of data.User) {
          await tx.user.create({
            data: {
              id: row.id,
              name: row.name,
              email: row.email,
              password: row.password,
              role: row.role,
              department: row.department,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            }
          });
        }
      }

      // 5. Insert FileItems
      if (data.FileItem) {
        for (const row of data.FileItem) {
          await tx.fileItem.create({
            data: {
              id: row.id,
              name: row.name,
              isFolder: row.isFolder === 1 || row.isFolder === true,
              folderColor: row.folderColor,
              path: row.path,
              parentId: row.parentId,
              department: row.department,
              docType: row.docType,
              fileExtension: row.fileExtension,
              fileSize: row.fileSize,
              fileUrl: row.fileUrl,
              uploadedById: mapUserId(row.uploadedById),
              isFavorite: row.isFavorite === 1 || row.isFavorite === true,
              version: row.version,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            }
          });
        }
      }

      // 6. Insert Products
      if (data.Product) {
        for (const row of data.Product) {
          await tx.product.create({
            data: {
              id: row.id,
              category: row.category,
              name: row.name,
              brand: row.brand,
              spec: row.spec,
              rate: row.rate,
              purchasePrice: row.purchasePrice,
              stock: row.stock,
              warranty: row.warranty,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            }
          });
        }
      }

      // 7. Insert Leads
      if (data.Lead) {
        for (const row of data.Lead) {
          await tx.lead.create({
            data: {
              id: row.id,
              name: row.name,
              phone: row.phone,
              cnic: row.cnic,
              address: row.address,
              city: row.city,
              electricityBill: row.electricityBill,
              monthlyUnits: row.monthlyUnits,
              load: row.load,
              source: row.source,
              campaign: row.campaign,
              salesPersonId: mapUserId(row.salesPersonId),
              status: row.status,
              notes: row.notes,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            }
          });
        }
      }

      // 8. Insert Customers
      if (data.Customer) {
        for (const row of data.Customer) {
          await tx.customer.create({
            data: {
              id: row.id,
              name: row.name,
              phone: row.phone,
              cnic: row.cnic,
              address: row.address,
              city: row.city,
              email: row.email,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            }
          });
        }
      }

      // 9. Insert Projects
      if (data.Project) {
        for (const row of data.Project) {
          await tx.project.create({
            data: {
              id: row.id,
              customerId: row.customerId,
              name: row.name,
              stage: row.stage,
              surveyDetails: row.surveyDetails,
              approvalStatus: row.approvalStatus,
              materialOrdered: row.materialOrdered,
              installationDate: row.installationDate,
              inspectionDate: row.inspectionDate,
              netMeteringStatus: row.netMeteringStatus,
              warrantyYears: row.warrantyYears,
              notes: row.notes,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            }
          });
        }
      }

      // 10. Insert SupportTickets
      if (data.SupportTicket) {
        for (const row of data.SupportTicket) {
          await tx.supportTicket.create({
            data: {
              id: row.id,
              customerId: row.customerId,
              subject: row.subject,
              description: row.description,
              type: row.type,
              status: row.status,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            }
          });
        }
      }

      // 11. Insert WorkSchedules
      if (data.WorkSchedule) {
        for (const row of data.WorkSchedule) {
          await tx.workSchedule.create({
            data: {
              id: row.id,
              date: row.date,
              day: row.day,
              branch: row.branch,
              clientName: row.clientName,
              clientNumber: row.clientNumber,
              clientLocation: row.clientLocation,
              natureOfWork: row.natureOfWork,
              workDescription: row.workDescription,
              charges: row.charges,
              assignedStaff: row.assignedStaff,
              startDate: row.startDate,
              endDate: row.endDate,
              status: row.status,
              remarks: row.remarks,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            }
          });
        }
      }

      // 12. Insert Announcements
      if (data.Announcement) {
        for (const row of data.Announcement) {
          await tx.announcement.create({
            data: {
              id: row.id,
              title: row.title,
              content: row.content,
              department: row.department,
              attachmentUrl: row.attachmentUrl,
              isPinned: row.isPinned === 1 || row.isPinned === true,
              createdById: mapUserId(row.createdById) || validUserIds[0],
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            }
          });
        }
      }

      // 13. Insert Attendance
      if (data.Attendance) {
        for (const row of data.Attendance) {
          await tx.attendance.create({
            data: {
              id: row.id,
              userId: mapUserId(row.userId) || validUserIds[0],
              date: row.date,
              checkIn: row.checkIn,
              checkOut: row.checkOut,
              status: row.status,
              notes: row.notes,
              createdAt: new Date(row.createdAt),
              updatedAt: new Date(row.updatedAt),
            }
          });
        }
      }

      // 14. Re-enable foreign key checks
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1;");

      return {
        users: data.User?.length || 0,
        fileItems: data.FileItem?.length || 0,
        products: data.Product?.length || 0,
        leads: data.Lead?.length || 0,
        customers: data.Customer?.length || 0,
        projects: data.Project?.length || 0,
        tickets: data.SupportTicket?.length || 0,
        schedules: data.WorkSchedule?.length || 0,
        announcements: data.Announcement?.length || 0,
        attendance: data.Attendance?.length || 0,
      };
    }, {
      timeout: 120000 // 120 seconds timeout for large data transactions
    });

    return NextResponse.json({
      success: true,
      message: "Database migrated successfully in a single transaction",
      stats
    });

  } catch (err: any) {
    console.error("Migration error:", err);
    return NextResponse.json(
      { error: "Migration failed", message: err.message },
      { status: 500 }
    );
  }
}
