"use client";

import { useState, useEffect } from "react";
import { Search, Filter, ShieldAlert, X, Shield, Lock, Info, Server, Database, Key } from "lucide-react";
import { SecurityRecommendation } from "@/app/api/recommendations/route";

const severityColors = {
  Low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  High: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

const getResourceIcon = (type: string) => {
  if (type.toLowerCase().includes("virtual machine")) return <Server className="w-4 h-4 text-slate-400" />;
  if (type.toLowerCase().includes("storage")) return <Database className="w-4 h-4 text-slate-400" />;
  if (type.toLowerCase().includes("key vault")) return <Key className="w-4 h-4 text-slate-400" />;
  if (type.toLowerCase().includes("identity")) return <Lock className="w-4 h-4 text-slate-400" />;
  return <Shield className="w-4 h-4 text-slate-400" />;
};

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<SecurityRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [selectedResource, setSelectedResource] = useState<string>("All");
  const [selectedRec, setSelectedRec] = useState<SecurityRecommendation | null>(null);

  useEffect(() => {
    fetch('/api/recommendations')
      .then(res => res.json())
      .then(data => {
        setRecommendations(data.recommendations || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load recommendations", err);
        setLoading(false);
      });
  }, []);

  // Filter computations
  const resourceTypes = ["All", ...Array.from(new Set(recommendations.map(r => r.resourceType)))];
  
  const filteredRecs = recommendations.filter(rec => {
    const matchesSearch = rec.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rec.resourceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = selectedSeverity === "All" || rec.severity === selectedSeverity;
    const matchesResource = selectedResource === "All" || rec.resourceType === selectedResource;
    
    return matchesSearch && matchesSeverity && matchesResource;
  });

  return (
    <div className="flex-1 flex overflow-hidden relative w-full h-full bg-[#050505]">
      
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col p-6 overflow-y-auto transition-all duration-300 ${selectedRec ? 'mr-[400px]' : ''}`}>
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-blue-500" />
              Recommendations
            </h2>
            <p className="text-sm text-slate-400 mt-1">Review and remediate security posture issues in your environment.</p>
          </div>
        </div>

        {/* Filters Top Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search recommendations or resources..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
          
          <div className="flex gap-4">
            <select 
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select 
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none"
            >
              {resourceTypes.map(type => (
                <option key={type} value={type}>{type === "All" ? "All Resource Types" : type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Recommendations Table */}
        <div className="border border-white/10 rounded-xl overflow-hidden bg-[#09090b]/50 backdrop-blur-xl flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/5 border-b border-white/10 text-slate-300">
                <tr>
                  <th className="px-5 py-4 font-medium">Risk Level</th>
                  <th className="px-5 py-4 font-medium w-full">Recommendation Title</th>
                  <th className="px-5 py-4 font-medium">Affected Resource</th>
                  <th className="px-5 py-4 font-medium text-center">Attack Paths</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        Fetching assessments from Microsoft Defender...
                      </div>
                    </td>
                  </tr>
                ) : filteredRecs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-slate-400">
                      No recommendations found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecs.map((rec) => (
                    <tr 
                      key={rec.id} 
                      onClick={() => setSelectedRec(rec)}
                      className={`group cursor-pointer transition-colors ${selectedRec?.id === rec.id ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}
                    >
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${severityColors[rec.severity]}`}>
                          {rec.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-white font-medium whitespace-normal min-w-[300px]">
                        {rec.title}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {getResourceIcon(rec.resourceType)}
                          <div className="flex flex-col">
                            <span className="text-slate-200">{rec.resourceName}</span>
                            <span className="text-xs text-slate-500">{rec.resourceType}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {rec.attackPathsCount > 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-400 text-xs font-bold font-mono">
                            {rec.attackPathsCount}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-300">{rec.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Slide-over Panel */}
      <div 
        className={`fixed top-14 bottom-0 right-0 w-[400px] bg-[#0c0c0e] border-l border-white/10 shadow-2xl transition-transform duration-300 z-50 overflow-y-auto ${
          selectedRec ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedRec && (
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-semibold text-white leading-tight pr-4">{selectedRec.title}</h3>
              <button 
                onClick={() => setSelectedRec(null)}
                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              <span className={`px-3 py-1 rounded-md text-xs font-semibold border ${severityColors[selectedRec.severity]}`}>
                Severity: {selectedRec.severity}
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-medium bg-white/5 border border-white/10 text-slate-300">
                Status: {selectedRec.status}
              </span>
            </div>

            <div className="space-y-6 flex-1">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-400" /> Description
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed bg-white/5 border border-white/5 p-4 rounded-lg">
                  {selectedRec.description}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-2">Affected Resource</h4>
                <div className="flex items-center gap-3 bg-white/5 border border-white/5 p-4 rounded-lg">
                  <div className="p-2 bg-white/5 rounded-md">
                    {getResourceIcon(selectedRec.resourceType)}
                  </div>
                  <div>
                    <div className="text-sm text-white font-medium">{selectedRec.resourceName}</div>
                    <div className="text-xs text-slate-500">{selectedRec.resourceType}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-2">Remediation Steps</h4>
                <div className="text-sm text-slate-300 leading-relaxed bg-blue-500/5 border border-blue-500/10 p-4 rounded-lg whitespace-pre-line">
                  {selectedRec.remediationSteps}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="text-xs text-slate-500 space-y-2">
                <div className="flex justify-between">
                  <span>Defender ID:</span>
                  <span className="font-mono text-slate-400">{selectedRec.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Owner:</span>
                  <span>{selectedRec.owner}</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
