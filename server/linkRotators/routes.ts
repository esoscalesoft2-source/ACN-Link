import { Router, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";
import { requireAuth } from "../auth/routes";
import { buildLinkRotatorPublicUrl } from "./publicUrl";
import {
  createLinkRotator,
  findLinkRotatorById,
  isLinkRotatorSlugTaken,
  listLinkRotators,
  removeLinkRotator,
  updateLinkRotator
} from "./repository";
import { generateRotatorSlug, normalizeRotatorSlug, validateRotatorSlug } from "./slug";
import type { LinkRotatorRecord, LinkRotatorStatus } from "./types";
import { normalizeDestinations } from "./validation";

type AuthedRequest = Request & {
  authUser?: { id: string; email: string };
};

function recordId() {
  return `lr_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parseStatus(value: unknown): LinkRotatorStatus {
  return String(value || "").trim() === "Inactive" ? "Inactive" : "Active";
}

function publicRecord(record: LinkRotatorRecord) {
  return {
    id: record.id,
    name: record.name,
    description: record.description || "",
    slug: record.slug,
    rotatorUrl: buildLinkRotatorPublicUrl(record.slug),
    status: record.status,
    destinations: record.destinations,
    totalClicks: record.totalClicks || 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function allocateUniqueSlug(preferred?: string): string {
  let slug = preferred ? normalizeRotatorSlug(preferred) : generateRotatorSlug();
  if (!slug) slug = generateRotatorSlug();
  let attempt = 0;
  while (isLinkRotatorSlugTaken(slug) && attempt < 12) {
    slug = generateRotatorSlug();
    attempt += 1;
  }
  return slug;
}

export function createLinkRotatorsRouter() {
  const router = Router();

  router.use(requireAuth);
  router.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      next();
      return;
    }
    if (!req.headers.authorization?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Bearer token required.", code: "BEARER_REQUIRED" });
      return;
    }
    next();
  });

  router.get("/", (req: AuthedRequest, res: Response) => {
    try {
      const rows = listLinkRotators(req.authUser!.id);
      res.json({ rotators: rows.map(publicRecord) });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "LINK_ROTATOR_LIST_FAILED" });
    }
  });

  router.get("/:id", (req: AuthedRequest, res: Response) => {
    try {
      const record = findLinkRotatorById(req.params.id, req.authUser!.id);
      if (!record) {
        res.status(404).json({ error: "Link rotator not found." });
        return;
      }
      res.json({ rotator: publicRecord(record) });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error) });
    }
  });

  router.post("/", (req: AuthedRequest, res: Response) => {
    try {
      const name = String(req.body?.name || "").trim();
      const description = String(req.body?.description || "").trim();
      const status = parseStatus(req.body?.status);
      const destinationResult = normalizeDestinations(req.body?.destinations);

      if (!name) {
        res.status(400).json({ error: "Rotator name is required." });
        return;
      }
      if (destinationResult.error || !destinationResult.destinations) {
        res.status(400).json({ error: destinationResult.error || "Invalid destinations." });
        return;
      }

      const preferredSlug = normalizeRotatorSlug(req.body?.slug);
      if (preferredSlug) {
        const slugError = validateRotatorSlug(preferredSlug);
        if (slugError) {
          res.status(400).json({ error: slugError });
          return;
        }
        if (isLinkRotatorSlugTaken(preferredSlug)) {
          res.status(409).json({ error: "That rotator slug is already in use." });
          return;
        }
      }

      const slug = allocateUniqueSlug(preferredSlug || undefined);
      const record = createLinkRotator({
        id: recordId(),
        ownerUserId: req.authUser!.id,
        name,
        description,
        slug,
        status,
        destinations: destinationResult.destinations
      });

      res.status(201).json({ rotator: publicRecord(record) });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "LINK_ROTATOR_CREATE_FAILED" });
    }
  });

  router.patch("/:id", (req: AuthedRequest, res: Response) => {
    try {
      const existing = findLinkRotatorById(req.params.id, req.authUser!.id);
      if (!existing) {
        res.status(404).json({ error: "Link rotator not found." });
        return;
      }

      const name =
        req.body?.name !== undefined ? String(req.body.name || "").trim() : existing.name;
      const description =
        req.body?.description !== undefined
          ? String(req.body.description || "").trim()
          : existing.description;
      const status =
        req.body?.status !== undefined ? parseStatus(req.body.status) : existing.status;

      if (!name) {
        res.status(400).json({ error: "Rotator name is required." });
        return;
      }

      let destinations = existing.destinations;
      if (req.body?.destinations !== undefined) {
        const destinationResult = normalizeDestinations(req.body.destinations);
        if (destinationResult.error || !destinationResult.destinations) {
          res.status(400).json({ error: destinationResult.error || "Invalid destinations." });
          return;
        }
        destinations = destinationResult.destinations;
      }

      const updated = updateLinkRotator(existing.id, req.authUser!.id, {
        name,
        description,
        status,
        destinations
      });
      if (!updated) {
        res.status(404).json({ error: "Link rotator not found." });
        return;
      }
      res.json({ rotator: publicRecord(updated) });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "LINK_ROTATOR_UPDATE_FAILED" });
    }
  });

  router.delete("/:id", (req: AuthedRequest, res: Response) => {
    try {
      const removed = removeLinkRotator(req.params.id, req.authUser!.id);
      if (!removed) {
        res.status(404).json({ error: "Link rotator not found." });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: errorMessage(error), code: "LINK_ROTATOR_DELETE_FAILED" });
    }
  });

  return router;
}
