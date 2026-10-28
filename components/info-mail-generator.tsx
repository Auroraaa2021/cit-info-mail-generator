"use client"

import { useRef, useState } from "react"
import { NewsletterPanel, type Newsletter } from "@/components/newsletter-panel"

export function InfoMailGenerator({ initialSmtpUser }: { initialSmtpUser: string | null }) {
  const [smtpUser, setSmtpUser] = useState(initialSmtpUser)
  const [sheetUrl, setSheetUrl] = useState("")
  const [status, setStatus] = useState("")
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
  const loadedSheetUrl = useRef("")

  async function loadNewsletter() {
    const trimmed = sheetUrl.trim()

    if (!trimmed) {
      alert("Please enter the Google Sheet URL.")
      return
    }

    setStatus("Loading Google Sheet...")

    try {
      const response = await fetch("/api/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: trimmed }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      loadedSheetUrl.current = trimmed
      setNewsletter(data)
      setStatus("\u2713 Newsletter loaded.")
    } catch (error) {
      setStatus("Error: " + (error as Error).message)
    }
  }

  function downloadHtml() {
    if (!newsletter) {
      alert("Please load a newsletter first.")
      return
    }

    const blob = new Blob([newsletter.html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const safeTitle = newsletter.title.replace(/[/\\:*?"<>|]/g, "-").trim()

    link.href = url
    link.download = (safeTitle || "CIT Info-Mail") + ".html"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="container">
      <div className="panel">
        <h1>CIT Info-Mail</h1>

        <label htmlFor="sheetUrl">Google Sheet URL</label>

        <input
          id="sheetUrl"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={sheetUrl}
          onChange={(event) => setSheetUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return
            loadNewsletter()
          }}
        />

        <button type="button" onClick={loadNewsletter}>
          Load Newsletter
        </button>

        <button type="button" onClick={downloadHtml} disabled={!newsletter}>
          Download HTML
        </button>

        <div id="status" role="status" aria-live="polite">
          {status}
        </div>
      </div>

      {newsletter && (
        <NewsletterPanel
          newsletter={newsletter}
          sheetUrl={loadedSheetUrl.current}
          smtpUser={smtpUser}
          onSmtpUserChange={setSmtpUser}
        />
      )}
    </main>
  )
}
