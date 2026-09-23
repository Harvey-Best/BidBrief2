'use client';

import { useEffect, useRef, useState } from 'react';
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

const requirementTicker = [
  'BID DUE',
  'SITE WALK',
  'BONDING',
  'INSURANCE',
  'ADDENDA',
  'SUBMISSION',
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

function DepthField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let raf = 0;
    let pointerX = 0;
    let pointerY = 0;

    type Particle = { x: number; y: number; z: number; size: number; speed: number };
    const particles: Particle[] = Array.from({ length: 58 }, (_, index) => ({
      x: Math.sin(index * 91.7) * 560,
      y: Math.cos(index * 43.1) * 390,
      z: 100 + ((index * 83) % 900),
      size: 0.6 + ((index * 17) % 12) / 10,
      speed: 0.45 + ((index * 13) % 10) / 18,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onPointer = (event: PointerEvent) => {
      pointerX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      pointerY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
    };

    const draw = () => {
      frame += 1;
      context.clearRect(0, 0, width, height);
      const cx = width * 0.65 + pointerX * 12;
      const cy = height * 0.48 + pointerY * 9;
      const projected: Array<{ x: number; y: number; a: number; size: number }> = [];

      for (const particle of particles) {
        particle.z -= particle.speed;
        if (particle.z < 70) particle.z = 1000;

        const perspective = 540 / particle.z;
        const orbit = frame * 0.0007;
        const cos = Math.cos(orbit);
        const sin = Math.sin(orbit);
        const rx = particle.x * cos - particle.y * sin;
        const ry = particle.x * sin + particle.y * cos;
        const x = cx + rx * perspective + pointerX * (1000 - particle.z) * 0.018;
        const y = cy + ry * perspective + pointerY * (1000 - particle.z) * 0.013;
        const alpha = Math.min(0.36, Math.max(0.03, (1000 - particle.z) / 1900));
        const size = particle.size * perspective * 1.5;

        projected.push({ x, y, a: alpha, size });
        context.beginPath();
        context.fillStyle = `rgba(154, 128, 255, ${alpha})`;
        context.arc(x, y, Math.max(0.5, size), 0, Math.PI * 2);
        context.fill();
      }

      context.lineWidth = 0.7;
      for (let i = 0; i < projected.length; i += 1) {
        for (let j = i + 1; j < Math.min(projected.length, i + 5); j += 1) {
          const a = projected[i];
          const b = projected[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 82) {
            context.beginPath();
            context.strokeStyle = `rgba(92, 192, 255, ${(1 - dist / 82) * 0.055})`;
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return <canvas ref={canvasRef} className="depth-field" aria-hidden="true" />;
}

function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="orbit orbit-one" />
      <div className="doc-stage">
        <div className="doc-shadow" />
        <div className="doc-sheet doc-sheet-back">
          <span>00 21 13</span><b>Instructions to Bidders</b>
        </div>
        <div className="doc-sheet doc-sheet-mid">
          <span>ADDENDUM 03</span><b>Revised bid requirements</b>
        </div>
        <div className="doc-sheet doc-sheet-front">
          <div className="doc-head"><span>BIDBRIEF</span><span>LIVE REVIEW</span></div>
          <div className="doc-project">Civic Center<br />Renovation</div>
          <div className="doc-rule" />
          <div className="doc-finding hot"><i>!</i><span><small>MANDATORY WALK</small><b>Sept 28 · 10:00 AM</b></span><em>p.14</em></div>
          <div className="doc-finding"><i>✓</i><span><small>BID BOND</small><b>10% required</b></span><em>p.22</em></div>
          <div className="doc-finding"><i>✓</i><span><small>ADDENDA</small><b>3 acknowledged</b></span><em>p.06</em></div>
          <div className="scan-line" />
        </div>
        <div className="float-chip chip-one"><span /> Page-level citations</div>
      </div>
    </div>
  );
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
      for (const file of files) documents.push(await extractPdf(file));

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
    <main className="site-frame">
      <section className="hero-shell" id="top">
        <DepthField />
        <div className="aurora aurora-one" />
        <div className="aurora aurora-two" />
        <div className="hero-grid-overlay" />

        <nav className="nav shell">
          <a className="brand" href="#top" aria-label="BidBrief home">
            <span className="brand-mark"><span>B</span></span>
            <span>BidBrief</span>
          </a>
          <div className="nav-center">
            <a href="#why">Why it works</a>
            <a href="#analyze">Analyzer</a>
          </div>
          <a className="nav-cta" href="#analyze">Run a brief <span>↗</span></a>
        </nav>

        <div className="hero shell">
          <div className="hero-copy-wrap">
            <div className="eyebrow"><span className="eyebrow-pulse" /> AI bid review for specialty contractors</div>
            <h1>
              <span>Find the line</span>
              <span>that <em>kills</em></span>
              <span>the bid.</span>
            </h1>
            <p className="hero-copy">
              BidBrief turns hundreds of pages of front-end documents into one cited, action-ready brief — deadlines,
              bonds, site walks, addenda, forms, wage rules and submission requirements.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#analyze"><span className="button-glow" />Analyze a bid package <b>↗</b></a>
              <span className="microcopy"><i /> First brief free · No account required</span>
            </div>
            <div className="hero-proof">
              <div><strong>01</strong><span>Source page<br />on every finding</span></div>
              <div><strong>02</strong><span>“Not found”<br />instead of guessing</span></div>
              <div><strong>03</strong><span>Built for the<br />bid-day workflow</span></div>
            </div>
          </div>
          <HeroVisual />
        </div>

        <div className="requirements-rail" aria-hidden="true">
          <div className="shell requirements-rail-inner">
            {requirementTicker.map((item) => (
              <span key={item}><i />{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="why-section shell" id="why">
        <div className="section-intro">
          <p className="section-kicker">Why BidBrief</p>
          <h2>Estimators don’t need another dashboard.<br /><span>They need fewer surprises.</span></h2>
        </div>

        <div className="bento-grid">
          <article className="bento-card bento-large">
            <div className="bento-number">01</div>
            <div className="bento-content">
              <span className="bento-tag">THE PROBLEM</span>
              <h3>One missed sentence can erase hours of pricing.</h3>
              <p>A mandatory walk, bond percentage or acknowledgement can be buried in documents nobody wants to read twice.</p>
            </div>
            <div className="deadline-widget">
              <span className="deadline-label">CRITICAL REQUIREMENT</span>
              <div className="deadline-time">10:00 <small>AM</small></div>
              <div className="deadline-date"><b>SEP 28</b><span>Mandatory pre-bid walk</span></div>
              <div className="deadline-source">Invitation to Bid · page 14</div>
            </div>
          </article>

          <article className="bento-card bento-purple">
            <div className="noise" />
            <span className="bento-tag">THE OUTPUT</span>
            <div className="big-stat">16<span>+</span></div>
            <h3>fields checked every run.</h3>
            <p>One predictable review format, even when the bid package is chaos.</p>
          </article>

          <article className="bento-card bento-dark">
            <span className="bento-tag">THE RULE</span>
            <div className="truth-stack">
              <span className="truth-good">FOUND <b>✓</b></span>
              <span className="truth-warn">UNCLEAR <b>?</b></span>
              <span className="truth-none">NOT FOUND <b>—</b></span>
            </div>
            <p>No plausible-sounding filler. Every finding needs evidence.</p>
          </article>
        </div>
      </section>

      <section className="process-band">
        <div className="shell process-shell">
          <div className="process-label">FROM PACKAGE → DECISION</div>
          <div className="process-flow">
            <div className="process-step"><span>1</span><b>Drop PDFs</b><small>Division 00/01, forms, addenda</small></div>
            <div className="process-arrow">→</div>
            <div className="process-step"><span>2</span><b>BidBrief reads</b><small>Page-by-page requirement extraction</small></div>
            <div className="process-arrow">→</div>
            <div className="process-step"><span>3</span><b>You verify</b><small>Every result points to its source</small></div>
          </div>
        </div>
      </section>

      <section className="workspace-shell" id="analyze">
        <div className="workspace shell">
          <div className="workspace-heading">
            <div>
              <p className="section-kicker">Live analyzer</p>
              <h2>Drop the package.<br /><span>Get the brief.</span></h2>
            </div>
            <div className="privacy-note">
              <span className="lock">⌁</span>
              <div><b>Storage-light v0</b><small>PDF text is extracted in your browser. This version does not save uploaded files.</small></div>
            </div>
          </div>

          <div className="builder-card">
            <div className="builder-sheen" />
            <div className="builder-left">
              <div className="builder-step"><span>01</span><b>Set your trade</b></div>
              <label className="field-label" htmlFor="trade">Trade / scope</label>
              <select id="trade" value={trade} onChange={(event) => setTrade(event.target.value)}>
                {trades.map((item) => <option key={item}>{item}</option>)}
              </select>

              <div className="builder-step top-gap"><span>02</span><b>Add bid documents</b></div>
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
                <div className="upload-orbit"><div className="upload-icon">↑</div></div>
                <b>{files.length ? 'Add more bid documents' : 'Drop your bid package here'}</b>
                <span>or click to browse · PDF · up to 12 files / 450 pages</span>
                <div className="dropzone-tags"><i>INVITATION</i><i>DIV 00/01</i><i>FORMS</i><i>ADDENDA</i></div>
              </div>

              {files.length > 0 && (
                <div className="file-list">
                  {files.map((file, index) => (
                    <div className="file-row" key={`${file.name}-${file.size}`}>
                      <div className="file-index">{String(index + 1).padStart(2, '0')}</div>
                      <div className="file-icon">PDF</div>
                      <div className="file-meta"><b>{file.name}</b><span>{(file.size / 1024 / 1024).toFixed(1)} MB · ready to read</span></div>
                      <button onClick={() => setFiles((current) => current.filter((item) => item !== file))} aria-label={`Remove ${file.name}`}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <button className="button primary analyze-button" disabled={!files.length || stage === 'reading' || stage === 'analyzing'} onClick={analyze}>
                <span className="button-glow" />
                {stage === 'reading' && 'Reading PDFs…'}
                {stage === 'analyzing' && 'Building your BidBrief…'}
                {(stage === 'idle' || stage === 'done') && <>Generate BidBrief <b>↗</b></>}
              </button>
              {error && <div className="error-box">{error}</div>}
            </div>

            <aside className="preview-panel">
              <div className="preview-orb" />
              <div className="preview-top"><span>Requirement engine</span><span className="preview-pill"><i /> LIVE</span></div>
              <div className="preview-title">What gets checked</div>
              {[
                ['Bid due', 'Date · time · timezone'],
                ['Site walk', 'Mandatory vs. optional'],
                ['Bonding', 'Bid · payment · performance'],
                ['Insurance', 'Limits and endorsements'],
                ['Labor', 'Prevailing wage · PLA'],
                ['Addenda', 'Acknowledgement required'],
                ['Forms', 'Signatures · notarization'],
                ['Submission', 'Portal · email · physical'],
              ].map(([title, desc], index) => (
                <div className="preview-row" key={title}><span className="check">{String(index + 1).padStart(2, '0')}</span><div><b>{title}</b><small>{desc}</small></div><span className="row-dot" /></div>
              ))}
              <div className="preview-footer"><span>↳</span> Every found requirement includes its source document and page.</div>
            </aside>
          </div>
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
                    {finding.evidence && <blockquote>“{finding.evidence}”</blockquote>}
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

      <section className="bottom-cta">
        <div className="cta-glow" />
        <div className="shell bottom-cta-inner">
          <p className="section-kicker">Built for the ugly part of estimating</p>
          <h2>Read the requirements once.<br /><span>Price the job with context.</span></h2>
          <a href="#analyze" className="button primary"><span className="button-glow" />Run a bid package <b>↗</b></a>
        </div>
      </section>

      <footer className="footer shell">
        <a className="brand footer-brand" href="#top"><span className="brand-mark"><span>B</span></span><span>BidBrief</span></a>
        <span>© 2026 · Bid document review aid</span>
        <span>Always verify against original contract documents.</span>
      </footer>
    </main>
  );
}
