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
    return Response.json(
      { error: (error as Error).message || "Could not read Google Sheet." },
      { status: 500 },
    )
  }
}
