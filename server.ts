import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const STORE_FILE = path.join(process.cwd(), "data-store.json");

app.use(express.json({ limit: "10mb" }));

// Helper to read store
function readStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      return JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading data store:", e);
  }
  return {};
}

// Helper to write store
function writeStore(data: any) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing to data store:", e);
  }
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
async function startServer() {
  const isProd = process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), "dist/index.html"));
  
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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;