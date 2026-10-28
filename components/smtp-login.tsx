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
    if (!username.trim() || !password || !sender.trim()) {
      setError("Bitte CIT-Login (ohne @cit.tum.de), CIT-Passwort und Absender-E-Mail eingeben.")
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
      <label htmlFor="smtpUser">SMTP Username</label>
      <input
        id="smtpUser"
        autoComplete="username"
        placeholder="CIT login WITHOUT @cit.tum.de, e.g. musterma"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <label htmlFor="smtpPassword">SMTP Password</label>
      <input
        id="smtpPassword"
        type="password"
        autoComplete="current-password"
        placeholder="CIT-Passwort"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <label htmlFor="smtpSender">Sender Email</label>
      <input
        id="smtpSender"
        type="email"
        autoComplete="email"
        placeholder="Your TUM email address, e.g. max.mustermann@tum.de"
        value={sender}
        onChange={(event) => setSender(event.target.value)}
      />

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
