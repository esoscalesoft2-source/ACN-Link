import {
  UserProfile,
  BioPage,
  Contact,
  WhatsAppCampaign,
  WhatsAppTemplate,
  SmartLink,
  QRCodeItem,
  TemplateItem,
  IntegrationItem,
  IntegrationVote,
  TrackingPixel,
  MediaFile,
  CustomDomain,
  HelpArticle
} from "./types";

export const initialUser: UserProfile = {
  name: "Eso Tech",
  email: "esoscalesoft@gmail.com",
  avatarUrl: "E",
  plan: "Free Plan",
  isVerified: true
};

export const initialBioPages: BioPage[] = [
  {
    id: "1",
    title: "Marvel Products",
    slug: "acn.link/page-r3ee6iw",
    status: "Live",
    views: 0,
    createdAt: "4 Jul 2026"
  }
];

export const initialContacts: Contact[] = [];

export const initialWhatsAppCampaigns: WhatsAppCampaign[] = [
  {
    id: "w1",
    name: "Summer Sale Update",
    status: "Sent",
    recipients: "0",
    openRate: "0%"
  },
  {
    id: "w2",
    name: "Welcome Sequence",
    status: "Active",
    recipients: "0/day",
    openRate: "0%"
  }
];

export const initialWhatsAppTemplates: WhatsAppTemplate[] = [
  { id: "wt1", name: "Welcome Message", status: "Approved" },
  { id: "wt2", name: "Order Confirmation", status: "Approved" }
];

export const initialSmartLinks: SmartLink[] = [
  {
    id: "l1",
    title: "Summer Campaign 2024",
    slug: "/summer-promo",
    shortUrl: "acn.link/sum24",
    status: "Live",
    clicks: 0,
    retargeting: ["fb", "google", "tiktok"]
  },
  {
    id: "l2",
    title: "New Product Launch",
    slug: "/launch-v2",
    shortUrl: "acn.link/v2-live",
    status: "Paused",
    clicks: 0,
    retargeting: ["fb", "google", "tiktok"]
  }
];

export const initialQRCodes: QRCodeItem[] = [
  {
    id: "qr1",
    name: "Summer Campaign 2024",
    status: "Active",
    scans: "0",
    uniqueScanners: "0",
    topLocation: "N/A",
    conversionRate: "0%",
    qrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=acn.li/summer-special-24&color=7c3aed",
    targetUrl: "acn.li/summer-special-24",
    customDesign: true
  },
  {
    id: "qr2",
    name: "Global Conference Link",
    status: "Active",
    scans: "0",
    uniqueScanners: "0",
    topLocation: "N/A",
    conversionRate: "0%",
    qrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=acn.li/global-conf-reg&color=0f172a",
    targetUrl: "acn.li/global-conf-reg",
    customDesign: false
  },
  {
    id: "qr3",
    name: "Feedback Portal",
    status: "Paused",
    scans: "0",
    uniqueScanners: "0",
    topLocation: "N/A",
    conversionRate: "0%",
    qrUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=acn.li/customer-feedback&color=64748b",
    targetUrl: "acn.li/customer-feedback",
    customDesign: false
  }
];

export const initialTemplates: TemplateItem[] = [
  {
    id: "t1",
    name: "Flash Sale Funnel",
    category: "Marketing",
    widgets: 16,
    usedCount: "68x",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=400",
    description: "High-energy flash-sale funnel: a perfect design for limited-time retail pushes."
  },
  {
    id: "t2",
    name: "Ebook Download",
    category: "Packaging Insert",
    widgets: 10,
    usedCount: "22x",
    imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400",
    description: "Free ebook or PDF download page designed for capturing newsletter subscribers on inserts."
  },
  {
    id: "t3",
    name: "Personal Bio Link",
    category: "Personal Bio",
    widgets: 8,
    usedCount: "145x",
    imageUrl: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=400",
    description: "The ultimate link-in-bio for creators and professionals to share social channels and work."
  }
];

export const initialIntegrations: IntegrationItem[] = [
  {
    id: "i1",
    name: "WOO Chat",
    type: "Messaging",
    status: "Connected",
    description: "Send form confirmations & broadcasts through your own WOO Chat account. Bring your team, setup auto-replies, and run customer conversations.",
    upgradeMessage: ""
  },
  {
    id: "i2",
    name: "Interakt WhatsApp",
    type: "Messaging",
    status: "Locked",
    description: "Send form confirmations & broadcasts through your own Interakt account — one Secret Key covers sending and template sync.",
    upgradeMessage: "WhatsApp messaging is part of the Pro Smart Marketing plan."
  },
  {
    id: "i3",
    name: "Flodesk",
    type: "Email Marketing",
    status: "Locked",
    description: "Add Smart Form leads straight to your Flodesk email segments.",
    upgradeMessage: "Connecting an email-marketing account is part of a paid Smart Marketing plan."
  },
  {
    id: "i4",
    name: "Payments",
    type: "Payments",
    status: "Coming Soon",
    description: "Take payments on your bio pages via your own Razorpay or Stripe account.",
    upgradeMessage: ""
  }
];

