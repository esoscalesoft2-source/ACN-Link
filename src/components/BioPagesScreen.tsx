import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { screenToPath } from "../navigation";
import { BioPage, BioPageDraft, BioPageTemplate, BioEditorState, BioEditorBlock, BioPagePreviewTheme, ScreenId } from "../types";
import {
  buildEditorState,
  cloneBlocks,
  DEFAULT_COVER,
  formatDisplayHandle,
  suggestedHandlePlaceholder,
  getStoredHandle,
  normalizeHandleInput,
  deleteDraftByPageId,
  upsertDraft,
  persistDrafts,
  upsertTemplate,
  syncTemplateToServer,
  persistAndSyncPagePreview,
  persistPagePreviewLocalOnly,
  syncDraftToServer,
  syncAllDraftsToServer,
  describeServerSyncFailure,
  syncPagesListToServer,
  readStoredPageTheme
} from "../storage/bioBuilderStorage";
import { CreateNotificationInput } from "../storage/notificationStorage";
import { PRIMARY_DOMAIN } from "../storage/publishStorage";
import { apiUrl } from "../lib/apiBase";
import {
  RefreshCw,
  Plus,
  Smartphone,
  Copy,
  BarChart2,
  Edit3,
  QrCode,
  ExternalLink,
  Trash2,
  Check,
  X,
  Link,
  Loader,
  Settings,
  Layers,
  ShoppingBag,
  User,
  Download,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  MousePointerClick,
  Calendar,
  MessageSquare,
  Clock,
  Play,
  Gift,
  Star,
  Save,
  Share2,
  FileText,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Palette,
  Globe,
  Image as ImageIcon,
  LayoutGrid,
  Eye
} from "lucide-react";
import PageShell, { PageHeader, Workspace } from "./layout/PageShell";
import { BIO_LINK, getLinkArrowColor, getLinkButtonStyle, isDefaultBrightLink } from "../lib/bioLinkColors";
import type { AppTheme } from "../lib/themeStorage";

export function getShareableOrigin() {
  let origin = window.location.origin;
  if (origin.includes("ais-dev-")) {
    origin = origin.replace("ais-dev-", "ais-pre-");
  }
  return origin;
}

const marvelInitialBlocks = [
  { id: "b1", type: "Header", label: "👤 Marvel Toys for Kids", value: "👤 Marvel Toys for Kids" },
  { id: "b2", type: "Header", label: "Official Marvel-Inspired Toys & Collectibles", value: "Official Marvel-Inspired Toys & Collectibles" },
  { id: "b3", type: "Text", label: "🎁 Safe, fun & exciting toys for young superheroes.", value: "🎁 Safe, fun & exciting toys for young superheroes." },
  { id: "b4", type: "Header", label: "⭐ Why Shop With Us?", value: "⭐ Why Shop With Us?" },
  { id: "b5", type: "Text", label: "🛡️ Quality Marvel-themed toys, 🚚 Fast Shipping, 💯 Trusted", value: "🛡️ Quality Marvel-themed toys, 🚚 Fast Shipping, 💯 Trusted" },
  { id: "b6", type: "Shop", label: "Products For Kids (Iron Man, Spiderman, Hulk)", value: "Products For Kids" },
  { id: "b7", type: "Button", label: "Explore the Toys Section", value: "Explore the Toys Section", bgColor: "#7c3aed", textColor: "#FFFFFF" },
  { id: "b8", type: "Coupon", label: "Special Offer (MARVELTOYCODE007007)", value: "MARVELTOYCODE007007" },
  { id: "b9", type: "Countdown", label: "Sale ends in (9 Days Timer)", value: "9" },
  { id: "b10", type: "Link Spin", label: "Buy Now (Prize Wheel)", value: "Buy Now" },
  { id: "b11", type: "WhatsApp", label: "Message Us on WhatsApp", value: "Message Us on WhatsApp" },
  { id: "b12", type: "Smart Form", label: "Get in Touch Leads Form", value: "Get in Touch" },
  { id: "b13", type: "vCard", label: "Save Contact Card Info", value: "Save Contact" }
];

const genericInitialBlocks = [
  { id: "g1", type: "Header", label: "👤 My Responsive BioLink", value: "👤 My Responsive BioLink" },
  { id: "g2", type: "Text", label: "Welcome to my responsive bio page! Customize me using the blocks.", value: "Welcome" },
  { id: "g3", type: "Button", label: "Visit My Website", value: "https://example.com", bgColor: "#7c3aed", textColor: "#FFFFFF" },
  { id: "g4", type: "WhatsApp", label: "Chat with me on WhatsApp", value: "https://wa.me/1234567890" }
];

const defaultProductsList = [
  {
    id: "p1",
    name: "Iron man",
    url: "https://www.amazon.in/Toys-Action-Figure-Collectibles-Interchangeable/dp/BOFKTLP65H?source=ps-sl-sl",
    image: "https://images.unsplash.com/photo-1626278664285-f7c05fd17571?auto=format&fit=crop&q=80&w=300",
    price: "3999"
  },
  {
    id: "p2",
    name: "spiderman",
    url: "https://www.amazon.in/Toys-Action-Figure-Collectibles-Interchangeable/dp/BOFKTLP65H?source=ps-sl-sl",
    image: "https://images.unsplash.com/photo-1604200213928-ba3cf4fc8436?auto=format&fit=crop&q=80&w=300",
    price: "2999"
  },
  {
    id: "p3",
    name: "halk",
    url: "https://www.amazon.in/Toys-Action-Figure-Collectibles-Interchangeable/dp/BOFKTLP65H?source=ps-sl-sl",
    image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&q=80&w=300",
    price: "1899"
  }
];

const getCurrencySymbol = (currency: string = "₹ INR") => {
  if (currency.startsWith("₹")) return "₹";
  if (currency.startsWith("$")) return "$";
  if (currency.startsWith("€")) return "€";
  if (currency.startsWith("£")) return "£";
  if (currency.startsWith("¥")) return "¥";
  return currency.split(" ")[0] || "₹";
};

const getBlockIcon = (type: string) => {
  const iconClass = "acn-editor-block-icon";
  switch (type) {
    case "Button":
      return <div className={`${iconClass} acn-editor-block-icon--purple`}><Link className="h-4 w-4" /></div>;
    case "Text":
      return <div className={`${iconClass} acn-editor-block-icon--slate`}><FileText className="h-4 w-4" /></div>;
    case "Header":
      return <div className={`${iconClass} acn-editor-block-icon--blue font-extrabold text-xs`}>H1</div>;
    case "Socials":
      return <div className={`${iconClass} acn-editor-block-icon--pink`}><Share2 className="h-4 w-4" /></div>;
    case "Shop":
      return <div className={`${iconClass} acn-editor-block-icon--green`}><ShoppingBag className="h-4 w-4" /></div>;
    case "Coupon":
      return <div className={`${iconClass} acn-editor-block-icon--sky`}><Gift className="h-4 w-4" /></div>;
    case "Countdown":
      return <div className={`${iconClass} acn-editor-block-icon--rose`}><Clock className="h-4 w-4" /></div>;
    case "Deep Link":
      return <div className={`${iconClass} acn-editor-block-icon--indigo`}><Sparkles className="h-4 w-4" /></div>;
    case "Link Spin":
      return <div className={`${iconClass} acn-editor-block-icon--amber`}><RefreshCw className="h-4 w-4" /></div>;
    case "WhatsApp":
      return <div className={`${iconClass} acn-editor-block-icon--whatsapp`}><MessageSquare className="h-4 w-4" /></div>;
    case "Smart Form":
      return <div className={`${iconClass} acn-editor-block-icon--violet`}><User className="h-4 w-4" /></div>;
    case "vCard":
      return <div className={`${iconClass} acn-editor-block-icon--neutral`}><User className="h-4 w-4" /></div>;
    case "Video":
      return <div className={`${iconClass} acn-editor-block-icon--red`}><Play className="h-4 w-4" /></div>;
    case "Music":
      return <div className={`${iconClass} acn-editor-block-icon--teal text-sm`}>🎵</div>;
    case "Gallery":
      return <div className={`${iconClass} acn-editor-block-icon--indigo text-sm`}>📸</div>;
    case "PDF":
      return <div className={`${iconClass} acn-editor-block-icon--pdf text-sm`}>📄</div>;
    case "Events":
      return <div className={`${iconClass} acn-editor-block-icon--indigo`}><Calendar className="h-4 w-4" /></div>;
    default:
      return <div className={`${iconClass} acn-editor-block-icon--slate`}><Link className="h-4 w-4" /></div>;
  }
};

interface BioPagesScreenProps {
  pages: BioPage[];
  onAddPage: (title: string, slug: string) => BioPage;
  onDeletePage: (id: string) => void;
  onUpdatePage: (id: string, title: string, bio?: string, coverPhoto?: string, handle?: string) => void;
  onDuplicatePage: (id: string) => void;
  onRefreshPages: () => Promise<void>;
  analyticsEvents: Array<{ pageId?: string; eventType?: string; eventLabel?: string; timestamp?: string }>;
  // New props for shared state
  savedTemplates: BioPageTemplate[];
  setSavedTemplates: React.Dispatch<React.SetStateAction<BioPageTemplate[]>>;
  savedDrafts: BioPageDraft[];
  setSavedDrafts: React.Dispatch<React.SetStateAction<BioPageDraft[]>>;
  pageBlocksMap: Record<string, BioEditorBlock[]>;
  setPageBlocksMap: React.Dispatch<React.SetStateAction<Record<string, BioEditorBlock[]>>>;
  initialActiveEditPageId: string | null;
  clearInitialActiveEditPageId: () => void;
  initialActiveTemplateId: string | null;
  clearInitialActiveTemplateId: () => void;
  onNotify: (input: CreateNotificationInput) => void;
  theme?: AppTheme;
}

