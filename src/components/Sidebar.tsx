import React from "react";
import { ScreenId } from "../types";
import { User, ChevronLeft, ChevronRight } from "lucide-react";
import { NAV_CATEGORIES, NavItem } from "../navigation";
import AcnLogo3D from "./AcnLogo3D";

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
            ? "acn-nav-active"
            : "acn-sidebar-nav-idle text-slate-400 hover:text-slate-200"
        }`}
        title={isCollapsed ? item.label : undefined}
      >
        <IconComponent
          className={`h-4.5 w-4.5 shrink-0 ${
            isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
          }`}
        />

        {!isCollapsed && (
          <span className="ml-3 text-sm truncate flex-1">{item.label}</span>
        )}

        {!isCollapsed && item.pro && (
          <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-wider scale-90">
            PRO
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {showBrand && (
        <div className={`acn-sidebar-brand ${isCollapsed ? "justify-center !px-2" : ""}`}>
          <AcnLogo3D size="sm" showLabel={!isCollapsed} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-5 min-h-0">
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

      <div className="p-3 shrink-0">
        <button
          onClick={() => handleNavClick(ScreenId.ACCOUNT)}
          className={`flex items-center w-full rounded-lg px-4 py-2 transition-all text-left duration-200 group relative mb-1.5 ${
            currentScreen === ScreenId.ACCOUNT
              ? "acn-nav-active"
              : "acn-sidebar-nav-idle text-slate-400 hover:text-slate-200"
          }`}
          title={isCollapsed ? "Account" : undefined}
        >
          <User
            className={`h-4.5 w-4.5 shrink-0 ${
              currentScreen === ScreenId.ACCOUNT
                ? "text-indigo-400"
                : "text-slate-500 group-hover:text-slate-300"
            }`}
          />
          {!isCollapsed && (
            <span className="ml-3 text-sm truncate flex-1">Account</span>
          )}
        </button>

        {showCollapse && setIsCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="acn-sidebar-nav-idle flex items-center w-full rounded-lg px-4 py-2 transition-all text-left duration-200"
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
      className={`hidden lg:flex acn-glass-sidebar flex-col transition-all duration-300 shrink-0 h-full max-h-full overflow-hidden ${
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
