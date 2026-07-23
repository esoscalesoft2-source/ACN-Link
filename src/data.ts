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
  HelpArticle
} from "./types";
import { getSystemTemplateCatalog } from "./lib/systemTemplates";

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

export const initialTemplates: TemplateItem[] = getSystemTemplateCatalog();

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
      "Yes — connect yourbrand.com (root) or link.yourbrand.com (subdomain). Start with the beginner story guides in this category.",
    readTime: "2 mins",
    content:
      "Short answer: Yes.\n\nACN Link lets you open your bio page on an address you already own instead of the default ACN URL.\n\nYou have two main options:\n\n1) ROOT DOMAIN — yourbrand.com and www.yourbrand.com\n   → Read: \"Story guide: Connect a root domain (yourbrand.com)\"\n\n2) SUBDOMAIN — link.yourbrand.com or studio.yourbrand.com\n   → Read: \"Story guide: Connect a subdomain (link.yourbrand.com)\"\n\nNot ready to buy a domain?\n   → On Bio Pages, use \"Get free URL\" for something like yourname.acnlink.mindflo.today (no DNS setup).\n\nWhere to start in the app:\nSidebar → Custom Domains → Connect Domain (button on the top right).\n\nPick the story guide that matches what you typed in the wizard — root or subdomain — and follow it step by step."
  },
  {
    id: "faq-cd-start",
    title: "Start here: Custom domains for complete beginners",
    category: "Custom Domains",
    excerpt:
      "New to DNS? Read this first. Simple story examples for root domain, subdomain, and where to click in ACN Link.",
    readTime: "6 mins",
    content:
      "WHO IS THIS FOR?\nYou built a bio page in ACN Link. You want people to visit YOUR website name — not a long link. You have never touched DNS before. Perfect — read this like a short story.\n\n━━━━━━━━━━━━━━━━━━━━\nTHREE WAYS TO SHARE YOUR PAGE\n━━━━━━━━━━━━━━━━━━━━\n\nA) FREE ACN URL (easiest — no domain needed)\n   Example: priya-shop.acnlink.mindflo.today\n   Where: Bio Pages → Get free URL\n   Good when: you are testing or do not own a domain yet.\n\nB) ROOT DOMAIN (your main website name)\n   Example: priyafashion.com\n   Also opens: www.priyafashion.com\n   Good when: you bought priyafashion.com and want that exact name.\n\nC) SUBDOMAIN (a prefix before your domain)\n   Example: link.priyafashion.com or shop.priyafashion.com\n   Good when: your main site stays somewhere else, but one link should open your ACN bio page.\n\n━━━━━━━━━━━━━━━━━━━━\nWORDS YOU WILL SEE (SIMPLE MEANING)\n━━━━━━━━━━━━━━━━━━━━\n\n• Domain — the website name you type in the browser (priyafashion.com).\n• Root / apex domain — priyafashion.com with nothing in front.\n• Subdomain — the part before the domain (link. in link.priyafashion.com).\n• DNS provider — where you edit DNS records (GoDaddy, Namecheap, Cloudflare, Hostinger, Amazon Route 53, etc.). ACN detects this automatically and shows the name on your domain card.\n• A record — points a name to an IP address (used for root domains).\n• CNAME record — points a name to another hostname (used for subdomains).\n• Connect Domain — the wizard button in Custom Domains.\n• Test Connection — checks if DNS is correct after you save records.\n\n━━━━━━━━━━━━━━━━━━━━\nTHE FULL JOURNEY (ALL TYPES)\n━━━━━━━━━━━━━━━━━━━━\n\nStep 1 — Build and publish your bio page first.\nStep 2 — Sidebar → Custom Domains → Connect Domain.\nStep 3 — Type your address exactly:\n        • Root: priyafashion.com (no www, no https://)\n        • Subdomain: link.priyafashion.com (full address including the prefix)\nStep 4 — Choose which bio page should open when someone visits that address.\nStep 5 — ACN shows which DNS host we detected and the exact records to copy.\nStep 6 — Log in to THAT provider (not a random one) and add the records.\nStep 7 — Wait 2–15 minutes for DNS to update worldwide.\nStep 8 — Back in ACN → Test Connection (plug icon on the domain row).\nStep 9 — Status becomes Verified → open your domain in the browser and celebrate.\n\nStatus meanings:\n• Pending DNS — records missing or still propagating.\n• DNS Verified / Provisioning SSL — almost there; HTTPS finishing.\n• Verified — live. Share the link.\n• OFFLINE on the card — DNS still points elsewhere; fix records and Test again.\n\n━━━━━━━━━━━━━━━━━━━━\nWHICH GUIDE TO READ NEXT?\n━━━━━━━━━━━━━━━━━━━━\n\n→ Root domain story (priyafashion.com): open \"Story guide: Connect a root domain\"\n→ Subdomain story (link.priyafashion.com): open \"Story guide: Connect a subdomain\"\n→ Exact buttons in the app: open \"Step-by-step: Connect Domain wizard\"\n→ Stuck on Pending DNS?: open \"Troubleshooting: domain not verifying\""
  },
  {
    id: "faq-cd-root",
    title: "Story guide: Connect a root domain (yourbrand.com)",
    category: "Custom Domains",
    excerpt:
      "Follow Arun’s sneakershop.com example — from Connect Domain to A record @, Test Connection, and going live.",
    readTime: "7 mins",
    content:
      "STORY — ARUN AND SNEAKERSHOP.COM\n\nArun runs a sneaker store. He already owns sneakershop.com from GoDaddy. In ACN Link he created a bio page called \"Sneaker Shop\" with buttons, WhatsApp, and a product gallery.\n\nHe does NOT want to share:\n  https://acnlink.mindflo.today/p/something-long\n\nHe WANTS people to type:\n  sneakershop.com\n\nThat is a ROOT DOMAIN connection. Here is exactly what Arun did.\n\n━━━━━━━━━━━━━━━━━━━━\nSTEP 1 — OPEN THE RIGHT PAGE IN ACN\n━━━━━━━━━━━━━━━━━━━━\n\n1. Log in to ACN Link.\n2. Left sidebar → Custom Domains.\n3. Top right → Connect Domain (blue button).\n\nDo not look for this inside Publish — custom domains live only on the Custom Domains page.\n\n━━━━━━━━━━━━━━━━━━━━\nSTEP 2 — ENTER THE ROOT DOMAIN\n━━━━━━━━━━━━━━━━━━━━\n\nIn the wizard Arun typed:\n  sneakershop.com\n\nRules:\n• No https://\n• No www. (www is handled separately via DNS)\n• Just the bare domain: yourbrand.com\n\nHe selected bio page: Sneaker Shop → Continue.\n\n━━━━━━━━━━━━━━━━━━━━\nSTEP 3 — ACN FINDS WHERE DNS LIVES\n━━━━━━━━━━━━━━━━━━━━\n\nACN checked nameservers and showed:\n  \"DNS at GoDaddy\"\n\nImportant: ACN shows YOUR real provider. If you see Amazon Route 53, Namecheap, Hostinger, or Cloudflare — edit DNS there, not somewhere else.\n\nIf you bought the domain on Hostinger but moved nameservers to Cloudflare, you edit Cloudflare — trust the name ACN shows.\n\n━━━━━━━━━━━━━━━━━━━━\nSTEP 4 — ADD TWO A RECORDS (ROOT ONLY)\n━━━━━━━━━━━━━━━━━━━━\n\nACN showed something like:\n\n  Record 1\n  Type: A\n  Name / Host: @  (means root — some panels say \"@\" or leave blank)\n  Value / Points to: 69.46.46.90  (use the IP ACN shows on YOUR screen)\n\n  Record 2\n  Type: A\n  Name / Host: www\n  Value / Points to: same IP as above\n\nArun logged into GoDaddy → DNS → Add both records → Save.\n\nCloudflare users: turn Proxied (orange cloud) ON for both records.\n\nRemove OLD A records that point to a previous website host (old Hostinger IP, old Wix IP, etc.). Duplicate @ records cause \"still opens another site\" errors.\n\n━━━━━━━━━━━━━━━━━━━━\nSTEP 5 — WAIT, THEN TEST\n━━━━━━━━━━━━━━━━━━━━\n\nDNS is not instant. Arun waited 5 minutes, then in ACN Link:\n\nCustom Domains → sneakershop.com row → Test Connection (plug icon).\n\nFirst try: Pending DNS (normal if records just saved).\nSecond try after 10 minutes: DNS Verified → then Verified.\n\nHe could also expand \"Show DNS\" on the card to copy values again.\n\n━━━━━━━━━━━━━━━━━━━━\nSTEP 6 — OPEN THE LIVE SITE\n━━━━━━━━━━━━━━━━━━━━\n\nWhen status = Verified, Arun clicked his domain name on the card.\n\nBoth work:\n  https://sneakershop.com\n  https://www.sneakershop.com\n\nHis ACN bio page opens with HTTPS.\n\n━━━━━━━━━━━━━━━━━━━━\nROOT DOMAIN CHECKLIST (COPY THIS)\n━━━━━━━━━━━━━━━━━━━━\n\n☐ Bio page built and published\n☐ Custom Domains → Connect Domain\n☐ Entered yourbrand.com (root only)\n☐ Picked the correct bio page\n☐ Added A record @ → ACN IP\n☐ Added A record www → same IP\n☐ Removed old conflicting A records\n☐ Waited a few minutes\n☐ Test Connection until Verified\n☐ Opened domain in browser\n\nNote: You only change DNS at your domain provider. If HTTPS is still pending, wait a few minutes and click Test Connection again. See Troubleshooting article if needed."
  },
  {
    id: "faq-cd-subdomain",
    title: "Story guide: Connect a subdomain (link.yourbrand.com)",
    category: "Custom Domains",
    excerpt:
      "Follow Vicky’s link.vickysfitness.com example — one CNAME record, Test Connection, and your bio page on a prefix URL.",
    readTime: "6 mins",
    content:
      "STORY — VICKY AND LINK.VICKYSFITNESS.COM\n\nVicky runs a fitness studio. Her company already uses vickysfitness.com for their main marketing website (hosted elsewhere). She does NOT want to move the whole domain.\n\nShe only wants ONE special address for her ACN bio page:\n  link.vickysfitness.com\n\nThat is a SUBDOMAIN. The prefix is link. and the parent domain is vickysfitness.com.\n\n━━━━━━━━━━━━━━━━━━━━\nROOT VS SUBDOMAIN — QUICK COMPARE\n━━━━━━━━━━━━━━━━━━━━\n\nROOT (yourbrand.com)\n  Records needed: 2 × A records (@ and www)\n  Wizard input: yourbrand.com\n\nSUBDOMAIN (link.yourbrand.com)\n  Records needed: 1 × CNAME\n  Wizard input: link.yourbrand.com  ← type the FULL address including link.\n\n━━━━━━━━━━━━━━━━━━━━\nSTEP 1 — CONNECT IN ACN\n━━━━━━━━━━━━━━━━━━━━\n\n1. Sidebar → Custom Domains → Connect Domain.\n2. Vicky typed exactly:\n     link.vickysfitness.com\n   NOT just vickysfitness.com\n3. Selected bio page: Vicky TRX Studio → Continue.\n\n━━━━━━━━━━━━━━━━━━━━\nSTEP 2 — CHECK DNS HOST\n━━━━━━━━━━━━━━━━━━━━\n\nACN showed where vickysfitness.com DNS is managed — for example Cloudflare or Namecheap.\n\nYou must be able to edit DNS for the PARENT zone (vickysfitness.com). If your IT team owns DNS, send them the CNAME ACN shows.\n\n━━━━━━━━━━━━━━━━━━━━\nSTEP 3 — ADD ONE CNAME RECORD\n━━━━━━━━━━━━━━━━━━━━\n\nACN showed something like:\n\n  Type: CNAME\n  Name / Host: link\n    (some panels want only \"link\", not the full link.vickysfitness.com)\n  Target / Value: acnlink.mindflo.today\n    (use the exact target ACN shows on YOUR screen)\n\nCloudflare: Proxied (orange cloud) is OK.\n\nDo NOT add A records for a subdomain connection — use CNAME unless ACN explicitly says otherwise.\n\n━━━━━━━━━━━━━━━━━━━━\nSTEP 4 — TEST AND GO LIVE\n━━━━━━━━━━━━━━━━━━━━\n\nWait a few minutes → Test Connection on the domain row.\n\nWhen Verified, open:\n  https://link.vickysfitness.com\n\nVicky’s bio page loads. Her main site at vickysfitness.com stays unchanged.\n\n━━━━━━━━━━━━━━━━━━━━\nMORE SUBDOMAIN EXAMPLES\n━━━━━━━━━━━━━━━━━━━━\n\nWhat you type in wizard → CNAME host label\n\n  shop.priyafashion.com     →  shop\n  bio.myagency.com          →  bio\n  links.ezysellonline.com   →  links\n  studio.wheree.com         →  studio\n\nRule: everything BEFORE the main domain is the host name in DNS.\n\n━━━━━━━━━━━━━━━━━━━━\nSUBDOMAIN CHECKLIST\n━━━━━━━━━━━━━━━━━━━━\n\n☐ Typed FULL subdomain in wizard (e.g. link.yourbrand.com)\n☐ Selected correct bio page\n☐ Added CNAME with host = prefix only (link, shop, bio…)\n☐ Target = ACN hostname shown in app\n☐ Test Connection → Verified\n☐ Opened https://your-subdomain in browser"
  },
  {
    id: "faq-cd-wizard",
    title: "Step-by-step: Connect Domain wizard in ACN Link",
    category: "Custom Domains",
    excerpt:
      "Every screen in the Connect Domain wizard — what to click, what to type, and what happens after Done.",
    readTime: "5 mins",
    content:
      "This guide matches the Connect Domain wizard screen by screen.\n\n━━━━━━━━━━━━━━━━━━━━\nBEFORE YOU START\n━━━━━━━━━━━━━━━━━━━━\n\n• Have at least one bio page ready.\n• Know your domain name (root or full subdomain).\n• Know the login for your DNS provider (GoDaddy, Cloudflare, etc.).\n\n━━━━━━━━━━━━━━━━━━━━\nSCREEN 1 — ENTER DOMAIN\n━━━━━━━━━━━━━━━━━━━━\n\nWhere: Custom Domains → Connect Domain\n\n1. Type your domain:\n   Root example: priyafashion.com\n   Subdomain example: link.priyafashion.com\n2. Pick which bio page opens on that address.\n3. Click Continue.\n\nIf the page dropdown says \"(in use)\", that page already has another domain — pick a different page or remove the old domain first.\n\n━━━━━━━━━━━━━━━━━━━━\nSCREEN 2 — ANALYZING\n━━━━━━━━━━━━━━━━━━━━\n\nACN checks nameservers and detects your DNS provider. Wait a few seconds.\n\n━━━━━━━━━━━━━━━━━━━━\nSCREEN 3 — YOUR DNS PROVIDER\n━━━━━━━━━━━━━━━━━━━━\n\nYou see the provider logo and name (e.g. Cloudflare, GoDaddy, Amazon Route 53).\n\nOptional: \"Open [Provider] DNS help\" opens their official docs in a new tab.\n\nClick Continue.\n\n━━━━━━━━━━━━━━━━━━━━\nSCREEN 4 — DNS RECORDS\n━━━━━━━━━━━━━━━━━━━━\n\nACN lists exact records to copy:\n\nRoot domain → two A records (@ and www) pointing to the platform IP.\nSubdomain → one CNAME pointing to the ACN hostname.\n\nUse Copy buttons next to each value.\n\nIf Cloudflare for SaaS is enabled, you may also see a TXT ownership record — add it if shown.\n\nClick \"I added these records\" or verify when ready.\n\n━━━━━━━━━━━━━━━━━━━━\nSCREEN 5 — SUCCESS / PENDING\n━━━━━━━━━━━━━━━━━━━━\n\n• Verified or DNS Verified → you are live or almost live.\n• Still Pending DNS → records not detected yet. Wait and use Test Connection from the domain list.\n\nYou can close the wizard — the domain stays on your Custom Domains list.\n\n━━━━━━━━━━━━━━━━━━━━\nAFTER THE WIZARD — DOMAIN CARD ACTIONS\n━━━━━━━━━━━━━━━━━━━━\n\nOn each domain row:\n\n• Domain name — click to open when live.\n• Opens: dropdown — change which bio page loads without reconnecting DNS.\n• Show DNS — see records again.\n• Test Connection (plug) — re-check DNS anytime.\n• Refresh — sync SSL/status.\n• Trash — remove domain from ACN (does not delete your domain from the registrar).\n\nBadge \"DNS at [Provider]\" — where you must edit records.\n\n━━━━━━━━━━━━━━━━━━━━\nRECOMMENDED ORDER WITH PUBLISH\n━━━━━━━━━━━━━━━━━━━━\n\n1. Build bio page\n2. Connect custom domain (this wizard)\n3. Publish (set visibility)\n4. Share your brand URL"
  },
  {
    id: "faq-cd-trouble",
    title: "Troubleshooting: domain stuck on Pending DNS or OFFLINE",
    category: "Custom Domains",
    excerpt:
      "Test Connection fails? Wrong website opens? Read common fixes — wrong provider, old A records, root vs subdomain mix-ups.",
    readTime: "5 mins",
    content:
      "STORY — \"I CLICKED TEST 10 TIMES BUT STILL PENDING\"\n\nMeera connected ditto.com. The card said OFFLINE and Pending DNS. She was editing Cloudflare — but her domain actually used Amazon Route 53. No wonder nothing changed.\n\nLesson: always edit DNS where the card says \"DNS at [Provider]\".\n\n━━━━━━━━━━━━━━━━━━━━\nPROBLEM 1 — WRONG DNS WEBSITE\n━━━━━━━━━━━━━━━━━━━━\n\nSymptom: You add records but Test never passes.\n\nFix:\n1. Read the badge on your domain row: \"DNS at GoDaddy\" (example).\n2. Log in to THAT site only.\n3. Add records exactly as Show DNS lists them.\n\n━━━━━━━━━━━━━━━━━━━━\nPROBLEM 2 — ROOT VS SUBDOMAIN MIX-UP\n━━━━━━━━━━━━━━━━━━━━\n\nSymptom: Added A records but you wanted link.yourbrand.com.\n\nFix: Subdomains need CNAME, not @/www A records. Remove wrong records. Re-run wizard with full subdomain typed.\n\nSymptom: Added CNAME but you wanted yourbrand.com.\n\nFix: Root needs A record @ only. Connect www.yourbrand.com separately as a subdomain (CNAME) if needed.\n\n━━━━━━━━━━━━━━━━━━━━\nPROBLEM 3 — OLD RECORDS STILL POINTING ELSEWHERE\n━━━━━━━━━━━━━━━━━━━━\n\nSymptom: Message says site \"still opens another website\".\n\nFix:\n• Delete extra @ A records (only one correct IP should remain).\n• Remove parking page or old host IPs.\n• For www, point to the same ACN IP (or CNAME if your provider requires).\n\n━━━━━━━━━━━━━━━━━━━━\nPROBLEM 4 — DNS NOT PROPAGATED YET\n━━━━━━━━━━━━━━━━━━━━\n\nSymptom: Records look correct in provider but ACN says Pending.\n\nFix: Wait 5–30 minutes. TTL and registrar speed vary. Test again — do not change records every minute.\n\n━━━━━━━━━━━━━━━━━━━━\nPROBLEM 5 — HTTPS / SSL STUCK AFTER DNS OK\n━━━━━━━━━━━━━━━━━━━━\n\nSymptom: DNS Verified but not Verified yet.\n\nFix: Wait a few minutes. Click Refresh / Test Connection on the domain row. No hosting panel setup is required — only DNS at your domain provider.\n\n━━━━━━━━━━━━━━━━━━━━\nPROBLEM 6 — CANNOT DELETE A DOMAIN\n━━━━━━━━━━━━━━━━━━━━\n\nFix: Click trash on the domain row. If error persists, refresh the page and try again, or contact support with the domain name.\n\n━━━━━━━━━━━━━━━━━━━━\nSTILL STUCK?\n━━━━━━━━━━━━━━━━━━━━\n\nContact Support with:\n• Domain name\n• Root or subdomain\n• Screenshot of DNS records from your provider\n• Screenshot of ACN Custom Domains card\n\nWe will help you finish the connection."
  },
  {
    id: "faq5b",
    title: "What is the difference between Publish and Custom Domains?",
    category: "Getting Started",
    excerpt:
      "Publish goes live and sets who can see your site. Custom Domains connects and manages your brand domain.",
    readTime: "2 mins",
    content:
      "Publish vs Custom Domains\n\nPublish (navbar on Dashboard / Account)\n• Makes your ACN Link website live\n• Shows your public URL\n• Lets you choose visibility: Public, Workspace only, or Selected members\n• Lets you copy or open the live link after success\n\nCustom Domains (sidebar)\n• Connect root domain (yourbrand.com) or subdomain (link.yourbrand.com)\n• View DNS instructions and detected DNS provider\n• Verify Pending / Verified status\n• Remove domains\n\nRecommended flow\n1. Build your bio pages\n2. Help Center → Custom Domains category → read \"Start here: Custom domains for complete beginners\"\n3. Open Custom Domains → Connect Domain → follow the story guide for root or subdomain\n4. Click Publish to go live and share the URL\n\nTip: Domain connect/manage is only on Custom Domains. Publish is only for go-live and visibility. For a free URL without buying a domain, use Get free URL on Bio Pages."
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
    title: "What DNS records do I need?",
    category: "Custom Domains",
    excerpt:
      "Root: A @ → platform IP. Subdomain: CNAME → platform hostname. Copy from Show DNS.",
    readTime: "2 mins",
    content:
      "ACN Link supports root domains and subdomains.\n\nROOT (yourbrand.com)\n  Type: A\n  Name: @\n  Value: platform IP (example: 69.46.46.90)\n\nSUBDOMAIN (king.yourbrand.com, www.yourbrand.com, app.yourbrand.com)\n  Type: CNAME\n  Name: king (prefix only — not the full domain)\n  Value: acnlink.mindflo.today (or value from Show DNS)\n\nRules:\n• Root → A record only\n• Subdomain → CNAME only (never A)\n\nAlways copy live values from Custom Domains → Show DNS.\n\nAfter saving → Test Connection → Verified."
  }
];
