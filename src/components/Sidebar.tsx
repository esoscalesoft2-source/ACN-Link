import React from "react";
import { ScreenId } from "../types";
import {
  Link,
  LogIn,
  LayoutDashboard,
  Smartphone,
  Users,
  MessageCircle,
  Link2,
  QrCode,
  FileText,
  Puzzle,
  Activity,
  Image as ImageIcon,
  Globe,
  HelpCircle,
  Headphones,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface SidebarProps {
  currentScreen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  onLogout: () => void;
  isLoggedIn: boolean;
}

export default function Sidebar({
  currentScreen,
  onScreenChange,
  isCollapsed,
  setIsCollapsed,
  onLogout,
  isLoggedIn
}: SidebarProps) {
  // Navigation categories matching screenshots exactly
  const smartMarketingItems = [
    { id: ScreenId.DASHBOARD, label: "Dashboard", icon: LayoutDashboard, pro: false },
    { id: ScreenId.BIO_PAGES, label: "Bio Pages", icon: Smartphone, pro: false },
    { id: ScreenId.CONTACTS, label: "Contacts", icon: Users, pro: false },
    { id: ScreenId.WHATSAPP, label: "WhatsApp", icon: MessageCircle, pro: true },
    { id: ScreenId.LINKS, label: "Links", icon: Link2, pro: true },
    { id: ScreenId.QR_CODES, label: "QR Codes", icon: QrCode, pro: true },
    { id: ScreenId.TEMPLATES, label: "Templates", icon: FileText, pro: false },
    { id: ScreenId.INTEGRATIONS, label: "Integrations", icon: Puzzle, pro: false }
  ];

  const toolsItems = [
    { id: ScreenId.PIXELS, label: "Pixels", icon: Activity, pro: false },
    { id: ScreenId.MEDIA_LIBRARY, label: "Media Library", icon: ImageIcon, pro: false },
    { id: ScreenId.CUSTOM_DOMAINS, label: "Custom Domains", icon: Globe, pro: false }
  ];

  const supportItems = [
    { id: ScreenId.HELP_CENTER, label: "Help Center", icon: HelpCircle, pro: false },
    { id: ScreenId.CONTACT_SUPPORT, label: "Contact Support", icon: Headphones, pro: false }
  ];

  const renderItem = (item: { id: ScreenId; label: string; icon: any; pro?: boolean }) => {
    // If user is not logged in, clicking dashboard/admin features prompts login or we let them toggle anyway for full interactive preview.
    // Let's allow clicking any item for ultimate ease of testing the 15 screenshots.
    const isActive = currentScreen === item.id;
    const IconComponent = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => onScreenChange(item.id)}
        className={`flex items-center w-full rounded-lg px-4 py-2 transition-all text-left duration-200 group relative ${
          isActive
            ? "bg-indigo-50 text-indigo-600 font-semibold"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
        title={isCollapsed ? item.label : undefined}
      >
        <IconComponent className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`} />
        
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
    <div
      className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 shrink-0 h-screen sticky top-0 z-30 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand logo at the top matching Geometric Balance theme exactly */}
      <div className="p-4 flex items-center border-b border-slate-100 h-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shrink-0">
            <div className="w-4 h-4 border-2 border-white rotate-45"></div>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-sans font-bold text-base text-slate-950 tracking-tight leading-none uppercase">
                ACN Link
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* Main navigation area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Category: Smart Marketing */}
        <div>
          {!isCollapsed && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">
              Smart Marketing
            </p>
          )}
          <div className="space-y-0.5">
            {smartMarketingItems.map(renderItem)}
          </div>
        </div>

        {/* Category: Tools */}
        <div>
          {!isCollapsed && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">
              Tools
            </p>
          )}
          <div className="space-y-0.5">
            {toolsItems.map(renderItem)}
          </div>
        </div>

        {/* Category: Support */}
        <div>
          {!isCollapsed && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-2">
              Support
            </p>
          )}
          <div className="space-y-0.5">
            {supportItems.map(renderItem)}
          </div>
        </div>
      </div>

      {/* Bottom controls / profile section */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        {/* Account Button */}
        <button
          onClick={() => onScreenChange(ScreenId.ACCOUNT)}
          className={`flex items-center w-full rounded-lg px-4 py-2 transition-all text-left duration-200 group relative mb-1.5 ${
            currentScreen === ScreenId.ACCOUNT
              ? "bg-indigo-50 text-indigo-600 font-semibold"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
          title={isCollapsed ? "Account" : undefined}
        >
          <User className={`h-4.5 w-4.5 shrink-0 ${currentScreen === ScreenId.ACCOUNT ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`} />
          {!isCollapsed && (
            <span className="ml-3 text-sm truncate flex-1">Account</span>
          )}
        </button>

        {/* Log Out Button */}
        <button
          onClick={onLogout}
          className="flex items-center w-full rounded-lg px-4 py-2 text-rose-600 hover:bg-rose-50 transition-all text-left duration-200 mb-1.5"
          title={isCollapsed ? "Log Out" : undefined}
        >
          <LogOut className="h-4.5 w-4.5 shrink-0 text-rose-500" />
          {!isCollapsed && (
            <span className="ml-3 text-sm font-semibold">Log Out</span>
          )}
        </button>

        {/* Collapse Button */}
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
      </div>
    </div>
  );
}
