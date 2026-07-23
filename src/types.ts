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
  mfaEnabled?: boolean;
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
  handle?: string;
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
  marketingOptIn?: boolean;
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  status: "Sent" | "Active" | "Draft";
  recipients: string;
  openRate: string;
  templateId?: string;
  createdAt?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: "Approved" | "Pending" | "Rejected";
  body?: string;
  createdAt?: string;
}

export interface SmartLink {
  id: string;
  title: string;
  slug: string;
  shortUrl: string;
  destinationUrl?: string;
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
  designColor?: string;
  designLogo?: "none" | "user" | "link" | "whatsapp" | "star";
  designPattern?: "rounded" | "square" | "compact";
}

export interface TemplateItem {
  id: string;
  name: string;
  category: string;
  widgets: number;
  usedCount: string;
  imageUrl: string;
  description: string;
  price?: string;
  suggested?: boolean;
}

export interface IntegrationItem {
  id: string;
  name: string;
  type: "Messaging" | "Email Marketing" | "Payments";
  status: "Locked" | "Connected" | "Coming Soon";
  description: string;
  upgradeMessage: string;
  waitlisted?: boolean;
  apiKeyHint?: string;
  connectedAt?: string;
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
  pageId: string;
  domainName: string;
  type: "A" | "CNAME";
  dnsTarget: string;
  dnsHostLabel?: string;
  status: "Pending DNS" | "DNS Verified" | "Provisioning SSL" | "Verified" | "Error";
  dnsVerifiedAt: string | null;
  provider: "cloudflare" | "manual";
  providerStatus: string;
  sslStatus: string;
  ownershipVerification: Record<string, unknown> | null;
  lastCheckedAt: string | null;
  errorMessage: string | null;
  setupHint?: string | null;
  dnsProviderName?: string | null;
  dnsProviderId?: string | null;
  providerConnected?: boolean;
  providerAccountId?: string | null;
  dnsLastVerified?: string | null;
  selfServeEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DnsProviderId =
  | "cloudflare"
  | "godaddy"
  | "hostinger"
  | "namecheap"
  | "porkbun"
  | "squarespace"
  | "other";

export interface DnsProviderCapability {
  id: DnsProviderId;
  name: string;
  supportsAutoDns: boolean;
  supportsOAuth: boolean;
  logoUrl: string;
  helpUrl: string;
  blurb: string;
}

export interface CustomDomainDnsRecordTemplate {
  id: string;
  type: "A" | "CNAME" | "TXT";
  hostLabel: string;
  hostDisplay: string;
  value: string;
}

export interface CustomDomainPlatformConfig {
  provider: "cloudflare" | "manual";
  platformUrl: string;
  aRecordTarget: string;
  cnameTarget?: string;
  selfServeEnabled: boolean;
  sslAutomatic: boolean;
  cloudflareEnvConfigured?: boolean;
  registerCloudflareCustomHostnames?: boolean;
  customHostnameEnabled?: boolean;
  autoDnsViaCloudflare?: boolean;
  cloudflareOAuthEnabled?: boolean;
  dnsProviders?: DnsProviderCapability[];
  steps: string[];
  registrars: { id: string; name: string; dnsHelpUrl: string }[];
}

/** Free tier address: {slug}.acnlink.mindflo.today */
export interface PlatformSubdomain {
  id: string;
  slug: string;
  pageId: string;
  hostname: string;
  publicUrl: string;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
  content?: string;
}

/** Bio Page Editor block — supports extra widget fields via index signature */
export interface BioEditorBlock {
  id: string;
  type: string;
  label: string;
  value: string;
  [key: string]: unknown;
}

/** Published / preview page appearance preset */
export type BioPagePreviewTheme =
  | "dark"
  | "light"
  | "midnight"
  | "ocean"
  | "rose"
  | "forest"
  | "sunset"
  | "lavender"
  | "slate"
  | "gold"
  | "coral"
  | "arctic";

export type CoverFitMode = "cover" | "contain" | "fill";
export type CoverFocusPoint = "center" | "top" | "bottom" | "left" | "right";
export type CoverBandHeight = "sm" | "md" | "lg";

export interface BioCoverPhotoSettings {
  fit: CoverFitMode;
  zoom: number;
  focus: CoverFocusPoint;
  height: CoverBandHeight;
  /** Optional px override for band height (overrides sm/md/lg preset). */
  customHeight?: number;
  /** Cover band width relative to page (60–100%). */
  widthPercent: number;
  /** Image width inside the band (50–150%). */
  imageWidthPercent: number;
  /** Image height inside the band (50–150%). */
  imageHeightPercent: number;
  /** Inner inset between band edge and image (0–40px). */
  padding: number;
  /** Horizontal outer spacing on the cover band (0–32px). */
  marginX: number;
  /** Vertical outer spacing on the cover band (0–24px). */
  marginY: number;
}

export interface BioPagePreviewDetails {
  title: string;
  bio: string;
  coverPhoto: string;
  handle?: string;
  pageTheme?: BioPagePreviewTheme;
  coverSettings?: BioCoverPhotoSettings;
}

/** Full restorable editor state for drafts and templates */
export interface BioEditorState {
  pageMeta: {
    title: string;
    slug?: string;
    shortBio: string;
    coverImage: string;
    handle?: string;
    pageTheme?: BioPagePreviewTheme;
    coverSettings?: BioCoverPhotoSettings;
  };
  blocks: BioEditorBlock[];
}

export interface BioPageDraft {
  id: string;
  pageId: string;
  pageSlug?: string;
  ownerUserId?: string;
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
