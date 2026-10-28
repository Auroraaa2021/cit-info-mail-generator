import "server-only"
import { sheets as googleSheets, auth as googleAuth, type sheets_v4 } from "@googleapis/sheets"

type Cell = sheets_v4.Schema$CellData
type TextFormat = sheets_v4.Schema$TextFormat

// =======================================================
// GOOGLE AUTH
// =======================================================

function getGoogleSheetsClient() {
  const scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS

  let authClient

  if (clientEmail && privateKey) {
    authClient = new googleAuth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        // Env vars often store the key with literal "\n" sequences and optional wrapping quotes.
        private_key: privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n"),
      },
      scopes,
    })
  } else if (inlineJson) {
    authClient = new googleAuth.GoogleAuth({
      credentials: JSON.parse(inlineJson),
      scopes,
    })
  } else if (keyFile) {
    authClient = new googleAuth.GoogleAuth({ keyFile, scopes })
  } else {
    throw new Error(
      "Google credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON to the contents of your service-account JSON file.",
    )
  }

  return googleSheets({ version: "v4", auth: authClient })
}

// =======================================================
// UTILITIES
// =======================================================

function escapeHtml(text: unknown) {
  if (text === null || text === undefined) return ""

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function escapeHtmlAttribute(text: unknown) {
  if (text === null || text === undefined) return ""

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function autoLinkText(text: string) {
  if (!text) return ""

  text = text.replace(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi, '<a href="mailto:$1">$1</a>')

  text = text.replace(/\b(https?:\/\/[^\s<]+)/gi, (match) => {
    let url = match
    let trailing = ""

    while (/[.,;:!?)\]]$/.test(url)) {
      trailing = url.slice(-1) + trailing
      url = url.slice(0, -1)
    }

    return `<a href="${escapeHtmlAttribute(url)}" target="_blank">${url}</a>${trailing}`
  })

  return text
}

function spreadsheetIdFromUrl(input: string) {
  if (!input) {
    throw new Error("Google Sheet URL is missing.")
  }

  if (!input.includes("/")) {
    return input.trim()
  }

  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)

  if (!match) {
    throw new Error("Invalid Google Sheets URL.")
  }

  return match[1]
}

function getCellText(cell?: Cell) {
  if (!cell) return ""

  if (cell.formattedValue !== undefined && cell.formattedValue !== null) {
    return String(cell.formattedValue)
  }

  const value = cell.effectiveValue || {}

  if (value.stringValue != null) return value.stringValue
  if (value.numberValue != null) return String(value.numberValue)
  if (value.boolValue != null) return String(value.boolValue)

  return ""
}

// =======================================================
// GOOGLE SHEETS RICH TEXT -> HTML
// =======================================================

function mergeTextFormat(base: TextFormat = {}, run: TextFormat = {}): TextFormat {
  return {
    bold: run.bold ?? base.bold,
    italic: run.italic ?? base.italic,
    underline: run.underline ?? base.underline,
    strikethrough: run.strikethrough ?? base.strikethrough,
    foregroundColorStyle: run.foregroundColorStyle || base.foregroundColorStyle,
    link: run.link || base.link,
  }
}

function colorStyleToCss(style?: sheets_v4.Schema$ColorStyle | null) {
  const rgb = style?.rgbColor
  if (!rgb) return null

  const r = Math.round((rgb.red || 0) * 255)
  const g = Math.round((rgb.green || 0) * 255)
  const b = Math.round((rgb.blue || 0) * 255)

  return `rgb(${r},${g},${b})`
}

function styleText(text: string, style?: TextFormat) {
  let result = escapeHtml(text).replace(/\n/g, "<br>")

  const explicitLink = style?.link?.uri

  if (explicitLink) {
    result = `<a href="${escapeHtmlAttribute(explicitLink)}" target="_blank">${result}</a>`
  } else {
    result = autoLinkText(result)
  }

  if (style?.bold) result = `<strong>${result}</strong>`
  if (style?.italic) result = `<em>${result}</em>`
  if (style?.underline) result = `<u>${result}</u>`
  if (style?.strikethrough) result = `<s>${result}</s>`

  const color = colorStyleToCss(style?.foregroundColorStyle)
  if (color) result = `<span style="color:${color};">${result}</span>`

  return result
}

function richCellToHtml(cell?: Cell) {
  if (!cell) return ""

  const text = getCellText(cell)
  if (!text) return ""

  const baseFormat = cell.effectiveFormat?.textFormat || {}
  const runs = cell.textFormatRuns || []

  if (runs.length === 0) {
    let style = baseFormat

    if (cell.hyperlink && !style.link) {
      style = { ...style, link: { uri: cell.hyperlink } }
    }

    return styleText(text, style)
  }

  let html = ""

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i]
    const start = run.startIndex || 0
    const end = i + 1 < runs.length ? runs[i + 1].startIndex || text.length : text.length

    html += styleText(text.slice(start, end), mergeTextFormat(baseFormat, run.format || {}))
  }

  return html
}

