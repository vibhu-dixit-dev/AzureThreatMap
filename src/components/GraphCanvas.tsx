"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import cytoscape from "cytoscape";
import { GraphData, SimulationResult, LiveScanFinding } from "@/lib/types";
import { Radar, Search, X } from "lucide-react";

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
  scanResult?: LiveScanFinding[] | null;
}

export default function GraphCanvas({ selectedNodeId, onNodeSelect, simulationResult, scanResult }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, finding: LiveScanFinding, nodeLabel: string } | null>(null);

  // ---- Search state ----
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; label: string; type: string }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/environment')
      .then(res => res.json())
      .then(res => setData(res.graph || res)); // Fallback to res for backward compatibility
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
            'font-size': '9px',
            'font-family': 'Inter, sans-serif',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 3,
            'border-width': 1.5,
            'border-color': 'rgba(255,255,255,0.1)',
            'width': 24,
            'height': 24,
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
            'font-size': '7.5px',
            'color': '#94a3b8',
            'text-rotation': 'autorotate',
            'text-margin-y': -4,
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
          }
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
        },
        {
          selector: '.search-match',
          style: {
            'border-width': 4,
            'border-color': '#a78bfa',
            'opacity': 1.0,
          }
        },
        {
          selector: '.search-dimmed',
          style: { 'opacity': 0.12 }
        },
        {
          selector: '.scan-critical',
          style: {
            'border-width': 4,
            'border-color': '#ef4444',
            'background-color': '#ef4444',
          }
        },
        {
          selector: '.scan-high',
          style: {
            'border-width': 3,
            'border-color': '#f97316',
            'background-color': '#f97316',
          }
        },
        {
          selector: '.scan-medium',
          style: {
            'border-width': 3,
            'border-color': '#eab308',
            'background-color': '#eab308',
          }
        },
        {
          selector: '.scan-low',
          style: {
            'border-width': 2,
            'border-color': '#3b82f6',
            'background-color': '#3b82f6',
          }
        },
        {
          selector: '.scan-edge-critical',
          style: {
            'line-color': '#ef4444',
            'target-arrow-color': '#ef4444',
            'width': 3,
            'zIndex': 999
          }
        },
        {
          selector: '.scan-edge-high',
          style: {
            'line-color': '#f97316',
            'target-arrow-color': '#f97316',
            'width': 2.5,
            'zIndex': 998
          }
        },
        {
          selector: '.attacker-node',
          style: {
            'shape': 'ellipse',
            'background-color': '#000000',
            'label': '💀',
            'font-size': '20px',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 24,
            'height': 24,
            'border-width': 2,
            'border-color': '#ef4444',
            'z-index': 9999
          } as any
        }
      ],
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    const layout = cy.layout({
      name: 'cose',
      padding: 40,
      nodeRepulsion: () => 3500,
      idealEdgeLength: () => 80,
      edgeElasticity: () => 100,
      animate: false
    } as cytoscape.LayoutOptions);
    
    layout.run();

    cy.on('tap', 'node', (evt) => {
      onNodeSelect(evt.target.id());
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        // clicked on background
        onNodeSelect("");
      }
    });

    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      // Only show tooltip if there's a scan result and we aren't currently dragging the background
      const finding = node.data('scanFinding');
      if (finding) {
        setTooltip({
          x: evt.renderedPosition.x,
          y: evt.renderedPosition.y,
          finding,
          nodeLabel: node.data('label')
        });
      }
    });

    cy.on('mouseout', 'node', () => {
      setTooltip(null);
    });

    cy.on('pan zoom', () => {
      setTooltip(null);
    });

    cyRef.current = cy;

    return () => {
      layout.stop();
      cy.destroy();
      if (cyRef.current === cy) {
        cyRef.current = null;
      }
    };
  }, [data]);

  // ---- Search logic (client-side only, pure overlay) ----
  const focusNode = useCallback((nodeId: string) => {
    const cy = cyRef.current;
    if (!cy) return;
    const node = cy.getElementById(nodeId);
    if (!node || node.length === 0) return;
    cy.animate({
      center: { eles: node },
      zoom: Math.max(cy.zoom(), 1.5),
    } as any, { duration: 400, easing: 'ease-in-out-cubic' } as any);
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass('search-match search-dimmed');

    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const q = searchTerm.toLowerCase();
    const matches: Array<{ id: string; label: string; type: string }> = [];

    cy.nodes().forEach(node => {
      const label: string = node.data('label') || '';
      const type: string = node.data('type') || '';
      if (label.toLowerCase().includes(q) || type.toLowerCase().includes(q)) {
        matches.push({ id: node.id(), label, type });
        node.addClass('search-match');
      } else {
        node.addClass('search-dimmed');
      }
    });

    setSearchResults(matches);
    setShowDropdown(matches.length > 0);

    // Auto-pan to first match
    if (matches.length === 1) {
      focusNode(matches[0].id);
    }
  }, [searchTerm, focusNode]);

  const clearSearch = () => {
    setSearchTerm('');
    const cy = cyRef.current;
    if (cy) cy.elements().removeClass('search-match search-dimmed');
    setShowDropdown(false);
    searchRef.current?.focus();
  };

  const selectResult = (nodeId: string) => {
    const cy = cyRef.current;
    if (!cy) return;
    focusNode(nodeId);
    onNodeSelect(nodeId);
    setShowDropdown(false);
  };

  // Handle highlights
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    // Remove any leftover attacker nodes
    cy.elements('.attacker-node').remove();

    // Reset styles
    cy.elements().removeClass('highlighted-node highlighted-edge dimmed selected-node scan-critical scan-high scan-medium scan-low scan-edge-critical scan-edge-high');
    
    // Reset data
    // Reset data — set to null instead of removeData to avoid CollectionReturnValue lint error
    cy.nodes().forEach(n => { n.data('scanFinding', null); });

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

      // Build adjacency list for paths
      const adjList: Record<string, string[]> = {};
      simulationResult.paths.forEach(edge => {
        if (!adjList[edge.source]) adjList[edge.source] = [];
        adjList[edge.source].push(edge.target);
      });

      let attackerCounter = 0;
      const animateAttacker = (sourceId: string) => {
        const sourceNode = cy.getElementById(sourceId);
        if (!sourceNode || sourceNode.empty()) return;

        const targets = adjList[sourceId];
        if (!targets || targets.length === 0) return; // End of path reached

        targets.forEach(targetId => {
          const targetNode = cy.getElementById(targetId);
          if (!targetNode || targetNode.empty()) return;

          const attackerId = `attacker_${sourceId}_${targetId}_${attackerCounter++}`;
          
          try {
            // Spawn temporary attacker node
            const attacker = cy.add({
              group: 'nodes',
              data: { id: attackerId },
              position: { ...sourceNode.position() },
              classes: 'attacker-node'
            });

            // Animate to target
            attacker.animate({
              position: { ...targetNode.position() }
            }, {
              duration: 1500,
              easing: 'linear',
              complete: () => {
                // Remove attacker after reaching target
                attacker.remove();
                
                // Visual pulse on the target node
                targetNode.flashClass('scan-critical', 400);

                // Continue traversal
                animateAttacker(targetId);
              }
            });
          } catch (e) {
            console.error('Animation error', e);
          }
        });
      };

      // Start the animation sequence after a brief delay
      setTimeout(() => {
        animateAttacker(simulationResult.compromisedNodeId);
      }, 500);

    } else if (scanResult && scanResult.length > 0) {
      // Highlight Live Scan Results
      
      const scanMap = new Map<string, LiveScanFinding>();
      scanResult.forEach(res => {
        // If a node has multiple issues, keep the highest severity for visual representation
        const existing = scanMap.get(res.nodeId);
        if (!existing || 
           (res.severity === 'Critical') || 
           (res.severity === 'High' && existing.severity !== 'Critical') ||
           (res.severity === 'Medium' && existing.severity === 'Low')) {
           scanMap.set(res.nodeId, res);
        }
      });

      cy.nodes().forEach(node => {
        const finding = scanMap.get(node.id());
        if (finding) {
          node.data('scanFinding', finding);
          node.addClass(`scan-${finding.severity.toLowerCase()}`);
        } else {
          node.addClass('dimmed'); // dim safe nodes to highlight risks
        }
      });

      cy.edges().forEach(edge => {
        // Find if source or target has a critical/high finding
        const sFinding = scanMap.get(edge.source().id());
        const tFinding = scanMap.get(edge.target().id());
        
        const isCritical = sFinding?.severity === 'Critical' || tFinding?.severity === 'Critical';
        const isHigh = sFinding?.severity === 'High' || tFinding?.severity === 'High';

        if (isCritical) {
          edge.addClass('scan-edge-critical');
        } else if (isHigh) {
           edge.addClass('scan-edge-high');
        } else {
           edge.addClass('dimmed');
        }
      });

      if (selectedNodeId) cy.getElementById(selectedNodeId).addClass('selected-node');

    } else if (selectedNodeId) {
      // Just highlight selected node
      cy.getElementById(selectedNodeId).addClass('selected-node');
    }
  }, [simulationResult, scanResult, selectedNodeId]);

  return (
    <div className="w-full h-full relative">
      {/* ─── Search Bar Overlay ─── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4">
        <div className="relative rounded-2xl border border-cyan-500/10 bg-slate-950/45 p-0.5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm && setShowDropdown(searchResults.length > 0)}
            placeholder="Search resources, users, VMs, storage..."
            className="w-full pl-10 pr-9 py-2.5 text-sm rounded-[0.875rem] bg-slate-950/70 border border-white/[0.06] text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/35 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cyan-200/90 transition-colors p-1 rounded-md hover:bg-white/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && (
          <div className="absolute top-full mt-2 left-4 right-4 bg-slate-950/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50 ring-1 ring-cyan-500/10">
            <div className="px-3 py-1.5 border-b border-white/[0.06] bg-slate-950/80">
              <span className="text-[10px] font-mono text-muted-foreground">{searchResults.length} match{searchResults.length !== 1 ? 'es' : ''}</span>
            </div>
            <ul className="max-h-52 overflow-y-auto">
              {searchResults.map(r => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => selectResult(r.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cyan-500/[0.06] transition-colors text-left"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: typeColors[r.type] || '#6b7280' }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">{r.label}</div>
                      <div className="text-[10px] text-muted-foreground">{r.type}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(34,211,238,0.07) 1px, transparent 0)', backgroundSize: '28px 28px' }}
      />
      {!data && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Legend overlay — compact grid for scale */}
      <div className="absolute bottom-3 left-3 z-10 max-w-[min(100%,22rem)] pointer-events-none rounded-xl border border-white/[0.06] bg-slate-950/75 px-3 py-2 shadow-[0_16px_50px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <h4 className="text-[9px] font-semibold text-cyan-200/80 mb-1.5 uppercase tracking-[0.18em] font-mono">Node types</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1">
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/10" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-muted-foreground truncate">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover Tooltip for Scans */}
      {tooltip && (
        <div 
          className="absolute z-50 pointer-events-none p-3 rounded-xl border border-cyan-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] bg-slate-950/95 backdrop-blur-md min-w-[200px] max-w-[250px] ring-1 ring-white/[0.04]"
          style={{ 
            left: tooltip.x + 15, 
            top: tooltip.y + 15, 
            transform: 'translate(0, 0)'
          }}
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/[0.08]">
            <Radar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-xs font-semibold text-white truncate">{tooltip.nodeLabel}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-start gap-2">
              <span className="text-[11px] text-muted-foreground">Issue:</span>
              <span className="text-[11px] text-white font-medium text-right leading-tight">{tooltip.finding.issue}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Severity:</span>
              {/* @ts-ignore - Tailwind class gen */}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-semibold ${tooltip.finding.severity === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' : tooltip.finding.severity === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : tooltip.finding.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                {tooltip.finding.severity}
              </span>
            </div>
            <div className="flex justify-between items-start gap-2 pt-1 border-t border-white/5">
              <span className="text-[9px] text-muted-foreground mt-0.5">Source:</span>
              <span className="text-[10px] text-slate-300 text-right">{tooltip.finding.source}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
