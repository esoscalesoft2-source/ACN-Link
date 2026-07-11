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
    destinationUrl: "https://example.com/summer-promo",
    status: "Live",
    clicks: 0,
    retargeting: ["fb", "google", "tiktok"]
  },
  {
    id: "l2",
    title: "New Product Launch",
    slug: "/launch-v2",
    shortUrl: "acn.link/v2-live",
    destinationUrl: "https://example.com/launch-v2",
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
    excerpt:
      "Simply sign up for a free account, go to Bio Pages or Links, and create your first smart resource. You can customize the theme, add multiple widgets, and configure tracking pixels or custom domains instantly.",
    readTime: "2 mins",
    content:
      "Welcome to ACN Link.\n\n1. Create your account and open the Dashboard.\n2. Go to Bio Pages and create your first page from scratch or a template.\n3. Add widgets (buttons, forms, WhatsApp, shop blocks) in the editor.\n4. Publish when ready, then share your public URL or QR code.\n5. Optionally connect Custom Domains, Pixels, and Integrations for branding and tracking.\n\nTip: Use Templates to launch faster, then save your own layouts under My Templates."
  },
  {
    id: "faq2",
    title: "What's the difference between the Free and Pro plans?",
    category: "Billing",
    excerpt:
      "The Free plan includes 1 Bio page, 13 core widgets, and up to 100MB of media storage. The Pro plan unlocks unlimited Bio Pages, high-speed custom shortened links, professional templates, full tracking integrations, custom domains, and retargeting pixels.",
    readTime: "3 mins",
    content:
      "Free Plan\n• 1 bio page\n• Core widgets\n• Basic analytics\n• Limited media storage\n\nPro / Smart Marketing\n• Unlimited bio pages\n• Smart links & QR codes\n• Custom domains\n• Tracking pixels\n• Messaging & email integrations\n• Priority support\n\nYou can review your current plan under Account Settings. Contact Support if you need help upgrading or comparing features for your team."
  },
  {
    id: "faq3",
    title: "Can I cancel or get a refund?",
    category: "Billing",
    excerpt:
      "Yes, you can cancel your subscription at any time from your billing settings. We offer a 14-day money-back guarantee for all annual subscriptions if you are not fully satisfied.",
    readTime: "1 min",
    content:
      "Cancellation\nYou can cancel anytime from Account Settings. Access continues through the end of your current billing period.\n\nRefunds\nAnnual plans include a 14-day money-back guarantee. Monthly plans are generally non-refundable after the billing date, except where required by law.\n\nNeed help? Open Contact Support with your workspace email and we will assist with cancellation or refund requests."
  },
  {
    id: "faq4",
    title: "How do I connect my Amazon Advertising account?",
    category: "APIs & Webhooks",
    excerpt:
      "Contact support or follow the Amazon Ads setup guide to synchronize advertising performance metrics with your workspace.",
    readTime: "4 mins",
    content:
      "Amazon Ads setup overview\n\n1. Open Integrations and confirm your workspace plan supports advertising connectors.\n2. Request Amazon Ads access from Contact Support if the connector is not yet unlocked.\n3. Provide your Amazon Advertising account ID and authorized email.\n4. Once connected, metrics sync on a scheduled interval.\n\nWebhooks\nFor custom automation, ask Support for webhook endpoints that can receive form leads and page events from ACN Link."
  },
  {
    id: "faq5",
    title: "Can I use my own custom domain?",
    category: "Custom Domains",
    excerpt:
      "Yes, under Custom Domains in the sidebar, you can link domains like links.yourbrand.com. Point your DNS A Record to 74.201.218.45 and wait for propagation.",
    readTime: "3 mins",
    content:
      "Connect a custom domain\n\n1. Open Custom Domains and click Connect Domain.\n2. Enter a hostname such as links.yourbrand.com.\n3. In your DNS provider, create an A record pointing to 74.201.218.45.\n4. Return to ACN Link and click Verify DNS.\n5. After verification, use the domain for white-labeled bio pages and links.\n\nDNS changes can take a few minutes to 48 hours to propagate."
  },
  {
    id: "faq5b",
    title: "What is the difference between Publish and Custom Domains?",
    category: "Getting Started",
    excerpt:
      "Publish goes live and sets who can see your site. Custom Domains connects and manages your brand domain.",
    readTime: "2 mins",
    content:
      "Publish vs Custom Domains\n\nPublish (navbar on Dashboard / Account)\n• Makes your ACN Link website live\n• Shows your public URL\n• Lets you choose visibility: Public, Workspace only, or Selected members\n• Lets you copy or open the live link after success\n\nCustom Domains (sidebar)\n• Connect your own domain such as links.yourbrand.com\n• View DNS setup instructions\n• Verify Pending / Verified status\n• Search, filter, and remove domains\n\nRecommended flow\n1. Build your bio pages\n2. Open Custom Domains and connect your brand domain\n3. Click Publish to go live and share the URL\n\nTip: Domain connect/manage is only on Custom Domains. Publish is only for go-live and visibility."
  },
  {
    id: "faq6",
    title: "How do I publish my first bio page?",
    category: "Getting Started",
    excerpt:
      "Open Bio Pages, create or edit a page, then use Publish on the Dashboard to make your site live and set visibility.",
    readTime: "2 mins",
    content:
      "Publishing checklist\n\n1. Finish your page content and cover image in the editor.\n2. Save a draft anytime — drafts stay private.\n3. On Dashboard or Account, click Publish and choose visibility (public, workspace, or selected members).\n4. To use your own brand domain, open Custom Domains in the sidebar (not inside Publish).\n5. Copy the public URL or generate a QR code from the QR Codes page.\n6. Share the link on social profiles, packaging, or campaigns.\n\nIf something looks wrong on the public page, reopen the editor, fix blocks, and publish again."
  },
  {
    id: "faq7",
    title: "How is my workspace data protected?",
    category: "Security & Privacy",
    excerpt:
      "Account data is stored in your browser workspace backup and server sync where available. Enable MFA from Account Settings for stronger sign-in protection.",
    readTime: "2 mins",
    content:
      "Security basics\n\n• Keep your account email up to date under Account Settings.\n• Enable MFA for two-factor protection.\n• Export regular JSON backups before major imports or device changes.\n• Only share public bio URLs — drafts remain private until published.\n\nPrivacy\nLeads captured by forms stay in your Contacts list. Do not share backup files that contain customer data outside your organization."
  },
  {
    id: "faq8",
    title: "What DNS record do I need for custom domains?",
    category: "Custom Domains",
    excerpt:
      "Create an A record for your subdomain pointing to 74.201.218.45, then verify DNS from the Custom Domains page.",
    readTime: "2 mins",
    content:
      "DNS record details\n\nType: A\nHost: your subdomain (for example links)\nValue / Points to: 74.201.218.45\nTTL: Auto or 300 seconds\n\nAfter saving the record, open Custom Domains in ACN Link and use Verify DNS. If verification fails, wait for propagation and try again."
  }
];
