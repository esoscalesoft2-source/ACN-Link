export enum ScreenId {
  LOGIN = "LOGIN",
  DASHBOARD = "DASHBOARD",
  BIO_PAGES = "BIO_PAGES",
  CONTACTS = "CONTACTS",
  WHATSAPP = "WHATSAPP",
  LINKS = "LINKS",
  QR_CODES = "QR_CODES",
  TEMPLATES = "TEMPLATES",
  INTEGRATIONS = "INTEGRATIONS",
  PIXELS = "PIXELS",
  MEDIA_LIBRARY = "MEDIA_LIBRARY",
  CUSTOM_DOMAINS = "CUSTOM_DOMAINS",
  HELP_CENTER = "HELP_CENTER",
  CONTACT_SUPPORT = "CONTACT_SUPPORT",
  ACCOUNT = "ACCOUNT"
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  plan: string;
  isVerified: boolean;
}

export interface BioPage {
  id: string;
  title: string;
  slug: string;
  status: "Live" | "Paused" | "Draft";
  views: number;
  createdAt: string;
  bio?: string;
  coverPhoto?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  capturedAt: string;
  maskedEmail: string;
  maskedPhone: string;
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  status: "Sent" | "Active" | "Draft";
  recipients: string;
  openRate: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: "Approved" | "Pending" | "Rejected";
}

export interface SmartLink {
  id: string;
  title: string;
  slug: string;
  shortUrl: string;
  status: "Live" | "Paused";
  clicks: number;
  retargeting: ("fb" | "google" | "tiktok" | "snapchat")[];
}

export interface QRCodeItem {
  id: string;
  name: string;
  status: "Active" | "Paused";
  scans: string;
  uniqueScanners: string;
  topLocation?: string;
  conversionRate?: string;
  qrUrl: string;
  targetUrl: string;
  customDesign: boolean;
}

export interface TemplateItem {
  id: string;
  name: string;
  category: "Marketing" | "Personal Bio" | "Business" | "Packaging Insert";
  widgets: number;
  usedCount: string;
  imageUrl: string;
  description: string;
}

export interface IntegrationItem {
  id: string;
  name: string;
  type: "Messaging" | "Email Marketing" | "Payments";
  status: "Locked" | "Connected" | "Coming Soon";
  description: string;
  upgradeMessage: string;
}

export interface IntegrationVote {
  id: string;
  name: string;
  votes: number;
  voted: boolean;
}

export interface TrackingPixel {
  id: string;
  name: string;
  type: string;
  pixelId: string;
  status: "Active" | "Validation Required" | "Inactive";
}

export interface MediaFile {
  id: string;
  name: string;
  type: "image" | "video" | "document" | "archive";
  size: string;
  url: string;
  uploadedAt?: string;
  dimensions?: string;
  duration?: string;
}

export interface CustomDomain {
  id: string;
  domainName: string;
  type: string;
  targetIp: string;
  status: "Verified" | "Pending";
}

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
}
