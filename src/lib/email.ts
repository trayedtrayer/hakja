import nodemailer from "nodemailer";
import { db } from "@/db";
import { sentEmails } from "@/db/schema";

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  tripId?: string;
}

/**
 * Sends an email. If SMTP credentials are configured via environment
 * variables it will attempt a real delivery. Otherwise it gracefully
 * falls back to logging the email into the `sent_emails` table so the
 * messaging flow can be demonstrated without an external mail server.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{
  delivered: boolean;
  logged: boolean;
}> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromAddress =
    process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@travel-together.app";

  let delivered = false;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: fromAddress,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text || opts.subject,
      });
      delivered = true;
    } catch (err) {
      console.error("Email delivery failed, falling back to log:", err);
      delivered = false;
    }
  }

  // Always log the email so it can be viewed in the demo inbox.
  try {
    await db.insert(sentEmails).values({
      to: opts.to,
      toName: opts.toName || null,
      subject: opts.subject,
      html: opts.html,
      textContent: opts.text || null,
      tripId: opts.tripId || null,
      status: delivered ? "sent" : "logged",
    });
  } catch (err) {
    console.error("Failed to log email:", err);
  }

  return { delivered, logged: true };
}

// ── Pre-built notification email templates ──

export function buildExpenseEmail(opts: {
  tripTitle: string;
  actorName: string;
  action: string;
  category: string;
  amount: string;
  currency: string;
  recipientName: string;
}): { subject: string; html: string } {
  const subject = `[${opts.tripTitle}] ${opts.action}: ${opts.category}`;
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f8fafc;">
    <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
      <div style="font-size: 40px; margin-bottom: 12px;">💸</div>
      <h2 style="color: #1e293b; margin: 0 0 8px;">Привет, ${escapeHtml(opts.recipientName)}!</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
        В поездке <b>${escapeHtml(opts.tripTitle)}</b> произошло изменение по тратам.
      </p>
      <div style="background: #eef2ff; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #4338ca; font-size: 14px;">
          <b>${escapeHtml(opts.actorName)}</b> ${escapeHtml(opts.action)}
        </p>
        <p style="margin: 8px 0 0; color: #1e293b; font-size: 16px;">
          ${escapeHtml(opts.category)} — <b>${escapeHtml(opts.amount)} ${escapeHtml(opts.currency)}</b>
        </p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}"
         style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">
        Открыть поездку
      </a>
      <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">
        Это автоматическое уведомление от TravelTogether.
      </p>
    </div>
  </div>`;
  return { subject, html };
}

export function buildInviteEmail(opts: {
  tripTitle: string;
  inviterName: string;
  recipientEmail: string;
  inviteLink: string;
}): { subject: string; html: string } {
  const subject = `${opts.inviterName} приглашает вас в поездку «${opts.tripTitle}»`;
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f8fafc;">
    <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
      <div style="font-size: 40px; margin-bottom: 12px;">✈️</div>
      <h2 style="color: #1e293b; margin: 0 0 8px;">Привет!</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
        <b>${escapeHtml(opts.inviterName)}</b> приглашает вас присоединиться к совместной поездке
        <b>«${escapeHtml(opts.tripTitle)}»</b> в приложении TravelTogether.
      </p>
      <a href="${opts.inviteLink}"
         style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">
        Присоединиться к поездке
      </a>
      <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0;">
        Если кнопка не работает, скопируйте ссылку:<br/>${opts.inviteLink}
      </p>
    </div>
  </div>`;
  return { subject, html };
}

export function buildJoinEmail(opts: {
  tripTitle: string;
  participantName: string;
  ownerName: string;
  ownerEmail: string;
}): { subject: string; html: string } {
  const subject = `[${opts.tripTitle}] Новый участник присоединился`;
  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f8fafc;">
    <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
      <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
      <h2 style="color: #1e293b; margin: 0 0 8px;">${escapeHtml(opts.ownerName)}, у вас новый попутчик!</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
        <b>${escapeHtml(opts.participantName)}</b> присоединился(лась) к поездке
        <b>«${escapeHtml(opts.tripTitle)}»</b>.
      </p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}"
         style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">
        Открыть поездку
      </a>
    </div>
  </div>`;
  return { subject, html };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
