import React, { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { MessageCircle } from "lucide-react";
import { normalizeExternalUrl, type SocialLinkItem } from "../../lib/bioBlocks";

export interface FormSuccessPageProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  emoji?: string;
  buttonLabel: string;
  connectLabel?: string;
  connectUrl?: string;
  onConnect?: (url: string) => void;
  anchorRef?: RefObject<HTMLElement | null>;
  /** Social platforms for public visitors to follow / join */
  socialLinks?: SocialLinkItem[];
  whatsappCommunityUrl?: string;
  whatsappCommunityLabel?: string;
  promoTitle?: string;
  promoMessage?: string;
  businessName?: string;
  businessDetails?: string;
}

function findBioScreenRoot(start: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = start;
  while (node) {
    if (
      node.classList.contains("acn-phone-preview__screen") ||
      node.classList.contains("acn-public-bio-page__screen")
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Full next-page thank you after form submit (not a popup/dialog). */
export default function FormSuccessPage({
  open,
  onClose,
  title,
  message,
  emoji = "🙏",
  buttonLabel,
  connectLabel,
  connectUrl,
  onConnect,
  anchorRef,
  socialLinks = [],
  whatsappCommunityUrl,
  whatsappCommunityLabel,
  promoTitle,
  promoMessage,
  businessName,
  businessDetails
}: FormSuccessPageProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      setPortalRoot(null);
      return;
    }
    setPortalRoot(findBioScreenRoot(anchorRef?.current ?? null));
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open || !portalRoot) return;
    const prevOverflow = portalRoot.style.overflow;
    portalRoot.style.overflow = "hidden";
    portalRoot.scrollTop = 0;
    return () => {
      portalRoot.style.overflow = prevOverflow;
    };
  }, [open, portalRoot]);

  if (!open) return null;

  const resolvedConnectUrl = connectUrl?.trim() ? normalizeExternalUrl(connectUrl.trim()) : "";
  const showConnect = Boolean(connectLabel?.trim() && resolvedConnectUrl);
  const waUrl = whatsappCommunityUrl?.trim()
    ? normalizeExternalUrl(whatsappCommunityUrl.trim())
    : "";
  const showWhatsApp = Boolean(waUrl);
  const showPromo = Boolean(promoTitle?.trim() || promoMessage?.trim());
  const showBusiness = Boolean(businessName?.trim() || businessDetails?.trim());
  const links = socialLinks.filter((link) => link.url?.trim());

  const openLink = (url: string, label?: string) => {
    if (onConnect) {
      onConnect(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleConnect = () => {
    if (!resolvedConnectUrl) return;
    openLink(resolvedConnectUrl, connectLabel);
  };

  const page = (
    <div
      className={`acn-form-success-page${portalRoot ? "" : " acn-form-success-page--inline"}`}
      role="region"
      aria-label="Thank you"
    >
      <div className="acn-form-success-page__scroll">
        <div className="acn-form-success-page__content">
          <div className="acn-form-success-page__icon" aria-hidden>
            {emoji}
          </div>
          <h3 className="acn-form-success-page__title font-display">{title}</h3>
          <p className="acn-form-success-page__message">{message}</p>

          {showPromo ? (
            <div className="acn-form-success-page__promo">
              {promoTitle?.trim() ? (
                <p className="acn-form-success-page__promo-title">{promoTitle}</p>
              ) : null}
              {promoMessage?.trim() ? (
                <p className="acn-form-success-page__promo-body">{promoMessage}</p>
              ) : null}
            </div>
          ) : null}

          {showBusiness ? (
            <div className="acn-form-success-page__business">
              {businessName?.trim() ? (
                <p className="acn-form-success-page__business-name">{businessName}</p>
              ) : null}
              {businessDetails?.trim() ? (
                <p className="acn-form-success-page__business-details">{businessDetails}</p>
              ) : null}
            </div>
          ) : null}

          {showWhatsApp ? (
            <button
              type="button"
              onClick={() => openLink(waUrl, whatsappCommunityLabel || "WhatsApp")}
              className="acn-form-success-page__btn acn-form-success-page__btn--whatsapp"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              <span>{whatsappCommunityLabel?.trim() || "Join WhatsApp Community"}</span>
            </button>
          ) : null}

          {showConnect ? (
            <button
              type="button"
              onClick={handleConnect}
              className="acn-form-success-page__btn acn-form-success-page__btn--connect"
            >
              {connectLabel}
            </button>
          ) : null}

          {links.length > 0 ? (
            <div className="acn-form-success-page__socials">
              <p className="acn-form-success-page__socials-label">Follow us</p>
              <div className="acn-form-success-page__socials-row">
                {links.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => openLink(normalizeExternalUrl(link.url), link.label)}
                    className="acn-form-success-page__social-chip"
                    style={{ borderColor: `${link.brandColor}55`, color: link.brandColor }}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="acn-form-success-page__actions">
            <button
              type="button"
              onClick={onClose}
              className="acn-form-success-page__btn acn-form-success-page__btn--ok"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (portalRoot) return createPortal(page, portalRoot);
  return page;
}
