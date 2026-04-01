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
      className={`flex-1 flex w-full relative min-h-0 overflow-x-hidden ${devToolsPosition === 'bottom' ? 'flex-col' : 'flex-row'}`}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {/* Graph Visualization */}
      <div className="flex-1 relative bg-[#09090b]/40 min-h-[300px] md:min-h-0 overflow-hidden">
        <GraphCanvas
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
          simulationResult={simulationResult}
          scanResult={scanResult}
        />
      </div>

      {/* Simulation Panel */}
      {devToolsPosition !== 'hidden' && (
        <div
          className={`
          flex-shrink-0 border-white/5 overflow-y-auto overflow-x-hidden transition-all duration-300
          ${devToolsPosition === 'right'
              ? 'w-full md:w-72 lg:w-80 border-t md:border-t-0 md:border-l'
              : 'h-1/3 w-full border-t'}
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
