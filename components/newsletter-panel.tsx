"use client"

import { useState, type SyntheticEvent } from "react"
import { SmtpLogin } from "@/components/smtp-login"

export type Newsletter = {
  title: string
  html: string
  entryCount: number
  categoryCount: number
  recipientCount: number
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  return { response, data: await response.json() }
}

function handlePreviewLoad(event: SyntheticEvent<HTMLIFrameElement>) {
  const doc = event.currentTarget.contentDocument
  if (!doc) return

  doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (clickEvent) => {
      clickEvent.preventDefault()
      const target = doc.getElementById(link.getAttribute("href")!.substring(1))
      target?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  })
}

export function NewsletterPanel({
  newsletter,
  sheetUrl,
  smtpUser,
  onSmtpUserChange,
}: {
  newsletter: Newsletter
  sheetUrl: string
  smtpUser: string | null
  onSmtpUserChange: (user: string | null) => void
}) {
  const loggedIn = Boolean(smtpUser)
  const [testAddress, setTestAddress] = useState("")
  const [sending, setSending] = useState(false)

  async function sendTest() {
    const address = testAddress.trim()

    if (!address) {
      alert("Enter a test email address.")
      return
    }

    if (!confirm("Send test email to " + address + "?")) return

    setSending(true)
    try {
      const { response, data } = await postJson("/api/send-test", { sheetUrl, testAddress: address })
      alert(response.ok ? "Test email sent." : data.error)
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setSending(false)
    }
  }

  async function sendNewsletter() {
    if (!confirm("This will send the newsletter to ALL addresses in the list tab.\n\nContinue?")) return
    if (!confirm("Final confirmation:\n\nHave you already sent and checked a test email?")) return

    setSending(true)
    try {
      const { response, data } = await postJson("/api/send", { sheetUrl })
      alert(response.ok ? "Newsletter sent to " + data.recipientCount + " recipients." : data.error)
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="panel" id="newsletterPanel">
      <h2>{newsletter.title}</h2>

      <div className="stats">
        <span>
          Entries: <strong>{newsletter.entryCount}</strong>
        </span>
        <span>
          Categories: <strong>{newsletter.categoryCount}</strong>
        </span>
        <span>
          Recipients: <strong>{newsletter.recipientCount}</strong>
        </span>
      </div>

      <h3>Preview</h3>

      <iframe id="preview" title="Newsletter preview" srcDoc={newsletter.html} onLoad={handlePreviewLoad} />

      <hr />

      <h3>SMTP Login</h3>

      <SmtpLogin user={smtpUser} onChange={onSmtpUserChange} />

      {loggedIn && (
        <>
          <hr />

          <h3>Test email</h3>

          <label htmlFor="testAddress" className="sr-only">
            Test email address
          </label>
          <input
            id="testAddress"
            type="email"
            placeholder="your.name@tum.de"
            value={testAddress}
            onChange={(event) => setTestAddress(event.target.value)}
          />

          <button type="button" onClick={sendTest} disabled={sending}>
            Send Test Email
          </button>

          <hr />

          <h3>Final Send</h3>

          <p>
            This will send the current newsletter to every address in the <strong>list</strong> tab.
          </p>

          <button type="button" className="danger" onClick={sendNewsletter} disabled={sending}>
            Send Newsletter
          </button>
        </>
      )}
    </section>
  )
}
