import React from "react";
import type { QRCodeItem } from "../../types";

export function QrBrandMark({
  logo,
  logoUrl,
  size = "md"
}: {
  logo?: QRCodeItem["designLogo"];
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  if (logo !== "custom" || !logoUrl) return null;

  return (
    <div className={`acn-qr-brand-mark acn-qr-brand-mark--${size}`} aria-hidden>
      <img src={logoUrl} alt="" className="acn-qr-brand-mark__img" />
    </div>
  );
}
