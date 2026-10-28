# CIT Info-Mail Generator

A web app that turns a Google Sheet into a formatted CIT Info-Mail newsletter. You can preview it, download it as HTML, send a test, and then send it to everyone on the mailing list through your own CIT/LRZ mail account.

---

## Contents

1. [Preparing the Google Sheet](#1-preparing-the-google-sheet)
2. [Sharing the sheet with the app](#2-sharing-the-sheet-with-the-app)
3. [Workflow](#3-workflow)
4. [What the generated email looks like](#4-what-the-generated-email-looks-like)
5. [Security and privacy](#5-security-and-privacy)
6. [Troubleshooting](#6-troubleshooting)
7. [For developers](#7-for-developers)

---

## 1. Preparing the Google Sheet

The spreadsheet needs **three tabs**, named exactly `email`, `content` and `list` (all lowercase).

### Spreadsheet title → email subject

The **name of the spreadsheet** (the title at the top left in Google Sheets) becomes the email subject and the newsletter heading, e.g. `CIT Info-Mail November 2026`.

### Tab `email` — introduction text

| Cell | Content |
|------|---------|
| `A1` | The introduction text that appears at the top of the newsletter. |

- Line breaks inside the cell are kept.
- Formatting is kept, including **bold**, *italic*, underline, strikethrough, text color and links.
- Plain URLs and email addresses become clickable links automatically.

### Tab `content` — newsletter entries

Row 1 holds the headers. Every row after that is one entry.

| Column | Header | Required | Description |
|--------|--------|----------|-------------|
| A | Category | yes | Section the entry belongs to, e.g. `Events`, `Job Offers`, `Scholarships`. Rows without a category are skipped. |
| B | Title | recommended | Headline of the entry. |
| C | Date | optional | Event date in German format `DD.MM.YYYY` (e.g. `05.11.2026`). |
| D | Deadline | optional | Deadline in German format `DD.MM.YYYY`. |
| E | Further Information | optional | A URL. It appears as a **"Further Information"** link instead of the raw URL. |
| F | Description | optional | Body text. Formatting, line breaks and links are kept, the same as the intro. |

Example:

| Category | Title | Date | Deadline | Further Information | Description |
|----------|-------|------|----------|---------------------|-------------|
| Events | Welcome Day | 05.11.2026 | | https://www.cit.tum.de/... | Join us for ... |
| Events | Career Fair | 20.11.2026 | 10.11.2026 | | Meet companies ... |
| Job Offers | Student Assistant (HiWi) | | 30.11.2026 | https://... | We are looking for ... |

**How entries are grouped and sorted**

- Categories appear in the order in which they **first show up** in the sheet.
- Within each category, entries are sorted by date, **earliest first**:
  - The earlier of *Date* and *Deadline* decides the position.
  - If two entries tie, the other date decides.
  - Entries with **neither** a date nor a deadline go to the **bottom** of their category, in sheet order.
- A cell may also hold a range like `05.11.2026 – 07.11.2026`. The first date is used for sorting, and the text is shown exactly as written.
- Two-digit years (`05.11.26`) work, and so do real date-formatted cells.
- Rows that are completely empty are ignored, so blank rows between entries are fine.

### Tab `list` — recipients

| Column | Content |
|--------|---------|
| A | One recipient email address per row, starting at `A1`. |

- Empty rows are ignored.
- Duplicate addresses are removed automatically.
- Recipients are added as **BCC**, so nobody sees the other addresses.

---

## 2. Sharing the sheet with the app

The app reads your sheet through a Google service account. Before loading, share the spreadsheet with this address as a **Viewer**:

```
cit-infomail-reader@cit-info-mail.iam.gserviceaccount.com
```

In Google Sheets: **Share** → paste the address → role **Viewer** → **Send**. You can uncheck "Notify people".

If you skip this step, loading fails with a message asking you to share the sheet.

---

## 3. Workflow

The page works step by step, and each step only appears once the previous one has succeeded.

```
Paste Sheet URL → Load Newsletter → Preview → SMTP Login → Test Email → Final Send
```

### Step 1 — Load the newsletter

1. Paste the Google Sheet URL (e.g. `https://docs.google.com/spreadsheets/d/.../edit`) into **Google Sheet URL**.
2. Click **Load Newsletter**.
3. The app reads all three tabs and builds the email. It then shows the title, the number of categories, entries and recipients, and a live **Preview**.
4. Optional: click **Download HTML** to save the generated email as an `.html` file.

If you change the sheet, just click **Load Newsletter** again. Sending always uses the latest version of the sheet.

### Step 2 — SMTP login

The **SMTP Login** section appears after the newsletter has loaded. Emails go out through **your own** CIT/LRZ mail account.

| Field | What to enter |
|-------|---------------|
| SMTP Username | Your CIT login **without** `@cit.tum.de`, e.g. `musterma` |
| SMTP Password | Your CIT password |
| Sender Email | An email address that belongs to your account, e.g. `max.mustermann@tum.de` |

The app checks your login against the mail server. If it succeeds, you stay logged in for 8 hours or until you click **Log out**.

> The sender address must be one LRZ has assigned to your account. Any other address is rejected with `Sender address rejected: not owned by user`.

### Step 3 — Send a test email

1. The **Test Email** section appears after a successful login.
2. Enter one address, or several separated by `;`, e.g. `max.mustermann@tum.de; colleague@tum.de`. The limit is 20.
3. Click **Send Test Email** and confirm.
4. Every address receives the newsletter with the subject `[TEST] <title>`.
5. Check the email in your mail client: layout, links, dates and the table of contents.

### Step 4 — Final send

1. Click **Send Newsletter** in the **Final Send** section.
2. Two confirmation dialogs appear:
   - one warning that the mail goes to **all** addresses in the `list` tab
   - one asking whether you have already sent and checked a test email
3. The newsletter is sent **once**:
   - **To:** your own sender address (or a configured default address)
   - **BCC:** every recipient from the `list` tab
4. A status message reports how many recipients it was sent to.

---

## 4. What the generated email looks like

1. **Heading**: the spreadsheet title
2. **Introduction**: from `email!A1`
3. **Content**: a clickable table of contents, grouped by category, listing every entry title
4. **Sections**: one per category, each containing its sorted entries:
   - **Title**
   - **Date: …** and **Deadline: …** in bold, only when filled in, shown above the description with the same line spacing
   - Description
   - **Further Information** link, only when column E is filled in

The HTML uses inline styles, so it displays correctly in Outlook, Thunderbird, Apple Mail and webmail clients.

---

## 5. Security and privacy

- **Google access is read-only.** The service account can only read sheets that were shared with it explicitly.
- **SMTP credentials are never saved on the server.** After a successful login they are encrypted (AES-256-GCM) and kept in an HTTP-only, secure cookie in your browser. The cookie expires after 8 hours, and **Log out** deletes it right away.
- Each user sends from their own account, so mails come from you and not from a shared address.
- Recipients are always BCC'd.

---

## 6. Troubleshooting

| Message | Cause / fix |
|---------|-------------|
| *Share this Google Sheet with cit-infomail-reader@… as Viewer* | The sheet is not shared with the service account. See [section 2](#2-sharing-the-sheet-with-the-app). |
| *Unable to parse range* / tab not found | A tab is missing or misspelled. It must be exactly `email`, `content` and `list`. |
| *Recipient list is empty.* | The `list` tab has no addresses in column A. |
| *SMTP login failed* | Wrong username or password. Use the CIT login **without** `@cit.tum.de`. |
| *Sender address rejected: not owned by user* | Your **Sender Email** doesn't belong to your account. Use your official TUM/CIT address. |
| *Invalid Email address* | One of the test addresses is malformed. Separate multiple addresses with `;`. |
| An entry is missing | Column A (Category) is empty for that row. |
| Sorting looks wrong | Write dates as `DD.MM.YYYY`. Text such as `TBA` counts as no date and goes to the bottom. |

---

## 7. For developers

Built with Next.js (App Router), `@googleapis/sheets` and `nodemailer`.

### Project structure

| Path | Purpose |
|------|---------|
| `components/info-mail-generator.tsx` | Main page: sheet URL input, load and download |
| `components/newsletter-panel.tsx` | Summary, preview, test email and final send |
| `components/smtp-login.tsx` | SMTP login form |
| `lib/newsletter.ts` | Reads the sheet (with formatting), sorts entries, builds the email HTML |
| `lib/mailer.ts` | SMTP transport, login check and sending |
| `lib/smtp-session.ts` | Encrypted session cookie for SMTP credentials |
| `app/api/load` | `POST` → loads and renders the newsletter |
| `app/api/login` | `POST` → checks the SMTP login and sets the session · `DELETE` → logs out |
| `app/api/send-test` | `POST` → sends a test email to the given addresses |
| `app/api/send` | `POST` → sends the newsletter to the full list |

### Environment variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_EMAIL` | Service-account email |
| `GOOGLE_PRIVATE_KEY` | Service-account private key (literal `\n` is supported) |
| `SMTP_HOST` | SMTP server, e.g. `postout.lrz.de` |
| `SMTP_PORT` | Optional, default `465` |
| `SMTP_SECURE` | Optional, default `true` |
| `SESSION_SECRET` | Random string used to encrypt the SMTP session cookie |
| `DEFAULT_TO_ADDRESS` | Optional `To:` address for the final send (defaults to the sender) |

You can use `GOOGLE_SERVICE_ACCOUNT_JSON` (the full JSON) or `GOOGLE_APPLICATION_CREDENTIALS` (a key file path) instead of the two Google variables.

### Run locally

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

This repository is linked to a [v0](https://v0.app) project. Changes merged into `main` deploy automatically to Vercel.
