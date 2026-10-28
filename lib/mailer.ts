import "server-only"
import nodemailer from "nodemailer"
import type { SmtpCredentials } from "@/lib/smtp-session"

function getMailer(credentials: SmtpCredentials) {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    auth: { user: credentials.user, pass: credentials.pass },
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
  direct = false,
}: {
  credentials: SmtpCredentials
  subject: string
  html: string
  recipients: string[]
  direct?: boolean
}) {
  const transporter = getMailer(credentials)
  // LRZ rejects any From/envelope sender that is not an address owned by the logged-in account.
  const senderAddress = credentials.from

  return transporter.sendMail({
    from: senderAddress,
    // Test mails go straight to the recipient; newsletters use the own address as To and BCC everyone else.
    to: direct ? recipients : process.env.DEFAULT_TO_ADDRESS || senderAddress,
    bcc: direct ? undefined : recipients,
    subject,
    html,
    text: "Please view this email in an HTML-compatible email client.",
  })
}
