import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import { createAuthRouter } from "./server/auth/routes";
import { getDataStoreStatus, getRootStore, initRootStore, setRootStore } from "./server/db/rootStore";
import { getSupabase, isSupabaseConfigured } from "./server/db/supabase";
import { mergeWorkspaceIntoRoot, syncRootToNormalizedTables } from "./server/db/syncNormalized";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

function allowedCorsOrigins(): Set<string> {
  const origins = new Set<string>();
  const appUrl = (process.env.APP_URL || "").trim().replace(/\/$/, "");
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      /* ignore */
    }
  }
  for (const raw of (process.env.CORS_ORIGINS || "").split(",")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      origins.add(new URL(trimmed).origin);
    } catch {
      /* ignore */
    }
  }
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
  }
  return origins;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = allowedCorsOrigins();
  if (origin && allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, Cookie"
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Lightweight endpoint for the dashboard footer health indicator.
app.get("/api/health", (_req, res) => {
  const storeStatus = getDataStoreStatus();
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: storeStatus
  });
});

app.use("/api/auth", createAuthRouter());

/** Import browser localStorage workspace collections → root + normalized Supabase tables */
app.post("/api/workspace/import", async (req, res) => {
  try {
    const workspace = (req.body?.workspace || req.body || {}) as Record<string, unknown>;
    const root = mergeWorkspaceIntoRoot(getRootStore(), workspace);
    setRootStore(root);

    let normalized: { ok: boolean; counts?: Record<string, number>; error?: string } = {
      ok: false,
      error: "supabase_not_configured"
    };
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        const result = await syncRootToNormalizedTables(supabase, root);
        normalized = result.ok
          ? { ok: true, counts: result.counts }
          : { ok: false, error: result.error };
      }
    }

    res.json({
      success: true,
      backend: getDataStoreStatus().backend,
      normalized
    });
  } catch (error) {
    console.error("workspace import failed:", error);
    res.status(500).json({ error: "Workspace import failed." });
  }
});

/** Force re-migrate root blob → all typed tables */
app.post("/api/admin/migrate-normalized", async (_req, res) => {
  if (!isSupabaseConfigured()) {
    res.status(400).json({ error: "Supabase is not configured." });
    return;
  }
  const supabase = getSupabase();
  if (!supabase) {
    res.status(400).json({ error: "Supabase client unavailable." });
    return;
  }
  const result = await syncRootToNormalizedTables(supabase, getRootStore());
  if (!result.ok) {
    res.status(500).json({ error: result.error });
    return;
  }
  res.json({ success: true, counts: result.counts });
});

// Helper to read store
function readStore(): any {
  return getRootStore();
}

// Helper to write store
function writeStore(data: any) {
  setRootStore(data);
}

// API Routes
app.get("/api/pages", (req, res) => {
  const store = readStore();
  const pages = store["pages_list"] || [];
  res.json(pages);
});

app.post("/api/pages", (req, res) => {
  const { pages } = req.body;
  const store = readStore();
  store["pages_list"] = pages;
  writeStore(store);
  res.json({ success: true });
});

app.get("/api/page/:id", (req, res) => {
  const { id } = req.params;
  const store = readStore();
  const pageData = store[id];
  if (pageData) {
    res.json(pageData);
  } else {
    res.status(404).json({ error: "Page not found" });
  }
});

app.post("/api/page/:id", (req, res) => {
  const { id } = req.params;
  const { blocks, details } = req.body;
  const store = readStore();
  store[id] = { blocks, details, updatedAt: new Date().toISOString() };
  writeStore(store);
  res.json({ success: true });
});

app.delete("/api/page/:id", (req, res) => {
  const { id } = req.params;
  const store = readStore();
  if (!(id in store)) {
    res.status(404).json({ error: "Page not found" });
    return;
  }

  delete store[id];
  writeStore(store);
  res.json({ success: true });
});

// User-Agent Parsing helper
function parseUserAgent(uaString: string | undefined) {
  if (!uaString) return { device: "Unknown", os: "Unknown", browser: "Unknown" };
  
  let device = "Desktop";
  if (/mobile|android|iphone|ipad|phone/i.test(uaString)) {
    if (/ipad|tablet/i.test(uaString)) {
      device = "Tablet";
    } else {
      device = "Mobile";
    }
  }

  let os = "Unknown";
  if (/windows/i.test(uaString)) os = "Windows";
  else if (/macintosh|mac os x/i.test(uaString)) os = "macOS";
  else if (/iphone|ipad|ipod/i.test(uaString)) os = "iOS";
  else if (/android/i.test(uaString)) os = "Android";
  else if (/linux/i.test(uaString)) os = "Linux";

  let browser = "Other";
  if (/chrome|crios/i.test(uaString) && !/edge|edg/i.test(uaString) && !/opr/i.test(uaString)) browser = "Chrome";
  else if (/safari/i.test(uaString) && !/chrome|crios/i.test(uaString)) browser = "Safari";
  else if (/firefox|fxios/i.test(uaString)) browser = "Firefox";
  else if (/edge|edg/i.test(uaString)) browser = "Edge";
  else if (/opera|opr/i.test(uaString)) browser = "Opera";

  return { device, os, browser };
}

