import React from "react";
import { NavLink } from "react-router-dom";
import { ScreenId } from "../types";
import { User, ChevronLeft, ChevronRight } from "lucide-react";
import { NAV_CATEGORIES, NavItem, screenToPath } from "../navigation";
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
  const handleAccountClick = () => {
    onNavigate?.();
  };

  const renderItem = (item: NavItem) => {
    const IconComponent = item.icon;

    return (
      <NavLink
        key={item.id}
        to={screenToPath(item.id)}
        onClick={() => onNavigate?.()}
        className={({ isActive }) =>
          `acn-sidebar-nav-item group relative ${
            isActive ? "acn-nav-active" : "acn-sidebar-nav-idle"
          }`
        }
        title={isCollapsed ? item.label : undefined}
      >
        {({ isActive }) => (
          <>
            <IconComponent className="acn-sidebar-nav-item__icon" />

            {!isCollapsed && (
              <span className="acn-sidebar-nav-item__label">{item.label}</span>
            )}

            {!isCollapsed && item.pro && (
              <span className="acn-sidebar-pro-badge">PRO</span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {showBrand && (
        <div className={`acn-sidebar-brand ${isCollapsed ? "justify-center" : ""}`}>
          <AcnLogo3D size="sm" showLabel={!isCollapsed} />
        </div>
      )}

      <div className="acn-sidebar-nav__scroll">
        {NAV_CATEGORIES.map((category) => (
          <div key={category.title}>
            {!isCollapsed && (
              <p className="acn-sidebar-category">{category.title}</p>
            )}
            <div className="acn-sidebar-nav-items">{category.items.map(renderItem)}</div>
          </div>
        ))}
      </div>

      <div className="acn-sidebar-footer">
        <NavLink
          to={screenToPath(ScreenId.ACCOUNT)}
          onClick={handleAccountClick}
          className={({ isActive }) =>
            `acn-sidebar-nav-item group relative ${
              isActive ? "acn-nav-active" : "acn-sidebar-nav-idle"
            }`
          }
          title={isCollapsed ? "Account" : undefined}
        >
          {({ isActive }) => (
            <>
              <User className="acn-sidebar-nav-item__icon" />
              {!isCollapsed && (
                <span className="acn-sidebar-nav-item__label">Account</span>
              )}
            </>
          )}
        </NavLink>

        {showCollapse && setIsCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="acn-sidebar-nav-item acn-sidebar-nav-idle"
          >
            {isCollapsed ? (
              <ChevronRight className="acn-sidebar-nav-item__icon" />
            ) : (
              <ChevronLeft className="acn-sidebar-nav-item__icon" />
            )}
            {!isCollapsed && (
              <span className="acn-sidebar-nav-item__label">Collapse</span>
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
        isCollapsed ? "acn-sidebar--collapsed w-[5.5rem]" : "w-[18rem]"
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
