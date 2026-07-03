import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sentEmails, trips } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";

// GET /api/emails — list all sent emails (demo inbox)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserOrThrow();

    const rows = await db
      .select({
        id: sentEmails.id,
        to: sentEmails.to,
        toName: sentEmails.toName,
        subject: sentEmails.subject,
        html: sentEmails.html,
        status: sentEmails.status,
        tripId: sentEmails.tripId,
        createdAt: sentEmails.createdAt,
      })
      .from(sentEmails)
      .orderBy(desc(sentEmails.createdAt));

    return NextResponse.json({ emails: rows });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
