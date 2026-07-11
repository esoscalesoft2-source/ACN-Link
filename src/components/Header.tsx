import React, { useState } from "react";
import { AppNotification, ScreenId, UserProfile } from "../types";
import { Search, Plus, Menu, Rocket } from "lucide-react";
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
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between sticky top-0 z-20 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
          aria-label="Open navigation menu"
          aria-expanded={isMobileNavOpen}
          aria-controls="mobile-nav-drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="lg:hidden min-w-0">
          <p className="font-display font-bold text-base sm:text-lg text-slate-950 tracking-tight truncate">
            ACN Link
          </p>
        </div>

        <div className="relative w-full max-w-md hidden md:block">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder={getSearchPlaceholder()}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {showPublish && (
          <button
            type="button"
            onClick={onPublish}
            title="Go live and choose who can see your website"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-95"
          >
            <Rocket className="h-4 w-4" />
            <span className="hidden sm:inline">Publish</span>
          </button>
        )}

        {showQuickCreate && (
          <button
            onClick={onQuickCreate}
            className="px-3 sm:px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-1.5 active:scale-95"
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
          className="flex items-center hover:bg-slate-50 p-1.5 rounded-lg transition-colors select-none"
          aria-label="Go to account"
        >
          <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 font-sans font-semibold text-sm flex items-center justify-center shadow-inner overflow-hidden">
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
