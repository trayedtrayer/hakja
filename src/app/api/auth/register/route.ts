import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { registerSchema } from "@/lib/validations";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, name, password } = parsed.data;

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    const passwordHash = await bcrypt.hash(password, 10);
    let user;

    if (existing) {
      if (existing.passwordHash === "temp_hash") {
        // Take over existing placeholder account created via direct add
        const [updated] = await db
          .update(users)
          .set({ name, passwordHash })
          .where(eq(users.id, existing.id))
          .returning();
        user = updated;
      } else {
        return NextResponse.json(
          { error: "Пользователь с таким email уже существует" },
          { status: 409 },
        );
      }
    } else {
      const [inserted] = await db
        .insert(users)
        .values({ email, name, passwordHash })
        .returning();
      user = inserted;
    }

    // Automatically link any pending invitations to this new/updated user
    const { linkPendingInvitations } = await import("@/lib/notifications");
    await linkPendingInvitations(user.id, user.email);

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    await setAuthCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 },
    );
  }
}
