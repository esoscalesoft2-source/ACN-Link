import { useMemo, useState } from "react";
import type { CustomDomainDnsRecordTemplate } from "../../types";
import { buildDnsRecordSet, getCustomDomainKind } from "../../lib/customDomainDns";
import DnsRecordsTable from "./DnsRecordsTable";

interface DomainDnsPanelProps {
  domainName: string;
  records: CustomDomainDnsRecordTemplate[];
  aRecordTarget: string;
  cnameTarget?: string;
  ownershipVerification?: Record<string, unknown> | null;
}

export default function DomainDnsPanel({
  domainName,
  records,
  aRecordTarget,
  cnameTarget,
  ownershipVerification
}: DomainDnsPanelProps) {
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const kind = getCustomDomainKind(domainName);

  const ownershipRecord =
    ownershipVerification &&
    (() => {
      const type = String(ownershipVerification.type || "txt").toLowerCase();
      if (type !== "txt") return null;
      const name = String(ownershipVerification.name || ownershipVerification.host || "").trim();
      const value = String(ownershipVerification.value || "").trim();
      if (!name || !value) return null;
      return {
        id: "ownership-txt",
        type: "TXT" as const,
        hostLabel: name,
        hostDisplay: name,
        value
      };
    })();

  const displayRecords = useMemo(() => {
    const fromProps =
      records.length > 0 ? records : buildDnsRecordSet(domainName, aRecordTarget, { cnameTarget }).records;
    return ownershipRecord ? [...fromProps, ownershipRecord] : fromProps;
  }, [records, domainName, aRecordTarget, cnameTarget, ownershipRecord]);

  const copyValue = async (copyId: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIds((current) => new Set([...current, copyId]));
    } catch {
      // ignore
    }
  };

  return (
    <div className="acn-domains-lovable__dns-panel">
      <p className="acn-domains-lovable__dns-panel-lead">
        {kind === "root" ? (
          <>
            Root domain — add one <strong>A</strong> record: <code>@</code> → <code>{aRecordTarget}</code>.
          </>
        ) : (
          <>
            Subdomain — add one <strong>CNAME</strong> to{" "}
            <code>{cnameTarget || "acnlink.mindflo.today"}</code>. Do not use an A record.
          </>
        )}
      </p>
      <DnsRecordsTable
        records={displayRecords}
        copiedIds={copiedIds}
        onCopy={(copyId, value) => void copyValue(copyId, value)}
        compact
      />
      {ownershipRecord && (
        <p className="mt-2 text-xs text-amber-800">
          Cloudflare ownership TXT — add this if SSL stays on &quot;Provisioning&quot; after your records are correct.
        </p>
      )}
    </div>
  );
}
