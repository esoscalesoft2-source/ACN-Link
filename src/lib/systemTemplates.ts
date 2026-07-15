import { BioEditorBlock, BioEditorState, TemplateItem } from "../types";
import { buildEditorState, cloneBlocks, DEFAULT_COVER } from "../storage/bioBuilderStorage";

export type TemplateCategory =
  | "E-commerce"
  | "Link in Bio"
  | "Professional"
  | "Personal"
  | "Freelancer"
  | "Launch"
  | "Portfolio"
  | "Industry"
  | "Real Estate"
  | "Restaurants"
  | "Agency"
  | "Business";

export const TEMPLATE_CATEGORIES = [
  "All Categories",
  "E-commerce",
  "Link in Bio",
  "Professional",
  "Personal",
  "Freelancer",
  "Launch",
  "Portfolio",
  "Industry",
  "Real Estate",
  "Restaurants",
  "Agency",
  "Business"
] as const;

/** 32 system templates + Start from Scratch card = 33 gallery items (screenshot reference). */
export const SYSTEM_TEMPLATE_COUNT = 32;
export const GALLERY_TEMPLATE_COUNT = SYSTEM_TEMPLATE_COUNT + 1;

interface SystemTemplateDefinition {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  imageUrl: string;
  usedCount: string;
  price: string;
  suggested?: boolean;
  title: string;
  bio: string;
  coverImage: string;
  blocks: BioEditorBlock[];
}

function b(
  id: string,
  type: string,
  label: string,
  value: string = label
): BioEditorBlock {
  return { id, type, label, value };
}

type TemplateSeed = Omit<SystemTemplateDefinition, "blocks"> & {
  blocks: BioEditorBlock[];
};

function defineTemplate(seed: TemplateSeed): SystemTemplateDefinition {
  return { ...seed, widgets: seed.blocks.length } as SystemTemplateDefinition;
}

