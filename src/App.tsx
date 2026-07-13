import React, { useState } from "react";
import { ScreenId, UserProfile, BioPage, Contact, WhatsAppCampaign, WhatsAppTemplate, SmartLink, QRCodeItem, TemplateItem, IntegrationItem, IntegrationVote, TrackingPixel, MediaFile, CustomDomain, HelpArticle, BioPageDraft, BioPageTemplate, BioEditorBlock, AppNotification, PublishSettings } from "./types";
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
  initialHelpArticles
} from "./data";

// Import modular screens
import Sidebar from "./components/Sidebar";
import MobileNavDrawer from "./components/MobileNavDrawer";
import Header from "./components/Header";
import LoginScreen from "./components/LoginScreen";
import {
  AuthUser,
  clearAuthSession,
  fetchAuthConfig,
  fetchMe,
  getAccessToken,
  getLastActivity,
  getStoredAuthUser,
  isPreviewToken,
  logoutRequest,
  touchActivity
} from "./lib/authApi";
import { apiUrl } from "./lib/apiBase";
import {
  connectDomain,
  deleteDomain,
  fetchDomains,
  verifyDomain
} from "./lib/domainApi";
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
import PublishModal from "./components/PublishModal";
import {
  buildEditorState,
  cloneBlocks,
  DEFAULT_COVER,
  deleteDraftByPageId,
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
import { getPublishSettings, persistPublishSettings } from "./storage/publishStorage";

const USER_PROFILE_STORAGE_KEY = "acnlink_user_profile";

function writeLocalStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to persist "${key}" in browser storage.`, error);
  }
}

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function authenticatedHeaders(json = false): Record<string, string> {
  const token = getAccessToken();
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function normalizeExternalUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function App() {
  // Parse URL search parameters for standalone public preview
  const urlParams = new URLSearchParams(window.location.search);
  const previewPageId = urlParams.get("previewPageId");

  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    try {
      if (!getAccessToken()) return ScreenId.LOGIN;
      const saved = sessionStorage.getItem("acnlink_session");
      if (saved) {
        const { screen, loggedIn } = JSON.parse(saved);
        if (loggedIn && screen) return screen as ScreenId;
      }
      return ScreenId.DASHBOARD;
    } catch {
      /* ignore */
    }
    return ScreenId.LOGIN;
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAccessToken() && getStoredAuthUser()));
  const [authBootstrapping, setAuthBootstrapping] = useState(() => Boolean(getAccessToken()));
  const [idleTimeoutMs, setIdleTimeoutMs] = useState(1000 * 60 * 30);
  const authVerifyToken = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("verifyToken") || params.get("token") || "";
  }, []);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getAllNotifications());
  const lastAnalyticsEventIdRef = React.useRef<string | null>(null);
  
  // App state loaded from static files
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      return saved ? { ...initialUser, ...JSON.parse(saved) } : initialUser;
    } catch {
      return initialUser;
    }
  });
  const [publishSettings, setPublishSettings] = useState<PublishSettings>(() => getPublishSettings());
  const [pages, setPages] = useState<BioPage[]>(() => {
    return readLocalStorage("biolinks_pages_list", initialBioPages);
  });
  const [isPagesSyncReady, setIsPagesSyncReady] = useState(false);

  // Server state and sync for pages list & analytics metrics
  const [serverMetrics, setServerMetrics] = useState<{
    totalViews: number;
    totalClicks: number;
    totalRegisters: number;
    events: any[];
  } | null>(null);
  const [serverHealth, setServerHealth] = useState<"checking" | "online" | "offline">("checking");

  React.useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setIsLoggedIn(false);
        setCurrentScreen(ScreenId.LOGIN);
        setAuthBootstrapping(false);
        return;
      }

      // Client preview sessions skip /api/auth/me so static hosts still restore UI.
      if (isPreviewToken(accessToken)) {
        const previewUser = getStoredAuthUser();
        if (previewUser) {
          setUser((prev) => ({
            ...prev,
            name: previewUser.name || prev.name,
            email: previewUser.email || prev.email,
            avatarUrl: previewUser.avatarUrl || prev.avatarUrl,
            plan: previewUser.plan || prev.plan,
            isVerified: previewUser.isVerified,
            mfaEnabled: previewUser.mfaEnabled
          }));
          setIsLoggedIn(true);
          touchActivity();
          setCurrentScreen((screen) => (screen === ScreenId.LOGIN ? ScreenId.DASHBOARD : screen));
        } else {
          clearAuthSession();
          setIsLoggedIn(false);
          setCurrentScreen(ScreenId.LOGIN);
        }
        setAuthBootstrapping(false);
        return;
      }

      try {
        const { user: authUser } = await fetchMe();
        if (cancelled) return;
        setUser((prev) => ({
          ...prev,
          name: authUser.name || prev.name,
          email: authUser.email,
          avatarUrl: authUser.avatarUrl || prev.avatarUrl,
          plan: authUser.plan || prev.plan,
          isVerified: authUser.isVerified,
          mfaEnabled: authUser.mfaEnabled
        }));
        setIsLoggedIn(true);
        touchActivity();
        setCurrentScreen((screen) => (screen === ScreenId.LOGIN ? ScreenId.DASHBOARD : screen));
      } catch {
        if (!cancelled) {
          clearAuthSession();
          setIsLoggedIn(false);
          setCurrentScreen(ScreenId.LOGIN);
        }
      } finally {
        if (!cancelled) setAuthBootstrapping(false);
      }
    }

    void restoreSession();
    void fetchAuthConfig()
      .then((cfg) => {
        if (!cancelled && cfg.idleTimeoutMs) setIdleTimeoutMs(cfg.idleTimeoutMs);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isLoggedIn) return;

    const onActivity = () => touchActivity();
    const events: Array<keyof WindowEventMap> = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const last = getLastActivity();
      if (last && Date.now() - last > idleTimeoutMs) {
        void handleLogout();
      }
    }, 30_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, idleTimeoutMs]);

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
    try {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Failed to save user profile:", error);
    }
  }, [user]);

  React.useEffect(() => {
    let isMounted = true;

    const checkServerHealth = async () => {
      try {
        const response = await fetch(apiUrl("/api/health"), { cache: "no-store" });
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

  const savePublishSettings = (settings: PublishSettings) => {
    setPublishSettings(settings);
    persistPublishSettings(settings);
  };

  const handleWebsitePublished = (settings: PublishSettings) => {
    savePublishSettings(settings);
    pushNotification({
      type: "general",
      title: "Website published",
      message: `Your website is available at ${settings.primaryUrl}.`,
      targetScreen: ScreenId.DASHBOARD
    });
  };

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
    if (!isLoggedIn || isPreviewToken(getAccessToken())) return;

    async function loadInitialData() {
      try {
        // Fetch Pages List
        const pagesRes = await fetch(apiUrl("/api/pages"), {
          headers: authenticatedHeaders()
        });
        if (pagesRes.ok) {
          const remotePages = await pagesRes.json();
          if (remotePages && Array.isArray(remotePages) && remotePages.length > 0) {
            setPages((localPages) => {
              const merged = new Map(localPages.map((page) => [page.id, page]));
              remotePages.forEach((page: BioPage) => merged.set(page.id, page));
              return Array.from(merged.values());
            });
          } else {
            // Seed an empty server from the local workspace, not hardcoded demo data.
            await fetch(apiUrl("/api/pages"), {
              method: "POST",
              headers: authenticatedHeaders(true),
              body: JSON.stringify({ pages })
            });
          }
        }
      } catch (err) {
        console.error("Failed to load initial pages list from server:", err);
      } finally {
        setIsPagesSyncReady(true);
      }

      // Fetch Analytics metrics
      try {
        const analyticsRes = await fetch(apiUrl("/api/analytics"));
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
      fetch(apiUrl("/api/analytics"))
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
  }, [isLoggedIn]);

  // 2. Whenever pages list is updated, save to local storage AND sync to server
  React.useEffect(() => {
    writeLocalStorage("biolinks_pages_list", pages);
    if (!isPagesSyncReady || !getAccessToken() || isPreviewToken(getAccessToken())) return;

    // Sync to server
    fetch(apiUrl("/api/pages"), {
      method: "POST",
      headers: authenticatedHeaders(true),
      body: JSON.stringify({ pages })
    }).catch(err => {
      console.error("Failed to save pages list to server:", err);
    });
  }, [pages, isPagesSyncReady]);

  const [contacts, setContacts] = useState<Contact[]>(() => readLocalStorage("acnlink_contacts", initialContacts));
  const [whatsAppCampaigns, setWhatsAppCampaigns] = useState<WhatsAppCampaign[]>(() =>
    readLocalStorage("acnlink_whatsapp_campaigns", initialWhatsAppCampaigns)
  );
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplate[]>(() =>
    readLocalStorage("acnlink_whatsapp_templates", initialWhatsAppTemplates)
  );
  const [links, setLinks] = useState<SmartLink[]>(() => readLocalStorage("acnlink_smart_links", initialSmartLinks));
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>(() => readLocalStorage("acnlink_qr_codes", initialQRCodes));
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
  const [quickCreateRequest, setQuickCreateRequest] = useState(0);

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
    writeLocalStorage("pageBlocksMap", pageBlocksMap);
  }, [pageBlocksMap]);

  React.useEffect(() => writeLocalStorage("acnlink_contacts", contacts), [contacts]);
  React.useEffect(() => writeLocalStorage("acnlink_whatsapp_campaigns", whatsAppCampaigns), [whatsAppCampaigns]);
  React.useEffect(() => writeLocalStorage("acnlink_whatsapp_templates", whatsAppTemplates), [whatsAppTemplates]);
  React.useEffect(() => writeLocalStorage("acnlink_smart_links", links), [links]);
  React.useEffect(() => writeLocalStorage("acnlink_qr_codes", qrCodes), [qrCodes]);

  const [integrations, setIntegrations] = useState<IntegrationItem[]>(() =>
    readLocalStorage("acnlink_integrations", initialIntegrations)
  );
  const [votes, setVotes] = useState<IntegrationVote[]>(() =>
    readLocalStorage("acnlink_integration_votes", initialVotes)
  );
  React.useEffect(() => writeLocalStorage("acnlink_integrations", integrations), [integrations]);
  React.useEffect(() => writeLocalStorage("acnlink_integration_votes", votes), [votes]);
  const [pixels, setPixels] = useState<TrackingPixel[]>(() =>
    readLocalStorage("acnlink_pixels", initialTrackingPixels)
  );
  React.useEffect(() => writeLocalStorage("acnlink_pixels", pixels), [pixels]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(() =>
    readLocalStorage("acnlink_media_files", initialMediaFiles)
  );
  React.useEffect(() => writeLocalStorage("acnlink_media_files", mediaFiles), [mediaFiles]);
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainsLoadError, setDomainsLoadError] = useState<string | null>(null);

  const loadDomains = React.useCallback(async () => {
    if (!getAccessToken() || isPreviewToken(getAccessToken())) return;
    setDomainsLoading(true);
    setDomainsLoadError(null);
    try {
      setDomains(await fetchDomains());
    } catch (error) {
      setDomainsLoadError(error instanceof Error ? error.message : "Unable to load domains.");
    } finally {
      setDomainsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isLoggedIn) void loadDomains();
    else setDomains([]);
  }, [isLoggedIn, loadDomains]);
  const [articles] = useState<HelpArticle[]>(initialHelpArticles);

  // Push browser workspace fields → Railway → Supabase normalized tables
  React.useEffect(() => {
    if (!isLoggedIn) return;
    const timer = window.setTimeout(() => {
      let supportTickets: unknown[] = [];
      try {
        supportTickets = JSON.parse(localStorage.getItem("acnlink_support_tickets") || "[]");
        if (!Array.isArray(supportTickets)) supportTickets = [];
      } catch {
        supportTickets = [];
      }

      fetch(apiUrl("/api/workspace/import"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {})
        },
        credentials: "include",
        body: JSON.stringify({
          workspace: {
            contacts,
            whatsapp_campaigns: whatsAppCampaigns,
            whatsapp_templates: whatsAppTemplates,
            smart_links: links,
            qr_codes: qrCodes,
            catalog_templates: templates,
            integrations,
            integration_votes: votes,
            tracking_pixels: pixels,
            media_files: mediaFiles,
            help_articles: articles,
            support_tickets: supportTickets,
            notifications: getAllNotifications(),
            bio_page_drafts: savedDrafts,
            publish_settings: getPublishSettings()
          }
        })
      }).catch((error) => {
        console.warn("Workspace Supabase sync failed:", error);
      });
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [
    isLoggedIn,
    contacts,
    whatsAppCampaigns,
    whatsAppTemplates,
    links,
    qrCodes,
    templates,
    integrations,
    votes,
    pixels,
    mediaFiles,
    articles,
    savedDrafts
  ]);

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
  const handleLoginSuccess = (authUser: AuthUser) => {
    setUser((prev) => ({
      ...prev,
      name: authUser.name || `${authUser.firstName} ${authUser.lastName}`.trim() || prev.name,
      email: authUser.email,
      avatarUrl: authUser.avatarUrl || prev.avatarUrl,
      plan: authUser.plan || prev.plan,
      isVerified: authUser.isVerified,
      mfaEnabled: authUser.mfaEnabled
    }));
    setIsLoggedIn(true);
    setCurrentScreen(ScreenId.DASHBOARD);
    if (window.location.search.includes("verifyToken") || window.location.search.includes("token=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handleLogout = async () => {
    try {
      if (isPreviewToken(getAccessToken())) {
        clearAuthSession();
      } else {
        await logoutRequest();
      }
    } catch {
      clearAuthSession();
    }
    setIsLoggedIn(false);
    setCurrentScreen(ScreenId.LOGIN);
    setIsMobileNavOpen(false);
    window.history.replaceState({}, "", window.location.pathname);
  };

  const handleAddPage = (title: string, slug: string) => {
    const newPage: BioPage = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      slug,
      status: "Live",
      views: 0,
      createdAt: "7 Jul 2026"
    };
    setPages((currentPages) => [newPage, ...currentPages]);
    return newPage;
  };

  const handleRefreshPages = async () => {
    const response = await fetch(apiUrl("/api/pages"), {
      cache: "no-store",
      headers: authenticatedHeaders()
    });
    if (!response.ok) throw new Error("Unable to load pages");

    const remotePages = await response.json();
    if (!Array.isArray(remotePages)) throw new Error("Invalid pages response");

    setPages((localPages) => {
      const merged = new Map(localPages.map((page) => [page.id, page]));
      remotePages.forEach((page: BioPage) => merged.set(page.id, page));
      return Array.from(merged.values());
    });
  };

  const handleDeletePage = (id: string) => {
    const page = pages.find((item) => item.id === id);
    setPages((currentPages) => currentPages.filter((item) => item.id !== id));
    setPageBlocksMap((currentBlocks) => {
      const nextBlocks = { ...currentBlocks };
      delete nextBlocks[id];
      if (page?.slug) delete nextBlocks[page.slug];
      return nextBlocks;
    });
    setSavedDrafts((drafts) => deleteDraftByPageId(id, drafts));

    if (page) {
      try {
        localStorage.removeItem(`biolink_blocks_${id}`);
        localStorage.removeItem(`biolink_blocks_${page.slug}`);
        localStorage.removeItem(`biolink_details_${id}`);
        localStorage.removeItem(`biolink_details_${page.slug}`);
      } catch {
        // Browser storage may be unavailable; the page state was still removed.
      }
    }

    fetch(apiUrl(`/api/page/${id}`), {
      method: "DELETE",
      headers: authenticatedHeaders()
    }).catch((error) => {
      console.error("Failed to remove the page from the server:", error);
    });
  };

  const handleUpdatePage = (id: string, title: string, bio?: string, coverPhoto?: string) => {
    setPages((currentPages) =>
      currentPages.map((page) =>
        page.id === id
          ? { ...page, title, bio: bio !== undefined ? bio : page.bio, coverPhoto: coverPhoto !== undefined ? coverPhoto : page.coverPhoto }
          : page
      )
    );
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

  const maskContactEmail = (email: string) => {
    const [local = "", domain = "•••.com"] = email.split("@");
    const visible = local.slice(0, 1) || "•";
    return `${visible}••••@${domain || "•••.com"}`;
  };

  const maskContactPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 4 ? `•••••• ${digits.slice(-4)}` : "••••••";
  };

  const handleAddContact = (newContactData: Omit<Contact, "id" | "maskedEmail" | "maskedPhone">) => {
    const newContact: Contact = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...newContactData,
      maskedEmail: maskContactEmail(newContactData.email),
      maskedPhone: maskContactPhone(newContactData.phone)
    };
    setContacts((current) => [newContact, ...current]);
    pushNotification({
      type: "contact_added",
      title: "New contact captured",
      message: `${newContact.name} was added to your contacts.`,
      targetScreen: ScreenId.CONTACTS
    });
  };

  const handleUpdateContact = (
    id: string,
    contactData: Omit<Contact, "id" | "maskedEmail" | "maskedPhone">
  ) => {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === id
          ? {
              ...contact,
              ...contactData,
              maskedEmail: maskContactEmail(contactData.email),
              maskedPhone: maskContactPhone(contactData.phone)
            }
          : contact
      )
    );
  };

  const handleDeleteContact = (id: string) => {
    setContacts((current) => current.filter((contact) => contact.id !== id));
  };

  const handleAddWhatsAppTemplate = (template: Omit<WhatsAppTemplate, "id">) => {
    const newTpl: WhatsAppTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...template
    };
    setWhatsAppTemplates((current) => [newTpl, ...current]);
  };

  const handleUpdateWhatsAppTemplate = (id: string, template: Omit<WhatsAppTemplate, "id">) => {
    setWhatsAppTemplates((current) =>
      current.map((item) => (item.id === id ? { ...item, ...template } : item))
    );
  };

  const handleDeleteWhatsAppTemplate = (id: string) => {
    setWhatsAppTemplates((current) => current.filter((item) => item.id !== id));
  };

  const handleAddWhatsAppCampaign = (campaign: Omit<WhatsAppCampaign, "id">) => {
    const newCamp: WhatsAppCampaign = {
      id: `wc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...campaign
    };
    setWhatsAppCampaigns((current) => [newCamp, ...current]);
  };

  const handleUpdateWhatsAppCampaign = (id: string, campaign: Omit<WhatsAppCampaign, "id">) => {
    setWhatsAppCampaigns((current) =>
      current.map((item) => (item.id === id ? { ...item, ...campaign } : item))
    );
  };

  const handleDeleteWhatsAppCampaign = (id: string) => {
    setWhatsAppCampaigns((current) => current.filter((item) => item.id !== id));
  };

  const handleCreateLink = (
    title: string,
    slug: string,
    shortUrl: string,
    destinationUrl: string,
    retargeting: SmartLink["retargeting"]
  ) => {
    const newLink: SmartLink = {
      id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      slug,
      shortUrl,
      destinationUrl: normalizeExternalUrl(destinationUrl),
      status: "Live",
      retargeting,
      clicks: 0
    };
    setLinks((current) => [newLink, ...current]);
  };

  const handleDeleteLink = (id: string) => {
    setLinks((current) => current.filter((link) => link.id !== id));
  };

  const handleUpdateLink = (updated: SmartLink) => {
    setLinks((current) => current.map((link) => (link.id === updated.id ? updated : link)));
  };

  const handleGenerateQR = (name: string, targetUrl: string, customColor: string) => {
    const normalizedTargetUrl = normalizeExternalUrl(targetUrl);
    const newQR: QRCodeItem = {
      id: `qr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      targetUrl: normalizedTargetUrl,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=${customColor.replace("#", "")}&data=${encodeURIComponent(normalizedTargetUrl)}`,
      scans: "0",
      uniqueScanners: "0",
      status: "Active",
      customDesign: true,
      designColor: customColor,
      designLogo: "none",
      designPattern: "rounded"
    };
    setQrCodes((current) => [newQR, ...current]);
    pushNotification({
      type: "qr_generated",
      title: "QR code created",
      message: `"${name}" is ready to share.`,
      targetScreen: ScreenId.QR_CODES
    });
  };

  const handleUpdateTargetUrl = (id: string, newUrl: string) => {
    const normalizedTargetUrl = normalizeExternalUrl(newUrl);
    setQrCodes((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const color = item.designColor || "#4F46E5";
        return {
          ...item,
          targetUrl: normalizedTargetUrl,
          qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=${color.replace("#", "")}&data=${encodeURIComponent(normalizedTargetUrl)}`
        };
      })
    );
  };

  const handleDeleteQR = (id: string) => {
    setQrCodes((current) => current.filter((qr) => qr.id !== id));
  };

  const handleUpdateQR = (updated: QRCodeItem) => {
    setQrCodes((current) => current.map((qr) => (qr.id === updated.id ? updated : qr)));
  };

  const handleVote = (id: string) => {
    setVotes((current) =>
      current.map((v) => (v.id === id && !v.voted ? { ...v, votes: v.votes + 1, voted: true } : v))
    );
  };

  const handleUpdateIntegration = (updated: IntegrationItem) => {
    setIntegrations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleAddPixel = (name: string, type: string, pixelId: string) => {
    const newPixel: TrackingPixel = {
      id: `px_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      type,
      pixelId,
      status: type.includes("TikTok") ? "Validation Required" : "Active"
    };
    setPixels((current) => [newPixel, ...current]);
    pushNotification({
      type: "pixel_added",
      title: "Tracking pixel added",
      message: `"${name}" (${type}) is now ${newPixel.status === "Active" ? "active" : "awaiting validation"}.`,
      targetScreen: ScreenId.PIXELS
    });
  };

  const handleUpdatePixel = (updated: TrackingPixel) => {
    setPixels((current) => current.map((pixel) => (pixel.id === updated.id ? updated : pixel)));
  };

  const handleDeletePixel = (id: string) => {
    setPixels((current) => current.filter((p) => p.id !== id));
  };

  const handleUploadFile = (file: Omit<MediaFile, "id">) => {
    const newFile: MediaFile = {
      ...file,
      id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    };
    setMediaFiles((current) => [newFile, ...current]);
  };

  const handleUpdateFile = (updated: MediaFile) => {
    setMediaFiles((current) => current.map((file) => (file.id === updated.id ? updated : file)));
  };

  const handleDeleteFile = (id: string) => {
    setMediaFiles((current) => current.filter((f) => f.id !== id));
  };

  const handleConnectDomain = async (domainName: string, pageId: string) => {
    const created = await connectDomain(domainName, pageId);
    setDomains((current) => [created, ...current.filter((domain) => domain.id !== created.id)]);
  };

  const handleVerifyDomain = async (id: string) => {
    const updated = await verifyDomain(id);
    setDomains((current) => current.map((domain) => (domain.id === updated.id ? updated : domain)));
  };

  const handleDeleteDomain = async (id: string) => {
    await deleteDomain(id);
    setDomains((current) => current.filter((d) => d.id !== id));
  };

  const handleUpdateUser = (name: string, email: string, avatarUrl: string) => {
    setUser((prev) => ({ ...prev, name, email, avatarUrl }));
  };

  const handleUpdateMfa = (enabled: boolean) => {
    setUser((prev) => ({ ...prev, mfaEnabled: enabled }));
  };

  const handleScreenChange = (screen: ScreenId) => {
    setCurrentScreen(screen);
    setIsMobileNavOpen(false);
  };

  // Quick Action trigger on headers
  const handleQuickCreate = () => {
    setCurrentScreen(ScreenId.BIO_PAGES);
    setQuickCreateRequest((request) => request + 1);
  };

  const handleNotificationNavigate = (screen: ScreenId, pageId?: string) => {
    if (screen === ScreenId.BIO_PAGES && pageId) {
      setInitialActiveEditPageId(pageId);
    }
    setCurrentScreen(screen);
  };

  const handleOpenDashboardPage = (pageId: string) => {
    setInitialActiveEditPageId(pageId);
    setCurrentScreen(ScreenId.BIO_PAGES);
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
      domains,
      integrations,
      votes
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
        writeLocalStorage("biolinks_pages_list", backupData.pages);
      }
      if (backupData.contacts) setContacts(backupData.contacts);
      if (backupData.whatsAppCampaigns) setWhatsAppCampaigns(backupData.whatsAppCampaigns);
      if (backupData.whatsAppTemplates) setWhatsAppTemplates(backupData.whatsAppTemplates);
      if (backupData.links) setLinks(backupData.links);
      if (backupData.qrCodes) setQrCodes(backupData.qrCodes);
      if (backupData.savedTemplates) {
        const normalized = (backupData.savedTemplates as Record<string, unknown>[]).map((item) =>
          item.data ? (item as unknown as BioPageTemplate) : normalizeTemplate(item)
        );
        setSavedTemplates(normalized);
        persistTemplates(normalized);
      }
      if (backupData.savedDrafts) {
        const normalized = (backupData.savedDrafts as Record<string, unknown>[]).map((item) =>
          item.data ? (item as unknown as BioPageDraft) : normalizeDraft(item)
        );
        setSavedDrafts(normalized);
        persistDrafts(normalized);
      }
      if (backupData.pageBlocksMap) {
        setPageBlocksMap(backupData.pageBlocksMap);
        writeLocalStorage("pageBlocksMap", backupData.pageBlocksMap);
      }
      if (backupData.pixels) setPixels(backupData.pixels);
      if (backupData.mediaFiles) setMediaFiles(backupData.mediaFiles);
      if (backupData.domains) setDomains(backupData.domains);
      if (backupData.integrations) setIntegrations(backupData.integrations);
      if (backupData.votes) setVotes(backupData.votes);

      return true;
    } catch (e) {
      console.error("Error restoring backup:", e);
      return false;
    }
  };

  // Render relevant content component based on navigation state
  const renderContent = () => {
    if (!isLoggedIn || currentScreen === ScreenId.LOGIN) {
      return (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          initialView={authVerifyToken ? "verify" : "login"}
          initialVerifyToken={authVerifyToken}
        />
      );
    }
    switch (currentScreen) {
      case ScreenId.DASHBOARD:
        return (
          <DashboardScreen
            onNavigate={handleScreenChange}
            onOpenPage={handleOpenDashboardPage}
            user={user}
            metrics={metrics}
            pages={pages}
          />
        );
      case ScreenId.BIO_PAGES:
        return (
          <BioPagesScreen
            pages={pages}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onUpdatePage={handleUpdatePage}
            onDuplicatePage={handleDuplicatePage}
            onRefreshPages={handleRefreshPages}
            analyticsEvents={serverMetrics?.events || []}
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
            quickCreateRequest={quickCreateRequest}
            onNotify={pushNotification}
          />
        );
      case ScreenId.CONTACTS:
        return (
          <ContactsScreen
            contacts={contacts}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
          />
        );
      case ScreenId.WHATSAPP:
        return (
          <WhatsAppScreen
            campaigns={whatsAppCampaigns}
            templates={whatsAppTemplates}
            onAddTemplate={handleAddWhatsAppTemplate}
            onUpdateTemplate={handleUpdateWhatsAppTemplate}
            onDeleteTemplate={handleDeleteWhatsAppTemplate}
            onAddCampaign={handleAddWhatsAppCampaign}
            onUpdateCampaign={handleUpdateWhatsAppCampaign}
            onDeleteCampaign={handleDeleteWhatsAppCampaign}
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
              persistPagePreviewStorage(newId, newSlug, blocksToLoad, details);

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
        return (
          <IntegrationsScreen
            items={integrations}
            votes={votes}
            onVote={handleVote}
            onUpdateIntegration={handleUpdateIntegration}
            onNavigate={handleScreenChange}
          />
        );
      case ScreenId.PIXELS:
        return (
          <PixelsScreen
            pixels={pixels}
            onAddPixel={handleAddPixel}
            onUpdatePixel={handleUpdatePixel}
            onDeletePixel={handleDeletePixel}
          />
        );
      case ScreenId.MEDIA_LIBRARY:
        return (
          <MediaLibraryScreen
            files={mediaFiles}
            onUploadFile={handleUploadFile}
            onUpdateFile={handleUpdateFile}
            onDeleteFile={handleDeleteFile}
          />
        );
      case ScreenId.CUSTOM_DOMAINS:
        return (
          <CustomDomainsScreen
            domains={domains}
            pages={pages}
            isLoading={domainsLoading}
            loadError={domainsLoadError}
            onReload={loadDomains}
            onConnectDomain={handleConnectDomain}
            onVerifyDomain={handleVerifyDomain}
            onDeleteDomain={handleDeleteDomain}
          />
        );
      case ScreenId.HELP_CENTER:
        return <HelpCenterScreen articles={articles} onNavigate={handleScreenChange} />;
      case ScreenId.CONTACT_SUPPORT:
        return <ContactSupportScreen user={user} onNavigate={handleScreenChange} />;
      case ScreenId.ACCOUNT:
        return (
          <AccountScreen
            user={user}
            onUpdateUser={handleUpdateUser}
            onUpdateMfa={handleUpdateMfa}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onLogout={handleLogout}
            onNavigate={handleScreenChange}
          />
        );
      default:
        return (
          <DashboardScreen
            onNavigate={handleScreenChange}
            onOpenPage={handleOpenDashboardPage}
            user={user}
            metrics={metrics}
            pages={pages}
          />
        );
    }
  };

  if (authBootstrapping) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="h-8 w-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs font-semibold uppercase tracking-widest">Restoring session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased">
      {isLoggedIn && (
        <Sidebar
          currentScreen={currentScreen}
          onScreenChange={handleScreenChange}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 w-full">
        {isLoggedIn && (
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
            onNotificationNavigate={handleNotificationNavigate}
            onPublish={() => setIsPublishOpen(true)}
          />
        )}

        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {renderContent()}
        </main>

        {isLoggedIn && (
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

      {isLoggedIn && (
        <MobileNavDrawer
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          currentScreen={currentScreen}
          onScreenChange={handleScreenChange}
        />
      )}

      {isLoggedIn && (
        <PublishModal
          isOpen={isPublishOpen}
          settings={publishSettings}
          user={user}
          onClose={() => setIsPublishOpen(false)}
          onSave={savePublishSettings}
          onPublished={handleWebsitePublished}
          onNavigateToCustomDomains={() => {
            setIsPublishOpen(false);
            handleScreenChange(ScreenId.CUSTOM_DOMAINS);
          }}
        />
      )}
    </div>
  );
}
