import { loadNewsletter } from "@/lib/newsletter"

export async function POST(request: Request) {
  try {
    const { sheetUrl } = await request.json()
    const newsletter = await loadNewsletter(sheetUrl)

    return Response.json({
      title: newsletter.emailTitle,
      html: newsletter.html,
      recipientCount: newsletter.recipientCount,
      categoryCount: newsletter.categoryCount,
      entryCount: newsletter.entryCount,
    })
  } catch (error) {
    console.error(error)
    const err = error as Error & { code?: number; status?: number }
    const message = err.message || ""
    const isPermissionError =
      err.code === 403 ||
      err.status === 403 ||
      /does not have permission|PERMISSION_DENIED/i.test(message)

    if (isPermissionError) {
      const serviceAccount =
        process.env.GOOGLE_CLIENT_EMAIL || "cit-infomail-reader@cit-info-mail.iam.gserviceaccount.com"
      return Response.json(
        {
          error: `No access to this Google Sheet. Please share the sheet with ${serviceAccount} as Viewer, so this site can read it.`,
        },
        { status: 403 },
      )
    }

    return Response.json({ error: message || "Could not read Google Sheet." }, { status: 500 })
  }
}
