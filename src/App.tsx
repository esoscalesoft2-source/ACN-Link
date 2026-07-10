import React, { useState } from "react";
import { ScreenId, UserProfile, BioPage, Contact, WhatsAppCampaign, WhatsAppTemplate, SmartLink, QRCodeItem, TemplateItem, IntegrationItem, IntegrationVote, TrackingPixel, MediaFile, CustomDomain, HelpArticle, BioPageDraft, BioPageTemplate, BioEditorBlock, AppNotification } from "./types";
import {
  initialUser,
  initialBioPages,
  initialContacts,
  initialWhatsAppCampaigns,
  initialWhatsAppTemplates,
  initialSmartLinks,
  initialQRCodes,
  initialTemplates,
  initialIntegrations,
  initialVotes,
  initialTrackingPixels,
  initialMediaFiles,
  initialCustomDomains,
  initialHelpArticles
} from "./data";

// Import modular screens
import Sidebar from "./components/Sidebar";
import MobileNavDrawer from "./components/MobileNavDrawer";
import Header from "./components/Header";
import LoginScreen from "./components/LoginScreen";
import DashboardScreen from "./components/DashboardScreen";
import BioPagesScreen from "./components/BioPagesScreen";
import ContactsScreen from "./components/ContactsScreen";
import WhatsAppScreen from "./components/WhatsAppScreen";
import LinksScreen from "./components/LinksScreen";
import QRCodesScreen from "./components/QRCodesScreen";
import TemplatesScreen from "./components/TemplatesScreen";
import IntegrationsScreen from "./components/IntegrationsScreen";
import PixelsScreen from "./components/PixelsScreen";
import MediaLibraryScreen from "./components/MediaLibraryScreen";
import CustomDomainsScreen from "./components/CustomDomainsScreen";
import HelpCenterScreen from "./components/HelpCenterScreen";
import ContactSupportScreen from "./components/ContactSupportScreen";
import AccountScreen from "./components/AccountScreen";
import PublicBioPageView from "./components/PublicBioPageView";
import {
  buildEditorState,
  cloneBlocks,
  DEFAULT_COVER,
  getAllDrafts,
  getAllUserTemplates,
  getTemplateEditorPayload,
  normalizeDraft,
  normalizeTemplate,
  persistDrafts,
  persistTemplates,
  persistPagePreviewStorage,
  fetchServerTemplates,
  mergeTemplates,
  syncTemplateToServer,
  deleteTemplateOnServer,
  syncAllTemplatesToServer
} from "./storage/bioBuilderStorage";
import {
  getAllNotifications,
  getUnreadCount,
  prependNotification,
  markNotificationRead,
  markAllNotificationsRead,
  CreateNotificationInput
} from "./storage/notificationStorage";

