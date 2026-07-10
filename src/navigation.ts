import { ScreenId } from "./types";
import {
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
  LucideIcon
} from "lucide-react";

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
  pro?: boolean;
}

export interface NavCategory {
  title: string;
  items: NavItem[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    title: "Smart Marketing",
    items: [
      { id: ScreenId.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
      { id: ScreenId.BIO_PAGES, label: "Bio Pages", icon: Smartphone },
      { id: ScreenId.CONTACTS, label: "Contacts", icon: Users },
      { id: ScreenId.WHATSAPP, label: "WhatsApp", icon: MessageCircle, pro: true },
      { id: ScreenId.LINKS, label: "Links", icon: Link2, pro: true },
      { id: ScreenId.QR_CODES, label: "QR Codes", icon: QrCode, pro: true },
      { id: ScreenId.TEMPLATES, label: "Templates", icon: FileText },
      { id: ScreenId.INTEGRATIONS, label: "Integrations", icon: Puzzle }
    ]
  },
  {
    title: "Tools",
    items: [
      { id: ScreenId.PIXELS, label: "Pixels", icon: Activity },
      { id: ScreenId.MEDIA_LIBRARY, label: "Media Library", icon: ImageIcon },
      { id: ScreenId.CUSTOM_DOMAINS, label: "Custom Domains", icon: Globe }
    ]
  },
  {
    title: "Support",
    items: [
      { id: ScreenId.HELP_CENTER, label: "Help Center", icon: HelpCircle },
      { id: ScreenId.CONTACT_SUPPORT, label: "Contact Support", icon: Headphones }
    ]
  }
];

const SCREEN_TITLES: Partial<Record<ScreenId, string>> = {
  [ScreenId.DASHBOARD]: "Dashboard",
  [ScreenId.BIO_PAGES]: "Bio Pages",
  [ScreenId.CONTACTS]: "Contacts",
  [ScreenId.WHATSAPP]: "WhatsApp",
  [ScreenId.LINKS]: "Links",
  [ScreenId.QR_CODES]: "QR Codes",
  [ScreenId.TEMPLATES]: "Templates",
  [ScreenId.INTEGRATIONS]: "Integrations",
  [ScreenId.PIXELS]: "Pixels",
  [ScreenId.MEDIA_LIBRARY]: "Media Library",
  [ScreenId.CUSTOM_DOMAINS]: "Custom Domains",
  [ScreenId.HELP_CENTER]: "Help Center",
  [ScreenId.CONTACT_SUPPORT]: "Contact Support",
  [ScreenId.ACCOUNT]: "Account"
};

export function getScreenTitle(screen: ScreenId): string {
  return SCREEN_TITLES[screen] ?? "ACN Link";
}
