import type { CustomDomainDnsRecordTemplate } from "../../types";

interface DomainDnsPanelProps {
  records: CustomDomainDnsRecordTemplate[];
  aRecordTarget: string;
}

export default function DomainDnsPanel({ records, aRecordTarget }: DomainDnsPanelProps) {
  return (
    <div className="acn-domains-lovable__dns-panel">
      <p className="acn-domains-lovable__dns-panel-lead">
        Add these records at your DNS provider. Root domains use A records pointing to{" "}
        <code>{aRecordTarget}</code>.
      </p>
      <div className="acn-domains-lovable__dns-mini-table">
        <div className="acn-domains-lovable__dns-mini-head">
          <span>Type</span>
          <span>Host</span>
          <span>Value</span>
        </div>
        {records.map((record) => (
          <div key={record.id} className="acn-domains-lovable__dns-mini-row">
            <span className="font-semibold">{record.type}</span>
            <code>{record.hostDisplay}</code>
            <code className="truncate">{record.value}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
