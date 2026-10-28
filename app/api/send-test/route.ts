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

    const { sheetUrl, testAddress } = await request.json()

    if (!sheetUrl) {
      return Response.json({ error: "Google Sheet URL is required." }, { status: 400 })
    }

    if (!testAddress || !EMAIL_PATTERN.test(testAddress)) {
      return Response.json({ error: "A valid test email address is required." }, { status: 400 })
    }

    const newsletter = await loadNewsletter(sheetUrl)

    await sendEmail({
      credentials,
      subject: "[TEST] " + newsletter.emailTitle,
      html: newsletter.html,
      recipients: [testAddress],
      direct: true,
    })

    return Response.json({ success: true, message: `Test email sent to ${testAddress}.` })
  } catch (error) {
    console.error(error)
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
}
