import React, { useEffect, useMemo, useState } from "react";
import { Contact } from "../types";
import {
  Download,
  Plus,
  Eye,
  EyeOff,
  Search,
  ChevronDown,
  X,
  Tag,
  Pencil,
  Trash2,
  Users,
  Globe,
  LayoutTemplate,
  Clock,
  FileText,
  Sparkles
} from "lucide-react";
import PageShell, { PageHeader, SectionCard, StatCard, StatCardGrid, Workspace } from "./layout/PageShell";

type ContactInput = Omit<Contact, "id" | "maskedEmail" | "maskedPhone">;

interface ContactsScreenProps {
  contacts: Contact[];
  onAddContact: (contact: ContactInput) => void;
  onUpdateContact: (id: string, contact: ContactInput) => void;
  onDeleteContact: (id: string) => void;
}

function formatCapturedAt(value: string): string {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }
  return value;
}

function parseCapturedTime(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRelativeCaptured(value: string): string {
  const time = parseCapturedTime(value);
  if (!time) return "—";
  const diffMs = Date.now() - time;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatCapturedAt(value);
}

const AVATAR_PALETTES = [
  "from-indigo-500 to-violet-500",
  "from-sky-500 to-cyan-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-fuchsia-500 to-purple-500",
  "from-blue-500 to-indigo-500",
  "from-teal-500 to-emerald-500"
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAvatarGradient(seed: string): string {
  return AVATAR_PALETTES[hashString(seed || "x") % AVATAR_PALETTES.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getSourceStyle(source: string): { badge: string; dot: string } {
  const normalized = (source || "").toUpperCase();
  if (normalized.includes("SMART")) {
    return { badge: "bg-violet-50 border-violet-100 text-violet-600", dot: "bg-violet-500" };
  }
  if (normalized.includes("MANUAL")) {
    return { badge: "bg-slate-50 border-slate-200 text-slate-600", dot: "bg-slate-400" };
  }
  return { badge: "bg-indigo-50 border-indigo-100 text-[#4F46E5]", dot: "bg-[#4F46E5]" };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function emptyForm() {
  return {
    name: "",
    email: "",
    phone: "",
    tag: "",
    marketingOptIn: true
  };
}

export default function ContactsScreen({
  contacts,
  onAddContact,
  onUpdateContact,
  onDeleteContact
}: ContactsScreenProps) {
  const [unmaskedIds, setUnmaskedIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [tagFilter, setTagFilter] = useState("All tags");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    document.body.classList.add("acn-contact-modal-open");
    return () => document.body.classList.remove("acn-contact-modal-open");
  }, [isModalOpen]);

  const triggerToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const sourceOptions = useMemo(() => {
    const sources = Array.from(new Set(contacts.map((contact) => contact.source).filter(Boolean))).sort();
    return ["All sources", ...sources];
  }, [contacts]);

  const tagOptions = useMemo(() => {
    const tags = Array.from(new Set(contacts.flatMap((contact) => contact.tags))).sort();
    return ["All tags", ...tags];
  }, [contacts]);

  const stats = useMemo(() => {
    const now = Date.now();
    const sevenDays = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDays = now - 30 * 24 * 60 * 60 * 1000;

    return {
      total: contacts.length,
      last7: contacts.filter((contact) => parseCapturedTime(contact.capturedAt) >= sevenDays).length,
      last30: contacts.filter((contact) => parseCapturedTime(contact.capturedAt) >= thirtyDays).length,
      optIns: contacts.filter((contact) => contact.marketingOptIn).length
    };
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return contacts.filter((contact) => {
      const formBlob = [
        contact.notes || "",
        contact.pageTitle || "",
        contact.blockLabel || "",
        contact.sourceDomain || "",
        contact.templateName || "",
        ...(contact.formFields || []).flatMap((field) => [field.label, field.value])
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        contact.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        formBlob.includes(query);

      const matchesSource = sourceFilter === "All sources" || contact.source === sourceFilter;
      const matchesTag = tagFilter === "All tags" || contact.tags.includes(tagFilter);

      return matchesSearch && matchesSource && matchesTag;
    });
  }, [contacts, searchQuery, sourceFilter, tagFilter]);

  const toggleMask = (id: string) => {
    setUnmaskedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const openCreateModal = () => {
    setEditingContact(null);
    setForm(emptyForm());
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      tag: contact.tags[0] || "",
      marketingOptIn: !!contact.marketingOptIn
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingContact(null);
    setForm(emptyForm());
    setFormError("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const tag = form.tag.trim();

    if (!name) {
      setFormError("Full name is required.");
      return;
    }
    if (!email || !isValidEmail(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (!phone || phone.replace(/\D/g, "").length < 7) {
      setFormError("Enter a valid phone number.");
      return;
    }

    const duplicate = contacts.find(
      (contact) =>
        contact.email.toLowerCase() === email.toLowerCase() &&
        contact.id !== editingContact?.id
    );
    if (duplicate) {
      setFormError("A contact with this email already exists.");
      return;
    }

    setIsSaving(true);

    window.setTimeout(() => {
      const payload: ContactInput = {
        name,
        email,
        phone,
        source: editingContact?.source || "MANUAL ENTRY",
        tags: tag ? [tag] : editingContact?.tags?.length ? editingContact.tags : ["Manual Lead"],
        capturedAt: editingContact?.capturedAt || new Date().toISOString(),
        marketingOptIn: form.marketingOptIn,
        formFields: [
          { label: "Full name", value: name },
          { label: "Email", value: email },
          { label: "Phone", value: phone },
          ...(tag ? [{ label: "Tag", value: tag }] : [])
        ],
        notes: editingContact?.notes,
        pageId: editingContact?.pageId,
        pageTitle: editingContact?.pageTitle,
        blockId: editingContact?.blockId,
        blockLabel: editingContact?.blockLabel || "Manual lead block",
        sourceDomain:
          editingContact?.sourceDomain ||
          (typeof window !== "undefined" ? window.location.hostname : ""),
        templateId: editingContact?.templateId,
        templateName: editingContact?.templateName,
        pageSlug: editingContact?.pageSlug
      };

      if (editingContact) {
        onUpdateContact(editingContact.id, payload);
        triggerToast(`Updated ${name}.`);
      } else {
        onAddContact(payload);
        triggerToast(`Added ${name} to contacts.`);
      }

      setIsSaving(false);
      setIsModalOpen(false);
      setEditingContact(null);
      setForm(emptyForm());
    }, 350);
  };

  const handleDelete = (contact: Contact) => {
    if (!window.confirm(`Delete "${contact.name}"? This cannot be undone.`)) return;
    onDeleteContact(contact.id);
    triggerToast(`Deleted ${contact.name}.`);
  };

  const triggerExport = () => {
    const rows = filteredContacts.length > 0 ? filteredContacts : contacts;
    if (rows.length === 0) {
      triggerToast("No contacts to export.");
      return;
    }

    const headers = "Name,Email,Phone,Source,Tags,FormData,Page,Block,Domain,Template,CapturedAt,MarketingOptIn\n";
    const csv = rows
      .map((contact) =>
        [
          contact.name,
          contact.email,
          contact.phone,
          contact.source,
          contact.tags.join(";"),
          contact.formFields?.map((field) => `${field.label}=${field.value}`).join(" | ") ||
            contact.notes ||
            "",
          contact.pageTitle || "",
          contact.blockLabel || "",
          contact.sourceDomain || "",
          contact.templateName || "",
          formatCapturedAt(contact.capturedAt),
          contact.marketingOptIn ? "Yes" : "No"
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([headers + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "acnlink_contacts.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast(`Exported ${rows.length} contact${rows.length === 1 ? "" : "s"}.`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSourceFilter("All sources");
    setTagFilter("All tags");
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 || sourceFilter !== "All sources" || tagFilter !== "All tags";

  return (
    <PageShell>
      <PageHeader
        title="Contacts"
        subtitle="Bio page Form / Smart Form submissions appear here automatically"
        actions={
          <>
            <button
              type="button"
              onClick={triggerExport}
              className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors bg-white shadow-sm"
            >
              <Download className="h-4.5 w-4.5 text-gray-400" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md shadow-indigo-100 transition-all active:scale-95"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Add Contact</span>
            </button>
          </>
        }
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="contact-modal-title" className="font-display font-bold text-lg text-gray-950">
                {editingContact ? "Edit Contact" : "Add New Contact"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 text-left">
                <span className="font-bold block text-center text-slate-700 uppercase tracking-widest font-mono text-[10px]">
                  {editingContact ? "Edit lead block" : "Manual lead block"}
                </span>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Full name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. John Doe"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-xl py-2 px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Email address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-xl py-2 px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Phone number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 555-0199"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-xl py-2 px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tag (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Newsletter, VIP"
                    value={form.tag}
                    onChange={(e) => setForm((prev) => ({ ...prev, tag: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded-xl py-2 px-3 text-xs"
                  />
                </div>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={form.marketingOptIn}
                    onChange={(e) => setForm((prev) => ({ ...prev, marketingOptIn: e.target.checked }))}
                    className="rounded border-slate-300 accent-[#7c3aed]"
                  />
                  <span className="font-semibold">
                    Marketing opt-in (email / WhatsApp updates)
                  </span>
                </label>
              </div>

              {formError && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-70 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-violet-500/25 transition-colors"
              >
                {isSaving ? "Saving…" : editingContact ? "Save Changes" : "Save Lead"}
              </button>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="w-full px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-60"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      <StatCardGrid>
        <StatCard label="TOTAL" value={stats.total} sub="all-time" />
        <StatCard label="LAST 7 DAYS" value={stats.last7} sub="new contacts" />
        <StatCard label="LAST 30 DAYS" value={stats.last30} sub="new contacts" />
        <StatCard label="MARKETING OPT-INS" value={stats.optIns} sub="consented" />
      </StatCardGrid>

      <SectionCard className="flex flex-col">
        <Workspace className="border-b border-gray-50 flex flex-col gap-3">
          <div className="acn-icon-field w-full">
            <span className="acn-icon-field__icon">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="search"
              placeholder="Search by name, email, phone, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="acn-icon-field__input w-full bg-slate-50 border border-slate-100 rounded-xl py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
              aria-label="Search contacts"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none appearance-none pr-8 cursor-pointer shadow-sm hover:bg-gray-50"
                aria-label="Filter by source"
              >
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative flex-1">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none appearance-none pr-8 cursor-pointer shadow-sm hover:bg-gray-50"
                aria-label="Filter by tag"
              >
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="sm:w-auto w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                Clear filters
              </button>
            )}
          </div>
        </Workspace>

        {contacts.length === 0 ? (
          <Workspace>
            <div className="py-14 text-center">
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#4F46E5]">
                <Users className="h-5 w-5" />
              </div>
              <p className="font-display font-bold text-gray-900">No contacts yet</p>
              <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">
                Add your first lead manually, or capture contacts when public visitors submit Form / Smart Form blocks on your Bio Pages.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                Add Contact
              </button>
            </div>
          </Workspace>
        ) : filteredContacts.length === 0 ? (
          <Workspace>
            <div className="py-12 text-center text-gray-400 text-sm space-y-3">
            <p>No contacts match the selected filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-[#4F46E5] font-semibold hover:underline"
            >
              Clear filters
            </button>
            </div>
          </Workspace>
        ) : (
          <Workspace>
          <>
            {/* Mobile / tablet — record cards */}
            <div className="lg:hidden space-y-3">
              {filteredContacts.map((contact) => {
                const isUnmasked = !!unmaskedIds[contact.id];
                const sourceStyle = getSourceStyle(contact.source);
                const hasDetails =
                  contact.formFields?.length ||
                  contact.notes ||
                  contact.pageTitle ||
                  contact.blockLabel ||
                  contact.sourceDomain ||
                  contact.templateName;
                return (
                  <div
                    key={contact.id}
                    className="acn-contact-card rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`shrink-0 h-10 w-10 rounded-full bg-gradient-to-br ${getAvatarGradient(
                            contact.email || contact.id
                          )} flex items-center justify-center text-white font-bold text-xs shadow-sm`}
                        >
                          {getInitials(contact.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-gray-900 text-sm truncate">{contact.name}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5 break-all">
                            {isUnmasked ? contact.email : contact.maskedEmail}
                          </p>
                          <p className="text-xs text-gray-500 font-mono break-all">
                            {isUnmasked ? contact.phone : contact.maskedPhone}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleMask(contact.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                          title={isUnmasked ? "Mask credentials" : "Show credentials"}
                          aria-label={isUnmasked ? "Mask credentials" : "Show credentials"}
                        >
                          {isUnmasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(contact)}
                          className="p-2 hover:bg-indigo-50 rounded-lg text-gray-400 hover:text-[#4F46E5]"
                          title="Edit contact"
                          aria-label={`Edit ${contact.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(contact)}
                          className="p-2 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600"
                          title="Delete contact"
                          aria-label={`Delete ${contact.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <span
                        className={`inline-flex items-center gap-1 border text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${sourceStyle.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${sourceStyle.dot}`} />
                        {contact.source}
                      </span>
                      {contact.marketingOptIn && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Opt-in
                        </span>
                      )}
                      {contact.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-100"
                        >
                          <Tag className="h-2.5 w-2.5 text-slate-400" />
                          {tag}
                        </span>
                      ))}
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                        <Clock className="h-3 w-3" />
                        {formatRelativeCaptured(contact.capturedAt)}
                      </span>
                    </div>

                    {hasDetails ? (
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <FileText className="h-3 w-3" />
                          {contact.source === "SMART FORM"
                            ? "Smart Form submission"
                            : contact.source === "MANUAL ENTRY"
                              ? "Manual lead block"
                              : "Form submission"}
                          {contact.blockLabel ? ` · ${contact.blockLabel}` : ""}
                        </p>
                        {contact.formFields && contact.formFields.length > 0
                          ? contact.formFields.map((field) => (
                              <div key={`${contact.id}-${field.label}`} className="text-xs text-slate-600">
                                <span className="font-semibold text-slate-700">{field.label}: </span>
                                <span className="break-all">{field.value || "—"}</span>
                              </div>
                            ))
                          : contact.notes
                            ? (
                                <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">
                                  {contact.notes}
                                </p>
                              )
                            : null}
                        {contact.pageTitle ? (
                          <p className="text-[10px] text-slate-400 pt-1">From bio page: {contact.pageTitle}</p>
                        ) : null}
                        {(contact.sourceDomain || contact.templateName) && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5">
                            {contact.sourceDomain ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                <Globe className="h-2.5 w-2.5 text-slate-400" />
                                {contact.sourceDomain}
                              </span>
                            ) : null}
                            {contact.templateName ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                <LayoutTemplate className="h-2.5 w-2.5 text-slate-400" />
                                {contact.templateName}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Desktop — polished record table */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="min-w-[1080px]">
                <div className="grid grid-cols-[2.1fr_100px_1.9fr_1.4fr_1.1fr_110px_92px] gap-3 px-4 pb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Source</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Lead details
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Domain / Template
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tags</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Captured</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                    Actions
                  </span>
                </div>

                <div className="space-y-2.5">
                  {filteredContacts.map((contact) => {
                    const isUnmasked = !!unmaskedIds[contact.id];
                    const sourceStyle = getSourceStyle(contact.source);
                    return (
                      <div
                        key={contact.id}
                        className="acn-contact-row grid grid-cols-[2.1fr_100px_1.9fr_1.4fr_1.1fr_110px_92px] gap-3 items-center rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`shrink-0 h-10 w-10 rounded-full bg-gradient-to-br ${getAvatarGradient(
                              contact.email || contact.id
                            )} flex items-center justify-center text-white font-bold text-xs shadow-sm`}
                          >
                            {getInitials(contact.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-display font-bold text-gray-900 text-sm truncate">
                              {contact.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[11px] text-gray-500 font-mono truncate">
                                {isUnmasked ? contact.email : contact.maskedEmail}
                              </p>
                              <button
                                type="button"
                                onClick={() => toggleMask(contact.id)}
                                className="shrink-0 p-0.5 text-gray-300 hover:text-gray-500 transition-colors"
                                title={isUnmasked ? "Mask credentials" : "Show credentials"}
                                aria-label={isUnmasked ? "Mask credentials" : "Show credentials"}
                              >
                                {isUnmasked ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                            </div>
                            <p className="text-[11px] text-gray-400 font-mono truncate">
                              {isUnmasked ? contact.phone : contact.maskedPhone}
                            </p>
                          </div>
                        </div>

                        <div>
                          <span
                            className={`inline-flex items-center gap-1 border text-[10px] font-bold px-2 py-1 rounded-full tracking-wide uppercase ${sourceStyle.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${sourceStyle.dot}`} />
                            {contact.source}
                          </span>
                        </div>

                        <div className="min-w-0">
                          {contact.formFields && contact.formFields.length > 0 ? (
                            <div className="space-y-0.5">
                              {contact.formFields.slice(0, 3).map((field) => (
                                <p
                                  key={`${contact.id}-t-${field.label}`}
                                  className="text-[11px] text-slate-600 truncate"
                                >
                                  <span className="font-semibold text-slate-700">{field.label}:</span>{" "}
                                  <span>{field.value || "—"}</span>
                                </p>
                              ))}
                              {contact.formFields.length > 3 && (
                                <p className="text-[10px] text-indigo-400 font-semibold">
                                  +{contact.formFields.length - 3} more
                                </p>
                              )}
                              {contact.pageTitle ? (
                                <p className="text-[10px] text-slate-400 pt-0.5 truncate">
                                  Page: {contact.pageTitle}
                                  {contact.blockLabel ? ` · ${contact.blockLabel}` : ""}
                                </p>
                              ) : null}
                            </div>
                          ) : contact.notes ? (
                            <div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 break-words">
                                {contact.notes}
                              </p>
                              {contact.pageTitle ? (
                                <p className="text-[10px] text-slate-400 pt-0.5 truncate">
                                  Page: {contact.pageTitle}
                                </p>
                              ) : null}
                            </div>
                          ) : contact.pageTitle ? (
                            <p className="text-[11px] text-slate-500 truncate">Page: {contact.pageTitle}</p>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          {contact.sourceDomain ? (
                            <p className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-mono truncate w-full">
                              <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{contact.sourceDomain}</span>
                            </p>
                          ) : null}
                          {contact.templateName ? (
                            <p className="inline-flex items-center gap-1 text-[11px] text-slate-500 truncate w-full">
                              <LayoutTemplate className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{contact.templateName}</span>
                            </p>
                          ) : null}
                          {!contact.sourceDomain && !contact.templateName && (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 min-w-0">
                          {contact.marketingOptIn && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                              <Sparkles className="h-2.5 w-2.5" />
                              Opt-in
                            </span>
                          )}
                          {contact.tags.slice(0, 1).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-100 truncate max-w-full"
                            >
                              <Tag className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                              <span className="truncate">{tag}</span>
                            </span>
                          ))}
                          {contact.tags.length > 1 && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-slate-400">
                              +{contact.tags.length - 1}
                            </span>
                          )}
                          {contact.tags.length === 0 && !contact.marketingOptIn && (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold"
                          title={formatCapturedAt(contact.capturedAt)}
                        >
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate">{formatRelativeCaptured(contact.capturedAt)}</span>
                        </div>

                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(contact)}
                            className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-[#4F46E5] transition-colors"
                            title="Edit"
                            aria-label={`Edit ${contact.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(contact)}
                            className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete"
                            aria-label={`Delete ${contact.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
          </Workspace>
        )}
      </SectionCard>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 text-sm font-bold">
          {toast}
        </div>
      )}
    </PageShell>
  );
}
