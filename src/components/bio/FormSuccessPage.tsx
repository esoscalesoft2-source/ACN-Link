import React, { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { normalizeExternalUrl } from "../../lib/bioBlocks";

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
  anchorRef
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

  const handleConnect = () => {
    if (!resolvedConnectUrl) return;
    if (onConnect) {
      onConnect(resolvedConnectUrl);
      return;
    }
    window.open(resolvedConnectUrl, "_blank", "noopener,noreferrer");
  };

  const page = (
    <div
      className={`acn-form-success-page${portalRoot ? "" : " acn-form-success-page--inline"}`}
      role="region"
      aria-label="Thank you"
    >
      <div className="acn-form-success-page__content">
        <div className="acn-form-success-page__icon" aria-hidden>
          {emoji}
        </div>
        <h3 className="acn-form-success-page__title font-display">{title}</h3>
        <p className="acn-form-success-page__message">{message}</p>
        <div className="acn-form-success-page__actions">
          {showConnect ? (
            <button
              type="button"
              onClick={handleConnect}
              className="acn-form-success-page__btn acn-form-success-page__btn--connect"
            >
              {connectLabel}
            </button>
          ) : null}
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
  );

  if (portalRoot) return createPortal(page, portalRoot);
  return page;
}
