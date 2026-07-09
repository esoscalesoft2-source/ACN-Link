import React from "react";
import { ScreenId, UserProfile } from "../types";
import { Bell, Settings, Search, Plus } from "lucide-react";

interface HeaderProps {
  currentScreen: ScreenId;
  user: UserProfile;
  onScreenChange: (screen: ScreenId) => void;
  onQuickCreate?: () => void;
}

export default function Header({
  currentScreen,
  user,
  onScreenChange,
  onQuickCreate
}: HeaderProps) {
  // Determine search placeholder based on current screen
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

  // Determine user title and avatar based on the screenshots' variety of roles
  const getUserDetails = () => {
    switch (currentScreen) {
      case ScreenId.DASHBOARD:
        return { name: "Alex Rivera", role: "Admin", initials: "AR" };
      case ScreenId.BIO_PAGES:
        return { name: "Alex Morgan", role: "Pro Marketer", initials: "AM" };
      case ScreenId.QR_CODES:
        return { name: "Alex Sterling", role: "Marketing Lead", initials: "AS" };
      default:
        return { name: user.name, role: "Marketing Pro", initials: user.name[0] };
    }
  };

  const details = getUserDetails();

  return (
    <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input on the Left */}
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

      {/* Right side controls */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Quick Create Button matching Design HTML */}
        {(currentScreen === ScreenId.DASHBOARD ||
          currentScreen === ScreenId.CONTACTS ||
          currentScreen === ScreenId.WHATSAPP ||
          currentScreen === ScreenId.LINKS ||
          currentScreen === ScreenId.INTEGRATIONS ||
          currentScreen === ScreenId.MEDIA_LIBRARY ||
          currentScreen === ScreenId.CUSTOM_DOMAINS) && (
          <button
            onClick={onQuickCreate}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Quick Create</span>
          </button>
        )}

        {/* Notification Bell */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 border-2 border-white" />
        </button>

        {/* Global Settings Trigger */}
        <button
          onClick={() => onScreenChange(ScreenId.ACCOUNT)}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Settings className="h-4.5 w-4.5" />
        </button>

        {/* Divider line */}
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User profile dropdown info */}
        <div
          onClick={() => onScreenChange(ScreenId.ACCOUNT)}
          className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors select-none"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-950 leading-none">
              {details.name}
            </p>
            <span className="text-[10px] font-medium text-slate-400">
              {details.role}
            </span>
          </div>

          <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 font-sans font-semibold text-sm flex items-center justify-center shadow-inner">
            {details.initials}
          </div>
        </div>
      </div>
    </header>
  );
}
