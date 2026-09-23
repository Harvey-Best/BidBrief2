import { generateText, Output } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const findingSchema = z.object({
  category: z.string(),
  label: z.string(),
  value: z.string(),
  status: z.enum(['found', 'not_found', 'unclear']),
  document: z.string().nullable(),
  page: z.number().int().positive().nullable(),
  evidence: z.string().nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
  actionRequired: z.boolean(),
});

const briefSchema = z.object({
  projectName: z.string(),
  trade: z.string(),
  summary: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  criticalFlags: z.array(z.string()).max(8),
  findings: z.array(findingSchema).min(10).max(24),
  nextActions: z.array(z.string()).max(8),
  disclaimer: z.string(),
});

const REQUIRED_FIELDS = [
  'Bid due date and exact time',
  'Submission method and location/portal/email',
  'Pre-bid meeting or site walk',
  'RFI / bidder question deadline and contact',
  'Bid bond',
  'Performance bond',
  'Payment bond',
  'Insurance requirements',
  'Prevailing wage / labor agreement / PLA requirements',
  'Addenda acknowledgement requirements',
  'Alternates and unit prices',
  'Required bid forms and attachments',
  'Signature / notarization requirements',
  'Bid validity period',
  'Major schedule constraints / liquidated damages',
  'Licensing / prequalification requirements',
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      trade?: string;
      documents?: Array<{ name: string; pages: Array<{ page: number; text: string }> }>;
    };

    const trade = body.trade?.trim();
    const documents = body.documents ?? [];

    if (!trade || !documents.length) {
      return Response.json({ error: 'Trade and at least one document are required.' }, { status: 400 });
    }

    const pageCount = documents.reduce((total, doc) => total + doc.pages.length, 0);
    const charCount = documents.reduce(
      (total, doc) => total + doc.pages.reduce((n, page) => n + page.text.length, 0),
      0,
    );

    if (pageCount > 450 || charCount > 850_000) {
      return Response.json(
        {
          error:
            'This v0 limits a brief to 450 pages / about 850k extracted characters. Split the package and prioritize Division 00/01, invitation, bid forms, and addenda.',
        },
        { status: 413 },
      );
    }

    const corpus = documents
      .flatMap((doc) =>
        doc.pages.map(
          (page) =>
            `\n=== DOCUMENT: ${doc.name} | PAGE: ${page.page} ===\n${page.text.trim() || '[NO EXTRACTABLE TEXT]'}\n`,
        ),
      )
      .join('');

    const { output } = await generateText({
      model: 'anthropic/claude-sonnet-5',
      output: Output.object({
        name: 'bid_brief',
        description: 'A source-cited construction bid requirements brief.',
        schema: briefSchema,
      }),
      system: `You are BidBrief, a conservative construction bid-document analyst.
Your job is to extract administrative, commercial, and compliance requirements that a specialty subcontractor must know before submitting a bid.

ABSOLUTE RULES:
- Never invent a requirement.
- Never infer that something is required merely because it is common in construction.
- Every FOUND or UNCLEAR item must point to the document and page that supports it.
- Evidence must be a short exact or near-exact excerpt from the supplied page, preferably under 220 characters.
- If a requirement cannot be supported by the supplied documents, status must be NOT_FOUND, value must say "Not found in supplied documents", and document/page/evidence must be null.
- Use UNCLEAR when conflicting language, incomplete language, or multiple possible values exist.
- Treat dates/times, mandatory meetings, bid bonds, addenda acknowledgements, submission rules, and required forms as high priority.
- A high confidence rating means the requirement is explicit and unambiguous on the cited page. Medium means it is supported but context could matter. Low means the page is ambiguous or extraction appears damaged.
- This is a review aid, not a substitute for reading the contract documents.

The target subcontractor trade is: ${trade}.`,
      prompt: `Create a bid brief for the supplied package.

You MUST include one finding for each of these fields even when it is not found:
${REQUIRED_FIELDS.map((field, i) => `${i + 1}. ${field}`).join('\n')}

Also add up to 8 additional material findings if the documents contain unusual commercial or administrative requirements relevant to a ${trade} subcontractor.

Risk level:
- HIGH if there are explicit mandatory steps, near-term deadlines, unusual bonding/insurance/labor conditions, or conflicting requirements that could make a bid non-responsive.
- MEDIUM if requirements are normal but several actions/forms need attention.
- LOW only when the package is straightforward and the key fields are clear.

Critical flags should contain only the most time-sensitive or bid-disqualifying items.
Next actions should be concrete actions an estimator should take after reading the brief.

SUPPLIED DOCUMENT TEXT:${corpus}`,
    });

    return Response.json(output);
  } catch (error) {
    console.error('BidBrief analysis failed:', error);

    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes('requires a valid credit card') ||
      message.includes('customer_verification_required')
    ) {
      return Response.json(
        {
          error:
            'BidBrief is ready, but Vercel AI Gateway is blocked until billing verification is completed on the Vercel team. Add a valid payment method in Vercel AI Gateway, then retry this same PDF.',
          code: 'AI_GATEWAY_BILLING_REQUIRED',
        },
        { status: 503 },
      );
    }

    if (
      message.includes('AI_GATEWAY_API_KEY') ||
      message.toLowerCase().includes('unauthorized') ||
      message.includes('401')
    ) {
      return Response.json(
        {
          error:
            'The AI Gateway credentials are missing or invalid. Check AI_GATEWAY_API_KEY in the Vercel project environment variables, redeploy, and try again.',
          code: 'AI_GATEWAY_AUTH_ERROR',
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        error:
          'BidBrief could not complete this analysis. The PDF was read successfully, but the AI analysis service returned an error. Please retry in a moment.',
        code: 'ANALYSIS_SERVICE_ERROR',
      },
      { status: 500 },
    );
  }
}
