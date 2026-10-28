import { loadNewsletter } from "@/lib/newsletter"
import { sendEmail } from "@/lib/mailer"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const { sheetUrl, testAddress } = await request.json()

    if (!sheetUrl) {
      return Response.json({ error: "Google Sheet URL is required." }, { status: 400 })
    }

    if (!testAddress || !EMAIL_PATTERN.test(testAddress)) {
      return Response.json({ error: "A valid test email address is required." }, { status: 400 })
    }

    const newsletter = await loadNewsletter(sheetUrl)

    await sendEmail({
      subject: "[TEST] " + newsletter.emailTitle,
      html: newsletter.html,
      recipients: [testAddress],
    })

    return Response.json({ success: true, message: `Test email sent to ${testAddress}.` })
  } catch (error) {
    console.error(error)
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
}
