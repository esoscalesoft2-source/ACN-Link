import React, { useState } from "react";
import { Contact } from "../types";
import {
  Download,
  Plus,
  Eye,
  EyeOff,
  Search,
  ChevronDown,
  X,
  Tag
} from "lucide-react";
import PageShell, { PageHeader, SectionCard, StatCard, StatCardGrid } from "./layout/PageShell";

interface ContactsScreenProps {
  contacts: Contact[];
  onAddContact: (contact: Omit<Contact, "id" | "maskedEmail" | "maskedPhone">) => void;
}

export default function ContactsScreen({ contacts, onAddContact }: ContactsScreenProps) {
  const [unmaskedIds, setUnmaskedIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All sources");
  const [tagFilter, setTagFilter] = useState("All tags");

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTag, setNewTag] = useState("");

  const toggleMask = (id: string) => {
    setUnmaskedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPhone) return;

    onAddContact({
      name: newName,
      email: newEmail,
      phone: newPhone,
      source: "MANUAL ENTRY",
      tags: newTag ? [newTag] : ["Manual Lead"],
      capturedAt: "7 Jul 2026"
    });

    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewTag("");
    setIsAdding(false);
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource =
      sourceFilter === "All sources" || contact.source === sourceFilter;

    const matchesTag =
      tagFilter === "All tags" || contact.tags.includes(tagFilter);

    return matchesSearch && matchesSource && matchesTag;
  });

  const triggerExport = () => {
    const headers = "Name,Email,Phone,Source,Tags,CapturedAt\n";
    const rows = contacts
      .map(
        (c) =>
          `"${c.name}","${c.email}","${c.phone}","${c.source}","${c.tags.join(";")}","${c.capturedAt}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "acnlink_contacts.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderContactRow = (contact: Contact, isUnmasked: boolean) => (
    <tr key={contact.id} className="hover:bg-slate-50/40 transition-colors">
      <td className="py-4.5 px-6">
        <button
          onClick={() => toggleMask(contact.id)}
          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
          title={isUnmasked ? "Mask Credentials" : "Show Credentials"}
        >
          {isUnmasked ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </td>
      <td className="py-4.5 px-6 font-display font-semibold text-gray-900 text-sm">{contact.name}</td>
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
        {contact.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-100 mr-1"
          >
            <Tag className="h-2.5 w-2.5 text-slate-400" />
            {tag}
          </span>
        ))}
        {contact.tags.length === 0 && <span className="text-gray-300 text-xs">-</span>}
      </td>
      <td className="py-4.5 px-6 text-xs text-gray-400 font-mono font-medium">{contact.capturedAt}</td>
    </tr>
  );

  return (
    <PageShell>
      <PageHeader
        title="Contacts"
        subtitle="Manage and export captured leads"
        actions={
          <>
            <button
              onClick={triggerExport}
              className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors bg-white shadow-sm"
            >
              <Download className="h-4.5 w-4.5 text-gray-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md shadow-indigo-100 transition-all active:scale-95"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Add Contact</span>
            </button>
          </>
        }
      />

      {isAdding && (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-gray-950">Add New Contact</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  PHONE NUMBER
                </label>
                <input
                  type="text"
                  required
                  placeholder="+1 555-0199"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  TAG (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Newsletter, VIP"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm text-gray-900 focus:outline-none"
                />
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
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-sm font-semibold"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StatCardGrid>
        {[
          { label: "TOTAL", value: contacts.length, sub: "all-time" },
          { label: "LAST 7 DAYS", value: contacts.length, sub: "new contacts" },
          { label: "LAST 30 DAYS", value: contacts.length, sub: "new contacts" },
          { label: "MARKETING OPT-INS", value: 0, sub: "consented" }
        ].map((stat, idx) => (
          <StatCard key={idx} label={stat.label} value={stat.value} sub={stat.sub} />
        ))}
      </StatCardGrid>

      <SectionCard className="flex flex-col">
        <div className="p-4 sm:p-5 border-b border-gray-50 flex flex-col gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none appearance-none pr-8 cursor-pointer shadow-sm hover:bg-gray-50"
              >
                <option value="All sources">All sources</option>
                <option value="SMART FORM">SMART FORM</option>
                <option value="MANUAL ENTRY">MANUAL ENTRY</option>
              </select>
              <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative flex-1">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none appearance-none pr-8 cursor-pointer shadow-sm hover:bg-gray-50"
              >
                <option value="All tags">All tags</option>
                <option value="Form Lead">Form Lead</option>
                <option value="Employee">Employee</option>
                <option value="Partner">Partner</option>
                <option value="Manual Lead">Manual Lead</option>
              </select>
              <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="py-12 px-6 text-center text-gray-400 text-sm">
            No contacts found matching the selected filters.
          </div>
        ) : (
          <>
            <div className="lg:hidden divide-y divide-gray-50">
              {filteredContacts.map((contact) => {
                const isUnmasked = !!unmaskedIds[contact.id];
                return (
                  <div key={contact.id} className="p-4 sm:p-5 space-y-3">
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
                      <button
                        onClick={() => toggleMask(contact.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 shrink-0"
                        title={isUnmasked ? "Mask Credentials" : "Show Credentials"}
                      >
                        {isUnmasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-indigo-50/60 border border-indigo-100 text-[#4F46E5] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {contact.source}
                      </span>
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
                    <p className="text-[11px] text-gray-400 font-mono">Captured {contact.capturedAt}</p>
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 bg-slate-50/50">
                    <th className="py-4 px-6 w-12">
                      <span className="sr-only">Actions</span>
                    </th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">NAME</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">EMAIL</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">PHONE</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">SOURCE</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">TAGS</th>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">CAPTURED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredContacts.map((contact) =>
                    renderContactRow(contact, !!unmaskedIds[contact.id])
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>
    </PageShell>
  );
}
