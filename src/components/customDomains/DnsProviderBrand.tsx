import { getProviderBranding } from "../../lib/dnsProviderBranding";

interface DnsProviderBrandProps {
  providerId: string;
  providerName: string;
  domainName: string;
}

export default function DnsProviderBrand({ providerId, providerName, domainName }: DnsProviderBrandProps) {
  const branding = getProviderBranding(providerId, providerName);

  return (
    <div className="acn-domain-wizard__provider-brand-block">
      <p className="acn-domain-wizard__provider-domain">
        Domain: <strong>{domainName}</strong>
      </p>
      <div className="acn-domain-wizard__provider-logo-wrap">
        <img
          src={branding.logoUrl}
          alt={`${branding.displayName} logo`}
          className="acn-domain-wizard__provider-logo-img"
          width={160}
          height={48}
        />
      </div>
      <h2 className="acn-domain-wizard__provider-title">{branding.displayName}</h2>
    </div>
  );
}
