import { useState } from "react";
import { X, CloudUpload, Key, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { UserIdentity } from "@/lib/types";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (identity: UserIdentity) => void;
}

export default function ImportModal({ isOpen, onClose, onImportSuccess }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<"oauth" | "json">("oauth");
  const [isConnnecting, setIsConnecting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Form State
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setErrorMsg(null);
    setIsSuccess(false);
    
    try {
      const res = await fetch("/api/import/azure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, clientId, clientSecret })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to authenticate with Azure.");
      }

      setIsSuccess(true);
      
      // Pass the new identity back to the parent
      if (onImportSuccess && data.identity) {
        onImportSuccess(data.identity);
      }
      
      // Close after short delay
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        // Skip reload if we are updating state dynamically, or keep it if graph needs full reset
        // window.location.reload(); 
      }, 1500);
      
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Modal */}
      <div className="relative glass-card border border-white/10 w-full max-w-lg bg-[#09090b]/90 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-white">Import Azure Environment</h2>
              <p className="text-sm text-muted-foreground">Connect your tenant or upload RBAC map</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-4 gap-4 border-b border-white/10">
          <button 
            onClick={() => setActiveTab("oauth")}
            className={cn(
              "flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "oauth" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-white"
            )}
          >
            <Key className="w-4 h-4" /> Service Principal
          </button>
          <button 
            onClick={() => setActiveTab("json")}
            className={cn(
              "flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "json" 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-white"
            )}
          >
            <FileJson className="w-4 h-4" /> JSON Upload
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "oauth" && (
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3 text-sm text-blue-200">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                <p>Provide a Read-Only Service Principal to scan resources and role assignments securely.</p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tenant ID</label>
                  <input 
                    required
                    value={tenantId}
                    onChange={e => setTenantId(e.target.value)}
                    type="text" 
                    placeholder="e.g. 8fa1...3a9c" 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client ID</label>
                  <input 
                    required
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    type="text" 
                    placeholder="Application (client) ID" 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client Secret</label>
                  <input 
                    required
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    type="password" 
                    placeholder="••••••••••••••••" 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              {isSuccess ? (
                <div className="w-full mt-6 py-2.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg flex items-center justify-center gap-2 font-medium">
                  <CheckCircle2 className="w-5 h-5" /> Connected and Data Imported!
                </div>
              ) : (
                <button 
                  type="submit"
                  disabled={isConnnecting}
                  className="w-full mt-6 py-2.5 bg-primary hover:bg-blue-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isConnnecting ? (
                    <><div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" /> Connecting to Azure...</>
                  ) : (
                    "Connect & Scan Environment"
                  )}
                </button>
              )}
            </form>
          )}

          {activeTab === "json" && (
            <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CloudUpload className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">Click to upload JSON export</h3>
              <p className="text-xs text-muted-foreground text-center">
                Upload a verified AzureHound or custom RBAC JSON file <br />(max 5MB)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
