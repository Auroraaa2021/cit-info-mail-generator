import { InfoMailGenerator } from "@/components/info-mail-generator"
import { getSmtpCredentials } from "@/lib/smtp-session"

export default async function Page() {
  const credentials = await getSmtpCredentials()
  return <InfoMailGenerator initialSmtpUser={credentials?.user ?? null} />
}
