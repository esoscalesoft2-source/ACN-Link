import React, { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { normalizeExternalUrl } from "../../lib/bioBlocks";

export interface FormSuccessOverlayProps {
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

export default function FormSuccessOverlay({
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
}: FormSuccessOverlayProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [useBodyFallback, setUseBodyFallback] = useState(false);

  useEffect(() => {
    if (!open) return;
    const root = findBioScreenRoot(anchorRef?.current ?? null);
    if (root) {
      setPortalRoot(root);
      setUseBodyFallback(false);
      return;
    }
    setPortalRoot(document.body);
    setUseBodyFallback(true);
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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

  const overlay = open ? (
    <div
      className={`acn-form-success-overlay${useBodyFallback ? " acn-form-success-overlay--viewport" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="acn-form-success-title"
      aria-describedby="acn-form-success-message"
    >
      <div className="acn-form-success-overlay__backdrop" aria-hidden />
      <div className="acn-form-success-overlay__panel">
        <div className="acn-form-success-overlay__icon" aria-hidden>
          {emoji}
        </div>
        <h3 id="acn-form-success-title" className="acn-form-success-overlay__title font-display">
          {title}
        </h3>
        <p id="acn-form-success-message" className="acn-form-success-overlay__message">
          {message}
        </p>
        <div className="acn-form-success-overlay__actions">
          {showConnect ? (
            <button
              type="button"
              onClick={handleConnect}
              className="acn-form-success-overlay__btn acn-form-success-overlay__btn--connect"
            >
              {connectLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="acn-form-success-overlay__btn acn-form-success-overlay__btn--ok"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return overlay && portalRoot ? createPortal(overlay, portalRoot) : null;
}
