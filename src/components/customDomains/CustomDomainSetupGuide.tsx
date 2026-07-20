import type { CustomDomainPlatformConfig } from "../../types";

interface CustomDomainSetupGuideProps {
  config: CustomDomainPlatformConfig | null;
  hasPages: boolean;
  onConnect: () => void;
}

export default function CustomDomainSetupGuide({
  config,
  hasPages,
  onConnect
}: CustomDomainSetupGuideProps) {
  return (
    <div className="acn-custom-domain-guide">
      <h3 className="acn-custom-domain-guide__title">Connect your first domain</h3>
      <p className="acn-custom-domain-guide__intro">
        Own a domain from GoDaddy, Namecheap, Cloudflare, Hostinger, or anywhere else? Connect it here so visitors
        open your bio page on your brand address instead of the default ACN Link URL.
      </p>
      <button
        type="button"
        onClick={onConnect}
        disabled={!hasPages}
        className="acn-custom-domain-guide__cta acn-btn-accent inline-flex items-center gap-2 disabled:opacity-50"
      >
        Connect Domain
      </button>
      {!hasPages && (
        <p className="acn-custom-domain-guide__hint">Publish a bio page first, then return here.</p>
      )}
      {config?.aRecordTarget && (
        <p className="acn-custom-domain-guide__dns mt-3">
          Root domain: A for <code>@</code> → <code>{config.aRecordTarget}</code>.
          Subdomain: CNAME → <code>{config.cnameTarget || config.platformUrl || "acnlink.mindflo.today"}</code> only.
        </p>
      )}
    </div>
  );
}
