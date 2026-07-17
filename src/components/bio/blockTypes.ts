import type { BlockRecord } from "../../lib/bioBlocks";

export type BlockRenderMode = "preview" | "live";

export interface BlockRendererContext {
  compact?: boolean;
  displayTitle?: string;
  displayHandle?: string;
}

export interface BlockRendererHandlers {
  onToast?: (message: string) => void;
  onExternalLink?: (url: string, label?: string) => void;
  onWhatsApp?: (value: string) => void;
  onCopy?: (text: string, label?: string) => void;
  onSpinOpen?: (blockId: string) => void;
  onLeadSubmit?: (blockId: string, email: string, destinationEmail?: string) => void;
  onVCardDownload?: (block: BlockRecord) => void;
  onTrack?: (action: string, label: string, meta?: Record<string, unknown>) => void;
  leadEmails?: Record<string, string>;
  onLeadEmailChange?: (blockId: string, email: string) => void;
}

export interface BlockRendererProps {
  block: BlockRecord;
  mode: BlockRenderMode;
  context?: BlockRendererContext;
  handlers?: BlockRendererHandlers;
}
