import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  console.log("GET /api/auth/me user:", user);
  return NextResponse.json({ user: user || null });
}
