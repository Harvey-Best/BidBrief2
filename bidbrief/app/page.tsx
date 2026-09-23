'use client';

import { useRef, useState } from 'react';
import type { BidBrief, BidFinding } from '@/lib/types';

const trades = [
  'Commercial flooring',
  'Electrical',
  'Plumbing',
  'HVAC / mechanical',
  'Drywall',
  'Painting',
  'Roofing',
  'General contractor',
  'Other specialty trade',
];

type ParsedDocument = {
  name: string;
  pages: Array<{ page: number; text: string }>;
};

function confidenceLabel(value: BidFinding['confidence']) {
  if (value === 'high') return 'High confidence';
  if (value === 'medium') return 'Medium confidence';
  return 'Low confidence';
}

function statusLabel(value: BidFinding['status']) {
  if (value === 'found') return 'Found';
  if (value === 'unclear') return 'Needs review';
  return 'Not found';
}

async function extractPdf(file: File): Promise<ParsedDocument> {
  const pdfjs = await import('pdfjs-dist/webpack.mjs');

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: ParsedDocument['pages'] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pages.push({ page: pageNumber, text });
  }

  return { name: file.name, pages };
}

export default function Home() {
  const [trade, setTrade] = useState(trades[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [brief, setBrief] = useState<BidBrief | null>(null);
  const [stage, setStage] = useState<'idle' | 'reading' | 'analyzing' | 'done'>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);


  async function analyze() {
    if (!files.length || stage === 'reading' || stage === 'analyzing') return;
    setError('');
    setBrief(null);

    try {
      setStage('reading');
      const documents: ParsedDocument[] = [];
      for (const file of files) {
        documents.push(await extractPdf(file));
      }

      const totalPages = documents.reduce((total, doc) => total + doc.pages.length, 0);
      if (totalPages > 450) {
        throw new Error('This v0 is capped at 450 pages per brief. Split the package and upload the front-end documents first.');
      }

      const extractableChars = documents.reduce(
        (total, doc) => total + doc.pages.reduce((sum, page) => sum + page.text.length, 0),
        0,
      );
      if (extractableChars < 250) {
        throw new Error('I could not extract enough text. This looks like a scanned/image-only PDF; OCR is intentionally not in tonight\'s v0.');
      }

      setStage('analyzing');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade, documents }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Analysis failed.');

      setBrief(result as BidBrief);
      setStage('done');
      requestAnimationFrame(() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStage('idle');
    }
  }

  function addFiles(next: FileList | File[]) {
    const incoming = Array.from(next).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    const merged = [...files, ...incoming].filter(
      (file, index, all) => all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size) === index,
    );
    setFiles(merged.slice(0, 12));
  }

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="BidBrief home">
          <span className="brand-mark">B</span>
          BidBrief
        </a>
        <a className="nav-link" href="#analyze">Analyze a bid</a>
      </nav>

      <section className="hero shell" id="top">
        <div className="eyebrow"><span className="dot" /> Built for subcontractor estimators</div>
        <h1>Know the bid requirements<br />before you price the job.</h1>
        <p className="hero-copy">
          Drop in the front-end bid documents. Get one cited brief with the deadlines, bonds, site walks,
          addenda, forms, wage rules, and submission requirements that can make or break a bid.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="#analyze">Analyze a bid package <span>→</span></a>
          <span className="microcopy">First brief free · No account required</span>
        </div>

        <div className="trust-row" aria-label="Product promises">
          <span><b>01</b> Page-level citations</span>
          <span><b>02</b> “Not found” beats guessing</span>
          <span><b>03</b> Built for bid-day review</span>
        </div>
      </section>

      <section className="problem-band">
        <div className="shell problem-grid">
          <div>
            <p className="section-kicker">The problem</p>
            <h2>One missed line can make hours of estimating worthless.</h2>
          </div>
          <div className="problem-list">
            <div><span>01</span><p>Mandatory site walk buried in the invitation.</p></div>
            <div><span>02</span><p>Bid bond percentage hiding in supplementary instructions.</p></div>
            <div><span>03</span><p>Addendum acknowledgement or form requirement missed at submission.</p></div>
          </div>
        </div>
      </section>

      <section className="workspace shell" id="analyze">
        <div className="workspace-heading">
          <div>
            <p className="section-kicker">Create a BidBrief</p>
            <h2>Drop the package. Get the checklist.</h2>
          </div>
          <div className="privacy-note">
            <span className="lock">⌁</span>
            <div><b>Storage-light v0</b><small>PDF text is extracted in your browser. This version does not save uploaded files.</small></div>
          </div>
        </div>

        <div className="builder-card">
          <div className="builder-left">
            <label className="field-label" htmlFor="trade">Your trade</label>
            <select id="trade" value={trade} onChange={(event) => setTrade(event.target.value)}>
              {trades.map((item) => <option key={item}>{item}</option>)}
            </select>

            <label className="field-label top-gap">Bid documents</label>
            <div
              className={`dropzone ${files.length ? 'has-files' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                addFiles(event.dataTransfer.files);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                hidden
                onChange={(event) => event.target.files && addFiles(event.target.files)}
              />
              <div className="upload-icon">↑</div>
              <b>{files.length ? 'Add more bid documents' : 'Drop PDFs here or click to browse'}</b>
              <span>Invitation, Division 00/01, bid forms, addenda · up to 12 PDFs</span>
            </div>

            {files.length > 0 && (
              <div className="file-list">
                {files.map((file) => (
                  <div className="file-row" key={`${file.name}-${file.size}`}>
                    <div className="file-icon">PDF</div>
                    <div className="file-meta"><b>{file.name}</b><span>{(file.size / 1024 / 1024).toFixed(1)} MB</span></div>
                    <button onClick={() => setFiles((current) => current.filter((item) => item !== file))} aria-label={`Remove ${file.name}`}>×</button>
                  </div>
                ))}
              </div>
            )}

            <button className="button primary analyze-button" disabled={!files.length || stage === 'reading' || stage === 'analyzing'} onClick={analyze}>
              {stage === 'reading' && 'Reading PDFs…'}
              {stage === 'analyzing' && 'Building your BidBrief…'}
              {(stage === 'idle' || stage === 'done') && <>Generate BidBrief <span>→</span></>}
            </button>
            {error && <div className="error-box">{error}</div>}
          </div>

          <aside className="preview-panel">
            <div className="preview-top"><span>What we check</span><span className="preview-pill">16+ fields</span></div>
            {[
              ['Bid due', 'Date · time · timezone'],
              ['Site walk', 'Mandatory vs. optional'],
              ['Bonding', 'Bid · payment · performance'],
              ['Insurance', 'Limits and endorsements'],
              ['Labor', 'Prevailing wage · PLA'],
              ['Addenda', 'Acknowledgement required'],
              ['Forms', 'Signatures · notarization'],
              ['Submission', 'Portal · email · physical'],
            ].map(([title, desc]) => (
              <div className="preview-row" key={title}><span className="check">✓</span><div><b>{title}</b><small>{desc}</small></div></div>
            ))}
            <div className="preview-footer">Every found requirement includes its source document and page.</div>
          </aside>
        </div>
      </section>

      {brief && (
        <section className="report-wrap" id="report">
          <div className="shell">
            <div className="report-header">
              <div>
                <p className="section-kicker">BidBrief generated</p>
                <h2>{brief.projectName || 'Project bid brief'}</h2>
                <p>{brief.summary}</p>
              </div>
              <div className={`risk risk-${brief.riskLevel}`}><span />{brief.riskLevel} attention</div>
            </div>

            {brief.criticalFlags.length > 0 && (
              <div className="flags">
                <div className="flags-title">Critical flags</div>
                <div className="flags-grid">
                  {brief.criticalFlags.map((flag) => <div key={flag}><span>!</span>{flag}</div>)}
                </div>
              </div>
            )}

            <div className="findings">
              {brief.findings.map((finding, index) => (
                <article className={`finding finding-${finding.status}`} key={`${finding.label}-${index}`}>
                  <div className="finding-index">{String(index + 1).padStart(2, '0')}</div>
                  <div className="finding-main">
                    <div className="finding-heading">
                      <div><small>{finding.category}</small><h3>{finding.label}</h3></div>
                      <span className={`status status-${finding.status}`}>{statusLabel(finding.status)}</span>
                    </div>
                    <p className="finding-value">{finding.value}</p>
                    {finding.evidence && (
                      <blockquote>“{finding.evidence}”</blockquote>
                    )}
                    <div className="citation-row">
                      {finding.document && finding.page ? (
                        <span className="citation">↳ {finding.document} · p. {finding.page}</span>
                      ) : (
                        <span className="citation muted">No supporting citation found</span>
                      )}
                      <span className={`confidence confidence-${finding.confidence}`}>{confidenceLabel(finding.confidence)}</span>
                      {finding.actionRequired && <span className="action-chip">Action required</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {brief.nextActions.length > 0 && (
              <div className="next-actions">
                <p className="section-kicker">Next actions</p>
                <h2>Before this bid goes out</h2>
                <div className="action-list">
                  {brief.nextActions.map((action, index) => <div key={action}><span>{index + 1}</span><p>{action}</p></div>)}
                </div>
              </div>
            )}

            <p className="disclaimer">{brief.disclaimer}</p>
          </div>
        </section>
      )}

      <section className="bottom-cta shell">
        <p className="section-kicker">Built for the ugly part of estimating</p>
        <h2>Read the requirements once.<br />Price the job with context.</h2>
        <a href="#analyze" className="button primary">Run a bid package <span>→</span></a>
      </section>

      <footer className="footer shell"><span>© 2026 BidBrief</span><span>Bid document review aid · Always verify against the original contract documents.</span></footer>
    </main>
  );
}
