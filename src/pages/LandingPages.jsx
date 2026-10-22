
import { useCallback, useEffect, useMemo, useState } from "react";
import { landingPageApi } from "../services/landingPageApi.js";

export default function LandingPages({ onCreate, onEdit }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  // Filter states
  const [search, setSearch] = useState("");
  const [sectionType, setSectionType] = useState("all");
  const [publishStatus, setPublishStatus] = useState("all");

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

  // Collect available section types dynamically
  const sectionTypes = useMemo(() => {
    const types = new Set();

    pages.forEach((page) => {
      if (Array.isArray(page.sections)) {
        page.sections.forEach((section) => {
          if (section?.type) {
            types.add(String(section.type).toLowerCase());
          }
        });
      }

      // Support pages that store type directly
      if (page.type) {
        types.add(String(page.type).toLowerCase());
      }
    });

    return [...types].sort();
  }, [pages]);

  // Filter pages
  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();

    return pages.filter((page) => {
      const matchesSearch =
        !query ||
        String(page.title || "").toLowerCase().includes(query) ||
        String(page.slug || "").toLowerCase().includes(query);

      const pageSections = Array.isArray(page.sections)
        ? page.sections
        : [];

      const pageTypes = [
        ...pageSections.map((section) =>
          String(section?.type || "").toLowerCase()
        ),
        ...(page.type ? [String(page.type).toLowerCase()] : []),
      ];

      const matchesSection =
        sectionType === "all" ||
        pageTypes.includes(sectionType);

      const status = String(page.status || "draft").toLowerCase();

      const matchesStatus =
        publishStatus === "all" ||
        (publishStatus === "published" && status === "published") ||
        (publishStatus === "unpublished" && status !== "published");

      return (
        matchesSearch &&
        matchesSection &&
        matchesStatus
      );
    });
  }, [pages, search, sectionType, publishStatus]);

  async function togglePublish(page) {
    const status =
      page.status === "published" ? "draft" : "published";

    setBusyId(page._id);
    setError("");

    try {
      await landingPageApi.setStatus(page._id, status);
      await loadPages();
    } catch (err) {
      setError(err.message || "Failed to update page status.");
    } finally {
      setBusyId("");
    }
  }

  async function deletePage(page) {
    if (!window.confirm(`Delete "${page.title}"?`)) return;

    setBusyId(page._id);
    setError("");

    try {
      await landingPageApi.remove(page._id);
      await loadPages();
    } catch (err) {
      setError(err.message || "Failed to delete landing page.");
    } finally {
      setBusyId("");
    }
  }

  function resetFilters() {
    setSearch("");
    setSectionType("all");
    setPublishStatus("all");
  }

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading landing pages...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Admin Dashboard
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Landing Pages
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create, edit and manage your campaign pages.
            </p>
          </div>

          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            + Create Landing Page
          </button>
        </header>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadPages();
              }}
              className="self-start font-semibold underline sm:self-auto"
            >
              Try again
            </button>
          </div>
        )}

        {/* Statistics */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Pages
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {pages.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-emerald-700">
              Published
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {pages.filter(
                (page) => page.status === "published"
              ).length}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-amber-700">
              Unpublished
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {pages.filter(
                (page) => page.status !== "published"
              ).length}
            </p>
          </div>
        </section>

        {/* FILTER SECTION */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Filter Landing Pages
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Filter by section type and publication status.
              </p>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 sm:self-auto"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Search */}
            <div>
              <label
                htmlFor="page-search"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search Page
              </label>

              <input
                id="page-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title or slug..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Section Type */}
            <div>
              <label
                htmlFor="section-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Section Type
              </label>

              <select
                id="section-filter"
                value={sectionType}
                onChange={(event) =>
                  setSectionType(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">All Section Types</option>

                {sectionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Publish Status */}
            <div>
              <label
                htmlFor="publish-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Publish Status
              </label>

              <select
                id="publish-filter"
                value={publishStatus}
                onChange={(event) =>
                  setPublishStatus(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-900">
                {filteredPages.length}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-900">
                {pages.length}
              </span>{" "}
              pages
            </p>

            {(search ||
              sectionType !== "all" ||
              publishStatus !== "all") && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Filters Active
              </span>
            )}
          </div>
        </section>

        {/* Landing Pages List */}
        {filteredPages.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
              📄
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              {pages.length === 0
                ? "No landing pages yet"
                : "No matching landing pages"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {pages.length === 0
                ? "Create your first campaign landing page to get started."
                : "Try changing your filters or search keywords."}
            </p>

            {pages.length === 0 ? (
              <button
                type="button"
                onClick={onCreate}
                className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create your first page
              </button>
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Clear Filters
              </button>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            {filteredPages.map((page) => (
              <article
                key={page._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="break-words text-lg font-bold text-slate-900">
                        {page.title}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          page.status === "published"
                            ? "bg-emerald-100 text-emerald-700"
                            : page.status === "archived"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {page.status || "draft"}
                      </span>
                    </div>

                    {/* Section Types */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        Sections:
                      </span>

                      {Array.isArray(page.sections) &&
                      page.sections.length > 0 ? (
                        page.sections.map((section, index) => (
                          <span
                            key={`${section.type || "section"}-${index}`}
                            className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
                          >
                            {section.type || "Untyped"}
                          </span>
                        ))
                      ) : page.type ? (
                        <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                          {page.type}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          No sections
                        </span>
                      )}
                    </div>

                    <p className="mt-3 break-all text-sm text-slate-500">
                      <span className="font-medium text-slate-700">
                        Slug:
                      </span>{" "}
                      /lp/{page.slug}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      Updated:{" "}
                      {page.updatedAt
                        ? new Date(page.updatedAt).toLocaleString()
                        : "Not available"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit?.(page._id)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Edit
                    </button>

                    {page.status === "published" && (
                      <a
                        href={`/lp/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        View ↗
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => togglePublish(page)}
                      disabled={busyId === page._id}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        page.status === "published"
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      }`}
                    >
                      {busyId === page._id
                        ? "Please wait..."
                        : page.status === "published"
                          ? "Unpublish"
                          : "Publish"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePage(page)}
                      disabled={busyId === page._id}
                      className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === page._id
                        ? "Please wait..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
