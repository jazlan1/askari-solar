const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const crypto = require("crypto");

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

function hashPassword(p) {
  return crypto.createHash("sha256").update(p).digest("hex");
}

async function main() {
  console.log("🌱 Seeding local dev database...\n");

  // 1. Admin User
  const admin = await prisma.user.upsert({
    where: { email: "portaladmin@solarkidunya.com" },
    update: { password: hashPassword("Askari@Admin#2026$Secure!") },
    create: {
      name: "Super Admin",
      email: "portaladmin@solarkidunya.com",
      password: hashPassword("Askari@Admin#2026$Secure!"),
      role: "Super Admin",
      department: "Management"
    }
  });
  console.log("Admin created:", admin.email);

  // 2. Staff
  const staff = await prisma.user.upsert({
    where: { email: "field@askarisolar.com" },
    update: {},
    create: {
      name: "Field Staff Demo",
      email: "field@askarisolar.com",
      password: hashPassword("Staff@123"),
      role: "Field Staff",
      department: "Sales"
    }
  });
  console.log("Field Staff created:", staff.email);

  const salesUser = await prisma.user.upsert({
    where: { email: "sales@askarisolar.com" },
    update: {},
    create: {
      name: "Sales Person",
      email: "sales@askarisolar.com",
      password: hashPassword("Staff@123"),
      role: "Sales & Marketing Department",
      department: "Sales"
    }
  });
  console.log("Sales user created:", salesUser.email);

  const hrUser = await prisma.user.upsert({
    where: { email: "hr@askarisolar.com" },
    update: {},
    create: {
      name: "HR Manager",
      email: "hr@askarisolar.com",
      password: hashPassword("Staff@123"),
      role: "HR",
      department: "HR"
    }
  });
  console.log("HR user created:", hrUser.email);

  // 3. Announcements
  await prisma.announcement.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: "Welcome to Askari Solar Portal",
      content: "The new staff portal is now live! Please log in and explore all the features. For any issues, contact the admin.",
      department: "All",
      isPinned: true,
      createdById: admin.id
    }
  });
  console.log("Announcement created");

  // 4. Products
  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      category: "Solar Panels",
      name: "Longi Hi-MO6 580W",
      brand: "Longi",
      spec: "580W Mono PERC",
      rate: 22000,
      stock: 150,
      purchasePrice: 19000
    }
  });
  await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: {
      category: "Inverters",
      name: "Sungrow SG10RT",
      brand: "Sungrow",
      spec: "10kW 3-Phase On-Grid",
      rate: 185000,
      stock: 25,
      purchasePrice: 160000
    }
  });
  console.log("Products created");

  // 5. Leads
  await prisma.lead.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Ali Hassan",
      phone: "0300-1234567",
      city: "Islamabad",
      status: "New",
      source: "Social Media",
      electricityBill: 12000,
      salesPersonId: salesUser.id
    }
  });
  await prisma.lead.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Zara Khan",
      phone: "0301-7654321",
      city: "Rawalpindi",
      status: "Won",
      source: "Direct",
      electricityBill: 18000,
      load: 5,
      completionProof: "/uploads/proof.jpg",
      salesPersonId: salesUser.id
    }
  });
  console.log("Leads created");

  // 6. Tasks
  await prisma.task.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: "Site Survey - Ali Hassan",
      description: "Conduct site survey for 5kW solar system.",
      priority: "High",
      dueDate: new Date(Date.now() + 3*24*60*60*1000).toISOString().split("T")[0],
      assignedById: admin.id,
      assignedTo: { connect: [{ id: staff.id }] },
      charges: "Quotation",
      clientName: "Ali Hassan",
      clientNumber: "0300-1234567",
      clientLocation: "Islamabad",
      status: "Pending"
    }
  });
  console.log("Task created");

  // 7. Complaints
  await prisma.complaint.upsert({
    where: { complaintId: "ASK-2026-00001" },
    update: {},
    create: {
      complaintId: "ASK-2026-00001",
      fullName: "Muhammad Usman",
      phone: "0321-4567890",
      category: "Inverter Issue",
      subject: "Inverter showing low voltage fault",
      description: "System stopped working since last week.",
      contactMethod: "WhatsApp",
      status: "New",
      priority: "High"
    }
  });
  console.log("Complaint created");

  // 8. Customers
  const cust = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Nadia Sheikh",
      phone: "0333-9876543",
      city: "Islamabad",
      email: "nadia@gmail.com"
    }
  });
  await prisma.project.upsert({
    where: { id: 1 },
    update: {},
    create: {
      customerId: cust.id,
      name: "Nadia Solar System 15kW",
      stage: "Installation",
      surveyDetails: "15kW system, south-facing roof"
    }
  });
  console.log("Customer & Project created");

  console.log("\n🌱 Seeding complete successfully!");
}

main()
  .catch(e => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
