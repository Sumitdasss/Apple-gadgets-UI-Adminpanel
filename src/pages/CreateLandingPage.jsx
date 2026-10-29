import { useEffect, useState, useRef } from "react";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";

const getAdminToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

const authFetch = async (url, options = {}) => {
  const token = getAdminToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  // FormData হলে Content-Type সেট করো না
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    // optional: window.location.href = "/admin/login";
  }
  return res;
};

const emptyBanner = () => ({
  image: "",
  link: "",
  alt: "",
  file: null,
  preview: "",
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
  file: null,
  preview: "",
});

export default function CreateLandingPage({ onCancel, onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    heroTitle: "",
    heroSubtitle: "",
    heroImage: "",
    buttonText: "Shop Now",
    buttonLink: "/",
    productIds: "",
  });

  const [banners, setBanners] = useState([emptyBanner()]);
  const [offers, setOffers] = useState([emptyOffer()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sectionType, setSectionType] = useState("hero");

  // Product search (per offer index)
  const [searchQuery, setSearchQuery] = useState({});
  const [searchResults, setSearchResults] = useState({});
  const [searchLoading, setSearchLoading] = useState({});
  const searchTimeout = useRef({});

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      banners.forEach((banner) => {
        if (banner.preview) URL.revokeObjectURL(banner.preview);
      });
      offers.forEach((offer) => {
        if (offer.preview) URL.revokeObjectURL(offer.preview);
      });
      Object.values(searchTimeout.current).forEach((t) => clearTimeout(t));
    };
  }, [banners, offers]);

  function change(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ===================== BANNER =====================
  function updateBanner(index, field, value) {
    setBanners((prev) =>
      prev.map((banner, i) =>
        i === index ? { ...banner, [field]: value } : banner
      )
    );
  }

  function handleBannerFile(index, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image size must be 5 MB or less.");
      return;
    }
    setError("");
    const preview = URL.createObjectURL(file);
    setBanners((prev) =>
      prev.map((banner, i) => {
        if (i !== index) return banner;
        if (banner.preview) URL.revokeObjectURL(banner.preview);
        return { ...banner, file, preview };
      })
    );
  }

  function clearBannerFile(index) {
    setBanners((prev) =>
      prev.map((banner, i) => {
        if (i !== index) return banner;
        if (banner.preview) URL.revokeObjectURL(banner.preview);
        return { ...banner, file: null, preview: "" };
      })
    );
  }

  function addBanner() {
    setBanners((prev) => [...prev, emptyBanner()]);
  }

  function removeBanner(index) {
    setBanners((prev) => {
      const target = prev[index];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ===================== OFFER =====================
  function updateOffer(index, field, value) {
    setOffers((prev) =>
      prev.map((offer, i) =>
        i === index ? { ...offer, [field]: value } : offer
      )
    );
  }

  function handleOfferFile(index, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image size must be 5 MB or less.");
      return;
    }
    setError("");
    const preview = URL.createObjectURL(file);
    setOffers((prev) =>
      prev.map((offer, i) => {
        if (i !== index) return offer;
        if (offer.preview) URL.revokeObjectURL(offer.preview);
        return { ...offer, file, preview };
      })
    );
  }

  function clearOfferFile(index) {
    setOffers((prev) =>
      prev.map((offer, i) => {
        if (i !== index) return offer;
        if (offer.preview) URL.revokeObjectURL(offer.preview);
        return { ...offer, file: null, preview: "" };
      })
    );
  }

  function addOffer() {
    setOffers((prev) => [...prev, emptyOffer()]);
  }

  function removeOffer(index) {
    setOffers((prev) => {
      const target = prev[index];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ===================== PRODUCT SEARCH =====================
  async function searchProducts(offerIndex, query) {
    setSearchQuery((prev) => ({ ...prev, [offerIndex]: query }));

    if (searchTimeout.current[offerIndex]) {
      clearTimeout(searchTimeout.current[offerIndex]);
    }

    if (!query || query.trim().length < 2) {
      setSearchResults((prev) => ({ ...prev, [offerIndex]: [] }));
      return;
    }

    searchTimeout.current[offerIndex] = setTimeout(async () => {
      try {
        setSearchLoading((prev) => ({ ...prev, [offerIndex]: true }));

        const response = await authFetch(
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
        const filteredProducts = productList.filter((product) =>
          String(product?.name || "")
            .toLowerCase()
            .includes(keyword)
        );

        setSearchResults((prev) => ({
          ...prev,
          [offerIndex]: filteredProducts,
        }));
      } catch (err) {
        console.error("Product search error:", err);
        setSearchResults((prev) => ({ ...prev, [offerIndex]: [] }));
      } finally {
        setSearchLoading((prev) => ({ ...prev, [offerIndex]: false }));
      }
    }, 350);
  }

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

  function selectProduct(offerIndex, product) {
    const productId = String(product._id || product.id || "");
    if (!productId) return;

    setOffers((prev) =>
      prev.map((offer, i) => {
        if (i !== offerIndex) return offer;

        const already = (offer.productIds || []).includes(productId);
        if (already) return offer;

        return {
          ...offer,
          productIds: [...(offer.productIds || []), productId],
          selectedProducts: [
            ...(offer.selectedProducts || []),
            {
              _id: productId,
              name: product.name || product.title || "Product",
              image: getProductImage(product),
            },
          ],
        };
      })
    );

    setSearchQuery((prev) => ({ ...prev, [offerIndex]: "" }));
    setSearchResults((prev) => ({ ...prev, [offerIndex]: [] }));
  }

  function removeSelectedProduct(offerIndex, productId) {
    setOffers((prev) =>
      prev.map((offer, i) => {
        if (i !== offerIndex) return offer;
        return {
          ...offer,
          productIds: (offer.productIds || []).filter((id) => id !== productId),
          selectedProducts: (offer.selectedProducts || []).filter(
            (p) => p._id !== productId
          ),
        };
      })
    );
  }

  // ===================== SUBMIT =====================
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const title = form.title.trim();
    const slug = form.slug.trim().toLowerCase();

    if (!title || !slug) {
      setError("Page title and slug are required.");
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError(
        "Slug must contain lowercase letters, numbers and hyphens only."
      );
      return;
    }

    if (form.heroImage.trim()) {
      try {
        const url = new URL(form.heroImage.trim());
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        setError("Please enter a valid Hero image URL.");
        return;
      }
    }

    for (const banner of banners) {
      if (banner.image.trim() && !banner.file) {
        try {
          const url = new URL(banner.image.trim());
          if (!["http:", "https:"].includes(url.protocol)) throw new Error();
        } catch {
          setError("Please enter a valid banner image URL.");
          return;
        }
      }
    }

    for (const offer of offers) {
      if (offer.image.trim() && !offer.file) {
        try {
          const url = new URL(offer.image.trim());
          if (!["http:", "https:"].includes(url.protocol)) throw new Error();
        } catch {
          setError("Please enter a valid offer image URL.");
          return;
        }
      }
    }

    setSaving(true);

    try {
      const bannerFileIndexes = [];
      const bannerItems = banners
        .filter((banner) => banner.file || banner.image.trim())
        .map((banner, index) => {
          if (banner.file) bannerFileIndexes.push(index);
          return {
            image: banner.image.trim(),
            link: banner.link.trim(),
            alt: banner.alt.trim(),
          };
        });

      const offerFileIndexes = [];
      const offerItems = offers
        .filter(
          (offer) =>
            offer.file ||
            offer.image.trim() ||
            offer.title.trim() ||
            offer.endDate
        )
        .map((offer, index) => {
          if (offer.file) offerFileIndexes.push(index);
          return {
            title: offer.title.trim(),
            image: offer.image.trim(),
            link: offer.link.trim(),
            alt: offer.alt.trim(),
            endDate: offer.endDate || undefined,
            buttonText: offer.buttonText.trim() || "View Details",
            productIds: offer.productIds || [],
          };
        });

      const sections = [];

      if (sectionType === "hero") {
        sections.push({
          type: "hero",
          title: form.heroTitle.trim(),
          subtitle: form.heroSubtitle.trim(),
          image: form.heroImage.trim(),
          buttonText: form.buttonText.trim(),
          buttonLink: form.buttonLink.trim(),
        });
      }

      if (sectionType === "banner") {
        sections.push({
          type: "banner",
          title: "Banners",
          banners: bannerItems,
        });
      }

      if (sectionType === "products") {
        sections.push({
          type: "products",
          title: "Featured Products",
          productIds: form.productIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        });
      }

      if (sectionType === "features") {
        sections.push({ type: "features", title: "Features", features: [] });
      }

      if (sectionType === "testimonials") {
        sections.push({ type: "testimonials", title: "Testimonials" });
      }

      if (sectionType === "cta") {
        sections.push({
          type: "cta",
          title: form.heroTitle.trim(),
          subtitle: form.heroSubtitle.trim(),
          buttonText: form.buttonText.trim(),
          buttonLink: form.buttonLink.trim(),
        });
      }

      if (sectionType === "offers") {
        sections.push({
          type: "offers",
          title: form.heroTitle.trim() || "Latest Offers",
          subtitle: form.heroSubtitle.trim(),
          offers: offerItems,
        });
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("slug", slug);
      formData.append("description", form.description.trim());
      formData.append("status", "draft");
      formData.append("sections", JSON.stringify(sections));
      formData.append("bannerFileIndexes", JSON.stringify(bannerFileIndexes));
      formData.append("offerFileIndexes", JSON.stringify(offerFileIndexes));

      banners
        .filter((b) => b.file || b.image.trim())
        .forEach((b) => {
          if (b.file) formData.append("bannerImages", b.file);
        });

      offers
        .filter(
          (o) => o.file || o.image.trim() || o.title.trim() || o.endDate
        )
        .forEach((o) => {
          if (o.file) formData.append("offerImages", o.file);
        });

      // Auth token সহ create — /api/dashboard path
      const response = await authFetch(
        `${API_BASE}/api/dashboard/createLandingPage`,
        {
          method: "POST",
          body: formData,
        }
      );

      const text = await response.text();
      let result;
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { success: false, message: text || "Invalid server response" };
      }

      if (!response.ok || result?.success === false) {
        throw new Error(result.message || "Failed to create landing page.");
      }

      if (typeof onSuccess === "function") onSuccess(result);
    } catch (err) {
      setError(err?.message || "Failed to create landing page.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  const labelClass = "block text-sm font-semibold text-slate-700";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Admin Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Create Landing Page
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Create a campaign page for your products and offers.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            ← Back to Pages
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section Type */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              Section Configuration
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select the type of section you want to create.
            </p>
            <label className={labelClass}>
              Section Type
              <select
                value={sectionType}
                onChange={(e) => setSectionType(e.target.value)}
                disabled={saving}
                className={inputClass}
              >
                <option value="hero">Hero Section</option>
                <option value="banner">Banner Section</option>
                <option value="products">Products Section</option>
                <option value="features">Features Section</option>
                <option value="testimonials">Testimonials Section</option>
                <option value="cta">Call To Action (CTA)</option>
                <option value="offers">Latest Offers</option>
              </select>
            </label>
          </section>

          {/* Basic Info */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              Basic Information
            </h2>
            <div className="mt-6 space-y-5">
              <label className={labelClass}>
                Page Title *
                <input
                  className={inputClass}
                  name="title"
                  value={form.title}
                  onChange={change}
                  placeholder="iPhone 17 Pro Max Offer"
                  required
                />
              </label>
              <label className={labelClass}>
                URL Slug *
                <input
                  className={inputClass}
                  name="slug"
                  value={form.slug}
                  onChange={change}
                  placeholder="iphone-17-pro-max"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  required
                />
                <span className="mt-2 block text-xs font-normal text-slate-500">
                  Example: /lp/iphone-17-pro-max
                </span>
              </label>
              <label className={labelClass}>
                Page Description
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  name="description"
                  value={form.description}
                  onChange={change}
                  rows={4}
                  placeholder="Describe this campaign..."
                />
              </label>
            </div>
          </section>

          {/* Hero / CTA / Offers title */}
          {(sectionType === "hero" ||
            sectionType === "cta" ||
            sectionType === "offers") && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-slate-900">
                {sectionType === "offers"
                  ? "Offers Section Title"
                  : "Hero Section"}
              </h2>
              <div className="mt-6 space-y-5">
                <label className={labelClass}>
                  {sectionType === "offers" ? "Section Title" : "Hero Title"}
                  <input
                    className={inputClass}
                    name="heroTitle"
                    value={form.heroTitle}
                    onChange={change}
                    placeholder={
                      sectionType === "offers"
                        ? "Latest Offers"
                        : "Discover the latest iPhone"
                    }
                  />
                </label>
                <label className={labelClass}>
                  {sectionType === "offers"
                    ? "Section Subtitle"
                    : "Hero Subtitle"}
                  <textarea
                    className={inputClass}
                    name="heroSubtitle"
                    value={form.heroSubtitle}
                    onChange={change}
                    rows={3}
                    placeholder="Add a promotional message..."
                  />
                </label>

                {sectionType === "hero" && (
                  <>
                    <label className={labelClass}>
                      Hero Image URL
                      <input
                        className={inputClass}
                        type="url"
                        name="heroImage"
                        value={form.heroImage}
                        onChange={change}
                        placeholder="https://example.com/hero.jpg"
                      />
                    </label>
                    {form.heroImage && (
                      <img
                        src={form.heroImage}
                        alt="Hero preview"
                        className="max-h-64 w-full rounded-xl border border-slate-200 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </>
                )}

                {(sectionType === "hero" || sectionType === "cta") && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className={labelClass}>
                      Button Text
                      <input
                        className={inputClass}
                        name="buttonText"
                        value={form.buttonText}
                        onChange={change}
                        placeholder="Shop Now"
                      />
                    </label>
                    <label className={labelClass}>
                      Button Link
                      <input
                        className={inputClass}
                        name="buttonLink"
                        value={form.buttonLink}
                        onChange={change}
                        placeholder="/products"
                      />
                    </label>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Banner Images */}
          {sectionType === "banner" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Banner Images
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload an image or enter an image URL for each banner.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addBanner}
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  + Add Banner
                </button>
              </div>

              <div className="mt-6 space-y-5">
                {banners.map((banner, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 p-4 sm:p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">
                        Banner {index + 1}
                      </h3>
                      {banners.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBanner(index)}
                          disabled={saving}
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <label className={labelClass}>
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        disabled={saving}
                        onChange={(e) => {
                          handleBannerFile(index, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                        className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700`}
                      />
                      <span className="mt-1 block text-xs font-normal text-slate-500">
                        Maximum 5 MB. Image files only.
                      </span>
                    </label>

                    {banner.file && (
                      <button
                        type="button"
                        onClick={() => clearBannerFile(index)}
                        disabled={saving}
                        className="mt-2 text-sm font-semibold text-red-600 hover:underline"
                      >
                        Clear selected file
                      </button>
                    )}

                    <label className={`${labelClass} mt-4`}>
                      Or Image URL
                      <input
                        type="url"
                        value={banner.image}
                        onChange={(e) =>
                          updateBanner(index, "image", e.target.value)
                        }
                        disabled={saving}
                        placeholder="https://example.com/banner.jpg"
                        className={inputClass}
                      />
                    </label>

                    <label className={`${labelClass} mt-4`}>
                      Click Link
                      <input
                        value={banner.link}
                        onChange={(e) =>
                          updateBanner(index, "link", e.target.value)
                        }
                        disabled={saving}
                        placeholder="/products/iphone"
                        className={inputClass}
                      />
                    </label>

                    <label className={`${labelClass} mt-4`}>
                      Image Alt Text
                      <input
                        value={banner.alt}
                        onChange={(e) =>
                          updateBanner(index, "alt", e.target.value)
                        }
                        disabled={saving}
                        placeholder="iPhone promotion"
                        className={inputClass}
                      />
                    </label>

                    {(banner.preview || banner.image) && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <p className="mb-2 text-xs font-semibold text-slate-500">
                          Preview
                        </p>
                        <img
                          src={banner.preview || banner.image}
                          alt={banner.alt || `Banner ${index + 1}`}
                          className="max-h-64 w-full rounded-lg object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===================== LATEST OFFERS ===================== */}
          {sectionType === "offers" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Offer Cards
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Search & select products for each offer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addOffer}
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  + Add Offer
                </button>
              </div>

              <div className="mt-6 space-y-5">
                {offers.map((offer, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 p-4 sm:p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">
                        Offer {index + 1}
                      </h3>
                      {offers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOffer(index)}
                          disabled={saving}
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <label className={labelClass}>
                      Offer Title
                      <input
                        value={offer.title}
                        onChange={(e) =>
                          updateOffer(index, "title", e.target.value)
                        }
                        disabled={saving}
                        placeholder="Enjoy up to 12 Months of 0% EMI"
                        className={inputClass}
                      />
                    </label>

                    <label className={`${labelClass} mt-4`}>
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        disabled={saving}
                        onChange={(e) => {
                          handleOfferFile(index, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                        className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700`}
                      />
                      <span className="mt-1 block text-xs font-normal text-slate-500">
                        Maximum 5 MB. Image files only.
                      </span>
                    </label>

                    {offer.file && (
                      <button
                        type="button"
                        onClick={() => clearOfferFile(index)}
                        disabled={saving}
                        className="mt-2 text-sm font-semibold text-red-600 hover:underline"
                      >
                        Clear selected file
                      </button>
                    )}

                    <label className={`${labelClass} mt-4`}>
                      Or Image URL
                      <input
                        type="url"
                        value={offer.image}
                        onChange={(e) =>
                          updateOffer(index, "image", e.target.value)
                        }
                        disabled={saving}
                        placeholder="https://example.com/offer.jpg"
                        className={inputClass}
                      />
                    </label>

                    <label className={`${labelClass} mt-4`}>
                      Click / View Details Link
                      <input
                        value={offer.link}
                        onChange={(e) =>
                          updateOffer(index, "link", e.target.value)
                        }
                        disabled={saving}
                        placeholder="/offerDetails/iphone-18-emi"
                        className={inputClass}
                      />
                    </label>

                    <label className={`${labelClass} mt-4`}>
                      Image Alt Text
                      <input
                        value={offer.alt}
                        onChange={(e) =>
                          updateOffer(index, "alt", e.target.value)
                        }
                        disabled={saving}
                        placeholder="iPhone 0% EMI Offer"
                        className={inputClass}
                      />
                    </label>

                    <div className="mt-4 grid gap-5 sm:grid-cols-2">
                      <label className={labelClass}>
                        Countdown End Date
                        <input
                          type="datetime-local"
                          value={offer.endDate}
                          onChange={(e) =>
                            updateOffer(index, "endDate", e.target.value)
                          }
                          disabled={saving}
                          className={inputClass}
                        />
                      </label>
                      <label className={labelClass}>
                        Button Text
                        <input
                          value={offer.buttonText}
                          onChange={(e) =>
                            updateOffer(index, "buttonText", e.target.value)
                          }
                          disabled={saving}
                          placeholder="View Details"
                          className={inputClass}
                        />
                      </label>
                    </div>

                    {/* ========== PRODUCT SEARCH ========== */}
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-sm font-semibold text-slate-700">
                        Related Products
                      </p>

                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery[index] || ""}
                          onChange={(e) =>
                            searchProducts(index, e.target.value)
                          }
                          disabled={saving}
                          placeholder="Search product by name..."
                          className={inputClass}
                          autoComplete="off"
                        />

                        {searchLoading[index] && (
                          <p className="mt-2 text-xs text-slate-500">
                            Searching...
                          </p>
                        )}

                        {(searchResults[index] || []).length > 0 && (
                          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                            {searchResults[index].map((product) => {
                              const pid = String(
                                product._id || product.id || ""
                              );
                              const img = getProductImage(product);
                              return (
                                <button
                                  key={pid}
                                  type="button"
                                  onClick={() => selectProduct(index, product)}
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
                                  <span className="font-medium text-slate-800">
                                    {product.name || product.title || "Product"}
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
                                  removeSelectedProduct(index, p._id)
                                }
                                className="ml-1 text-indigo-600 hover:text-red-600"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="mt-2 text-xs text-slate-500">
                        {(offer.productIds || []).length} product(s) selected
                      </p>
                    </div>

                    {(offer.preview || offer.image) && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <p className="mb-2 text-xs font-semibold text-slate-500">
                          Preview
                        </p>
                        <img
                          src={offer.preview || offer.image}
                          alt={offer.alt || `Offer ${index + 1}`}
                          className="max-h-64 w-full rounded-lg object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Featured products */}
          {sectionType === "products" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-slate-900">
                Featured Products
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Add MongoDB product IDs separated by commas.
              </p>
              <label className={`${labelClass} mt-5`}>
                Product IDs
                <textarea
                  className={`${inputClass} min-h-28 resize-y font-mono`}
                  name="productIds"
                  value={form.productIds}
                  onChange={change}
                  disabled={saving}
                  placeholder="68a123456789abcdef123456, 68b123456789abcdef123456"
                />
              </label>
            </section>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Landing Page →"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}