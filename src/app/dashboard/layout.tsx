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
        {/* Topbar */}
        <header className="h-12 md:h-14 flex items-center justify-between px-4 md:px-5 border-b border-white/5 bg-card/40 backdrop-blur-xl flex-shrink-0">
          <h1 className="text-sm md:text-lg font-heading font-semibold tracking-tight text-white flex items-center gap-2">
            <span className="text-primary text-lg md:text-xl">⚡</span>
            <span className="hidden sm:inline">AzureThreatMap Sandbox</span>
            <span className="sm:hidden">AzureThreatMap</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 md:px-3 md:py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] font-medium text-xs md:text-sm">
              Demo Environment Active
            </span>
            {/* Logged-in User Avatar */}
            {user && (
              <button
                onClick={() => setIsProfileOpen(true)}
                title={user.name}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-lg hover:ring-2 hover:ring-blue-400 transition-all"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        {children}
      </main>
    </div>
  );
}
