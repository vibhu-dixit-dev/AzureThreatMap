"use client";

import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { GraphData, SimulationResult } from "@/lib/types";

// Node colors based on type
const typeColors: Record<string, string> = {
  User: "#38bdf8",           // light blue
  Group: "#818cf8",          // indigo
  Role: "#c084fc",           // purple
  ResourceGroup: "#f472b6",  // pink
  VM: "#fbbf24",             // amber
  ManagedIdentity: "#34d399",// emerald
  StorageAccount: "#a3e635", // lime
  KeyVault: "#f87171",       // red (high value)
  Subscription: "#fb923c",   // orange
};

interface GraphCanvasProps {
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
  simulationResult: SimulationResult | null;
}

export default function GraphCanvas({ selectedNodeId, onNodeSelect, simulationResult }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [data, setData] = useState<GraphData | null>(null);

  useEffect(() => {
    fetch('/api/environment')
      .then(res => res.json())
      .then(setData);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    // Filter out unconnected nodes (nodes with no edges)
    const connectedNodeIds = new Set<string>();
    data.edges.forEach(e => {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    });

    // Only include nodes that participate in at least one edge
    const filteredEdges = data.edges.filter(
      e => connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target)
    );

    const elements = [
      ...data.nodes
        .filter(n => connectedNodeIds.has(n.id))
        .map(n => ({
          data: { id: n.id, label: n.label, type: n.type, riskScore: n.riskScore }
        })),
      ...filteredEdges.map(e => ({
        data: { id: e.id, source: e.source, target: e.target, label: e.label || e.type, type: e.type }
      }))
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => typeColors[ele.data('type')] || '#94a3b8',
            'label': 'data(label)',
            'color': '#f8fafc',
            'font-size': '10px',
            'font-family': 'Inter, sans-serif',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 4,
            'border-width': 2,
            'border-color': 'rgba(255,255,255,0.1)',
            'width': 30,
            'height': 30,
            'transition-property': 'background-color, line-color, target-arrow-color',
            'transition-duration': 300
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '8px',
            'color': '#94a3b8',
            'text-rotation': 'autorotate',
            'text-margin-y': -5,
            'transition-property': 'background-color, line-color, target-arrow-color, width',
            'transition-duration': 300
          }
        },
        {
          selector: '.highlighted-node',
          style: {
            'border-width': 4,
            'border-color': '#ef4444', // destructive color for blast radius
            'background-color': '#ef4444',
            'shadow-blur': 20,
            'shadow-color': '#ef4444',
            'shadow-opacity': 0.8
          } as any
        },
        {
          selector: '.highlighted-edge',
          style: {
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            'width': 3,
            'zIndex': 999
          }
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.15
          }
        },
        {
          selector: '.selected-node',
          style: {
            'border-color': '#3b82f6', // primary blue
            'border-width': 4,
          }
        }
      ],
      layout: {
        name: 'cose',
        padding: 50,
        nodeRepulsion: () => 4000,
        idealEdgeLength: () => 100,
        edgeElasticity: () => 100,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cy.on('tap', 'node', (evt) => {
      onNodeSelect(evt.target.id());
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        // clicked on background
        onNodeSelect("");
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [data]);

  // Handle highlights
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    // Reset styles
    cy.elements().removeClass('highlighted-node highlighted-edge dimmed selected-node');

    if (simulationResult) {
      // Highlight Blast Radius
      const blastNodeIds = new Set(simulationResult.blastRadius.map(n => n.id));
      const pathEdgeIds = new Set(simulationResult.paths.map(e => e.id));

      cy.nodes().forEach(node => {
        if (blastNodeIds.has(node.id())) {
          node.addClass('highlighted-node');
        } else {
          node.addClass('dimmed');
        }
      });

      cy.edges().forEach(edge => {
        if (pathEdgeIds.has(edge.id())) {
          edge.addClass('highlighted-edge');
        } else {
          edge.addClass('dimmed');
        }
      });
    } else if (selectedNodeId) {
      // Just highlight selected node
      cy.getElementById(selectedNodeId).addClass('selected-node');
    }
  }, [simulationResult, selectedNodeId]);

  return (
    <div className="w-full h-full relative">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}
      />
      {!data && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 glass-card p-3 rounded-lg flex flex-col gap-2 pointer-events-none">
        <h4 className="text-xs font-semibold text-white mb-1 uppercase tracking-wider">Legend</h4>
        <div className="flex flex-wrap gap-x-4 gap-y-2 max-w-[400px]">
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
