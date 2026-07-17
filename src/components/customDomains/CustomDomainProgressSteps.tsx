import { Check, Circle } from "lucide-react";
import type { CustomDomain } from "../../types";

interface CustomDomainProgressStepsProps {
  domain: CustomDomain;
  onDnsSetup?: () => void;
  onVerify?: () => void;
  onOpenLive?: () => void;
}

type StepState = "done" | "current" | "upcoming";

function getStepStates(domain: CustomDomain): StepState[] {
  const { status } = domain;

  if (status === "Verified") {
    return ["done", "done", "done", "done"];
  }
  if (status === "Provisioning SSL") {
    return ["done", "done", "current", "upcoming"];
  }
  if (status === "DNS Verified") {
    return ["done", "done", "current", "upcoming"];
  }
  if (status === "Error") {
    return ["done", "current", "upcoming", "upcoming"];
  }
  return ["done", "current", "upcoming", "upcoming"];
}

const STEPS = [
  { key: "connect", label: "Connected in ACN Link" },
  { key: "dns", label: "CNAME at DNS provider" },
  { key: "ssl", label: "Check DNS & SSL" },
  { key: "live", label: "Live with HTTPS" }
] as const;

export default function CustomDomainProgressSteps({
  domain,
  onDnsSetup,
  onVerify,
  onOpenLive
}: CustomDomainProgressStepsProps) {
  const states = getStepStates(domain);

  return (
    <ol className="acn-domain-progress">
      {STEPS.map((step, index) => {
        const state = states[index];
        const isDone = state === "done";
        const isCurrent = state === "current";

        return (
          <li
            key={step.key}
            className={`acn-domain-progress__step acn-domain-progress__step--${state}`}
          >
            <span className="acn-domain-progress__marker" aria-hidden>
              {isDone ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            </span>
            <span className="acn-domain-progress__label">{step.label}</span>
            {isCurrent && step.key === "dns" && onDnsSetup && (
              <button type="button" className="acn-domain-progress__action" onClick={onDnsSetup}>
                Show DNS record
              </button>
            )}
            {isCurrent && step.key === "ssl" && onVerify && (
              <button type="button" className="acn-domain-progress__action" onClick={onVerify}>
                Verify now
              </button>
            )}
            {isDone && step.key === "live" && onOpenLive && (
              <button type="button" className="acn-domain-progress__action" onClick={onOpenLive}>
                Open site
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
