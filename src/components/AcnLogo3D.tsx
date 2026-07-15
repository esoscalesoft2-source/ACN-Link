import React from "react";
import { Link } from "lucide-react";

type AcnLogo3DSize = "xs" | "sm" | "md" | "lg";

interface AcnLogo3DProps {
  size?: AcnLogo3DSize;
  showLabel?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<AcnLogo3DSize, string> = {
  xs: "acn-logo-3d--xs",
  sm: "acn-logo-3d--sm",
  md: "acn-logo-3d--md",
  lg: "acn-logo-3d--lg"
};

const ICON_SIZE: Record<AcnLogo3DSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7"
};

export default function AcnLogo3D({
  size = "md",
  showLabel = false,
  className = ""
}: AcnLogo3DProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`acn-logo-3d ${SIZE_CLASS[size]}`} aria-hidden>
        <div className="acn-logo-3d__glow" />
        <div className="acn-logo-3d__inner">
          <Link
            className={`${ICON_SIZE[size]} rotate-[-45deg] acn-logo-3d__icon`}
            strokeWidth={2.5}
          />
        </div>
      </div>
      {showLabel && (
        <span className="acn-brand-text font-sans font-bold text-sm tracking-tight uppercase leading-none">
          ACN Link
        </span>
      )}
    </div>
  );
}
