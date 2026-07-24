import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { BioPage, CustomDomain } from "../../types";

export function matchesConnectPageSearch(page: BioPage, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [page.title, page.id, page.slug, page.status, page.handle || ""]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

interface SearchablePagePickerProps {
  pages: BioPage[];
  value: string;
  onChange: (pageId: string) => void;
  linkedDomainsByPageId: Map<string, CustomDomain>;
  /** Hostname being connected — page stays selectable if it only links this same host. */
  connectingHostname?: string;
  placeholder?: string;
  /** When set, manual selection calls this instead of applying `onChange` immediately. */
  onSelectAttempt?: (page: BioPage) => void;
}

function sameHostname(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export default function SearchablePagePicker({
  pages,
  value,
  onChange,
  linkedDomainsByPageId,
  connectingHostname = "",
  placeholder = "Choose your live page",
  onSelectAttempt
}: SearchablePagePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Connect Domain only offers published Live pages — never Draft (or Paused).
  const selectablePages = useMemo(
    () =>
      pages
        .filter((page) => page.status === "Live")
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })),
    [pages]
  );

  const filteredPages = useMemo(
    () => selectablePages.filter((page) => matchesConnectPageSearch(page, query)),
    [selectablePages, query]
  );

  const pageIsBlocked = (pageId: string) => {
    const linkedDomain = linkedDomainsByPageId.get(pageId);
    if (!linkedDomain) return false;
    if (connectingHostname && sameHostname(linkedDomain.domainName, connectingHostname)) {
      return false;
    }
    // Incomplete on another hostname is cleared on connect — only LIVE other domains lock the page.
    return linkedDomain.status === "Verified";
  };

  const availableCount = useMemo(
    () => selectablePages.filter((page) => !pageIsBlocked(page.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pageIsBlocked closes over map + hostname
    [selectablePages, linkedDomainsByPageId, connectingHostname]
  );

  const selectedPage = selectablePages.find((page) => page.id === value);

  const trySelectPage = (page: BioPage) => {
    const linkedDomain = linkedDomainsByPageId.get(page.id);
    if (linkedDomain && pageIsBlocked(page.id)) {
      window.alert(
        `"${page.title}" already opens ${linkedDomain.domainName}.\n\n` +
          `Each bio page can use only one custom domain.\n` +
          `Pick a different page, or remove ${linkedDomain.domainName} from Custom Domains first.`
      );
      return;
    }
    if (onSelectAttempt) {
      onSelectAttempt(page);
      setOpen(false);
      return;
    }
    onChange(page.id);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div className="acn-page-picker" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="acn-page-picker__trigger w-full text-left flex items-center justify-between gap-2"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`acn-page-picker__trigger-label truncate ${selectedPage ? "" : "is-placeholder"}`}>
          {selectedPage ? `${selectedPage.title} (${selectedPage.status})` : placeholder}
        </span>
        <ChevronDown
          className={`acn-page-picker__chevron h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="acn-page-picker__menu">
          <div className="acn-page-picker__search">
            <Search className="h-4 w-4 shrink-0" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search page name, ID, slug, or status…"
              className="acn-page-picker__search-input"
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
              }}
            />
          </div>

          <ul className="acn-page-picker__list" role="listbox">
            {filteredPages.length === 0 ? (
              <li className="acn-page-picker__empty">
                {selectablePages.length === 0
                  ? "No Live bio pages yet. Publish a page first, then connect a domain."
                  : "No pages match your search."}
              </li>
            ) : (
              filteredPages.map((page) => {
                const linkedDomain = linkedDomainsByPageId.get(page.id);
                const isLocked = pageIsBlocked(page.id);
                const sameHostResume =
                  Boolean(linkedDomain) &&
                  Boolean(connectingHostname) &&
                  sameHostname(linkedDomain!.domainName, connectingHostname);
                return (
                  <li key={page.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={page.id === value}
                      aria-disabled={isLocked}
                      className={`acn-page-picker__option ${
                        page.id === value ? "acn-page-picker__option--selected" : ""
                      } ${isLocked ? "acn-page-picker__option--locked" : ""}`}
                      onClick={() => trySelectPage(page)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="acn-page-picker__option-title block truncate">{page.title}</span>
                        {linkedDomain && isLocked ? (
                          <span className="acn-page-picker__option-linked block truncate">
                            Already used on {linkedDomain.domainName}
                          </span>
                        ) : sameHostResume ? (
                          <span className="acn-page-picker__option-linked block truncate">
                            Continue setup for {linkedDomain!.domainName}
                          </span>
                        ) : (
                          <span className="acn-page-picker__option-id block truncate">{page.id}</span>
                        )}
                      </span>
                      {isLocked ? (
                        <span className="acn-page-picker__status acn-page-picker__status--in-use">In use</span>
                      ) : (
                        <span
                          className={`acn-page-picker__status acn-page-picker__status--${page.status.toLowerCase()}`}
                        >
                          {page.status}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <p className="acn-page-picker__footer">
            {availableCount} available · Showing {filteredPages.length} of {selectablePages.length}{" "}
            Live pages
          </p>
        </div>
      )}
    </div>
  );
}
