import { verifySmtpLogin } from "@/lib/mailer"
import { clearSmtpSession, setSmtpSession } from "@/lib/smtp-session"

export async function POST(request: Request) {
  try {
    const { user, pass, from } = await request.json()

    if (typeof from !== "string" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from.trim())) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 })
    }

    if (typeof pass !== "string" || !pass) {
      return Response.json({ error: "Password is required." }, { status: 400 })
    }

    if (user !== undefined && typeof user !== "string") {
      return Response.json({ error: "Invalid SMTP username." }, { status: 400 })
    }

    const credentials = { user: user?.trim() || from.trim(), pass, from: from.trim() }

    try {
      await verifySmtpLogin(credentials)
    } catch (error) {
      console.error(error)
      return Response.json({ error: "SMTP login failed. Check your password, or enter your SMTP username if your server does not accept the email address as login." }, { status: 401 })
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
