"use client";
import { useState } from "react";
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Settings, 
  CloudUpload, 
  User, 
  Monitor, 
  Palette, 
  Maximize2, 
  ChevronRight,
  LogOut,
  RotateCcw
} from "lucide-react";
import { UserIdentity } from "@/lib/types";
import { useUI } from "@/context/UIContext";
import PreferencesModal from "./PreferencesModal";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onImportClick: () => void;
  identity?: UserIdentity;
}

export default function Sidebar({ onImportClick, identity }: SidebarProps) {
  const { toggleTheme, setUISize, setDevToolsPosition, uiSize, devToolsPosition } = useUI();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const userDisplayName = identity?.name || "Security Admin";
  const userTenant = identity?.tenant || "Demo Tenant";

  const handleResetEnvironment = async () => {
    if (!confirm("Are you sure you want to reset your environment? This will clear all imported Azure data.")) return;
    
    setIsResetting(true);
    try {
      const res = await fetch('/api/environment/reset', { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const cycleUISize = () => {
    const sizes: ("compact" | "medium" | "large")[] = ["compact", "medium", "large"];
    const currentIndex = sizes.indexOf(uiSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setUISize(sizes[nextIndex]);
  };

  const cycleDevTools = () => {
    const positions: ("right" | "bottom" | "hidden")[] = ["right", "bottom", "hidden"];
    const currentIndex = positions.indexOf(devToolsPosition);
    const nextIndex = (currentIndex + 1) % positions.length;
    setDevToolsPosition(positions[nextIndex]);
  };

  return (
    <>
      <PreferencesModal isOpen={isPrefsOpen} onClose={() => setIsPrefsOpen(false)} />
      
      <aside className="fixed inset-y-0 left-0 w-16 md:w-56 bg-card/60 backdrop-blur-2xl border-r border-white/5 flex flex-col z-20 transition-all duration-300">
        <div className="h-14 md:h-16 flex items-center justify-center md:justify-start md:px-5 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <span className="hidden md:block ml-3 font-heading font-bold text-lg text-white tracking-wide">
            AzureThreatMap
          </span>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          <NavItem icon={LayoutDashboard} label="Dashboard" active />
          <NavItem icon={CloudUpload} label="Import Azure" onClick={onImportClick} />
          <NavItem icon={ShieldAlert} label="Simulations" />
        </nav>

        <div className="p-4 border-t border-white/5 mt-auto hidden md:block relative">
          {isMenuOpen && (
            <div className="absolute bottom-full left-4 mb-2 w-48 bg-card/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-2 flex flex-col gap-0.5">
                <MenuButton icon={Palette} label="Theme change" onClick={toggleTheme} />
                <MenuButton 
                  icon={Monitor} 
                  label={`Dev tools: ${devToolsPosition}`} 
                  onClick={cycleDevTools} 
                />
                <MenuButton 
                  icon={Maximize2} 
                  label={`UI size: ${uiSize}`} 
                  onClick={cycleUISize} 
                />
                <div className="h-px bg-white/5 my-1" />
                <MenuButton icon={Settings} label="Other preferences" onClick={() => setIsPrefsOpen(true)} />
                <MenuButton 
                  icon={RotateCcw} 
                  label={isResetting ? "Resetting..." : "Reset Environment"} 
                  onClick={handleResetEnvironment}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                />
              </div>
            </div>
          )}

          <div 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer ${isMenuOpen ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-primary flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-xl shadow-primary/20">
              {userDisplayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-white truncate">{userDisplayName}</span>
              <span className="text-xs text-muted-foreground truncate">{userTenant}</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 ml-auto text-muted-foreground transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : ''}`} />
          </div>
        </div>
        <div className="md:hidden mt-auto py-4 flex flex-col gap-2 px-3">
          <NavItem icon={Settings} label="Settings" />
        </div>
      </aside>
    </>
  );
}

function NavItem({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
        ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}
      `}
    >
      <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-white'}`} />
      <span className="hidden md:block text-[13px] font-medium">{label}</span>
      
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
      )}
    </button>
  );
}

function MenuButton({ icon: Icon, label, onClick, className }: { icon: any, label: string, onClick?: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-all w-full text-left",
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
