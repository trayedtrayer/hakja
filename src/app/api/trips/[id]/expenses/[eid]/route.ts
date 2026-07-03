import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  expenses,
  expenseParticipants,
  expenseLog,
  tripParticipants,
  notifications,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";
import { expenseSchema } from "@/lib/validations";
import { notifyExpenseChange } from "@/lib/notifications";

// PUT /api/trips/[id]/expenses/[eid]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> },
) {
  try {
    const user = await getCurrentUserOrThrow();
    const { id, eid } = await params;

    const [part] = await db
      .select()
      .from(tripParticipants)
      .where(
        and(eq(tripParticipants.tripId, id), eq(tripParticipants.userId, user.id)),
      );

    if (!part) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const [existing] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, eid), eq(expenses.tripId, id)));

    if (!existing) {
      return NextResponse.json({ error: "Трата не найдена" }, { status: 404 });
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
      const perPerson =
        Math.round((amountNum / participantIds.length) * 100) / 100;
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
        const amt = customAmounts?.[uid] ? parseFloat(customAmounts[uid]) : 0;
        participantAmounts.push({ userId: uid, amountOwed: amt });
      }
    }

    const oldParts = await db
      .select()
      .from(expenseParticipants)
      .where(eq(expenseParticipants.expenseId, eid));

    const oldData = {
      paidByUserId: existing.paidByUserId,
      category: existing.category,
      description: existing.description,
      amount: String(existing.amount),
      currency: existing.currency,
      splitType: existing.splitType,
      receiptUrl: existing.receiptUrl,
      participants: oldParts.map((p) => ({
        userId: p.userId,
        amountOwed: String(p.amountOwed),
      })),
    };

    await db
      .update(expenses)
      .set({
        paidByUserId,
        category,
        description: description || null,
        amount: String(amountNum),
        currency,
        splitType,
        receiptUrl: receiptUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, eid));

    await db
      .delete(expenseParticipants)
      .where(eq(expenseParticipants.expenseId, eid));

    for (const pa of participantAmounts) {
      await db.insert(expenseParticipants).values({
        expenseId: eid,
        userId: pa.userId,
        amountOwed: String(pa.amountOwed),
      });
    }

    await db.insert(expenseLog).values({
      expenseId: eid,
      action: "updated",
      changedByUserId: user.id,
      oldData,
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

    await notifyExpenseChange({
      tripId: id,
      actorUserId: user.id,
      actorName: user.name,
      action: `обновил(а) трату "${category}"`,
      category,
      amount: String(amountNum),
      currency,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PUT expense error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// DELETE /api/trips/[id]/expenses/[eid]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> },
) {
  try {
    const user = await getCurrentUserOrThrow();
    const { id, eid } = await params;

    const [part] = await db
      .select()
      .from(tripParticipants)
      .where(
        and(eq(tripParticipants.tripId, id), eq(tripParticipants.userId, user.id)),
      );

    if (!part) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const [existing] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, eid), eq(expenses.tripId, id)));

    if (!existing) {
      return NextResponse.json({ error: "Трата не найдена" }, { status: 404 });
    }

    const oldParts = await db
      .select()
      .from(expenseParticipants)
      .where(eq(expenseParticipants.expenseId, eid));

    const oldData = {
      paidByUserId: existing.paidByUserId,
      category: existing.category,
      description: existing.description,
      amount: String(existing.amount),
      currency: existing.currency,
      splitType: existing.splitType,
      receiptUrl: existing.receiptUrl,
      participants: oldParts.map((p) => ({
        userId: p.userId,
        amountOwed: String(p.amountOwed),
      })),
    };

    await db.insert(expenseLog).values({
      expenseId: eid,
      action: "deleted",
      changedByUserId: user.id,
      oldData,
      newData: null,
    });

    await db.delete(expenses).where(eq(expenses.id, eid));

    await notifyExpenseChange({
      tripId: id,
      actorUserId: user.id,
      actorName: user.name,
      action: `удалил(а) трату "${existing.category}"`,
      category: existing.category,
      amount: String(existing.amount),
      currency: existing.currency,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE expense error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
