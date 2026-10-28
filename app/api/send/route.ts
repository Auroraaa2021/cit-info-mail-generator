import { loadNewsletter } from "@/lib/newsletter"
import { sendEmail } from "@/lib/mailer"

export async function POST(request: Request) {
  try {
    const { sheetUrl } = await request.json()

    if (!sheetUrl) {
      return Response.json({ error: "Google Sheet URL is required." }, { status: 400 })
    }

    const newsletter = await loadNewsletter(sheetUrl)

    if (newsletter.recipients.length === 0) {
      throw new Error("Recipient list is empty.")
    }

    await sendEmail({
      subject: newsletter.emailTitle,
      html: newsletter.html,
      recipients: newsletter.recipients,
    })

    return Response.json({ success: true, recipientCount: newsletter.recipients.length })
  } catch (error) {
    console.error(error)
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
}
