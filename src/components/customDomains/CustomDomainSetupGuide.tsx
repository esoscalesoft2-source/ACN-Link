import { Plus } from "lucide-react";
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
  const steps =
    config?.steps?.length
      ? config.steps
      : [
          "Connect your hostname in ACN Link and pick the published page.",
          "Add a CNAME at your DNS provider.",
          "Click Check DNS and SSL."
        ];

  return (
    <div className="acn-custom-domain-guide">
      <h3 className="acn-custom-domain-guide__title">First test — connect your domain</h3>
      <p className="acn-custom-domain-guide__intro">
        Follow these steps once with a domain you control (e.g. links.yourbrand.com). After that, the
        same flow works for every end user in production.
      </p>
      <ol className="acn-custom-domain-guide__steps">
        {steps.map((step, index) => (
          <li key={index}>
            <span className="acn-custom-domain-guide__num">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {config?.cnameTarget && (
        <p className="acn-custom-domain-guide__cname">
          DNS target to copy: <code className="font-mono">{config.cnameTarget}</code>
        </p>
      )}
      <button
        type="button"
        onClick={onConnect}
        disabled={!hasPages}
        className="acn-custom-domain-guide__cta acn-btn-accent inline-flex items-center gap-2 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Start — Connect Domain
      </button>
      {!hasPages && (
        <p className="acn-custom-domain-guide__hint">Publish a bio page first, then return here.</p>
      )}
    </div>
  );
}
