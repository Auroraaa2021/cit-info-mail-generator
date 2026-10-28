import { loadNewsletter } from "@/lib/newsletter"
import { sendEmail } from "@/lib/mailer"
import { getSmtpCredentials } from "@/lib/smtp-session"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const credentials = await getSmtpCredentials()
    if (!credentials) {
      return Response.json({ error: "Please log in with your SMTP account first." }, { status: 401 })
    }

    const { sheetUrl, finalAddress, cutoffDate } = await request.json()

    if (!sheetUrl) {
      return Response.json({ error: "Google Sheet URL is required." }, { status: 400 })
    }

    const recipients = String(finalAddress ?? "")
      .split(";")
      .map((address) => address.trim())
      .filter(Boolean)

    if (recipients.length === 0) {
      return Response.json({ error: "A broadcast Email address is required." }, { status: 400 })
    }

    const invalid = recipients.filter((address) => !EMAIL_PATTERN.test(address))
    if (invalid.length > 0) {
      return Response.json({ error: "Invalid Email address: " + invalid.join("; ") }, { status: 400 })
    }

    if (recipients.length > 20) {
      return Response.json({ error: "A maximum of 20 Email addresses is allowed." }, { status: 400 })
    }

    const newsletter = await loadNewsletter(sheetUrl, { cutoffDate })

    await sendEmail({
      credentials,
      subject: newsletter.emailTitle,
      html: newsletter.html,
      recipients,
      direct: true,
    })

    return Response.json({ success: true, recipients })
  } catch (error) {
    console.error(error)
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
}
