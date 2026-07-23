"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ImportModal from "@/components/ImportModal";
import ProfileSidebar from "@/components/ProfileSidebar";
import { UserIdentity } from "@/lib/types";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useUI();
  const { user } = useAuth();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
      <ProfileSidebar isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

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
        {/* Topbar — AzureThreatMap / SOC shell */}
        <header className="flex-shrink-0 border-b border-cyan-500/10 bg-gradient-to-r from-slate-950/90 via-card/50 to-slate-950/90 backdrop-blur-xl">
          <div className="relative h-12 md:h-14 px-4 md:px-6 flex items-center justify-between gap-4">
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent"
              aria-hidden
            />
            <div className="min-w-0 flex items-center gap-3 md:gap-4">
              <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/5 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
                <span className="text-cyan-300 text-xs font-mono font-bold tracking-tighter">SA</span>
              </div>
              <div className="min-w-0">
                <h1 className="font-heading font-semibold tracking-tight text-white text-sm md:text-base leading-tight truncate">
                  ThreatMap
                </h1>
                <p className="text-[10px] md:text-xs text-muted-foreground font-mono tracking-wide truncate">
                  Azure threat graph · sandbox
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/[0.07] px-2 py-1 md:px-2.5 md:py-1 text-[10px] md:text-xs font-mono text-emerald-300/95 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                DEMO
              </span>
              {user && (
                <button
                  onClick={() => setIsProfileOpen(true)}
                  title={user.name}
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500/90 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-[0_0_20px_rgba(34,211,238,0.25)] ring-1 ring-white/10 hover:ring-cyan-400/50 transition-all"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        {children}
      </main>
    </div>
  );
}
