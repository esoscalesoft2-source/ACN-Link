import React, { useEffect, useState } from "react";
import PublicBioPageView from "./PublicBioPageView";
import { apiUrl } from "../lib/apiBase";
import type { BioPage } from "../types";

type PublicMeta = {
  id: string;
  title: string;
  slug: string;
  bio?: string;
  coverPhoto?: string;
  status: "Live";
};

type GateState =
  | { kind: "loading" }
  | { kind: "ready"; page: PublicMeta }
  | { kind: "not_found" }
  | { kind: "unpublished" }
  | { kind: "error"; message: string };

/**
 * Renders a published bio page for anonymous QR / share visitors.
 * Does not rely on the visitor's local dashboard page list.
 */
export default function PublicPreviewPageGate({
  previewPageId,
  localPages
}: {
  previewPageId: string;
  localPages: BioPage[];
}) {
  const local = localPages.find((page) => page.id === previewPageId);
  const [state, setState] = useState<GateState>(() => {
    if (local?.status === "Live") {
      return {
        kind: "ready",
        page: {
          id: local.id,
          title: local.title || "BioLink",
          slug: local.slug || "biolink",
          bio: local.bio,
          coverPhoto: local.coverPhoto,
          status: "Live"
        }
      };
    }
    if (local) {
      return { kind: "unpublished" };
    }
    return { kind: "loading" };
  });

  useEffect(() => {
    let cancelled = false;

    if (local?.status === "Live") {
      setState({
        kind: "ready",
        page: {
          id: local.id,
          title: local.title || "BioLink",
          slug: local.slug || "biolink",
          bio: local.bio,
          coverPhoto: local.coverPhoto,
          status: "Live"
        }
      });
      return;
    }
    if (local) {
      setState({ kind: "unpublished" });
      return;
    }

    setState({ kind: "loading" });

    void (async () => {
      try {
        const response = await fetch(apiUrl(`/api/public/page/${encodeURIComponent(previewPageId)}`), {
          cache: "no-store"
        });
        const payload = (await response.json().catch(() => null)) as
          | (PublicMeta & { code?: string; error?: string })
          | null;

        if (cancelled) return;

        if (response.ok && payload?.id) {
          setState({
            kind: "ready",
            page: {
              id: payload.id,
              title: payload.title || "BioLink",
              slug: payload.slug || "biolink",
              bio: payload.bio,
              coverPhoto: payload.coverPhoto,
              status: "Live"
            }
          });
          return;
        }

        if (payload?.code === "PAGE_NOT_PUBLISHED" || response.status === 404) {
          setState({
            kind: payload?.code === "PAGE_NOT_PUBLISHED" ? "unpublished" : "not_found"
          });
          return;
        }

        setState({
          kind: "error",
          message: payload?.error || "Could not load this page. Check your connection and try again."
        });
      } catch {
        if (!cancelled) {
          setState({
            kind: "error",
            message: "Could not reach the server. Check your connection and try again."
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewPageId, local]);

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="space-y-2">
          <div className="mx-auto h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading page…</p>
        </div>
      </div>
    );
  }

  if (state.kind === "unpublished") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md text-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">This page is not available</h1>
          <p className="mt-2 text-sm text-slate-600">
            This bio page is still a draft. Publish it from Bio Pages before visitors can open the link.
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md text-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Page not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            This ACN Link page does not exist or was removed.
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md text-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Couldn’t load page</h1>
          <p className="text-sm text-slate-600">{state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <PublicBioPageView
      pageId={state.page.id}
      pageTitle={state.page.title}
      pageSlug={state.page.slug}
      pageBio={state.page.bio}
      pageCoverPhoto={state.page.coverPhoto}
      mode="preview"
    />
  );
}
