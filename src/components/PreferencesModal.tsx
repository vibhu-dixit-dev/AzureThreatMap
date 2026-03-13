"use client";

import React from "react";
import { X, Settings, Bell, Shield, Eye, Database } from "lucide-react";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-white tracking-tight">System Preferences</h2>
              <p className="text-sm text-muted-foreground">Adjust your workspace and security settings.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
          <PrefSection 
            icon={Eye} 
            title="Appearance" 
            description="Manage visibility and interface density."
          >
            <div className="space-y-3 mt-3">
              <Toggle label="High Contrast Mode" />
              <Toggle label="Reduce Motion" />
            </div>
          </PrefSection>

          <PrefSection 
            icon={Bell} 
            title="Notifications" 
            description="Control simulation and system alerts."
          >
            <div className="space-y-3 mt-3">
              <Toggle label="Breach Success Alerts" defaultChecked />
              <Toggle label="Resource Updates" defaultChecked />
            </div>
          </PrefSection>

          <PrefSection 
            icon={Shield} 
            title="Security" 
            description="Identity and access preferences."
          >
            <div className="space-y-3 mt-3">
              <Toggle label="Auto-rotate Session IDs" />
              <Toggle label="Log All API Requests" />
            </div>
          </PrefSection>

          <PrefSection 
            icon={Database} 
            title="Data Management" 
            description="Storage and cleanup options."
          >
            <div className="space-y-3 mt-3">
              <Toggle label="Auto-purge History" defaultChecked />
              <Toggle label="Compress Graph Exports" />
            </div>
          </PrefSection>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 flex justify-end gap-3 bg-white/5">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-primary text-white font-medium hover:bg-blue-600 transition-all shadow-lg shadow-primary/25"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function PrefSection({ icon: Icon, title, description, children }: { icon: any, title: string, description: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-white font-medium">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </div>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>
      {children}
    </div>
  );
}

function Toggle({ label, defaultChecked = false }: { label: string, defaultChecked?: boolean }) {
  const [checked, setChecked] = React.useState(defaultChecked);
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
      <span className="text-xs text-zinc-300 font-medium">{label}</span>
      <button 
        onClick={() => setChecked(!checked)}
        className={`w-8 h-4 rounded-full transition-all relative ${checked ? 'bg-primary' : 'bg-zinc-700'}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${checked ? 'left-4.5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
