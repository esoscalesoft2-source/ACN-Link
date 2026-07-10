import React from "react";
import { ScreenId } from "../types";
import { User, ChevronLeft, ChevronRight } from "lucide-react";
import { NAV_CATEGORIES, NavItem } from "../navigation";

interface SidebarProps {
  currentScreen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

interface SidebarNavProps {
  currentScreen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
  isCollapsed: boolean;
  setIsCollapsed?: (val: boolean) => void;
  showCollapse?: boolean;
  showBrand?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({
  currentScreen,
  onScreenChange,
  isCollapsed,
  setIsCollapsed,
  showCollapse = true,
  showBrand = true,
  onNavigate
}: SidebarNavProps) {
  const handleNavClick = (screen: ScreenId) => {
    onScreenChange(screen);
    onNavigate?.();
  };

  const renderItem = (item: NavItem) => {
    const isActive = currentScreen === item.id;
    const IconComponent = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={`flex items-center w-full rounded-lg px-4 py-2 transition-all text-left duration-200 group relative ${
          isActive
            ? "bg-indigo-50 text-indigo-600 font-semibold"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
        title={isCollapsed ? item.label : undefined}
      >
        <IconComponent
          className={`h-4.5 w-4.5 shrink-0 ${
            isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
          }`}
        />

        {!isCollapsed && (
          <span className="ml-3 text-sm truncate flex-1">{item.label}</span>
        )}

        {!isCollapsed && item.pro && (
          <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider scale-90">
            PRO
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {showBrand && (
        <div className="p-4 flex items-center border-b border-slate-100 h-16 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shrink-0">
              <div className="w-4 h-4 border-2 border-white rotate-45" />
            </div>
            {!isCollapsed && (
              <h1 className="font-sans font-bold text-base text-slate-950 tracking-tight leading-none uppercase">
                ACN Link
              </h1>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 min-h-0">
        {NAV_CATEGORIES.map((category) => (
          <div key={category.title}>
            {!isCollapsed && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">
                {category.title}
              </p>
            )}
            <div className="space-y-0.5">{category.items.map(renderItem)}</div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <button
          onClick={() => handleNavClick(ScreenId.ACCOUNT)}
          className={`flex items-center w-full rounded-lg px-4 py-2 transition-all text-left duration-200 group relative mb-1.5 ${
            currentScreen === ScreenId.ACCOUNT
              ? "bg-indigo-50 text-indigo-600 font-semibold"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
          title={isCollapsed ? "Account" : undefined}
        >
          <User
            className={`h-4.5 w-4.5 shrink-0 ${
              currentScreen === ScreenId.ACCOUNT
                ? "text-indigo-600"
                : "text-slate-400 group-hover:text-slate-600"
            }`}
          />
          {!isCollapsed && (
            <span className="ml-3 text-sm truncate flex-1">Account</span>
          )}
        </button>

        {showCollapse && setIsCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center w-full rounded-lg px-4 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all text-left duration-200"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
            ) : (
              <ChevronLeft className="h-4.5 w-4.5 text-slate-400" />
            )}
            {!isCollapsed && (
              <span className="ml-3 text-sm text-slate-600 font-medium">Collapse</span>
            )}
          </button>
        )}
      </div>
    </>
  );
}

export default function Sidebar({
  currentScreen,
  onScreenChange,
  isCollapsed,
  setIsCollapsed
}: SidebarProps) {
  return (
    <aside
      className={`hidden lg:flex bg-white border-r border-slate-200 flex-col transition-all duration-300 shrink-0 h-screen sticky top-0 z-30 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
      aria-label="Main navigation"
    >
      <SidebarNav
        currentScreen={currentScreen}
        onScreenChange={onScreenChange}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        showCollapse
      />
    </aside>
  );
}
