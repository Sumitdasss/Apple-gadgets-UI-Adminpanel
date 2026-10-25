import { useCallback, useEffect, useMemo, useState } from "react";
import { landingPageApi } from "../services/landingPageApi.js";

/* ============================================================
   Constants & helpers
============================================================ */

const STOREFRONT_URL = "https://apple-gadgets-ui.vercel.app";

const STATUS_STYLES = {
  published: {
    label: "Published",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  draft: {
    label: "Draft",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  archived: {
    label: "Archived",
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
  },
};

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: "100%" },
  { id: "tablet", label: "Tablet", width: "768px" },
  { id: "mobile", label: "Mobile", width: "390px" },
];

const INITIAL_FILTERS = { search: "", sectionType: "all", publishStatus: "all" };

const getPreviewUrl = (page) =>
  `${STOREFRONT_URL}/lp/${encodeURIComponent(page.slug || "")}`;

const getStatus = (page) => page.status || "draft";

const isPublished = (page) => getStatus(page) === "published";

/** All unique, lower-cased section types of a page (including `page.type`). */
function getPageTypes(page) {
  const types = new Set();

  if (Array.isArray(page.sections)) {
    page.sections.forEach((section) => {
      if (section?.type) types.add(String(section.type).toLowerCase());
    });
  }

  if (page.type) types.add(String(page.type).toLowerCase());

  return [...types];
}

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not available";

/* ============================================================
   Small UI pieces
============================================================ */

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

