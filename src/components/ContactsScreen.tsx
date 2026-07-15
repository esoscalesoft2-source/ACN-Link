import React, { useMemo, useState } from "react";
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
  Users
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
      const matchesSearch =
        !query ||
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        contact.tags.some((tag) => tag.toLowerCase().includes(query));

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
        marketingOptIn: form.marketingOptIn
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

    const headers = "Name,Email,Phone,Source,Tags,CapturedAt,MarketingOptIn\n";
    const csv = rows
      .map((contact) =>
        [
          contact.name,
          contact.email,
          contact.phone,
          contact.source,
          contact.tags.join(";"),
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
        subtitle="Manage and export captured leads"
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
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl border border-gray-50 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 id="contact-modal-title" className="font-display font-bold text-lg text-gray-950">
                {editingContact ? "Edit Contact" : "Add New Contact"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Phone number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+1 555-0199"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Tag (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Newsletter, VIP"
                  value={form.tag}
                  onChange={(e) => setForm((prev) => ({ ...prev, tag: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.marketingOptIn}
                  onChange={(e) => setForm((prev) => ({ ...prev, marketingOptIn: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 accent-[#4F46E5]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Marketing opt-in (email / WhatsApp updates)
                </span>
              </label>

              {formError && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70 text-white rounded-xl text-sm font-semibold"
                >
                  {isSaving ? "Saving…" : editingContact ? "Save Changes" : "Save Lead"}
                </button>
              </div>
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
                Add your first lead manually, or capture contacts from Smart Forms on your Bio Pages.
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
            <div className="lg:hidden divide-y divide-gray-50">
              {filteredContacts.map((contact) => {
                const isUnmasked = !!unmaskedIds[contact.id];
                return (
                  <div key={contact.id} className="p-4 sm:p-8 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-gray-900 text-sm">{contact.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                          {isUnmasked ? contact.email : contact.maskedEmail}
                        </p>
                        <p className="text-xs text-gray-500 font-mono break-all">
                          {isUnmasked ? contact.phone : contact.maskedPhone}
                        </p>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-indigo-50/60 border border-indigo-100 text-[#4F46E5] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {contact.source}
                      </span>
                      {contact.marketingOptIn && (
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          Opt-in
                        </span>
                      )}
                      {contact.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-100"
                        >
                          <Tag className="h-2.5 w-2.5 text-slate-400" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Captured {formatCapturedAt(contact.capturedAt)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 bg-slate-50/50">
                    <th className="py-4 px-6 w-12">
                      <span className="sr-only">Reveal</span>
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Name
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Email
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Phone
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Source
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Tags
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Captured
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredContacts.map((contact) => {
                    const isUnmasked = !!unmaskedIds[contact.id];
                    return (
                      <tr key={contact.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-4.5 px-6">
                          <button
                            type="button"
                            onClick={() => toggleMask(contact.id)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                            title={isUnmasked ? "Mask credentials" : "Show credentials"}
                            aria-label={isUnmasked ? "Mask credentials" : "Show credentials"}
                          >
                            {isUnmasked ? (
                              <EyeOff className="h-4.5 w-4.5" />
                            ) : (
                              <Eye className="h-4.5 w-4.5" />
                            )}
                          </button>
                        </td>
                        <td className="py-4.5 px-6 font-display font-semibold text-gray-900 text-sm">
                          {contact.name}
                        </td>
                        <td className="py-4.5 px-6 text-sm text-gray-600 font-mono">
                          {isUnmasked ? contact.email : contact.maskedEmail}
                        </td>
                        <td className="py-4.5 px-6 text-sm text-gray-600 font-mono">
                          {isUnmasked ? contact.phone : contact.maskedPhone}
                        </td>
                        <td className="py-4.5 px-6">
                          <span className="inline-block bg-indigo-50/60 border border-indigo-100 text-[#4F46E5] text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                            {contact.source}
                          </span>
                        </td>
                        <td className="py-4.5 px-6">
                          <div className="flex flex-wrap gap-1">
                            {contact.marketingOptIn && (
                              <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-100">
                                Opt-in
                              </span>
                            )}
                            {contact.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-100"
                              >
                                <Tag className="h-2.5 w-2.5 text-slate-400" />
                                {tag}
                              </span>
                            ))}
                            {contact.tags.length === 0 && !contact.marketingOptIn && (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4.5 px-6 text-xs text-gray-400 font-mono font-medium">
                          {formatCapturedAt(contact.capturedAt)}
                        </td>
                        <td className="py-4.5 px-6">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
