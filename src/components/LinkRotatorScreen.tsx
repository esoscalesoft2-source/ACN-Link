import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Eye,
  Pencil,
  Plus,
  Search,
  Shuffle,
  Trash2
} from "lucide-react";
import type { LinkRotator, LinkRotatorDestination } from "../types";
import {
  createLinkRotator,
  deleteLinkRotator,
  LinkRotatorApiError,
  updateLinkRotator,
  type LinkRotatorInput
} from "../lib/linkRotatorApi";
import PageShell, { PageHeader, SectionCard, Workspace } from "./layout/PageShell";

type ScreenMode = "list" | "form" | "view";

interface LinkRotatorScreenProps {
  rotators: LinkRotator[];
  onReload: () => Promise<void>;
  loading?: boolean;
  loadError?: string | null;
}

type DestinationDraft = {
  key: string;
  url: string;
  probability: string;
};

function newDestinationDraft(probability = ""): DestinationDraft {
  return {
    key: `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    url: "",
    probability
  };
}

function emptyForm() {
  return {
    name: "",
    description: "",
    status: "Active" as "Active" | "Inactive",
    destinations: [newDestinationDraft("50"), newDestinationDraft("50")]
  };
}

function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function formatCreatedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function probabilityTotal(destinations: DestinationDraft[]): number {
  return destinations.reduce((sum, item) => {
    const value = Number(item.probability);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function validateForm(form: ReturnType<typeof emptyForm>): string | null {
  if (!form.name.trim()) return "Rotator name is required.";
  if (form.destinations.length === 0) return "Add at least one destination URL.";

  for (let index = 0; index < form.destinations.length; index += 1) {
    const row = form.destinations[index];
    const url = normalizeUrl(row.url);
    const probability = Number(row.probability);

    if (!isValidHttpUrl(url)) {
      return `Destination ${index + 1}: enter a valid URL.`;
    }
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
      return `Destination ${index + 1}: probability must be between 0 and 100.`;
    }
  }

  const total = Math.round(probabilityTotal(form.destinations) * 100) / 100;
  if (Math.abs(total - 100) > 0.01) {
    return `Total probability must equal exactly 100%. Current total: ${total}%.`;
  }

  return null;
}

function toInput(form: ReturnType<typeof emptyForm>): LinkRotatorInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    status: form.status,
    destinations: form.destinations.map((item) => ({
      url: normalizeUrl(item.url),
      probability: Number(item.probability)
    }))
  };
}

export default function LinkRotatorScreen({
  rotators,
  onReload,
  loading = false,
  loadError = null
}: LinkRotatorScreenProps) {
  const [mode, setMode] = useState<ScreenMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<LinkRotator | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rotators;
    return rotators.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.rotatorUrl.toLowerCase().includes(query) ||
        (item.description || "").toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query)
      );
    });
  }, [rotators, searchQuery]);

  useEffect(() => {
    if (!viewing) return;
    const fresh = rotators.find((item) => item.id === viewing.id);
    if (fresh) setViewing(fresh);
  }, [rotators, viewing?.id]);

  const totalProbability = Math.round(probabilityTotal(form.destinations) * 100) / 100;

  const openCreate = () => {
    setEditingId(null);
    setViewing(null);
    setForm(emptyForm());
    setFormError("");
    setMode("form");
  };

  const openEdit = (rotator: LinkRotator) => {
    setEditingId(rotator.id);
    setViewing(null);
    setForm({
      name: rotator.name,
      description: rotator.description || "",
      status: rotator.status,
      destinations: rotator.destinations.map((destination) => ({
        key: destination.id || newDestinationDraft().key,
        url: destination.url,
        probability: String(destination.probability)
      }))
    });
    setFormError("");
    setMode("form");
  };

  const openView = (rotator: LinkRotator) => {
    setViewing(rotator);
    setMode("view");
  };

  const backToList = () => {
    if (isSaving) return;
    setMode("list");
    setEditingId(null);
    setViewing(null);
    setForm(emptyForm());
    setFormError("");
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      triggerToast("Rotator URL copied.");
    } catch {
      triggerToast("Unable to copy. Copy the URL manually.");
    }
  };

  const updateDestination = (key: string, patch: Partial<DestinationDraft>) => {
    setForm((current) => ({
      ...current,
      destinations: current.destinations.map((item) =>
        item.key === key ? { ...item, ...patch } : item
      )
    }));
  };

  const addDestination = () => {
    setForm((current) => ({
      ...current,
      destinations: [...current.destinations, newDestinationDraft("0")]
    }));
  };

  const removeDestination = (key: string) => {
    setForm((current) => ({
      ...current,
      destinations:
        current.destinations.length <= 1
          ? current.destinations
          : current.destinations.filter((item) => item.key !== key)
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const error = validateForm(form);
    if (error) {
      setFormError(error);
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const payload = toInput(form);
      if (editingId) {
        await updateLinkRotator(editingId, payload);
        triggerToast("Link rotator updated.");
      } else {
        await createLinkRotator(payload);
        triggerToast("Link rotator created.");
      }
      await onReload();
      backToList();
    } catch (err) {
      setFormError(
        err instanceof LinkRotatorApiError ? err.message : "Unable to save link rotator."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rotator: LinkRotator) => {
    const confirmed = window.confirm(
      `Delete "${rotator.name}"?\n\nThe rotator URL will stop working.`
    );
    if (!confirmed) return;
    try {
      await deleteLinkRotator(rotator.id);
      triggerToast("Link rotator deleted.");
      await onReload();
      if (viewing?.id === rotator.id || editingId === rotator.id) backToList();
    } catch (err) {
      triggerToast(err instanceof LinkRotatorApiError ? err.message : "Unable to delete.");
    }
  };

  if (mode === "form") {
    return (
      <PageShell className="font-sans text-slate-800">
        <PageHeader
          title={editingId ? "Edit Link Rotator" : "Add Link Rotator"}
          subtitle="Split traffic across destination URLs using redirect probability."
          actions={
            <button
              type="button"
              onClick={backToList}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </button>
          }
        />

        <Workspace panel stack>
          <SectionCard className="p-5 sm:p-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Rotator Name <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Summer campaign rotator"
                    required
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Description
                  </span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Optional notes about this rotator"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value === "Inactive" ? "Inactive" : "Active"
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Destination URLs</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Probabilities must add up to exactly 100%.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      Math.abs(totalProbability - 100) < 0.01
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    Total: {totalProbability}%
                  </span>
                </div>

                <div className="space-y-3">
                  {form.destinations.map((destination, index) => (
                    <div
                      key={destination.key}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Destination {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeDestination(destination.key)}
                          disabled={form.destinations.length <= 1}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                        <label className="block min-w-0">
                          <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                            Destination URL <span className="text-rose-500">*</span>
                          </span>
                          <input
                            type="url"
                            value={destination.url}
                            onChange={(event) =>
                              updateDestination(destination.key, { url: event.target.value })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                            placeholder="https://example.com"
                            required
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                            Probability (%) <span className="text-rose-500">*</span>
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={destination.probability}
                            onChange={(event) =>
                              updateDestination(destination.key, {
                                probability: event.target.value
                              })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                            required
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addDestination}
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                >
                  <Plus className="h-4 w-4" />
                  Add destination
                </button>
              </div>

              {formError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="acn-btn-chip inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : editingId ? "Save changes" : "Create rotator"}
                </button>
                <button
                  type="button"
                  onClick={backToList}
                  disabled={isSaving}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </SectionCard>
        </Workspace>

        {toast && (
          <div className="fixed bottom-6 right-6 z-[200] rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl">
            {toast}
          </div>
        )}
      </PageShell>
    );
  }

  if (mode === "view" && viewing) {
    return (
      <PageShell className="font-sans text-slate-800">
        <PageHeader
          title={viewing.name}
          subtitle="Rotator details and destination split."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={backToList}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => openEdit(viewing)}
                className="acn-btn-chip inline-flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            </div>
          }
        />

        <Workspace panel stack>
          <SectionCard className="p-5 sm:p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Rotator URL</p>
                <div className="mt-1.5 flex min-w-0 items-center gap-2">
                  <a
                    href={viewing.rotatorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-semibold text-indigo-600 hover:underline"
                  >
                    {viewing.rotatorUrl}
                  </a>
                  <button
                    type="button"
                    onClick={() => void copyText(viewing.rotatorUrl)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                    title="Copy URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-1.5 text-sm font-bold text-slate-900">{viewing.status}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Clicks</p>
                  <p className="mt-1.5 text-sm font-bold text-slate-900">{viewing.totalClicks}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Created</p>
                  <p className="mt-1.5 text-sm font-bold text-slate-900">
                    {formatCreatedAt(viewing.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {viewing.description && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Description</p>
                <p className="mt-1.5 text-sm text-slate-700">{viewing.description}</p>
              </div>
            )}

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                Destinations ({viewing.destinations.length})
              </p>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                {viewing.destinations.map((destination: LinkRotatorDestination, index) => (
                  <div
                    key={destination.id || `${destination.url}-${index}`}
                    className="flex flex-col gap-1 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-400">Destination {index + 1}</p>
                      <p className="truncate text-sm font-semibold text-slate-800">{destination.url}</p>
                    </div>
                    <p className="text-sm font-bold text-indigo-600">{destination.probability}%</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </Workspace>

        {toast && (
          <div className="fixed bottom-6 right-6 z-[200] rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl">
            {toast}
          </div>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell className="font-sans text-slate-800">
      <PageHeader
        title="Link Rotator"
        subtitle="Create one shareable URL that randomly redirects by probability."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 acn-btn-chip px-5 py-2.5 text-xs font-extrabold"
          >
            <Plus className="h-4 w-4" />
            Add Link Rotator
          </button>
        }
      />

      <Workspace panel stack>
        <SectionCard className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="acn-icon-field flex-1">
              <span className="acn-icon-field__icon">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search rotators by name, URL, or status…"
                className="acn-icon-field__input w-full"
              />
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Showing {filtered.length} of {rotators.length}
            </p>
          </div>
        </SectionCard>

        {loadError && (
          <SectionCard className="border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {loadError}
          </SectionCard>
        )}

        <SectionCard className="overflow-hidden">
          {loading && rotators.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">Loading rotators…</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Shuffle className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {rotators.length === 0 ? "No link rotators yet" : "No rotators match your search"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {rotators.length === 0
                  ? "Create your first rotator to split traffic across destinations."
                  : "Try a different search term."}
              </p>
              {rotators.length === 0 && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="acn-btn-chip mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold"
                >
                  <Plus className="h-4 w-4" />
                  Add Link Rotator
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Rotator Name</th>
                    <th className="px-4 py-3 font-bold">Rotator URL</th>
                    <th className="px-4 py-3 font-bold">Destinations</th>
                    <th className="px-4 py-3 font-bold">Clicks</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Created</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((rotator) => (
                    <tr key={rotator.id} className="bg-white hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900">{rotator.name}</p>
                        {rotator.description ? (
                          <p className="mt-0.5 max-w-[14rem] truncate text-xs text-slate-500">
                            {rotator.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex max-w-[18rem] items-center gap-1.5">
                          <a
                            href={rotator.rotatorUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate font-mono text-xs font-semibold text-indigo-600 hover:underline"
                            title={rotator.rotatorUrl}
                          >
                            {rotator.rotatorUrl}
                          </a>
                          <button
                            type="button"
                            onClick={() => void copyText(rotator.rotatorUrl)}
                            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Copy"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        {rotator.destinations.length}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        {rotator.totalClicks}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            rotator.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {rotator.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {formatCreatedAt(rotator.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openView(rotator)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(rotator)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <a
                            href={rotator.rotatorUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600"
                            title="Open rotator URL"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleDelete(rotator)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </Workspace>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl">
          {toast}
        </div>
      )}
    </PageShell>
  );
}
