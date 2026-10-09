"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";

// New 4-level category API
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
};

export default function AddProductPage() {
  const [loading, setLoading] = useState(false);
  const imageInputRef = useRef(null);
  const [subChildCategories, setSubChildCategories] = useState([]);
  const [formData, setFormData] = useState(initialFormData);

  const [colorName, setColorName] = useState("");
  const [colorCode, setColorCode] = useState("#000000");
  const [colorImage, setColorImage] = useState(null);
  const [colorImagePreview, setColorImagePreview] = useState("");
  const [size, setSize] = useState("");
  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [ramValue, setRamValue] = useState("");
  const [imagePreviews, setImagePreviews] = useState([]);

  // ==============================
  // VARIANTS (color + ram + storage combination)
  // ==============================
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

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showChildCategoryModal, setShowChildCategoryModal] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const [newChildCategoryName, setNewChildCategoryName] = useState("");

  const [categoryAdding, setCategoryAdding] = useState(false);
  const [subCategoryAdding, setSubCategoryAdding] = useState(false);
  const [childCategoryAdding, setChildCategoryAdding] = useState(false);

  const [newSubChildCategoryName, setNewSubChildCategoryName] = useState("");

  const [subChildCategoryAdding, setSubChildCategoryAdding] = useState(false);

  const [showSubChildCategoryModal, setShowSubChildCategoryModal] =
    useState(false);
  // ==============================
  // LOAD 4-LEVEL CATEGORY TREE
  // Main → Sub → Child → Sub Child
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
  // MAIN → SUB
  // ==============================
  useEffect(() => {
    if (!formData.category) {
      setSubCategories([]);
      return;
    }

    const selected = categories.find(
      (category) => category._id === formData.category,
    );

    setSubCategories(selected?.subCategories || []);
  }, [formData.category, categories]);

  // ==============================
  // SUB → CHILD
  // ==============================
  useEffect(() => {
    if (!formData.subCategory) {
      setChildCategories([]);
      return;
    }

    const selected = subCategories.find(
      (subCategory) => subCategory._id === formData.subCategory,
    );

    setChildCategories(selected?.children || []);
  }, [formData.subCategory, subCategories]);

  // ==============================
  // CHILD → SUB CHILD
  // ==============================
  useEffect(() => {
    if (!formData.childCategory) {
      setSubChildCategories([]);
      return;
    }

    const selected = childCategories.find(
      (childCategory) => childCategory._id === formData.childCategory,
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

      // Auto generate slug from name
      if (name === "name") {
        updated.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");
      }

      // Main category বদলালে নিচের সব level reset
      if (name === "category") {
        updated.subCategory = "";
        updated.childCategory = "";
        updated.subChildCategory = "";
      }

      // Sub category বদলালে নিচের দুই level reset
      if (name === "subCategory") {
        updated.childCategory = "";
        updated.subChildCategory = "";
      }

      // Child category বদলালে sub child reset
      if (name === "childCategory") {
        updated.subChildCategory = "";
      }

      // Auto calculate discount percentage
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

    // একই file আবার select করার সুযোগ
    e.target.value = "";
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));

    setImagePreviews((prev) => {
      const updated = [...prev];

      if (updated[index]?.url) {
        URL.revokeObjectURL(updated[index].url);
      }

      updated.splice(index, 1);

      return updated;
    });
  };
  // ==============================
  // COLOR
  // ==============================
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

    const previewUrl = URL.createObjectURL(file);
    setColorImagePreview(previewUrl);

    e.target.value = "";
  };

  const addColor = () => {
    if (!colorName.trim()) {
      alert("Enter color name");
      return;
    }

    if (!colorImage) {
      alert("Please choose an image for this color");
      return;
    }

    if (
      formData.colors.some(
        (c) => c.name.toLowerCase() === colorName.trim().toLowerCase(),
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
      formData.sizes.some((s) => s.toLowerCase() === size.trim().toLowerCase())
    ) {
      alert("This size is already added");
      return;
    }

    setFormData((prev) => ({ ...prev, sizes: [...prev.sizes, size.trim()] }));
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

    if (!key) {
      alert("Please enter specification name");
      return;
    }

    if (!value) {
      alert("Please enter specification value");
      return;
    }

    const exists = formData.specifications.some(
      (item) => item.key.toLowerCase() === key.toLowerCase(),
    );

    if (exists) {
      alert("This specification already exists");
      return;
    }

    const newSpecification = {
      key,
      value,
    };

    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, newSpecification],
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

  const addRam = () => {
    if (!ramValue.trim()) {
      alert("Enter RAM / Memory value");
      return;
    }

    if (
      formData.ram.some(
        (item) => item.toLowerCase() === ramValue.trim().toLowerCase(),
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
  // VARIANTS (color + ram + storage → stock/price/sku)
  // ==============================
  const addVariant = () => {
    if (!variantColorName) {
      alert("Select a color for this variant");
      return;
    }

    if (!variantRam.trim()) {
      alert("Enter RAM for this variant");
      return;
    }

    if (!variantStorage.trim()) {
      alert("Enter storage for this variant");
      return;
    }

    if (variantStock === "" || Number(variantStock) < 0) {
      alert("Enter a valid stock quantity");
      return;
    }

    if (!variantPrice || Number(variantPrice) <= 0) {
      alert("Enter a valid price for this variant");
      return;
    }

    if (!variantSku.trim()) {
      alert("Enter a SKU for this variant");
      return;
    }

    // ==============================
    // SKU MUST BE UNIQUE
    // ==============================
    const skuTaken = formData.variants.some(
      (v) => v.sku?.trim().toLowerCase() === variantSku.trim().toLowerCase(),
    );

    if (skuTaken) {
      alert("This SKU is already used by another variant");
      return;
    }

    // ==============================
    // FIND SELECTED COLOR
    // ==============================
    const selectedColor = formData.colors.find(
      (c) =>
        c.name.trim().toLowerCase() === variantColorName.trim().toLowerCase(),
    );

    if (!selectedColor) {
      alert("Selected color was not found");
      return;
    }

    // ==============================
    // CREATE NEW VARIANT
    // ==============================
    const newVariant = {
      color: {
        name: selectedColor.name,
        code: selectedColor.code || "#000000",
      },

      ram: variantRam.trim(),

      storage: variantStorage.trim(),

      stock: Number(variantStock),

      price: Number(variantPrice),

      sku: variantSku.trim(),
    };

    // ==============================
    // ADD VARIANT
    // ==============================
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));

    // ==============================
    // CLEAR VARIANT FORM
    // ==============================
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
  // RESET FORM
  // ==============================
  const resetForm = () => {
    setFormData(initialFormData);
    setImagePreviews([]);
    setSubCategories([]);
    setChildCategories([]);
    setColorName("");
    setColorCode("#000000");
    setSize("");
    setSpecKey("");
    setSpecValue("");
    setColorImage(null);
    setColorImagePreview("");
    setVariantColorName("");
    setVariantRam("");
    setVariantStorage("");
    setVariantStock("");
    setVariantPrice("");
    setVariantSku("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // ==============================
  // SUBMIT
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.images || formData.images.length === 0) {
      alert("Choose at least one product image");
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
      // ==============================
      // COLORS DATA
      // ==============================
      data.append(
        "additionalCategories",
        JSON.stringify(formData.additionalCategories || []),
      );
      const colorsWithoutFiles = formData.colors.map((color) => ({
        name: color.name,
        code: color.code,
      }));

      data.append("colors", JSON.stringify(colorsWithoutFiles));

      // ==============================
      // COLOR IMAGES
      // ==============================

      formData.colors.forEach((color) => {
        if (color.imageFile) {
          data.append("colorImages", color.imageFile);
        }
      });

      data.append("sizes", JSON.stringify(formData.sizes));

      data.append("ram", JSON.stringify(formData.ram));

      data.append("specifications", JSON.stringify(formData.specifications));

      // ==============================
      // VARIANTS DATA
      // ==============================
      data.append("variants", JSON.stringify(formData.variants));

      data.append("rating", String(rating));
      data.append("isActive", String(formData.isActive));
      data.append("isFeatured", String(formData.isFeatured));
      data.append("isNew", String(formData.isNew));
      data.append("isBestSeller", String(formData.isBestSeller));
      data.append("metaTitle", formData.metaTitle);
      data.append("metaDescription", formData.metaDescription);
      formData.images.forEach((image) => {
        data.append("images", image);
      });

      const response = await fetch(`${API_BASE}/products/addproduct`, {
        method: "POST",
        body: data,
      });

      const text = await response.text();

      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { success: false, message: text || "Invalid server response" };
      }

      if (!response.ok) {
        throw new Error(result.message || "Could not add product");
      }

      alert("Product added");
      resetForm();
    } catch (error) {
      console.error("Add product error:", error);
      alert(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // ADD MAIN CATEGORY
  // ==============================
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Enter a main category name");
      return;
    }

    try {
      setCategoryAdding(true);

      const response = await fetch(CATEGORY_API.main, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Could not add main category");
      }

      const created = data?.category;
      if (!created?._id) throw new Error("Invalid category response");

      const newCategory = { ...created, subCategories: [] };

      setCategories((prev) => [...prev, newCategory]);

      setFormData((prev) => ({
        ...prev,
        category: newCategory._id,
        subCategory: "",
        childCategory: "",
        subChildCategory: "",
      }));

      setNewCategoryName("");
      setShowCategoryModal(false);
    } catch (error) {
      console.error("Add main category error:", error);
      alert(error.message || "Could not add main category");
    } finally {
      setCategoryAdding(false);
    }
  };

  // ==============================
  // ADD SUB CATEGORY
  // ==============================
  const handleAddSubCategory = async () => {
    if (!formData.category) {
      alert("Select a main category first");
      return;
    }

    if (!newSubCategoryName.trim()) {
      alert("Enter a sub category name");
      return;
    }

    try {
      setSubCategoryAdding(true);

      const response = await fetch(CATEGORY_API.sub, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSubCategoryName.trim(),
          mainCategory: formData.category,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Could not add sub category");
      }

      const created = data?.category;
      if (!created?._id) throw new Error("Invalid sub category response");

      const newSubCategory = { ...created, children: [] };

      setCategories((prev) =>
        prev.map((mainCategory) =>
          mainCategory._id === formData.category
            ? {
                ...mainCategory,
                subCategories: [
                  ...(mainCategory.subCategories || []),
                  newSubCategory,
                ],
              }
            : mainCategory,
        ),
      );

      setFormData((prev) => ({
        ...prev,
        subCategory: newSubCategory._id,
        childCategory: "",
        subChildCategory: "",
      }));

      setNewSubCategoryName("");
      setShowSubCategoryModal(false);
    } catch (error) {
      console.error("Add sub category error:", error);
      alert(error.message || "Could not add sub category");
    } finally {
      setSubCategoryAdding(false);
    }
  };

  // ==============================
  // ADD CHILD CATEGORY
  // ==============================
  const handleAddChildCategory = async () => {
    if (!formData.subCategory) {
      alert("Select a sub category first");
      return;
    }

    if (!newChildCategoryName.trim()) {
      alert("Enter a child category name");
      return;
    }

    try {
      setChildCategoryAdding(true);

      const response = await fetch(CATEGORY_API.child, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChildCategoryName.trim(),
          subCategory: formData.subCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Could not add child category");
      }

      const created = data?.category;
      if (!created?._id) throw new Error("Invalid child category response");

      const newChildCategory = { ...created, subChildren: [] };

      setCategories((prev) =>
        prev.map((mainCategory) => {
          if (mainCategory._id !== formData.category) return mainCategory;

          return {
            ...mainCategory,
            subCategories: (mainCategory.subCategories || []).map(
              (subCategory) =>
                subCategory._id === formData.subCategory
                  ? {
                      ...subCategory,
                      children: [
                        ...(subCategory.children || []),
                        newChildCategory,
                      ],
                    }
                  : subCategory,
            ),
          };
        }),
      );

      setFormData((prev) => ({
        ...prev,
        childCategory: newChildCategory._id,
        subChildCategory: "",
      }));

      setNewChildCategoryName("");
      setShowChildCategoryModal(false);
    } catch (error) {
      console.error("Add child category error:", error);
      alert(error.message || "Could not add child category");
    } finally {
      setChildCategoryAdding(false);
    }
  };

  // ==============================
  // ADD SUB CHILD CATEGORY
  // ==============================
  const handleAddSubChildCategory = async () => {
    if (!formData.childCategory) {
      alert("Select a child category first");
      return;
    }

    if (!newSubChildCategoryName.trim()) {
      alert("Enter a sub child category name");
      return;
    }

    try {
      setSubChildCategoryAdding(true);

      const response = await fetch(CATEGORY_API.subChild, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSubChildCategoryName.trim(),
          childCategory: formData.childCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Could not add sub child category");
      }

      const created = data?.category;
      if (!created?._id) {
        throw new Error("Invalid sub child category response");
      }

      const newSubChildCategory = { ...created };

      setCategories((prev) =>
        prev.map((mainCategory) => {
          if (mainCategory._id !== formData.category) return mainCategory;

          return {
            ...mainCategory,
            subCategories: (mainCategory.subCategories || []).map(
              (subCategory) => {
                if (subCategory._id !== formData.subCategory) {
                  return subCategory;
                }

                return {
                  ...subCategory,
                  children: (subCategory.children || []).map((childCategory) =>
                    childCategory._id === formData.childCategory
                      ? {
                          ...childCategory,
                          subChildren: [
                            ...(childCategory.subChildren || []),
                            newSubChildCategory,
                          ],
                        }
                      : childCategory,
                  ),
                };
              },
            ),
          };
        }),
      );

      setFormData((prev) => ({
        ...prev,
        subChildCategory: newSubChildCategory._id,
      }));

      setNewSubChildCategoryName("");
      setShowSubChildCategoryModal(false);
    } catch (error) {
      console.error("Add sub child category error:", error);
      alert(error.message || "Could not add sub child category");
    } finally {
      setSubChildCategoryAdding(false);
    }
  };

  const selectedCategoryName =
    categories.find((c) => c._id === formData.category)?.name || "—";
  const selectedSubCategoryName =
    subCategories.find((s) => s._id === formData.subCategory)?.name || "—";
  const selectedChildCategoryName =
    childCategories.find(
      (childCategory) => childCategory._id === formData.childCategory,
    )?.name || "";
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Add New Product</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new product for your store
          </p>
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

          {/* ================= CATEGORY ================= */}
          {/* ================= CATEGORY & BRAND ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Category &amp; Brand
            </h2>

            {/* ================= MAIN CATEGORY TREE ================= */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {/* ================= CATEGORY ================= */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">
                    Category
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add
                  </button>
                </div>

                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={categoriesLoading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories..."
                      : categories.length === 0
                        ? "No category yet"
                        : "Select category"}
                  </option>

                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                {categoriesError && (
                  <p className="mt-2 text-sm text-red-600">
                    {categoriesError}{" "}
                    <button
                      type="button"
                      onClick={loadCategories}
                      className="font-semibold underline"
                    >
                      Try again
                    </button>
                  </p>
                )}
              </div>

              {/* ================= SUB CATEGORY ================= */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">
                    Sub Category
                  </label>

                  <button
                    type="button"
                    disabled={!formData.category}
                    onClick={() => setShowSubCategoryModal(true)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    + Add
                  </button>
                </div>

                <select
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  disabled={!formData.category}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {!formData.category
                      ? "Select a category first"
                      : subCategories.length === 0
                        ? "No sub category yet"
                        : "Select sub category"}
                  </option>

                  {subCategories.map((subCategory) => (
                    <option key={subCategory._id} value={subCategory._id}>
                      {subCategory.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ================= CHILD CATEGORY ================= */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">
                    Child Category
                  </label>

                  <button
                    type="button"
                    disabled={!formData.subCategory}
                    onClick={() => setShowChildCategoryModal(true)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    + Add
                  </button>
                </div>

                <select
                  name="childCategory"
                  value={formData.childCategory}
                  onChange={handleChange}
                  disabled={!formData.subCategory}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {!formData.subCategory
                      ? "Select a sub category first"
                      : childCategories.length === 0
                        ? "No child category yet"
                        : "Select child category"}
                  </option>

                  {childCategories.map((childCategory) => (
                    <option key={childCategory._id} value={childCategory._id}>
                      {childCategory.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ================= SUB CHILD CATEGORY ================= */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">
                    Sub Child Category
                  </label>

                  <button
                    type="button"
                    disabled={!formData.childCategory}
                    onClick={() => setShowSubChildCategoryModal(true)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    + Add
                  </button>
                </div>

                <select
                  name="subChildCategory"
                  value={formData.subChildCategory}
                  onChange={handleChange}
                  disabled={!formData.childCategory}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {!formData.childCategory
                      ? "Select a child category first"
                      : subChildCategories.length === 0
                        ? "No sub child category yet"
                        : "Select sub child category"}
                  </option>

                  {subChildCategories.map((subChildCategory) => (
                    <option
                      key={subChildCategory._id}
                      value={subChildCategory._id}
                    >
                      {subChildCategory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ================= BRAND ================= */}
            <div className="mt-5 max-w-md">
              <Input
                label="Brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Apple"
              />
            </div>

            {/* =====================================================
      ADDITIONAL CATEGORIES
      ===================================================== */}
            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900">
                  Additional Categories
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Select other main categories where this product should also
                  appear.
                </p>
              </div>

              {categories.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No categories available.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {categories
                    .filter((category) => category._id !== formData.category)
                    .map((category) => {
                      const checked = (
                        formData.additionalCategories || []
                      ).includes(category._id);

                      return (
                        <label
                          key={category._id}
                          className={`
                  flex cursor-pointer items-center gap-3
                  rounded-xl border px-4 py-3
                  transition
                  ${
                    checked
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 bg-white hover:border-blue-300"
                  }
                `}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setFormData((prev) => {
                                const current = prev.additionalCategories || [];

                                if (e.target.checked) {
                                  // duplicate prevent
                                  if (current.includes(category._id)) {
                                    return prev;
                                  }

                                  return {
                                    ...prev,

                                    additionalCategories: [
                                      ...current,
                                      category._id,
                                    ],
                                  };
                                }

                                // uncheck
                                return {
                                  ...prev,

                                  additionalCategories: current.filter(
                                    (id) => id !== category._id,
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
              )}

              {/* Selected category preview */}
              {formData.additionalCategories?.length > 0 && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Selected additional categories:
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {formData.additionalCategories.map((categoryId) => {
                      const category = categories.find(
                        (item) => item._id === categoryId,
                      );

                      if (!category) return null;

                      return (
                        <span
                          key={categoryId}
                          className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                        >
                          {category.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ================= PRICE ================= */}
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

          {/* ================= IMAGE ================= */}
          {/* ================= PRODUCT GALLERY ================= */}
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-slate-900">
              Product Gallery
            </h2>

            <p className="mb-5 text-sm text-slate-500">
              Select multiple product images. You can add as many images as
              needed.
            </p>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full cursor-pointer rounded-xl border border-dashed border-slate-400 bg-slate-50 p-4"
            />

            {/* Gallery Preview */}
            {imagePreviews.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {imagePreviews.map((image, index) => (
                  <div
                    key={`${image.file.name}-${index}`}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <img
                      src={image.url}
                      alt={`Product image ${index + 1}`}
                      className="h-40 w-full object-cover"
                    />

                    {/* Main image badge */}
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                        Main Image
                      </span>
                    )}

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white opacity-90 transition hover:bg-red-600"
                    >
                      ×
                    </button>

                    <div className="p-2">
                      <p className="truncate text-xs text-slate-500">
                        {image.file.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {imagePreviews.length === 0 && (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-600">
                  No images selected
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Select multiple images to create your product gallery
                </p>
              </div>
            )}
          </section>

          {/* ================= COLORS ================= */}
          {/* ================= COLORS ================= */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold">Colors</h2>

            {/* ================= ADD COLOR ================= */}

            <div className="grid gap-4 md:grid-cols-2">
              {/* COLOR NAME */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Color Name
                </label>

                <input
                  type="text"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="Example: Burgundy"
                  className="
          w-full
          rounded-xl
          border
          border-slate-300
          px-4
          py-3
          outline-none
          focus:border-blue-500
        "
                />
              </div>

              {/* COLOR CODE */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Color Code
                </label>

                <div className="flex gap-3">
                  <input
                    type="color"
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    className="
            h-[48px]
            w-[70px]
            cursor-pointer
            rounded-lg
            border
            border-slate-300
          "
                  />

                  <input
                    type="text"
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    className="
            flex-1
            rounded-xl
            border
            border-slate-300
            px-4
            py-3
            uppercase
            outline-none
            focus:border-blue-500
          "
                  />
                </div>
              </div>
            </div>

            {/* ================= COLOR IMAGE ================= */}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Color Image
              </label>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Upload */}

                <label
                  className="
          flex
          h-32
          w-32
          cursor-pointer
          flex-col
          items-center
          justify-center
          overflow-hidden
          rounded-xl
          border-2
          border-dashed
          border-slate-300
          bg-slate-50
          hover:border-blue-500
        "
                >
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

                {/* File information */}

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

            {/* ================= ADD BUTTON ================= */}

            <button
              type="button"
              onClick={addColor}
              className="
      mt-5
      rounded-xl
      bg-blue-600
      px-6
      py-3
      font-medium
      text-white
      transition
      hover:bg-blue-700
    "
            >
              + Add Color
            </button>

            {/* ================= ADDED COLORS ================= */}

            {formData.colors.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Added Colors
                </h3>

                {formData.colors.map((color, index) => (
                  <div
                    key={`${color.name}-${index}`}
                    className="
            flex
            items-center
            justify-between
            gap-4
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            p-3
          "
                  >
                    <div className="flex items-center gap-4">
                      {/* IMAGE */}

                      {color.imagePreview ? (
                        <img
                          src={color.imagePreview}
                          alt={color.name}
                          className="
                  h-16
                  w-16
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  object-contain
                  p-1
                "
                        />
                      ) : (
                        <div
                          className="
                  h-16
                  w-16
                  rounded-lg
                  border
                  bg-white
                "
                        />
                      )}

                      {/* COLOR */}

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="
                    h-5
                    w-5
                    rounded-full
                    border
                  "
                            style={{
                              backgroundColor: color.code,
                            }}
                          />

                          <span className="font-medium">{color.name}</span>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {color.code}
                        </p>
                      </div>
                    </div>

                    {/* REMOVE */}

                    <button
                      type="button"
                      onClick={() => removeColor(index)}
                      className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              bg-red-50
              text-red-500
              hover:bg-red-100
            "
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
                    aria-label={`Remove ${item}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ================= SPECIFICATIONS ================= */}
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

            {/* Add Specification */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-800">
                Add Specification
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Specification Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Specification Name
                  </label>

                  <input
                    value={specKey}
                    onChange={(e) => setSpecKey(e.target.value)}
                    placeholder="e.g. Display Type"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Specification Value */}
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
                    placeholder="e.g. LTPO Super Retina XDR OLED, 120Hz"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addSpecification}
                className="mt-4 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                + Add Specification
              </button>
            </div>

            {/* RAM / MEMORY */}
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
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={addRam}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
                >
                  + Add Memory
                </button>
              </div>

              {/* RAM Array */}
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

            {/* ADDED SPECIFICATIONS */}
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
                        {/* Key */}
                        <div className="bg-slate-50 px-4 py-4 font-medium text-slate-700">
                          {item.key}
                        </div>

                        {/* Value */}
                        <div className="px-4 py-4 text-sm text-slate-600">
                          {item.value}
                        </div>

                        {/* Remove */}
                        <div className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeSpecification(index)}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700"
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
                Combine a color, RAM and storage to create a purchasable variant
                with its own stock, price and SKU.
              </p>
            </div>

            {formData.colors.length === 0 && (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Add at least one color above before creating variants.
              </p>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {/* COLOR */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Color
                  </label>

                  <select
                    value={variantColorName}
                    onChange={(e) => setVariantColorName(e.target.value)}
                    disabled={formData.colors.length === 0}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">Select color</option>
                    {formData.colors.map((color) => (
                      <option key={color.name} value={color.name}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* RAM */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    RAM
                  </label>

                  <input
                    list="variant-ram-options"
                    value={variantRam}
                    onChange={(e) => setVariantRam(e.target.value)}
                    placeholder="8GB"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <datalist id="variant-ram-options">
                    {formData.ram.map((item, index) => (
                      <option key={`${item}-${index}`} value={item} />
                    ))}
                  </datalist>
                </div>

                {/* STORAGE */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Storage
                  </label>

                  <input
                    value={variantStorage}
                    onChange={(e) => setVariantStorage(e.target.value)}
                    placeholder="256GB"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* STOCK */}
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* PRICE */}
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* SKU */}
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addVariant}
                disabled={formData.colors.length === 0}
                className="mt-4 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add Variant
              </button>
            </div>

            {/* ADDED VARIANTS */}
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
                                  backgroundColor: variant.color.code,
                                }}
                              />
                              {variant.color.name}
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
                              className="rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700"
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
              onClick={resetForm}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-8 py-4 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Clear form
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-10 py-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Adding product..." : "Add product"}
            </button>
          </div>
        </form>
      </div>

      {/* ================= CATEGORY MODAL ================= */}
      <Modal
        open={showCategoryModal}
        title="Add category"
        onClose={() => {
          setShowCategoryModal(false);
          setNewCategoryName("");
        }}
      >
        <input
          autoFocus
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCategory();
            }
          }}
          placeholder="Category name"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setShowCategoryModal(false);
              setNewCategoryName("");
            }}
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAddCategory}
            disabled={categoryAdding}
            className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {categoryAdding ? "Saving..." : "Save category"}
          </button>
        </div>
      </Modal>

      {/* ================= SUB CATEGORY MODAL ================= */}
      <Modal
        open={showSubCategoryModal}
        title="Add sub category"
        onClose={() => {
          setShowSubCategoryModal(false);
          setNewSubCategoryName("");
        }}
      >
        <p className="mb-3 text-sm text-slate-500">
          Under{" "}
          <span className="font-semibold text-slate-700">
            {selectedCategoryName}
          </span>
        </p>

        <input
          autoFocus
          value={newSubCategoryName}
          onChange={(e) => setNewSubCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddSubCategory();
            }
          }}
          placeholder="Sub category name"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setShowSubCategoryModal(false);
              setNewSubCategoryName("");
            }}
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAddSubCategory}
            disabled={subCategoryAdding}
            className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {subCategoryAdding ? "Saving..." : "Save sub category"}
          </button>
        </div>
      </Modal>

      {/* ================= CHILD CATEGORY MODAL ================= */}
      <Modal
        open={showChildCategoryModal}
        title="Add child category"
        onClose={() => {
          setShowChildCategoryModal(false);
          setNewChildCategoryName("");
        }}
      >
        <p className="mb-3 text-sm text-slate-500">
          Under{" "}
          <span className="font-semibold text-slate-700">
            {selectedCategoryName} › {selectedSubCategoryName}
          </span>
        </p>

        <input
          autoFocus
          value={newChildCategoryName}
          onChange={(e) => setNewChildCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddChildCategory();
            }
          }}
          placeholder="Child category name"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setShowChildCategoryModal(false);
              setNewChildCategoryName("");
            }}
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAddChildCategory}
            disabled={childCategoryAdding}
            className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {childCategoryAdding ? "Saving..." : "Save child category"}
          </button>
        </div>
      </Modal>

      <Modal
        open={showSubChildCategoryModal}
        title="Add sub child category"
        onClose={() => {
          setShowSubChildCategoryModal(false);
          setNewSubChildCategoryName("");
        }}
      >
        <p className="mb-3 text-sm text-slate-500">
          Under{" "}
          <span className="font-semibold text-slate-700">
            {selectedCategoryName} › {selectedSubCategoryName} ›{" "}
            {selectedChildCategoryName}
          </span>
        </p>

        <input
          autoFocus
          value={newSubChildCategoryName}
          onChange={(e) => setNewSubChildCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddSubChildCategory();
            }
          }}
          placeholder="Sub child category name"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setShowSubChildCategoryModal(false);
              setNewSubChildCategoryName("");
            }}
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAddSubChildCategory}
            disabled={subChildCategoryAdding}
            className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {subChildCategoryAdding ? "Saving..." : "Save sub child category"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ======================================
// MODAL
// ======================================
function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ======================================
// INPUT COMPONENT
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