function Spinner({ className = "h-10 w-10" }) {
  return (
    <div
      className={`${className} animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600`}
    />
  );
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Field({ id, label, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="self-start font-semibold underline underline-offset-2 sm:self-auto"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({ hasPages, onCreate, onReset }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
        📄
      </div>

      <h2 className="mt-4 text-lg font-bold text-slate-900">
        {hasPages ? "No matching landing pages" : "No landing pages yet"}
      </h2>

      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        {hasPages
          ? "Try changing your filters or search keywords."
          : "Create your first campaign landing page to get started."}
      </p>

      <button
        type="button"
        onClick={hasPages ? onReset : onCreate}
        className={`${buttonBase} mt-6 bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700`}
      >
        {hasPages ? "Clear Filters" : "Create your first page"}
      </button>
    </section>
  );
}

/* ============================================================
   Page card
============================================================ */

function SectionChips({ page }) {
  const sections = Array.isArray(page.sections) ? page.sections : [];

  if (sections.length > 0) {
    return sections.map((section, index) => (
      <span
        key={`${section.type || "section"}-${index}`}
        className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
      >
        {section.type || "Untyped"}
      </span>
    ));
  }

  if (page.type) {
    return (
      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
        {page.type}
      </span>
    );
  }

  return <span className="text-xs text-slate-400">No sections</span>;
}

function PageCard({ page, busy, onEdit, onView, onTogglePublish, onDelete }) {
  const published = isPublished(page);

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="break-words text-lg font-bold text-slate-900">
              {page.title}
            </h2>
            <StatusBadge status={getStatus(page)} />
          </div>

          <p className="mt-2 break-all font-mono text-sm text-slate-500">
            /lp/{page.slug}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold text-slate-500">
              Sections
            </span>
            <SectionChips page={page} />
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Updated {formatDate(page.updatedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(page._id)}
            className={`${buttonBase} border border-slate-200 text-slate-700 hover:bg-slate-50`}
          >
            Edit
          </button>

          {published && (
            <button
              type="button"
              onClick={() => onView(page)}
              className={`${buttonBase} border border-indigo-200 text-indigo-700 hover:bg-indigo-50`}
            >
              View ↗
            </button>
          )}

          <button
            type="button"
            onClick={() => onTogglePublish(page)}
            disabled={busy}
            className={`${buttonBase} ${
              published
                ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            {busy ? "Please wait..." : published ? "Unpublish" : "Publish"}
          </button>

          <button
            type="button"
            onClick={() => onDelete(page)}
            disabled={busy}
            className={`${buttonBase} bg-red-50 text-red-700 hover:bg-red-100`}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   Preview modal
============================================================ */

function PreviewModal({ page, onClose }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [viewport, setViewport] = useState("desktop");

  const url = getPreviewUrl(page);
  const width = VIEWPORTS.find((v) => v.id === viewport)?.width ?? "100%";

  // Close on Escape + lock background scroll
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Landing page preview"
        className="flex h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
              {page.title || "Landing Page Preview"}
            </h2>
            <p className="truncate font-mono text-xs text-slate-500">
              /lp/{page.slug}
            </p>
          </div>

          {/* Device switcher */}
          <div
            role="group"
            aria-label="Preview size"
            className="hidden rounded-lg bg-slate-100 p-1 md:flex"
          >
            {VIEWPORTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewport(v.id)}
                aria-pressed={viewport === v.id}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  viewport === v.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonBase} hidden border border-slate-200 text-slate-700 hover:bg-slate-50 sm:inline-flex`}
            >
              Open in New Tab ↗
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-2xl leading-none text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="relative flex min-h-0 flex-1 justify-center bg-slate-100">
          {loading && !failed && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
              <div className="text-center">
                <Spinner />
                <p className="mt-3 text-sm text-slate-500">
                  Loading preview...
                </p>
              </div>
            </div>
          )}

          {failed && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white p-6">
              <div className="max-w-md text-center">
                <h3 className="text-lg font-bold text-slate-900">
                  Preview could not be displayed
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Check the storefront route or open the page in a new tab.
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonBase} mt-4 bg-indigo-600 px-5 py-2.5 text-white hover:bg-indigo-700`}
                >
                  Open Landing Page
                </a>
              </div>
            </div>
          )}

          <iframe
            key={page._id}
            src={url}
            title={`${page.title || "Landing Page"} Preview`}
            style={{ width }}
            className="h-full max-w-full border-0 bg-white transition-[width] duration-300"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => {
              setLoading(false);
              setFailed(false);
            }}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   Main component
============================================================ */

export default function LandingPages({ onCreate, onEdit }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [previewPage, setPreviewPage] = useState(null);

  const { search, sectionType, publishStatus } = filters;
  const updateFilter = (key) => (event) =>
    setFilters((prev) => ({ ...prev, [key]: event.target.value }));
  const resetFilters = () => setFilters(INITIAL_FILTERS);
  const closePreview = useCallback(() => setPreviewPage(null), []);

  /* ---------- Data ---------- */

  const loadPages = useCallback(async () => {
    try {
      setError("");
      const result = await landingPageApi.getAll();
      setPages(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err.message || "Failed to load landing pages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  /** Runs an async action for one page with shared busy/error handling. */
  async function runAction(page, action, fallbackMessage) {
    setBusyId(page._id);
    setError("");

    try {
      await action();
      await loadPages();
    } catch (err) {
      setError(err.message || fallbackMessage);
    } finally {
      setBusyId("");
    }
  }

  const togglePublish = (page) =>
    runAction(
      page,
      () =>
        landingPageApi.setStatus(
          page._id,
          isPublished(page) ? "draft" : "published"
        ),
      "Failed to update page status."
    );

  const deletePage = (page) => {
    if (!window.confirm(`Delete "${page.title}"?`)) return;

    return runAction(
      page,
      async () => {
        await landingPageApi.remove(page._id);
        if (previewPage?._id === page._id) closePreview();
      },
      "Failed to delete landing page."
    );
  };

  const retry = () => {
    setLoading(true);
    loadPages();
  };

  /* ---------- Derived data ---------- */

  const sectionTypes = useMemo(
    () => [...new Set(pages.flatMap(getPageTypes))].sort(),
    [pages]
  );

  const stats = useMemo(() => {
    const published = pages.filter(isPublished).length;
    return {
      total: pages.length,
      published,
      unpublished: pages.length - published,
    };
  }, [pages]);

  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();

    return pages.filter((page) => {
      const matchesSearch =
        !query ||
        String(page.title || "").toLowerCase().includes(query) ||
        String(page.slug || "").toLowerCase().includes(query);

      const matchesSection =
        sectionType === "all" || getPageTypes(page).includes(sectionType);

      const matchesStatus =
        publishStatus === "all" ||
        (publishStatus === "published") === isPublished(page);

      return matchesSearch && matchesSection && matchesStatus;
    });
  }, [pages, search, sectionType, publishStatus]);

  const filtersActive =
    search || sectionType !== "all" || publishStatus !== "all";

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading landing pages...
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">
                Admin Dashboard
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Landing Pages
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Create, edit and manage your campaign pages.
              </p>
            </div>

            <button
              type="button"
              onClick={onCreate}
              className={`${buttonBase} bg-indigo-600 px-5 py-3 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700`}
            >
              + Create Landing Page
            </button>
          </header>

          {error && <ErrorBanner message={error} onRetry={retry} />}

          {/* Stats */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Pages"
              value={stats.total}
              accent="bg-indigo-500"
            />
            <StatCard
              label="Published"
              value={stats.published}
              accent="bg-emerald-500"
            />
            <StatCard
              label="Unpublished"
              value={stats.unpublished}
              accent="bg-amber-500"
            />
          </section>

          {/* Filters */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
              <Field id="page-search" label="Search">
                <input
                  id="page-search"
                  type="search"
                  value={search}
                  onChange={updateFilter("search")}
                  placeholder="Search title or slug..."
                  className={inputBase}
                />
              </Field>

              <Field id="section-filter" label="Section Type">
                <select
                  id="section-filter"
                  value={sectionType}
                  onChange={updateFilter("sectionType")}
                  className={inputBase}
                >
                  <option value="all">All Types</option>
                  {sectionTypes.map((type) => (
                    <option key={type} value={type}>
                      {capitalize(type)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="publish-filter" label="Status">
                <select
                  id="publish-filter"
                  value={publishStatus}
                  onChange={updateFilter("publishStatus")}
                  className={inputBase}
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
                </select>
              </Field>

              <button
                type="button"
                onClick={resetFilters}
                disabled={!filtersActive}
                className={`${buttonBase} border border-slate-200 py-2.5 text-slate-600 hover:bg-slate-50`}
              >
                Reset
              </button>
            </div>

            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-900">
                {filteredPages.length}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-900">{pages.length}</span>{" "}
              pages
            </p>
          </section>

          {/* List */}
          {filteredPages.length === 0 ? (
            <EmptyState
              hasPages={pages.length > 0}
              onCreate={onCreate}
              onReset={resetFilters}
            />
          ) : (
            <section className="space-y-4">
              {filteredPages.map((page) => (
                <PageCard
                  key={page._id}
                  page={page}
                  busy={busyId === page._id}
                  onEdit={onEdit}
                  onView={setPreviewPage}
                  onTogglePublish={togglePublish}
                  onDelete={deletePage}
                />
              ))}
            </section>
          )}
        </div>
      </main>

      {previewPage && (
        <PreviewModal page={previewPage} onClose={closePreview} />
      )}
    </>
  );
}
