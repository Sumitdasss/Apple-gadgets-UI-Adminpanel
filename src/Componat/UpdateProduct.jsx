


import React, { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = "https://apple-gadgets-ui-backend.vercel.app"; // বা তোমার live URL

const CATEGORY_API = {
  tree: `${API_BASE}/category/tree`,
  main: `${API_BASE}/category/main`,
  sub: `${API_BASE}/category/sub`,
  child: `${API_BASE}/category/child`,
  subChild: `${API_BASE}/category/sub-child`,
};

const initialFormData = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  category: "",
  subCategory: "",
  childCategory: "",
  subChildCategory: "",
  brand: "",
  price: "",
  discountPrice: "",
  discountPercentage: "",
  additionalCategories: [],
  stock: "",
  sku: "",
  colors: [],
  sizes: [],
  specifications: [],
  ram: [],
  variants: [],
  rating: 0,
  isActive: true,
  isFeatured: false,
  isNew: false,
  isBestSeller: false,
  metaTitle: "",
  metaDescription: "",
  images: [],
  existingImages: [],
};

export default function UpdateProductPage({ productId: propProductId }) {
  const [selectedProductId, setSelectedProductId] = useState(
    propProductId || null
  );

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const imageInputRef = useRef(null);
  const [formData, setFormData] = useState(initialFormData);
  const [subChildCategories, setSubChildCategories] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const [colorName, setColorName] = useState("");
  const [colorCode, setColorCode] = useState("#000000");
  const [colorImage, setColorImage] = useState(null);
  const [colorImagePreview, setColorImagePreview] = useState("");
  const [size, setSize] = useState("");
  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [ramValue, setRamValue] = useState("");

  const [variantColorName, setVariantColorName] = useState("");
  const [variantRam, setVariantRam] = useState("");
  const [variantStorage, setVariantStorage] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantSku, setVariantSku] = useState("");

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [childCategories, setChildCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

  // ==============================
  // LOAD PRODUCT LIST
  // ==============================
  useEffect(() => {
    if (selectedProductId) return;

    const loadList = async () => {
      try {
        setListLoading(true);
        const response = await fetch(`${API_BASE}/products/getALLproducts`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load products");
        }

        const list = Array.isArray(data)
          ? data
          : data?.products || data?.data || [];

        setProductsList(list);
      } catch (error) {
        console.error("Load products list error:", error);
        alert(error.message || "Failed to load products");
      } finally {
        setListLoading(false);
      }
    };

    loadList();
  }, [selectedProductId]);

  // ==============================
  // LOAD CATEGORIES
  // ==============================
  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError("");

      const response = await fetch(CATEGORY_API.tree, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Could not load categories");
      }

      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    } catch (error) {
      console.error("Load categories error:", error);
      setCategoriesError(error.message || "Could not load categories");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ==============================
  // LOAD SINGLE PRODUCT
  // ==============================
  useEffect(() => {
    if (!selectedProductId) {
      setFetching(false);
      return;
    }

    const loadProduct = async () => {
      try {
        setFetching(true);

        const response = await fetch(
          `${API_BASE}/products/${selectedProductId}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Product not found");
        }

        const product = data?.product || data?.data || data;

        setFormData({
          name: product.name || "",
          slug: product.slug || "",
          description: product.description || "",
          shortDescription: product.shortDescription || "",
          category: product.category?._id || product.category || "",
          subCategory: product.subCategory?._id || product.subCategory || "",
          childCategory:
            product.childCategory?._id || product.childCategory || "",
          subChildCategory:
            product.subChildCategory?._id || product.subChildCategory || "",
          brand: product.brand || "",
          price: product.price || "",
          discountPrice: product.discountPrice || "",
          discountPercentage: product.discountPercentage || "",
          additionalCategories: (product.additionalCategories || []).map(
            (c) => (typeof c === "object" ? c._id : c)
          ),
          stock: product.stock || "",
          sku: product.sku || "",
          colors: (product.colors || []).map((c) => ({
            name: c.name,
            code: c.code || "#000000",
            imagePreview: c.image || c.imageUrl || "",
            imageFile: null,
            existingImage: c.image || c.imageUrl || "",
          })),
          sizes: product.sizes || [],
          specifications: product.specifications || [],
          ram: product.ram || [],
          variants: product.variants || [],
          rating: product.rating || 0,
          isActive: product.isActive ?? true,
          isFeatured: product.isFeatured ?? false,
          isNew: product.isNew ?? false,
          isBestSeller: product.isBestSeller ?? false,
          metaTitle: product.metaTitle || "",
          metaDescription: product.metaDescription || "",
          images: [],
          existingImages: product.images || [],
        });

        setExistingImages(product.images || []);
        setImagePreviews([]);
      } catch (error) {
        console.error("Load product error:", error);
        alert(error.message || "Failed to load product");
        setSelectedProductId(null);
      } finally {
        setFetching(false);
      }
    };

    loadProduct();
  }, [selectedProductId]);

  // Category cascade
  useEffect(() => {
    if (!formData.category) {
      setSubCategories([]);
      return;
    }
    const selected = categories.find((c) => c._id === formData.category);
    setSubCategories(selected?.subCategories || []);
  }, [formData.category, categories]);

  useEffect(() => {
    if (!formData.subCategory) {
      setChildCategories([]);
      return;
    }
    const selected = subCategories.find(
      (s) => s._id === formData.subCategory
    );
    setChildCategories(selected?.children || []);
  }, [formData.subCategory, subCategories]);

  useEffect(() => {
    if (!formData.childCategory) {
      setSubChildCategories([]);
      return;
    }
    const selected = childCategories.find(
      (c) => c._id === formData.childCategory
    );
    setSubChildCategories(selected?.subChildren || []);
  }, [formData.childCategory, childCategories]);

  // ==============================
  // INPUT CHANGE
  // ==============================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "name") {
        updated.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");
      }

      if (name === "category") {
        updated.subCategory = "";
        updated.childCategory = "";
        updated.subChildCategory = "";
      }
      if (name === "subCategory") {
        updated.childCategory = "";
        updated.subChildCategory = "";
      }
      if (name === "childCategory") {
        updated.subChildCategory = "";
      }

      if (name === "price" || name === "discountPrice") {
        const price =
          name === "price" ? parseFloat(value) : parseFloat(prev.price);
        const discountPrice =
          name === "discountPrice"
            ? parseFloat(value)
            : parseFloat(prev.discountPrice);

        if (price > 0 && discountPrice > 0 && discountPrice < price) {
          updated.discountPercentage = (
            ((price - discountPrice) / price) *
            100
          ).toFixed(2);
        } else {
          updated.discountPercentage = "";
        }
      }

      return updated;
    });
  };

  // ==============================
  // IMAGE
  // ==============================
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length !== files.length) {
      alert("Only image files are allowed");
    }
    if (!validFiles.length) return;

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...validFiles],
    }));

    const newPreviews = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeNewImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));

    setImagePreviews((prev) => {
      const updated = [...prev];
      if (updated[index]?.url) URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, i) => i !== index),
    }));
  };

  // ==============================
  // COLOR
  // ==============================
  const handleColorImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed");
      return;
    }
    setColorImage(file);
    setColorImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const addColor = () => {
    if (!colorName.trim()) {
      alert("Enter color name");
      return;
    }
    if (
      formData.colors.some(
        (c) => c.name.toLowerCase() === colorName.trim().toLowerCase()
      )
    ) {
      alert("This color is already added");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      colors: [
        ...prev.colors,
        {
          name: colorName.trim(),
          code: colorCode,
          imageFile: colorImage,
          imagePreview: colorImagePreview,
          existingImage: "",
        },
      ],
    }));

    setColorName("");
    setColorCode("#000000");
    setColorImage(null);
    setColorImagePreview("");
  };

  const removeColor = (index) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index),
    }));
  };

  // ==============================
  // SIZE
  // ==============================
  const addSize = () => {
    if (!size.trim()) return;
    if (
      formData.sizes.some(
        (s) => s.toLowerCase() === size.trim().toLowerCase()
      )
    ) {
      alert("This size is already added");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      sizes: [...prev.sizes, size.trim()],
    }));
    setSize("");
  };

  const removeSize = (index) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index),
    }));
  };

  // ==============================
  // SPECIFICATION
  // ==============================
  const addSpecification = () => {
    const key = specKey.trim();
    const value = specValue.trim();
    if (!key || !value) {
      alert("Please enter both name and value");
      return;
    }
    if (
      formData.specifications.some(
        (item) => item.key.toLowerCase() === key.toLowerCase()
      )
    ) {
      alert("This specification already exists");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { key, value }],
    }));
    setSpecKey("");
    setSpecValue("");
  };

  const removeSpecification = (index) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  // ==============================
  // RAM
  // ==============================
  const addRam = () => {
    if (!ramValue.trim()) {
      alert("Enter RAM / Memory value");
      return;
    }
    if (
      formData.ram.some(
        (item) => item.toLowerCase() === ramValue.trim().toLowerCase()
      )
    ) {
      alert("This RAM / Memory is already added");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      ram: [...prev.ram, ramValue.trim()],
    }));
    setRamValue("");
  };

  const removeRam = (index) => {
    setFormData((prev) => ({
      ...prev,
      ram: prev.ram.filter((_, i) => i !== index),
    }));
  };

  // ==============================
  // VARIANT
  // ==============================
  const addVariant = () => {
    if (!variantColorName) {
      alert("Select a color");
      return;
    }
    if (!variantRam.trim() || !variantStorage.trim()) {
      alert("Enter RAM and Storage");
      return;
    }
    if (variantStock === "" || Number(variantStock) < 0) {
      alert("Enter valid stock");
      return;
    }
    if (!variantPrice || Number(variantPrice) <= 0) {
      alert("Enter valid price");
      return;
    }
    if (!variantSku.trim()) {
      alert("Enter SKU");
      return;
    }

    const skuTaken = formData.variants.some(
      (v) => v.sku?.trim().toLowerCase() === variantSku.trim().toLowerCase()
    );
    if (skuTaken) {
      alert("This SKU is already used");
      return;
    }

    const selectedColor = formData.colors.find(
      (c) =>
        c.name.trim().toLowerCase() === variantColorName.trim().toLowerCase()
    );
    if (!selectedColor) {
      alert("Selected color not found");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          color: {
            name: selectedColor.name,
            code: selectedColor.code || "#000000",
          },
          ram: variantRam.trim(),
          storage: variantStorage.trim(),
          stock: Number(variantStock),
          price: Number(variantPrice),
          sku: variantSku.trim(),
        },
      ],
    }));

    setVariantColorName("");
    setVariantRam("");
    setVariantStorage("");
    setVariantStock("");
    setVariantPrice("");
    setVariantSku("");
  };

  const removeVariant = (index) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  // ==============================
  // SUBMIT
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProductId) return;

    if (existingImages.length === 0 && formData.images.length === 0) {
      alert("At least one product image is required");
      return;
    }

    const rating = parseFloat(formData.rating);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      alert("Rating must be between 0 and 5");
      return;
    }

    if (
      formData.discountPrice &&
      parseFloat(formData.discountPrice) >= parseFloat(formData.price)
    ) {
      alert("Discount price must be lower than price");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();

      data.append("name", formData.name);
      data.append("slug", formData.slug);
      data.append("description", formData.description);
      data.append("shortDescription", formData.shortDescription);
      data.append("category", formData.category);
      data.append("subCategory", formData.subCategory);
      data.append("childCategory", formData.childCategory);
      data.append("subChildCategory", formData.subChildCategory);
      data.append("brand", formData.brand);
      data.append("price", formData.price);
      data.append("discountPrice", formData.discountPrice || "");
      data.append("discountPercentage", formData.discountPercentage || "");
      data.append("stock", formData.stock);
      data.append("sku", formData.sku);
      data.append(
        "additionalCategories",
        JSON.stringify(formData.additionalCategories || [])
      );

      const colorsWithoutFiles = formData.colors.map((c) => ({
        name: c.name,
        code: c.code,
        existingImage: c.existingImage || "",
      }));
      data.append("colors", JSON.stringify(colorsWithoutFiles));

      formData.colors.forEach((color) => {
        if (color.imageFile) {
          data.append("colorImages", color.imageFile);
        }
      });

      data.append("sizes", JSON.stringify(formData.sizes));
      data.append("ram", JSON.stringify(formData.ram));
      data.append("specifications", JSON.stringify(formData.specifications));
      data.append("variants", JSON.stringify(formData.variants));
      data.append("rating", String(rating));
      data.append("isActive", String(formData.isActive));
      data.append("isFeatured", String(formData.isFeatured));
      data.append("isNew", String(formData.isNew));
      data.append("isBestSeller", String(formData.isBestSeller));
      data.append("metaTitle", formData.metaTitle);
      data.append("metaDescription", formData.metaDescription);
      data.append("existingImages", JSON.stringify(existingImages));

      formData.images.forEach((image) => {
        data.append("images", image);
      });

      const response = await fetch(
        `${API_BASE}/products/updateproduct/${selectedProductId}`,
        {
          method: "PUT",
          body: data,
        }
      );

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { success: false, message: text || "Invalid server response" };
      }

      if (!response.ok) {
        throw new Error(result.message || "Could not update product");
      }

      alert("Product updated successfully!");
      setSelectedProductId(null);
    } catch (error) {
      console.error("Update product error:", error);
      alert(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // FILTERED LIST
  // ==============================
  const filteredProducts = productsList.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q)
    );
  });

  // ==============================
  // UI: PRODUCT LIST
  // ==============================
  if (!selectedProductId) {
    return (
      <div className="min-h-[calc(100vh-65px)] bg-slate-50 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Update Product</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select a product to edit
          </p>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, SKU or brand..."
            className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-500"
          />
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-700 border-t-transparent" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="text-sm text-slate-500">No products found</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr
                    key={product._id || product.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <img
                        src={
                          product.images?.[0] ||
                          product.image ||
                          "/images.png"
                        }
                        alt={product.name}
                        className="h-12 w-12 rounded-lg border border-slate-200 object-contain"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {product.brand || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      ৳{" "}
                      {Number(
                        product.discountPrice || product.price || 0
                      ).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          product.stock > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {product.stock > 0 ? product.stock : "Out"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedProductId(product._id || product.id)
                        }
                        className="rounded-lg bg-red-800 px-4 py-2 text-xs font-semibold text-white hover:bg-red-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ==============================
  // UI: LOADING
  // ==============================
  if (fetching) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-red-700 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Loading product...</p>
        </div>
      </div>
    );
  }

  // ==============================
  // UI: EDIT FORM
  // ==============================
  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Update Product
            </h1>
            <p className="mt-1 text-sm text-slate-500">Edit product details</p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedProductId(null)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            ← Back to list
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ================= BASIC INFORMATION ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Basic Information
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter product name"
                required
              />

              <Input
                label="Slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="product-slug"
                required
              />

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  required
                  placeholder="Write product description..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Short Description
                </label>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Short product description..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          {/* ================= CATEGORY & BRAND ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Category &amp; Brand
            </h2>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {/* Category */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={categoriesLoading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading..."
                      : categories.length === 0
                      ? "No category"
                      : "Select category"}
                  </option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {categoriesError && (
                  <p className="mt-2 text-sm text-red-600">{categoriesError}</p>
                )}
              </div>

              {/* Sub Category */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Sub Category
                </label>
                <select
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  disabled={!formData.category}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
                >
                  <option value="">
                    {!formData.category
                      ? "Select category first"
                      : subCategories.length === 0
                      ? "No sub category"
                      : "Select sub category"}
                  </option>
                  {subCategories.map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Child Category */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Child Category
                </label>
                <select
                  name="childCategory"
                  value={formData.childCategory}
                  onChange={handleChange}
                  disabled={!formData.subCategory}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
                >
                  <option value="">
                    {!formData.subCategory
                      ? "Select sub category first"
                      : childCategories.length === 0
                      ? "No child category"
                      : "Select child category"}
                  </option>
                  {childCategories.map((child) => (
                    <option key={child._id} value={child._id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub Child Category */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Sub Child Category
                </label>
                <select
                  name="subChildCategory"
                  value={formData.subChildCategory}
                  onChange={handleChange}
                  disabled={!formData.childCategory}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
                >
                  <option value="">
                    {!formData.childCategory
                      ? "Select child category first"
                      : subChildCategories.length === 0
                      ? "No sub child category"
                      : "Select sub child category"}
                  </option>
                  {subChildCategories.map((sc) => (
                    <option key={sc._id} value={sc._id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 max-w-md">
              <Input
                label="Brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Apple"
              />
            </div>

            {/* Additional Categories */}
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h3 className="mb-2 text-base font-semibold text-slate-900">
                Additional Categories
              </h3>
              <p className="mb-4 text-sm text-slate-500">
                Select other main categories where this product should also
                appear.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {categories
                  .filter((c) => c._id !== formData.category)
                  .map((category) => {
                    const checked = (
                      formData.additionalCategories || []
                    ).includes(category._id);

                    return (
                      <label
                        key={category._id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                          checked
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-300 bg-white hover:border-blue-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setFormData((prev) => {
                              const current =
                                prev.additionalCategories || [];
                              if (e.target.checked) {
                                if (current.includes(category._id))
                                  return prev;
                                return {
                                  ...prev,
                                  additionalCategories: [
                                    ...current,
                                    category._id,
                                  ],
                                };
                              }
                              return {
                                ...prev,
                                additionalCategories: current.filter(
                                  (id) => id !== category._id
                                ),
                              };
                            });
                          }}
                          className="h-4 w-4 accent-blue-600"
                        />
                        <span className="text-sm font-medium text-slate-700">
                          {category.name}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          </section>

          {/* ================= PRICING ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">
              Pricing &amp; Inventory
            </h2>

            <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-5">
              <Input
                label="Price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                placeholder="1000"
                required
                min="0"
                step="0.01"
              />
              <Input
                label="Discount Price"
                name="discountPrice"
                type="number"
                value={formData.discountPrice}
                onChange={handleChange}
                placeholder="900"
                min="0"
                step="0.01"
              />
              <Input
                label="Discount %"
                name="discountPercentage"
                type="number"
                value={formData.discountPercentage}
                onChange={handleChange}
                placeholder="10"
                readOnly
              />
              <Input
                label="Stock"
                name="stock"
                type="number"
                value={formData.stock}
                onChange={handleChange}
                placeholder="50"
                required
                min="0"
              />
              <Input
                label="SKU"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="SKU-001"
              />
            </div>
          </section>

          {/* ================= GALLERY ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-slate-900">
              Product Gallery
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              Keep existing images or add new ones.
            </p>

            {existingImages.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Current Images
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {existingImages.map((img, index) => (
                    <div
                      key={`existing-${index}`}
                      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <img
                        src={typeof img === "string" ? img : img.url || img}
                        alt={`Existing ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                          Main
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full cursor-pointer rounded-xl border border-dashed border-slate-400 bg-slate-50 p-4"
            />

            {imagePreviews.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {imagePreviews.map((image, index) => (
                  <div
                    key={`new-${index}`}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <img
                      src={image.url}
                      alt={`New ${index + 1}`}
                      className="h-40 w-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-green-600 px-2.5 py-1 text-xs font-semibold text-white">
                      New
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ================= COLORS ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">Colors</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Color Name
                </label>
                <input
                  type="text"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="Example: Burgundy"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Color Code
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    className="h-[48px] w-[70px] cursor-pointer rounded-lg border border-slate-300"
                  />
                  <input
                    type="text"
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Color Image
              </label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-500">
                  {colorImagePreview ? (
                    <img
                      src={colorImagePreview}
                      alt="Color preview"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <>
                      <span className="text-3xl text-slate-400">+</span>
                      <span className="mt-1 text-xs text-slate-500">
                        Choose Image
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleColorImageChange}
                    className="hidden"
                  />
                </label>
                <div>
                  {colorImage ? (
                    <>
                      <p className="text-sm font-medium text-slate-700">
                        {colorImage.name}
                      </p>
                      <p className="mt-1 text-xs text-green-600">
                        Image selected
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Upload the phone image for this color
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={addColor}
              className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              + Add Color
            </button>

            {formData.colors.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Added Colors
                </h3>
                {formData.colors.map((color, index) => (
                  <div
                    key={`${color.name}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-center gap-4">
                      {color.imagePreview || color.existingImage ? (
                        <img
                          src={color.imagePreview || color.existingImage}
                          alt={color.name}
                          className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-contain p-1"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg border bg-white" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-5 w-5 rounded-full border"
                            style={{ backgroundColor: color.code }}
                          />
                          <span className="font-medium">{color.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {color.code}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeColor(index)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ================= SIZES ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">Sizes</h2>
            <div className="flex gap-3">
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="S / M / L / XL"
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3"
              />
              <button
                type="button"
                onClick={addSize}
                className="rounded-xl bg-blue-600 px-6 py-3 text-white"
              >
                Add size
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {formData.sizes.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-lg bg-slate-100 px-4 py-2"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeSize(index)}
                    className="ml-3 text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ================= SPECIFICATIONS ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Specifications
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Add product technical specifications
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-800">
                Add Specification
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Specification Name
                  </label>
                  <input
                    value={specKey}
                    onChange={(e) => setSpecKey(e.target.value)}
                    placeholder="e.g. Display Type"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Specification Value
                  </label>
                  <input
                    value={specValue}
                    onChange={(e) => setSpecValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSpecification();
                      }
                    }}
                    placeholder="e.g. LTPO Super Retina XDR OLED"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addSpecification}
                className="mt-4 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                + Add Specification
              </button>
            </div>

            {/* RAM */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-800">
                  Memory / RAM
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  You can add multiple memory variants
                </p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={ramValue}
                  onChange={(e) => setRamValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRam();
                    }
                  }}
                  placeholder="e.g. 256GB / 12GB RAM"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addRam}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800"
                >
                  + Add Memory
                </button>
              </div>
              {formData.ram.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {formData.ram.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRam(index)}
                        className="font-bold text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formData.specifications.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">
                    Added Specifications
                  </h3>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    {formData.specifications.length} items
                  </span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="divide-y divide-slate-200">
                    {formData.specifications.map((item, index) => (
                      <div
                        key={`${item.key}-${index}`}
                        className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] md:items-center"
                      >
                        <div className="bg-slate-50 px-4 py-4 font-medium text-slate-700">
                          {item.key}
                        </div>
                        <div className="px-4 py-4 text-sm text-slate-600">
                          {item.value}
                        </div>
                        <div className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeSpecification(index)}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ================= VARIANTS ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Product Variants
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Combine a color, RAM and storage to create a purchasable
                variant with its own stock, price and SKU.
              </p>
            </div>

            {formData.colors.length === 0 && (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Add at least one color above before creating variants.
              </p>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Color
                  </label>
                  <select
                    value={variantColorName}
                    onChange={(e) => setVariantColorName(e.target.value)}
                    disabled={formData.colors.length === 0}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
                  >
                    <option value="">Select color</option>
                    {formData.colors.map((color) => (
                      <option key={color.name} value={color.name}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    RAM
                  </label>
                  <input
                    list="variant-ram-options"
                    value={variantRam}
                    onChange={(e) => setVariantRam(e.target.value)}
                    placeholder="8GB"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />
                  <datalist id="variant-ram-options">
                    {formData.ram.map((item, index) => (
                      <option key={`${item}-${index}`} value={item} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Storage
                  </label>
                  <input
                    value={variantStorage}
                    onChange={(e) => setVariantStorage(e.target.value)}
                    placeholder="256GB"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={variantStock}
                    onChange={(e) => setVariantStock(e.target.value)}
                    placeholder="5"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                    placeholder="55000"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    SKU
                  </label>
                  <input
                    value={variantSku}
                    onChange={(e) => setVariantSku(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addVariant();
                      }
                    }}
                    placeholder="IQOO-BLK-8-256"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addVariant}
                disabled={formData.colors.length === 0}
                className="mt-4 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                + Add Variant
              </button>
            </div>

            {formData.variants.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">
                    Added Variants
                  </h3>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    {formData.variants.length} variants
                  </span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Color</th>
                        <th className="px-4 py-3 font-medium">RAM</th>
                        <th className="px-4 py-3 font-medium">Storage</th>
                        <th className="px-4 py-3 font-medium">Stock</th>
                        <th className="px-4 py-3 font-medium">Price</th>
                        <th className="px-4 py-3 font-medium">SKU</th>
                        <th className="px-4 py-3 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {formData.variants.map((variant, index) => (
                        <tr key={`${variant.sku}-${index}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-full border"
                                style={{
                                  backgroundColor: variant.color?.code,
                                }}
                              />
                              {variant.color?.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">{variant.ram}</td>
                          <td className="px-4 py-3">{variant.storage}</td>
                          <td className="px-4 py-3">
                            {variant.stock === 0 ? (
                              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                                Out of stock
                              </span>
                            ) : (
                              variant.stock
                            )}
                          </td>
                          <td className="px-4 py-3">{variant.price}</td>
                          <td className="px-4 py-3">{variant.sku}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeVariant(index)}
                              className="rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ================= STATUS + RATING ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">
              Product Status &amp; Rating
            </h2>

            <div className="mb-5">
              <Input
                label="Rating (0-5)"
                name="rating"
                type="number"
                value={formData.rating}
                onChange={handleChange}
                placeholder="0"
                min="0"
                max="5"
                step="0.1"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Checkbox
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                label="Active"
              />
              <Checkbox
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleChange}
                label="Featured"
              />
              <Checkbox
                name="isNew"
                checked={formData.isNew}
                onChange={handleChange}
                label="New product"
              />
              <Checkbox
                name="isBestSeller"
                checked={formData.isBestSeller}
                onChange={handleChange}
                label="Best seller"
              />
            </div>
          </section>

          {/* ================= SEO ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">SEO</h2>
            <div className="space-y-5">
              <Input
                label="Meta Title"
                name="metaTitle"
                value={formData.metaTitle}
                onChange={handleChange}
                placeholder="Product SEO title"
              />
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Meta Description
                </label>
                <textarea
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleChange}
                  rows={4}
                  placeholder="SEO description..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </section>

          {/* ================= SUBMIT ================= */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedProductId(null)}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-8 py-4 font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-10 py-4 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ======================================
// INPUT
// ======================================
function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  ...rest
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        {...rest}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50"
      />
    </div>
  );
}

// ======================================
// CHECKBOX
// ======================================
function Checkbox({ name, checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-5 w-5"
      />
      <span className="font-medium text-slate-700">{label}</span>
    </label>
  );
}