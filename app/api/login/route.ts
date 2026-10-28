import { verifySmtpLogin } from "@/lib/mailer"
import { clearSmtpSession, setSmtpSession } from "@/lib/smtp-session"

export async function POST(request: Request) {
  try {
    const { user, pass } = await request.json()

    if (typeof user !== "string" || !user.trim() || typeof pass !== "string" || !pass) {
      return Response.json({ error: "SMTP username and password are required." }, { status: 400 })
    }

    const credentials = { user: user.trim(), pass }

    try {
      await verifySmtpLogin(credentials)
    } catch (error) {
      console.error(error)
      return Response.json({ error: "SMTP login failed. Check your username and password." }, { status: 401 })
    }

    await setSmtpSession(credentials)
    return Response.json({ user: credentials.user })
  } catch (error) {
    console.error(error)
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE() {
  await clearSmtpSession()
  return Response.json({ success: true })
}
