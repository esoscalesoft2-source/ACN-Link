import React, { useState } from "react";
import { AppNotification, ScreenId, UserProfile } from "../types";
import { Plus, Menu, Rocket } from "lucide-react";
import AcnLogo3D from "./AcnLogo3D";
import NotificationPanel from "./NotificationPanel";
import ProfileMenu from "./ProfileMenu";

interface HeaderProps {
  currentScreen: ScreenId;
  user: UserProfile;
  onScreenChange: (screen: ScreenId) => void;
  onQuickCreate?: () => void;
  onMenuToggle?: () => void;
  isMobileNavOpen?: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onNotificationNavigate?: (screen: ScreenId, pageId?: string) => void;
  onPublish?: () => void;
  onLogout: () => void;
}

export default function Header({
  currentScreen,
  user,
  onScreenChange,
  onQuickCreate,
  onMenuToggle,
  isMobileNavOpen = false,
  notifications,
  unreadCount,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onNotificationNavigate,
  onPublish,
  onLogout
}: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const showQuickCreate = currentScreen === ScreenId.CUSTOM_DOMAINS;
  const showPublish =
    currentScreen === ScreenId.DASHBOARD || currentScreen === ScreenId.ACCOUNT;

  return (
    <header className="acn-app-navbar acn-glass-header px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors shrink-0"
          aria-label="Open navigation menu"
          aria-expanded={isMobileNavOpen}
          aria-controls="mobile-nav-drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="lg:hidden min-w-0 flex items-center gap-2">
          <AcnLogo3D size="xs" />
          <p className="acn-page-title text-base sm:text-lg truncate">
            ACN Link
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {showPublish && (
          <button
            type="button"
            onClick={onPublish}
            title="Go live and choose who can see your website"
            className="acn-btn-chip"
          >
            <Rocket className="h-4 w-4" />
            <span className="hidden sm:inline">Publish</span>
          </button>
        )}

        {showQuickCreate && (
          <button
            onClick={onQuickCreate}
            className="acn-btn-chip px-3 sm:px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Create</span>
          </button>
        )}

        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          isOpen={notificationsOpen}
          onToggle={() => {
            setProfileOpen(false);
            setNotificationsOpen((open) => !open);
          }}
          onClose={() => setNotificationsOpen(false)}
          onMarkRead={onMarkNotificationRead}
          onMarkAllRead={onMarkAllNotificationsRead}
          onNavigate={onNotificationNavigate || onScreenChange}
        />

        <ProfileMenu
          user={user}
          isOpen={profileOpen}
          onToggle={() => {
            setNotificationsOpen(false);
            setProfileOpen((open) => !open);
          }}
          onClose={() => setProfileOpen(false)}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
