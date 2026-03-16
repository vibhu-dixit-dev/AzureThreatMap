"use client";

import { useState } from "react";
import GraphCanvas from "@/components/GraphCanvas";
import SimulatePanel from "@/components/SimulatePanel";
import { useUI } from "@/context/UIContext";

export default function Dashboard() {
  const { devToolsPosition } = useUI();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  return (
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
  );
}
