import type { Contact } from "../types";

export const CONTACT_CAPTURE_STORAGE_KEY = "acn_lead_capture_ping";
export const CONTACTS_STORAGE_KEY = "acnlink_contacts";

/** Notify dashboard tabs that a bio-page lead was saved (same browser). */
export function broadcastLeadCaptured(contact: Contact) {
  try {
    localStorage.setItem(
      CONTACT_CAPTURE_STORAGE_KEY,
      JSON.stringify({ contact, at: Date.now() })
    );
  } catch {
    /* ignore quota / private mode */
  }

  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    const list: Contact[] = raw ? JSON.parse(raw) : [];
    const merged = upsertLocalContact(Array.isArray(list) ? list : [], contact);
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }

  window.dispatchEvent(new CustomEvent("acn-contacts-updated", { detail: { contact } }));
}

export function upsertLocalContact(contacts: Contact[], contact: Contact): Contact[] {
  const emailKey = (contact.email || "").trim().toLowerCase();
  const index = contacts.findIndex((row) => {
    if (row.id === contact.id) return true;
    if (!emailKey || emailKey.endsWith("@unknown.local")) return false;
    return row.email.trim().toLowerCase() === emailKey;
  });

  if (index >= 0) {
    const prev = contacts[index];
    const next = [...contacts];
    next[index] = {
      ...prev,
      ...contact,
      id: prev.id,
      capturedAt: prev.capturedAt || contact.capturedAt,
      tags: Array.from(new Set([...(prev.tags || []), ...(contact.tags || [])].filter(Boolean))),
      formFields: contact.formFields?.length ? contact.formFields : prev.formFields,
      notes: contact.notes || prev.notes,
      pageId: contact.pageId || prev.pageId,
      pageTitle: contact.pageTitle || prev.pageTitle,
      blockId: contact.blockId || prev.blockId,
      blockLabel: contact.blockLabel || prev.blockLabel,
      sourceDomain: contact.sourceDomain || prev.sourceDomain,
      templateId: contact.templateId || prev.templateId,
      templateName: contact.templateName || prev.templateName,
      pageSlug: contact.pageSlug || prev.pageSlug
    };
    return next;
  }

  return [contact, ...contacts];
}
