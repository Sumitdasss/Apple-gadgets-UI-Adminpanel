import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { landingPageApi } from "../services/landingPageApi.js";

const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";

const normalizeSlug = (value = "") => {
  let text = String(value).trim();
  try {
    text = decodeURIComponent(text);
  } catch {
    // ignore
  }
  return text
    .replace(/%/g, " percent ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const SECTION_TYPES = [
  "hero",
  "banner",
  "products",
  "features",
  "cta",
  "testimonials",
  "offers",
];

const createEmptySection = (type) => ({
  type,
  title: "",
  subtitle: "",
  description: "",
  image: "",
  buttonText: "",
  buttonLink: "",
  productIds: [],
  features: [],
  banners: [],
  offers: [],
});

const emptyOffer = () => ({
  title: "",
  image: "",
  link: "",
  alt: "",
  endDate: "",
  buttonText: "View Details",
  productIds: [],
  selectedProducts: [],
});

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

const labelClass = "block text-sm font-semibold text-slate-700";

function getProductImage(product) {
  if (Array.isArray(product?.images) && product.images.length) {
    const first = product.images[0];
    if (typeof first === "string") return first;
    return first?.url || first?.secure_url || "";
  }
  if (typeof product?.image === "string" && product.image) {
    return product.image;
  }
  return "";
}

export default function EditLandingPage({ pageId, onCancel, onSuccess }) {
  const params = useParams();
  const [selectedSectionType, setSelectedSectionType] = useState("hero");
  const id = pageId || params.id;

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    status: "draft",
    sections: [],
    seo: {
      metaTitle: "",
      metaDescription: "",
      ogImage: "",
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Product search per section+offer: key = `${sectionIndex}-${offerIndex}`
  const [searchQuery, setSearchQuery] = useState({});
  const [searchResults, setSearchResults] = useState({});
  const [searchLoading, setSearchLoading] = useState({});
  const searchTimeout = useRef({});

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      if (!id) {
        setError("Landing page ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await landingPageApi.getById(id);
        if (cancelled) return;

        const page = result?.data;
        if (!page) throw new Error("Landing page not found.");

        setForm({
          title: page.title || "",
          slug: page.slug || "",
          description: page.description || "",
          status: page.status || "draft",

          sections: (page.sections || []).map((section) => ({
            ...section,
            features: Array.isArray(section.features) ? section.features : [],
            banners: Array.isArray(section.banners)
              ? section.banners.map((banner) => ({
                  image: banner.image || "",
                  link: banner.link || "",
                  alt: banner.alt || "",
                }))
              : [],
            offers: Array.isArray(section.offers)
              ? section.offers.map((offer) => {
                  const ids = (offer.productIds || [])
                    .map((p) => (typeof p === "string" ? p : p?._id))
                    .filter(Boolean);

                  // যদি backend populate করে থাকে
                  const selectedProducts = (offer.productIds || [])
                    .map((p) => {
                      if (typeof p === "string") {
                        return { _id: p, name: p, image: "" };
                      }
                      return {
                        _id: p?._id || "",
                        name: p?.name || p?.title || "Product",
                        image: getProductImage(p),
                      };
                    })
                    .filter((p) => p._id);

                  return {
                    title: offer.title || "",
                    image: offer.image || "",
                    link: offer.link || "",
                    alt: offer.alt || "",
                    endDate: offer.endDate
                      ? new Date(offer.endDate).toISOString().slice(0, 16)
                      : "",
                    buttonText: offer.buttonText || "View Details",
                    productIds: ids,
                    selectedProducts,
                  };
                })
              : [],
            productIds: (section.productIds || [])
              .map((product) =>
                typeof product === "string" ? product : product?._id
              )
              .filter(Boolean),
          })),

          seo: {
            metaTitle: page.seo?.metaTitle || "",
            metaDescription: page.seo?.metaDescription || "",
            ogImage: page.seo?.ogImage || "",
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load landing page.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPage();
    return () => {
      cancelled = true;
      Object.values(searchTimeout.current).forEach((t) => clearTimeout(t));
    };
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === "title") {
        return { ...prev, title: value, slug: normalizeSlug(value) };
      }
      if (name === "slug") {
        return { ...prev, slug: normalizeSlug(value) };
      }
      return { ...prev, [name]: value };
    });
    setSuccess("");
  }

  function handleSeoChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      seo: { ...prev.seo, [name]: value },
    }));
    setSuccess("");
  }

  function updateSection(index, field, value) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section
      ),
    }));
    setSuccess("");
  }

  function addSection(type) {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, createEmptySection(type)],
    }));
    setSuccess("");
  }

  function removeSection(index) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
    setSuccess("");
  }

  function moveSection(index, direction) {
    setForm((prev) => {
      const sections = [...prev.sections];
      const target = index + direction;
      if (target < 0 || target >= sections.length) return prev;
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...prev, sections };
    });
    setSuccess("");
  }

  // ===================== BANNER =====================
  function updateSectionBanner(sectionIndex, bannerIndex, field, value) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) => {
        if (i !== sectionIndex) return section;
        const banners = [...(section.banners || [])];
        banners[bannerIndex] = { ...banners[bannerIndex], [field]: value };
        return { ...section, banners };
      }),
    }));
    setSuccess("");
  }

  function addSectionBanner(sectionIndex) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              banners: [
                ...(section.banners || []),
                { image: "", link: "", alt: "" },
              ],
            }
          : section
      ),
    }));
    setSuccess("");
  }

  function removeSectionBanner(sectionIndex, bannerIndex) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              banners: (section.banners || []).filter(
                (_, j) => j !== bannerIndex
              ),
            }
          : section
      ),
    }));
    setSuccess("");
  }

  // ===================== OFFER =====================
  function updateSectionOffer(sectionIndex, offerIndex, field, value) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) => {
        if (i !== sectionIndex) return section;
        const offers = [...(section.offers || [])];
        offers[offerIndex] = { ...offers[offerIndex], [field]: value };
        return { ...section, offers };
      }),
    }));
    setSuccess("");
  }

  function addSectionOffer(sectionIndex) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              offers: [...(section.offers || []), emptyOffer()],
            }
          : section
      ),
    }));
    setSuccess("");
  }

  function removeSectionOffer(sectionIndex, offerIndex) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              offers: (section.offers || []).filter((_, j) => j !== offerIndex),
            }
          : section
      ),
    }));
    setSuccess("");
  }

  // ===================== PRODUCT SEARCH =====================
  function searchKey(sectionIndex, offerIndex) {
    return `${sectionIndex}-${offerIndex}`;
  }

  function searchProducts(sectionIndex, offerIndex, query) {
    const key = searchKey(sectionIndex, offerIndex);
    setSearchQuery((prev) => ({ ...prev, [key]: query }));

    if (searchTimeout.current[key]) {
      clearTimeout(searchTimeout.current[key]);
    }

    if (!query || query.trim().length < 2) {
      setSearchResults((prev) => ({ ...prev, [key]: [] }));
      return;
    }

    searchTimeout.current[key] = setTimeout(async () => {
      try {
        setSearchLoading((prev) => ({ ...prev, [key]: true }));

        const response = await fetch(
          `${API_BASE}/api/dashboard/products?search=${encodeURIComponent(
            query.trim()
          )}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load products");
        }

        const productList = Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
            ? data.products
            : Array.isArray(data?.data)
              ? data.data
              : [];

        const keyword = query.trim().toLowerCase();
        const filtered = productList.filter((p) =>
          String(p?.name || "")
            .toLowerCase()
            .includes(keyword)
        );

        setSearchResults((prev) => ({ ...prev, [key]: filtered }));
      } catch (err) {
        console.error("Product search error:", err);
        setSearchResults((prev) => ({ ...prev, [key]: [] }));
      } finally {
        setSearchLoading((prev) => ({ ...prev, [key]: false }));
      }
    }, 350);
  }

  function selectProduct(sectionIndex, offerIndex, product) {
    const productId = String(product._id || product.id || "");
    if (!productId) return;

    const key = searchKey(sectionIndex, offerIndex);

    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) => {
        if (i !== sectionIndex) return section;
        const offers = [...(section.offers || [])];
        const offer = { ...offers[offerIndex] };

        if ((offer.productIds || []).includes(productId)) return section;

        offer.productIds = [...(offer.productIds || []), productId];
        offer.selectedProducts = [
          ...(offer.selectedProducts || []),
          {
            _id: productId,
            name: product.name || product.title || "Product",
            image: getProductImage(product),
          },
        ];
        offers[offerIndex] = offer;
        return { ...section, offers };
      }),
    }));

    setSearchQuery((prev) => ({ ...prev, [key]: "" }));
    setSearchResults((prev) => ({ ...prev, [key]: [] }));
    setSuccess("");
  }

  function removeSelectedProduct(sectionIndex, offerIndex, productId) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) => {
        if (i !== sectionIndex) return section;
        const offers = [...(section.offers || [])];
        const offer = { ...offers[offerIndex] };
        offer.productIds = (offer.productIds || []).filter(
          (id) => id !== productId
        );
        offer.selectedProducts = (offer.selectedProducts || []).filter(
          (p) => p._id !== productId
        );
        offers[offerIndex] = offer;
        return { ...section, offers };
      }),
    }));
    setSuccess("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!id) {
      setError("Landing page ID is missing.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        slug: normalizeSlug(form.slug),
        description: form.description,
        status: form.status,
        seo: form.seo,
        sections: form.sections.map((section) => ({
          ...section,
          productIds: (section.productIds || [])
            .map((p) => (typeof p === "string" ? p : p?._id))
            .filter(Boolean),
          features: section.features || [],
          banners: (section.banners || []).map(({ image, link, alt }) => ({
            image: (image || "").trim(),
            link: (link || "").trim(),
            alt: (alt || "").trim(),
          })),
          offers: (section.offers || []).map((offer) => ({
            title: (offer.title || "").trim(),
            image: (offer.image || "").trim(),
            link: (offer.link || "").trim(),
            alt: (offer.alt || "").trim(),
            endDate: offer.endDate || undefined,
            buttonText: (offer.buttonText || "View Details").trim(),
            productIds: offer.productIds || [],
          })),
        })),
      };

      await landingPageApi.update(id, payload);
      setSuccess("Landing page updated successfully.");

      if (typeof onSuccess === "function") onSuccess();
      else window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Failed to update landing page.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (typeof onCancel === "function") onCancel();
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading landing page...
          </p>
        </div>
      </main>
    );
  }

  if (error && !form.title) {
    return (
      <main className="min-h-[60vh] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="text-3xl">⚠️</div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Unable to load landing page
          </h2>
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
          <button
            type="button"
            onClick={handleCancel}
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            ← Back to Landing Pages
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Admin Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Edit Landing Page
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Update your page content, sections and SEO settings.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            ← Back to Pages
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              Basic Information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your title, URL and publication status.
            </p>
            <div className="mt-6 space-y-5">
              <label className={labelClass}>
                Page Title *
                <input
                  className={inputClass}
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </label>
              <label className={labelClass}>
                URL Slug *
                <input
                  className={inputClass}
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  required
                />
                <span className="mt-2 block text-xs font-normal text-slate-500">
                  Public URL: /lp/{form.slug || "your-page-slug"}
                </span>
              </label>
              <label className={labelClass}>
                Description
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                />
              </label>
              <label className={labelClass}>
                Publication Status
                <select
                  className={inputClass}
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>
          </section>

          {/* Page sections */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Page Sections
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add, edit, remove and reorder your sections.
                </p>
              </div>
              <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                {form.sections.length} sections
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className={labelClass + " flex-1"}>
                Select Section Type
                <select
                  className={inputClass}
                  value={selectedSectionType}
                  onChange={(e) => setSelectedSectionType(e.target.value)}
                >
                  {SECTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => addSection(selectedSectionType)}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                + Add Section
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {form.sections.map((section, index) => (
                <article
                  key={section._id || `section-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6"
                >
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-bold capitalize text-slate-900">
                          {section.type} Section
                        </h3>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveSection(index, -1)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === form.sections.length - 1}
                        onClick={() => moveSection(index, 1)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSection(index)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className={labelClass}>
                      Section Title
                      <input
                        className={inputClass}
                        value={section.title || ""}
                        onChange={(e) =>
                          updateSection(index, "title", e.target.value)
                        }
                      />
                    </label>

                    <label className={labelClass}>
                      Description
                      <textarea
                        className={inputClass}
                        value={section.description || ""}
                        onChange={(e) =>
                          updateSection(index, "description", e.target.value)
                        }
                        rows={3}
                      />
                    </label>

                    {section.type === "hero" && (
                      <label className={labelClass}>
                        Subtitle
                        <textarea
                          className={inputClass}
                          value={section.subtitle || ""}
                          onChange={(e) =>
                            updateSection(index, "subtitle", e.target.value)
                          }
                          rows={2}
                        />
                      </label>
                    )}

                    {["hero", "banner"].includes(section.type) && (
                      <>
                        <label className={labelClass}>
                          Image URL
                          <input
                            type="url"
                            className={inputClass}
                            value={section.image || ""}
                            onChange={(e) =>
                              updateSection(index, "image", e.target.value)
                            }
                          />
                        </label>
                        {section.image && (
                          <img
                            src={section.image}
                            alt="preview"
                            className="max-h-64 w-full rounded-xl border object-contain p-2"
                          />
                        )}
                      </>
                    )}

                    {/* BANNER ITEMS */}
                    {section.type === "banner" && (
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-800">
                            Banner items
                          </h4>
                          <button
                            type="button"
                            onClick={() => addSectionBanner(index)}
                            className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700"
                          >
                            + Add banner
                          </button>
                        </div>
                        {(section.banners || []).map((banner, bannerIndex) => (
                          <div
                            key={bannerIndex}
                            className="mt-4 space-y-3 rounded-xl border p-4"
                          >
                            <div className="flex justify-between">
                              <p className="font-semibold">
                                Banner {bannerIndex + 1}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  removeSectionBanner(index, bannerIndex)
                                }
                                className="text-sm font-semibold text-red-600"
                              >
                                Remove
                              </button>
                            </div>
                            <label className={labelClass}>
                              Image URL
                              <input
                                type="url"
                                className={inputClass}
                                value={banner.image || ""}
                                onChange={(e) =>
                                  updateSectionBanner(
                                    index,
                                    bannerIndex,
                                    "image",
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                            <label className={labelClass}>
                              Click Link
                              <input
                                className={inputClass}
                                value={banner.link || ""}
                                onChange={(e) =>
                                  updateSectionBanner(
                                    index,
                                    bannerIndex,
                                    "link",
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                            <label className={labelClass}>
                              Alt Text
                              <input
                                className={inputClass}
                                value={banner.alt || ""}
                                onChange={(e) =>
                                  updateSectionBanner(
                                    index,
                                    bannerIndex,
                                    "alt",
                                    e.target.value
                                  )
                                }
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ================= OFFERS + PRODUCT SEARCH ================= */}
                    {section.type === "offers" && (
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-800">
                            Offer Cards
                          </h4>
                          <button
                            type="button"
                            onClick={() => addSectionOffer(index)}
                            className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700"
                          >
                            + Add Offer
                          </button>
                        </div>

                        {(section.offers || []).map((offer, offerIndex) => {
                          const key = searchKey(index, offerIndex);
                          return (
                            <div
                              key={offerIndex}
                              className="mt-4 space-y-3 rounded-xl border p-4"
                            >
                              <div className="flex justify-between">
                                <p className="font-semibold">
                                  Offer {offerIndex + 1}
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeSectionOffer(index, offerIndex)
                                  }
                                  className="text-sm font-semibold text-red-600"
                                >
                                  Remove
                                </button>
                              </div>

                              <label className={labelClass}>
                                Offer Title
                                <input
                                  className={inputClass}
                                  value={offer.title || ""}
                                  onChange={(e) =>
                                    updateSectionOffer(
                                      index,
                                      offerIndex,
                                      "title",
                                      e.target.value
                                    )
                                  }
                                />
                              </label>

                              <label className={labelClass}>
                                Image URL
                                <input
                                  type="url"
                                  className={inputClass}
                                  value={offer.image || ""}
                                  onChange={(e) =>
                                    updateSectionOffer(
                                      index,
                                      offerIndex,
                                      "image",
                                      e.target.value
                                    )
                                  }
                                />
                              </label>

                              <label className={labelClass}>
                                Click / View Details Link
                                <input
                                  className={inputClass}
                                  value={offer.link || ""}
                                  onChange={(e) =>
                                    updateSectionOffer(
                                      index,
                                      offerIndex,
                                      "link",
                                      e.target.value
                                    )
                                  }
                                  placeholder="/offerDetails/iphone-18-emi"
                                />
                              </label>

                              <label className={labelClass}>
                                Alt Text
                                <input
                                  className={inputClass}
                                  value={offer.alt || ""}
                                  onChange={(e) =>
                                    updateSectionOffer(
                                      index,
                                      offerIndex,
                                      "alt",
                                      e.target.value
                                    )
                                  }
                                />
                              </label>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <label className={labelClass}>
                                  Countdown End Date
                                  <input
                                    type="datetime-local"
                                    className={inputClass}
                                    value={offer.endDate || ""}
                                    onChange={(e) =>
                                      updateSectionOffer(
                                        index,
                                        offerIndex,
                                        "endDate",
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                                <label className={labelClass}>
                                  Button Text
                                  <input
                                    className={inputClass}
                                    value={offer.buttonText || ""}
                                    onChange={(e) =>
                                      updateSectionOffer(
                                        index,
                                        offerIndex,
                                        "buttonText",
                                        e.target.value
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              {/* PRODUCT SEARCH */}
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="mb-2 text-sm font-semibold text-slate-700">
                                  Related Products
                                </p>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={searchQuery[key] || ""}
                                    onChange={(e) =>
                                      searchProducts(
                                        index,
                                        offerIndex,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Search product by name..."
                                    className={inputClass}
                                    autoComplete="off"
                                  />
                                  {searchLoading[key] && (
                                    <p className="mt-2 text-xs text-slate-500">
                                      Searching...
                                    </p>
                                  )}
                                  {(searchResults[key] || []).length > 0 && (
                                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border bg-white shadow-lg">
                                      {searchResults[key].map((product) => {
                                        const pid = String(
                                          product._id || product.id || ""
                                        );
                                        const img = getProductImage(product);
                                        return (
                                          <button
                                            key={pid}
                                            type="button"
                                            onClick={() =>
                                              selectProduct(
                                                index,
                                                offerIndex,
                                                product
                                              )
                                            }
                                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-indigo-50"
                                          >
                                            {img ? (
                                              <img
                                                src={img}
                                                alt=""
                                                className="h-10 w-10 rounded-lg object-cover"
                                              />
                                            ) : (
                                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                                                N/A
                                              </div>
                                            )}
                                            <span className="font-medium">
                                              {product.name || product.title}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {(offer.selectedProducts || []).length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {offer.selectedProducts.map((p) => (
                                      <span
                                        key={p._id}
                                        className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-800"
                                      >
                                        {p.image && (
                                          <img
                                            src={p.image}
                                            alt=""
                                            className="h-5 w-5 rounded-full object-cover"
                                          />
                                        )}
                                        {p.name}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeSelectedProduct(
                                              index,
                                              offerIndex,
                                              p._id
                                            )
                                          }
                                          className="ml-1 hover:text-red-600"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="mt-2 text-xs text-slate-500">
                                  {(offer.productIds || []).length} product(s)
                                  selected
                                </p>
                              </div>

                              {offer.image && (
                                <img
                                  src={offer.image}
                                  alt={offer.alt || "Offer"}
                                  className="max-h-48 w-full rounded-lg border object-contain"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {["hero", "cta"].includes(section.type) && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>
                          Button Text
                          <input
                            className={inputClass}
                            value={section.buttonText || ""}
                            onChange={(e) =>
                              updateSection(index, "buttonText", e.target.value)
                            }
                          />
                        </label>
                        <label className={labelClass}>
                          Button Link
                          <input
                            className={inputClass}
                            value={section.buttonLink || ""}
                            onChange={(e) =>
                              updateSection(index, "buttonLink", e.target.value)
                            }
                          />
                        </label>
                      </div>
                    )}

                    {section.type === "products" && (
                      <label className={labelClass}>
                        Product IDs
                        <textarea
                          className={`${inputClass} min-h-24 font-mono`}
                          value={(section.productIds || []).join(", ")}
                          onChange={(e) =>
                            updateSection(
                              index,
                              "productIds",
                              e.target.value
                                .split(",")
                                .map((v) => v.trim())
                                .filter(Boolean)
                            )
                          }
                          rows={3}
                        />
                      </label>
                    )}

                    {section.type === "features" && (
                      <label className={labelClass}>
                        Features (one per line)
                        <textarea
                          className={inputClass}
                          value={(section.features || []).join("\n")}
                          onChange={(e) =>
                            updateSection(
                              index,
                              "features",
                              e.target.value
                                .split("\n")
                                .map((v) => v.trim())
                                .filter(Boolean)
                            )
                          }
                          rows={4}
                        />
                      </label>
                    )}
                  </div>
                </article>
              ))}

              {form.sections.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center">
                  <p className="font-semibold text-slate-700">
                    No sections added yet
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* SEO */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">SEO Settings</h2>
            <div className="mt-6 space-y-5">
              <label className={labelClass}>
                Meta Title
                <input
                  className={inputClass}
                  name="metaTitle"
                  value={form.seo.metaTitle}
                  onChange={handleSeoChange}
                />
              </label>
              <label className={labelClass}>
                Meta Description
                <textarea
                  className={inputClass}
                  name="metaDescription"
                  value={form.seo.metaDescription}
                  onChange={handleSeoChange}
                  rows={3}
                />
              </label>
              <label className={labelClass}>
                Open Graph Image URL
                <input
                  className={inputClass}
                  type="url"
                  name="ogImage"
                  value={form.seo.ogImage}
                  onChange={handleSeoChange}
                />
              </label>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving Changes..." : "Save Changes →"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}