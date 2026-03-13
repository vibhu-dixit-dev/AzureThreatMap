"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import GraphCanvas from "@/components/GraphCanvas";
import SimulatePanel from "@/components/SimulatePanel";
import ImportModal from "@/components/ImportModal";

export default function Dashboard() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
      />

      {/* Sidebar Navigation */}
      <Sidebar onImportClick={() => setIsImportModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0 ml-16 md:ml-64 transition-all duration-300">
        {/* Topbar */}
        <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/5 bg-card/40 backdrop-blur-xl flex-shrink-0">
          <h1 className="text-base md:text-xl font-heading font-semibold tracking-tight text-white flex items-center gap-2">
            <span className="text-primary text-xl md:text-2xl">⚡</span>
            <span className="hidden sm:inline">AzureThreatMap Sandbox</span>
            <span className="sm:hidden">AzureThreatMap</span>
          </h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="px-2 py-1 md:px-3 md:py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] font-medium text-xs md:text-sm">
              Demo Environment Active
            </span>
          </div>
        </header>

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col md:flex-row w-full relative min-h-0">
          {/* Graph Visualization */}
          <div className="flex-1 relative bg-[#09090b]/40 min-h-[300px] md:min-h-0">
            <GraphCanvas 
              selectedNodeId={selectedNodeId} 
              onNodeSelect={setSelectedNodeId}
              simulationResult={simulationResult}
            />
          </div>

          {/* Right Simulation Panel */}
          <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-t md:border-t-0 md:border-l border-white/5 overflow-y-auto">
            <SimulatePanel 
              selectedNodeId={selectedNodeId} 
              onSimulationComplete={setSimulationResult}
              onReset={() => {
                setSelectedNodeId(null);
                setSimulationResult(null);
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
