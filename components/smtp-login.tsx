"use client"

import { useState, type FormEvent } from "react"

export function SmtpLogin({ user, onChange }: { user: string | null; onChange: (user: string | null) => void }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [sender, setSender] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sender.trim() || !password) {
      setError("Bitte E-Mail-Adresse und Passwort eingeben.")
      return
    }

    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: username.trim(), pass: password, from: sender.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setPassword("")
      onChange(data.user)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    try {
      await fetch("/api/login", { method: "DELETE" })
      onChange(null)
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <div>
        <p>
          Logged in as <strong>{user}</strong>
        </p>
        <button type="button" onClick={logout} disabled={busy}>
          Log Out
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={login}>
      <label htmlFor="smtpSender">Email</label>
      <input
        id="smtpSender"
        type="email"
        autoComplete="email"
        placeholder="Your email address, e.g. max.mustermann@tum.de"
        value={sender}
        onChange={(event) => setSender(event.target.value)}
      />

      <label htmlFor="smtpPassword">Password</label>
      <input
        id="smtpPassword"
        type="password"
        autoComplete="current-password"
        placeholder="Your mail password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <label htmlFor="smtpUser">SMTP Username (optional)</label>
      <input
        id="smtpUser"
        autoComplete="username"
        placeholder="Only if different from your email, e.g. CIT login musterma"
        aria-describedby="smtpUserHint"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />
      <p id="smtpUserHint">
        Leave empty to log in with your email address. For the CIT server, enter your CIT login without @cit.tum.de.
      </p>

      <button type="submit" disabled={busy}>
        {busy ? "Logging in..." : "Log In"}
      </button>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </form>
  )
}
