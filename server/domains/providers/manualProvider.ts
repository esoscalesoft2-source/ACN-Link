import type { DnsProviderAdapter, ProvisionDnsResult } from "./types";

export const manualProvider: DnsProviderAdapter = {
  capability: {
    id: "other",
    name: "Other",
    supportsAutoDns: false,
    supportsOAuth: false,
    logoUrl: "/dns-providers/default.svg",
    helpUrl: "https://www.google.com/search?q=how+to+add+CNAME+DNS+record",
    blurb: "We'll show simple copy-and-paste steps for your DNS host."
  },

  async provisionDns(): Promise<ProvisionDnsResult> {
    return {
      success: false,
      message: "Manual DNS setup — follow the guided steps."
    };
  }
};
