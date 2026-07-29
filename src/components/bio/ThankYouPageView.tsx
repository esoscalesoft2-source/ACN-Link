import React, { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { BlockRecord } from "../../lib/bioBlocks";
import { filterVisibleBioBlocks, normalizeExternalUrl } from "../../lib/bioBlocks";
import BlockRenderer, { type BlockRendererHandlers } from "./BlockRenderer";

export type ThankYouPageViewProps = {
  open: boolean;
  title?: string;
  message?: string;
  emoji?: string;
  blocks?: BlockRecord[];
  onBack: () => void;
  /** Compact phone preview vs live public */
  compact?: boolean;
  handlers?: BlockRendererHandlers;
  displayTitle?: string;
};

export const DEFAULT_THANK_YOU_MESSAGE =
  "Thanks for connecting with us on ACN Link. Your details were received — our team will follow up shortly.";

export const DEFAULT_THANK_YOU_BRAND =
  "ACN Link helps you share your bio, capture leads, and grow your brand from one page.";

const DEFAULT_BLOCKS: BlockRecord[] = [
  {
    id: "ty_header",
    type: "Header",
    label: "Thank you!",
    value: "Thank you!"
  },
  {
    id: "ty_text",
    type: "Text",
    label: DEFAULT_THANK_YOU_BRAND,
    value: DEFAULT_THANK_YOU_BRAND
  },
  {
    id: "ty_cta",
    type: "Button",
    label: "Back to page",
    value: "",
    bgColor: "#ec4899",
    textColor: "#FFFFFF"
  }
];

function formatStatusTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false });
}

