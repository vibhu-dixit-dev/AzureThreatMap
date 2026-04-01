"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Mail, Calendar, Clock, Key, Lock, ShieldCheck,
  ChevronRight, Loader2, Eye, EyeOff, CheckCircle2, Zap,
  Trash2, AlertTriangle, Edit2, Save, LogOut
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Profile {
  name: string;
  email: string;
  subscriptionDays: number;
  createdAt: string;
}

interface ServicePrincipal {
  _id: string;
  clientId: string;
  tenantId: string;
  maskedSecret: string;
  isActive: boolean;
  createdAt: string;
}

type Tab = "profile" | "service-principals" | "reset-password";

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const BACKEND_USER = `${API_BASE}/api/user`;
const BACKEND_SP   = `${API_BASE}/api/service-principal`;

export default function ProfileSidebar({ isOpen, onClose }: ProfileSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sps, setSps] = useState<ServicePrincipal[]>([]);
  const [loading, setLoading] = useState(false);
  const [spLoading, setSpLoading] = useState<string | null>(null);
  const { refreshUser, logout } = useAuth();

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ServicePrincipal | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Password reset
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [resetMsg, setResetMsg] = useState({ type: "", text: "" });
  const [resetting, setResetting] = useState(false);

  // Username editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNameMsg, setEditNameMsg] = useState({ type: "", text: "" });
  const [savingName, setSavingName] = useState(false);

  // Logout confirmation
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const authHeader = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profRes, spRes] = await Promise.all([
        fetch(`${BACKEND_USER}/profile`, { headers: authHeader() }),
        fetch(`${BACKEND_SP}/list`, { headers: authHeader() }),
      ]);
      if (profRes.ok) setProfile(await profRes.json());
      if (spRes.ok) setSps(await spRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleConnect = async (sp: ServicePrincipal) => {
    setSpLoading(sp._id);
    try {
      const res = await fetch(`${BACKEND_SP}/connect`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ spId: sp._id }),
      });
      if (res.ok) {
        const data = await res.json();
        
        // 2. Trigger Next.js Azure Import with the decrypted credentials
        if (data.credentials) {
          await fetch("/api/import/azure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data.credentials)
          });
        }

        setSps(prev => prev.map(s => ({ ...s, isActive: s._id === sp._id })));
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to connect SP:", err);
    } finally {
      setSpLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BACKEND_SP}/${deleteTarget._id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (res.ok) {
        setSps(prev => prev.filter(s => s._id !== deleteTarget._id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setResetMsg({ type: "error", text: "Passwords do not match" });
    setResetting(true);
    setResetMsg({ type: "", text: "" });
    try {
      const res = await fetch(`${BACKEND_USER}/reset-password`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetMsg({ type: "success", text: data.message });
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      setResetMsg({ type: "error", text: err.message });
    } finally {
      setResetting(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim().length < 3) {
      setEditNameMsg({ type: "error", text: "Name must be at least 3 characters" });
      return;
    }
    setSavingName(true);
    setEditNameMsg({ type: "", text: "" });
    try {
      const res = await fetch(`${BACKEND_USER}/update-username`, {
        method: "PUT",
        headers: authHeader(),
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProfile(prev => prev ? { ...prev, name: data.name } : null);
      setIsEditingName(false);
      setEditNameMsg({ type: "success", text: "Username updated successfully!" });
      setTimeout(() => setEditNameMsg({ type: "", text: "" }), 3000);
      
      // Refresh AuthContext globally so Navbars update seamlessly
      await refreshUser();
    } catch (err: any) {
      setEditNameMsg({ type: "error", text: err.message });
    } finally {
      setSavingName(false);
    }
  };

  const tabMenu: { id: Tab; label: string; icon: any }[] = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "service-principals", label: "Service Principals", icon: Key },
    { id: "reset-password", label: "Reset Password", icon: Lock },
  ];

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0f172a] border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <h3 className="font-semibold text-white">Delete Service Principal?</h3>
              </div>
              <p className="text-sm text-slate-400 mb-2">Are you sure you want to delete this service principal?</p>
              <p className="text-xs font-mono text-slate-500 bg-white/5 px-3 py-2 rounded-lg mb-5 break-all">
                {deleteTarget.clientId}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition-all">
                  No, Keep it
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all flex items-center justify-center gap-2">
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />

            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-[#0f172a] border-l border-white/10 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                    {profile?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{profile?.name || "..."}</p>
                    <p className="text-xs text-slate-400">{profile?.email || ""}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>

              {/* Tab Nav */}
              <div className="flex flex-col gap-1 p-3 border-b border-white/10">
                {tabMenu.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                      activeTab === id ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}>
                    <Icon size={16} />
                    {label}
                    {activeTab === id && <ChevronRight size={14} className="ml-auto" />}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="animate-spin text-blue-400" size={32} />
                  </div>
                ) : (
                  <>
                    {/* PROFILE TAB */}
                    {activeTab === "profile" && profile && (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {editNameMsg.text && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                              className={`p-3 rounded-lg text-sm border overflow-hidden ${editNameMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                              {editNameMsg.text}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                <User size={18} className="text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0 pr-4">
                                <p className="text-xs text-slate-500 mb-0.5">Name</p>
                                {isEditingName ? (
                                  <input 
                                    type="text" 
                                    value={editName} 
                                    onChange={e => setEditName(e.target.value)}
                                    className="bg-slate-900 border border-blue-500/50 rounded-md px-2 py-1 text-sm text-white focus:outline-none w-full"
                                    autoFocus
                                  />
                                ) : (
                                  <p className="text-sm font-medium text-white truncate">{profile.name}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="shrink-0">
                              {isEditingName ? (
                                <div className="flex gap-2">
                                  <button onClick={() => { setIsEditingName(false); setEditNameMsg({type:"", text:""}); }} className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 transition-colors">
                                    <X size={16} />
                                  </button>
                                  <button onClick={handleSaveName} disabled={savingName} className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                                    {savingName ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditName(profile.name); setIsEditingName(true); }} className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <InfoCard icon={Mail} label="Email" value={profile.email} />
                        <InfoCard icon={Clock} label="Trial Days" value={`${profile.subscriptionDays} days left`} highlight={profile.subscriptionDays <= 3} />
                        <InfoCard icon={Calendar} label="Member Since"
                          value={new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />

                        {/* Logout Button */}
                        <AnimatePresence mode="wait">
                          {logoutConfirm ? (
                            <motion.div
                              key="confirm"
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                              className="flex gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                            >
                              <p className="text-xs text-red-300 flex-1 self-center">Are you sure you want to log out?</p>
                              <button
                                onClick={() => setLogoutConfirm(false)}
                                className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => { onClose(); logout(); }}
                                className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-all flex items-center gap-1"
                              >
                                <LogOut size={12} />
                                Log out
                              </button>
                            </motion.div>
                          ) : (
                            <motion.button
                              key="trigger"
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                              onClick={() => setLogoutConfirm(true)}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-sm font-medium"
                            >
                              <LogOut size={15} />
                              Log Out
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* SERVICE PRINCIPALS TAB */}
                    {activeTab === "service-principals" && (
                      <div className="space-y-3">
                        {sps.length === 0 ? (
                          <div className="text-center py-12 text-slate-500">
                            <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No Service Principals yet.</p>
                            <p className="text-xs mt-1">Import an Azure environment to add one.</p>
                          </div>
                        ) : (
                          sps.map((sp) => (
                            <div key={sp._id}
                              className={`p-4 rounded-xl border space-y-3 transition-all ${sp.isActive ? "bg-blue-500/10 border-blue-500/30" : "bg-white/5 border-white/10"}`}>
                              {sp.isActive && (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                  <span className="text-xs font-medium text-green-400">Active</span>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-slate-500 mb-0.5">Client ID</p>
                                <p className="text-xs font-mono text-slate-200 break-all">{sp.clientId}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-0.5">Tenant ID</p>
                                <p className="text-xs font-mono text-slate-200 break-all">{sp.tenantId}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-0.5">Client Secret</p>
                                <p className="text-xs font-mono text-slate-400">{sp.maskedSecret}</p>
                              </div>
                              <p className="text-[10px] text-slate-600">Added {new Date(sp.createdAt).toLocaleDateString()}</p>
                              <div className="flex gap-2 pt-1">
                                {!sp.isActive && (
                                  <button onClick={() => handleConnect(sp)} disabled={spLoading === sp._id}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all">
                                    {spLoading === sp._id ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                                    Connect
                                  </button>
                                )}
                                {sp.isActive && (
                                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                                    <CheckCircle2 size={13} /> Connected
                                  </div>
                                )}
                                <button onClick={() => setDeleteTarget(sp)}
                                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* RESET PASSWORD TAB */}
                    {activeTab === "reset-password" && (
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <AnimatePresence>
                          {resetMsg.text && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                              className={`p-3 rounded-lg text-sm border ${resetMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                              {resetMsg.text}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <PasswordField label="Current Password" value={oldPassword} onChange={setOldPassword} show={showOld} onToggle={() => setShowOld(!showOld)} />
                        <PasswordField label="New Password" value={newPassword} onChange={setNewPassword} show={showNew} onToggle={() => setShowNew(!showNew)} />
                        <PasswordField label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} show={showNew} onToggle={() => {}} />
                        <p className="text-xs text-slate-500">Min 8 chars · 1 uppercase · 1 number · 1 special char</p>
                        <button type="submit" disabled={resetting}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                          {resetting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                          Update Password
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function InfoCard({ icon: Icon, label, value, highlight = false }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
        <Icon size={18} className={highlight ? "text-red-400" : "text-blue-400"} />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${highlight ? "text-red-400" : "text-white"}`}>{value}</p>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} required
          className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          placeholder="••••••••" />
        <button type="button" onClick={onToggle} className="absolute right-3 top-2.5 text-slate-500 hover:text-white">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
