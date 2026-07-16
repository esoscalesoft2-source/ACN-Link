import React, { useState, useEffect, useMemo, useRef } from "react";
import { ArrowRight, Copy, Check, MessageSquare, User, X, AlertCircle } from "lucide-react";
import { apiUrl } from "../lib/apiBase";
import { BIO_LINK, getLinkArrowColor, getLinkButtonStyle, isDefaultBrightLink } from "../lib/bioLinkColors";
import { formatDisplayHandle } from "../storage/bioBuilderStorage";
import type { BioPagePreviewDetails, BioPagePreviewTheme } from "../types";

interface Block {
  id: string;
  type: string;
  label: string;
  value: string;
}

interface PublicBioPageViewProps {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  pageBio?: string;
  pageCoverPhoto?: string;
  /** Platform ?previewPageId= testing shows the sandbox banner; live custom domains do not. */
  mode?: "preview" | "live";
}

const marvelFallbackBlocks = [
  { id: "b1", type: "Header", label: "👤 Marvel Toys for Kids", value: "👤 Marvel Toys for Kids" },
  { id: "b2", type: "Header", label: "Official Marvel-Inspired Toys & Collectibles", value: "Official Marvel-Inspired Toys & Collectibles" },
  { id: "b3", type: "Text", label: "🎁 Safe, fun & exciting toys for young superheroes.", value: "🎁 Safe, fun & exciting toys for young superheroes." },
  { id: "b4", type: "Header", label: "⭐ Why Shop With Us?", value: "⭐ Why Shop With Us?" },
  { id: "b5", type: "Text", label: "🛡️ Quality Marvel-themed toys, 🚚 Fast Shipping, 💯 Trusted", value: "🛡️ Quality Marvel-themed toys, 🚚 Fast Shipping, 💯 Trusted" },
  { id: "b6", type: "Shop", label: "Products For Kids (Iron Man, Spiderman, Hulk)", value: "Products For Kids" },
  { id: "b7", type: "Button", label: "Explore the Toys Section", value: "Explore the Toys Section", bgColor: "#7c3aed", textColor: "#FFFFFF" },
  { id: "b8", type: "Coupon", label: "Special Offer (MARVELTOYCODE007007)", value: "MARVELTOYCODE007007" },
  { id: "b9", type: "Countdown", label: "Sale ends in (9 Days Timer)", value: "9" },
  { id: "b10", type: "Link Spin", label: "Buy Now (Prize Wheel)", value: "Buy Now" },
  { id: "b11", type: "WhatsApp", label: "Message Us on WhatsApp", value: "Message Us on WhatsApp" },
  { id: "b12", type: "Smart Form", label: "Get in Touch Leads Form", value: "Get in Touch" },
  { id: "b13", type: "vCard", label: "Save Contact Card Info", value: "Save Contact" }
];

const genericFallbackBlocks = [
  { id: "g1", type: "Header", label: "👤 My Responsive BioLink", value: "👤 My Responsive BioLink" },
  { id: "g2", type: "Text", label: "Welcome to my responsive bio page! Customize me using the blocks.", value: "Welcome" },
  { id: "g3", type: "Button", label: "Visit My Website", value: "https://example.com", bgColor: "#7c3aed", textColor: "#FFFFFF" },
  { id: "g4", type: "WhatsApp", label: "Chat with me on WhatsApp", value: "https://wa.me/1234567890" }
];

const defaultProductsList = [
  {
    id: "p1",
    name: "Iron man",
    url: "https://www.amazon.in/Toys-Action-Figure-Collectibles-Interchangeable/dp/BOFKTLP65H?source=ps-sl-sl",
    image: "https://images.unsplash.com/photo-1626278664285-f7c05fd17571?auto=format&fit=crop&q=80&w=300",
    price: "3999"
  },
  {
    id: "p2",
    name: "spiderman",
    url: "https://www.amazon.in/Toys-Action-Figure-Collectibles-Interchangeable/dp/BOFKTLP65H?source=ps-sl-sl",
    image: "https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?auto=format&fit=crop&q=80&w=300",
    price: "2999"
  },
  {
    id: "p3",
    name: "halk",
    url: "https://www.amazon.in/Toys-Action-Figure-Collectibles-Interchangeable/dp/BOFKTLP65H?source=ps-sl-sl",
    image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&q=80&w=300",
    price: "1899"
  }
];

