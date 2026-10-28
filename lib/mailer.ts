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

const MAIL_DOMAIN = process.env.SMTP_MAIL_DOMAIN || "cit.tum.de"

// Users log in with their bare CIT-Login (e.g. "musterma"), which is not a valid mailbox on its own.
function toMailAddress(user: string) {
  return user.includes("@") ? user : `${user}@${MAIL_DOMAIN}`
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
  const senderAddress = toMailAddress(credentials.user)

  return transporter.sendMail({
    from: process.env.SMTP_FROM || senderAddress,
    // Test mails go straight to the recipient; newsletters use the own address as To and BCC everyone else.
    to: direct ? recipients : process.env.DEFAULT_TO_ADDRESS || senderAddress,
    bcc: direct ? undefined : recipients,
    subject,
    html,
    text: "Please view this email in an HTML-compatible email client.",
  })
}