export default function BioPagesScreen({
  pages,
  onAddPage,
  onDeletePage,
  onUpdatePage,
  onDuplicatePage,
  onRefreshPages,
  analyticsEvents,
  savedTemplates,
  setSavedTemplates,
  savedDrafts,
  setSavedDrafts,
  pageBlocksMap,
  setPageBlocksMap,
  initialActiveEditPageId,
  clearInitialActiveEditPageId,
  initialActiveTemplateId,
  clearInitialActiveTemplateId,
  onNotify,
  theme = "dark"
}: BioPagesScreenProps) {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");

  // Popup Modal States
  const [selectedAnalyticsPage, setSelectedAnalyticsPage] = useState<BioPage | null>(null);
  const [selectedEditPage, setSelectedEditPage] = useState<BioPage | null>(null);
  const [selectedQRPage, setSelectedQRPage] = useState<BioPage | null>(null);

  React.useEffect(() => {
    if (selectedEditPage) {
      document.body.classList.add("acn-editor-open");
    } else {
      document.body.classList.remove("acn-editor-open");
    }
    return () => document.body.classList.remove("acn-editor-open");
  }, [selectedEditPage]);

  // Analytics tab state
  const [analyticsTab, setAnalyticsTab] = useState<"7 Days" | "30 Days" | "All Time">("7 Days");

  const handleWhatsAppRedirect = (value: string) => {
    if (!value) return;
    try {
      if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("whatsapp://")) {
        window.open(value, "_blank", "noopener,noreferrer");
        return;
      }
      const cleaned = value.replace(/[^0-9]/g, "");
      if (cleaned) {
        window.open(`https://wa.me/${cleaned}`, "_blank", "noopener,noreferrer");
      } else {
        window.open(`https://wa.me/${encodeURIComponent(value)}`, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.warn("WhatsApp popup redirection blocked by browser or iframe sandbox policy:", err);
    }
  };

  // QR Customizer States
  const [qrColor, setQrColor] = useState<string>("Default");
  const [qrDesign, setQrDesign] = useState<"Squares" | "Rounded" | "Dots" | "Fluid">("Squares");
  const [qrForeground, setQrForeground] = useState<string>("#000000");
  const [qrBackground, setQrBackground] = useState<string>("#FFFFFF");
  const [hasLogo, setHasLogo] = useState(false);

  // Editor states
  const [editorTitle, setEditorTitle] = useState<string>("");
  const [editorHandle, setEditorHandle] = useState<string>("");
  const [editorBio, setEditorBio] = useState<string>("Write a short bio...");
  const [editorCoverPhoto, setEditorCoverPhoto] = useState<string>("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800");
  const [editorPageTheme, setEditorPageTheme] = useState<BioPagePreviewTheme>("dark");
  const [editorTab, setEditorTab] = useState<"Edit" | "Settings">("Edit");
  const [editorViewPanel, setEditorViewPanel] = useState<"blocks" | "edit" | "preview">("edit");
  const [linkedTemplateId, setLinkedTemplateId] = useState<string | null>(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Widget states inside editor to allow live mockup interactivity!
  const [countdownTime, setCountdownTime] = useState({ days: 9, hrs: 20, mins: 18, secs: 1 });
  const [couponCode, setCouponCode] = useState("MARVELTOYCODE007007");
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  // Interactive Simulator States
  const [simulatorToast, setSimulatorToast] = useState<string | null>(null);
  const [simulatorLeadEmail, setSimulatorLeadEmail] = useState("");
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);

  // Ticking countdown timer effect
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdownTime(prev => {
        if (prev.secs > 0) {
          return { ...prev, secs: prev.secs - 1 };
        } else if (prev.mins > 0) {
          return { ...prev, mins: prev.mins - 1, secs: 59 };
        } else if (prev.hrs > 0) {
          return { ...prev, hrs: prev.hrs - 1, mins: 59, secs: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hrs: 23, mins: 59, secs: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Utility to show temporary toast in the simulator
  const triggerSimulatorToast = (msg: string) => {
    setSimulatorToast(msg);
    setTimeout(() => {
      setSimulatorToast(null);
    }, 3000);
  };

  // Dynamic blocks state for the editor
  const [editorBlocks, setEditorBlocks] = useState<Array<{ id: string; type: string; label: string; value: string }>>([]);

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingBlockLabel, setEditingBlockLabel] = useState<string>("");
  const [editingBlockValue, setEditingBlockValue] = useState<string>("");

  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [showCoverUrlModal, setShowCoverUrlModal] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState(DEFAULT_COVER);

  // Reordering blocks state (PAGE BLOCKS accordion only)
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [isAccordionReorderDrag, setIsAccordionReorderDrag] = useState(false);
  const [dropTarget, setDropTarget] = useState<{ index: number; position: "before" | "after" } | null>(null);
  const accordionListRef = useRef<HTMLDivElement>(null);
  const editorTitleInputRef = useRef<HTMLInputElement>(null);

  const getAccordionDropPosition = (e: React.DragEvent): "before" | "after" => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? "before" : "after";
  };

  const getInsertIndex = (targetIndex: number, position: "before" | "after", listLength: number) => {
    const raw = position === "before" ? targetIndex : targetIndex + 1;
    return Math.max(0, Math.min(raw, listLength));
  };

  const reorderEditorBlocks = (
    sourceIndex: number,
    targetIndex: number,
    position: "before" | "after"
  ) => {
    setEditorBlocks((prev) => {
      if (sourceIndex < 0 || sourceIndex >= prev.length) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(sourceIndex, 1);
      let insertIndex = getInsertIndex(targetIndex, position, copy.length);
      if (sourceIndex < insertIndex) insertIndex -= 1;
      copy.splice(insertIndex, 0, removed);
      return copy;
    });
  };

  const getDropDisplayPosition = (target: { index: number; position: "before" | "after" }, total: number) => {
    const raw = target.position === "before" ? target.index + 1 : target.index + 2;
    return Math.max(1, Math.min(raw, total));
  };

  const resetAccordionDragState = () => {
    setDraggedBlockIndex(null);
    setIsAccordionReorderDrag(false);
    setDropTarget(null);
  };

  const handleBlockDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/block-index", String(index));
    e.dataTransfer.setData("text/block-reorder", "accordion");
    e.dataTransfer.effectAllowed = "move";
    setDraggedBlockIndex(index);
    setIsAccordionReorderDrag(true);
    setDropTarget(null);
  };

  const handleBlockDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const isReorder =
      isAccordionReorderDrag ||
      draggedBlockIndex !== null ||
      e.dataTransfer.types.includes("text/block-reorder") ||
      e.dataTransfer.types.includes("text/block-index");
    e.dataTransfer.dropEffect = isReorder ? "move" : "copy";
    setDropTarget({ index, position: getAccordionDropPosition(e) });
  };

  const handleAccordionListDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAccordionReorderDrag && draggedBlockIndex === null) return;
    e.dataTransfer.dropEffect = "move";
    if (editorBlocks.length === 0) return;

    const listEl = accordionListRef.current;
    if (!listEl) return;

    const blockEls = listEl.querySelectorAll<HTMLElement>("[data-accordion-block]");
    const lastBlock = blockEls[blockEls.length - 1];
    if (!lastBlock) return;

    const lastRect = lastBlock.getBoundingClientRect();
    if (e.clientY > lastRect.bottom - 8) {
      setDropTarget({ index: editorBlocks.length - 1, position: "after" });
    }
  };

  const handleBlockDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const blockType = e.dataTransfer.getData("text/plain");
    const sourceIndexStr = e.dataTransfer.getData("text/block-index");
    const position = dropTarget?.index === targetIndex ? dropTarget.position : getAccordionDropPosition(e);

    if (blockType && !sourceIndexStr) {
      const insertIndex = getInsertIndex(targetIndex, position, editorBlocks.length);
      handleAddBlock(blockType, insertIndex);
      triggerToast(`✨ Added ${blockType} at position ${insertIndex + 1}`);
      setActiveDraggedBlockType(null);
      resetAccordionDragState();
      return;
    }

    const sourceIndex = sourceIndexStr ? parseInt(sourceIndexStr, 10) : draggedBlockIndex;
    if (sourceIndex !== null && !isNaN(sourceIndex)) {
      const wouldStay =
        (position === "before" && sourceIndex === targetIndex) ||
        (position === "after" && sourceIndex === targetIndex + 1) ||
        (position === "after" && sourceIndex === targetIndex && targetIndex === editorBlocks.length - 1);

      if (!wouldStay) {
        reorderEditorBlocks(sourceIndex, targetIndex, position);
        triggerToast(`🔄 Moved to position ${getDropDisplayPosition({ index: targetIndex, position }, editorBlocks.length)}`);
      }
    }
    resetAccordionDragState();
  };

  const handleBlockDragEnd = () => {
    resetAccordionDragState();
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const handleUpdateBlockField = (blockId: string, field: string, value: any) => {
    setEditorBlocks(prev => prev.map(b => b.id === blockId ? { ...b, [field]: value } : b));
  };

  const handleCoverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      triggerToast("Choose a valid image file for the cover photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      triggerToast("Cover photo must be 5 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditorCoverPhoto(reader.result as string);
      triggerToast("✨ Cover photo uploaded successfully!");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Custom states to store saved templates, saved drafts, and active blocks mappings (with localStorage persistence)
  const [toast, setToast] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  
  const [nextInitialBlocks, setNextInitialBlocks] = useState<Array<{ id: string; type: string; label: string; value: string }> | null>(genericInitialBlocks);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("generic");

  // Fallback drag block type for robust sandbox iframe drag-and-drop support
  const [activeDraggedBlockType, setActiveDraggedBlockType] = useState<string | null>(null);

  // Drag-and-drop state & counter variables
  const [isDraggingOverManager, setIsDraggingOverManager] = useState(false);
  const [isDraggingOverPreview, setIsDraggingOverPreview] = useState(false);

  const dragCounterManager = useRef(0);
  const dragCounterPreview = useRef(0);

  const handleDragStartBlockType = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("text/plain", type);
    e.dataTransfer.effectAllowed = "copy";
    setActiveDraggedBlockType(type);
    setIsAccordionReorderDrag(false);
    setDropTarget(null);
  };

  const handleDragOverTarget = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer) return;
    const isReorder =
      isAccordionReorderDrag ||
      draggedBlockIndex !== null ||
      e.dataTransfer.types.includes("text/block-reorder") ||
      e.dataTransfer.types.includes("text/block-index");
    e.dataTransfer.dropEffect = isReorder ? "move" : "copy";
    handleAccordionListDragOver(e);
  };

  const handleDragEnterManager = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterManager.current += 1;
    setIsDraggingOverManager(true);
  };

  const handleDragLeaveManager = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterManager.current -= 1;
    if (dragCounterManager.current <= 0) {
      dragCounterManager.current = 0;
      setIsDraggingOverManager(false);
    }
  };

  const handleDropOnManager = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterManager.current = 0;
    setIsDraggingOverManager(false);

    const sourceIndexStr = e.dataTransfer.getData("text/block-index");
    if (sourceIndexStr) {
      const sourceIndex = parseInt(sourceIndexStr, 10);
      if (!isNaN(sourceIndex) && dropTarget) {
        reorderEditorBlocks(sourceIndex, dropTarget.index, dropTarget.position);
        triggerToast(`🔄 Moved to position ${getDropDisplayPosition(dropTarget, editorBlocks.length)}`);
      } else if (!isNaN(sourceIndex) && sourceIndex !== editorBlocks.length - 1) {
        setEditorBlocks((prev) => {
          const copy = [...prev];
          const [removed] = copy.splice(sourceIndex, 1);
          copy.push(removed);
          return copy;
        });
        triggerToast("🔄 Moved to last position");
      }
      resetAccordionDragState();
      return;
    }

    const type = e.dataTransfer.getData("text/plain") || activeDraggedBlockType;
    if (type) {
      handleAddBlock(type);
      triggerToast(`✨ Block Drag & Drop: Added new ${type} Block to manager!`);
    }
    setActiveDraggedBlockType(null);
    resetAccordionDragState();
  };

  const handleDragEnterPreview = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterPreview.current += 1;
    setIsDraggingOverPreview(true);
  };

  const handleDragLeavePreview = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterPreview.current -= 1;
    if (dragCounterPreview.current <= 0) {
      dragCounterPreview.current = 0;
      setIsDraggingOverPreview(false);
    }
  };

  const handleDropOnPreview = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterPreview.current = 0;
    setIsDraggingOverPreview(false);
    const type = e.dataTransfer.getData("text/plain") || activeDraggedBlockType;
    if (type) {
      handleAddBlock(type);
      triggerSimulatorToast(`🚀 Live Drag & Drop: Added new ${type} block to layout!`);
    }
    setActiveDraggedBlockType(null);
  };

  const handleSaveAsTemplate = () => {
    if (!editorTitle.trim()) {
      triggerToast("⚠️ Add a page title before saving as template.");
      return;
    }
    setTemplateNameInput(
      linkedTemplateId
        ? savedTemplates.find((tpl) => tpl.id === linkedTemplateId)?.name || editorTitle
        : `${editorTitle} Template`
    );
    setShowSaveTemplateModal(true);
  };

  const confirmSaveAsTemplate = async () => {
    try {
      const name = templateNameInput.trim() || editorTitle || "Untitled Template";
      const state = buildCurrentEditorState();
      const now = new Date().toISOString();

      const savedTemplate: BioPageTemplate = linkedTemplateId
        ? {
            id: linkedTemplateId,
            name,
            sourcePageId: selectedEditPage?.id,
            previewImage: state.pageMeta.coverImage,
            data: state,
            createdAt:
              savedTemplates.find((t) => t.id === linkedTemplateId)?.createdAt || now,
            updatedAt: now
          }
        : {
            id: `tpl_${Date.now()}`,
            name,
            sourcePageId: selectedEditPage?.id,
            previewImage: state.pageMeta.coverImage,
            data: state,
            createdAt: now,
            updatedAt: now
          };

      setSavedTemplates((prev) => upsertTemplate(savedTemplate, prev));

      if (!linkedTemplateId) {
        setLinkedTemplateId(savedTemplate.id);
      }

      const serverOk = await syncTemplateToServer(savedTemplate);
      setShowSaveTemplateModal(false);

      triggerToast(
        serverOk
          ? linkedTemplateId
            ? `✨ Template "${name}" updated on the cloud.`
            : `✨ Template "${name}" saved to the cloud.`
          : `✨ Template "${name}" saved for this session.`
      );
      onNotify({
        type: "template_saved",
        title: linkedTemplateId ? "Template updated" : "Template saved",
        message: `"${name}" is available in Templates → My Templates.`,
        targetScreen: ScreenId.TEMPLATES
      });
    } catch (err) {
      console.error("Failed to save template:", err);
      triggerToast("⚠️ Could not save template. Please try again.");
    }
  };

  const buildCurrentEditorState = (): BioEditorState =>
    buildEditorState(
      editorTitle,
      editorBio,
      editorCoverPhoto,
      editorBlocks as BioEditorBlock[],
      selectedEditPage?.slug,
      editorHandle,
      editorPageTheme
    );

  const buildCurrentPreviewDetails = (theme: BioPagePreviewTheme = editorPageTheme) => ({
    title: editorTitle,
    bio: editorBio,
    coverPhoto: editorCoverPhoto,
    handle: getStoredHandle(editorHandle),
    pageTheme: theme
  });

  const previewHandle = formatDisplayHandle(editorHandle, editorTitle, { fallbackToTitle: false });
  const handlePlaceholder = suggestedHandlePlaceholder(editorTitle);

  const syncPreviewStorage = (theme: BioPagePreviewTheme = editorPageTheme) => {
    if (!selectedEditPage) return;
    persistPagePreviewLocalOnly(
      selectedEditPage.id,
      selectedEditPage.slug,
      editorBlocks,
      buildCurrentPreviewDetails(theme)
    );
  };

  const skipEditorAutoSyncRef = React.useRef(true);

  React.useEffect(() => {
    skipEditorAutoSyncRef.current = true;
  }, [selectedEditPage?.id]);

  React.useEffect(() => {
    if (!selectedEditPage || showPublishSuccess) return;
    if (skipEditorAutoSyncRef.current) {
      skipEditorAutoSyncRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      syncPreviewStorage();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    editorBlocks,
    editorTitle,
    editorBio,
    editorCoverPhoto,
    editorHandle,
    editorPageTheme,
    selectedEditPage?.id,
    showPublishSuccess
  ]);

  const handlePreviewThemeChange = (theme: BioPagePreviewTheme) => {
    setEditorPageTheme(theme);
    syncPreviewStorage(theme);
  };

  const hydrateEditorFromState = (state: BioEditorState) => {
    setEditorTitle(state.pageMeta.title);
    setEditorHandle(state.pageMeta.handle || "");
    setEditorBio(state.pageMeta.shortBio);
    setEditorCoverPhoto(state.pageMeta.coverImage);
    setEditorPageTheme(state.pageMeta.pageTheme === "light" ? "light" : "dark");
    setEditorBlocks(cloneBlocks(state.blocks));
  };

  const getTemplateDisplayName = (tpl: BioPageTemplate) => tpl.name;
  const getTemplateBlockCount = (tpl: BioPageTemplate) => tpl.data?.blocks?.length ?? 0;
  const getDraftDisplayName = (draft: BioPageDraft) => draft.data.pageMeta.title;
  const getDraftBlockCount = (draft: BioPageDraft) => draft.data.blocks.length;

  const resolvePageBlocks = (page: BioPage): BioEditorBlock[] => {
    if (pageBlocksMap[page.id]?.length) {
      return cloneBlocks(pageBlocksMap[page.id]);
    }
    if (pageBlocksMap[page.slug]?.length) {
      return cloneBlocks(pageBlocksMap[page.slug]);
    }
    if (page.title.toLowerCase().includes("marvel")) {
      return cloneBlocks(marvelInitialBlocks as BioEditorBlock[]);
    }
    return cloneBlocks(genericInitialBlocks as BioEditorBlock[]);
  };

  const handleSaveDraft = async () => {
    if (!selectedEditPage || !editorTitle.trim()) {
      triggerToast("⚠️ Add a page title before saving a draft.");
      return;
    }

    if (isSavingDraft) return;

    setIsSavingDraft(true);

    try {
      const state = buildCurrentEditorState();
      const now = new Date().toISOString();
      const existingDraft = savedDrafts.find((draft) => draft.pageId === selectedEditPage.id);

      const draftRecord: BioPageDraft = {
        id: existingDraft?.id || `draft_${selectedEditPage.id}`,
        pageId: selectedEditPage.id,
        pageSlug: selectedEditPage.slug,
        data: state,
        createdAt: existingDraft?.createdAt || now,
        updatedAt: now
      };

      const nextDrafts = upsertDraft(draftRecord, savedDrafts);
      setSavedDrafts(nextDrafts);

      onUpdatePage(selectedEditPage.id, editorTitle, editorBio, editorCoverPhoto, editorHandle);

      setPageBlocksMap((prev) => ({
        ...prev,
        [selectedEditPage.id]: cloneBlocks(state.blocks)
      }));

      const details = buildCurrentPreviewDetails();
      const syncOptions = { pages };
      const [draftSync, previewResult] = await Promise.all([
        syncDraftToServer(draftRecord),
        persistAndSyncPagePreview(
          selectedEditPage.id,
          selectedEditPage.slug,
          state.blocks,
          details,
          syncOptions
        ),
        syncPagesListToServer(pages)
      ]);
      const pageServerOk = previewResult.serverOk;
      const draftServerOk = draftSync.ok;

      if (draftServerOk || pageServerOk) {
        triggerToast(`💾 Draft for "${editorTitle}" saved to the cloud.`);
      } else {
        const reason = pageServerOk ? draftSync.reason : previewResult.sync.reason;
        triggerToast(`💾 Draft saved in this session. ${describeServerSyncFailure(reason)}`);
      }

      onNotify({
        type: "draft_saved",
        title: "Draft saved",
        message: draftServerOk || pageServerOk
          ? `Your edits to "${editorTitle}" were saved to the server.`
          : `Your edits to "${editorTitle}" were saved in this session.`,
        targetScreen: ScreenId.BIO_PAGES
      });
    } catch (err) {
      console.error("Failed to save draft:", err);
      triggerToast("⚠️ Could not save draft. Please try again.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const startEditingBlock = (id: string, label: string, value: string) => {
    setEditingBlockId(id);
    setEditingBlockLabel(label);
    setEditingBlockValue(value);
  };

  const saveEditingBlock = (id: string) => {
    setEditorBlocks(prev =>
      prev.map(b => (b.id === id ? { ...b, label: editingBlockLabel, value: editingBlockValue } : b))
    );
    setEditingBlockId(null);
  };

  const handleDeleteBlock = (id: string) => {
    setEditorBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleAddBlock = (type: string, atIndex?: number) => {
    const id = "block_" + Date.now();
    let label = "";
    let value = "";
    let extraFields: any = {};
    switch (type) {
      case "Button":
        label = "Explore the Toys Section";
        value = "https://example.com/toys";
        extraFields = { bgColor: BIO_LINK.bg, textColor: BIO_LINK.text };
        break;
      case "Text":
        label = "🎁 Safe, fun & exciting toys for young superheroes.";
        value = "🎁 Safe, fun & exciting toys for young superheroes.";
        break;
      case "Header":
        label = "⭐ Why Shop With Us?";
        value = "⭐ Why Shop With Us?";
        break;
      case "Socials":
        label = "Follow our Social handles";
        value = "Socials";
        break;
      case "Shop":
        label = "My Shop";
        value = "Products List";
        extraFields = {
          alignment: "Centre",
          currency: "₹ INR",
          products: JSON.parse(JSON.stringify(defaultProductsList)),
          bgColor: "#10B981",
          textColor: "#FFFFFF"
        };
        break;
      case "Coupon":
        label = "Special Offer (MARVELTOYCODE007007)";
        value = "MARVELTOYCODE007007";
        break;
      case "Countdown":
        label = "Sale ends in (9 Days Timer)";
        value = "9";
        break;
      case "Deep Link":
        label = "Buy Now (Prize Wheel)";
        value = "Buy Now";
        extraFields = { bgColor: BIO_LINK.bg, textColor: BIO_LINK.text };
        break;
      case "Link Spin":
        label = "Buy Now (Prize Wheel)";
        value = "Buy Now";
        break;
      case "WhatsApp":
        label = "Message Us on WhatsApp";
        value = "https://wa.me/919876543210";
        break;
      case "Smart Form":
        label = "Get in Touch Leads Form";
        value = "Get in Touch";
        break;
      case "vCard":
        label = "Save Contact Card Info";
        value = "Save Contact";
        break;
      case "Video":
        label = "Watch Video stream";
        value = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
        break;
      case "Music":
        label = "Listen to Sound track";
        value = "https://example.com/soundtrack.mp3";
        break;
      case "Gallery":
        label = "View Gallery Showcase";
        value = "Showcase Images";
        break;
      case "PDF":
        label = "Download PDF Catalog";
        value = "https://example.com/catalog.pdf";
        break;
      case "Events":
        label = "Join Upcoming Meetup & Event";
        value = "https://meetup.com/event-001";
        break;
      default:
        label = `New ${type} Block`;
        value = `Value of ${type}`;
    }
    const newBlock = { id, type, label, value, ...extraFields };
    setEditorBlocks((prev) => {
      if (atIndex === undefined || atIndex < 0 || atIndex > prev.length) {
        return [...prev, newBlock];
      }
      const copy = [...prev];
      copy.splice(atIndex, 0, newBlock);
      return copy;
    });
  };

  const COLOR_MAP: Record<string, string> = {
    Default: "#000000",
    Orange: "#6366f1",
    Dark: "#111827",
    Navy: "#1E3A8A",
    Purple: "#6D28D9",
    Green: "#047857",
    Gold: "#B45309"
  };

  const handleColorSelect = (colorName: string) => {
    setQrColor(colorName);
    const hex = COLOR_MAP[colorName] || "#000000";
    setQrForeground(hex);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshPages();
      triggerToast("✓ BioLink pages refreshed.");
    } catch {
      triggerToast("Unable to refresh pages. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      triggerToast(successMessage);
    } catch {
      triggerToast("Unable to copy the link. Please copy it from the address field.");
    }
  };

  const confirmDeletePage = (page: BioPage) => {
    if (window.confirm(`Delete "${page.title}"? This cannot be undone.`)) {
      onDeletePage(page.id);
      triggerToast(`"${page.title}" was deleted.`);
    }
  };

  const exitEditor = () => {
    setSelectedEditPage(null);
    setShowPublishSuccess(false);
    setShowSaveTemplateModal(false);
    setIsPublishing(false);
    setEditorTab("Edit");
    setEditorViewPanel("edit");
    clearInitialActiveEditPageId();
    clearInitialActiveTemplateId();
    navigate(screenToPath(ScreenId.BIO_PAGES), { replace: true });
  };

  const closeEditor = () => {
    if (
      window.confirm(
        "Close the editor? Changes that have not been saved as a draft or published will be lost."
      )
    ) {
      exitEditor();
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Use clean prefix-free suffix, fallback to slugified title
    const cleanSuffix = (newSlug.trim() || newTitle)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
      
    if (!cleanSuffix) {
      triggerToast("Enter a valid URL ending using letters, numbers, or hyphens.");
      return;
    }
    const fullSlug = "acn.link/page-" + cleanSuffix;
    if (pages.some((page) => page.slug.toLowerCase() === fullSlug.toLowerCase())) {
      triggerToast("That URL ending is already in use. Please choose another.");
      return;
    }
    setIsCreating(true);
    const newlyCreatedPage = onAddPage(newTitle.trim(), fullSlug);

    // Save selected template initial blocks to the map for this new page
    const selectedBlocks = nextInitialBlocks || genericInitialBlocks;
    setPageBlocksMap(prev => ({
      ...prev,
      [newlyCreatedPage.id]: [...selectedBlocks]
    }));

    void persistAndSyncPagePreview(newlyCreatedPage.id, fullSlug, selectedBlocks as BioEditorBlock[], {
      title: newlyCreatedPage.title,
      bio: newlyCreatedPage.bio || "Write a short bio...",
      coverPhoto: newlyCreatedPage.coverPhoto || DEFAULT_COVER,
      handle: getStoredHandle(newlyCreatedPage.handle),
      pageTheme: "dark"
    }, { pages: [...pages, newlyCreatedPage] });

    // Reset create modal states
    setNextInitialBlocks(genericInitialBlocks);
    setSelectedTemplateId("generic");
    setNewTitle("");
    setNewSlug("");
    setIsAdding(false);
    setIsCreating(false);
    triggerToast(`✨ BioLink Page "${newlyCreatedPage.title}" created successfully!`);

    setTimeout(() => {
      openEditor(newlyCreatedPage);
    }, 50);
  };

  const startEditing = (page: BioPage) => {
    setEditingId(page.id);
    setEditTitleValue(page.title);
  };

  const saveEdit = (id: string) => {
    if (!editTitleValue) return;
    onUpdatePage(id, editTitleValue);
    setEditingId(null);
  };

  const openEditor = (page: BioPage, options?: { templateId?: string | null; preferPublished?: boolean }) => {
    const isAlreadyEditing = selectedEditPage?.id === page.id;

    if (!isAlreadyEditing) {
      setSelectedEditPage(page);
      setEditorTab("Edit");
      setEditorViewPanel("edit");
      setShowPublishSuccess(false);
      setShowSaveTemplateModal(false);
      setLinkedTemplateId(options?.templateId ?? null);

      const pageDraft = savedDrafts.find((draft) => draft.pageId === page.id);

      if (pageDraft && !options?.preferPublished) {
        hydrateEditorFromState(pageDraft.data);
        triggerToast(`📂 Restored draft for "${pageDraft.data.pageMeta.title}"`);
      } else {
        setEditorTitle(page.title);
        setEditorHandle(page.handle ?? "");
        setEditorBio(page.bio || "Write a short bio...");
        setEditorCoverPhoto(page.coverPhoto || DEFAULT_COVER);
        setEditorPageTheme(readStoredPageTheme(page.id, page.slug));
        setEditorBlocks(resolvePageBlocks(page));
      }
    }

    navigate(`${screenToPath(ScreenId.BIO_PAGES)}?edit=${encodeURIComponent(page.id)}`, { replace: true });
  };

  // Auto-load editor when arriving from Templates page or deep links
  React.useEffect(() => {
    if (!initialActiveEditPageId) return;
    const pageToEdit = pages.find((p) => p.id === initialActiveEditPageId);
    if (pageToEdit && selectedEditPage?.id !== pageToEdit.id) {
      openEditor(pageToEdit, { templateId: initialActiveTemplateId });
    }
    clearInitialActiveEditPageId();
    clearInitialActiveTemplateId();
  }, [initialActiveEditPageId, initialActiveTemplateId, pages]);

  const handlePublishEditor = async () => {
    if (selectedEditPage && !isPublishing) {
      if (!editorTitle.trim()) {
        triggerToast("A page title is required before publishing.");
        return;
      }
      setIsPublishing(true);
      onUpdatePage(selectedEditPage.id, editorTitle, editorBio, editorCoverPhoto, editorHandle);
      
      // Persist blocks in memory map
      setPageBlocksMap(prev => ({
        ...prev,
        [selectedEditPage.id]: [...editorBlocks]
      }));

      const details = buildCurrentPreviewDetails();

      try {
        const [previewResult] = await Promise.all([
          persistAndSyncPagePreview(
            selectedEditPage.id,
            selectedEditPage.slug,
            editorBlocks,
            details,
            { pages }
          ),
          syncPagesListToServer(pages)
        ]);
        const { serverOk, sync } = previewResult;
        if (!serverOk) {
          throw new Error(describeServerSyncFailure(sync.reason));
        }

        const nextDrafts = deleteDraftByPageId(selectedEditPage.id, savedDrafts);
        setSavedDrafts(nextDrafts);
        void syncAllDraftsToServer(nextDrafts);

        onNotify({
          type: "page_published",
          title: "Page published",
          message: `"${editorTitle}" is now live on the cloud.`,
          targetScreen: ScreenId.BIO_PAGES,
          meta: { pageId: selectedEditPage.id }
        });

        setShowPublishSuccess(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not publish to the server.";
        triggerToast(message);
      } finally {
        setIsPublishing(false);
      }
    }
  };

  const getAnalyticsData = () => {
    const days = analyticsTab === "7 Days" ? 7 : analyticsTab === "30 Days" ? 30 : null;
    const rangeStart = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
    const pageEvents = analyticsEvents.filter((event) => {
      if (event.pageId !== selectedAnalyticsPage?.id) return false;
      if (!rangeStart) return true;
      const timestamp = new Date(event.timestamp || "").getTime();
      return Number.isFinite(timestamp) && timestamp >= rangeStart;
    });
    const pageBlocks = selectedAnalyticsPage ? resolvePageBlocks(selectedAnalyticsPage) : [];
    const clicks = pageEvents.filter((event) => event.eventType === "click");
    const widgets = pageBlocks
      .filter((block) => block.type !== "Header" && block.type !== "Text")
      .map((block) => {
        const count = clicks.filter((event) => event.eventLabel?.includes(block.label)).length;
        return {
          name: block.label,
          type: block.type.toUpperCase().replace(/\s+/g, "_"),
          count,
          percentage: clicks.length ? Math.round((count / clicks.length) * 100) : 0
        };
      });

    return {
      views: pageEvents.filter((event) => event.eventType === "visit").length,
      clicks: clicks.length,
      widgets
    };
  };

  const currentAnalytics = getAnalyticsData();

  return (
    <PageShell>
      <PageHeader
        title="BioLink Pages"
        subtitle={`Create link pages to share on Instagram, WhatsApp & business cards · ${pages.length} page${pages.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <button
              onClick={handleRefresh}
              className="acn-btn-secondary px-4 py-2.5"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="acn-btn-accent px-5 py-2.5"
            >
              <Plus className="h-4 w-4" />
              <span>New Page</span>
            </button>
          </>
        }
      />

      {/* Creation Modal/Dialog */}
      {isAdding && (
        <div className="acn-modal-backdrop">
          <div className="acn-modal-panel max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-lg text-gray-950">Create Your Link Page</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-5 text-sm text-slate-500 leading-relaxed">
              One page for all your social links, contact info, and business details.
            </p>

            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  What should we call this page?
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Business Links"
                  value={newTitle}
                  onChange={(e) => {
                    const title = e.target.value;
                    setNewTitle(title);
                    
                    // Auto-generate clean, prefix-free relatedness slug suffix
                    const clean = title.toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, "")
                      .trim()
                      .replace(/\s+/g, "-");
                    setNewSlug(clean);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#6366f1] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all"
                />
                <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                  Visitors will see this name. Use your name, shop name, or brand.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Your page link ending
                </label>
                <input
                  type="text"
                  required
                  placeholder={newTitle ? newTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") : "e.g. my-business"}
                  value={newSlug}
                  onChange={(e) => {
                    // Keep it prefix-free by stripping any pasted full URL prefix
                    let val = e.target.value;
                    if (val.includes("acn.link/page-")) {
                      val = val.replace("acn.link/page-", "");
                    }
                    if (val.includes("1smart.link/page-")) {
                      val = val.replace("1smart.link/page-", "");
                    }
                    setNewSlug(val);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#6366f1] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all"
                />
                <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                  Your page opens at:{" "}
                  <span className="font-mono text-slate-600">
                    {PRIMARY_DOMAIN}/{newSlug.trim() || "my-business"}
                  </span>
                  {" "}— use only letters, numbers, and hyphens.
                </p>
              </div>

              {/* Template Selection */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  Choose a starting design
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedTemplateId(id);
                    if (id === "generic") {
                      setNextInitialBlocks(genericInitialBlocks);
                      triggerToast("✏️ Applied Generic Template!");
                      return;
                    }
                    const tpl = savedTemplates.find((item) => item.id === id);
                    if (!tpl) return;
                    setNextInitialBlocks(tpl.data.blocks);
                    setNewTitle(`${getTemplateDisplayName(tpl)} Copy`);
                    setNewSlug(
                      `${getTemplateDisplayName(tpl)} Copy`
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, "")
                        .replace(/\s+/g, "-")
                    );
                    triggerToast(`✨ Applied Saved Template "${getTemplateDisplayName(tpl)}"!`);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#6366f1] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all"
                >
                  <option value="generic">📝 Generic BioLink</option>
                  {savedTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      💎 {getTemplateDisplayName(tpl)}
                    </option>
                  ))}
                </select>

                {savedTemplates.length > 0 && (
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Or pick a saved design from the dropdown above.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="acn-btn-accent disabled:cursor-not-allowed"
                >
                  {isCreating ? "Creating…" : "Create My Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pages Container list */}
      <Workspace className="acn-section-card">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="h-14 w-14 bg-indigo-500/10 text-[#6366f1] rounded-2xl flex items-center justify-center mb-6">
              <Smartphone className="h-6 w-6" />
            </div>
            <h4 className="font-display font-bold text-gray-900">No link pages yet</h4>
            <p className="text-gray-500 text-sm max-w-xs mt-1">
              Click <strong>New Page</strong> to create your first shareable link page for Instagram, WhatsApp, and your business.
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-4 acn-btn-accent px-4 py-2"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <div
                key={page.id}
                className="acn-list-row min-w-0"
              >
                <div className="flex items-start gap-4 sm:gap-6 min-w-0">
                  <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingId === page.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          className="bg-white border border-gray-200 rounded px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/100"
                        />
                        <button onClick={() => saveEdit(page.id)} className="text-green-600 hover:bg-green-50 p-1 rounded">
                          <Check className="h-4.5 w-4.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:bg-gray-50 p-1 rounded">
                          <X className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="font-display font-semibold text-gray-950 text-base truncate">{page.title}</h4>
                        <button onClick={() => startEditing(page)} className="text-gray-400 hover:text-gray-600">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <a
                      href={`${window.location.origin}/?previewPageId=${page.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-500/100 hover:text-indigo-400 font-medium flex items-center gap-1 mt-1 font-mono hover:underline"
                    >
                      <Link className="h-3 w-3" />
                      {page.slug}
                    </a>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-6 w-full lg:w-auto lg:justify-end pl-14 lg:pl-0">
                  {/* Status */}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      page.status === "Live"
                        ? "bg-emerald-50 text-emerald-600"
                        : page.status === "Paused"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {page.status}
                  </span>

                  {/* Views */}
                  <div className="text-center">
                    <span className="font-display font-bold text-2xl text-gray-950 block leading-none">
                      {page.views}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mt-1">
                      Views
                    </span>
                  </div>

                  {/* Date */}
                  <div className="text-center hidden sm:block">
                    <span className="font-sans font-medium text-gray-500 text-xs font-mono block leading-none">
                      {page.createdAt}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mt-1">
                      Created
                    </span>
                  </div>

                  {/* Toolbar Actions — 7 icons in one centered row on mobile */}
                  <div className="grid grid-cols-7 gap-0.5 bg-gray-50 p-1.5 rounded-xl border border-gray-100 shadow-sm w-full max-w-[320px] sm:max-w-none sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-1 mx-auto sm:mx-0">
                    {/* 1st - Analytics */}
                    <button
                      type="button"
                      onClick={() => setSelectedAnalyticsPage(page)}
                      title={`Analytics — ${page.title}`}
                      className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-[#6366f1] transition-all flex items-center justify-center"
                    >
                      <BarChart2 className="h-4.5 w-4.5" />
                    </button>

                    {/* 2nd - Edit */}
                    <button
                      type="button"
                      onClick={() => openEditor(page)}
                      title="Edit"
                      className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-[#6366f1] transition-all flex items-center justify-center"
                    >
                      <Edit3 className="h-4.5 w-4.5" />
                    </button>

                    {/* 3rd - Duplicate */}
                    <button
                      type="button"
                      onClick={() => onDuplicatePage(page.id)}
                      title="Duplicate"
                      className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-[#6366f1] transition-all flex items-center justify-center"
                    >
                      <Layers className="h-4.5 w-4.5" />
                    </button>

                    {/* 4th - QR Code */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQRPage(page);
                        setQrColor("Default");
                        setQrForeground("#000000");
                        setQrBackground("#FFFFFF");
                        setQrDesign("Squares");
                        setHasLogo(false);
                      }}
                      title={`QR — ${page.title}`}
                      className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-[#6366f1] transition-all flex items-center justify-center"
                    >
                      <QrCode className="h-4.5 w-4.5" />
                    </button>

                    {/* 5th - Open */}
                    <a
                      href={`${window.location.origin}/?previewPageId=${page.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open (visit page)"
                      className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-[#6366f1] transition-all flex items-center justify-center"
                    >
                      <ExternalLink className="h-4.5 w-4.5" />
                    </a>

                    {/* Copy Shareable Link (WhatsApp & Mobile) */}
                    <button
                      type="button"
                      onClick={() => {
                        void copyText(
                          `${getShareableOrigin()}/?previewPageId=${page.id}`,
                          "🔗 Public shareable link copied!"
                        );
                      }}
                      title="Copy Public Share Link (WhatsApp & Mobile)"
                      className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-emerald-600 transition-all flex items-center justify-center"
                    >
                      <Copy className="h-4.5 w-4.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => confirmDeletePage(page)}
                      title="Delete"
                      className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-rose-600 transition-all flex items-center justify-center"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Workspace>

      {/* Analytics Modal */}
      {selectedAnalyticsPage && (
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-gray-900 text-lg">
                Analytics — {selectedAnalyticsPage.title}
              </h3>
              <button
                onClick={() => setSelectedAnalyticsPage(null)}
                className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Interval Selection Tabs */}
            <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl mb-6 border border-gray-100 max-w-xs">
              {(["7 Days", "30 Days", "All Time"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAnalyticsTab(tab)}
                  className={`flex-1 text-center py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                    analyticsTab === tab
                      ? "bg-[#6366f1] text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-900 hover:bg-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center shadow-inner">
                <span className="font-display font-extrabold text-3xl text-gray-900 tracking-tight block">
                  {currentAnalytics.views}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1">
                  PAGE VIEWS
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center shadow-inner">
                <span className="font-display font-extrabold text-3xl text-gray-900 tracking-tight block">
                  {currentAnalytics.clicks}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1">
                  WIDGET CLICKS
                </span>
              </div>
            </div>

            {/* Widget Performance list */}
            <div>
              <h4 className="font-display font-bold text-gray-900 text-sm mb-3 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#6366f1]" />
                Widget Performance
              </h4>

              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                {currentAnalytics.widgets.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    Add an interactive block to track its engagement here.
                  </p>
                )}
                {currentAnalytics.widgets.map((widget, idx) => {
                  // Find a fitting icon
                  let IconComponent = Link;
                  if (widget.type === "WHATSAPP") IconComponent = MessageSquare;
                  else if (widget.type === "VCARD") IconComponent = User;
                  else if (widget.type === "SHOP") IconComponent = ShoppingBag;
                  else if (widget.type === "LINK_SPIN") IconComponent = RefreshCw;
                  else if (widget.type === "SMART_FORM_PDF") IconComponent = FileText;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1 rounded-lg bg-slate-100 text-slate-500 shrink-0 mt-0.5">
                            <IconComponent className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-gray-800 block leading-tight">
                              {widget.name}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">
                              {widget.type}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-gray-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          {widget.count}
                        </span>
                      </div>

                      {/* Performance Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#6366f1] to-[#7c3aed] h-full rounded-full transition-all duration-500"
                          style={{ width: `${widget.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2nd - High-fidelity full-page Editor Modal exactly matching the builder screen with sidebar and live interactive preview in pristine Light Mode */}
      {selectedEditPage &&
        createPortal(
        <div className={`acn-bio-editor-portal acn-theme-${theme}`}>
          <div className="acn-bg-clouds" aria-hidden>
            <span className="acn-bg-cloud acn-bg-cloud--1" />
            <span className="acn-bg-cloud acn-bg-cloud--2" />
            <span className="acn-bg-cloud acn-bg-cloud--3" />
            <span className="acn-bg-cloud acn-bg-cloud--4" />
            <span className="acn-bg-cloud acn-bg-cloud--5" />
          </div>
        <div className="acn-bio-editor-shell flex flex-col h-full min-h-0 animate-in fade-in duration-200">
          {/* Editor Header — same fixed height as main app navbar */}
          <header className="acn-app-navbar acn-glass-header acn-editor-header shrink-0">
            <div className="acn-editor-header__left">
              <button
                type="button"
                onClick={closeEditor}
                className="acn-editor-back-btn shrink-0"
                aria-label="Go back"
                title="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="acn-editor-header__divider" aria-hidden />
              <div className="acn-editor-header__brand min-w-0">
                <span className="acn-editor-header__domain shrink-0">acnlink</span>
                <span className="acn-editor-header__slash shrink-0">/</span>
                <input
                  ref={editorTitleInputRef}
                  type="text"
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  className="acn-editor-header__title-input min-w-0"
                  aria-label="Page title"
                />
                <button
                  type="button"
                  onClick={() => {
                    editorTitleInputRef.current?.focus();
                    editorTitleInputRef.current?.select();
                  }}
                  className="acn-editor-header__edit-btn shrink-0"
                  aria-label="Edit page title"
                  title="Edit page title"
                >
                  <Edit3 className="h-3.5 w-3.5 acn-editor-header__edit-icon" aria-hidden />
                </button>
              </div>
            </div>

            <div className="acn-editor-header__center">
              <div className="acn-editor-tab-switch" role="tablist" aria-label="Editor mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={editorTab === "Edit"}
                  onClick={() => setEditorTab("Edit")}
                  className={editorTab === "Edit" ? "is-active" : ""}
                >
                  Edit
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={editorTab === "Settings"}
                  onClick={() => setEditorTab("Settings")}
                  className={editorTab === "Settings" ? "is-active" : ""}
                >
                  Settings
                </button>
              </div>
            </div>

            <div className="acn-editor-header__right">
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                className="acn-editor-nav-btn acn-editor-nav-btn--template"
              >
                Save as Template
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="acn-editor-nav-btn acn-editor-nav-btn--draft"
              >
                {isSavingDraft ? (
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{isSavingDraft ? "Saving…" : "Save Draft"}</span>
              </button>
              <button
                type="button"
                onClick={handlePublishEditor}
                disabled={isPublishing}
                aria-busy={isPublishing}
                className="acn-editor-nav-btn acn-editor-nav-btn--primary"
              >
                {isPublishing ? (
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{isPublishing ? "Publishing…" : "Publish"}</span>
              </button>
            </div>
          </header>

          {editorTab === "Edit" && !showPublishSuccess && (
            <div className="lg:hidden acn-editor-subnav px-3 sm:px-6 py-2 shrink-0">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
                {(
                  [
                    { id: "blocks" as const, label: "Blocks", icon: LayoutGrid },
                    { id: "edit" as const, label: "Edit", icon: Edit3 },
                    { id: "preview" as const, label: "Preview", icon: Eye }
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setEditorViewPanel(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                      editorViewPanel === id
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editor Body */}
          <div className="acn-editor-body flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
            {/* Main: Block library + Page editor */}
            <div
              className={`acn-editor-body__main flex-1 overflow-hidden min-h-0 min-w-0 flex flex-col ${
                editorViewPanel === "preview" ? "hidden lg:block" : "block"
              }`}
            >
              {showPublishSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-emerald-800 animate-in fade-in zoom-in-95 duration-300">
                  <Check className="h-10 w-10 mx-auto mb-2 bg-emerald-500 text-white p-2 rounded-full shadow-lg" />
                  <h4 className="font-bold text-base">BioLink Page Published Successfully!</h4>
                  <p className="text-xs text-emerald-600 mt-1">
                    Changes are live at:{" "}
                    <a
                      href={`${window.location.origin}/?previewPageId=${selectedEditPage.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold text-[#6366f1] hover:text-[#7c3aed] ml-1"
                    >
                      {`${getShareableOrigin()}/?previewPageId=${selectedEditPage.id}`}
                    </a>
                  </p>
                  <div className="mt-4 flex flex-col items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        void copyText(
                          `${getShareableOrigin()}/?previewPageId=${selectedEditPage.id}`,
                          "🔗 Public shareable link copied!"
                        );
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-colors shadow-sm"
                    >
                      Copy Public Share Link (for WhatsApp)
                    </button>
                    <button
                      type="button"
                      onClick={exitEditor}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : editorTab === "Settings" ? (
                <div className="max-w-xl mx-auto acn-workspace acn-workspace--stack w-full">
                  <h3 className="font-display font-bold text-xl text-slate-900">Page Settings</h3>
                  <div className="acn-editor-panel acn-workspace-panel acn-workspace-panel--stack shadow-sm">
                    <div>
                      <label className="block text-xs text-slate-500 font-semibold mb-2">Meta Title</label>
                      <input
                        type="text"
                        value={editorTitle}
                        onChange={(e) => setEditorTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 font-semibold mb-2">Meta Description</label>
                      <textarea
                        defaultValue="Official Marvel-Inspired Toys & Collectibles. Safe, fun & exciting toys for young superheroes."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-sm text-slate-900 h-24"
                      />
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-bold block text-slate-800">Search Engine Indexing</span>
                        <span className="text-[10px] text-slate-500 block">Allow search engines to find this page</span>
                      </div>
                      <input type="checkbox" defaultChecked className="rounded border-slate-200 bg-slate-50 accent-[#6366f1] h-4.5 w-4.5" />
                    </div>

                    {/* Drafts & Recovery List */}
                    <div className="pt-4 border-t border-slate-100 space-y-3.5">
                      <span className="text-[10px] font-bold text-[#6366f1] uppercase tracking-widest block">
                        Drafts & Recovery
                      </span>
                      {savedDrafts.filter((draft) => draft.pageId === selectedEditPage.id).length === 0 ? (
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">No saved drafts for this session yet. Click "Save Draft" in the top bar to create one.</p>
                      ) : (
                        <div className="space-y-2">
                          {savedDrafts.filter((draft) => draft.pageId === selectedEditPage.id).map((draft) => (
                            <div key={draft.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all">
                              <div className="min-w-0">
                                <span className="text-xs font-bold block text-slate-800 truncate">{getDraftDisplayName(draft)}</span>
                                <span className="text-[9px] text-slate-400 block font-mono">{getDraftBlockCount(draft)} block{getDraftBlockCount(draft) !== 1 ? "s" : ""} saved</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  hydrateEditorFromState(draft.data);
                                  triggerToast(`✨ Restored editor blocks to draft "${getDraftDisplayName(draft)}"!`);
                                }}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="acn-editor-body__grid">
                  {/* Block Library */}
                  <div
                    className={`acn-editor-zone acn-editor-zone--blocks ${
                      editorViewPanel === "blocks" ? "block" : "hidden"
                    } lg:block`}
                    >
                    <div className="acn-editor-zone__head">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Block Library
                    </div>
                    <div className="acn-editor-zone__body acn-workspace--stack no-scrollbar">
                    <div className="acn-editor-blocks-palette">
                      <span className="acn-editor-section-label mb-3">
                        Core Blocks
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Button")}
                          onClick={() => handleAddBlock("Button")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            🔗
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Button</span>
                            <span className="text-[9px] text-slate-400 block">Interactive links</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Text")}
                          onClick={() => handleAddBlock("Text")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            📝
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Text</span>
                            <span className="text-[9px] text-slate-400 block">Formatted content</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Header")}
                          onClick={() => handleAddBlock("Header")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            H1
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Header</span>
                            <span className="text-[9px] text-slate-400 block">Bold title headers</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Socials")}
                          onClick={() => handleAddBlock("Socials")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            🌐
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Socials</span>
                            <span className="text-[9px] text-slate-400 block">Social media links</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="acn-editor-blocks-palette">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                        GROWTH & SALES BLOCKS
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Shop")}
                          onClick={() => handleAddBlock("Shop")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            🛒
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Shop</span>
                            <span className="text-[9px] text-slate-400 block">Sell physical items</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Coupon")}
                          onClick={() => handleAddBlock("Coupon")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            🎟️
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Coupon</span>
                            <span className="text-[9px] text-slate-400 block">Offer promo codes</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Countdown")}
                          onClick={() => handleAddBlock("Countdown")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            ⏱️
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Countdown</span>
                            <span className="text-[9px] text-slate-400 block">Urgency timers</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Deep Link")}
                          onClick={() => handleAddBlock("Deep Link")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            ⚡
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Deep Link</span>
                            <span className="text-[9px] text-slate-400 block">App redirections</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Link Spin")}
                          onClick={() => handleAddBlock("Link Spin")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            🎡
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Link Spin</span>
                            <span className="text-[9px] text-slate-400 block">Lucky spinner wheel</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "WhatsApp")}
                          onClick={() => handleAddBlock("WhatsApp")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            💬
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">WhatsApp</span>
                            <span className="text-[9px] text-slate-400 block">Direct chat campaign</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Smart Form")}
                          onClick={() => handleAddBlock("Smart Form")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-[#EEF2FF] text-blue-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            📋
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Smart Form</span>
                            <span className="text-[9px] text-slate-400 block">Gather lead info</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="acn-editor-blocks-palette">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                        MEDIA BLOCKS
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Video")}
                          onClick={() => handleAddBlock("Video")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            🎥
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Video</span>
                            <span className="text-[9px] text-slate-400 block">Play video streams</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Music")}
                          onClick={() => handleAddBlock("Music")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            🎵
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Music</span>
                            <span className="text-[9px] text-slate-400 block">Audio tracks/music</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Gallery")}
                          onClick={() => handleAddBlock("Gallery")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            🖼️
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Gallery</span>
                            <span className="text-[9px] text-slate-400 block">Image gallery</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "PDF")}
                          onClick={() => handleAddBlock("PDF")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            📄
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">PDF</span>
                            <span className="text-[9px] text-slate-400 block">Download documents</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="acn-editor-blocks-palette">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">
                        OTHERS BLOCKS
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "vCard")}
                          onClick={() => handleAddBlock("vCard")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            🪪
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">vCard</span>
                            <span className="text-[9px] text-slate-400 block">Save contact details</span>
                          </div>
                        </button>

                        <button
                          draggable={true}
                          onDragStart={(e) => handleDragStartBlockType(e, "Events")}
                          onClick={() => handleAddBlock("Events")}
                          className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 p-3 rounded-2xl text-left transition-all group relative shadow-sm hover:border-slate-300 cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                          title="Drag this block to the Manager or Live Preview, or click to add"
                        >
                          <span className="h-8 w-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                            📅
                          </span>
                          <div>
                            <span className="text-xs font-bold block text-slate-800">Events</span>
                            <span className="text-[9px] text-slate-400 block">Meetups & RSVP events</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Saved Templates & Session Drafts in Editor Sidebar */}
                    {(savedTemplates.length > 0 || savedDrafts.length > 0) && (
                      <div className="pt-4 border-t border-slate-200/80 space-y-6">
                        <span className="text-[10px] font-extrabold text-[#6366f1] uppercase tracking-widest block">
                          SAVED TEMPLATES & DRAFTS
                        </span>
                        
                        {savedTemplates.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Templates</span>
                            <div className="grid grid-cols-1 gap-2">
                              {savedTemplates.map((tpl) => (
                                <div key={tpl.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-800 block truncate">💎 {getTemplateDisplayName(tpl)}</span>
                                    <span className="text-[9px] text-slate-400 font-medium block">{getTemplateBlockCount(tpl)} blocks</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      hydrateEditorFromState(tpl.data);
                                      setLinkedTemplateId(tpl.id);
                                      triggerToast(`✨ Applied Template "${getTemplateDisplayName(tpl)}" to editor!`);
                                    }}
                                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-[#6366f1] text-[9px] font-bold rounded-lg transition-colors border border-indigo-500/20"
                                  >
                                    Apply
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {savedDrafts.some((draft) => draft.pageId === selectedEditPage.id) && (
                          <div className="space-y-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Session Drafts</span>
                            <div className="grid grid-cols-1 gap-2">
                              {savedDrafts.filter((draft) => draft.pageId === selectedEditPage.id).map((draft) => (
                                <div key={draft.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-800 block truncate">📝 {getDraftDisplayName(draft)}</span>
                                    <span className="text-[9px] text-slate-400 font-medium block">{getDraftBlockCount(draft)} blocks</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      hydrateEditorFromState(draft.data);
                                      triggerToast(`✨ Restored Draft for "${getDraftDisplayName(draft)}"!`);
                                    }}
                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-bold rounded-lg transition-colors"
                                  >
                                    Restore
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </div>

                  {/* Page Editor: Cover + Accordions */}
                  <div
                    className={`acn-editor-zone acn-editor-zone--compose ${
                      editorViewPanel === "edit" ? "block" : "hidden"
                    } lg:block`}
                    >
                    <div className="acn-editor-zone__head">
                      <Edit3 className="h-3.5 w-3.5" />
                      Page Editor
                    </div>
                    <div className="acn-editor-zone__body acn-workspace--stack no-scrollbar">
                    {/* COVER IMAGE & BIO CARD */}
                    <div className="acn-editor-panel acn-editor-cover-panel p-5 shadow-sm space-y-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="acn-editor-section-label">
                          Cover Image & Header
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setCoverUrlDraft(
                                editorCoverPhoto.startsWith("data:") ? DEFAULT_COVER : editorCoverPhoto
                              );
                              setShowCoverUrlModal(true);
                            }}
                            className="acn-cover-url-edit-btn"
                            aria-label="Edit custom cover photo URL"
                          >
                            <Edit3 className="h-3.5 w-3.5" aria-hidden />
                            <span className="acn-cover-url-edit-btn__tooltip">Custom cover photo URL</span>
                          </button>
                          <span className="acn-editor-section-badge">
                            Live Editing
                          </span>
                        </div>
                      </div>

                      {/* Dropzone/Preview Frame */}
                      <div className="relative h-40 bg-slate-100 acn-editor-cover-panel__frame group">
                        <img
                          src={editorCoverPhoto || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"}
                          alt="Cover Banner"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Hidden File Input */}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverPhotoUpload}
                          id="cover-photo-file-upload-center"
                          className="hidden"
                        />
                        
                        {/* Overlay trigger for Drag & Drop / Browse */}
                        <label
                          htmlFor="cover-photo-file-upload-center"
                          className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-xs font-bold gap-1.5 p-4 text-center"
                        >
                          <span className="text-xl">📷</span>
                          <span>Drop cover photo or browse</span>
                          <span className="text-[9px] font-normal opacity-75">Supports PNG, JPG, GIF up to 5MB</span>
                        </label>
                      </div>

                      {/* Title, handle & bio */}
                      <div className="grid grid-cols-1 gap-3.5 acn-editor-cover-panel__fields">
                          <div>
                            <label className="acn-editor-form-label">Biolink Title</label>
                            <input
                              type="text"
                              value={editorTitle}
                              onChange={(e) => setEditorTitle(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-800"
                              placeholder="My BioLink"
                            />
                          </div>

                          <div>
                            <label className="acn-editor-form-label">
                              Page Handle (@watermark)
                            </label>
                            <div className="acn-editor-handle-field flex items-center gap-2 bg-slate-50 border border-slate-200 focus-within:border-[#6366f1] rounded-xl px-3.5">
                              <span className="text-sm font-bold text-slate-400 shrink-0 select-none" aria-hidden>
                                @
                              </span>
                              <input
                                type="text"
                                value={editorHandle}
                                onChange={(e) => setEditorHandle(normalizeHandleInput(e.target.value))}
                                className="acn-editor-handle-field__input flex-1 min-w-0 bg-transparent border-0 focus:outline-none focus:ring-0 py-2.5 text-sm font-semibold text-slate-800 font-mono placeholder:text-slate-400"
                                placeholder={handlePlaceholder}
                                aria-label="Page handle"
                              />
                            </div>
                            <p className="acn-editor-form-hint">
                              {previewHandle
                                ? `Live preview shows ${previewHandle}`
                                : `Optional — e.g. @${handlePlaceholder} (leave empty to hide on your page)`}
                            </p>
                          </div>

                          <div>
                            <label className="acn-editor-form-label">Short Bio</label>
                            <textarea
                              value={editorBio}
                              onChange={(e) => setEditorBio(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2.5 px-3.5 text-xs text-slate-600 resize-none"
                              placeholder="Write a short bio..."
                              rows={2}
                            />
                          </div>
                        </div>
                    </div>

                    {/* ACCORDION BLOCKS LIST */}
                    <div className="space-y-3.5 acn-editor-blocks-section">
                      <div className="flex items-center justify-between gap-3">
                        <span className="acn-editor-section-label">
                          Page Blocks (Accordions)
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isAccordionReorderDrag && draggedBlockIndex !== null && (
                            <span className="acn-editor-section-badge animate-pulse">
                              {dropTarget
                                ? `Drop at #${getDropDisplayPosition(dropTarget, editorBlocks.length)}`
                                : "Drag ⋮⋮ up/down to reorder"}
                            </span>
                          )}
                          <span className="acn-editor-blocks-section__meta">
                            {editorBlocks.length} widget{editorBlocks.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <div
                        ref={accordionListRef}
                        onDragOver={handleDragOverTarget}
                        onDragEnter={handleDragEnterManager}
                        onDragLeave={handleDragLeaveManager}
                        onDrop={handleDropOnManager}
                        className={`acn-editor-accordions no-scrollbar space-y-3 p-4 rounded-3xl border transition-all max-h-[50vh] lg:max-h-[580px] overflow-y-auto overflow-x-hidden shadow-inner ${
                          isDraggingOverManager
                            ? "ring-2 ring-indigo-400 ring-opacity-50 border-indigo-400"
                            : isAccordionReorderDrag
                              ? "border-indigo-300/80"
                              : ""
                        }`}
                      >
                        {editorBlocks.length === 0 ? (
                          <div className="text-center py-16 text-slate-400 text-xs font-semibold space-y-2">
                            <div className="text-2xl">📥</div>
                            <p>No blocks added yet.</p>
                            <p className="font-normal text-[11px] opacity-75">Drag any block from the left or click them to get started!</p>
                          </div>
                        ) : (
                          editorBlocks.map((block, idx) => {
                            const isExpanded = expandedBlockId === block.id;
                            const isCurrentlyDragged = draggedBlockIndex === idx;
                            const showDropBefore =
                              dropTarget?.index === idx && dropTarget.position === "before" && !isCurrentlyDragged;
                            const showDropAfter =
                              dropTarget?.index === idx && dropTarget.position === "after" && !isCurrentlyDragged;
                            return (
                              <div
                                key={block.id}
                                id={`editor-block-${block.id}`}
                                data-accordion-block
                                onDragOver={(e) => handleBlockDragOver(e, idx)}
                                onDrop={(e) => handleBlockDrop(e, idx)}
                                className={`relative flex flex-col acn-editor-accordion-item rounded-2xl overflow-hidden transition-all duration-200 ${
                                  isExpanded
                                    ? "border-[#6366f1] shadow-md ring-1 ring-[#6366f1]/15"
                                    : "shadow-sm hover:shadow"
                                } ${isCurrentlyDragged ? "opacity-40 scale-[0.98] border-dashed border-[#6366f1]" : ""}`}
                              >
                                {showDropBefore && (
                                  <div className="absolute -top-[7px] left-2 right-2 z-30 flex items-center gap-2 pointer-events-none">
                                    <div className="h-1 flex-1 rounded-full bg-[#6366f1] shadow-[0_0_10px_rgba(99,102,241,0.55)]" />
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#6366f1] bg-white px-1.5 py-0.5 rounded border border-indigo-200 shadow-sm">
                                      Drop here
                                    </span>
                                  </div>
                                )}
                                {showDropAfter && (
                                  <div className="absolute -bottom-[7px] left-2 right-2 z-30 flex items-center gap-2 pointer-events-none">
                                    <div className="h-1 flex-1 rounded-full bg-[#6366f1] shadow-[0_0_10px_rgba(99,102,241,0.55)]" />
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#6366f1] bg-white px-1.5 py-0.5 rounded border border-indigo-200 shadow-sm">
                                      Drop here
                                    </span>
                                  </div>
                                )}
                                {/* Accordion Header */}
                                <div
                                  onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                                  className="flex items-center justify-between p-3.5 cursor-pointer select-none acn-editor-accordion-header transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      draggable
                                      onDragStart={(e) => handleBlockDragStart(e, idx)}
                                      onDragEnd={handleBlockDragEnd}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-slate-300 hover:text-[#6366f1] cursor-grab active:cursor-grabbing shrink-0 px-1 py-2 -my-1 touch-none rounded-lg hover:bg-indigo-50/80"
                                      title="Drag up or down to reorder in Page Blocks"
                                    >
                                      <GripVertical className="h-4 w-4" />
                                    </div>
                                    
                                    {/* Styled Icon */}
                                    {getBlockIcon(block.type)}

                                    <div className="min-w-0">
                                      <span className="block text-xs font-bold text-slate-800 truncate" title={block.label}>
                                        {block.label}
                                      </span>
                                      <span className="block text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                                        {block.type}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 text-slate-400">
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-[#6366f1]" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </div>
                                </div>

                                {/* Accordion Content */}
                                {isExpanded && (
                                  <div className="border-t p-4 acn-editor-accordion-body space-y-6 text-left animate-in fade-in slide-in-from-top-1 duration-200">
                                    {/* Widget Title */}
                                    {block.type !== "Shop" && (
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Widget Title</label>
                                        <input
                                          type="text"
                                          value={block.label}
                                          onChange={(e) => handleUpdateBlockField(block.id, "label", e.target.value)}
                                          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
                                          placeholder="Enter widget label..."
                                        />
                                      </div>
                                    )}

                                    {/* Subtext and Customizations for Button/WhatsApp/Events/Deep Link */}
                                    {(block.type === "Button" || block.type === "WhatsApp" || block.type === "Events" || block.type === "Deep Link") && (
                                      <>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subtext (Optional)</label>
                                            <input
                                              type="text"
                                              value={(block as any).subtext || ""}
                                              onChange={(e) => handleUpdateBlockField(block.id, "subtext", e.target.value)}
                                              className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
                                              placeholder="e.g. Free shipping!"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Icon (Emoji)</label>
                                            <input
                                              type="text"
                                              value={(block as any).iconEmoji || ""}
                                              onChange={(e) => handleUpdateBlockField(block.id, "iconEmoji", e.target.value)}
                                              className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
                                              placeholder="e.g. 🎒"
                                            />
                                          </div>
                                        </div>

                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Show Arrow Icon</label>
                                          <select
                                            value={(block as any).showArrow || "Yes"}
                                            onChange={(e) => handleUpdateBlockField(block.id, "showArrow", e.target.value)}
                                            className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
                                          >
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                          </select>
                                        </div>
                                      </>
                                    )}

                                    {/* Destination URL or Action values */}
                                    {block.type !== "Header" && block.type !== "Text" && block.type !== "Shop" && block.type !== "Gallery" && block.type !== "Coupon" && (
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                          {block.type === "WhatsApp" ? "WhatsApp Number" : block.type === "Smart Form" ? "Email for Leads" : "Destination Link / Action"}
                                        </label>
                                        <input
                                          type="text"
                                          value={block.value}
                                          onChange={(e) => handleUpdateBlockField(block.id, "value", e.target.value)}
                                          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800 font-mono"
                                          placeholder={block.type === "WhatsApp" ? "e.g. +919876543210" : "e.g. https://yoursite.com"}
                                        />
                                      </div>
                                    )}

                                    {/* Shop Specific Fields */}
                                    {block.type === "Shop" && (
                                      <div className="space-y-6">
                                        {/* TITLE */}
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Title</label>
                                          <input
                                            type="text"
                                            value={block.label}
                                            onChange={(e) => handleUpdateBlockField(block.id, "label", e.target.value)}
                                            className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800"
                                            placeholder="My Shop"
                                          />
                                        </div>

                                        {/* ALIGNMENT & CURRENCY */}
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alignment</label>
                                            <select
                                              value={(block as any).alignment || "Centre"}
                                              onChange={(e) => handleUpdateBlockField(block.id, "alignment", e.target.value)}
                                              className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2.5 px-3 text-xs text-slate-800"
                                            >
                                              <option value="Left">Left</option>
                                              <option value="Centre">Centre</option>
                                              <option value="Right">Right</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Currency</label>
                                            <select
                                              value={(block as any).currency || "₹ INR"}
                                              onChange={(e) => handleUpdateBlockField(block.id, "currency", e.target.value)}
                                              className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2.5 px-3 text-xs text-slate-800"
                                            >
                                              <option value="₹ INR">₹ INR</option>
                                              <option value="$ USD">$ USD</option>
                                              <option value="€ EUR">€ EUR</option>
                                              <option value="£ GBP">£ GBP</option>
                                              <option value="¥ JPY">¥ JPY</option>
                                            </select>
                                          </div>
                                        </div>

                                        {/* PRODUCTS */}
                                        <div className="space-y-3.5">
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Products</label>
                                          {((block as any).products || defaultProductsList).map((product: any, pIdx: number) => (
                                            <div key={product.id || pIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 relative">
                                              <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Product {pIdx + 1}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const currentList = (block as any).products || defaultProductsList;
                                                    const updatedProducts = currentList.filter((_: any, idx: number) => idx !== pIdx);
                                                    handleUpdateBlockField(block.id, "products", updatedProducts);
                                                  }}
                                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors"
                                                  title="Delete Product"
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                              
                                              {/* Product Name */}
                                              <div>
                                                <input
                                                  type="text"
                                                  value={product.name || ""}
                                                  onChange={(e) => {
                                                    const currentList = [...((block as any).products || defaultProductsList)];
                                                    currentList[pIdx] = { ...currentList[pIdx], name: e.target.value };
                                                    handleUpdateBlockField(block.id, "products", currentList);
                                                  }}
                                                  className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs font-semibold text-slate-800"
                                                  placeholder="Product Name"
                                                />
                                              </div>

                                              {/* Product URL */}
                                              <div>
                                                <input
                                                  type="text"
                                                  value={product.url || ""}
                                                  onChange={(e) => {
                                                    const currentList = [...((block as any).products || defaultProductsList)];
                                                    currentList[pIdx] = { ...currentList[pIdx], url: e.target.value };
                                                    handleUpdateBlockField(block.id, "products", currentList);
                                                  }}
                                                  className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-[10px] font-mono text-slate-600"
                                                  placeholder="Product Destination URL"
                                                />
                                              </div>

                                              {/* Product Image Selector */}
                                              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-2.5">
                                                <div className="relative h-12 w-12 rounded-lg border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                                                  {product.image ? (
                                                    <>
                                                      <img src={product.image} className="h-full w-full object-contain" alt="Thumbnail" referrerPolicy="no-referrer" />
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const currentList = [...((block as any).products || defaultProductsList)];
                                                          currentList[pIdx] = { ...currentList[pIdx], image: "" };
                                                          handleUpdateBlockField(block.id, "products", currentList);
                                                        }}
                                                        className="absolute top-0.5 right-0.5 bg-rose-500 hover:bg-rose-600 text-white p-0.5 rounded-full shadow-md transition-all scale-75"
                                                      >
                                                        <X className="h-2.5 w-2.5" />
                                                      </button>
                                                    </>
                                                  ) : (
                                                    <div className="text-[8px] text-slate-400 font-bold">No Image</div>
                                                  )}
                                                </div>
                                                
                                                <div className="flex-1 space-y-1">
                                                  <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Product image</span>
                                                  <div className="flex gap-2">
                                                    <input
                                                      type="text"
                                                      value={product.image || ""}
                                                      onChange={(e) => {
                                                        const currentList = [...((block as any).products || defaultProductsList)];
                                                        currentList[pIdx] = { ...currentList[pIdx], image: e.target.value };
                                                        handleUpdateBlockField(block.id, "products", currentList);
                                                      }}
                                                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-lg py-1 px-2 text-[10px] text-slate-700"
                                                      placeholder="Image URL"
                                                    />
                                                    <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg cursor-pointer text-[9px] font-bold select-none flex items-center justify-center shrink-0">
                                                      Upload
                                                      <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                          const file = e.target.files?.[0];
                                                          if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                              const currentList = [...((block as any).products || defaultProductsList)];
                                                              currentList[pIdx] = { ...currentList[pIdx], image: reader.result as string };
                                                              handleUpdateBlockField(block.id, "products", currentList);
                                                              triggerToast("✨ Product image uploaded!");
                                                            };
                                                            reader.readAsDataURL(file);
                                                          }
                                                        }}
                                                      />
                                                    </label>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Price */}
                                              <div>
                                                <input
                                                  type="text"
                                                  value={product.price || ""}
                                                  onChange={(e) => {
                                                    const currentList = [...((block as any).products || defaultProductsList)];
                                                    currentList[pIdx] = { ...currentList[pIdx], price: e.target.value };
                                                    handleUpdateBlockField(block.id, "products", currentList);
                                                  }}
                                                  className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs font-semibold text-slate-800"
                                                  placeholder="Price (e.g. 3999)"
                                                />
                                              </div>
                                            </div>
                                          ))}
                                          
                                          {/* "+ Add Product" button */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const currentList = (block as any).products || defaultProductsList;
                                              const newProduct = {
                                                id: "prod_" + Date.now(),
                                                name: "New Toy Hero",
                                                url: "https://www.amazon.in",
                                                image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=300",
                                                price: "1999"
                                              };
                                              handleUpdateBlockField(block.id, "products", [...currentList, newProduct]);
                                            }}
                                            className="w-full py-2 border border-dashed border-[#6366f1] hover:bg-[#6366f1]/5 text-[#6366f1] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
                                          >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Product
                                          </button>
                                        </div>

                                        {/* APPEARANCE */}
                                        <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Appearance</span>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Card BG</label>
                                              <div className="flex items-center gap-2">
                                                <div
                                                  className="relative w-8 h-8 rounded-full border border-slate-200 overflow-hidden shrink-0 cursor-pointer shadow-sm"
                                                  style={{ backgroundColor: (block as any).bgColor || "#10B981" }}
                                                >
                                                  <input
                                                    type="color"
                                                    value={(block as any).bgColor || "#10B981"}
                                                    onChange={(e) => handleUpdateBlockField(block.id, "bgColor", e.target.value)}
                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                  />
                                                </div>
                                                <input
                                                  type="text"
                                                  value={(block as any).bgColor || "#10B981"}
                                                  onChange={(e) => handleUpdateBlockField(block.id, "bgColor", e.target.value)}
                                                  className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-1 px-2 text-[10px] font-mono uppercase text-slate-800"
                                                />
                                              </div>
                                            </div>

                                            <div>
                                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Text</label>
                                              <div className="flex items-center gap-2">
                                                <div
                                                  className="relative w-8 h-8 rounded-full border border-slate-200 overflow-hidden shrink-0 cursor-pointer shadow-sm"
                                                  style={{ backgroundColor: (block as any).textColor || "#FFFFFF" }}
                                                >
                                                  <input
                                                    type="color"
                                                    value={(block as any).textColor || "#FFFFFF"}
                                                    onChange={(e) => handleUpdateBlockField(block.id, "textColor", e.target.value)}
                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                  />
                                                </div>
                                                <input
                                                  type="text"
                                                  value={(block as any).textColor || "#FFFFFF"}
                                                  onChange={(e) => handleUpdateBlockField(block.id, "textColor", e.target.value)}
                                                  className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-1 px-2 text-[10px] font-mono uppercase text-slate-800"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Coupon Specific Fields */}
                                    {block.type === "Coupon" && (
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Coupon Code</label>
                                          <input
                                            type="text"
                                            value={block.value}
                                            onChange={(e) => handleUpdateBlockField(block.id, "value", e.target.value)}
                                            className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800 font-mono"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Discount Label</label>
                                          <input
                                            type="text"
                                            value={(block as any).discount || "10% OFF"}
                                            onChange={(e) => handleUpdateBlockField(block.id, "discount", e.target.value)}
                                            className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {/* Gallery Specific Fields */}
                                    {block.type === "Gallery" && (
                                      <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Image URLs (up to 3)</label>
                                        <input
                                          type="text"
                                          value={(block as any).img1 || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=300"}
                                          onChange={(e) => handleUpdateBlockField(block.id, "img1", e.target.value)}
                                          placeholder="Image 1 URL"
                                          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
                                        />
                                        <input
                                          type="text"
                                          value={(block as any).img2 || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=300"}
                                          onChange={(e) => handleUpdateBlockField(block.id, "img2", e.target.value)}
                                          placeholder="Image 2 URL (Optional)"
                                          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
                                        />
                                        <input
                                          type="text"
                                          value={(block as any).img3 || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=300"}
                                          onChange={(e) => handleUpdateBlockField(block.id, "img3", e.target.value)}
                                          placeholder="Image 3 URL (Optional)"
                                          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
                                        />
                                      </div>
                                    )}

                                    {/* PDF Specific Fields */}
                                    {block.type === "PDF" && (
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">File Size Display</label>
                                        <input
                                          type="text"
                                          value={(block as any).fileSize || "3.2 MB"}
                                          onChange={(e) => handleUpdateBlockField(block.id, "fileSize", e.target.value)}
                                          className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800"
                                        />
                                      </div>
                                    )}

                                    {/* Appearance Options (Background & Text Colors) */}
                                    {(block.type === "Button" || block.type === "Text" || block.type === "Coupon" || block.type === "WhatsApp" || block.type === "vCard" || block.type === "Deep Link") && (
                                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Background Color</label>
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="relative w-8 h-8 rounded-full border border-slate-200 overflow-hidden shrink-0 cursor-pointer shadow-sm animate-in zoom-in-75 duration-150"
                                              style={{ backgroundColor: (block as any).bgColor || (block.type === "WhatsApp" ? "#25D366" : block.type === "Coupon" ? "#EFF6FF" : block.type === "Button" || block.type === "Deep Link" ? BIO_LINK.bg : "#FFFFFF") }}
                                            >
                                              <input
                                                type="color"
                                                value={(block as any).bgColor || (block.type === "WhatsApp" ? "#25D366" : block.type === "Coupon" ? "#EFF6FF" : block.type === "Button" || block.type === "Deep Link" ? BIO_LINK.bg : "#FFFFFF")}
                                                onChange={(e) => handleUpdateBlockField(block.id, "bgColor", e.target.value)}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                              />
                                            </div>
                                            <input
                                              type="text"
                                              value={(block as any).bgColor || (block.type === "WhatsApp" ? "#25D366" : block.type === "Coupon" ? "#EFF6FF" : block.type === "Button" || block.type === "Deep Link" ? BIO_LINK.bg : "#FFFFFF")}
                                              onChange={(e) => handleUpdateBlockField(block.id, "bgColor", e.target.value)}
                                              className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-1 px-2.5 text-[11px] font-mono uppercase text-slate-800"
                                            />
                                          </div>
                                        </div>

                                        <div>
                                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Text Color</label>
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="relative w-8 h-8 rounded-full border border-slate-200 overflow-hidden shrink-0 cursor-pointer shadow-sm animate-in zoom-in-75 duration-150"
                                              style={{ backgroundColor: (block as any).textColor || (block.type === "WhatsApp" || block.type === "Deep Link" || block.type === "Button" ? BIO_LINK.text : "#0F172A") }}
                                            >
                                              <input
                                                type="color"
                                                value={(block as any).textColor || (block.type === "WhatsApp" || block.type === "Deep Link" || block.type === "Button" ? BIO_LINK.text : "#0F172A")}
                                                onChange={(e) => handleUpdateBlockField(block.id, "textColor", e.target.value)}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                              />
                                            </div>
                                            <input
                                              type="text"
                                              value={(block as any).textColor || (block.type === "WhatsApp" || block.type === "Deep Link" || block.type === "Button" ? BIO_LINK.text : "#0F172A")}
                                              onChange={(e) => handleUpdateBlockField(block.id, "textColor", e.target.value)}
                                              className="w-full bg-white border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-1 px-2.5 text-[11px] font-mono uppercase text-slate-800"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Action Footers */}
                                    <div className="flex items-center justify-between pt-3.5 border-t border-slate-100">
                                      <button
                                        onClick={() => handleDeleteBlock(block.id)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Delete Widget</span>
                                      </button>
                                      <button
                                        onClick={() => setExpandedBlockId(null)}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase"
                                      >
                                        Collapse
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live phone preview */}
            <div
              className={`acn-editor-zone acn-editor-zone--preview acn-editor-preview-rail flex flex-col h-full min-h-0 shrink-0 ${
                editorViewPanel === "preview" ? "flex" : "hidden"
              } lg:flex`}
            >
              <div className="acn-editor-zone__head acn-editor-zone__head--with-actions">
                <div className="acn-editor-zone__head-main">
                  <Smartphone className="h-3.5 w-3.5" />
                  Live Preview
                </div>
                <div className="acn-editor-preview-theme-toggle" role="group" aria-label="Preview page theme">
                  <button
                    type="button"
                    className="acn-editor-preview-theme-toggle__btn"
                    aria-pressed={editorPageTheme === "dark"}
                    onClick={() => handlePreviewThemeChange("dark")}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    className="acn-editor-preview-theme-toggle__btn"
                    aria-pressed={editorPageTheme === "light"}
                    onClick={() => handlePreviewThemeChange("light")}
                  >
                    Light
                  </button>
                </div>
              </div>

              <div className="acn-editor-preview-rail__stage">
                <div className="acn-phone-preview acn-phone-preview--samsung acn-phone-preview--slim acn-phone-preview--device-4k acn-phone-preview--black-case" aria-label="Mobile live preview">
                  <div className="acn-phone-preview__side-key acn-phone-preview__side-key--volume-up" aria-hidden />
                  <div className="acn-phone-preview__side-key acn-phone-preview__side-key--volume-down" aria-hidden />
                  <div className="acn-phone-preview__bezel">
                    <div className="acn-phone-preview__hole-punch" aria-hidden />

                    <div className="acn-phone-preview__display">
                      <div className="acn-phone-preview__chrome">
                        <div className="acn-phone-preview__status-bar">
                          <span>12:33</span>
                          <span className="acn-phone-preview__status-icons">▮▮▮ 100%</span>
                        </div>
                        <div className="acn-phone-preview__browser-bar">
                          <span className="acn-phone-preview__browser-home" aria-hidden>⌂</span>
                          <span className="acn-phone-preview__browser-url">
                            {PRIMARY_DOMAIN}/{selectedEditPage.slug.split("/").pop() || "page"}
                          </span>
                          <span className="acn-phone-preview__browser-tabs" aria-hidden>1</span>
                        </div>
                      </div>

                      <div
                        onDragOver={handleDragOverTarget}
                        onDragEnter={handleDragEnterPreview}
                        onDragLeave={handleDragLeavePreview}
                        onDrop={handleDropOnPreview}
                        className={`acn-preview-isolate acn-phone-preview__screen acn-bio-page-theme-${editorPageTheme} no-scrollbar transition-all duration-200 ${
                          isDraggingOverPreview ? "acn-phone-preview__screen--drop-target" : ""
                        }`}
                      >
                        <div className="acn-phone-preview__cover acn-public-bio-page__cover">
                          <img
                            src={editorCoverPhoto || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"}
                            alt="Hero Cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="acn-phone-preview__cover-fade" />
                        </div>

                        <div className="acn-phone-preview__body acn-public-bio-page__body">
                          <div className="acn-public-bio-page__profile">
                            <h3 className="acn-public-bio-page__title font-display">
                              {editorTitle || "Marvel Products"}
                            </h3>
                            {previewHandle && (
                              <p className="acn-public-bio-page__handle">{previewHandle}</p>
                            )}
                          </div>

                          {editorBio && (
                            <p className="acn-phone-preview__bio-text">{editorBio}</p>
                          )}

                          <div className="acn-phone-preview__blocks">
                    {editorBlocks.map((block, idx) => {
                      const getBlockContent = () => {
                        switch (block.type) {
                          case "Header":
                            return (
                              <h4 className="acn-phone-preview__block-heading font-display">
                                {block.label}
                              </h4>
                            );
                          case "Text":
                            return (
                              <p className="acn-phone-preview__block-text">
                                {block.label}
                              </p>
                            );
                          case "Button":
                          case "Deep Link":
                            return (
                              <button
                                onClick={() => triggerSimulatorToast(`🔗 Simulated redirection to: ${block.value || "https://acn.link"}`)}
                                style={getLinkButtonStyle(block as any)}
                                className={`w-full font-bold py-3 px-4 rounded-xl flex items-center justify-between transition-all active:scale-98 acn-bio-link-btn ${
                                  isDefaultBrightLink(block as any)
                                    ? "shadow-md shadow-violet-500/30 border-0"
                                    : "shadow-sm border border-slate-200/80"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {(block as any).iconEmoji && <span>{(block as any).iconEmoji}</span>}
                                  <div className="text-left">
                                    <span className="acn-bio-link-label block font-bold">{block.label}</span>
                                    {(block as any).subtext && <span className="acn-bio-link-subtext block font-medium opacity-70">{(block as any).subtext}</span>}
                                  </div>
                                </div>
                                {(block as any).showArrow !== "No" && (
                                  <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: getLinkArrowColor(block as any) }} />
                                )}
                              </button>
                            );
                          case "Socials":
                            return (
                              <div className="flex items-center justify-center gap-4 py-1">
                                <span
                                  onClick={() => {
                                    const webBlock = selectedEditPage ? editorBlocks.find(b => b.type === "Button" && b.value && b.value.startsWith("http")) : null;
                                    const targetUrl = webBlock ? webBlock.value : "https://google.com";
                                    window.open(targetUrl, "_blank", "noopener,noreferrer");
                                  }}
                                  className="p-2 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-full cursor-pointer transition-all shadow-sm active:scale-90"
                                >
                                  🌐
                                </span>
                                <span
                                  onClick={() => {
                                    const whatsappBlock = selectedEditPage ? editorBlocks.find(b => b.type === "WhatsApp" && b.value) : null;
                                    const whatsappVal = whatsappBlock ? whatsappBlock.value : "+919876543210";
                                    handleWhatsAppRedirect(whatsappVal);
                                  }}
                                  className="p-2 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-full cursor-pointer transition-all shadow-sm active:scale-90"
                                >
                                  💬
                                </span>
                                <span
                                  onClick={() => {
                                    window.open("https://instagram.com", "_blank", "noopener,noreferrer");
                                  }}
                                  className="p-2 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-full cursor-pointer transition-all shadow-sm active:scale-90"
                                >
                                  📸
                                </span>
                              </div>
                            );
                          case "Shop": {
                            const shopProducts = (block as any).products || defaultProductsList;
                            const align = (block as any).alignment || "Centre";
                            const alignClass = align === "Left" ? "text-left" : align === "Right" ? "text-right" : "text-center";
                            const symbol = getCurrencySymbol((block as any).currency);
                            const cardBg = (block as any).bgColor || "#10B981";
                            const textCol = (block as any).textColor || "#FFFFFF";
                            
                            return (
                              <div className="space-y-2 text-left">
                                <span className={`text-[9px] font-bold text-slate-400 block tracking-wider uppercase ${alignClass}`}>
                                  {block.label}
                                </span>
                                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                  {shopProducts.map((p: any, idxProduct: number) => (
                                    <div
                                      key={p.id || idxProduct}
                                      onClick={() => triggerSimulatorToast(`🛒 Simulated product click: ${p.name}`)}
                                      className="min-w-[105px] bg-white rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-sm hover:shadow transition-all cursor-pointer hover:border-slate-300"
                                    >
                                      <div className="h-16 bg-white flex items-center justify-center p-1.5">
                                        {p.image ? (
                                          <img
                                            src={p.image}
                                            alt={p.name}
                                            className="h-full w-full object-contain"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="text-[8px] text-slate-400 font-bold">No Image</div>
                                        )}
                                      </div>
                                      <div className="p-1.5 text-[8.5px] text-center font-medium" style={{ backgroundColor: cardBg, color: textCol }}>
                                        <p className="font-bold truncate">{p.name || "Product"}</p>
                                        <p className="font-black text-[8px] mt-0.5 opacity-90">{symbol}{p.price || "0"}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          case "Coupon":
                            return (
                              <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-2xl relative overflow-hidden space-y-1 text-left shadow-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] text-blue-600 font-medium">Special Offer</span>
                                  <span className="text-[7px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-extrabold">COUPON</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-xs tracking-wider text-blue-700 bg-blue-100/60 py-0.5 px-2 rounded border border-dashed border-blue-200">
                                    {block.value || "MARVELTOYCODE007"}
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(block.value || "MARVELTOYCODE007");
                                      triggerSimulatorToast("🎟️ Coupon copied to clipboard!");
                                    }}
                                    className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                                    title="Copy Code"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                                <p className="text-[9px] text-slate-500 leading-tight">{block.label}</p>
                              </div>
                            );
                          case "Countdown":
                            return (
                              <div className="bg-rose-50/70 border border-rose-100 p-2.5 rounded-xl text-center space-y-1 shadow-sm">
                                <span className="text-[8px] font-bold text-rose-600 uppercase tracking-widest block">Limited offer ends in</span>
                                <div className="flex items-center justify-center gap-1 text-rose-700">
                                  <div className="bg-white border border-rose-100 p-1 rounded min-w-[32px] text-center shadow-sm">
                                    <span className="font-bold text-xs block leading-none text-rose-700">
                                      {String(countdownTime.days).padStart(2, "0")}
                                    </span>
                                    <span className="text-[6px] text-rose-500 block tracking-wide uppercase">DAYS</span>
                                  </div>
                                  <span className="text-rose-400">:</span>
                                  <div className="bg-white border border-rose-100 p-1 rounded min-w-[32px] text-center shadow-sm">
                                    <span className="font-bold text-xs block leading-none text-rose-700">
                                      {String(countdownTime.hrs).padStart(2, "0")}
                                    </span>
                                    <span className="text-[6px] text-rose-500 block tracking-wide uppercase">HRS</span>
                                  </div>
                                  <span className="text-rose-400">:</span>
                                  <div className="bg-white border border-rose-100 p-1 rounded min-w-[32px] text-center shadow-sm">
                                    <span className="font-bold text-xs block leading-none text-rose-700">
                                      {String(countdownTime.mins).padStart(2, "0")}
                                    </span>
                                    <span className="text-[6px] text-rose-500 block tracking-wide uppercase">MIN</span>
                                  </div>
                                  <span className="text-rose-400">:</span>
                                  <div className="bg-white border border-rose-100 p-1 rounded min-w-[32px] text-center shadow-sm">
                                    <span className="font-bold text-xs block leading-none text-rose-700">
                                      {String(countdownTime.secs).padStart(2, "0")}
                                    </span>
                                    <span className="text-[6px] text-rose-500 block tracking-wide uppercase">SEC</span>
                                  </div>
                                </div>
                              </div>
                            );
                          case "Link Spin":
                            return (
                              <button
                                onClick={() => {
                                  setSpinResult(null);
                                  setIsSpinning(false);
                                  setShowSpinWheel(true);
                                }}
                                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-1.5 active:scale-95"
                              >
                                <span>🎡</span>
                                <span>{block.label}</span>
                              </button>
                            );
                          case "WhatsApp":
                            return (
                              <button
                                onClick={() => handleWhatsAppRedirect(block.value || "+919876543210")}
                                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs active:scale-95 border-0"
                              >
                                <MessageSquare className="h-3.5 w-3.5 font-bold" />
                                <span className="truncate">{block.label}</span>
                              </button>
                            );
                          case "Smart Form":
                            return (
                              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-2 text-left shadow-sm">
                                <span className="font-bold text-[9px] block text-center text-slate-700 uppercase tracking-wider">{block.label}</span>
                                <div className="space-y-1.5">
                                  <input
                                    type="email"
                                    required
                                    value={simulatorLeadEmail}
                                    onChange={(e) => setSimulatorLeadEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  />
                                  <button
                                    onClick={() => {
                                      if (simulatorLeadEmail) {
                                        triggerSimulatorToast(`✅ Lead saved: ${simulatorLeadEmail}`);
                                        setSimulatorLeadEmail("");
                                      } else {
                                        triggerSimulatorToast(`❌ Please enter your email first.`);
                                      }
                                    }}
                                    className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold py-1.5 rounded-lg text-xs transition-colors shadow-md shadow-violet-500/25"
                                  >
                                    Submit
                                  </button>
                                </div>
                              </div>
                            );
                          case "vCard":
                            return (
                              <button
                                onClick={() => triggerSimulatorToast(`🪪 Simulated vCard contact info download saved to phone Contacts!`)}
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm text-xs active:scale-95 border-0"
                              >
                                <User className="h-3.5 w-3.5 text-gray-400" />
                                <span className="truncate">{block.label}</span>
                              </button>
                            );
                          case "Video":
                            return (
                              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 transition-colors">
                                <div className="h-32 bg-slate-950 flex items-center justify-center relative group cursor-pointer" onClick={() => triggerSimulatorToast(`🎥 Playing Video: ${block.value || "https://youtube.com"}`)}>
                                  <div className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=400')" }} />
                                  <div className="absolute h-10 w-10 bg-red-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md transform group-hover:scale-110 transition-transform">
                                    ▶
                                  </div>
                                </div>
                                <div className="p-2.5 text-left">
                                  <span className="text-[10px] font-bold text-slate-800 block truncate">{block.label}</span>
                                </div>
                              </div>
                            );
                          case "Music":
                            return (
                              <div className="bg-gradient-to-r from-violet-500 to-indigo-600 p-3 rounded-2xl text-white shadow-sm flex items-center justify-between gap-3 cursor-pointer" onClick={() => triggerSimulatorToast(`🎵 Playing Audio: ${block.value || "Soundtrack"}`)}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-xl">🎵</span>
                                  <div className="min-w-0 text-left">
                                    <span className="font-bold text-[10px] block truncate">{block.label}</span>
                                    <span className="text-[8px] text-indigo-200 block font-bold">Theme Track • 3:24</span>
                                  </div>
                                </div>
                                <div className="h-7 w-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white shrink-0">
                                  ▶
                                </div>
                              </div>
                            );
                          case "Gallery":
                            return (
                              <div className="space-y-1.5 text-left">
                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">{block.label}</span>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <img onClick={() => triggerSimulatorToast("🖼️ Opened gallery image 1")} src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=150" alt="1" className="h-14 w-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" />
                                  <img onClick={() => triggerSimulatorToast("🖼️ Opened gallery image 2")} src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=150" alt="2" className="h-14 w-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" />
                                  <img onClick={() => triggerSimulatorToast("🖼️ Opened gallery image 3")} src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=150" alt="3" className="h-14 w-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" />
                                </div>
                              </div>
                            );
                          case "PDF":
                            return (
                              <div className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors cursor-pointer" onClick={() => triggerSimulatorToast(`📄 Opening PDF Catalog: ${block.value || "catalog.pdf"}`)}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xl">📄</span>
                                  <div className="min-w-0 text-left">
                                    <span className="font-bold text-[10px] block text-slate-800 truncate">{block.label}</span>
                                    <span className="text-[8px] text-slate-400 block font-mono">PDF Document • 3.2 MB</span>
                                  </div>
                                </div>
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-semibold shrink-0">GET</span>
                              </div>
                            );
                          case "Events":
                            return (
                              <div className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors cursor-pointer" onClick={() => triggerSimulatorToast(`📅 RSVP Successful for Event: ${block.label}`)}>
                                <div className="flex items-center gap-2.5 min-w-0 text-left">
                                  <div className="bg-violet-50 border border-violet-100 text-violet-600 rounded-lg p-1 text-center min-w-[34px] shrink-0 font-bold">
                                    <span className="text-[8px] block uppercase leading-none font-mono">JUL</span>
                                    <span className="text-xs block leading-none mt-0.5">20</span>
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-[10px] block text-slate-800 truncate">{block.label}</span>
                                    <span className="text-[8px] text-slate-500 block">7:00 PM • Virtual Livestream</span>
                                  </div>
                                </div>
                                <span className="text-[9px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-2.5 py-1.5 rounded-lg font-extrabold shadow-md shadow-violet-500/25 tracking-wide shrink-0">RSVP</span>
                              </div>
                            );
                          default:
                            return (
                              <button
                                onClick={() => triggerSimulatorToast(`✨ Clicked block: ${block.label}`)}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs shadow-sm border border-slate-200 transition-colors"
                              >
                                {block.label}
                              </button>
                            );
                        }
                      };

                      return (
                        <div
                          key={block.id}
                          className="group relative p-1.5 rounded-2xl border border-transparent hover:border-dashed hover:border-[#6366f1]/55 hover:bg-[#6366f1]/5 transition-all duration-200 cursor-pointer"
                          onClick={() => {
                            setExpandedBlockId(block.id);
                            const el = document.getElementById(`editor-block-${block.id}`);
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "center" });
                            }
                          }}
                        >
                          {/* Floating Live Editor Controls */}
                          <div className="absolute -top-3.5 right-1.5 hidden max-lg:flex lg:group-hover:flex items-center gap-1 bg-white border border-[#6366f1]/30 shadow-md py-0.5 px-1.5 rounded-lg z-30 animate-in zoom-in-95 duration-150">
                            <span className="text-[7px] font-mono font-bold text-[#6366f1] uppercase tracking-widest mr-1">
                              {block.type}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedBlockId(block.id);
                                const el = document.getElementById(`editor-block-${block.id}`);
                                if (el) {
                                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                                }
                              }}
                              title="Edit Widget"
                              className="p-1 hover:bg-indigo-500/10 rounded text-slate-500 hover:text-[#6366f1] transition-colors"
                            >
                              <Edit3 className="h-2.5 w-2.5" />
                            </button>
                          </div>

                          {/* Block Preview Content */}
                          <div className="relative z-10">
                            {getBlockContent()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="acn-bio-page-footer acn-phone-preview__footer">
                    <span>Powered by ACN Link</span>
                  </div>
                        </div>

                  {/* Interactive Simulator Toast Overlay */}
                  {simulatorToast && (
                    <div className="absolute bottom-5 left-4 right-4 bg-slate-900/95 border border-slate-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl text-center shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 flex items-center justify-center gap-1.5">
                      <span>🔔</span>
                      <span className="leading-tight">{simulatorToast}</span>
                    </div>
                  )}

                  {/* Dynamic Interactive Link Spin (Lucky Wheel) Game Overlay inside phone */}
                  {showSpinWheel && (
                    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 text-white animate-in fade-in duration-200">
                      <button
                        onClick={() => setShowSpinWheel(false)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="text-center space-y-1 mb-6">
                        <span className="text-[10px] font-extrabold text-cyan-400 tracking-wider uppercase block">🎁 GROW YOUR SALES</span>
                        <h4 className="font-display font-black text-base">Lucky Wheel Simulator</h4>
                        <p className="text-[9px] text-slate-300">Spin the wheel to win official prizes & coupons!</p>
                      </div>

                      {/* Wheel Wrapper */}
                      <div className="relative w-40 h-40 flex items-center justify-center mb-5">
                        {/* Needle/pointer */}
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 z-30 rotate-45 transform shadow-md" />

                        {/* Spinner circle using simple CSS */}
                        <div
                          className={`w-full h-full rounded-full border-4 border-slate-700 relative overflow-hidden shadow-xl ${
                            isSpinning ? "animate-[spin_0.8s_linear_infinite]" : ""
                          }`}
                          style={{
                            background: "conic-gradient(#6366f1 0deg 90deg, #2563EB 90deg 180deg, #10B981 180deg 270deg, #F59E0B 270deg 360deg)"
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                            <span className="absolute top-3 text-white text-[8px]">Gift</span>
                            <span className="absolute right-3 text-white text-[8px]">20%</span>
                            <span className="absolute bottom-3 text-white text-[8px]">Try Again</span>
                            <span className="absolute left-3 text-white text-[8px]">Freebie</span>
                          </div>
                        </div>

                        {/* Spin hub */}
                        <div className="absolute w-12 h-12 rounded-full bg-white text-slate-900 shadow-lg flex items-center justify-center z-20">
                          <span className="text-xs font-extrabold text-slate-950">1SL</span>
                        </div>
                      </div>

                      {spinResult ? (
                        <div className="text-center space-y-2.5 animate-in zoom-in-95 duration-200">
                          <p className="text-xs font-bold text-green-400">🎉 CONGRATULATIONS! 🎉</p>
                          <p className="text-xs font-black text-white">{spinResult}</p>
                          <p className="text-[9px] text-slate-400 bg-slate-950 px-2 py-1.5 rounded font-mono border border-slate-800">Use Code: <span className="font-bold text-cyan-400">LUCKYSPIN20</span></p>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText("LUCKYSPIN20");
                                triggerSimulatorToast("🎟️ Spin coupon code copied!");
                                setShowSpinWheel(false);
                              }}
                              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg text-[10px] font-bold"
                            >
                              Copy Code
                            </button>
                            <button
                              onClick={() => {
                                setSpinResult(null);
                                setIsSpinning(false);
                              }}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold"
                            >
                              Spin Again
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (isSpinning) return;
                            setIsSpinning(true);
                            setTimeout(() => {
                              setIsSpinning(false);
                              const prizes = [
                                "FREE Superhero Action Figure!",
                                "20% Discount Code!",
                                "Buy 1 Get 1 Free Marvel Poster!",
                                "Free shipping on next order!"
                              ];
                              const won = prizes[Math.floor(Math.random() * prizes.length)];
                              setSpinResult(won);
                            }, 1800);
                          }}
                          disabled={isSpinning}
                          className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-slate-950 hover:text-white rounded-xl text-xs font-black transition-all shadow-md disabled:opacity-50"
                        >
                          {isSpinning ? "SPINNING..." : "SPIN THE WHEEL!"}
                        </button>
                      )}
                    </div>
                  )}

                        <div className="acn-phone-preview__home-bar" aria-hidden />
                      </div>
                    </div>
                  </div>
                  <div className="acn-phone-preview__side-key acn-phone-preview__side-key--power" aria-hidden />
                </div>
              </div>
            </div>
          </div>

          {showCoverUrlModal && (
            <div
              className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
              onClick={() => setShowCoverUrlModal(false)}
              role="presentation"
            >
              <div
                className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl border border-gray-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-lg text-gray-950">Cover Photo URL</h3>
                  <button
                    type="button"
                    onClick={() => setShowCoverUrlModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Paste an image URL to use as your page cover. Changes apply to the live preview instantly.
                </p>
                {editorCoverPhoto.startsWith("data:") && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                    You uploaded a file. Applying a URL will replace the uploaded cover.
                  </p>
                )}
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Cover Photo URL (Alternative)
                </label>
                <input
                  type="url"
                  value={coverUrlDraft}
                  onChange={(e) => setCoverUrlDraft(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#6366f1] focus:outline-none rounded-xl py-2.5 px-3 text-xs text-slate-800 font-mono mb-4"
                  placeholder="https://images.unsplash.com/..."
                  autoFocus
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCoverUrlDraft(DEFAULT_COVER);
                      setEditorCoverPhoto(DEFAULT_COVER);
                      setShowCoverUrlModal(false);
                      triggerToast("Cover photo reset to default.");
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Reset Default
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = coverUrlDraft.trim();
                      if (!trimmed) {
                        triggerToast("Enter a valid image URL.");
                        return;
                      }
                      setEditorCoverPhoto(trimmed);
                      setShowCoverUrlModal(false);
                      triggerToast("Cover photo URL updated!");
                    }}
                    className="flex-1 rounded-xl bg-[#591bd9] hover:bg-[#4a16b8] px-3 py-2.5 text-xs font-bold text-white transition-colors"
                  >
                    Apply URL
                  </button>
                </div>
              </div>
            </div>
          )}

          {showSaveTemplateModal && (
            <div
              className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
              onClick={() => setShowSaveTemplateModal(false)}
              role="presentation"
            >
              <div
                className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl border border-gray-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display font-bold text-lg text-gray-950">
                    {linkedTemplateId ? "Update Template" : "Save as Template"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSaveTemplateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    confirmSaveAsTemplate();
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      TEMPLATE NAME
                    </label>
                    <input
                      type="text"
                      value={templateNameInput}
                      onChange={(e) => setTemplateNameInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#6366f1] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none"
                      placeholder="e.g. Summer Sale Landing"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Saves title, bio, cover, blocks, and settings to Templates → My Templates.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSaveTemplateModal(false)}
                      className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-sm font-semibold"
                    >
                      {linkedTemplateId ? "Update Template" : "Save Template"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

          {toast && (
            <div className="acn-editor-toast fixed bottom-6 right-6 z-[120] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-500/40 animate-in fade-in slide-in-from-bottom-5 duration-300">
              <span className="text-sm font-bold">{toast}</span>
            </div>
          )}
        </div>,
        document.body
        )}

      {/* 4th - QR Code Customizer Popup Modal matching screenshot 3 perfectly */}
      {selectedQRPage && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 shadow-2xl border border-gray-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-gray-900 text-lg">
                QR — {selectedQRPage.title}
              </h3>
              <button
                onClick={() => setSelectedQRPage(null)}
                className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* QR display box */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-slate-100 relative shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=${qrForeground.replace(
                    "#",
                    ""
                  )}&bgcolor=${qrBackground.replace("#", "")}&data=${encodeURIComponent(`${getShareableOrigin()}/?previewPageId=${selectedQRPage.id}`)}`}
                  alt="QR Code"
                  referrerPolicy="no-referrer"
                  className="w-44 h-44 rounded-lg shadow bg-white"
                />

                {/* Logo watermark option if selected */}
                {hasLogo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-9 h-9 bg-white p-1 rounded-lg border border-gray-200 shadow-md flex items-center justify-center">
                      <span className="text-[10px] font-extrabold text-[#6366f1]">1SL</span>
                    </div>
                  </div>
                )}
              </div>

              {/* URL label under QR */}
              <div className="mt-3 flex flex-col items-center gap-1.5 max-w-sm w-full">
                <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg truncate w-full text-center">
                  {`${getShareableOrigin()}/?previewPageId=${selectedQRPage.id}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void copyText(
                      `${getShareableOrigin()}/?previewPageId=${selectedQRPage.id}`,
                      "🔗 Public shareable link copied!"
                    );
                  }}
                  className="bg-indigo-500/100 hover:bg-indigo-400 text-white font-bold py-1 px-3 rounded-lg text-[10px] transition-colors"
                >
                  Copy Share Link
                </button>
              </div>
            </div>

            {/* Color palette selector matching mockup */}
            <div className="mb-4">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                COLOR PRESETS
              </span>
              <div className="flex flex-wrap gap-2">
                {["Default", "Orange", "Dark", "Navy", "Purple", "Green", "Gold"].map((colorName) => (
                  <button
                    key={colorName}
                    onClick={() => handleColorSelect(colorName)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      qrColor === colorName
                        ? "border-[#6366f1] bg-indigo-500/10 text-[#6366f1]"
                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: COLOR_MAP[colorName] }}
                    />
                    <span>{colorName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* QR Pattern Design selector */}
            <div className="mb-4">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                DESIGN STYLES
              </span>
              <div className="grid grid-cols-4 gap-2">
                {["Squares", "Rounded", "Dots", "Fluid"].map((style) => (
                  <button
                    key={style}
                    onClick={() => setQrDesign(style as any)}
                    className={`p-2.5 rounded-2xl text-center border transition-all ${
                      qrDesign === style
                        ? "border-[#6366f1] bg-indigo-500/10 text-[#6366f1] font-extrabold"
                        : "border-gray-200 hover:bg-gray-50 text-gray-500 text-xs"
                    }`}
                  >
                    <div className="font-bold text-xs">{style}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hex Colors customization swatches */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Foreground
                </label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2.5 bg-slate-50">
                  <input
                    type="color"
                    value={qrForeground}
                    onChange={(e) => {
                      setQrForeground(e.target.value);
                      setQrColor("Custom");
                    }}
                    className="w-6 h-6 rounded-md border-0 p-0 cursor-pointer overflow-hidden"
                  />
                  <span className="text-xs font-mono font-bold text-gray-700 uppercase">
                    {qrForeground}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Background
                </label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2.5 bg-slate-50">
                  <input
                    type="color"
                    value={qrBackground}
                    onChange={(e) => setQrBackground(e.target.value)}
                    className="w-6 h-6 rounded-md border-0 p-0 cursor-pointer overflow-hidden"
                  />
                  <span className="text-xs font-mono font-bold text-gray-700 uppercase">
                    {qrBackground}
                  </span>
                </div>
              </div>
            </div>

            {/* Watermark Logo upload option button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setHasLogo(!hasLogo)}
                className={`w-full flex items-center justify-center gap-2 border py-2.5 rounded-xl text-xs font-bold transition-all ${
                  hasLogo
                    ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                    : "border-gray-200 hover:bg-gray-50 text-gray-600"
                }`}
              >
                <span>↑</span>
                <span>{hasLogo ? "Remove ACN Link Watermark" : "Add ACN Link Logo Watermark"}</span>
              </button>
            </div>

            {/* Download actions matching third screenshot */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&color=${qrForeground.replace(
                  "#",
                  ""
                )}&bgcolor=${qrBackground.replace("#", "")}&data=${encodeURIComponent(`${getShareableOrigin()}/?previewPageId=${selectedQRPage.id}`)}`}
                download="qrcode.png"
                target="_blank"
                rel="noreferrer"
                className="bg-gradient-to-r from-[#6366f1] to-[#7c3aed] hover:from-[#4f46e5] hover:to-[#6d28d9] text-white py-3 rounded-xl text-xs font-bold text-center shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span>Download PNG</span>
              </a>

              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&color=${qrForeground.replace(
                  "#",
                  ""
                )}&bgcolor=${qrBackground.replace("#", "")}&format=svg&data=${encodeURIComponent(`${getShareableOrigin()}/?previewPageId=${selectedQRPage.id}`)}`}
                download="qrcode.svg"
                target="_blank"
                rel="noreferrer"
                className="border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4 text-gray-400" />
                <span>Download SVG</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {toast && !selectedEditPage && (
        <div className="fixed bottom-6 right-6 z-[200] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}
    </PageShell>
  );
}
