import "server-only"
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"

export type SmtpCredentials = { user: string; pass: string; from: string }

const COOKIE_NAME = "smtp_session"
const MAX_AGE_SECONDS = 60 * 60 * 8

function getKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("SESSION_SECRET is not configured.")
  return createHash("sha256").update(secret).digest()
}

function encrypt(credentials: SmtpCredentials) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url")
}

function decrypt(token: string): SmtpCredentials | null {
  try {
    const raw = Buffer.from(token, "base64url")
    const decipher = createDecipheriv("aes-256-gcm", getKey(), raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(12, 28))
    const decrypted = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8")
    const parsed = JSON.parse(decrypted)
    return typeof parsed?.user === "string" &&
      typeof parsed?.pass === "string" &&
      typeof parsed?.from === "string"
      ? parsed
      : null
  } catch {
    return null
  }
}

export async function getSmtpCredentials() {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  return token ? decrypt(token) : null
}

export async function setSmtpSession(credentials: SmtpCredentials) {
  ;(await cookies()).set(COOKIE_NAME, encrypt(credentials), {
    httpOnly: true,
    secure: true,
    // "none" keeps the session working inside the embedded v0 preview iframe.
    sameSite: "none",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function clearSmtpSession() {
  ;(await cookies()).delete({ name: COOKIE_NAME, path: "/", secure: true, sameSite: "none" })
}
