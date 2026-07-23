"use client";

import { useState, useEffect } from "react";
import { GraphData, SimulationResult, RiskLevel, LiveScanFinding } from "@/lib/types";
import { ShieldAlert, Play, RotateCcw, Activity, Shield, Key, AlertTriangle, ChevronRight, Lightbulb, FileDown, Radar, Mail, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimulatePanelProps {
  selectedNodeId: string | null;
  onSimulationComplete: (result: SimulationResult) => void;
  onScanComplete: (result: LiveScanFinding[]) => void;
  scanResult: LiveScanFinding[] | null;
  onReset: () => void;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  Low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  High: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Critical: "text-red-400 bg-red-400/10 border-red-400/20",
};

const PHASE_COLORS: Record<string, string> = {
  'Initial Access': 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
  'Lateral Movement': 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  'Privilege Escalation': 'text-red-400 border-red-400/30 bg-red-400/5',
};

function nodeRiskLevel(riskScore: number): RiskLevel {
  if (riskScore >= 4) return 'Critical';
  if (riskScore >= 3) return 'High';
  if (riskScore >= 2) return 'Medium';
  return 'Low';
}

export default function SimulatePanel({ selectedNodeId, onSimulationComplete, onScanComplete, scanResult, onReset }: SimulatePanelProps) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "steps" | "recs" | "findings">("overview");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    fetch('/api/environment')
      .then(res => res.json())
      .then(res => setData(res.graph || res));
  }, []);

  const selectedNode = data?.nodes.find(n => n.id === selectedNodeId);

  const runSimulation = async () => {
    if (!selectedNodeId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startNodeId: selectedNodeId })
      });
      const data: SimulationResult = await res.json();
      setResult(data);
      onSimulationComplete(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setActiveTab("overview");
    onReset();
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const data = await res.json();
      onScanComplete(data.findings || []);
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  const downloadReport = () => {
    if (!result || !selectedNode) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const html = generateReport(result, selectedNode);
    w.document.write(html);
    w.document.close();
  };

  const emailReport = async () => {
    if (!result || !selectedNode) return;
    setSendingEmail(true);
    setToast(null);
    try {
      const html = generateReport(result, selectedNode);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Brief delay to ensure styles run
      await new Promise(r => setTimeout(r, 100));
      
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;
      
      const elementToPrint = tempDiv.querySelector('.report-body') || tempDiv;

      const pdfBase64 = await html2pdf().from(elementToPrint).set({
        margin: [10, 0, 10, 0],
        filename: 'report.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, backgroundColor: '#09090b' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).outputPdf('datauristring');

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/report/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pdfBase64, filename: `Azure_Security_Report_${selectedNode.label}.pdf` })
      });
      
      if (response.ok) {
        setToast({ message: "Report has been sent to your email", type: "success" });
      } else {
        setToast({ message: "Failed to send report. Try again", type: "error" });
      }
    } catch (e) {
      console.error('Email report error:', e);
      setToast({ message: "Failed to send report. Try again", type: "error" });
    } finally {
      setSendingEmail(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  return (
    <aside className="w-full h-full flex flex-col relative z-20 bg-gradient-to-b from-slate-950/95 via-card/90 to-slate-950/95 border-l border-white/[0.04] shadow-[inset_1px_0_0_rgba(34,211,238,0.06)]">
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 rounded-lg border shadow-xl backdrop-blur-md transition-all max-w-[min(100%,20rem)]",
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' : 'bg-red-500/10 border-red-500/25 text-red-300'
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          <span className="text-xs font-medium leading-snug">{toast.message}</span>
        </div>
      )}

      {/* Header — title + dedicated action rail (scales when more controls are added) */}
      <div className="shrink-0 border-b border-cyan-500/10 bg-slate-950/40 px-3 py-3 md:px-4 md:py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm md:text-[15px] font-heading font-semibold text-white flex items-center gap-2 tracking-tight">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/5 text-cyan-300">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <span className="truncate">Operations console</span>
            </h2>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-1.5 leading-relaxed pl-9 md:pl-0 md:ml-9">
              Select a node to simulate paths, or run a live environment scan.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runScan}
            disabled={scanning}
            title="Run Real-time Security Scan"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.07] px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/15 transition-colors disabled:opacity-50 relative group min-w-0"
          >
            {scanning ? (
              <div className="w-4 h-4 border-2 border-cyan-400/25 border-t-cyan-300 rounded-full animate-spin shrink-0" />
            ) : (
              <Radar className="w-4 h-4 shrink-0 text-cyan-300 group-hover:scale-105 transition-transform" />
            )}
            <span className="font-mono tracking-wide text-[11px] uppercase">{scanning ? "Scanning…" : "Live scan"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Empty state */}
        {!selectedNode && !result && !scanResult && (
          <div className="h-full min-h-[12rem] flex flex-col items-center justify-center text-center text-muted-foreground px-6 py-10">
            <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(34,211,238,0.06)]">
              <Activity className="w-7 h-7 text-cyan-400/50" />
            </div>
            <p className="text-xs md:text-sm leading-relaxed max-w-sm">
              Select a graph node to run an attack simulation, or start a <span className="text-cyan-200/90">live scan</span> from the toolbar.
            </p>
          </div>
        )}

        {/* Scan Results Base View (no node selected, just scanned) */}
        {!selectedNode && !result && scanResult && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3.5 shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <Radar className="w-4 h-4 text-cyan-400 shrink-0" />
                <h3 className="text-sm font-semibold text-white tracking-tight">Scan complete</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {scanResult.length} issues found. Open highlighted nodes on the map to investigate.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {['Critical', 'High', 'Medium', 'Low'].map(severity => {
                const count = scanResult.filter(r => r.severity === severity).length;
                if (count === 0) return null;
                return (
                  <div key={severity} className={cn("flex justify-between items-center gap-2 px-3 py-2 rounded-lg border", RISK_COLORS[severity as RiskLevel])}>
                    <span className="text-xs font-semibold">{severity}</span>
                    <span className="text-xs font-mono font-bold tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Target Selected */}
        {selectedNode && !result && (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-white/[0.07] bg-slate-950/40 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2.5 font-semibold font-mono">Selected target</h3>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg border border-cyan-500/20 bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{selectedNode.label}</div>
                  <div className="text-[11px] text-cyan-300/90 font-mono mt-0.5">{selectedNode.type}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={runSimulation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium transition-all shadow-[0_12px_40px_rgba(34,211,238,0.15)] disabled:opacity-50 disabled:shadow-none text-sm border border-white/10"
            >
              {loading
                ? <><div className="animate-spin w-5 h-5 border-2 border-white/25 border-t-white rounded-full" /> Simulating...</>
                : <><Play className="w-5 h-5 shrink-0" /> Run attack simulation</>
              }
            </button>

            {/* If there are scan findings for this node */}
            {scanResult && (() => {
              const nodeFindings = scanResult.filter(f => f.nodeId === selectedNode.id);
              if (nodeFindings.length === 0) return null;
              
              return (
                <div className="space-y-3 mt-4 border-t border-white/[0.06] pt-4">
                  <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold flex items-center gap-1.5 font-mono">
                    <Radar className="w-3.5 h-3.5 text-cyan-400" /> Findings ({nodeFindings.length})
                  </h3>
                  {nodeFindings.map(finding => (
                    <div key={finding.id} className={cn("p-3 rounded-xl border space-y-2", RISK_COLORS[finding.severity])}>
                       <div className="flex justify-between items-start gap-2">
                         <span className="text-xs font-bold leading-snug">{finding.issue}</span>
                         <span className="text-[10px] px-1.5 rounded-sm border bg-black/25 uppercase font-mono shrink-0">{finding.severity}</span>
                       </div>
                       <p className="text-[11px] opacity-90 leading-relaxed">{finding.description}</p>
                       <div className="text-[10px] bg-black/15 p-2 rounded-lg border border-white/[0.06] mt-1">
                         <strong>Fix:</strong> {finding.recommendation}
                       </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="flex flex-col min-h-0">
            {/* Score Banner */}
            <div className="relative overflow-hidden border-b border-red-500/20 bg-gradient-to-br from-red-950/50 via-slate-950/80 to-slate-950 p-4 text-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(248,113,113,0.12),transparent_55%)]" />
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 via-amber-400 to-cyan-400 opacity-90" />
              <h3 className="relative text-[10px] font-semibold text-red-300/95 uppercase tracking-[0.2em] mb-1 flex items-center justify-center gap-1.5 font-mono">
                <AlertTriangle className="w-3.5 h-3.5" /> Blast radius
              </h3>
              <div className="relative flex items-end justify-center gap-1 mt-0.5">
                <span className="text-4xl font-heading font-bold text-white tabular-nums">{result.totalRiskScore}</span>
                <span className="text-lg text-muted-foreground mb-1 font-mono">/ {result.maxScore}</span>
              </div>
              <div className="relative mt-2 text-[11px] text-muted-foreground font-mono">
                {result.blastRadius?.length ?? 0} nodes reachable
              </div>
            </div>

            {/* Tabs — segmented control for clearer hierarchy */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex rounded-lg border border-white/[0.06] bg-slate-950/60 p-0.5 gap-0.5">
              {([["overview", "Overview"], ["steps", "Attack steps"], ["recs", `Recs (${result.recommendations?.length ?? 0})`]] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 min-w-0 py-2 px-1.5 rounded-md text-[10px] sm:text-[11px] font-medium transition-colors text-center",
                    activeTab === tab
                      ? "bg-white/[0.08] text-cyan-50 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)]"
                      : "text-muted-foreground hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  <span className="block truncate">{label}</span>
                </button>
              ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="p-4 pt-2 space-y-4">
              {activeTab === "overview" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(result.summary).filter(([, count]) => count > 0).map(([type, count]) => (
                      <div key={type} className="rounded-lg border border-white/[0.06] bg-slate-950/50 p-2.5 shadow-inner">
                        <span className="text-lg font-semibold text-white tabular-nums">{count}</span>
                        <span className="text-[10px] text-muted-foreground block truncate mt-0.5">{type}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-mono">Top risk nodes</h3>
                    {(result.blastRadius ?? [])
                      .filter(n => n.riskScore > 0)
                      .sort((a, b) => b.riskScore - a.riskScore)
                      .slice(0, 4)
                      .map(node => (
                        <div key={node.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.03]">
                          <span className="text-sm text-white truncate min-w-0">{node.label}</span>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0", RISK_COLORS[nodeRiskLevel(node.riskScore)])}>
                            {nodeRiskLevel(node.riskScore)}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {activeTab === "steps" && (
                <div className="space-y-4">
                  {(result.attackSteps?.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No multi-step paths found.</p>
                  )}
                  {(result.attackSteps ?? []).map((step, i) => (
                    <div key={i} className={cn("rounded-xl border p-4 space-y-3", PHASE_COLORS[step.phase])}>
                      <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-current opacity-20 flex items-center justify-center text-xs">{i + 1}</span>
                        {step.phase}
                      </h3>
                      <div className="space-y-1.5">
                        {step.nodes.slice(0, 5).map(n => (
                          <div key={n.id} className="flex items-center gap-2 text-xs">
                            <ChevronRight className="w-3 h-3 shrink-0" />
                            <span className="font-medium text-white truncate">{n.label}</span>
                            <span className="text-muted-foreground shrink-0">{n.type}</span>
                          </div>
                        ))}
                        {(step.nodes?.length ?? 0) > 5 && (
                          <p className="text-xs text-muted-foreground ml-5">+{step.nodes.length - 5} more...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "recs" && (
                <div className="space-y-3">
                  {(result.recommendations?.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recommendations generated.</p>
                  )}
                  {(result.recommendations ?? []).map((rec, i) => (
                    <div key={i} className={cn("rounded-xl border p-4 space-y-2", RISK_COLORS[rec.severity])}>
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider">{rec.severity}</span>
                      </div>
                      <p className="text-xs text-white font-medium">{rec.problem}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.fix}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions — grid keeps layout stable as more actions are added */}
            <div className="mt-auto p-3 md:p-4 border-t border-white/[0.06] bg-slate-950/40">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <button
                  type="button"
                  onClick={downloadReport}
                  title="Download Report locally"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all border border-cyan-500/25 bg-cyan-500/[0.06] text-cyan-50 hover:bg-cyan-500/12 min-w-0"
                >
                  <FileDown className="w-4 h-4 shrink-0" />
                  <span className="truncate">Download</span>
                </button>
                <button
                  type="button"
                  onClick={emailReport}
                  disabled={sendingEmail}
                  title="Email PDF Report"
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all border border-blue-500/25 bg-blue-500/[0.06] text-blue-100 hover:bg-blue-500/12 disabled:opacity-50 min-w-0"
                >
                  {sendingEmail ? <div className="animate-spin w-4 h-4 border-2 border-blue-400/25 border-t-blue-300 rounded-full shrink-0" /> : <Mail className="w-4 h-4 shrink-0" />}
                  <span className="truncate">{sendingEmail ? "Sending…" : "Email"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset View"
                  className="flex items-center justify-center py-2.5 px-3.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white transition-all shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function generateReport(result: SimulationResult, startNode: { label: string; type: string }): string {
  const date = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
  const { totalRiskScore, maxScore, blastRadius, attackSteps, recommendations, summary } = result;

  const summaryRows = Object.entries(summary)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `<tr><td>${type}</td><td><strong>${count}</strong></td></tr>`)
    .join('');

  const stepsHtml = attackSteps.map((step, i) => `
    <div class="step">
      <h3>Step ${i + 1}: ${step.phase}</h3>
      <ul>${step.nodes.slice(0, 10).map(n => `<li><strong>${n.label}</strong> <span class="badge">${n.type}</span></li>`).join('')}</ul>
    </div>
  `).join('');

  const recsHtml = recommendations.map(rec => `
    <div class="rec ${rec.severity.toLowerCase()}">
      <div class="rec-severity">${rec.severity}</div>
      <p><strong>Problem:</strong> ${rec.problem}</p>
      <p><strong>Fix:</strong> ${rec.fix}</p>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>AzureThreatMap Report</title>
<style>
  .report-body{font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;padding:40px;max-width:900px;margin:0 auto;box-sizing:border-box;}
  .report-body h1{color:#3b82f6;font-size:1.8rem;margin-top:0;}
  .report-body h2{color:#a1a1aa;font-size:1rem;text-transform:uppercase;letter-spacing:0.1em;margin-top:2rem}
  .report-body h3{color:#fafafa;font-size:1.1rem;margin-top:0;}
  .report-body table{width:100%;border-collapse:collapse;margin-bottom:1rem;page-break-inside:avoid;}
  .report-body td, .report-body th{padding:8px 12px;border:1px solid #27272a;text-align:left}
  .report-body th{background:#18181b}
  .report-body .score{font-size:3rem;font-weight:bold;color:#ef4444}
  .report-body .step, .report-body .rec{background:#18181b;border-radius:8px;padding:16px;margin-bottom:12px;border:1px solid #27272a;page-break-inside:avoid;}
  .report-body .badge{background:#27272a;padding:2px 8px;border-radius:99px;font-size:0.75rem;margin-left:6px;display:inline-block;}
  .report-body .rec.critical{border-color:#ef4444}
  .report-body .rec.high{border-color:#f97316}
  .report-body .rec.medium{border-color:#eab308}
  .report-body .rec-severity{font-weight:bold;text-transform:uppercase;font-size:0.75rem;margin-bottom:6px}
  .report-body .rec.critical .rec-severity{color:#ef4444}
  .report-body .rec.high .rec-severity{color:#f97316}
  .report-body .rec.medium .rec-severity{color:#eab308}
  .report-body ul{padding-left:1.5rem;margin-top:8px;}
  .report-body li{margin-bottom:6px}
</style>
</head>
<body style="background-color:#09090b;margin:0;padding:0;">
<div class="report-body">
<h1>⚡ AzureThreatMap Report</h1>
<p style="color:#a1a1aa">Generated: ${date}</p>
<p>Compromised Entity: <strong>${startNode.label}</strong> <span class="badge">${startNode.type}</span></p>

<h2>Blast Radius Score</h2>
<div class="score">${totalRiskScore} / ${maxScore}</div>
<p>${blastRadius.length} nodes reachable from compromised identity.</p>

<h2>Affected Resource Summary</h2>
<table><tr><th>Type</th><th>Count</th></tr>${summaryRows}</table>

<h2>Attack Path (${attackSteps.length} Phases)</h2>
${stepsHtml}

<h2>Security Recommendations (${recommendations.length})</h2>
${recsHtml}

<hr style="border-color:#27272a;margin-top:2rem"/>
<p style="color:#a1a1aa;font-size:0.75rem">This report was generated by AzureThreatMap — for internal security use only.</p>
</div>
</body>
</html>`;
}
