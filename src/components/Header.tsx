import React, { useState } from "react";
import { AppNotification, ScreenId, UserProfile } from "../types";
import { Search, Plus, Menu, Rocket } from "lucide-react";
import AcnLogo3D from "./AcnLogo3D";
import NotificationPanel from "./NotificationPanel";

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
  onPublish
}: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const getSearchPlaceholder = () => {
    switch (currentScreen) {
      case ScreenId.BIO_PAGES:
        return "Search bio pages...";
      case ScreenId.CONTACTS:
        return "Search by name, email, or phone...";
      case ScreenId.WHATSAPP:
        return "Search campaigns...";
      case ScreenId.LINKS:
        return "Search commands or links...";
      case ScreenId.QR_CODES:
        return "Search QR Codes...";
      case ScreenId.PIXELS:
        return "Search pixels...";
      default:
        return "Search resources...";
    }
  };

  const getUserDetails = () => {
    const initials =
      user.name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

    return { initials };
  };

  const details = getUserDetails();
  const hasProfilePhoto = /^(data:image\/|https?:\/\/)/i.test(user.avatarUrl);

  const showQuickCreate =
    currentScreen === ScreenId.DASHBOARD ||
    currentScreen === ScreenId.CONTACTS ||
    currentScreen === ScreenId.WHATSAPP ||
    currentScreen === ScreenId.LINKS ||
    currentScreen === ScreenId.INTEGRATIONS ||
    currentScreen === ScreenId.MEDIA_LIBRARY ||
    currentScreen === ScreenId.CUSTOM_DOMAINS;
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

        <div className="acn-search-field relative w-full max-w-md hidden md:block">
          <span className="acn-search-field__icon">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder={getSearchPlaceholder()}
            className="w-full acn-input acn-search-input py-1.5 text-sm"
          />
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
          onToggle={() => setNotificationsOpen((open) => !open)}
          onClose={() => setNotificationsOpen(false)}
          onMarkRead={onMarkNotificationRead}
          onMarkAllRead={onMarkAllNotificationsRead}
          onNavigate={onNotificationNavigate || onScreenChange}
        />

        <button
          type="button"
          onClick={() => onScreenChange(ScreenId.ACCOUNT)}
          className="flex items-center hover:bg-white/5 p-1.5 rounded-lg transition-colors select-none"
          aria-label="Go to account"
        >
          <div className="h-9 w-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-sans font-semibold text-sm flex items-center justify-center overflow-hidden">
            {hasProfilePhoto ? (
              <img
                src={user.avatarUrl}
                alt={`${user.name} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              details.initials
            )}
          </div>
        </button>
      </div>
    </header>
  );
}