export default function App() {
  // Parse URL search parameters for standalone public preview
  const urlParams = new URLSearchParams(window.location.search);
  const previewPageId = urlParams.get("previewPageId");

  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    try {
      const saved = sessionStorage.getItem("acnlink_session");
      if (saved) {
        const { screen, loggedIn } = JSON.parse(saved);
        if (loggedIn && screen) return screen as ScreenId;
      }
    } catch {
      /* ignore */
    }
    return ScreenId.LOGIN;
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      const saved = sessionStorage.getItem("acnlink_session");
      if (saved) {
        const { loggedIn } = JSON.parse(saved);
        return !!loggedIn;
      }
    } catch {
      /* ignore */
    }
    return false;
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getAllNotifications());
  const lastAnalyticsEventIdRef = React.useRef<string | null>(null);
  
  // App state loaded from static files
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [pages, setPages] = useState<BioPage[]>(() => {
    try {
      const saved = localStorage.getItem("biolinks_pages_list");
      return saved ? JSON.parse(saved) : initialBioPages;
    } catch {
      return initialBioPages;
    }
  });

  // Server state and sync for pages list & analytics metrics
  const [serverMetrics, setServerMetrics] = useState<{
    totalViews: number;
    totalClicks: number;
    totalRegisters: number;
    events: any[];
  } | null>(null);
  const [serverHealth, setServerHealth] = useState<"checking" | "online" | "offline">("checking");

  React.useEffect(() => {
    if (isLoggedIn) {
      sessionStorage.setItem(
        "acnlink_session",
        JSON.stringify({ loggedIn: true, screen: currentScreen })
      );
    } else {
      sessionStorage.removeItem("acnlink_session");
    }
  }, [isLoggedIn, currentScreen]);

  React.useEffect(() => {
    let isMounted = true;

    const checkServerHealth = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (!response.ok) throw new Error("Health check failed");

        const health = await response.json();
        if (isMounted) {
          setServerHealth(health.status === "ok" ? "online" : "offline");
        }
      } catch {
        if (isMounted) setServerHealth("offline");
      }
    };

    checkServerHealth();
    const interval = window.setInterval(checkServerHealth, 30_000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const pushNotification = React.useCallback((input: CreateNotificationInput) => {
    setNotifications((prev) => prependNotification(prev, input));
  }, []);

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => markNotificationRead(prev, id));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => markAllNotificationsRead(prev));
  };

  const unreadNotificationCount = getUnreadCount(notifications);

  // Load shared templates from server on startup
  React.useEffect(() => {
    if (!isLoggedIn) return;
    fetchServerTemplates().then((remote) => {
      if (remote.length === 0) return;
      setSavedTemplates((local) => {
        const merged = mergeTemplates(local, remote);
        persistTemplates(merged);
        return merged;
      });
    });
  }, [isLoggedIn]);

  // Notify on new live analytics events (skip initial load)
  React.useEffect(() => {
    if (!serverMetrics?.events?.length) return;
    const latest = serverMetrics.events[0];
    if (!latest?.id) return;

    if (lastAnalyticsEventIdRef.current === null) {
      lastAnalyticsEventIdRef.current = latest.id;
      return;
    }

    if (latest.id === lastAnalyticsEventIdRef.current) return;
    lastAnalyticsEventIdRef.current = latest.id;

    const label = latest.eventLabel || "Page activity";
    pushNotification({
      type: "analytics_event",
      title: `New ${latest.eventType || "visit"}`,
      message: `${label} · ${latest.device || "Unknown device"} on ${latest.domain || "acn.link"}`,
      targetScreen: ScreenId.DASHBOARD
    });
  }, [serverMetrics?.events, pushNotification]);

  // 1. Initial fetch of pages list and analytics from the server
  React.useEffect(() => {
    async function loadInitialData() {
      try {
        // Fetch Pages List
        const pagesRes = await fetch("/api/pages");
        if (pagesRes.ok) {
          const remotePages = await pagesRes.json();
          if (remotePages && Array.isArray(remotePages) && remotePages.length > 0) {
            setPages(remotePages);
          } else {
            // Push initial list to server if server is empty
            await fetch("/api/pages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pages: initialBioPages })
            });
          }
        }
      } catch (err) {
        console.error("Failed to load initial pages list from server:", err);
      }

      // Fetch Analytics metrics
      try {
        const analyticsRes = await fetch("/api/analytics");
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          const metrics = data?.metrics ?? {};
          setServerMetrics({
            totalViews: metrics.totalViews ?? 0,
            totalClicks: metrics.totalClicks ?? 0,
            totalRegisters: metrics.totalRegisters ?? 0,
            events: Array.isArray(data?.events) ? data.events : []
          });
        }
      } catch (err) {
        console.error("Failed to load analytics from server:", err);
      }
    }

    loadInitialData();

    // Poll for real-time analytics updates every 5 seconds!
    const interval = setInterval(() => {
      fetch("/api/analytics")
        .then(res => res.json())
        .then(data => {
          const metrics = data?.metrics ?? {};
          setServerMetrics({
            totalViews: metrics.totalViews ?? 0,
            totalClicks: metrics.totalClicks ?? 0,
            totalRegisters: metrics.totalRegisters ?? 0,
            events: Array.isArray(data?.events) ? data.events : []
          });
        })
        .catch(err => console.error("Error polling analytics:", err));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 2. Whenever pages list is updated, save to local storage AND sync to server
  React.useEffect(() => {
    localStorage.setItem("biolinks_pages_list", JSON.stringify(pages));
    
    // Sync to server
    fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pages })
    }).catch(err => {
      console.error("Failed to save pages list to server:", err);
    });
  }, [pages]);

  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [whatsAppCampaigns, setWhatsAppCampaigns] = useState<WhatsAppCampaign[]>(initialWhatsAppCampaigns);
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplate[]>(initialWhatsAppTemplates);
  const [links, setLinks] = useState<SmartLink[]>(initialSmartLinks);
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>(initialQRCodes);
  const [templates] = useState<TemplateItem[]>(initialTemplates);
  
  // Custom elevated states for draft and template persistence across pages/screens
  const [savedTemplates, setSavedTemplates] = useState<BioPageTemplate[]>(() => getAllUserTemplates());

  const [savedDrafts, setSavedDrafts] = useState<BioPageDraft[]>(() => getAllDrafts());

  const [pageBlocksMap, setPageBlocksMap] = useState<Record<string, any[]>>(() => {
    try {
      const saved = localStorage.getItem("pageBlocksMap");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [initialActiveEditPageId, setInitialActiveEditPageId] = useState<string | null>(null);
  const [initialActiveTemplateId, setInitialActiveTemplateId] = useState<string | null>(null);

  React.useEffect(() => {
    persistTemplates(savedTemplates);
    if (savedTemplates.length > 0) {
      syncAllTemplatesToServer(savedTemplates);
    }
  }, [savedTemplates]);

  React.useEffect(() => {
    persistDrafts(savedDrafts);
  }, [savedDrafts]);

  React.useEffect(() => {
    localStorage.setItem("pageBlocksMap", JSON.stringify(pageBlocksMap));
  }, [pageBlocksMap]);

  const [integrations, setIntegrations] = useState<IntegrationItem[]>(initialIntegrations);
  const [votes, setVotes] = useState<IntegrationVote[]>(initialVotes);
  const [pixels, setPixels] = useState<TrackingPixel[]>(initialTrackingPixels);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(initialMediaFiles);
  const [domains, setDomains] = useState<CustomDomain[]>(initialCustomDomains);
  const [articles] = useState<HelpArticle[]>(initialHelpArticles);

  // If we are in standalone public preview mode, render the public view immediately
  if (previewPageId) {
    const pageToPreview = pages.find((p) => p.id === previewPageId);
    return (
      <PublicBioPageView
        pageId={previewPageId}
        pageTitle={pageToPreview?.title || "BioLink"}
        pageSlug={pageToPreview?.slug || "biolink"}
        pageBio={pageToPreview?.bio}
        pageCoverPhoto={pageToPreview?.coverPhoto}
      />
    );
  }

  // Handlers for persistent operations
  const handleLoginSuccess = (email: string) => {
    setUser((prev) => ({ ...prev, email }));
    setIsLoggedIn(true);
    setCurrentScreen(ScreenId.DASHBOARD);
  };

  const handleAddPage = (title: string, slug: string) => {
    const newPage: BioPage = {
      id: "p" + (pages.length + 1),
      title,
      slug,
      status: "Live",
      views: 0,
      createdAt: "7 Jul 2026"
    };
    setPages([newPage, ...pages]);
  };

  const handleDeletePage = (id: string) => {
    setPages(pages.filter((p) => p.id !== id));
  };

  const handleUpdatePage = (id: string, title: string, bio?: string, coverPhoto?: string) => {
    setPages(pages.map((p) => (p.id === id ? { ...p, title, bio: bio !== undefined ? bio : p.bio, coverPhoto: coverPhoto !== undefined ? coverPhoto : p.coverPhoto } : p)));
  };

  const handleDuplicatePage = (id: string) => {
    const pageToDuplicate = pages.find((p) => p.id === id);
    if (!pageToDuplicate) return;

    const newId = "p_" + Date.now();
    const cleanSuffix =
      pageToDuplicate.title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") ||
      "page-copy";
    const newSlug = `acn.link/page-${cleanSuffix}-copy-${Math.floor(1000 + Math.random() * 9000)}`;

    const sourceBlocks =
      pageBlocksMap[pageToDuplicate.id] ||
      pageBlocksMap[pageToDuplicate.slug] ||
      [];

    const blocksCopy = cloneBlocks(sourceBlocks as BioEditorBlock[]);

    const duplicated: BioPage = {
      ...pageToDuplicate,
      id: newId,
      title: `${pageToDuplicate.title} (Copy)`,
      slug: newSlug,
      views: 0,
      createdAt: "7 Jul 2026"
    };

    setPages([duplicated, ...pages]);

    setPageBlocksMap((prev) => ({
      ...prev,
      [newId]: blocksCopy,
      [newSlug]: blocksCopy
    }));

    persistPagePreviewStorage(newId, newSlug, blocksCopy, {
      title: duplicated.title,
      bio: duplicated.bio || "Write a short bio...",
      coverPhoto: duplicated.coverPhoto || DEFAULT_COVER
    });

    pushNotification({
      type: "page_duplicated",
      title: "Page duplicated",
      message: `"${duplicated.title}" was created with ${blocksCopy.length} block(s).`,
      targetScreen: ScreenId.BIO_PAGES,
      meta: { pageId: newId }
    });
  };

  const handleAddContact = (newContactData: Omit<Contact, "id" | "maskedEmail" | "maskedPhone">) => {
    const newContact: Contact = {
      id: "c" + (contacts.length + 1),
      ...newContactData,
      maskedEmail: newContactData.email[0] + "••••@•••.com",
      maskedPhone: "•••••• " + newContactData.phone.slice(-4)
    };
    setContacts([newContact, ...contacts]);
    pushNotification({
      type: "contact_added",
      title: "New contact captured",
      message: `${newContact.name} was added to your contacts.`,
      targetScreen: ScreenId.CONTACTS
    });
  };

  const handleAddWhatsAppTemplate = (name: string) => {
    const newTpl: WhatsAppTemplate = {
      id: "tpl" + (whatsAppTemplates.length + 1),
      name,
      status: "Approved"
    };
    setWhatsAppTemplates([...whatsAppTemplates, newTpl]);
  };

  const handleAddWhatsAppCampaign = (name: string, recipients: string, openRate: string) => {
    const newCamp: WhatsAppCampaign = {
      id: "wc" + (whatsAppCampaigns.length + 1),
      name,
      status: "Sent",
      recipients,
      openRate
    };
    setWhatsAppCampaigns([newCamp, ...whatsAppCampaigns]);
  };

  const handleCreateLink = (title: string, slug: string, shortUrl: string) => {
    const newLink: SmartLink = {
      id: "l" + (links.length + 1),
      title,
      slug,
      shortUrl,
      status: "Live",
      retargeting: ["fb", "google"],
      clicks: 0
    };
    setLinks([newLink, ...links]);
  };

  const handleDeleteLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const handleUpdateLink = (updated: SmartLink) => {
    setLinks(links.map((l) => l.id === updated.id ? updated : l));
  };

  const handleGenerateQR = (name: string, targetUrl: string, customColor: string) => {
    const newQR: QRCodeItem = {
      id: "qr" + (qrCodes.length + 1),
      name,
      targetUrl,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=${customColor.replace("#", "")}&data=https://${targetUrl}`,
      scans: "0",
      uniqueScanners: "0",
      status: "Active",
      customDesign: true
    };
    setQrCodes([newQR, ...qrCodes]);
    pushNotification({
      type: "qr_generated",
      title: "QR code created",
      message: `"${name}" is ready to share.`,
      targetScreen: ScreenId.QR_CODES
    });
  };

  const handleUpdateTargetUrl = (id: string, newUrl: string) => {
    setQrCodes(qrCodes.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          targetUrl: newUrl,
          qrUrl: item.qrUrl.split("&data=")[0] + `&data=https://${newUrl}`
        };
      }
      return item;
    }));
  };

  const handleDeleteQR = (id: string) => {
    setQrCodes(qrCodes.filter((qr) => qr.id !== id));
  };

  const handleUpdateQR = (updated: QRCodeItem) => {
    setQrCodes(qrCodes.map((qr) => qr.id === updated.id ? updated : qr));
  };

  const handleVote = (id: string) => {
    setVotes(votes.map((v) => (v.id === id ? { ...v, votes: v.votes + 1, voted: true } : v)));
  };

  const handleAddPixel = (name: string, type: string, pixelId: string) => {
    const newPixel: TrackingPixel = {
      id: "px" + (pixels.length + 1),
      name,
      type,
      pixelId,
      status: "Active"
    };
    setPixels([...pixels, newPixel]);
    pushNotification({
      type: "pixel_added",
      title: "Tracking pixel added",
      message: `"${name}" (${type}) is now active.`,
      targetScreen: ScreenId.PIXELS
    });
  };

  const handleDeletePixel = (id: string) => {
    setPixels(pixels.filter((p) => p.id !== id));
  };

  const handleUploadFile = (name: string, size: string, url: string) => {
    const newFile: MediaFile = {
      id: "f" + (mediaFiles.length + 1),
      name,
      type: "image",
      size,
      url,
      uploadedAt: "7 Jul 2026"
    };
    setMediaFiles([newFile, ...mediaFiles]);
  };

  const handleDeleteFile = (id: string) => {
    setMediaFiles(mediaFiles.filter((f) => f.id !== id));
  };

  const handleConnectDomain = (domainName: string) => {
    const newDomain: CustomDomain = {
      id: "d" + (domains.length + 1),
      domainName,
      type: "A Record",
      targetIp: "74.201.218.45",
      status: "Verified"
    };
    setDomains([...domains, newDomain]);
  };

  const handleDeleteDomain = (id: string) => {
    setDomains(domains.filter((d) => d.id !== id));
  };

  const handleUpdateUser = (name: string, email: string) => {
    setUser((prev) => ({ ...prev, name, email }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen(ScreenId.LOGIN);
    setIsMobileNavOpen(false);
  };

  const handleScreenChange = (screen: ScreenId) => {
    setCurrentScreen(screen);
    setIsMobileNavOpen(false);
  };

  // Quick Action trigger on headers
  const handleQuickCreate = () => {
    if (currentScreen === ScreenId.BIO_PAGES) {
      setCurrentScreen(ScreenId.BIO_PAGES);
    } else if (currentScreen === ScreenId.CONTACTS) {
      setCurrentScreen(ScreenId.CONTACTS);
    } else {
      setCurrentScreen(ScreenId.BIO_PAGES);
    }
  };

  // Helper object to serve metrics inside dashboard with server-side tracking support
  const metrics = {
    totalClicks: serverMetrics ? serverMetrics.totalClicks : links.reduce((acc, curr) => acc + curr.clicks, 0),
    pageViews: serverMetrics ? serverMetrics.totalViews : pages.reduce((acc, curr) => acc + curr.views, 0),
    activeLinks: links.filter((l) => l.status === "Live").length,
    activePages: pages.filter((p) => p.status === "Live").length,
    totalRegisters: serverMetrics ? serverMetrics.totalRegisters : 0,
    events: serverMetrics ? serverMetrics.events : []
  };

  const handleExportData = () => {
    const backupData = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      user,
      pages,
      contacts,
      whatsAppCampaigns,
      whatsAppTemplates,
      links,
      qrCodes,
      savedTemplates,
      savedDrafts,
      pageBlocksMap,
      pixels,
      mediaFiles,
      domains
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `acn_link_workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (backupData: any): boolean => {
    if (!backupData || typeof backupData !== "object") return false;
    
    // Minimal structure validation
    if (!backupData.pages && !backupData.contacts && !backupData.links) {
      return false;
    }

    try {
      if (backupData.user) setUser(backupData.user);
      if (backupData.pages) {
        setPages(backupData.pages);
        localStorage.setItem("biolinks_pages_list", JSON.stringify(backupData.pages));
      }
      if (backupData.contacts) setContacts(backupData.contacts);
      if (backupData.whatsAppCampaigns) setWhatsAppCampaigns(backupData.whatsAppCampaigns);
      if (backupData.whatsAppTemplates) setWhatsAppTemplates(backupData.whatsAppTemplates);
      if (backupData.links) setLinks(backupData.links);
      if (backupData.qrCodes) setQrCodes(backupData.qrCodes);
      if (backupData.savedTemplates) {
        const normalized = (backupData.savedTemplates as Record<string, unknown>[]).map((item) =>
          item.data ? (item as BioPageTemplate) : normalizeTemplate(item)
        );
        setSavedTemplates(normalized);
        persistTemplates(normalized);
      }
      if (backupData.savedDrafts) {
        const normalized = (backupData.savedDrafts as Record<string, unknown>[]).map((item) =>
          item.data ? (item as BioPageDraft) : normalizeDraft(item)
        );
        setSavedDrafts(normalized);
        persistDrafts(normalized);
      }
      if (backupData.pageBlocksMap) {
        setPageBlocksMap(backupData.pageBlocksMap);
        localStorage.setItem("pageBlocksMap", JSON.stringify(backupData.pageBlocksMap));
      }
      if (backupData.pixels) setPixels(backupData.pixels);
      if (backupData.mediaFiles) setMediaFiles(backupData.mediaFiles);
      if (backupData.domains) setDomains(backupData.domains);

      return true;
    } catch (e) {
      console.error("Error restoring backup:", e);
      return false;
    }
  };

  // Render relevant content component based on navigation state
  const renderContent = () => {
    switch (currentScreen) {
      case ScreenId.LOGIN:
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
      case ScreenId.DASHBOARD:
        return <DashboardScreen onNavigate={handleScreenChange} metrics={metrics} pages={pages} links={links} />;
      case ScreenId.BIO_PAGES:
        return (
          <BioPagesScreen
            pages={pages}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onUpdatePage={handleUpdatePage}
            onDuplicatePage={handleDuplicatePage}
            savedTemplates={savedTemplates}
            setSavedTemplates={setSavedTemplates}
            savedDrafts={savedDrafts}
            setSavedDrafts={setSavedDrafts}
            pageBlocksMap={pageBlocksMap}
            setPageBlocksMap={setPageBlocksMap}
            initialActiveEditPageId={initialActiveEditPageId}
            clearInitialActiveEditPageId={() => setInitialActiveEditPageId(null)}
            initialActiveTemplateId={initialActiveTemplateId}
            clearInitialActiveTemplateId={() => setInitialActiveTemplateId(null)}
            onNotify={pushNotification}
          />
        );
      case ScreenId.CONTACTS:
        return <ContactsScreen contacts={contacts} onAddContact={handleAddContact} />;
      case ScreenId.WHATSAPP:
        return (
          <WhatsAppScreen
            campaigns={whatsAppCampaigns}
            templates={whatsAppTemplates}
            onAddTemplate={handleAddWhatsAppTemplate}
            onAddCampaign={handleAddWhatsAppCampaign}
          />
        );
      case ScreenId.LINKS:
        return (
          <LinksScreen
            links={links}
            onCreateLink={handleCreateLink}
            onDeleteLink={handleDeleteLink}
            onUpdateLink={handleUpdateLink}
          />
        );
      case ScreenId.QR_CODES:
        return (
          <QRCodesScreen
            items={qrCodes}
            onGenerateQR={handleGenerateQR}
            onUpdateTargetUrl={handleUpdateTargetUrl}
            onDeleteQR={handleDeleteQR}
            onUpdateQR={handleUpdateQR}
          />
        );
      case ScreenId.TEMPLATES:
        return (
          <TemplatesScreen
            items={templates}
            savedTemplates={savedTemplates}
            onDeleteCustomTemplate={(id) => {
              setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
              deleteTemplateOnServer(id);
            }}
            onUseTemplate={(tplName, isCustom, customTpl) => {
              let editorPayload = buildEditorState(
                tplName,
                "Write a short bio...",
                DEFAULT_COVER,
                [
                  { id: "g1", type: "Header", label: `👤 ${tplName}`, value: `👤 ${tplName}` },
                  {
                    id: "g2",
                    type: "Text",
                    label: "Welcome to my responsive bio page! Customize me using the blocks.",
                    value: "Welcome"
                  },
                  { id: "g3", type: "Button", label: "Visit My Website", value: "https://example.com" },
                  {
                    id: "g4",
                    type: "WhatsApp",
                    label: "Chat with me on WhatsApp",
                    value: "https://wa.me/1234567890"
                  }
                ] as BioEditorBlock[]
              );
              let sourceTemplateId: string | null = null;

              if (isCustom && customTpl) {
                editorPayload = getTemplateEditorPayload(customTpl);
                sourceTemplateId = customTpl.id;
              } else if (tplName === "Flash Sale Funnel") {
                editorPayload = buildEditorState(
                  "Flash Sale Funnel",
                  "🚨 Mega Limited Discount Offer. Only valid for 24 hours. Get your premium toys before we run out of stock! 🚀",
                  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800",
                  [
                    { id: "fs1", type: "Header", label: "⚡ FLASH SALE: 50% OFF TODAY!", value: "⚡ FLASH SALE: 50% OFF TODAY!" },
                    { id: "fs2", type: "Countdown", label: "Hurry! Offer ends in:", value: "1" },
                    { id: "fs3", type: "Shop", label: "Featured Deals", value: "Products List" },
                    { id: "fs4", type: "Coupon", label: "Use Code: FLASH50", value: "FLASH50" },
                    { id: "fs5", type: "Link Spin", label: "Spin to Win Extra Discount!", value: "Spin Now" },
                    { id: "fs6", type: "Button", label: "Shop All Products", value: "https://example.com/shop" },
                    { id: "fs7", type: "Socials", label: "Follow us", value: "Socials" }
                  ] as BioEditorBlock[]
                );
              } else if (tplName === "Ebook Download") {
                editorPayload = buildEditorState(
                  "Ebook Download",
                  "Grab your FREE copy of the Ultimate Guide to scaling your digital business and maximizing conversion optimization. 📚",
                  "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800",
                  [
                    { id: "eb1", type: "Header", label: "📘 Free Ebook: Mastering BioLinks", value: "📘 Free Ebook: Mastering BioLinks" },
                    { id: "eb2", type: "Text", label: "Download our comprehensive guide to skyrocketing your click-through rates.", value: "Ebook Description" },
                    { id: "eb3", type: "Smart Form", label: "Enter your email to get it instantly", value: "Newsletter Signup" },
                    { id: "eb4", type: "PDF", label: "Download PDF Directly", value: "https://example.com/ebook.pdf" },
                    { id: "eb5", type: "Socials", label: "Stay connected", value: "Socials" }
                  ] as BioEditorBlock[]
                );
              } else if (tplName === "Personal Bio Link") {
                editorPayload = buildEditorState(
                  "Personal Bio Link",
                  "Tech developer and indie hacker crafting clean user interfaces and sharing digital insights daily.",
                  "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&q=80&w=800",
                  [
                    { id: "pb1", type: "Header", label: "👋 Hi, I'm Alex Carter", value: "👋 Hi, I'm Alex Carter" },
                    { id: "pb2", type: "Text", label: "Digital creator, developer, and writer. Sharing my journey and latest projects.", value: "Bio text" },
                    { id: "pb3", type: "Button", label: "Read My Blog", value: "https://example.com/blog" },
                    { id: "pb4", type: "vCard", label: "Save My Contact", value: "Alex Carter" },
                    { id: "pb5", type: "Socials", label: "Follow my journey", value: "Socials" }
                  ] as BioEditorBlock[]
                );
              } else if (tplName.toLowerCase().includes("marvel")) {
                editorPayload = buildEditorState(
                  "Marvel Products",
                  "Official Marvel-Inspired Toys & Collectibles. Safe, fun & exciting toys for young superheroes.",
                  DEFAULT_COVER,
                  [
                    { id: "b1", type: "Header", label: "👤 Marvel Toys for Kids", value: "👤 Marvel Toys for Kids" },
                    { id: "b2", type: "Header", label: "Official Marvel-Inspired Toys & Collectibles", value: "Official Marvel-Inspired Toys & Collectibles" },
                    { id: "b3", type: "Text", label: "🎁 Safe, fun & exciting toys for young superheroes.", value: "🎁 Safe, fun & exciting toys for young superheroes." },
                    { id: "b4", type: "Header", label: "⭐ Why Shop With Us?", value: "⭐ Why Shop With Us?" },
                    { id: "b5", type: "Text", label: "🛡️ Quality Marvel-themed toys, 🚚 Fast Shipping, 💯 Trusted", value: "🛡️ Quality Marvel-themed toys, 🚚 Fast Shipping, 💯 Trusted" },
                    { id: "b6", type: "Shop", label: "Products For Kids (Iron Man, Spiderman, Hulk)", value: "Products For Kids" },
                    { id: "b7", type: "Button", label: "Explore the Toys Section", value: "Explore the Toys Section" },
                    { id: "b8", type: "Coupon", label: "Special Offer (MARVELTOYCODE007007)", value: "MARVELTOYCODE007007" },
                    { id: "b9", type: "Countdown", label: "Sale ends in (9 Days Timer)", value: "9" },
                    { id: "b10", type: "Link Spin", label: "Buy Now (Prize Wheel)", value: "Buy Now" },
                    { id: "b11", type: "WhatsApp", label: "Message Us on WhatsApp", value: "Message Us on WhatsApp" },
                    { id: "b12", type: "Smart Form", label: "Get in Touch Leads Form", value: "Get in Touch" },
                    { id: "b13", type: "vCard", label: "Save Contact Card Info", value: "Save Contact" }
                  ] as BioEditorBlock[]
                );
              }

              const tplTitle = editorPayload.pageMeta.title;
              const tplBio = editorPayload.pageMeta.shortBio;
              const tplCoverPhoto = editorPayload.pageMeta.coverImage;
              const blocksToLoad = cloneBlocks(editorPayload.blocks);

              const newId = "p_" + Date.now();
              const cleanSuffix =
                tplTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") || "custom-tpl";
              const newSlug = `acn.link/page-${cleanSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;

              const newPage: BioPage = {
                id: newId,
                title: tplTitle,
                slug: newSlug,
                status: "Live",
                views: 0,
                createdAt: "7 Jul 2026",
                bio: tplBio,
                coverPhoto: tplCoverPhoto
              };

              setPageBlocksMap((prev) => ({
                ...prev,
                [newId]: blocksToLoad,
                [newSlug]: blocksToLoad
              }));

              const details = { title: tplTitle, bio: tplBio, coverPhoto: tplCoverPhoto };
              localStorage.setItem(`biolink_blocks_${newId}`, JSON.stringify(blocksToLoad));
              localStorage.setItem(`biolink_blocks_${newSlug}`, JSON.stringify(blocksToLoad));
              localStorage.setItem(`biolink_details_${newId}`, JSON.stringify(details));
              localStorage.setItem(`biolink_details_${newSlug}`, JSON.stringify(details));

              setPages((prev) => [newPage, ...prev]);

              setInitialActiveEditPageId(newId);
              setInitialActiveTemplateId(sourceTemplateId);
              handleScreenChange(ScreenId.BIO_PAGES);
              pushNotification({
                type: "template_used",
                title: "Template applied",
                message: `"${tplTitle}" was created from ${isCustom ? "your template" : "a preset"}.`,
                targetScreen: ScreenId.BIO_PAGES,
                meta: { pageId: newId }
              });
            }}
          />
        );
      case ScreenId.INTEGRATIONS:
        return <IntegrationsScreen items={integrations} votes={votes} onVote={handleVote} />;
      case ScreenId.PIXELS:
        return (
          <PixelsScreen
            pixels={pixels}
            onAddPixel={handleAddPixel}
            onDeletePixel={handleDeletePixel}
          />
        );
      case ScreenId.MEDIA_LIBRARY:
        return (
          <MediaLibraryScreen
            files={mediaFiles}
            onUploadFile={handleUploadFile}
            onDeleteFile={handleDeleteFile}
          />
        );
      case ScreenId.CUSTOM_DOMAINS:
        return (
          <CustomDomainsScreen
            domains={domains}
            onConnectDomain={handleConnectDomain}
            onDeleteDomain={handleDeleteDomain}
          />
        );
      case ScreenId.HELP_CENTER:
        return <HelpCenterScreen articles={articles} />;
      case ScreenId.CONTACT_SUPPORT:
        return <ContactSupportScreen />;
      case ScreenId.ACCOUNT:
        return (
          <AccountScreen
            user={user}
            onUpdateUser={handleUpdateUser}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onLogout={handleLogout}
          />
        );
      default:
        return <DashboardScreen onNavigate={handleScreenChange} metrics={metrics} pages={pages} links={links} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased">
      {currentScreen !== ScreenId.LOGIN && (
        <Sidebar
          currentScreen={currentScreen}
          onScreenChange={handleScreenChange}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 w-full">
        {currentScreen !== ScreenId.LOGIN && (
          <Header
            currentScreen={currentScreen}
            user={user}
            onScreenChange={handleScreenChange}
            onQuickCreate={handleQuickCreate}
            onMenuToggle={() => setIsMobileNavOpen((open) => !open)}
            isMobileNavOpen={isMobileNavOpen}
            notifications={notifications}
            unreadCount={unreadNotificationCount}
            onMarkNotificationRead={handleMarkNotificationRead}
            onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          />
        )}

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {renderContent()}
        </main>

        {currentScreen !== ScreenId.LOGIN && (
          <footer className="h-10 bg-[#F1F5F9] border-t border-slate-200 text-slate-500 px-4 sm:px-6 flex items-center justify-between text-[10px] uppercase tracking-widest font-mono shrink-0 select-none">
            <div className="flex min-w-0">
              <span className="flex items-center truncate" aria-live="polite">
                <span
                  className={`w-2 h-2 rounded-full mr-2 shrink-0 ${
                    serverHealth === "online"
                      ? "bg-emerald-500 animate-pulse"
                      : serverHealth === "offline"
                        ? "bg-rose-500"
                        : "bg-amber-400 animate-pulse"
                  }`}
                />
                {serverHealth === "online"
                  ? "System Operational"
                  : serverHealth === "offline"
                    ? "Server Offline"
                    : "Checking Server"}
              </span>
            </div>
            <div>ACN Link © 2026</div>
          </footer>
        )}
      </div>

      {currentScreen !== ScreenId.LOGIN && (
        <MobileNavDrawer
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          currentScreen={currentScreen}
          onScreenChange={handleScreenChange}
        />
      )}
    </div>
  );
}
