import "server-only"
import nodemailer from "nodemailer"

function getMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export async function sendEmail({
  subject,
  html,
  recipients,
}: {
  subject: string
  html: string
  recipients: string[]
}) {
  const transporter = getMailer()

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    // Own address is the visible To; newsletter recipients are BCC so they don't see one another.
    to: process.env.SMTP_EMAIL,
    bcc: recipients,
    subject,
    html,
    text: "Please view this email in an HTML-compatible email client.",
  })
}
