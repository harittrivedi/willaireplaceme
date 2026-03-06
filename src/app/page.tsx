'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

type DiagnosticStep = 'INPUT' | 'PARSING' | 'ANALYZING' | 'RESULT';

const ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Data Scientist',
  'Data Analyst',
  'DevOps / SRE',
  'Product Manager',
  'UX Designer',
  'QA / Test Engineer',
  'Systems Architect',
  'Cybersecurity Analyst',
  'Other',
];

export default function Home() {
  const [step, setStep] = useState<DiagnosticStep>('INPUT');
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [customRole, setCustomRole] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const addLog = (msg: string) => setTerminalLogs((prev) => [...prev, msg]);

  const resolvedRole = selectedRole === 'Other' ? customRole : selectedRole;

  // Frontend SHA-256 Hashing for Deterministic Caching
  const hashText = async (message: string) => {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  // ─── Score Card Canvas Generator ─────────────────────────────
  const generateScoreCard = useCallback(() => {
    if (!finalReport || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const W = 1200;
    const H = 630;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = 'rgba(32, 255, 238, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Top accent line
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, '#20ffee');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 3);

    // Title
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#20ffee';
    ctx.shadowColor = '#20ffee';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.fillText('WILL AI REPLACE ME?', W / 2, 60);
    ctx.shadowBlur = 0;

    // Subtitle / Role
    const roleLabel = finalReport.role || resolvedRole;
    if (roleLabel) {
      ctx.font = '18px monospace';
      ctx.fillStyle = '#ff00ff';
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 8;
      ctx.fillText(`ROLE: ${roleLabel.toUpperCase()}`, W / 2, 95);
      ctx.shadowBlur = 0;
    }

    // Score
    const scoreY = 240;
    ctx.font = 'bold 140px monospace';
    ctx.fillStyle = '#20ffee';
    ctx.shadowColor = '#20ffee';
    ctx.shadowBlur = 30;
    ctx.textAlign = 'center';
    ctx.fillText(`${finalReport.finalScore}`, W / 2 - 30, scoreY);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText('/10', W / 2 + 80, scoreY);

    // Score label
    ctx.font = '16px monospace';
    ctx.fillStyle = '#ff00ff';
    ctx.fillText('AI REPLACEMENT PROBABILITY', W / 2, scoreY + 40);

    // Stats bars
    const stats = [
      { label: 'AI IMMUNITY', value: finalReport.baseScores.immunity, color: '#fcee0a' },
      { label: 'PROFILE VIGOR', value: finalReport.baseScores.vigor, color: '#20ffee' },
      { label: 'DOMAIN DEPTH', value: finalReport.baseScores.depth, color: '#ffffff' },
      { label: 'KNOWLEDGE WIDTH', value: finalReport.baseScores.width, color: '#ffffff' },
    ];

    const barStartX = 160;
    const barWidth = 400;
    const barHeight = 20;
    let barY = 340;

    stats.forEach((stat) => {
      // Label
      ctx.font = '14px monospace';
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'right';
      ctx.fillText(stat.label, barStartX - 15, barY + 15);

      // Background bar
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(barStartX, barY, barWidth, barHeight);

      // Fill bar
      const fillW = (stat.value / 100) * barWidth;
      ctx.fillStyle = stat.color;
      ctx.shadowColor = stat.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(barStartX, barY, fillW, barHeight);
      ctx.shadowBlur = 0;

      // Value
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = stat.color;
      ctx.textAlign = 'left';
      ctx.fillText(`${stat.value}%`, barStartX + barWidth + 15, barY + 16);

      barY += 50;
    });

    // Verdict box (right side)
    const verdictX = 700;
    const verdictY = 340;
    ctx.strokeStyle = 'rgba(32, 255, 238, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(verdictX, verdictY, 380, 180);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#20ffee';
    ctx.textAlign = 'left';
    ctx.fillText('VERDICT', verdictX + 15, verdictY + 30);

    const score = finalReport.finalScore;
    let verdict = '';
    let verdictColor = '';
    if (score <= 2) { verdict = 'INDISPENSABLE'; verdictColor = '#20ffee'; }
    else if (score <= 4) { verdict = 'LOW RISK'; verdictColor = '#20ffee'; }
    else if (score <= 6) { verdict = 'MODERATE RISK'; verdictColor = '#fcee0a'; }
    else if (score <= 8) { verdict = 'HIGH RISK'; verdictColor = '#ff6600'; }
    else { verdict = 'CRITICALLY VULNERABLE'; verdictColor = '#ff0040'; }

    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = verdictColor;
    ctx.shadowColor = verdictColor;
    ctx.shadowBlur = 10;
    ctx.fillText(verdict, verdictX + 15, verdictY + 75);
    ctx.shadowBlur = 0;

    // Variance + Experience in verdict box
    ctx.font = '13px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText(`VARIANCE: ${finalReport.baseScores.variance}%`, verdictX + 15, verdictY + 120);
    ctx.fillText(`EXPERIENCE: ${finalReport.baseScores.experience}%`, verdictX + 15, verdictY + 145);

    // Bottom accent
    const gradBot = ctx.createLinearGradient(0, 0, W, 0);
    gradBot.addColorStop(0, 'transparent');
    gradBot.addColorStop(0.5, '#ff00ff');
    gradBot.addColorStop(1, 'transparent');
    ctx.fillStyle = gradBot;
    ctx.fillRect(0, H - 50, W, 2);

    // Footer
    ctx.font = '14px monospace';
    ctx.fillStyle = '#555555';
    ctx.textAlign = 'center';
    ctx.fillText('willaireplaceme-wine.vercel.app  •  Multi-Agent AI Career Diagnostic', W / 2, H - 20);
  }, [finalReport, resolvedRole]);

  useEffect(() => {
    if (showShareModal && finalReport) {
      // Small delay to ensure canvas is mounted
      setTimeout(() => generateScoreCard(), 50);
    }
  }, [showShareModal, finalReport, generateScoreCard]);

  const downloadScoreCard = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'ai-replacement-scorecard.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const copyScoreCard = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob>((resolve) =>
        canvasRef.current!.toBlob((b) => resolve(b!), 'image/png')
      );
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    } catch {
      alert('Copy failed. Try downloading instead.');
    }
  };

  const handleInitiate = async () => {
    const isLinkedIn = linkUrl.trim().length > 0 && linkUrl.includes('linkedin.com/in/');

    if (!file && !isLinkedIn && linkUrl.trim().length > 0) {
      alert('INVALID INPUT: Please ensure the link is a valid "linkedin.com/in/" profile URL.');
      return;
    }

    if (!file && !isLinkedIn) return;

    setStep('PARSING');
    addLog('> INITIATING DATA EXTRACTION...');
    if (resolvedRole) {
      addLog(`> ROLE LOCK: ${resolvedRole.toUpperCase()}`);
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      let rawText = '';

      if (file) {
        // 1. Parsing the PDF
        const formData = new FormData();
        formData.append('file', file);

        addLog('> SENDING PDF FRAGMENTS TO EXTRACTOR...');
        const parseRes = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
          signal
        });
        const parseData = await parseRes.json();

        if (!parseRes.ok) throw new Error(parseData.error || 'Failed to parse PDF.');
        rawText = parseData.text;
        addLog(`[OK] EXTRACTED ${rawText.length} BYTES OF RAW PDF DATA.`);
      } else if (isLinkedIn) {
        addLog('> LINKEDIN URL DETECTED. FORWARDING DIRECTLY TO NEURAL CORTEX...');
        rawText = `LinkedIn Profile Link: ${linkUrl}\n(System note: Treat this as the primary profile to scrape and examine.)`;
        addLog(`[OK] URL REGISTERED.`);
      }

      // 2. Check Cache (role is factored into the hash)
      addLog('> GENERATING DETERMINISTIC HASH...');
      const cacheHash = await hashText(rawText + "gemini-2.5-flash" + (resolvedRole || ''));
      const cached = localStorage.getItem(`diagnosis_${cacheHash}`);

      setStep('ANALYZING');

      if (cached) {
        addLog(`[WARN] EXACT MATCH DETECTED IN LOCAL CHRONICLES (HASH: ${cacheHash.substring(0, 8)}).`);
        addLog('> BYPASSING LLM MATRIX... RESTORING PREVIOUS STATE.');

        setTimeout(() => {
          setFinalReport(JSON.parse(cached));
          setStep('RESULT');
        }, 1500);
        return;
      }

      // 3. Fake Terminal Streaming Logic (UX)
      const mockLogs = [
        "AGENT_1 [EXTRACTOR]: Parsing semantic career milestones...",
        "AGENT_1 [EXTRACTOR]: Correlating domain keywords. Calculating Vigor...",
        "AGENT_2 [ORACLE]: Accessing neural-state-of-the-art database (2025)...",
        "AGENT_2 [ORACLE]: Determining automation vulnerability in user sub-niche...",
        "AGENT_3 [JUDGE]: Weighing Domain Depth against Knowledge Width...",
        "AGENT_3 [JUDGE]: Analyzing contextual variance and experience curve...",
        "AGENT_3 [JUDGE]: Formulating Architect Convergence Score...",
        "AGENT_4 [MENTOR]: Assembling Cyber-Roadmap payload...",
        "AGENT_4 [MENTOR]: Computing Level-up Quests..."
      ];

      let logIdx = 0;
      const interval = setInterval(() => {
        if (logIdx < mockLogs.length) {
          addLog(`> ${mockLogs[logIdx]}`);
          logIdx++;
        }
      }, 3500);

      // 4. API Call (now includes role)
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileText: rawText, model: 'gemini-2.5-flash', role: resolvedRole || undefined }),
        signal
      });
      const analyzeData = await analyzeRes.json();

      clearInterval(interval);

      if (!analyzeRes.ok) throw new Error(`${analyzeData.error} | ${analyzeData.details || ''}`);

      addLog('[SUCCESS] ANALYSIS COMPLETE. SCALING SCORES...');

      localStorage.setItem(`diagnosis_${cacheHash}`, JSON.stringify(analyzeData));

      setFinalReport(analyzeData);
      setStep('RESULT');

    } catch (e: any) {
      if (e.name === 'AbortError') {
        addLog('[SYSTEM] DIAGNOSTIC ABORTED BY USER.');
      } else {
        addLog(`[ERROR] FATAL EXCEPTION: ${e.message}`);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStep('INPUT');
    setFile(null);
    setLinkUrl('');
    setTerminalLogs([]);
  };

  const downloadPDF = () => {
    window.print();
  };

  return (
    <main className="container crt">
      {step !== 'RESULT' && <div className="scanner"></div>}

      {step !== 'RESULT' && (
        <header style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
          <h1 className="glow-cyan main-title">
            WILL <span className="glow-magenta" style={{ color: 'var(--neon-magenta)' }}>AI</span> REPLACE ME?
          </h1>
          <p className="intro-text" style={{ color: 'var(--text-muted)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
            <strong>Our Goal:</strong> To execute a rigorous, multi-agent AI vulnerability diagnostic on your career trajectory.
            Upload your Resume or LinkedIn Profile to identify exactly which areas of your skill tree must be targeted to achieve indispensable <em>architectural depth</em> in your domain.
            <br /><br />
            <span style={{ color: 'var(--neon-yellow)' }}>[NOTE]:</span> The resulting <strong>AI Replacement Probability Score</strong> runs from <strong>0 to 10</strong>. A 10 means your roles are highly susceptible to automation.
            <span className="tooltip-container">
              <span className="info-bubble">i</span>
              <span className="tooltip-text cyber-font" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                <strong>Scoring Breakdown:</strong> The 0-10 vulnerability score analyzes 6 factors: AI Immunity (LLM capabilities vs your niche), Profile Vigor, Domain Depth, Knowledge Width, Variance, and Context. Higher attributes yield a lower risk score. 0 = Indispensable. 10 = Highly Vulnerable.
              </span>
            </span>
          </p>
        </header>
      )}

      {step === 'INPUT' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>

          {/* Role Selector */}
          <section className="panel role-selector-section" style={{ textAlign: 'center' }}>
            <h2 className="cyber-font glow-magenta" style={{ marginBottom: '1.5rem', fontSize: '1.3rem', color: 'var(--neon-magenta)' }}>
              &gt;_ SELECT_YOUR_ROLE
            </h2>
            <div className="role-selector-grid">
              {ROLES.map((role) => (
                <button
                  key={role}
                  className={`role-chip ${selectedRole === role ? 'active' : ''}`}
                  onClick={() => setSelectedRole(selectedRole === role ? '' : role)}
                >
                  {role}
                </button>
              ))}
            </div>
            {selectedRole === 'Other' && (
              <input
                type="text"
                className="role-other-input"
                placeholder="Type your role..."
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
              />
            )}
          </section>

          {/* Data Source Input */}
          <section className="panel" style={{ textAlign: 'center' }}>
            <h2 className="cyber-font glow-cyan" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
              &gt;_ INPUT_DATA_SOURCE
            </h2>

            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ color: 'var(--neon-magenta)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }} className="cyber-font">
                LINKEDIN_PROFILE_URL
              </label>
              <input
                type="text"
                placeholder="https://linkedin.com/in/your-profile"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'rgba(0,0,0,0.8)',
                  color: 'var(--neon-cyan)',
                  border: '1px solid var(--neon-magenta)',
                  fontFamily: 'var(--font-tech), monospace',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ margin: '1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>-- OR --</div>

            <div style={{
              border: '2px dashed var(--panel-border)',
              padding: '3rem 2rem',
              borderRadius: '4px',
              background: 'rgba(0,0,0,0.5)',
              marginBottom: '2rem',
              cursor: 'pointer'
            }}>
              <input
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                id="file-upload"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                <h3 className="cyber-font glow-cyan" style={{ marginBottom: '0.5rem' }}>UPLOAD PROFILE PDF</h3>
                <p style={{ color: 'var(--text-muted)' }}>Resume or LinkedIn Export.</p>
                {file && (
                  <div style={{ marginTop: '1rem', color: 'var(--neon-yellow)', wordBreak: 'break-all' }}>
                    [SELECTED]: {file.name}
                  </div>
                )}
              </label>
            </div>

            <button className="btn-cyber" style={{ width: '100%', maxWidth: '300px' }} disabled={!file && !linkUrl} onClick={handleInitiate}>
              INITIATE_DIAGNOSTIC()
            </button>
          </section>
        </div>
      )}

      {(step === 'PARSING' || step === 'ANALYZING') && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <section className="panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <h2 className="cyber-font glow-magenta" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
              &gt;_ SYSTEM_DIAGNOSTIC_RUNNING
            </h2>

            <div
              ref={terminalRef}
              style={{
                flex: 1,
                background: '#020202',
                border: '1px solid var(--neon-cyan)',
                borderRadius: '4px',
                padding: '1rem',
                fontFamily: 'monospace',
                color: '#0f0',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ color: 'var(--neon-cyan)', marginBottom: '1rem' }}>
                [auth]: Bypassing external keys... [OK]<br />
                [init]: Neural multi-agent protocol engaged.
              </div>
              {terminalLogs.map((log, i) => (
                <div key={i} style={{
                  color: log.includes('ERROR') ? 'red' : log.includes('WARN') ? 'var(--neon-yellow)' : '#0f0'
                }}>
                  {log}
                </div>
              ))}
              <div className="cr-cursor" style={{ visibility: 'hidden' }}>_</div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button
                className="btn-cyber"
                onClick={handleCancel}
                style={{
                  color: 'red',
                  borderColor: 'red',
                  padding: '0.5rem 1.5rem',
                  fontSize: '0.9rem'
                }}
              >
                CANCEL_DIAGNOSTIC()
              </button>
            </div>
          </section>
        </div>
      )}

      {step === 'RESULT' && finalReport && (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="glow-cyan section-title">
                ANALYSIS_COMPLETE
              </h1>
              {(finalReport.role || resolvedRole) && (
                <div className="cyber-font" style={{ color: 'var(--neon-magenta)', fontSize: '0.9rem', marginTop: '0.5rem', letterSpacing: '2px' }}>
                  // {(finalReport.role || resolvedRole).toUpperCase()}
                </div>
              )}
            </div>
            <div className="hide-on-print" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button className="btn-cyber" onClick={() => setShowShareModal(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderColor: 'var(--neon-magenta)', color: 'var(--neon-magenta)' }}>
                SHARE_SCORECARD()
              </button>
              <button className="btn-cyber" onClick={downloadPDF} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                EXPORT_PDF()
              </button>
            </div>
          </div>

          <div className="mobile-gap">

            {/* Score Card */}
            <section className="panel" style={{ textAlign: 'center', borderColor: 'var(--neon-magenta)' }}>
              <h3 className="cyber-font" style={{ color: 'var(--neon-magenta)', fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                AI_REPLACEMENT_PROBABILITY
                <span className="tooltip-container" style={{ marginLeft: '1rem' }}>
                  <span className="info-bubble" style={{ background: 'var(--neon-magenta)', boxShadow: '0 0 5px var(--neon-magenta)', color: '#fff' }}>i</span>
                  <span className="tooltip-text cyber-font" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-muted)', fontSize: '0.8rem', width: '250px' }}>
                    <strong>Scoring Breakdown:</strong> Analyzes 6 attributes (Vigor, Immunity, Depth, Width, Variance, Context). Strong attributes = lower risk. 0 = Indispensable. 10 = High Risk.
                  </span>
                </span>
              </h3>
              <div className="glow-cyan score-display">
                {finalReport.finalScore}
                <span>/10</span>
              </div>

              <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>AI IMMUNITY</div>
                  <div style={{ color: 'var(--neon-yellow)', fontSize: '1.6rem' }}>{finalReport.baseScores.immunity}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>PROFILE VIGOR</div>
                  <div style={{ color: 'var(--neon-cyan)', fontSize: '1.6rem' }}>{finalReport.baseScores.vigor}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>DOMAIN DEPTH</div>
                  <div style={{ color: '#fff', fontSize: '1.6rem' }}>{finalReport.baseScores.depth}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>KNOWLEDGE WIDTH</div>
                  <div style={{ color: '#fff', fontSize: '1.6rem' }}>{finalReport.baseScores.width}%</div>
                </div>
              </div>
            </section>

            {/* Oracle Insights */}
            <section className="panel padded-panel">
              <h3 className="cyber-font glow-yellow panel-title" style={{ color: 'var(--neon-yellow)' }}>
                ORACLE_INSIGHTS (AI_VULNERABILITY)
              </h3>
              <div className="markdown-body">
                <ReactMarkdown>
                  {typeof finalReport.insights === 'string' ? finalReport.insights : JSON.stringify(finalReport.insights, null, 2)}
                </ReactMarkdown>
              </div>
            </section>
          </div>

          <div className="mobile-margin">
            {/* Mentor Roadmap */}
            <section className="panel padded-panel" style={{ marginBottom: '3rem' }}>
              <h3 className="cyber-font glow-cyan panel-title" style={{ color: 'var(--neon-cyan)' }}>
                &gt;_ THE_CYBER_ROADMAP
              </h3>
              <div className="markdown-body">
                <ReactMarkdown>
                  {Array.isArray(finalReport.roadmap)
                    ? finalReport.roadmap.map((r: any) => typeof r === 'string' ? r : JSON.stringify(r)).join('\n\n')
                    : (typeof finalReport.roadmap === 'string' ? finalReport.roadmap : JSON.stringify(finalReport.roadmap, null, 2))}
                </ReactMarkdown>
              </div>
            </section>

            {/* Level Up Quests */}
            <section className="panel padded-panel" style={{ borderColor: 'var(--neon-yellow)' }}>
              <h3 className="cyber-font panel-title" style={{ color: 'var(--neon-yellow)' }}>
                &gt;_ LEVEL_UP_QUESTS
              </h3>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {Array.isArray(finalReport.quests) && finalReport.quests.map((quest: any, idx: number) => {
                  const questText = typeof quest === 'string' ? quest : JSON.stringify(quest, null, 2);
                  return (
                    <li key={idx} className="quest-item" style={{
                      background: 'rgba(252, 238, 10, 0.05)',
                      marginBottom: '1.5rem',
                      borderLeft: '4px solid var(--neon-yellow)',
                      borderRadius: '4px'
                    }}>
                      <div style={{ color: 'var(--neon-yellow)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="cyber-font">[QUEST_{idx + 1}]</span>
                      </div>
                      <div className="markdown-body quest-text">
                        <ReactMarkdown>
                          {questText}
                        </ReactMarkdown>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          <div className="hide-on-print" style={{ textAlign: 'center', marginTop: '3rem', marginBottom: '2rem' }}>
            <button className="btn-cyber" onClick={() => { setStep('INPUT'); setFile(null); setLinkUrl(''); setTerminalLogs([]); setSelectedRole(''); setCustomRole(''); }}>
              REBOOT_SYSTEM()
            </button>
          </div>

        </div>
      )}

      {/* Share Score Card Modal */}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <button className="share-modal-close" onClick={() => setShowShareModal(false)}>✕</button>
            <h3 className="cyber-font glow-cyan" style={{ fontSize: '1.1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              SHARE_SCORECARD
            </h3>
            <div className="share-preview">
              <canvas ref={canvasRef} style={{ width: '100%' }} />
            </div>
            <div className="share-actions">
              <button className="btn-cyber" onClick={downloadScoreCard}>
                📥 DOWNLOAD_PNG
              </button>
              <button className="btn-cyber" onClick={copyScoreCard} style={{ borderColor: 'var(--neon-magenta)', color: 'var(--neon-magenta)' }}>
                📋 COPY_TO_CLIPBOARD
              </button>
            </div>
            {copiedToast && (
              <div className="share-copied-toast">[OK] IMAGE COPIED TO CLIPBOARD</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
