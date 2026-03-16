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
        },
        {
          selector: '.search-match',
          style: {
            'border-width': 4,
            'border-color': '#a78bfa',
            'shadow-blur': 20,
            'shadow-color': '#a78bfa',
            'shadow-opacity': 1.0,
            'opacity': 1.0,
          } as any
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
            'shadow-blur': 25,
            'shadow-color': '#ef4444',
            'shadow-opacity': 0.9
          } as any
        },
        {
          selector: '.scan-high',
          style: {
            'border-width': 3,
            'border-color': '#f97316',
            'background-color': '#f97316',
            'shadow-blur': 15,
            'shadow-color': '#f97316',
            'shadow-opacity': 0.8
          } as any
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
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm && setShowDropdown(searchResults.length > 0)}
            placeholder="Search resources, users, VMs, storage..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 shadow-lg transition-all"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && (
          <div className="absolute top-full mt-1 left-4 right-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-3 py-1.5 border-b border-white/5">
              <span className="text-[10px] text-muted-foreground">{searchResults.length} match{searchResults.length !== 1 ? 'es' : ''}</span>
            </div>
            <ul className="max-h-52 overflow-y-auto">
              {searchResults.map(r => (
                <li key={r.id}>
                  <button
                    onClick={() => selectResult(r.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
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
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}
      />
      {!data && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Legend overlay */}
      <div className="absolute bottom-3 left-3 glass-card p-2 rounded-md flex flex-col gap-1.5 pointer-events-none z-10">
        <h4 className="text-[10px] font-semibold text-white mb-0.5 uppercase tracking-wider">Legend</h4>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 max-w-[320px]">
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover Tooltip for Scans */}
      {tooltip && (
        <div 
          className="absolute z-50 pointer-events-none glass-card p-3 rounded-xl border border-white/20 shadow-2xl bg-black/80 backdrop-blur-md min-w-[200px] max-w-[250px]"
          style={{ 
            left: tooltip.x + 15, 
            top: tooltip.y + 15, 
            transform: 'translate(0, 0)'
          }}
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
            <Radar className="w-3.5 h-3.5 text-indigo-400" />
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
