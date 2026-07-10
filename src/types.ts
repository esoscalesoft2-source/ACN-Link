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

/** Bio Page Editor block — supports extra widget fields via index signature */
export interface BioEditorBlock {
  id: string;
  type: string;
  label: string;
  value: string;
  [key: string]: unknown;
}

/** Full restorable editor state for drafts and templates */
export interface BioEditorState {
  pageMeta: {
    title: string;
    slug?: string;
    shortBio: string;
    coverImage: string;
  };
  blocks: BioEditorBlock[];
}

export interface BioPageDraft {
  id: string;
  pageId: string;
  pageSlug?: string;
  data: BioEditorState;
  createdAt: string;
  updatedAt: string;
}

export interface BioPageTemplate {
  id: string;
  name: string;
  sourcePageId?: string;
  previewImage?: string;
  description?: string;
  data: BioEditorState;
  createdAt: string;
  updatedAt: string;
  isBuiltIn?: boolean;
}

export type PublishVisibility = "public" | "workspace" | "selected_members";

export type CustomDomainStatus = "verified" | "pending_dns";

export interface PublishedDomain {
  id: string;
  hostname: string;
  status: CustomDomainStatus;
  dnsTarget?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishSettings {
  primaryUrl: string;
  customDomains: PublishedDomain[];
  visibility: PublishVisibility;
  selectedMemberIds: string[];
  publishedAt?: string;
  updatedAt: string;
}

export type NotificationType =
  | "page_published"
  | "draft_saved"
  | "template_saved"
  | "template_used"
  | "page_duplicated"
  | "contact_added"
  | "analytics_event"
  | "qr_generated"
  | "pixel_added"
  | "general";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  targetScreen?: ScreenId;
  meta?: Record<string, string>;
}