function DeviceStatusBar() {
  const [time, setTime] = useState(() => formatStatusTime());

  useEffect(() => {
    const tick = () => setTime(formatStatusTime());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="acn-thankyou-page__status" aria-hidden>
      <span className="acn-thankyou-page__status-time">{time}</span>
      <span className="acn-thankyou-page__status-icons">
        <svg className="acn-thankyou-page__status-icon" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="7" width="3" height="5" rx="0.6" />
          <rect x="5" y="5" width="3" height="7" rx="0.6" />
          <rect x="10" y="2.5" width="3" height="9.5" rx="0.6" />
          <rect x="15" y="0" width="3" height="12" rx="0.6" opacity="0.35" />
        </svg>
        <svg className="acn-thankyou-page__status-icon" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 3.2c1.9 0 3.6.7 4.9 1.9l1.1-1.2A8.4 8.4 0 0 0 8 1.1 8.4 8.4 0 0 0 2 3.9l1.1 1.2A6.6 6.6 0 0 1 8 3.2zm0 3.1c1 0 1.9.4 2.6 1l1.1-1.2A5.1 5.1 0 0 0 8 4.8a5.1 5.1 0 0 0-3.7 1.3l1.1 1.2A3.5 3.5 0 0 1 8 6.3zm0 4.6a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z" />
        </svg>
        <span className="acn-thankyou-page__status-battery">
          <span className="acn-thankyou-page__status-battery-level" />
          <span className="acn-thankyou-page__status-battery-cap" />
        </span>
        <span className="acn-thankyou-page__status-pct">100%</span>
      </span>
    </div>
  );
}

/** Native-style 2nd page after form submit — not a popup. Back returns to the bio page. */
export default function ThankYouPageView({
  open,
  title = "Thank You",
  message,
  emoji = "✓",
  blocks,
  onBack,
  compact = false,
  handlers = {},
  displayTitle
}: ThankYouPageViewProps) {
  if (!open) return null;

  const visible = filterVisibleBioBlocks(blocks?.length ? blocks : DEFAULT_BLOCKS);
  const heroTitle =
    (typeof visible[0]?.label === "string" && visible[0].type === "Header"
      ? visible[0].label
      : null) || "Thank you!";
  const afterHero = visible[0]?.type === "Header" ? visible.slice(1) : visible;

  const ctaIndex = [...afterHero]
    .map((b, i) => ({ b, i }))
    .reverse()
    .find(({ b }) => b.type === "Button")?.i;
  const ctaBlock = ctaIndex != null ? afterHero[ctaIndex] : null;

  const bodyBlocks = afterHero.filter((_, i) => (ctaIndex != null ? i !== ctaIndex : true));

  const handleCta = () => {
    if (!ctaBlock) return;
    const openThanks =
      ctaBlock.openThanksPage === true ||
      ctaBlock.openThanksPage === "Yes" ||
      ctaBlock.openThanksPage === "true";
    if (openThanks) return;
    const raw = String(ctaBlock.value || "").trim();
    const url = raw ? normalizeExternalUrl(raw) : "";
    if (url && url !== "https://" && handlers.onExternalLink) {
      handlers.onExternalLink(url, ctaBlock.label);
      return;
    }
    if (url && url !== "https://") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    onBack();
  };

  return (
    <div
      className={`acn-thankyou-page ${compact ? "acn-thankyou-page--compact" : "acn-thankyou-page--public"}`}
      role="region"
      aria-labelledby="acn-thankyou-title"
    >
      <DeviceStatusBar />

      <header className="acn-thankyou-page__nav">
        <button
          type="button"
          onClick={onBack}
          className="acn-thankyou-page__back"
          aria-label="Back to page"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2.4} />
        </button>
        <h2 id="acn-thankyou-title" className="acn-thankyou-page__nav-title">
          {title}
        </h2>
        <span className="acn-thankyou-page__nav-spacer" aria-hidden />
      </header>

      <div className="acn-thankyou-page__scroll">
        <div className="acn-thankyou-page__hero">
          <div className="acn-thankyou-page__hero-art" aria-hidden>
            <span className="acn-thankyou-page__spark acn-thankyou-page__spark--1" />
            <span className="acn-thankyou-page__spark acn-thankyou-page__spark--2" />
            <span className="acn-thankyou-page__spark acn-thankyou-page__spark--3" />
            <span className="acn-thankyou-page__balloon acn-thankyou-page__balloon--a" />
            <span className="acn-thankyou-page__balloon acn-thankyou-page__balloon--b" />
            <span className="acn-thankyou-page__balloon acn-thankyou-page__balloon--c" />
            <span className="acn-thankyou-page__confetti" />
            <div className="acn-thankyou-page__check">{emoji === "✓" ? "✓" : emoji}</div>
          </div>
          <h3 className="acn-thankyou-page__heading">{heroTitle}</h3>
          {message ? <p className="acn-thankyou-page__message">{message}</p> : null}
        </div>

        {bodyBlocks.length > 0 ? (
          <div className="acn-thankyou-page__blocks">
            {bodyBlocks.map((block) => (
              <div key={block.id} className="acn-thankyou-page__block" data-block-type={block.type}>
                <BlockRenderer
                  block={block}
                  mode="live"
                  context={{ compact: true, displayTitle }}
                  handlers={handlers}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {ctaBlock ? (
        <div className="acn-thankyou-page__footer">
          <button
            type="button"
            className="acn-thankyou-page__cta"
            style={{
              background: String(ctaBlock.bgColor || "#ec4899"),
              color: String(ctaBlock.textColor || "#FFFFFF")
            }}
            onClick={handleCta}
          >
            {ctaBlock.label || "Continue"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function createDefaultThankYouBlocks(): BlockRecord[] {
  return [
    {
      id: `ty_h_${Date.now()}`,
      type: "Header",
      label: "Thank you!",
      value: "Thank you!"
    },
    {
      id: `ty_t_${Date.now() + 1}`,
      type: "Text",
      label: DEFAULT_THANK_YOU_BRAND,
      value: DEFAULT_THANK_YOU_BRAND
    },
    {
      id: `ty_btn_${Date.now() + 2}`,
      type: "Button",
      label: "Back to page",
      value: "",
      bgColor: "#ec4899",
      textColor: "#FFFFFF"
    }
  ];
}
