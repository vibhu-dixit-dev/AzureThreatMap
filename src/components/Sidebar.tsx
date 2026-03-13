"use strict";
import { LayoutDashboard, ShieldAlert, Settings, CloudUpload, User } from "lucide-react";

interface SidebarProps {
  onImportClick: () => void;
}

export default function Sidebar({ onImportClick }: SidebarProps) {
  return (
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

      <div className="p-4 border-t border-white/5 mt-auto hidden md:block">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Security Admin</span>
            <span className="text-xs text-muted-foreground">Demo Tenant</span>
          </div>
        </div>
      </div>
      <div className="md:hidden mt-auto py-4 flex flex-col gap-2 px-3">
        <NavItem icon={Settings} label="Settings" />
      </div>
    </aside>
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
