"use client"

import { useState, type SyntheticEvent } from "react"
import { SmtpLogin } from "@/components/smtp-login"

export type Newsletter = {
  title: string
  html: string
  entryCount: number
  categoryCount: number
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
  const [finalAddress, setFinalAddress] = useState("")
  const [sending, setSending] = useState(false)

  async function sendTest() {
    const addresses = testAddress
      .split(";")
      .map((address) => address.trim())
      .filter(Boolean)

    if (addresses.length === 0) {
      alert("Enter at least one test Email address.")
      return
    }

    const address = addresses.join("; ")

    if (!confirm("Send Test Email to:\n\n" + addresses.join("\n") + "\n\nContinue?")) return

    setSending(true)
    try {
      const { response, data } = await postJson("/api/send-test", { sheetUrl, testAddress: address })
      alert(response.ok ? "Test Email sent to " + address + "." : data.error)
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setSending(false)
    }
  }

  async function sendNewsletter() {
    const addresses = finalAddress
      .split(";")
      .map((address) => address.trim())
      .filter(Boolean)

    if (addresses.length === 0) {
      alert("Enter at least one broadcast Email address.")
      return
    }

    const address = addresses.join("; ")

    if (!confirm("This will send the newsletter to:\n\n" + addresses.join("\n") + "\n\nIt will be broadcast to everyone on that list. Continue?")) return
    if (!confirm("Final confirmation:\n\nHave you already sent and checked a test email?")) return

    setSending(true)
    try {
      const { response, data } = await postJson("/api/send", { sheetUrl, finalAddress: address })
      alert(response.ok ? "Newsletter sent to " + address + "." : data.error)
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
      </div>

      <h3>Preview</h3>

      <iframe id="preview" title="Newsletter preview" srcDoc={newsletter.html} onLoad={handlePreviewLoad} />

      <hr />

      <h3>SMTP Login</h3>

      <SmtpLogin user={smtpUser} onChange={onSmtpUserChange} />

      {loggedIn && (
        <>
          <hr />

          <h3>Test Email</h3>

          <label htmlFor="testAddress" className="sr-only">
            Test Email addresses, separated by semicolons
          </label>
          <input
            id="testAddress"
            type="text"
            inputMode="email"
            autoComplete="off"
            placeholder="addr1@tum.de; addr2@tum.de"
            value={testAddress}
            onChange={(event) => setTestAddress(event.target.value)}
          />

          <button type="button" onClick={sendTest} disabled={sending}>
            Send Test Email
          </button>

          <hr />

          <h3>Final Send</h3>

          <p>
            Enter the central mailing list address. The newsletter is sent there and broadcast to everyone on it.
            Separate several addresses with semicolons.
          </p>

          <label htmlFor="finalAddress" className="sr-only">
            Broadcast Email addresses, separated by semicolons
          </label>
          <input
            id="finalAddress"
            type="text"
            inputMode="email"
            autoComplete="off"
            placeholder="mailing-list@tum.de; addr1@tum.de; addr2@tum.de"
            value={finalAddress}
            onChange={(event) => setFinalAddress(event.target.value)}
          />

          <button type="button" className="danger" onClick={sendNewsletter} disabled={sending}>
            Send Newsletter
          </button>
        </>
      )}
    </section>
  )
}
