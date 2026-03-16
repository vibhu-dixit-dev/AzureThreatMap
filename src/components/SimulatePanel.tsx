"use client";

import { useState, useEffect } from "react";
import { GraphData, SimulationResult, RiskLevel, LiveScanFinding } from "@/lib/types";
import { ShieldAlert, Play, RotateCcw, Activity, Shield, Key, AlertTriangle, ChevronRight, Lightbulb, FileDown, Radar } from "lucide-react";
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

  return (
    <aside className="w-full h-full glass bg-card/80 flex flex-col shadow-2xl relative z-20">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-base font-heading font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Security Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Simulate attack paths or scan environment.</p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          title="Run Real-time Security Scan"
          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors disabled:opacity-50 relative group"
        >
          {scanning ? (
            <div className="w-5 h-5 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin" />
          ) : (
            <>
              <Radar className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-indigo-400/20 rounded-lg rounded-full animate-ping opacity-0 group-hover:opacity-100" style={{ animationDuration: '3s' }} />
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Empty state */}
        {!selectedNode && !result && !scanResult && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm">Click on any node in the graph to begin simulation, or click the radar icon to run a security scan.</p>
          </div>
        )}

        {/* Scan Results Base View (no node selected, just scanned) */}
        {!selectedNode && !result && scanResult && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Radar className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Scan Complete</h3>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              {scanResult.length} issues found. Click highlighted nodes on the map to investigate.
            </div>
            <div className="space-y-2">
              {['Critical', 'High', 'Medium', 'Low'].map(severity => {
                const count = scanResult.filter(r => r.severity === severity).length;
                if (count === 0) return null;
                return (
                  <div key={severity} className={cn("flex justify-between p-2 rounded-lg border", RISK_COLORS[severity as RiskLevel])}>
                    <span className="text-xs font-semibold">{severity}</span>
                    <span className="text-xs font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Target Selected */}
        {selectedNode && !result && (
          <div className="p-4 space-y-4">
            <div className="glass-card p-3 rounded-lg border border-white/10 bg-white/5">
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Selected Target</h3>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-base font-medium text-white truncate max-w-[200px]">{selectedNode.label}</div>
                  <div className="text-xs text-primary font-medium">{selectedNode.type}</div>
                </div>
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-primary/25 disabled:opacity-50 text-sm mb-4"
            >
              {loading
                ? <><div className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" /> Simulating...</>
                : <><Play className="w-5 h-5" /> Run Attack Simulation</>
              }
            </button>

            {/* If there are scan findings for this node */}
            {scanResult && (() => {
              const nodeFindings = scanResult.filter(f => f.nodeId === selectedNode.id);
              if (nodeFindings.length === 0) return null;
              
              return (
                <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
                  <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Radar className="w-3.5 h-3.5" /> Security Findings ({nodeFindings.length})
                  </h3>
                  {nodeFindings.map(finding => (
                    <div key={finding.id} className={cn("p-3 rounded-lg border space-y-2", RISK_COLORS[finding.severity])}>
                       <div className="flex justify-between items-start">
                         <span className="text-xs font-bold">{finding.issue}</span>
                         <span className="text-[10px] px-1.5 rounded-sm border bg-black/20 uppercase font-mono">{finding.severity}</span>
                       </div>
                       <p className="text-[11px] opacity-90">{finding.description}</p>
                       <div className="text-[10px] bg-black/10 p-1.5 rounded border border-white/5 mt-2">
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
          <div className="flex flex-col">
            {/* Score Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-red-900/30 to-red-800/10 border-b border-red-500/20 p-4 text-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400" />
              <h3 className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Blast Radius Score
              </h3>
              <div className="flex items-end justify-center gap-1 mt-1">
                <span className="text-4xl font-heading font-bold text-white">{result.totalRiskScore}</span>
                <span className="text-xl text-muted-foreground mb-0.5">/ {result.maxScore}</span>
              </div>
              <div className="mt-2 text-xs flex justify-center gap-2">
                {result.blastRadius.length} nodes reachable
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 px-4 gap-4">
              {([["overview", "Overview"], ["steps", "Attack Steps"], ["recs", `Recs (${result.recommendations.length})`]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn("py-2.5 text-[11px] font-medium border-b-2 transition-colors",
                    activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white"
                  )}>
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4 space-y-4">
              {activeTab === "overview" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(result.summary).filter(([, count]) => count > 0).map(([type, count]) => (
                      <div key={type} className="glass-card bg-white/5 p-2 rounded-lg border border-white/5">
                        <span className="text-xl font-semibold text-white">{count}</span>
                        <span className="text-[10px] text-muted-foreground block truncate">{type}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Risk Nodes</h3>
                    {result.blastRadius
                      .filter(n => n.riskScore > 0)
                      .sort((a, b) => b.riskScore - a.riskScore)
                      .slice(0, 4)
                      .map(node => (
                        <div key={node.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                          <span className="text-sm text-white truncate max-w-[180px]">{node.label}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", RISK_COLORS[nodeRiskLevel(node.riskScore)])}>
                            {nodeRiskLevel(node.riskScore)}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {activeTab === "steps" && (
                <div className="space-y-4">
                  {result.attackSteps.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No multi-step paths found.</p>
                  )}
                  {result.attackSteps.map((step, i) => (
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
                        {step.nodes.length > 5 && (
                          <p className="text-xs text-muted-foreground ml-5">+{step.nodes.length - 5} more...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "recs" && (
                <div className="space-y-3">
                  {result.recommendations.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recommendations generated.</p>
                  )}
                  {result.recommendations.map((rec, i) => (
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

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/10 flex gap-2">
              <button
                onClick={downloadReport}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-all border border-primary/20"
              >
                <FileDown className="w-4 h-4" /> Download Report
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-all border border-white/10"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
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
  body{font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;padding:40px;max-width:900px;margin:0 auto}
  h1{color:#3b82f6;font-size:1.8rem}
  h2{color:#a1a1aa;font-size:1rem;text-transform:uppercase;letter-spacing:0.1em;margin-top:2rem}
  h3{color:#fafafa;font-size:1.1rem}
  table{width:100%;border-collapse:collapse;margin-bottom:1rem}
  td,th{padding:8px 12px;border:1px solid #27272a;text-align:left}
  th{background:#18181b}
  .score{font-size:3rem;font-weight:bold;color:#ef4444}
  .step,.rec{background:#18181b;border-radius:8px;padding:16px;margin-bottom:12px;border:1px solid #27272a}
  .badge{background:#27272a;padding:2px 8px;border-radius:99px;font-size:0.75rem;margin-left:6px}
  .rec.critical{border-color:#ef4444}
  .rec.high{border-color:#f97316}
  .rec.medium{border-color:#eab308}
  .rec-severity{font-weight:bold;text-transform:uppercase;font-size:0.75rem;margin-bottom:6px}
  .rec.critical .rec-severity{color:#ef4444}
  .rec.high .rec-severity{color:#f97316}
  .rec.medium .rec-severity{color:#eab308}
  ul{padding-left:1.5rem}
  li{margin-bottom:4px}
  @media print{body{background:white;color:black}}
</style>
</head>
<body>
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
</body>
</html>`;
}
