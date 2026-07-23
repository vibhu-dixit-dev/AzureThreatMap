"use client";

import { useState } from "react";
import GraphCanvas from "@/components/GraphCanvas";
import SimulatePanel from "@/components/SimulatePanel";
import { useUI } from "@/context/UIContext";
import { LiveScanFinding } from "@/lib/types";

import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { devToolsPosition } = useUI();

  // ALL hooks must be declared before any early returns (React Rules of Hooks)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [scanResult, setScanResult] = useState<LiveScanFinding[] | null>(null);

  // Protection layer — conditional returns AFTER all hooks
  if (loading) {
    return (
      <div className="h-screen w-full bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!user) return null; // Redirect handled by AuthContext

  return (
    <div
      className={`flex-1 flex w-full relative min-h-0 overflow-x-hidden bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(34,211,238,0.08),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(59,130,246,0.06),transparent_50%),var(--background)] ${devToolsPosition === "bottom" ? "flex-col" : "flex-row"}`}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {/* Primary canvas stage — grid/flex child grows; inner frame keeps graph readable */}
      <div className="flex-1 relative min-h-[280px] md:min-h-0 min-w-0 flex flex-col p-2 md:p-3 pb-0 md:pb-3">
        <div className="flex-1 relative min-h-0 rounded-xl md:rounded-2xl border border-white/[0.07] bg-slate-950/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_80px_rgba(0,0,0,0.35)] overflow-hidden ring-1 ring-cyan-500/5">
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(15,23,42,0.35)_0%,transparent_40%,transparent_100%)]" />
          <GraphCanvas
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            simulationResult={simulationResult}
            scanResult={scanResult}
          />
        </div>
      </div>

      {/* Analyst console — scrollable; width/height from layout preference */}
      {devToolsPosition !== "hidden" && (
        <div
          className={`
          flex-shrink-0 overflow-y-auto overflow-x-hidden transition-all duration-300
          border-cyan-500/10 bg-slate-950/30 backdrop-blur-sm
          ${devToolsPosition === "right"
              ? "w-full md:w-[min(100%,20rem)] lg:w-96 border-t md:border-t-0 md:border-l md:border-white/[0.06]"
              : "h-[min(40vh,22rem)] w-full border-t border-white/[0.06] md:h-2/5"}
        `}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <SimulatePanel
            selectedNodeId={selectedNodeId}
            onSimulationComplete={(res) => {
              setSimulationResult(res);
              setScanResult(null);
            }}
            onScanComplete={(res) => {
              setScanResult(res);
              setSimulationResult(null);
            }}
            scanResult={scanResult}
            onReset={() => {
              setSelectedNodeId(null);
              setSimulationResult(null);
              setScanResult(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
