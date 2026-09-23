# BidBrief v0.1

A deploy-today MVP for specialty subcontractors: upload bid PDFs and get a source-cited checklist of administrative/commercial requirements.

## What this build intentionally does

- Upload up to 12 PDFs in the browser.
- Extract text page-by-page in the browser with PDF.js.
- Send only extracted text + page numbers to the server-side analysis route.
- Generate a structured brief with citations using Vercel AI SDK + AI Gateway.
- Return "Not found" when a requirement is not supported by the supplied documents.
- Print the generated report cleanly from the browser.

## What is intentionally NOT in v0

- User accounts
- Database/storage
- Payments
- OCR for scanned/image-only PDFs
- Drawing takeoff
- Estimating
- Procore/BuildingConnected integrations
- Project dashboards

Those should only be added after real users send bid packages and at least one pays for a second report.

## Deploy

1. Put this folder in a Git repository.
2. Import the repository into Vercel.
3. In Vercel, create an AI Gateway API key and add it as:

```bash
AI_GATEWAY_API_KEY=...
```

4. Deploy.

The analysis route uses `anthropic/claude-sonnet-5` through Vercel AI Gateway. If you change the model later, use a Gateway model that supports structured output.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Then open http://localhost:3000.

## Fast validation script

Do not spend the next day adding features. Use the deployed URL to get 5 real packages.

Offer: "Send me one active bid package. I'll run the first brief free. If it saves you time, the next one is $19."

Success signal: someone pays for brief #2.
