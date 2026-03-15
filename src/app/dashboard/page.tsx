"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import GraphCanvas from "@/components/GraphCanvas";
import SimulatePanel from "@/components/SimulatePanel";
import ImportModal from "@/components/ImportModal";
import { UserIdentity } from "@/lib/types";

import { useUI } from "@/context/UIContext";

export default function Dashboard() {
  const { theme, uiSize, devToolsPosition } = useUI();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [identity, setIdentity] = useState<UserIdentity | undefined>(undefined);

  // Fetch current environment and identity on mount
  useEffect(() => {
    fetch('/api/environment')
      .then(res => res.json())
      .then(data => {
        if (data.identity) {
          setIdentity(data.identity);
        }
      })
      .catch(err => console.error("Identity fetch error:", err));
  }, []);

  return (
    <div className={`flex h-screen w-full bg-background overflow-hidden relative ${theme}`}>
      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(newIdentity: UserIdentity) => {
          if (newIdentity) setIdentity(newIdentity);
          setIsImportModalOpen(false);
          window.location.reload(); 
        }}
      />

      {/* Sidebar Navigation */}
      <Sidebar 
        onImportClick={() => setIsImportModalOpen(true)} 
        identity={identity}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0 ml-16 md:ml-56 transition-all duration-300">
        {/* Topbar */}
        <header className="h-12 md:h-14 flex items-center justify-between px-4 md:px-5 border-b border-white/5 bg-card/40 backdrop-blur-xl flex-shrink-0">
          <h1 className="text-sm md:text-lg font-heading font-semibold tracking-tight text-white flex items-center gap-2">
            <span className="text-primary text-lg md:text-xl">⚡</span>
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
        <div className={`flex-1 flex w-full relative min-h-0 ${devToolsPosition === 'bottom' ? 'flex-col' : 'flex-row'}`}>
          {/* Graph Visualization */}
          <div className="flex-1 relative bg-[#09090b]/40 min-h-[300px] md:min-h-0">
            <GraphCanvas 
              selectedNodeId={selectedNodeId} 
              onNodeSelect={setSelectedNodeId}
              simulationResult={simulationResult}
            />
          </div>

          {/* Simulation Panel */}
          {devToolsPosition !== 'hidden' && (
            <div className={`
              flex-shrink-0 border-white/5 overflow-y-auto transition-all duration-300
              ${devToolsPosition === 'right' ? 'w-full md:w-72 lg:w-80 border-t md:border-t-0 md:border-l' : 'h-1/3 w-full border-t'}
            `}>
              <SimulatePanel 
                selectedNodeId={selectedNodeId} 
                onSimulationComplete={setSimulationResult}
                onReset={() => {
                  setSelectedNodeId(null);
                  setSimulationResult(null);
                }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