const SYSTEM_TEMPLATE_DEFINITIONS: SystemTemplateDefinition[] = [
  defineTemplate({
    id: "t-plant-shop",
    name: "Plant Shop Natural",
    category: "E-commerce",
    description: "Earthy botanical storefront for plant shops and garden brands.",
    imageUrl: "https://images.unsplash.com/photo-1466781783364-fc7e94d99b7d?auto=format&fit=crop&q=80&w=500",
    usedCount: "48x",
    price: "Free",
    suggested: true,
    title: "Plant Shop Natural",
    bio: "Indoor plants, pots, and care tips — shipped with love.",
    coverImage: "https://images.unsplash.com/photo-1466781783364-fc7e94d99b7d?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("psn1", "Header", "🌿 Plant Shop Natural"),
      b("psn2", "Text", "Hand-picked greenery for homes and workspaces."),
      b("psn3", "Shop", "Best Sellers", "Products List"),
      b("psn4", "Button", "Care Guide", "https://example.com/care"),
      b("psn5", "WhatsApp", "Order on WhatsApp", "https://wa.me/1234567890"),
      b("psn6", "Socials", "Follow our garden", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-photo-portfolio",
    name: "Photo Portfolio",
    category: "Portfolio",
    description: "Dark, gallery-style layout for photographers and visual artists.",
    imageUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77ee70?auto=format&fit=crop&q=80&w=500",
    usedCount: "61x",
    price: "Free",
    suggested: true,
    title: "Photo Portfolio",
    bio: "Portrait, event, and editorial photography with natural light.",
    coverImage: "https://images.unsplash.com/photo-1452587925148-ce544e77ee70?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("pp1", "Header", "📷 Photo Portfolio"),
      b("pp2", "Text", "Stories told through light, color, and composition."),
      b("pp3", "Button", "View Gallery", "https://example.com/gallery"),
      b("pp4", "Smart Form", "Book a Shoot", "Booking Form"),
      b("pp5", "Instagram", "Instagram Work", "https://instagram.com"),
      b("pp6", "vCard", "Save Contact", "Photographer")
    ]
  }),
  defineTemplate({
    id: "t-book-release",
    name: "Book Release Author",
    category: "Launch",
    description: "Promote a new book with reviews, retailer links, and newsletter signup.",
    imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=500",
    usedCount: "27x",
    price: "Free",
    title: "Book Release Author",
    bio: "The new novel is here — read the first chapter free.",
    coverImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("br1", "Header", "📚 New Book Release"),
      b("br2", "Text", "A gripping story of courage, change, and second chances."),
      b("br3", "Button", "Read Sample Chapter", "https://example.com/sample"),
      b("br4", "Button", "Buy on Amazon", "https://amazon.com"),
      b("br5", "Smart Form", "Join Reader List", "Newsletter"),
      b("br6", "Socials", "Author socials", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-flower-shop",
    name: "Flower Shop",
    category: "E-commerce",
    description: "Bright floral design for bouquets, events, and same-day delivery.",
    imageUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&q=80&w=500",
    usedCount: "35x",
    price: "Free",
    title: "Flower Shop",
    bio: "Fresh bouquets and custom arrangements for every occasion.",
    coverImage: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("fl1", "Header", "🌸 Bloom Flower Shop"),
      b("fl2", "Text", "Same-day delivery across the city."),
      b("fl3", "Shop", "Popular Bouquets", "Products List"),
      b("fl4", "Button", "Wedding Flowers", "https://example.com/weddings"),
      b("fl5", "WhatsApp", "Order Flowers", "https://wa.me/1234567890"),
      b("fl6", "Socials", "Floral inspiration", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-travel-blog",
    name: "Travel Blog Website",
    category: "Personal",
    description: "Scenic travel blog with guides, tips, and affiliate links.",
    imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=500",
    usedCount: "44x",
    price: "Free",
    title: "Travel Blog Website",
    bio: "City guides, itineraries, and hidden gems from 40+ countries.",
    coverImage: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("tb1", "Header", "✈️ Travel Blog"),
      b("tb2", "Text", "Honest guides for curious travelers."),
      b("tb3", "Button", "Latest Destination", "https://example.com/guide"),
      b("tb4", "Button", "Packing Checklist", "https://example.com/pack"),
      b("tb5", "Smart Form", "Newsletter", "Travel Newsletter"),
      b("tb6", "Socials", "Follow journeys", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-real-estate",
    name: "Real Estate",
    category: "Real Estate",
    description: "Property listings, agent contact, and mortgage resources.",
    imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=500",
    usedCount: "38x",
    price: "Free",
    suggested: true,
    title: "Real Estate",
    bio: "Homes and investments across the metro — tours by appointment.",
    coverImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("re1", "Header", "🏠 Premier Realty"),
      b("re2", "Text", "Featured listings updated weekly."),
      b("re3", "Shop", "Available Properties", "Listings"),
      b("re4", "Button", "Mortgage Info", "https://example.com/mortgage"),
      b("re5", "Smart Form", "Schedule Viewing", "Viewing Form"),
      b("re6", "WhatsApp", "Chat with Agent", "https://wa.me/1234567890")
    ]
  }),
  defineTemplate({
    id: "t-beauty-clinic",
    name: "Beauty Clinic Lifestyle",
    category: "Industry",
    description: "Luxury purple-toned layout for clinics, spas, and skincare brands.",
    imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=500",
    usedCount: "31x",
    price: "Free",
    title: "Beauty Clinic Lifestyle",
    bio: "Advanced skincare treatments in a calm, boutique setting.",
    coverImage: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("bc1", "Header", "✨ Beauty Clinic"),
      b("bc2", "Text", "Facials, laser care, and personalized skin plans."),
      b("bc3", "Button", "Treatment Menu", "https://example.com/treatments"),
      b("bc4", "Smart Form", "Book Consultation", "Clinic Form"),
      b("bc5", "Coupon", "First Visit Offer", "GLOW10"),
      b("bc6", "Socials", "Results & tips", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-product-launch-tech",
    name: "Product Launch Tech",
    category: "Launch",
    description: "Futuristic tech launch with waitlist, demo, and feature highlights.",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=500",
    usedCount: "42x",
    price: "Free",
    title: "Product Launch Tech",
    bio: "Introducing the next-gen device built for creators and teams.",
    coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("pl1", "Header", "🚀 Product Launch"),
      b("pl2", "Text", "Be first to try our new smart workspace tool."),
      b("pl3", "Countdown", "Launching in", "10"),
      b("pl4", "Smart Form", "Join Waitlist", "Waitlist"),
      b("pl5", "Button", "Watch Demo", "https://example.com/demo"),
      b("pl6", "Socials", "Product updates", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-yoga-studio",
    name: "Yoga Studio - Wellness Boutique",
    category: "Industry",
    description: "Calm wellness layout for yoga studios, spas, and holistic brands.",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=500",
    usedCount: "29x",
    price: "Free",
    title: "Yoga Studio - Wellness Boutique",
    bio: "Move, breathe, and restore with guided classes for all levels.",
    coverImage: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("ys1", "Header", "🧘 Wellness Boutique"),
      b("ys2", "Text", "Yoga, meditation, and mindful living workshops."),
      b("ys3", "Button", "Class Schedule", "https://example.com/schedule"),
      b("ys4", "Smart Form", "Book a Class", "Yoga Booking"),
      b("ys5", "Button", "Shop Wellness Products", "https://example.com/shop"),
      b("ys6", "Socials", "Daily inspiration", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-coach-mentor",
    name: "Coach - Mentor",
    category: "Professional",
    description: "Professional headshot-led page for coaches and business mentors.",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=500",
    usedCount: "36x",
    price: "Free",
    title: "Coach - Mentor",
    bio: "Leadership coaching for founders and high-growth teams.",
    coverImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("cm1", "Header", "Coach & Mentor"),
      b("cm2", "Text", "1:1 sessions, group programs, and executive workshops."),
      b("cm3", "Button", "Programs", "https://example.com/programs"),
      b("cm4", "Smart Form", "Apply for Coaching", "Coaching Form"),
      b("cm5", "Button", "Free Strategy Call", "https://calendly.com"),
      b("cm6", "vCard", "Save Contact", "Coach Contact")
    ]
  }),
  defineTemplate({
    id: "t-modern-restaurant",
    name: "Modern Restaurant",
    category: "Restaurants",
    description: "Dark modern restaurant layout with menu and reservation links.",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=500",
    usedCount: "40x",
    price: "Free",
    suggested: true,
    title: "Modern Restaurant",
    bio: "Seasonal menu, craft cocktails, and weekend brunch.",
    coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("mr1", "Header", "🍽️ Modern Restaurant"),
      b("mr2", "Text", "Reserve your table or order delivery tonight."),
      b("mr3", "PDF", "View Menu", "https://example.com/menu.pdf"),
      b("mr4", "Button", "Book a Table", "https://example.com/reserve"),
      b("mr5", "Button", "Order Online", "https://example.com/order"),
      b("mr6", "Socials", "Chef's specials", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-artist-designer",
    name: "Artist & Designer",
    category: "Portfolio",
    description: "Creative portfolio for illustrators, designers, and visual artists.",
    imageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=500",
    usedCount: "33x",
    price: "Free",
    title: "Artist & Designer",
    bio: "Brand identity, illustration, and digital art commissions.",
    coverImage: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("ad1", "Header", "🎨 Artist & Designer"),
      b("ad2", "Text", "Selected work across branding, print, and UI."),
      b("ad3", "Button", "Portfolio", "https://example.com/portfolio"),
      b("ad4", "Button", "Commission Pricing", "https://example.com/pricing"),
      b("ad5", "Smart Form", "Hire Me", "Commission Form"),
      b("ad6", "Instagram", "Latest Work", "https://instagram.com")
    ]
  }),
  defineTemplate({
    id: "t-event-agency",
    name: "Event Agency",
    category: "Agency",
    description: "Vibrant agency page for concerts, launches, and brand activations.",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=500",
    usedCount: "25x",
    price: "Free",
    title: "Event Agency",
    bio: "We design unforgettable live experiences and brand moments.",
    coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("ea1", "Header", "🎉 Event Agency"),
      b("ea2", "Text", "Corporate events, festivals, and product launches."),
      b("ea3", "Button", "Past Events", "https://example.com/events"),
      b("ea4", "Smart Form", "Plan Your Event", "Event Form"),
      b("ea5", "Button", "Download Deck", "https://example.com/deck.pdf"),
      b("ea6", "Socials", "Behind the scenes", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-marketing-pro",
    name: "Marketing Professional",
    category: "Professional",
    description: "Clean corporate bio for marketers, strategists, and consultants.",
    imageUrl: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=500",
    usedCount: "34x",
    price: "Free",
    title: "Marketing Professional",
    bio: "Growth strategy, paid media, and conversion optimization.",
    coverImage: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("mp1", "Header", "Marketing Professional"),
      b("mp2", "Text", "Helping brands scale with data-driven campaigns."),
      b("mp3", "Button", "Case Studies", "https://example.com/cases"),
      b("mp4", "Button", "Free Audit", "https://example.com/audit"),
      b("mp5", "Smart Form", "Work With Me", "Marketing Form"),
      b("mp6", "Socials", "Marketing insights", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-musician-profile",
    name: "Musician - Personal Profile",
    category: "Portfolio",
    description: "Artist-forward layout with music links, tour dates, and merch.",
    imageUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&q=80&w=500",
    usedCount: "47x",
    price: "Free",
    title: "Musician - Personal Profile",
    bio: "New music, live shows, and exclusive fan content.",
    coverImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("mu1", "Header", "🎵 Musician Profile"),
      b("mu2", "Text", "Stream the latest singles and grab tour tickets."),
      b("mu3", "Button", "Listen on Spotify", "https://open.spotify.com"),
      b("mu4", "Button", "Tour Dates", "https://example.com/tour"),
      b("mu5", "Button", "Merch Store", "https://example.com/merch"),
      b("mu6", "Socials", "Fan links", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-small-biz-ecom",
    name: "Small Business Ecommerce",
    category: "E-commerce",
    description: "Product grid and checkout links for small online shops.",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=500",
    usedCount: "52x",
    price: "Free",
    title: "Small Business Ecommerce",
    bio: "Quality products with fast shipping and easy returns.",
    coverImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("sbe1", "Header", "🛍️ Small Business Shop"),
      b("sbe2", "Text", "Browse bestsellers and new arrivals."),
      b("sbe3", "Shop", "Featured Products", "Products List"),
      b("sbe4", "Button", "Shop All", "https://example.com/shop"),
      b("sbe5", "Coupon", "Welcome Code", "WELCOME10"),
      b("sbe6", "WhatsApp", "Customer Support", "https://wa.me/1234567890")
    ]
  }),
  defineTemplate({
    id: "t-dj-performer",
    name: "DJ & Performer",
    category: "Portfolio",
    description: "Club-themed page for DJs, performers, and nightlife artists.",
    imageUrl: "https://images.unsplash.com/photo-1571266028243-e68f8570c9e0?auto=format&fit=crop&q=80&w=500",
    usedCount: "28x",
    price: "Free",
    title: "DJ & Performer",
    bio: "Bookings, mixes, and upcoming club nights.",
    coverImage: "https://images.unsplash.com/photo-1571266028243-e68f8570c9e0?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("dj1", "Header", "🎧 DJ & Performer"),
      b("dj2", "Text", "House, techno, and festival sets worldwide."),
      b("dj3", "Button", "Listen on SoundCloud", "https://soundcloud.com"),
      b("dj4", "Button", "Booking & Press", "https://example.com/booking"),
      b("dj5", "Smart Form", "Event Inquiry", "Booking Form"),
      b("dj6", "Socials", "Nightlife links", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-fine-dining",
    name: "Fine Dining Restaurant",
    category: "Restaurants",
    description: "Elegant dining experience with tasting menu and reservations.",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=500",
    usedCount: "22x",
    price: "Free",
    title: "Fine Dining Restaurant",
    bio: "Award-winning cuisine with seasonal tasting menus.",
    coverImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("fd1", "Header", "🥂 Fine Dining"),
      b("fd2", "Text", "An intimate culinary journey by Chef Laurent."),
      b("fd3", "PDF", "Tasting Menu", "https://example.com/menu.pdf"),
      b("fd4", "Button", "Reserve Table", "https://example.com/reserve"),
      b("fd5", "Button", "Private Events", "https://example.com/events"),
      b("fd6", "Socials", "Chef's table", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-travel-blogger",
    name: "Travel Blogger & Photographer",
    category: "Personal",
    description: "Adventure photography blog with guides and print shop links.",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=500",
    usedCount: "37x",
    price: "Free",
    title: "Travel Blogger & Photographer",
    bio: "Mountain trails, coastal roads, and stories from the road.",
    coverImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("tbp1", "Header", "🏔️ Travel & Photo"),
      b("tbp2", "Text", "Adventure guides and limited edition prints."),
      b("tbp3", "Button", "Latest Trip", "https://example.com/trip"),
      b("tbp4", "Button", "Print Shop", "https://example.com/prints"),
      b("tbp5", "Smart Form", "Newsletter", "Travel List"),
      b("tbp6", "Instagram", "Travel Feed", "https://instagram.com")
    ]
  }),
  defineTemplate({
    id: "t-financial-advisor",
    name: "Financial Advisor",
    category: "Professional",
    description: "Trust-focused layout for advisors, planners, and wealth managers.",
    imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=500",
    usedCount: "19x",
    price: "Free",
    title: "Financial Advisor",
    bio: "Personalized planning for retirement, investments, and growth.",
    coverImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("fa1", "Header", "💼 Financial Advisor"),
      b("fa2", "Text", "Clarity and confidence for your financial future."),
      b("fa3", "Button", "Services", "https://example.com/services"),
      b("fa4", "Smart Form", "Book Consultation", "Finance Form"),
      b("fa5", "PDF", "Planning Guide", "https://example.com/guide.pdf"),
      b("fa6", "vCard", "Office Contact", "Advisor Contact")
    ]
  }),
  defineTemplate({
    id: "t-fashion-influencer",
    name: "Fashion Influencer",
    category: "Link in Bio",
    description: "Stylish influencer page with collabs, outfits, and affiliate links.",
    imageUrl: "https://images.unsplash.com/photo-1483985988354-763728e1935b?auto=format&fit=crop&q=80&w=500",
    usedCount: "55x",
    price: "Free",
    suggested: true,
    title: "Fashion Influencer",
    bio: "Daily outfits, brand partners, and style tips.",
    coverImage: "https://images.unsplash.com/photo-1483985988354-763728e1935b?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("fi1", "Header", "👗 Fashion Influencer"),
      b("fi2", "Text", "Outfit links, lookbooks, and partnership inquiries."),
      b("fi3", "Button", "Shop My Looks", "https://example.com/looks"),
      b("fi4", "Button", "Media Kit", "https://example.com/kit"),
      b("fi5", "Smart Form", "Brand Collabs", "Collab Form"),
      b("fi6", "Socials", "Style socials", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-content-creator",
    name: "Content Creator",
    category: "Link in Bio",
    description: "All-in-one hub for videos, merch, community, and sponsors.",
    imageUrl: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&q=80&w=500",
    usedCount: "64x",
    price: "Free",
    suggested: true,
    title: "Content Creator",
    bio: "Videos, podcasts, and community — all in one link.",
    coverImage: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("cc1", "Header", "🎬 Content Creator"),
      b("cc2", "Button", "Latest Video", "https://youtube.com"),
      b("cc3", "Button", "Join Community", "https://discord.com"),
      b("cc4", "Button", "Shop Merch", "https://example.com/merch"),
      b("cc5", "Smart Form", "Newsletter", "Creator List"),
      b("cc6", "Socials", "All platforms", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-digital-artist",
    name: "Digital Artist",
    category: "Portfolio",
    description: "Showcase digital art, NFT drops, and commission bookings.",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=500",
    usedCount: "30x",
    price: "Free",
    title: "Digital Artist",
    bio: "Illustration, motion art, and limited edition drops.",
    coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("da1", "Header", "🖌️ Digital Artist"),
      b("da2", "Text", "Commissions open — book your custom piece."),
      b("da3", "Button", "Art Gallery", "https://example.com/gallery"),
      b("da4", "Button", "Commission Info", "https://example.com/commissions"),
      b("da5", "Smart Form", "Request Artwork", "Art Form"),
      b("da6", "Socials", "Creative links", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-cafe-coffee",
    name: "Cafe & Coffee Shop",
    category: "Restaurants",
    description: "Warm rustic cafe layout with menu, hours, and loyalty offer.",
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=500",
    usedCount: "41x",
    price: "Free",
    title: "Cafe & Coffee Shop",
    bio: "Specialty coffee, pastries, and cozy workspace downtown.",
    coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("ccafe1", "Header", "☕ Cafe & Coffee Shop"),
      b("ccafe2", "Text", "Open 7am–8pm. Free Wi‑Fi and loyalty rewards."),
      b("ccafe3", "PDF", "Drinks Menu", "https://example.com/menu.pdf"),
      b("ccafe4", "Coupon", "First Visit Pastry", "WELCOME"),
      b("ccafe5", "Button", "Get Directions", "https://maps.google.com"),
      b("ccafe6", "Socials", "Daily specials", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-freelance-writer",
    name: "Freelance Writer",
    category: "Freelancer",
    description: "Minimal writer portfolio with samples, rates, and contact form.",
    imageUrl: "https://images.unsplash.com/photo-1455390582260-0446dd291f0a?auto=format&fit=crop&q=80&w=500",
    usedCount: "26x",
    price: "Free",
    title: "Freelance Writer",
    bio: "Blog posts, landing pages, and brand storytelling.",
    coverImage: "https://images.unsplash.com/photo-1455390582260-0446dd291f0a?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("fw1", "Header", "✍️ Freelance Writer"),
      b("fw2", "Text", "Clear copy that converts and connects."),
      b("fw3", "Button", "Writing Samples", "https://example.com/samples"),
      b("fw4", "Button", "Services & Rates", "https://example.com/rates"),
      b("fw5", "Smart Form", "Hire Me", "Writer Form"),
      b("fw6", "vCard", "Save Contact", "Writer Contact")
    ]
  }),
  defineTemplate({
    id: "t-fitness-coach",
    name: "Fitness Coach",
    category: "Personal",
    description: "High-energy gym layout with programs and coaching signup.",
    imageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=500",
    usedCount: "43x",
    price: "Free",
    title: "Fitness Coach",
    bio: "Strength programs and accountability for busy professionals.",
    coverImage: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("fc1", "Header", "💪 Fitness Coach"),
      b("fc2", "Text", "12-week coaching with nutrition support."),
      b("fc3", "Button", "Training Plans", "https://example.com/plans"),
      b("fc4", "Smart Form", "Apply for Coaching", "Fitness Form"),
      b("fc5", "WhatsApp", "Quick Questions", "https://wa.me/1234567890"),
      b("fc6", "Socials", "Workout tips", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-wedding-photo",
    name: "Wedding Photography",
    category: "Industry",
    description: "Soft elegant design for wedding photographers and studios.",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=500",
    usedCount: "32x",
    price: "Free",
    title: "Wedding Photography",
    bio: "Timeless wedding stories captured with care and artistry.",
    coverImage: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("wp1", "Header", "💍 Wedding Photography"),
      b("wp2", "Text", "Engagements, ceremonies, and destination weddings."),
      b("wp3", "Button", "Portfolio", "https://example.com/weddings"),
      b("wp4", "Smart Form", "Check Availability", "Wedding Form"),
      b("wp5", "Button", "Pricing Guide", "https://example.com/pricing"),
      b("wp6", "Instagram", "Real Weddings", "https://instagram.com")
    ]
  }),
  defineTemplate({
    id: "t-event-planner",
    name: "Event Planner & Decor",
    category: "Industry",
    description: "Colorful celebratory layout for planners and decor specialists.",
    imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=500",
    usedCount: "24x",
    price: "Free",
    title: "Event Planner & Decor",
    bio: "Weddings, corporate galas, and bespoke celebrations.",
    coverImage: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("ep1", "Header", "🎊 Event Planner & Decor"),
      b("ep2", "Text", "Full planning, styling, and day-of coordination."),
      b("ep3", "Button", "Our Packages", "https://example.com/packages"),
      b("ep4", "Smart Form", "Plan My Event", "Planner Form"),
      b("ep5", "Button", "Inspiration Gallery", "https://example.com/gallery"),
      b("ep6", "Socials", "Event ideas", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-chef-food-blog",
    name: "Chef & Food Blog",
    category: "Restaurants",
    description: "Culinary blog with recipes, classes, and restaurant links.",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=500",
    usedCount: "31x",
    price: "Free",
    title: "Chef & Food Blog",
    bio: "Recipes, cooking classes, and behind-the-kitchen stories.",
    coverImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("cf1", "Header", "👨‍🍳 Chef & Food Blog"),
      b("cf2", "Text", "Seasonal recipes and private dining experiences."),
      b("cf3", "Button", "Latest Recipe", "https://example.com/recipe"),
      b("cf4", "Button", "Cooking Classes", "https://example.com/classes"),
      b("cf5", "PDF", "Recipe Ebook", "https://example.com/ebook.pdf"),
      b("cf6", "Socials", "Kitchen daily", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-bar-mixology",
    name: "Bar & Mixology",
    category: "Restaurants",
    description: "Dark cocktail bar theme with menu, events, and reservations.",
    imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d46?auto=format&fit=crop&q=80&w=500",
    usedCount: "21x",
    price: "Free",
    title: "Bar & Mixology",
    bio: "Craft cocktails, live music, and late-night vibes.",
    coverImage: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d46?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("bm1", "Header", "🍸 Bar & Mixology"),
      b("bm2", "Text", "Signature drinks and weekend DJ sets."),
      b("bm3", "PDF", "Cocktail Menu", "https://example.com/menu.pdf"),
      b("bm4", "Button", "Reserve a Table", "https://example.com/reserve"),
      b("bm5", "Countdown", "Next Live Night", "3"),
      b("bm6", "Socials", "Bar events", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-interior-designer",
    name: "Interior Designer",
    category: "Industry",
    description: "Home decor portfolio with projects and consultation booking.",
    imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=500",
    usedCount: "23x",
    price: "Free",
    title: "Interior Designer",
    bio: "Residential interiors with warm, functional modern style.",
    coverImage: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("id1", "Header", "🏡 Interior Designer"),
      b("id2", "Text", "Concept boards, sourcing, and project management."),
      b("id3", "Button", "Project Gallery", "https://example.com/projects"),
      b("id4", "Smart Form", "Book Consultation", "Design Form"),
      b("id5", "Button", "Design Services", "https://example.com/services"),
      b("id6", "Socials", "Before & after", "Socials")
    ]
  }),
  defineTemplate({
    id: "t-beauty-fashion",
    name: "Beauty & Fashion",
    category: "E-commerce",
    description: "Bright modern influencer shop for beauty and fashion brands.",
    imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=500",
    usedCount: "46x",
    price: "Free",
    title: "Beauty & Fashion",
    bio: "Curated beauty picks and everyday style essentials.",
    coverImage: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800",
    blocks: [
      b("bf1", "Header", "💄 Beauty & Fashion"),
      b("bf2", "Text", "Shop favorites, tutorials, and exclusive drops."),
      b("bf3", "Shop", "Must-Have Products", "Products List"),
      b("bf4", "Button", "Tutorial Playlist", "https://youtube.com"),
      b("bf5", "Coupon", "Beauty Code", "GLOW20"),
      b("bf6", "Socials", "Beauty & style", "Socials")
    ]
  })
];

const TEMPLATE_LOOKUP = new Map(
  SYSTEM_TEMPLATE_DEFINITIONS.map((template) => [template.name.toLowerCase(), template])
);

export function getSystemTemplateCatalog(): TemplateItem[] {
  return SYSTEM_TEMPLATE_DEFINITIONS.map((template) => ({
    id: template.id,
    name: template.name,
    category: template.category,
    widgets: template.blocks.length,
    usedCount: template.usedCount,
    imageUrl: template.imageUrl,
    description: template.description,
    price: template.price,
    suggested: template.suggested ?? false
  }));
}

export function resolveSystemTemplate(templateName: string): BioEditorState | null {
  const key = templateName.trim().toLowerCase();
  const template = TEMPLATE_LOOKUP.get(key);
  if (!template) return null;

  return buildEditorState(
    template.title,
    template.bio,
    template.coverImage,
    cloneBlocks(template.blocks)
  );
}

export function getBlankTemplate(title = "Untitled Page"): BioEditorState {
  return buildEditorState(
    title === "Blank Scratch template" || title === "Start from Scratch" ? "Untitled Page" : title,
    "Write a short bio...",
    DEFAULT_COVER,
    [
      b("blank1", "Header", "👋 Welcome"),
      b("blank2", "Text", "Start building your page with blocks from the library."),
      b("blank3", "Button", "Add your first link", "https://example.com")
    ]
  );
}
