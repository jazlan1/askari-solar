import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "askari-solar-energy-super-secret-key-12345"
);

export async function signJWT(payload: {
  userId: number;
  email: string;
  name: string;
  role: string;
  department: string;
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      userId: number;
      email: string;
      name: string;
      role: string;
      department: string;
    };
  } catch (error) {
    return null;
  }
}
