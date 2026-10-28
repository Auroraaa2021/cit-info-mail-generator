"use client"

import { useState, type FormEvent } from "react"

export function SmtpLogin({ user, onChange }: { user: string | null; onChange: (user: string | null) => void }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError("Bitte CIT-Login (ohne @cit.tum.de) und CIT-Passwort eingeben.")
      return
    }

    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: username.trim(), pass: password }),
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
      <label htmlFor="smtpUser">SMTP Username (CIT-Login OHNE @cit.tum.de, wie musterma)</label>
      <input
        id="smtpUser"
        autoComplete="username"
        placeholder="musterma"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <label htmlFor="smtpPassword">SMTP Password (CIT-Passwort)</label>
      <input
        id="smtpPassword"
        type="password"
        autoComplete="current-password"
        placeholder="CIT-Passwort"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
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
