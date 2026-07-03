import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, expenseParticipants, tripParticipants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserOrThrow } from "@/lib/auth";

// GET /api/trips/[id]/summary
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

    // Get all expenses for this trip
    const allExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.tripId, id));

    // Get all participants
    const participants = await db
      .select({
        userId: tripParticipants.userId,
        name: users.name,
        email: users.email,
        role: tripParticipants.role,
      })
      .from(tripParticipants)
      .leftJoin(users, eq(tripParticipants.userId, users.id))
      .where(eq(tripParticipants.tripId, id));

    const participantIds = participants.map((p) => p.userId);

    // Calculate balances: how much each person paid vs owes
    // Balance = total_paid - total_owed (positive means others owe them)
    const balances: Record<string, number> = {};
    for (const pid of participantIds) {
      balances[pid] = 0;
    }

    for (const exp of allExpenses) {
      const paidBy = exp.paidByUserId;
      const amount = parseFloat(String(exp.amount));
      balances[paidBy] = (balances[paidBy] || 0) + amount;

      const parts = await db
        .select()
        .from(expenseParticipants)
        .where(eq(expenseParticipants.expenseId, exp.id));

      for (const p of parts) {
        balances[p.userId] =
          (balances[p.userId] || 0) - parseFloat(String(p.amountOwed));
      }
    }

    // Compute debts: who owes whom
    // Simple algorithm: match creditors with debtors
    const creditors: { userId: string; amount: number }[] = [];
    const debtors: { userId: string; amount: number }[] = [];

    for (const pid of participantIds) {
      const bal = balances[pid];
      if (bal > 0.01) {
        creditors.push({ userId: pid, amount: Math.round(bal * 100) / 100 });
      } else if (bal < -0.01) {
        debtors.push({
          userId: pid,
          amount: Math.round(Math.abs(bal) * 100) / 100,
        });
      }
    }

    // Sort by amount descending
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const debts: {
      fromUserId: string;
      toUserId: string;
      amount: number;
    }[] = [];

    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const transfer = Math.min(creditors[ci].amount, debtors[di].amount);
      debts.push({
        fromUserId: debtors[di].userId,
        toUserId: creditors[ci].userId,
        amount: Math.round(transfer * 100) / 100,
      });
      creditors[ci].amount = Math.round((creditors[ci].amount - transfer) * 100) / 100;
      debtors[di].amount = Math.round((debtors[di].amount - transfer) * 100) / 100;
      if (creditors[ci].amount < 0.01) ci++;
      if (debtors[di].amount < 0.01) di++;
    }

    const userMap = new Map(
      participants.map((p) => [
        p.userId,
        { name: p.name || "Unknown", email: p.email || "", role: p.role },
      ]),
    );

    return NextResponse.json({
      balances: Object.entries(balances).map(([userId, amount]) => ({
        userId,
        name: userMap.get(userId)?.name || "Unknown",
        email: userMap.get(userId)?.email || "",
        role: userMap.get(userId)?.role || "participant",
        balance: Math.round(amount * 100) / 100,
      })),
      debts: debts.map((d) => ({
        fromUserId: d.fromUserId,
        fromName: userMap.get(d.fromUserId)?.name || "Unknown",
        toUserId: d.toUserId,
        toName: userMap.get(d.toUserId)?.name || "Unknown",
        amount: d.amount,
      })),
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Summary error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