export const initialVotes: IntegrationVote[] = [
  { id: "v1", name: "GetResponse", votes: 3, voted: true },
  { id: "v2", name: "Mailchimp", votes: 1, voted: false },
  { id: "v3", name: "ConvertKit", votes: 1, voted: false },
  { id: "v4", name: "MailerLite", votes: 1, voted: false },
  { id: "v5", name: "ActiveCampaign", votes: 3, voted: false }
];

export const initialTrackingPixels: TrackingPixel[] = [
  {
    id: "p1",
    name: "Main Facebook Pixel",
    type: "Facebook Pixel",
    pixelId: "882739401928374",
    status: "Active"
  },
  {
    id: "p2",
    name: "Google Ads G-Tag",
    type: "Google Analytics Tag",
    pixelId: "AW-10928374561",
    status: "Active"
  },
  {
    id: "p3",
    name: "TikTok Pixel",
    type: "TikTok Pixel",
    pixelId: "T-1827463529",
    status: "Validation Required"
  }
];

export const initialMediaFiles: MediaFile[] = [
  {
    id: "m1",
    name: "campaign_header_v2.jpg",
    type: "image",
    size: "1.2 MB",
    url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400",
    dimensions: "1200 × 630",
    uploadedAt: "4 Jul 2026"
  },
  {
    id: "m2",
    name: "product_demo_reel.mp4",
    type: "video",
    size: "24.5 MB",
    url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=400",
    dimensions: "1920 × 1080",
    uploadedAt: "4 Jul 2026"
  },
  {
    id: "m3",
    name: "lifestyle_workspace.png",
    type: "image",
    size: "4.8 MB",
    url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=400",
    dimensions: "2500 × 1667",
    uploadedAt: "4 Jul 2026"
  }
];

export const initialCustomDomains: CustomDomain[] = [
  {
    id: "d1",
    domainName: "links.mybrand.com",
    type: "A Record",
    targetIp: "74.201.218.45",
    status: "Verified"
  },
  {
    id: "d2",
    domainName: "go.travelhub.io",
    type: "A Record",
    targetIp: "74.201.218.45",
    status: "Pending"
  }
];

export const initialHelpArticles: HelpArticle[] = [
  {
    id: "faq1",
    title: "How do I get started with ACN Link?",
    category: "Getting Started",
    excerpt: "Simply sign up for a free account, go to Bio Pages or Links, and create your first smart resource. You can customize the theme, add multiple widgets, and configure tracking pixels or custom domains instantly.",
    readTime: "2 mins"
  },
  {
    id: "faq2",
    title: "What's the difference between the Free and Pro plans?",
    category: "Billing",
    excerpt: "The Free plan includes 1 Bio page, 13 core widgets, and up to 100MB of media storage. The Pro plan unlocks unlimited Bio Pages, high-speed custom shortened links, professional templates, full tracking integrations (AiSensy, Flodesk), custom domains, and comprehensive retargeting tracking pixels.",
    readTime: "3 mins"
  },
  {
    id: "faq3",
    title: "Can I cancel or get a refund?",
    category: "Billing",
    excerpt: "Yes, you can cancel your subscription at any time from your billing settings. We offer a 14-day money-back guarantee for all annual subscriptions if you are not fully satisfied.",
    readTime: "1 min"
  },
  {
    id: "faq4",
    title: "How do I connect my Amazon Advertising account?",
    category: "APIs & Webhooks",
    excerpt: "You can navigate to the Help Center or contact support to guide you through the integration under 'Amazon Ads Setup' inside the help center, allowing you to synchronize TACoS and advertising performance metrics.",
    readTime: "4 mins"
  },
  {
    id: "faq5",
    title: "Can I use my own custom domain?",
    category: "Custom Domains",
    excerpt: "Yes, under 'Custom Domains' in the sidebar, you can link domains like links.yourbrand.com. Simply point your DNS A Record to 74.201.218.45 and wait for propagation.",
    readTime: "3 mins"
  }
];
