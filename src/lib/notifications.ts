import { db } from "@/db";
import { notifications, trips, users, tripParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail, buildExpenseEmail, buildInviteEmail, buildJoinEmail } from "./email";

/**
 * Creates an in-app notification for a single user and attempts to send
 * a matching email. This is the central helper used across the app.
 */
export async function notifyUser(opts: {
  tripId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  actorName: string;
  sendEmail?: boolean;
  emailData?: {
    to: string;
    toName: string;
    subject: string;
    html: string;
  };
}): Promise<void> {
  let emailSent = false;

  if (opts.sendEmail && opts.emailData) {
    const result = await sendEmail({
      to: opts.emailData.to,
      toName: opts.emailData.toName,
      subject: opts.emailData.subject,
      html: opts.emailData.html,
      tripId: opts.tripId,
    });
    emailSent = result.delivered || result.logged;
  }

  await db.insert(notifications).values({
    tripId: opts.tripId,
    userId: opts.userId,
    title: opts.title,
    message: opts.message,
    type: opts.type,
    email: opts.emailData?.to || null,
    emailSent,
  });
}

/**
 * Notifies all participants of a trip (except optionally one user) that
 * an expense was created / updated / deleted.
 */
export async function notifyExpenseChange(opts: {
  tripId: string;
  actorUserId: string;
  actorName: string;
  action: string;
  category: string;
  amount: string;
  currency: string;
}): Promise<void> {
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, opts.tripId));

  const participants = await db
    .select({
      userId: tripParticipants.userId,
      name: users.name,
      email: users.email,
    })
    .from(tripParticipants)
    .leftJoin(users, eq(tripParticipants.userId, users.id))
    .where(eq(tripParticipants.tripId, opts.tripId));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  for (const p of participants) {
    if (p.userId === opts.actorUserId) continue; // don't notify the actor

    const emailData = p.email
      ? buildExpenseEmail({
          tripTitle: trip?.title || "Поездка",
          actorName: opts.actorName,
          action: opts.action,
          category: opts.category,
          amount: opts.amount,
          currency: opts.currency,
          recipientName: p.name || p.email,
        })
      : undefined;

    await notifyUser({
      tripId: opts.tripId,
      userId: p.userId,
      title: "Изменение траты",
      message: `${opts.actorName}: ${opts.action} — ${opts.category} (${opts.amount} ${opts.currency})`,
      type: "expense",
      actorName: opts.actorName,
      sendEmail: !!p.email,
      emailData: p.email
        ? {
            to: p.email,
            toName: p.name || p.email,
            subject: emailData!.subject,
            html: emailData!.html,
          }
        : undefined,
    });
  }
}

/**
 * Sends an invitation email + notification to a participant. The recipient
 * may not yet be a registered user, so we only create a notification if a
 * user account exists for that email.
 */
export async function notifyInvite(opts: {
  tripId: string;
  inviterUserId: string;
  inviterName: string;
  recipientEmail: string;
  inviteLink: string;
}): Promise<void> {
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, opts.tripId));

  const emailData = buildInviteEmail({
    tripTitle: trip?.title || "Поездка",
    inviterName: opts.inviterName,
    recipientEmail: opts.recipientEmail,
    inviteLink: opts.inviteLink,
  });

  await sendEmail({
    to: opts.recipientEmail,
    subject: emailData.subject,
    html: emailData.html,
    tripId: opts.tripId,
  });

  // If a registered user matches the email, create an in-app notification too
  const [recipient] = await db
    .select()
    .from(users)
    .where(eq(users.email, opts.recipientEmail));

  if (recipient) {
    await notifyUser({
      tripId: opts.tripId,
      userId: recipient.id,
      title: "Вас пригласили в поездку",
      message: `${opts.inviterName} приглашает вас в поездку «${trip?.title || ""}»`,
      type: "invite",
      actorName: opts.inviterName,
      sendEmail: false,
    });
  }
}

/**
 * Notifies the trip owner that a new participant joined.
 */
export async function notifyParticipantJoined(opts: {
  tripId: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  participantName: string;
}): Promise<void> {
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, opts.tripId));

  const emailData = buildJoinEmail({
    tripTitle: trip?.title || "Поездка",
    participantName: opts.participantName,
    ownerName: opts.ownerName,
    ownerEmail: opts.ownerEmail,
  });

  await notifyUser({
    tripId: opts.tripId,
    userId: opts.ownerId,
    title: "Новый участник",
    message: `${opts.participantName} присоединился(лась) к поездке «${trip?.title || ""}»`,
    type: "participant",
    actorName: opts.participantName,
    sendEmail: !!opts.ownerEmail,
    emailData: opts.ownerEmail
      ? {
          to: opts.ownerEmail,
          toName: opts.ownerName,
          subject: emailData.subject,
          html: emailData.html,
        }
      : undefined,
  });
}

/**
 * Checks if there are any pending invitations for the given user's email
 * and automatically links them into tripParticipants.
 */
export async function linkPendingInvitations(userId: string, email: string): Promise<void> {
  try {
    const { invitations } = await import("@/db/schema");
    const pending = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.email, email), eq(invitations.status, "pending")));

    for (const inv of pending) {
      const [already] = await db
        .select()
        .from(tripParticipants)
        .where(and(eq(tripParticipants.tripId, inv.tripId), eq(tripParticipants.userId, userId)));

      if (!already) {
        await db.insert(tripParticipants).values({
          tripId: inv.tripId,
          userId: userId,
          role: "participant",
        });
      }

      await db
        .update(invitations)
        .set({ status: "accepted" })
        .where(eq(invitations.id, inv.id));
    }
  } catch (err) {
    console.error("linkPendingInvitations error:", err);
  }
}
