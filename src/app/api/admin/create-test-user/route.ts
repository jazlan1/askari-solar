import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/hash";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== "askari-unzip-secret-987") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const email = "portaladmin@solarkidunya.com";
    const password = "Askari@Admin#2026$Secure!";
    const hashedPassword = hashPassword(password);

    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      user = await prisma.user.update({
        where: { email },
        data: { password: hashedPassword, role: "Super Admin", department: "Management" }
      });
      return NextResponse.json({ success: true, message: "Updated existing portaladmin password", user });
    } else {
      user = await prisma.user.create({
        data: {
          name: "Super Admin",
          email,
          password: hashedPassword,
          role: "Super Admin",
          department: "Management"
        }
      });
      return NextResponse.json({ success: true, message: "Created new portaladmin user", user });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
