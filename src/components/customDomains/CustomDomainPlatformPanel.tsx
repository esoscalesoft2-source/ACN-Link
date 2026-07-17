import { CheckCircle, Loader2, Shield, XCircle } from "lucide-react";
import type { CustomDomain, CustomDomainPlatformConfig } from "../../types";

interface CustomDomainPlatformPanelProps {
  config: CustomDomainPlatformConfig | null;
  loading: boolean;
  error: string | null;
  domains: CustomDomain[];
  onRetry: () => void;
}

function countVerified(domains: CustomDomain[]) {
  return domains.filter((domain) => domain.status === "Verified").length;
}

export default function CustomDomainPlatformPanel({
  config,
  loading,
  error,
  domains,
  onRetry
}: CustomDomainPlatformPanelProps) {
  if (loading) {
    return (
      <div className="acn-custom-domain-platform acn-custom-domain-platform--loading">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
        <span className="text-sm text-slate-600">Checking platform custom-domain setup…</span>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="acn-custom-domain-platform acn-custom-domain-platform--error">
        <XCircle className="h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm">Could not load platform domain settings</p>
          <p className="text-xs mt-0.5 opacity-90">{error || "Try again in a moment."}</p>
        </div>
        <button type="button" onClick={onRetry} className="text-xs font-bold underline shrink-0">
          Retry
        </button>
      </div>
    );
  }

  const selfServe = config.selfServeEnabled;
  const verifiedCount = countVerified(domains);

  return (
    <div
      className={`acn-custom-domain-platform ${
        selfServe ? "acn-custom-domain-platform--ready" : "acn-custom-domain-platform--manual"
      }`}
    >
      <div className="acn-custom-domain-platform__head">
        <div className="acn-custom-domain-platform__icon">
          <Shield className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="acn-custom-domain-platform__title">
            {selfServe ? "Self-serve custom domains — active" : "Manual mode — admin setup required"}
          </p>
          <p className="acn-custom-domain-platform__subtitle">
            CNAME target: <code className="font-mono text-xs">{config.cnameTarget}</code>
            {selfServe && " · HTTPS automatic for every user"}
          </p>
        </div>
        <span
          className={`acn-custom-domain-platform__badge ${
            selfServe ? "acn-custom-domain-platform__badge--ok" : "acn-custom-domain-platform__badge--warn"
          }`}
        >
          {selfServe ? "Production ready" : "Setup incomplete"}
        </span>
      </div>

      <div className="acn-custom-domain-platform__grid">
        <div className="acn-custom-domain-platform__check">
          <CheckCircle className={`h-4 w-4 ${selfServe ? "text-emerald-600" : "text-slate-300"}`} />
          <span>Cloudflare API configured</span>
        </div>
        <div className="acn-custom-domain-platform__check">
          <CheckCircle className={`h-4 w-4 ${selfServe ? "text-emerald-600" : "text-slate-300"}`} />
          <span>Automatic SSL ({selfServe ? "on" : "off"})</span>
        </div>
        <div className="acn-custom-domain-platform__check">
          <CheckCircle className={`h-4 w-4 ${verifiedCount > 0 ? "text-emerald-600" : "text-slate-300"}`} />
          <span>
            {verifiedCount > 0
              ? `${verifiedCount} domain${verifiedCount === 1 ? "" : "s"} live with HTTPS`
              : "No verified domains yet — run a test below"}
          </span>
        </div>
        <div className="acn-custom-domain-platform__check">
          <CheckCircle className={`h-4 w-4 ${!config.workerRequired ? "text-emerald-600" : "text-slate-300"}`} />
          <span>{config.workerRequired ? "Per-domain Worker still needed" : "No manual Worker per customer"}</span>
        </div>
      </div>

      {selfServe ? (
        <p className="acn-custom-domain-platform__note acn-custom-domain-platform__note--ok">
          <strong>For managers:</strong> Every user can click Connect Domain, add one CNAME at their DNS
          provider, and verify — you do not need to log into Cloudflare for each customer domain.
        </p>
      ) : (
        <p className="acn-custom-domain-platform__note acn-custom-domain-platform__note--warn">
          Set <code className="font-mono">CLOUDFLARE_ZONE_ID</code> and{" "}
          <code className="font-mono">CLOUDFLARE_API_TOKEN</code> on Railway, enable Cloudflare for SaaS on{" "}
          <code className="font-mono">mindflo.today</code>, then redeploy.
        </p>
      )}
    </div>
  );
}
