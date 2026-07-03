import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  expenses,
  expenseParticipants,
  expenseLog,
  tripParticipants,
  notifications,
  users,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";
import { expenseSchema } from "@/lib/validations";
import { notifyExpenseChange } from "@/lib/notifications";

// GET /api/trips/[id]/expenses
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserOrThrow();
    const { id } = await params;

    const [part] = await db
      .select()
      .from(tripParticipants)
      .where(
        and(eq(tripParticipants.tripId, id), eq(tripParticipants.userId, user.id)),
      );

    if (!part) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const allExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.tripId, id))
      .orderBy(expenses.createdAt);

    const expenseList = await Promise.all(
      allExpenses.map(async (exp) => {
        const parts = await db
          .select({
            id: expenseParticipants.id,
            userId: expenseParticipants.userId,
            amountOwed: expenseParticipants.amountOwed,
            name: users.name,
            email: users.email,
          })
          .from(expenseParticipants)
          .leftJoin(users, eq(expenseParticipants.userId, users.id))
          .where(eq(expenseParticipants.expenseId, exp.id));

        const [paidByUser] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, exp.paidByUserId));

        const [createdByUser] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, exp.createdByUserId));

        const logs = await db
          .select()
          .from(expenseLog)
          .where(eq(expenseLog.expenseId, exp.id))
          .orderBy(expenseLog.createdAt);

        return {
          ...exp,
          amount: String(exp.amount),
          receiptUrl: exp.receiptUrl || null,
          participants: parts.map((p) => ({
            ...p,
            amountOwed: String(p.amountOwed),
          })),
          paidBy: paidByUser || null,
          createdBy: createdByUser || null,
          logs: logs.map((l) => ({
            ...l,
            createdAt: l.createdAt?.toISOString() || "",
          })),
          createdAt: exp.createdAt?.toISOString() || "",
          updatedAt: exp.updatedAt?.toISOString() || "",
        };
      }),
    );

    return NextResponse.json({ expenses: expenseList });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET expenses error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// POST /api/trips/[id]/expenses
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUserOrThrow();
    const { id } = await params;

    const [part] = await db
      .select()
      .from(tripParticipants)
      .where(
        and(eq(tripParticipants.tripId, id), eq(tripParticipants.userId, user.id)),
      );

    if (!part) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      paidByUserId,
      category,
      description,
      amount,
      currency,
      splitType,
      receiptUrl,
      participantIds,
      customAmounts,
    } = parsed.data;

    const amountNum = parseFloat(amount);

    const participantAmounts: { userId: string; amountOwed: number }[] = [];

    if (splitType === "equal") {
      const perPerson = Math.round((amountNum / participantIds.length) * 100) / 100;
      let remainder = amountNum - perPerson * participantIds.length;
      for (let i = 0; i < participantIds.length; i++) {
        let amt = perPerson;
        if (i === 0) {
          amt = Math.round((perPerson + remainder) * 100) / 100;
        }
        participantAmounts.push({ userId: participantIds[i], amountOwed: amt });
      }
    } else {
      for (const uid of participantIds) {
        const amt = customAmounts?.[uid]
          ? parseFloat(customAmounts[uid])
          : 0;
        participantAmounts.push({ userId: uid, amountOwed: amt });
      }
    }

    const [expense] = await db
      .insert(expenses)
      .values({
        tripId: id,
        paidByUserId,
        category,
        description: description || null,
        amount: String(amountNum),
        currency,
        splitType,
        receiptUrl: receiptUrl || null,
        createdByUserId: user.id,
      })
      .returning();

    for (const pa of participantAmounts) {
      await db.insert(expenseParticipants).values({
        expenseId: expense.id,
        userId: pa.userId,
        amountOwed: String(pa.amountOwed),
      });
    }

    await db.insert(expenseLog).values({
      expenseId: expense.id,
      action: "created",
      changedByUserId: user.id,
      newData: {
        paidByUserId,
        category,
        description,
        amount: String(amountNum),
        currency,
        splitType,
        receiptUrl,
        participants: participantAmounts.map((p) => ({
          userId: p.userId,
          amountOwed: String(p.amountOwed),
        })),
      },
    });

    // Notify participants via in-app + email
    await notifyExpenseChange({
      tripId: id,
      actorUserId: user.id,
      actorName: user.name,
      action: `добавил(а) трату "${category}"`,
      category,
      amount: String(amountNum),
      currency,
    });

    return NextResponse.json({
      expense: {
        ...expense,
        amount: String(expense.amount),
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST expense error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