function extractCellUrl(cell?: Cell) {
  if (!cell) return ""
  if (cell.hyperlink) return cell.hyperlink

  const linkedRun = (cell.textFormatRuns || []).find((run) => run.format?.link?.uri)
  if (linkedRun?.format?.link?.uri) return linkedRun.format.link.uri

  const text = getCellText(cell).trim()
  const urlMatch = text.match(/https?:\/\/[^\s<>"]+/i) || text.match(/www\.[^\s<>"]+/i)
  if (!urlMatch) return ""

  return urlMatch[0].startsWith("www.") ? `https://${urlMatch[0]}` : urlMatch[0]
}

// =======================================================
// READ ONE RANGE INCLUDING FORMATTING
// =======================================================

async function readSheetRange(spreadsheetId: string, range: string) {
  const sheets = getGoogleSheetsClient()

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [range],
    includeGridData: true,
    fields:
      "properties.title," +
      "sheets(properties(title)," +
      "data(startRow,startColumn,rowData(values(" +
      "formattedValue,effectiveValue,hyperlink," +
      "effectiveFormat(textFormat)," +
      "textFormatRuns))))",
  })

  return response.data
}

function extractRows(response: sheets_v4.Schema$Spreadsheet): Cell[][] {
  const data = response.sheets?.[0]?.data?.[0]
  if (!data) return []

  return (data.rowData || []).map((row) => row.values || [])
}

// =======================================================
// LOAD NEWSLETTER FROM GOOGLE SHEET
// =======================================================

type Entry = {
  title: string
  dateText: string
  deadlineText: string
  furtherInfoUrl: string
  descriptionHtml: string
  id: string
  order: number
  sortKey: number
  secondaryKey: number
}

const GOOGLE_SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30)
const DAY_MS = 24 * 60 * 60 * 1000

// Parses German dates (DD.MM.YYYY or DD.MM.YY). If a cell holds a range, the first date counts.
function parseGermanDate(cell?: Cell): number | null {
  const text = getCellText(cell).trim()

  const match = text.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})/)
  if (match) {
    const day = Number(match[1])
    const month = Number(match[2])
    let year = Number(match[3])
    if (year < 100) year += 2000

    const timestamp = Date.UTC(year, month - 1, day)
    const parsed = new Date(timestamp)
    if (parsed.getUTCDate() === day && parsed.getUTCMonth() === month - 1) {
      return timestamp
    }
  }

  const serial = cell?.effectiveValue?.numberValue
  if (typeof serial === "number" && serial > 0) {
    return GOOGLE_SHEETS_EPOCH_MS + Math.floor(serial) * DAY_MS
  }

  return null
}

function compareEntries(a: Entry, b: Entry) {
  if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey
  if (a.secondaryKey !== b.secondaryKey) return a.secondaryKey - b.secondaryKey
  return a.order - b.order
}

export async function loadNewsletter(sheetUrl: string) {
  const spreadsheetId = spreadsheetIdFromUrl(sheetUrl)

  const [emailResponse, contentResponse] = await Promise.all([
    readSheetRange(spreadsheetId, "email!A1"),
    readSheetRange(spreadsheetId, "content!A2:F"),
  ])

  const emailTitle = emailResponse.properties?.title || "CIT Info-Mail"

  const introHtml = richCellToHtml(extractRows(emailResponse)?.[0]?.[0])

  const grouped: Record<string, Entry[]> = {}
  const categoryOrder: string[] = []

  extractRows(contentResponse).forEach((row, index) => {
    const [categoryCell, titleCell, dateCell, deadlineCell, furtherInfoCell, descriptionCell] = row

    const category = getCellText(categoryCell).trim()
    const title = getCellText(titleCell).trim()
    const dateText = getCellText(dateCell).trim()
    const deadlineText = getCellText(deadlineCell).trim()
    const furtherInfoText = getCellText(furtherInfoCell).trim()
    const descriptionText = getCellText(descriptionCell).trim()

    if (!category) return
    if (!title && !dateText && !deadlineText && !furtherInfoText && !descriptionText) return

    if (!grouped[category]) {
      grouped[category] = []
      categoryOrder.push(category)
    }

    const dates = [parseGermanDate(dateCell), parseGermanDate(deadlineCell)]
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)

    grouped[category].push({
      title,
      dateText,
      deadlineText,
      furtherInfoUrl: furtherInfoText ? extractCellUrl(furtherInfoCell) : "",
      descriptionHtml: richCellToHtml(descriptionCell),
      id: `entry-${index}`,
      order: index,
      sortKey: dates[0] ?? Number.POSITIVE_INFINITY,
      secondaryKey: dates[1] ?? Number.POSITIVE_INFINITY,
    })
  })

  categoryOrder.forEach((category) => grouped[category].sort(compareEntries))

  const html = buildInfoMailHtml({ emailTitle, introHtml, grouped, categoryOrder })

  return {
    spreadsheetId,
    emailTitle,
    html,
    categoryCount: categoryOrder.length,
    entryCount: categoryOrder.reduce((sum, category) => sum + grouped[category].length, 0),
  }
}