const getCurrencySymbol = (currency: string = "₹ INR") => {
  if (currency.startsWith("₹")) return "₹";
  if (currency.startsWith("$")) return "$";
  if (currency.startsWith("€")) return "€";
  if (currency.startsWith("£")) return "£";
  if (currency.startsWith("¥")) return "¥";
  return currency.split(" ")[0] || "₹";
};

export default function PublicBioPageView({
  pageId,
  pageTitle,
  pageSlug,
  pageBio,
  pageCoverPhoto,
  mode = "preview"
}: PublicBioPageViewProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [customDetails, setCustomDetails] = useState<BioPagePreviewDetails | null>(null);
  const [pageTheme, setPageTheme] = useState<BioPagePreviewTheme>("dark");
  const [pageLoadStatus, setPageLoadStatus] = useState<"loading" | "ready" | "not_found">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNoticePanel, setShowNoticePanel] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [leadEmail, setLeadEmail] = useState("");
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);

  const applyStoredDetails = (parsed: BioPagePreviewDetails | null) => {
    if (!parsed || typeof parsed !== "object") return;
    setCustomDetails(parsed);
    setPageTheme(parsed.pageTheme === "light" ? "light" : "dark");
  };

  const reloadStoredDetails = () => {
    try {
      const savedDetails =
        localStorage.getItem(`biolink_details_${pageId}`) ||
        localStorage.getItem(`biolink_details_${pageSlug}`);
      if (!savedDetails) return;
      applyStoredDetails(JSON.parse(savedDetails) as BioPagePreviewDetails);
    } catch (e) {
      console.error("Error loading custom details:", e);
    }
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === `biolink_details_${pageId}` ||
        event.key === `biolink_details_${pageSlug}`
      ) {
        reloadStoredDetails();
      }
    };

    const handlePreviewUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ pageId?: string; pageSlug?: string; details?: BioPagePreviewDetails }>).detail;
      if (!detail) return;
      if (detail.pageId !== pageId && detail.pageSlug !== pageSlug) return;
      if (detail.details) {
        applyStoredDetails(detail.details);
      } else {
        reloadStoredDetails();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("acn-page-preview-updated", handlePreviewUpdated as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("acn-page-preview-updated", handlePreviewUpdated as EventListener);
    };
  }, [pageId, pageSlug]);

  useEffect(() => {
    document.documentElement.classList.add("acn-public-scroll");
    return () => {
      document.documentElement.classList.remove("acn-public-scroll");
    };
  }, []);

  useEffect(() => {

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowNoticePanel(false);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (noticeRef.current && !noticeRef.current.contains(event.target as Node)) {
        setShowNoticePanel(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNoticePanel]);

  const trackAction = (eventType: "visit" | "click" | "register", eventLabel: string, details?: any) => {
    fetch(apiUrl("/api/track"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId,
        eventType,
        eventLabel,
        details
      })
    }).catch(err => {
      console.error("Failed to track event:", err);
    });
  };

  const openWhatsAppLink = (value: string) => {
    if (!value) return;
    
    try {
      // If it's already a full link, use it
      if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("whatsapp://")) {
        window.open(value, "_blank", "noopener,noreferrer");
        return;
      }
      
      // Clean up any non-numeric characters for wa.me link
      const cleaned = value.replace(/[^0-9]/g, "");
      if (cleaned) {
        window.open(`https://wa.me/${cleaned}`, "_blank", "noopener,noreferrer");
      } else {
        window.open(`https://wa.me/${encodeURIComponent(value)}`, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.warn("WhatsApp redirect blocked by popup blocker or iframe policy:", err);
    }
  };

  const openExternalLink = (value: string) => {
    const target = value.trim();
    if (!target) {
      triggerToast("This link has not been configured yet.");
      return;
    }

    const url = /^https?:\/\//i.test(target) ? target : `https://${target}`;
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      triggerToast("Your browser blocked this link. Please try again.");
    }
  };

  // Track initial visit on mount
  useEffect(() => {
    trackAction("visit", "BioLink Page Visited");
  }, [pageId]);

  // Live countdown state
  const [countdown, setCountdown] = useState({
    days: 9,
    hrs: 19,
    mins: 45,
    secs: 30
  });

  // Ticking countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.secs > 0) {
          return { ...prev, secs: prev.secs - 1 };
        } else if (prev.mins > 0) {
          return { ...prev, mins: prev.mins - 1, secs: 59 };
        } else if (prev.hrs > 0) {
          return { ...prev, hrs: prev.hrs - 1, mins: 59, secs: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hrs: 23, mins: 59, secs: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load custom published blocks & details from server first, and local storage as fallback
  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      setLoadError(null);

      // 1. Try fetching from server first (critical for multi-device/mobile preview)
      try {
        const res = await fetch(apiUrl(`/api/page/${pageId}`));
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            if (Array.isArray(data.blocks) && data.blocks.length > 0) {
              setBlocks(data.blocks);
              setPageLoadStatus("ready");
              if (data.details) {
                setCustomDetails(data.details);
                setPageTheme(data.details.pageTheme === "light" ? "light" : "dark");
              }
              return;
            }
            if (data.details) {
              setCustomDetails(data.details);
              setPageTheme(data.details.pageTheme === "light" ? "light" : "dark");
            }
          }
        } else if (res.status === 404) {
          if (isMounted) setPageLoadStatus("not_found");
        } else if (isMounted) {
          setLoadError(`Server returned ${res.status}. Could not load this page.`);
        }
      } catch (err) {
        console.error("Failed to fetch page data from server:", err);
        if (isMounted) {
          setLoadError("Could not reach the server. Check your connection and try again.");
        }
      }

      // 2. Fallback to localStorage (for offline/local-only compatibility)
      let loadedBlocks: Block[] | null = null;
      const savedBlocks = localStorage.getItem(`biolink_blocks_${pageId}`) || localStorage.getItem(`biolink_blocks_${pageSlug}`);
      if (savedBlocks) {
        try {
          const parsed = JSON.parse(savedBlocks);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedBlocks = parsed;
          }
        } catch (e) {
          console.error("Error loading custom blocks:", e);
        }
      }

      if (isMounted) {
        if (loadedBlocks) {
          setBlocks(loadedBlocks);
          setPageLoadStatus("ready");
        } else {
          setPageLoadStatus("not_found");
        }
      }

      // Load custom details from localStorage
      const savedDetails = localStorage.getItem(`biolink_details_${pageId}`) || localStorage.getItem(`biolink_details_${pageSlug}`);
      if (savedDetails) {
        try {
          const parsed = JSON.parse(savedDetails) as BioPagePreviewDetails;
          if (isMounted) applyStoredDetails(parsed);
        } catch (e) {
          console.error("Error loading custom details:", e);
        }
      } else if (isMounted) {
        setCustomDetails(null);
        setPageTheme("dark");
      }
    }

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, [pageId, pageSlug, pageTitle]);

  const pageNotices = useMemo(() => {
    const notices: Array<{ id: string; title: string; body: React.ReactNode; kind: "info" | "error" }> = [];

    if (mode === "preview") {
      notices.push({
        id: "sandbox",
        title: "Secure Sandboxed Preview Mode",
        kind: "info",
        body: (
          <>
            <p>You are viewing your live BioLink output safely hosted on our secure origin.</p>
            <p className="mt-2">
              <strong>Note on Privacy Error:</strong> Custom mock domains (like{" "}
              <code className="bg-amber-100/20 px-1 rounded text-amber-100">acn.link</code>) require real DNS
              records and SSL certificates to work globally. Our sandbox securely routes this preview for you to test
              functionality instantly!
            </p>
          </>
        )
      });
    }

    if (pageLoadStatus === "not_found") {
      notices.push({
        id: "not-found",
        title: "Page Not Available",
        kind: "error",
        body: (
          <p>
            This page is not available yet. Ask the owner to publish it and try again.
          </p>
        )
      });
    }

    if (loadError) {
      notices.push({
        id: "load-error",
        title: "Could Not Load Page",
        kind: "error",
        body: <p>{loadError}</p>
      });
    }

    return notices;
  }, [mode, pageLoadStatus, loadError]);

  const hasPageNotices = pageNotices.length > 0;
  const hasErrorNotice = pageNotices.some((notice) => notice.kind === "error");

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const displayTitle = customDetails?.title || pageTitle;
  const displayHandle = formatDisplayHandle(customDetails?.handle, displayTitle);
  const displayBio = customDetails?.bio || pageBio;
  const coverPhoto =
    customDetails?.coverPhoto ||
    pageCoverPhoto ||
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800";

  return (
    <div className={`acn-public-bio-page acn-bio-page-theme-${pageTheme} flex flex-col items-center justify-start font-sans`}>
      {hasPageNotices && (
        <div className="acn-public-notice" ref={noticeRef}>
          <button
            type="button"
            className="acn-public-notice__trigger"
            onClick={() => setShowNoticePanel((open) => !open)}
            aria-label="View page notices"
            aria-expanded={showNoticePanel}
            aria-haspopup="dialog"
          >
            <AlertCircle className="acn-public-notice__icon" />
            <span
              className={`acn-public-notice__dot${hasErrorNotice ? " acn-public-notice__dot--error" : ""}`}
              aria-hidden
            />
          </button>

          {showNoticePanel && (
            <div className="acn-public-notice__panel" role="dialog" aria-label="Page notices">
              <div className="acn-public-notice__panel-head">
                <span className="acn-public-notice__panel-title">Page notices</span>
                <button
                  type="button"
                  className="acn-public-notice__close"
                  onClick={() => setShowNoticePanel(false)}
                  aria-label="Close notices"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="acn-public-notice__panel-body">
                {pageNotices.map((notice) => (
                  <article
                    key={notice.id}
                    className={`acn-public-notice__item${
                      notice.kind === "error" ? " acn-public-notice__item--error" : " acn-public-notice__item--info"
                    }`}
                  >
                    <h3 className="acn-public-notice__item-title">{notice.title}</h3>
                    <div className="acn-public-notice__item-body">{notice.body}</div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`acn-public-bio-page__card acn-preview-isolate acn-public-bio-page__screen acn-bio-page-theme-${pageTheme} w-full max-w-md`}>
        <div className="acn-phone-preview__cover acn-public-bio-page__cover">
          <img
            src={coverPhoto}
            alt="Hero Cover"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="acn-phone-preview__cover-fade" />
        </div>

        <div className="acn-phone-preview__body acn-public-bio-page__body">
          <div className="acn-public-bio-page__profile">
            <h1 className="acn-public-bio-page__title font-display">{displayTitle}</h1>
            <p className="acn-public-bio-page__handle">{displayHandle}</p>
          </div>

          {displayBio && <p className="acn-phone-preview__bio-text">{displayBio}</p>}

          <div className="acn-phone-preview__blocks space-y-4">
          {pageLoadStatus === "loading" && (
            <p className="acn-public-bio-page__loading rounded-2xl border p-4 text-center text-xs">
              Loading this page…
            </p>
          )}
          {blocks.map((block) => {
            switch (block.type) {
              case "Header":
                return (
                  <h2 key={block.id} className="acn-phone-preview__block-heading font-display text-center pt-2 leading-snug">
                    {block.label}
                  </h2>
                );

              case "Text":
                return (
                  <p key={block.id} className="acn-phone-preview__block-text text-center p-3.5 rounded-2xl leading-relaxed">
                    {block.label}
                  </p>
                );

              case "Button":
              case "Deep Link":
                return (
                  <button
                    key={block.id}
                    onClick={() => {
                      trackAction("click", `Button: ${block.label}`);
                      openExternalLink(block.value || "");
                    }}
                    style={getLinkButtonStyle(block as any)}
                    className={`w-full font-bold py-3.5 px-4 rounded-2xl flex items-center justify-between transition-all active:scale-98 acn-bio-link-btn ${
                      isDefaultBrightLink(block as any)
                        ? "shadow-md shadow-violet-500/30 border-0"
                        : "shadow-sm border border-slate-200/85"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate text-left">
                      {(block as any).iconEmoji && <span className="text-base">{(block as any).iconEmoji}</span>}
                      <div>
                        <span className="acn-bio-link-label block font-bold leading-tight">{block.label}</span>
                        {(block as any).subtext && <span className="acn-bio-link-subtext block font-medium opacity-70 mt-0.5">{(block as any).subtext}</span>}
                      </div>
                    </div>
                    {(block as any).showArrow !== "No" && (
                      <ArrowRight className="h-4 w-4 shrink-0" style={{ color: getLinkArrowColor(block as any) }} />
                    )}
                  </button>
                );

              case "Socials":
                return (
                  <div key={block.id} className="flex items-center justify-center gap-4 py-2">
                    <span
                      onClick={() => {
                        trackAction("click", "Social Icon: Website");
                        const webBlock = blocks.find(b => b.type === "Button" && b.value && b.value.startsWith("http"));
                        const targetUrl = webBlock ? webBlock.value : "https://google.com";
                        window.open(targetUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="p-3 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-full cursor-pointer transition-all shadow-sm active:scale-90"
                    >
                      🌐
                    </span>
                    <span
                      onClick={() => {
                        trackAction("click", "Social Icon: WhatsApp");
                        const whatsappBlock = blocks.find(b => b.type === "WhatsApp" && b.value);
                        const whatsappVal = whatsappBlock ? whatsappBlock.value : "+919876543210";
                        openWhatsAppLink(whatsappVal);
                      }}
                      className="p-3 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-full cursor-pointer transition-all shadow-sm active:scale-90"
                    >
                      💬
                    </span>
                    <span
                      onClick={() => {
                        trackAction("click", "Social Icon: Instagram");
                        const targetUrl = "https://instagram.com";
                        window.open(targetUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="p-3 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-full cursor-pointer transition-all shadow-sm active:scale-90"
                    >
                      📸
                    </span>
                  </div>
                );

              case "Shop": {
                const shopProducts = (block as any).products || defaultProductsList;
                const align = (block as any).alignment || "Centre";
                const alignClass = align === "Left" ? "text-left" : align === "Right" ? "text-right" : "text-center";
                const symbol = getCurrencySymbol((block as any).currency);
                const cardBg = (block as any).bgColor || "#10B981";
                const textCol = (block as any).textColor || "#FFFFFF";

                return (
                  <div key={block.id} className="space-y-3 text-left pt-2 w-full">
                    <span className={`text-xs font-bold text-slate-500 block tracking-wider uppercase ${alignClass}`}>
                      {block.label}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {shopProducts.map((p: any, idx: number) => (
                        <a
                          key={p.id || idx}
                          href={p.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            trackAction("click", `Shop Product: ${p.name}`);
                          }}
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between hover:border-slate-300"
                        >
                          <div className="h-32 bg-white flex items-center justify-center p-3">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="h-full object-contain max-h-full max-w-full"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="text-xs text-slate-400 font-bold">No Image</div>
                            )}
                          </div>
                          <div className="p-3 text-center border-t border-slate-100 flex flex-col items-center justify-center min-h-[56px]" style={{ backgroundColor: cardBg, color: textCol }}>
                            <p className="font-bold text-xs truncate max-w-full leading-tight">{p.name || "Product"}</p>
                            <p className="font-extrabold text-xs mt-0.5 opacity-90">{symbol}{p.price || "0"}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              }

              case "Coupon":
                return (
                  <div
                    key={block.id}
                    style={{
                      backgroundColor: (block as any).bgColor || "rgb(239 246 255)",
                      color: (block as any).textColor || "#1e3a8a"
                    }}
                    className="border border-blue-100 p-4 rounded-2xl relative overflow-hidden space-y-2 text-left shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono opacity-80" style={{ color: (block as any).textColor || "#2563eb" }}>Special Offer Coupon</span>
                      <span className="text-[8px] text-white px-2 py-0.5 rounded-full font-black uppercase" style={{ backgroundColor: (block as any).textColor || "#2563eb", color: (block as any).bgColor || "#FFFFFF" }}>
                        {(block as any).discount || "COPYABLE"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-sm tracking-widest bg-white/40 py-1 px-3 rounded-lg border border-dashed border-slate-300/60" style={{ color: (block as any).textColor || "#1d4ed8", borderColor: (block as any).textColor || "#bfdbfe" }}>
                        {block.value || "MARVELTOYCODE007"}
                      </span>
                      <button
                        onClick={() => {
                          trackAction("click", `Copied Coupon: ${block.value || "MARVELTOYCODE007"}`);
                          navigator.clipboard.writeText(block.value || "MARVELTOYCODE007");
                          triggerToast("🎟️ Coupon copied to clipboard!");
                        }}
                        className="p-1.5 bg-white/50 hover:bg-white/80 rounded-lg transition-colors"
                        style={{ color: (block as any).textColor || "#1d4ed8" }}
                        title="Copy Coupon"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[10px] opacity-90 leading-tight">{block.label}</p>
                  </div>
                );

              case "Countdown":
                return (
                  <div key={block.id} className="bg-rose-50/70 border border-rose-100 p-3.5 rounded-2xl text-center space-y-2 shadow-sm">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest block font-mono">Limited Campaign Ends In</span>
                    <div className="flex items-center justify-center gap-1.5 text-rose-700">
                      <div className="bg-white border border-rose-100 p-1.5 rounded-xl min-w-[40px] text-center shadow-sm">
                        <span className="font-extrabold text-sm block leading-none text-rose-700">
                          {String(countdown.days).padStart(2, "0")}
                        </span>
                        <span className="text-[7px] text-rose-500 block tracking-wide uppercase mt-0.5">DAYS</span>
                      </div>
                      <span className="text-rose-400 font-bold">:</span>
                      <div className="bg-white border border-rose-100 p-1.5 rounded-xl min-w-[40px] text-center shadow-sm">
                        <span className="font-extrabold text-sm block leading-none text-rose-700">
                          {String(countdown.hrs).padStart(2, "0")}
                        </span>
                        <span className="text-[7px] text-rose-500 block tracking-wide uppercase mt-0.5">HRS</span>
                      </div>
                      <span className="text-rose-400 font-bold">:</span>
                      <div className="bg-white border border-rose-100 p-1.5 rounded-xl min-w-[40px] text-center shadow-sm">
                        <span className="font-extrabold text-sm block leading-none text-rose-700">
                          {String(countdown.mins).padStart(2, "0")}
                        </span>
                        <span className="text-[7px] text-rose-500 block tracking-wide uppercase mt-0.5">MIN</span>
                      </div>
                      <span className="text-rose-400 font-bold">:</span>
                      <div className="bg-white border border-rose-100 p-1.5 rounded-xl min-w-[40px] text-center shadow-sm">
                        <span className="font-extrabold text-sm block leading-none text-rose-700">
                          {String(countdown.secs).padStart(2, "0")}
                        </span>
                        <span className="text-[7px] text-rose-500 block tracking-wide uppercase mt-0.5">SEC</span>
                      </div>
                    </div>
                  </div>
                );

              case "Link Spin":
                return (
                  <button
                    key={block.id}
                    onClick={() => {
                      trackAction("click", `Spin Wheel: ${block.label}`);
                      setSpinResult(null);
                      setIsSpinning(false);
                      setShowSpinWheel(true);
                    }}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-extrabold py-3.5 px-4 rounded-2xl transition-all shadow-md text-sm flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>🎡</span>
                    <span>{block.label}</span>
                  </button>
                );

              case "WhatsApp":
                return (
                  <button
                    key={block.id}
                    onClick={() => {
                      trackAction("click", `WhatsApp: ${block.label}`);
                      openWhatsAppLink(block.value || "+919876543210");
                    }}
                    style={{
                      backgroundColor: (block as any).bgColor || "#25D366",
                      color: (block as any).textColor || "#FFFFFF",
                    }}
                    className="w-full font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm active:scale-95 border-0"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate">{block.label}</span>
                  </button>
                );

              case "Smart Form":
                return (
                  <div key={block.id} className="bg-white border border-slate-200 p-4.5 rounded-2xl space-y-2.5 text-left shadow-sm">
                    <span className="font-bold text-[10px] block text-center text-slate-700 uppercase tracking-widest font-mono">{block.label}</span>
                    <div className="space-y-2">
                      <input
                        type="email"
                        required
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <button
                        onClick={() => {
                          if (leadEmail) {
                            trackAction("register", `Smart Form Lead: ${block.label}`, { email: leadEmail });
                            triggerToast(`✅ Subscription Successful! Email saved.`);
                            setLeadEmail("");
                          } else {
                            triggerToast(`❌ Please enter a valid email address.`);
                          }
                        }}
                        className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-md shadow-violet-500/25"
                      >
                        Subscribe
                      </button>
                    </div>
                  </div>
                );

              case "vCard":
                return (
                  <button
                    key={block.id}
                    onClick={() => {
                      trackAction("click", `vCard Contact: ${block.label}`);
                      triggerToast(`🪪 Live Simulation: Downloaded vCard Contact Card directly to phone!`);
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm text-sm active:scale-95 border-0"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{block.label}</span>
                  </button>
                );

              case "Video":
                return (
                  <div key={block.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 transition-colors">
                    <div
                      className="h-44 bg-slate-950 flex items-center justify-center relative group cursor-pointer"
                      onClick={() => {
                        trackAction("click", `Video: ${block.label}`);
                        triggerToast(`🎥 Playing Video Stream: ${block.value || "https://youtube.com"}`);
                      }}
                    >
                      <div className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800')" }} />
                      <div className="absolute h-12 w-12 bg-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md transform group-hover:scale-110 transition-transform">
                        ▶
                      </div>
                    </div>
                    <div className="p-3 text-left">
                      <span className="text-xs font-bold text-slate-800 block truncate">{block.label}</span>
                    </div>
                  </div>
                );

              case "Music":
                return (
                  <div
                    key={block.id}
                    className="bg-gradient-to-r from-violet-500 to-indigo-600 p-4 rounded-2xl text-white shadow-sm flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() => {
                      trackAction("click", `Music Track: ${block.label}`);
                      triggerToast(`🎵 Playing Audio Soundtrack: ${block.value || "Soundtrack"}`);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">🎵</span>
                      <div className="min-w-0 text-left">
                        <span className="font-bold text-xs block truncate">{block.label}</span>
                        <span className="text-[10px] text-indigo-200 block">Theme Track • 3:24</span>
                      </div>
                    </div>
                    <div className="h-9 w-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white shrink-0">
                      ▶
                    </div>
                  </div>
                );

              case "Gallery":
                return (
                  <div key={block.id} className="space-y-2 text-left pt-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">{block.label}</span>
                    <div className="grid grid-cols-3 gap-2">
                      <img onClick={() => { trackAction("click", `Gallery 1: ${block.label}`); triggerToast("🖼️ Opened gallery image 1"); }} src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=300" alt="1" className="h-20 w-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm border border-slate-100" />
                      <img onClick={() => { trackAction("click", `Gallery 2: ${block.label}`); triggerToast("🖼️ Opened gallery image 2"); }} src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=300" alt="2" className="h-20 w-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm border border-slate-100" />
                      <img onClick={() => { trackAction("click", `Gallery 3: ${block.label}`); triggerToast("🖼️ Opened gallery image 3"); }} src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=300" alt="3" className="h-20 w-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm border border-slate-100" />
                    </div>
                  </div>
                );

              case "PDF":
                return (
                  <div
                    key={block.id}
                    className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors cursor-pointer shadow-sm"
                    onClick={() => {
                      trackAction("click", `PDF Download: ${block.label}`);
                      triggerToast(`📄 Opening PDF Document: ${block.value || "catalog.pdf"}`);
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 text-left">
                      <span className="text-2xl">📄</span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs block text-slate-800 truncate">{block.label}</span>
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">PDF Document • 3.2 MB</span>
                      </div>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl font-bold shrink-0">DOWNLOAD</span>
                  </div>
                );

              case "Events":
                return (
                  <div
                    key={block.id}
                    className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors cursor-pointer shadow-sm"
                    onClick={() => {
                      trackAction("click", `Event RSVP: ${block.label}`);
                      triggerToast(`📅 RSVP Registration Saved for Event: ${block.label}`);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 text-left">
                      <div className="bg-violet-50 border border-violet-100 text-violet-600 rounded-xl p-1.5 text-center min-w-[42px] shrink-0 font-bold">
                        <span className="text-[9px] block uppercase leading-none font-mono">JUL</span>
                        <span className="text-sm block leading-none mt-1">20</span>
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs block text-slate-800 truncate">{block.label}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">7:00 PM • Virtual Event</span>
                      </div>
                    </div>
                    <span className="text-xs bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded-xl font-bold shadow-md shadow-violet-500/25 shrink-0">RSVP NOW</span>
                  </div>
                );

              default:
                return (
                  <button
                    key={block.id}
                    onClick={() => {
                      trackAction("click", `Action Block: ${block.label}`);
                      triggerToast(`✨ Action triggered: ${block.label}`);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-2xl text-xs shadow-sm border border-slate-200 transition-colors"
                  >
                    {block.label}
                  </button>
                );
            }
          })}
          </div>

          <div className="acn-bio-page-footer acn-phone-preview__footer">
            <span>Powered by ACN Link</span>
          </div>
        </div>

        {/* Interactive Simulator Toast Overlay */}
        {toast && (
          <div className="absolute bottom-5 left-4 right-4 bg-slate-900/95 border border-slate-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl text-center shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 flex items-center justify-center gap-1.5">
            <span>🔔</span>
            <span className="leading-tight">{toast}</span>
          </div>
        )}

        {/* Dynamic Interactive Link Spin (Lucky Wheel) Game Overlay */}
        {showSpinWheel && (
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-white animate-in fade-in duration-200">
            <button
              onClick={() => setShowSpinWheel(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-1 mb-6">
              <span className="text-xs font-black text-cyan-400 tracking-wider uppercase block">🎁 GROW YOUR SALES</span>
              <h4 className="font-display font-black text-xl">Lucky Wheel Game</h4>
              <p className="text-[11px] text-slate-300">Spin the interactive wheel to win real prizes!</p>
            </div>

            {/* Wheel Wrapper */}
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              {/* Needle/pointer */}
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 z-30 rotate-45 transform shadow-md" />

              {/* Spinner circle using conic gradient */}
              <div
                className={`w-full h-full rounded-full border-4 border-slate-700 relative overflow-hidden shadow-2xl ${
                  isSpinning ? "animate-[spin_0.8s_linear_infinite]" : ""
                }`}
                style={{
                  background: "conic-gradient(#7c3aed 0deg 90deg, #2563EB 90deg 180deg, #10B981 180deg 270deg, #a855f7 270deg 360deg)"
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                  <span className="absolute top-4 text-white font-extrabold text-[9px]">Gift</span>
                  <span className="absolute right-4 text-white font-extrabold text-[9px]">20% OFF</span>
                  <span className="absolute bottom-4 text-white font-extrabold text-[9px]">Try Again</span>
                  <span className="absolute left-4 text-white font-extrabold text-[9px]">Freebie</span>
                </div>
              </div>

              {/* Spin hub */}
              <div className="absolute w-14 h-14 rounded-full bg-white text-slate-900 shadow-lg flex items-center justify-center z-20">
                <span className="text-xs font-black text-slate-950 font-mono">1SMART</span>
              </div>
            </div>

            {spinResult ? (
              <div className="text-center space-y-3.5 animate-in zoom-in-95 duration-200 max-w-xs">
                <p className="text-sm font-black text-green-400">🎉 CONGRATULATIONS! 🎉</p>
                <p className="text-sm font-black text-white">{spinResult}</p>
                <p className="text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-xl font-mono border border-slate-800">Use Code: <span className="font-bold text-cyan-400">LUCKYSPIN20</span></p>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("LUCKYSPIN20");
                      triggerToast("🎟️ Spin coupon code copied!");
                      setShowSpinWheel(false);
                    }}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-xl text-xs font-bold"
                  >
                    Copy Code
                  </button>
                  <button
                    onClick={() => {
                      setSpinResult(null);
                      setIsSpinning(false);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                  >
                    Spin Again
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (isSpinning) return;
                  setIsSpinning(true);
                  setTimeout(() => {
                    setIsSpinning(false);
                    const prizes = [
                      "FREE Superhero Action Figure!",
                      "20% Discount Code!",
                      "Buy 1 Get 1 Free Marvel Poster!",
                      "Free shipping on next order!"
                    ];
                    const won = prizes[Math.floor(Math.random() * prizes.length)];
                    setSpinResult(won);
                  }, 1800);
                }}
                disabled={isSpinning}
                className="px-8 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-slate-950 hover:text-white rounded-2xl text-xs font-black transition-all shadow-lg disabled:opacity-50"
              >
                {isSpinning ? "SPINNING..." : "SPIN THE WHEEL!"}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
