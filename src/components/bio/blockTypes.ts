import type { BlockRecord, FormSubmitPayload } from "../../lib/bioBlocks";

export type BlockRenderMode = "preview" | "live";

export interface BlockRendererContext {
  compact?: boolean;
  displayTitle?: string;
  displayHandle?: string;
  socialLinks?: import("../../lib/bioBlocks").SocialLinkItem[];
}

export interface BlockRendererHandlers {
  onToast?: (message: string) => void;
  onExternalLink?: (url: string, label?: string) => void;
  onWhatsApp?: (value: string) => void;
  onCopy?: (text: string, label?: string) => void;
  onSpinOpen?: (blockId: string) => void;
  onLeadSubmit?: (blockId: string, email: string, destinationEmail?: string) => void;
  onFormSubmit?: (blockId: string, data: FormSubmitPayload, destinationEmail?: string) => void;
  onVCardDownload?: (block: BlockRecord) => void;
  onTrack?: (action: string, label: string, meta?: Record<string, unknown>) => void;
  leadEmails?: Record<string, string>;
  onLeadEmailChange?: (blockId: string, email: string) => void;
  /** Open this page's Thank You 2nd screen after form submit / join. */
  onShowThanks?: () => void;
}

export interface BlockRendererProps {
  block: BlockRecord;
  mode: BlockRenderMode;
  context?: BlockRendererContext;
  handlers?: BlockRendererHandlers;
}