// =======================================================
// BUILD EMAIL HTML
// =======================================================

function buildEntryMetaHtml(entry: Entry) {
  const lines: string[] = []

  if (entry.dateText) {
    lines.push(`<div style="font-weight:bold;"><strong>Date: ${escapeHtml(entry.dateText)}</strong></div>`)
  }
  if (entry.deadlineText) {
    lines.push(`<div style="font-weight:bold;"><strong>Deadline: ${escapeHtml(entry.deadlineText)}</strong></div>`)
  }
  if (lines.length === 0) return ""

  return `
        <div style="
          font-size:14px;
          line-height:1.15;
          margin:0;
        ">
          ${lines.join("\n")}
        </div>`
}

function buildFurtherInfoHtml(entry: Entry) {
  if (!entry.furtherInfoUrl) return ""

  return `
        <div style="
          font-size:14px;
          line-height:1.15;
          margin:0;
        ">
          <a href="${escapeHtmlAttribute(entry.furtherInfoUrl)}" target="_blank" style="color:#0563c1;">Further Information</a>
        </div>`
}

function buildInfoMailHtml({
  emailTitle,
  introHtml,
  grouped,
  categoryOrder,
}: {
  emailTitle: string
  introHtml: string
  grouped: Record<string, Entry[]>
  categoryOrder: string[]
}) {
  let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>

<body style="
  margin:0;
  padding:20px;
  background:#ffffff;
">

<div style="
  font-family:Arial, Helvetica, sans-serif;
  font-size:14px;
  line-height:1.15;
  color:#222222;
  max-width:1300px;
  margin:0 auto;
">

  <div style="
    text-align:center;
    margin-bottom:28px;
  ">
    <span style="
      background-color:#d9d9d9;
      font-weight:bold;
      font-size:14px;
    ">
      ${escapeHtml(emailTitle)}
    </span>
  </div>

  <div style="
    margin-bottom:30px;
  ">
    ${introHtml}
  </div>
`

  html += `
  <div
    id="content-overview"
    style="margin-bottom:30px;"
  >

    <div style="
      font-weight:bold;
      margin-bottom:16px;
    ">
      Content
    </div>
`

  categoryOrder.forEach((category) => {
    html += `
    <div style="
      font-weight:bold;
      text-decoration:underline;
      margin-top:12px;
      margin-bottom:8px;
    ">
      ${escapeHtml(category)}
    </div>
    `

    grouped[category].forEach((entry) => {
      html += `
      <div style="
        margin-left:56px;
        margin-bottom:8px;
      ">
        <a
          href="#${entry.id}"
          style="color:#0563c1;"
        >
          ${escapeHtml(entry.title)}
        </a>
      </div>
      `
    })
  })

  html += `
  </div>
  `

  categoryOrder.forEach((category) => {
    html += `
    <div style="
      background-color:#d9d9d9;
      text-align:center;
      font-size:18px;
      font-weight:bold;
      padding:2px 8px;
      margin-top:20px;
      margin-bottom:16px;
    ">
      ${escapeHtml(category)}
    </div>
    `

    grouped[category].forEach((entry) => {
      html += `
      <div
        id="${entry.id}"
        style="
          margin:0 16px 30px 16px;
        "
      >

        <div style="
          color:#00205b;
          font-size:19px;
          font-weight:bold;
          margin-bottom:10px;
        ">
          ${escapeHtml(entry.title)}
        </div>

        ${buildEntryMetaHtml(entry)}

        <div style="
          font-size:14px;
          line-height:1.15;
        ">
          ${entry.descriptionHtml}
        </div>
${buildFurtherInfoHtml(entry)}

      </div>
      `
    })

    html += `
    <div style="
      margin:20px 16px 25px 16px;
      font-size:14px;
    ">
      <a
        href="#content-overview"
        style="color:#0563c1;"
      >
        Back to the content overview
      </a>
    </div>
    `
  })

  html += `
</div>
</body>
</html>
`

  return html
}