// Track Event API
app.post("/api/track", (req, res) => {
  const { pageId, eventType, eventLabel, details } = req.body;
  const ua = req.headers["user-agent"];
  const parsedUA = parseUserAgent(ua);
  const domain = req.headers.host || "unknown-domain";
  // Log both the client connection port and the destination server port (e.g. 3000)
  const clientPort = req.socket.remotePort || "N/A";
  const portInfo = `Client: ${clientPort} → Host: ${PORT}`;

  const store = readStore();
  if (!store["tracking_events"]) {
    store["tracking_events"] = [];
  }

  const newEvent = {
    id: "evt_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    pageId: pageId || "unknown",
    eventType: eventType || "visit", // 'visit' | 'click' | 'register'
    eventLabel: eventLabel || "",
    device: parsedUA.device,
    os: parsedUA.os,
    browser: parsedUA.browser,
    domain,
    port: portInfo,
    details: details || {},
    timestamp: new Date().toISOString()
  };

  store["tracking_events"].unshift(newEvent);
  
  // Also increment counter metrics directly in our pages list if possible
  if (store["pages_list"] && Array.isArray(store["pages_list"])) {
    store["pages_list"] = store["pages_list"].map((p: any) => {
      if (p.id === pageId) {
        if (eventType === "visit") {
          return { ...p, views: (p.views || 0) + 1 };
        }
      }
      return p;
    });
  }

  writeStore(store);
  res.json({ success: true, event: newEvent });
});

// Bio page templates API (shared template library)
app.get("/api/templates", (req, res) => {
  const store = readStore();
  const templates = store["bio_page_templates"] || [];
  res.json(templates);
});

app.post("/api/templates", (req, res) => {
  const store = readStore();
  if (!store["bio_page_templates"]) {
    store["bio_page_templates"] = [];
  }

  if (req.body.template) {
    const template = req.body.template;
    const list = store["bio_page_templates"] as any[];
    const idx = list.findIndex((t: any) => t.id === template.id);
    if (idx >= 0) {
      list[idx] = { ...template, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(template);
    }
  } else if (Array.isArray(req.body.templates)) {
    store["bio_page_templates"] = req.body.templates;
  }

  writeStore(store);
  res.json({ success: true, templates: store["bio_page_templates"] });
});

app.delete("/api/templates/:id", (req, res) => {
  const { id } = req.params;
  const store = readStore();
  if (store["bio_page_templates"] && Array.isArray(store["bio_page_templates"])) {
    store["bio_page_templates"] = store["bio_page_templates"].filter((t: any) => t.id !== id);
    writeStore(store);
  }
  res.json({ success: true });
});

// Analytics Retrieval API
app.get("/api/analytics", (req, res) => {
  const store = readStore();
  const events = store["tracking_events"] || [];
  
  // Calculate aggregate metrics
  const totalViews = events.filter((e: any) => e.eventType === "visit").length;
  const totalClicks = events.filter((e: any) => e.eventType === "click").length;
  const totalRegisters = events.filter((e: any) => e.eventType === "register").length;
  
  res.json({
    events,
    metrics: {
      totalViews,
      totalClicks,
      totalRegisters,
      totalPages: store["pages_list"]?.length || 0
    }
  });
});

// Vite middleware setup
function isProductionMode(): boolean {
  const lifecycle = process.env.npm_lifecycle_event;

  // npm run dev → always use Vite (live source)
  if (lifecycle === "dev") return false;
  // npm start / npm run preview → serve dist/
  if (lifecycle === "start" || lifecycle === "preview") return true;

  if (process.env.NODE_ENV === "development") return false;
  if (process.env.NODE_ENV === "production") return true;

  const entry = (process.argv[1] || "").replace(/\\/g, "/");
  if (entry.endsWith("/server.ts")) return false;
  return entry.endsWith("/server.cjs") || entry.endsWith("/dist/server.cjs");
}

async function startServer() {
  await initRootStore();

  const isProd = isProductionMode();

  if (!isProd) {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode, serving static files from dist/...");
    const distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      console.error("ERROR: dist/index.html not found. Run `npm run build` first.");
      process.exit(1);
    }
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `\nPort ${PORT} is already in use. Stop the other server first:\n` +
            `  Windows: netstat -ano | findstr :${PORT}\n` +
            `  Then:    taskkill /PID <pid> /F\n`
        );
        process.exit(1);
      }
      throw err;
    });
  }
}

startServer();

export default app;