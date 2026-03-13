"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
type UISize = "compact" | "medium" | "large";
type DevToolsPosition = "bottom" | "right" | "hidden";

interface UIContextType {
  theme: Theme;
  uiSize: UISize;
  devToolsPosition: DevToolsPosition;
  setTheme: (theme: Theme) => void;
  setUISize: (size: UISize) => void;
  setDevToolsPosition: (position: DevToolsPosition) => void;
  toggleTheme: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [uiSize, setUISizeState] = useState<UISize>("compact");
  const [devToolsPosition, setDevToolsPositionState] = useState<DevToolsPosition>("right");

  // Load from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("ui-theme") as Theme;
    const savedSize = localStorage.getItem("ui-size") as UISize;
    const savedPos = localStorage.getItem("ui-dev-pos") as DevToolsPosition;

    if (savedTheme) setThemeState(savedTheme);
    if (savedSize) setUISizeState(savedSize);
    if (savedPos) setDevToolsPositionState(savedPos);
  }, []);

  // Update classes and persistence
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    root.dataset.size = uiSize;
    localStorage.setItem("ui-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.size = uiSize;
    localStorage.setItem("ui-size", uiSize);
  }, [uiSize]);

  useEffect(() => {
    localStorage.setItem("ui-dev-pos", devToolsPosition);
  }, [devToolsPosition]);

  const setTheme = (t: Theme) => setThemeState(t);
  const setUISize = (s: UISize) => setUISizeState(s);
  const setDevToolsPosition = (p: DevToolsPosition) => setDevToolsPositionState(p);
  const toggleTheme = () => setThemeState(prev => (prev === "dark" ? "light" : "dark"));

  return (
    <UIContext.Provider value={{ 
      theme, 
      uiSize, 
      devToolsPosition, 
      setTheme, 
      setUISize, 
      setDevToolsPosition,
      toggleTheme 
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within a UIProvider");
  return context;
}
