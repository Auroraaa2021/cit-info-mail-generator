import "server-only"
import nodemailer from "nodemailer"
import type { SmtpCredentials } from "@/lib/smtp-session"

function getMailer(credentials: SmtpCredentials) {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    auth: credentials,
  })
}

export async function verifySmtpLogin(credentials: SmtpCredentials) {
  await getMailer(credentials).verify()
}

export async function sendEmail({
  credentials,
  subject,
  html,
  recipients,
}: {
  credentials: SmtpCredentials
  subject: string
  html: string
  recipients: string[]
}) {
  const transporter = getMailer(credentials)

  return transporter.sendMail({
    from: process.env.SMTP_FROM || credentials.user,
    // Own address is the visible To; newsletter recipients are BCC so they don't see one another.
    to: process.env.DEFAULT_TO_ADDRESS || credentials.user,
    bcc: recipients,
    subject,
    html,
    text: "Please view this email in an HTML-compatible email client.",
  })
}
