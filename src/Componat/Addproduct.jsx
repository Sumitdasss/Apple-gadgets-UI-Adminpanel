"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import RichTextEditor from "./RichTextEditor";
import { showReviewToast } from "./SavedToast";

const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";

const CATEGORY_API = {
  tree: `${API_BASE}/api/dashboard/tree`,
  main: `${API_BASE}/api/dashboard/main`,
  sub: `${API_BASE}/api/dashboard/sub`,
  child: `${API_BASE}/api/dashboard/child`,
  subChild: `${API_BASE}/api/dashboard/sub-child`,
};

const initialFormData = {
  name: "",
  slug: "",
  description: "",
  shortDescription: "",
  descriptionSections: [],
  category: "",
  subCategory: "",
  childCategory: "",
  subChildCategory: "",
  brand: "",
  costPrice:"",
  price: "",
  discountPrice: "",
  discountPercentage: "",
  additionalCategories: [],
  stock: "",
  sku: "",
  colors: [],
  sizes: [],
  specifications: [],
  keyFeatures: [],
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
  const [keyFeatureInput, setKeyFeatureInput] = useState("");
  const [colorName, setColorName] = useState("");
  const [colorCode, setColorCode] = useState("#000000");
  const [colorImage, setColorImage] = useState(null);
  const [colorImagePreview, setColorImagePreview] = useState("");
  const [size, setSize] = useState("");
  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [ramValue, setRamValue] = useState("");
  const [imagePreviews, setImagePreviews] = useState([]);

  // Variants
  const [variantColorName, setVariantColorName] = useState("");
  const [variantRam, setVariantRam] = useState("");
  const [variantStorage, setVariantStorage] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantCostPrice, setVariantCostPrice] = useState("");
  const [variantSku, setVariantSku] = useState("");

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [childCategories, setChildCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showChildCategoryModal, setShowChildCategoryModal] = useState(false);
  const [showSubChildCategoryModal, setShowSubChildCategoryModal] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const [newChildCategoryName, setNewChildCategoryName] = useState("");
  const [newSubChildCategoryName, setNewSubChildCategoryName] = useState("");

  // Category images
  const [newCategoryImage, setNewCategoryImage] = useState(null);
  const [newCategoryImagePreview, setNewCategoryImagePreview] = useState("");
  const [newSubCategoryImage, setNewSubCategoryImage] = useState(null);
  const [newSubCategoryImagePreview, setNewSubCategoryImagePreview] = useState("");
  const [newChildCategoryImage, setNewChildCategoryImage] = useState(null);
  const [newChildCategoryImagePreview, setNewChildCategoryImagePreview] = useState("");
  const [newSubChildCategoryImage, setNewSubChildCategoryImage] = useState(null);
  const [newSubChildCategoryImagePreview, setNewSubChildCategoryImagePreview] = useState("");

  // Banner images
  const [newCategoryBannerImage, setNewCategoryBannerImage] = useState(null);
  const [newCategoryBannerPreview, setNewCategoryBannerPreview] = useState("");
  const [newSubCategoryBannerImage, setNewSubCategoryBannerImage] = useState(null);
  const [newSubCategoryBannerPreview, setNewSubCategoryBannerPreview] = useState("");
  const [newChildCategoryBannerImage, setNewChildCategoryBannerImage] = useState(null);
  const [newChildCategoryBannerPreview, setNewChildCategoryBannerPreview] = useState("");
  const [newSubChildCategoryBannerImage, setNewSubChildCategoryBannerImage] = useState(null);
  const [newSubChildCategoryBannerPreview, setNewSubChildCategoryBannerPreview] = useState("");

  const [categoryAdding, setCategoryAdding] = useState(false);
  const [subCategoryAdding, setSubCategoryAdding] = useState(false);
  const [childCategoryAdding, setChildCategoryAdding] = useState(false);
  const [subChildCategoryAdding, setSubChildCategoryAdding] = useState(false);

  // Description sections
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [sectionImage, setSectionImage] = useState(null);
  const [sectionImagePreview, setSectionImagePreview] = useState("");


const getAdminToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

  // All admin API calls go through this so Authorization is always attached
  const authFetch = async (url, options = {}) => {
    const token = getAdminToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    // Never force Content-Type when body is FormData
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



  const handleSectionImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showReviewToast("Please select a valid image", 8000, "error");
      e.target.value = "";
      return;
    }
    if (sectionImagePreview) URL.revokeObjectURL(sectionImagePreview);
    setSectionImage(file);
    setSectionImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const addDescriptionSection = () => {
    if (!sectionTitle.trim()) {
      showReviewToast("Please enter a heading", 8000, "error");
      return;
    }
    if (!sectionDescription.trim()) {
      showReviewToast("Please enter a description", 8000, "error");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      descriptionSections: [
        ...prev.descriptionSections,
        {
          title: sectionTitle.trim(),
          description: sectionDescription.trim(),
          imageFile: sectionImage,
          imagePreview: sectionImagePreview,
        },
      ],
    }));
    setSectionTitle("");
    setSectionDescription("");
    setSectionImage(null);
    setSectionImagePreview("");
  };

  const removeDescriptionSection = (index) => {
    setFormData((prev) => {
      const section = prev.descriptionSections[index];
      if (section?.imagePreview) URL.revokeObjectURL(section.imagePreview);
      return {
        ...prev,
        descriptionSections: prev.descriptionSections.filter((_, i) => i !== index),
      };
    });
  };

  // ==============================
  // LOAD CATEGORIES
  // ==============================
  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError("");
      const response = await authFetch(CATEGORY_API.tree, { method: "GET", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Could not load categories");
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
    const selected = subCategories.find((s) => s._id === formData.subCategory);
    setChildCategories(selected?.children || []);
  }, [formData.subCategory, subCategories]);

  useEffect(() => {
    if (!formData.childCategory) {
      setSubChildCategories([]);
      return;
    }
    const selected = childCategories.find((c) => c._id === formData.childCategory);
    setSubChildCategories(selected?.subChildren || []);
  }, [formData.childCategory, childCategories]);

  // ==============================
  // KEY FEATURES
  // ==============================
  const addKeyFeature = () => {
    const feature = keyFeatureInput.trim();
    if (!feature) {
      showReviewToast("Please enter a key feature", 8000, "error");
      return;
    }
    if (formData.keyFeatures.some((item) => item.toLowerCase() === feature.toLowerCase())) {
      showReviewToast("This key feature already exists", 8000, "error");
      return;
    }
    setFormData((prev) => ({ ...prev, keyFeatures: [...prev.keyFeatures, feature] }));
    setKeyFeatureInput("");
  };

  const removeKeyFeature = (index) => {
    setFormData((prev) => ({
      ...prev,
      keyFeatures: prev.keyFeatures.filter((_, i) => i !== index),
    }));
  };

  // ==============================
  // INPUT CHANGE
  // ==============================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };

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
        const price = name === "price" ? parseFloat(value) : parseFloat(prev.price);
        const discountPrice =
          name === "discountPrice" ? parseFloat(value) : parseFloat(prev.discountPrice);
        if (price > 0 && discountPrice > 0 && discountPrice < price) {
          updated.discountPercentage = (((price - discountPrice) / price) * 100).toFixed(2);
        } else {
          updated.discountPercentage = "";
        }
      }
      return updated;
    });
  };

  // ==============================
  // IMAGES
  // ==============================
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length !== files.length) {
      showReviewToast("Only image files are allowed", 8000, "error");
    }
    if (!validFiles.length) return;
    setFormData((prev) => ({ ...prev, images: [...prev.images, ...validFiles] }));
    const newPreviews = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeImage = (index) => {
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

  // ==============================
  // COLOR
  // ==============================
  const handleColorImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showReviewToast("Only image files are allowed", 8000, "error");
      return;
    }
    setColorImage(file);
    setColorImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const addColor = () => {
    if (!colorName.trim()) {
      showReviewToast("Enter color name", 8000, "error");
      return;
    }
    if (!colorImage) {
      showReviewToast("Please choose an image for this color", 8000, "error");
      return;
    }
    if (formData.colors.some((c) => c.name.toLowerCase() === colorName.trim().toLowerCase())) {
      showReviewToast("This color is already added", 8000, "error");
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
  // SIZE / SPEC / RAM
  // ==============================
  const addSize = () => {
    if (!size.trim()) return;
    if (formData.sizes.some((s) => s.toLowerCase() === size.trim().toLowerCase())) {
      showReviewToast("This size is already added", 8000, "error");
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

  const addSpecification = () => {
    const key = specKey.trim();
    const value = specValue.trim();
    if (!key) {
      showReviewToast("Please enter specification name", 8000, "error");
      return;
    }
    if (!value) {
      showReviewToast("Please enter specification value", 8000, "error");
      return;
    }
    if (formData.specifications.some((item) => item.key.toLowerCase() === key.toLowerCase())) {
      showReviewToast("This specification already exists", 8000, "error");
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

  const addRam = () => {
    if (!ramValue.trim()) {
      showReviewToast("Enter RAM / Memory value", 8000, "error");
      return;
    }
    if (formData.ram.some((item) => item.toLowerCase() === ramValue.trim().toLowerCase())) {
      showReviewToast("This RAM / Memory is already added", 8000, "error");
      return;
    }
    setFormData((prev) => ({ ...prev, ram: [...prev.ram, ramValue.trim()] }));
    setRamValue("");
  };

  const removeRam = (index) => {
    setFormData((prev) => ({
      ...prev,
      ram: prev.ram.filter((_, i) => i !== index),
    }));
  };

  // ==============================
  // VARIANTS
  // ==============================
  const addVariant = () => {
    if (!variantColorName) {
      showReviewToast("Select a color for this variant", 8000, "error");
      return;
    }
    if (!variantRam.trim()) {
      showReviewToast("Enter RAM for this variant", 8000, "error");
      return;
    }
    if (!variantStorage.trim()) {
      showReviewToast("Enter storage for this variant", 8000, "error");
      return;
    }
    if (variantStock === "" || Number(variantStock) < 0) {
      showReviewToast("Enter a valid stock quantity", 8000, "error");
      return;
    }
    if (!variantPrice || Number(variantPrice) <= 0) {
      showReviewToast("Enter a valid price for this variant", 8000, "error");
      return;
    }
    if (variantCostPrice !== "" && Number(variantCostPrice) < 0) {
      showReviewToast("Enter a valid cost price for this variant", 8000, "error");
      return;
    }
    if (!variantSku.trim()) {
      showReviewToast("Enter a SKU for this variant", 8000, "error");
      return;
    }
    const skuTaken = formData.variants.some(
      (v) => v.sku?.trim().toLowerCase() === variantSku.trim().toLowerCase()
    );
    if (skuTaken) {
      showReviewToast("This SKU is already used by another variant", 8000, "error");
      return;
    }
    const selectedColor = formData.colors.find(
      (c) => c.name.trim().toLowerCase() === variantColorName.trim().toLowerCase()
    );
    if (!selectedColor) {
      showReviewToast("Selected color was not found", 8000, "error");
      return;
    }
    const newVariant = {
      color: { name: selectedColor.name, code: selectedColor.code || "#000000" },
      ram: variantRam.trim(),
      storage: variantStorage.trim(),
      stock: Number(variantStock),
      costPrice: variantCostPrice === "" ? 0 : Number(variantCostPrice),
      price: Number(variantPrice),
      sku: variantSku.trim(),
    };
    setFormData((prev) => ({ ...prev, variants: [...prev.variants, newVariant] }));
    setVariantColorName("");
    setVariantRam("");
    setVariantStorage("");
    setVariantStock("");
    setVariantPrice("");
    setVariantCostPrice("");
    setVariantSku("");
  };

  const removeVariant = (index) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  // ==============================
  // RESET
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
    setVariantCostPrice("");
    setVariantSku("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // ==============================
  // SUBMIT
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.images || formData.images.length === 0) {
      showReviewToast("Choose at least one product image", 8000, "error");
      return;
    }
    const rating = parseFloat(formData.rating);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      showReviewToast("Rating must be between 0 and 5", 8000, "error");
      return;
    }
    if (
      formData.discountPrice &&
      parseFloat(formData.discountPrice) >= parseFloat(formData.price)
    ) {
      showReviewToast("Discount price must be lower than price", 8000, "error");
      return;
    }

    try {
      setLoading(true);
      const data = new FormData();

      data.append("name", formData.name);
      data.append("slug", formData.slug);
      data.append("description", formData.description);

      const sectionsMetadata = formData.descriptionSections.map((section, index) => ({
        title: section.title,
        description: section.description,
        imageIndex: section.imageFile ? index : null,
      }));
      data.append("descriptionSections", JSON.stringify(sectionsMetadata));
      formData.descriptionSections.forEach((section) => {
        if (section.imageFile) data.append("descriptionSectionImages", section.imageFile);
      });

      data.append("shortDescription", formData.shortDescription);
      data.append("category", formData.category);
      data.append("subCategory", formData.subCategory);
      data.append("childCategory", formData.childCategory);
      data.append("subChildCategory", formData.subChildCategory);
      data.append("brand", formData.brand);
      data.append("price", formData.price);
      data.append("costPrice", formData.costPrice);
      data.append("discountPrice", formData.discountPrice || "");
      data.append("discountPercentage", formData.discountPercentage || "");
      data.append("stock", formData.stock);
      data.append("sku", formData.sku);
      data.append("additionalCategories", JSON.stringify(formData.additionalCategories || []));

      const colorsWithoutFiles = formData.colors.map((c) => ({ name: c.name, code: c.code }));
      data.append("colors", JSON.stringify(colorsWithoutFiles));
      formData.colors.forEach((color) => {
        if (color.imageFile) data.append("colorImages", color.imageFile);
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
      data.append("keyFeatures", JSON.stringify(formData.keyFeatures));

      formData.images.forEach((image) => data.append("images", image));

      const response = await authFetch(`${API_BASE}/api/dashboard/addproduct`, {
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

      if (!response.ok) throw new Error(result.message || "Could not add product");

      showReviewToast("Product added successfully", 8000, "success");
      resetForm();
    } catch (error) {
      console.error("Add product error:", error);
      showReviewToast(error.message || "Something went wrong", 8000, "error");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // CATEGORY HANDLERS
  // ==============================
  const handleCategoryImageChange = (e, level) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showReviewToast("Only image files are allowed", 8000, "error");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (level === "main") {
      setNewCategoryImage(file);
      setNewCategoryImagePreview(previewUrl);
    } else if (level === "sub") {
      setNewSubCategoryImage(file);
      setNewSubCategoryImagePreview(previewUrl);
    } else if (level === "child") {
      setNewChildCategoryImage(file);
      setNewChildCategoryImagePreview(previewUrl);
    } else if (level === "subChild") {
      setNewSubChildCategoryImage(file);
      setNewSubChildCategoryImagePreview(previewUrl);
    }
    e.target.value = "";
  };

  const clearCategoryImage = (level) => {
    if (level === "main") {
      if (newCategoryImagePreview) URL.revokeObjectURL(newCategoryImagePreview);
      setNewCategoryImage(null);
      setNewCategoryImagePreview("");
    } else if (level === "sub") {
      if (newSubCategoryImagePreview) URL.revokeObjectURL(newSubCategoryImagePreview);
      setNewSubCategoryImage(null);
      setNewSubCategoryImagePreview("");
    } else if (level === "child") {
      if (newChildCategoryImagePreview) URL.revokeObjectURL(newChildCategoryImagePreview);
      setNewChildCategoryImage(null);
      setNewChildCategoryImagePreview("");
    } else if (level === "subChild") {
      if (newSubChildCategoryImagePreview) URL.revokeObjectURL(newSubChildCategoryImagePreview);
      setNewSubChildCategoryImage(null);
      setNewSubChildCategoryImagePreview("");
    }
  };

  const handleCategoryBannerChange = (e, level) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showReviewToast("Only image files are allowed", 8000, "error");
      e.target.value = "";
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const config = {
      main: [setNewCategoryBannerImage, setNewCategoryBannerPreview, newCategoryBannerPreview],
      sub: [setNewSubCategoryBannerImage, setNewSubCategoryBannerPreview, newSubCategoryBannerPreview],
      child: [setNewChildCategoryBannerImage, setNewChildCategoryBannerPreview, newChildCategoryBannerPreview],
      subChild: [
        setNewSubChildCategoryBannerImage,
        setNewSubChildCategoryBannerPreview,
        newSubChildCategoryBannerPreview,
      ],
    }[level];
    if (!config) {
      URL.revokeObjectURL(previewUrl);
      return;
    }
    if (config[2]) URL.revokeObjectURL(config[2]);
    config[0](file);
    config[1](previewUrl);
    e.target.value = "";
  };

  const clearCategoryBanner = (level) => {
    const config = {
      main: [setNewCategoryBannerImage, setNewCategoryBannerPreview, newCategoryBannerPreview],
      sub: [setNewSubCategoryBannerImage, setNewSubCategoryBannerPreview, newSubCategoryBannerPreview],
      child: [setNewChildCategoryBannerImage, setNewChildCategoryBannerPreview, newChildCategoryBannerPreview],
      subChild: [
        setNewSubChildCategoryBannerImage,
        setNewSubChildCategoryBannerPreview,
        newSubChildCategoryBannerPreview,
      ],
    }[level];
    if (!config) return;
    if (config[2]) URL.revokeObjectURL(config[2]);
    config[0](null);
    config[1]("");
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      showReviewToast("Enter a main category name", 8000, "error");
      return;
    }
    try {
      setCategoryAdding(true);
      const formDataToSend = new FormData();
      formDataToSend.append("name", newCategoryName.trim());
      if (newCategoryImage) formDataToSend.append("image", newCategoryImage);
      if (newCategoryBannerImage) formDataToSend.append("bannerImage", newCategoryBannerImage);

      const response = await authFetch(CATEGORY_API.main, {
        method: "POST",
        body: formDataToSend,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Could not add main category");
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
      clearCategoryImage("main");
      clearCategoryBanner("main");
      setShowCategoryModal(false);
    } catch (error) {
      console.error(error);
      showReviewToast(error.message || "Could not add main category", 8000, "error");
    } finally {
      setCategoryAdding(false);
    }
  };

  const handleAddSubCategory = async () => {
    if (!formData.category) {
      showReviewToast("Select a main category first", 8000, "error");
      return;
    }
    if (!newSubCategoryName.trim()) {
      showReviewToast("Enter a sub category name", 8000, "error");
      return;
    }
    try {
      setSubCategoryAdding(true);
      const formDataToSend = new FormData();
      formDataToSend.append("name", newSubCategoryName.trim());
      formDataToSend.append("mainCategory", formData.category);
      if (newSubCategoryImage) formDataToSend.append("image", newSubCategoryImage);
      if (newSubCategoryBannerImage) formDataToSend.append("bannerImage", newSubCategoryBannerImage);

      const response = await authFetch(CATEGORY_API.sub, {
        method: "POST",
        body: formDataToSend,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Could not add sub category");
      const created = data?.category;
      if (!created?._id) throw new Error("Invalid sub category response");

      const newSubCategory = { ...created, children: [] };
      setCategories((prev) =>
        prev.map((main) =>
          main._id === formData.category
            ? { ...main, subCategories: [...(main.subCategories || []), newSubCategory] }
            : main
        )
      );
      setFormData((prev) => ({
        ...prev,
        subCategory: newSubCategory._id,
        childCategory: "",
        subChildCategory: "",
      }));
      setNewSubCategoryName("");
      clearCategoryImage("sub");
      clearCategoryBanner("sub");
      setShowSubCategoryModal(false);
    } catch (error) {
      console.error(error);
      showReviewToast(error.message || "Could not add sub category", 8000, "error");
    } finally {
      setSubCategoryAdding(false);
    }
  };

  const handleAddChildCategory = async () => {
    if (!formData.subCategory) {
      showReviewToast("Select a sub category first", 8000, "error");
      return;
    }
    if (!newChildCategoryName.trim()) {
      showReviewToast("Enter a child category name", 8000, "error");
      return;
    }
    try {
      setChildCategoryAdding(true);
      const formDataToSend = new FormData();
      formDataToSend.append("name", newChildCategoryName.trim());
      formDataToSend.append("subCategory", formData.subCategory);
      if (newChildCategoryImage) formDataToSend.append("image", newChildCategoryImage);
      if (newChildCategoryBannerImage) formDataToSend.append("bannerImage", newChildCategoryBannerImage);

      const response = await authFetch(CATEGORY_API.child, {
        method: "POST",
        body: formDataToSend,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Could not add child category");
      const created = data?.category;
      if (!created?._id) throw new Error("Invalid child category response");

      const newChildCategory = { ...created, subChildren: [] };
      setCategories((prev) =>
        prev.map((main) => {
          if (main._id !== formData.category) return main;
          return {
            ...main,
            subCategories: (main.subCategories || []).map((sub) =>
              sub._id === formData.subCategory
                ? { ...sub, children: [...(sub.children || []), newChildCategory] }
                : sub
            ),
          };
        })
      );
      setFormData((prev) => ({
        ...prev,
        childCategory: newChildCategory._id,
        subChildCategory: "",
      }));
      setNewChildCategoryName("");
      clearCategoryImage("child");
      clearCategoryBanner("child");
      setShowChildCategoryModal(false);
    } catch (error) {
      console.error(error);
      showReviewToast(error.message || "Could not add child category", 8000, "error");
    } finally {
      setChildCategoryAdding(false);
    }
  };

  const handleAddSubChildCategory = async () => {
    if (!formData.childCategory) {
      showReviewToast("Select a child category first", 8000, "error");
      return;
    }
    if (!newSubChildCategoryName.trim()) {
      showReviewToast("Enter a sub child category name", 8000, "error");
      return;
    }
    try {
      setSubChildCategoryAdding(true);
      const formDataToSend = new FormData();
      formDataToSend.append("name", newSubChildCategoryName.trim());
      formDataToSend.append("childCategory", formData.childCategory);
      if (newSubChildCategoryImage) formDataToSend.append("image", newSubChildCategoryImage);
      if (newSubChildCategoryBannerImage)
        formDataToSend.append("bannerImage", newSubChildCategoryBannerImage);

      const response = await authFetch(CATEGORY_API.subChild, {
        method: "POST",
        body: formDataToSend,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Could not add sub child category");
      const created = data?.category;
      if (!created?._id) throw new Error("Invalid sub child category response");

      const newSubChildCategory = { ...created };
      setCategories((prev) =>
        prev.map((main) => {
          if (main._id !== formData.category) return main;
          return {
            ...main,
            subCategories: (main.subCategories || []).map((sub) => {
              if (sub._id !== formData.subCategory) return sub;
              return {
                ...sub,
                children: (sub.children || []).map((child) =>
                  child._id === formData.childCategory
                    ? {
                        ...child,
                        subChildren: [...(child.subChildren || []), newSubChildCategory],
                      }
                    : child
                ),
              };
            }),
          };
        })
      );
      setFormData((prev) => ({ ...prev, subChildCategory: newSubChildCategory._id }));
      setNewSubChildCategoryName("");
      clearCategoryImage("subChild");
      clearCategoryBanner("subChild");
      setShowSubChildCategoryModal(false);
    } catch (error) {
      console.error(error);
      showReviewToast(error.message || "Could not add sub child category", 8000, "error");
    } finally {
      setSubChildCategoryAdding(false);
    }
  };

  const selectedCategoryName =
    categories.find((c) => c._id === formData.category)?.name || "—";
  const selectedSubCategoryName =
    subCategories.find((s) => s._id === formData.subCategory)?.name || "—";
  const selectedChildCategoryName =
    childCategories.find((c) => c._id === formData.childCategory)?.name || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 15000,
          style: { padding: 0, background: "transparent", boxShadow: "none" },
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Add New Product
          </h1>
          <p className="mt-2 text-slate-500">
            Create a premium product listing for your store
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-28">
          {/* ================= BASIC INFORMATION ================= */}
          <Section title="Basic Information" subtitle="Product name, description & details">
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

              {/* Description Builder */}
              <div className="md:col-span-2">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-slate-800">
                    Product Description Builder
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Add headings, rich text and images for each section
                  </p>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Section Heading
                    </label>
                    <input
                      type="text"
                      value={sectionTitle}
                      onChange={(e) => setSectionTitle(e.target.value)}
                      placeholder="e.g. Pro Camera System"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Section Description
                    </label>
                    <RichTextEditor value={sectionDescription} onChange={setSectionDescription} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Section Image (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSectionImageChange}
                      className="w-full rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {sectionImagePreview && (
                      <div className="mt-3">
                        <img
                          src={sectionImagePreview}
                          alt="Section preview"
                          className="h-48 w-full rounded-xl bg-white object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(sectionImagePreview);
                            setSectionImage(null);
                            setSectionImagePreview("");
                          }}
                          className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Remove image
                        </button>
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={addDescriptionSection} className="btn-primary">
                    + Add Description Section
                  </button>
                </div>

                {/* Added Sections */}
                <div className="mt-5 space-y-4">
                  {formData.descriptionSections.map((section, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-lg font-semibold text-slate-900">
                          {index + 1}. {section.title}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeDescriptionSection(index)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      <div
                        className="product-description-content mt-3 text-sm leading-7 text-slate-600"
                        dangerouslySetInnerHTML={{ __html: section.description || "" }}
                      />
                      {section.imagePreview && (
                        <img
                          src={section.imagePreview}
                          alt={section.title || "Product section"}
                          className="mt-4 max-h-72 w-full rounded-xl bg-slate-50 object-contain"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Short Description
                </label>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Short product description..."
                  className="input-field resize-none"
                />
              </div>
            </div>
          </Section>

          {/* ================= CATEGORY & BRAND ================= */}
          <Section title="Category & Brand" subtitle="Organize your product hierarchy">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {/* Main Category */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Category</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
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
                  className="input-field"
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading..."
                      : categories.length === 0
                        ? "No category yet"
                        : "Select category"}
                  </option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categoriesError && (
                  <p className="mt-2 text-sm text-red-600">
                    {categoriesError}{" "}
                    <button type="button" onClick={loadCategories} className="font-semibold underline">
                      Try again
                    </button>
                  </p>
                )}
              </div>

              {/* Sub Category */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Sub Category</label>
                  <button
                    type="button"
                    disabled={!formData.category}
                    onClick={() => setShowSubCategoryModal(true)}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    + Add
                  </button>
                </div>
                <select
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  disabled={!formData.category}
                  className="input-field"
                >
                  <option value="">
                    {!formData.category
                      ? "Select category first"
                      : subCategories.length === 0
                        ? "No sub category yet"
                        : "Select sub category"}
                  </option>
                  {subCategories.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Child Category */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Child Category</label>
                  <button
                    type="button"
                    disabled={!formData.subCategory}
                    onClick={() => setShowChildCategoryModal(true)}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    + Add
                  </button>
                </div>
                <select
                  name="childCategory"
                  value={formData.childCategory}
                  onChange={handleChange}
                  disabled={!formData.subCategory}
                  className="input-field"
                >
                  <option value="">
                    {!formData.subCategory
                      ? "Select sub category first"
                      : childCategories.length === 0
                        ? "No child category yet"
                        : "Select child category"}
                  </option>
                  {childCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub Child Category */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Sub Child Category</label>
                  <button
                    type="button"
                    disabled={!formData.childCategory}
                    onClick={() => setShowSubChildCategoryModal(true)}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    + Add
                  </button>
                </div>
                <select
                  name="subChildCategory"
                  value={formData.subChildCategory}
                  onChange={handleChange}
                  disabled={!formData.childCategory}
                  className="input-field"
                >
                  <option value="">
                    {!formData.childCategory
                      ? "Select child category first"
                      : subChildCategories.length === 0
                        ? "No sub child yet"
                        : "Select sub child category"}
                  </option>
                  {subChildCategories.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
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
            <div className="mt-8 border-t border-slate-200 pt-6">
              <h3 className="text-base font-semibold text-slate-800">Additional Categories</h3>
              <p className="mt-1 text-sm text-slate-500">
                Select other main categories where this product should also appear
              </p>

              {categories.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No categories available.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {categories
                    .filter((c) => c._id !== formData.category)
                    .map((category) => {
                      const checked = (formData.additionalCategories || []).includes(category._id);
                      return (
                        <label
                          key={category._id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            checked
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-slate-200 bg-white hover:border-indigo-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setFormData((prev) => {
                                const current = prev.additionalCategories || [];
                                if (e.target.checked) {
                                  if (current.includes(category._id)) return prev;
                                  return {
                                    ...prev,
                                    additionalCategories: [...current, category._id],
                                  };
                                }
                                return {
                                  ...prev,
                                  additionalCategories: current.filter((id) => id !== category._id),
                                };
                              });
                            }}
                            className="h-4 w-4 accent-indigo-600"
                          />
                          <span className="text-sm font-medium text-slate-700">{category.name}</span>
                        </label>
                      );
                    })}
                </div>
              )}

              {formData.additionalCategories?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {formData.additionalCategories.map((id) => {
                    const cat = categories.find((c) => c._id === id);
                    if (!cat) return null;
                    return (
                      <span
                        key={id}
                        className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700"
                      >
                        {cat.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>

          {/* ================= PRICING ================= */}
          <Section title="Pricing & Inventory" subtitle="Set price, discount and stock">
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
                label="CostPrice"
                name="costPrice"
                type="number"
                value={formData.costPrice}
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
          </Section>

          {/* ================= GALLERY ================= */}
          <Section title="Product Gallery" subtitle="Upload multiple product images">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-sm transition hover:border-indigo-400 hover:bg-indigo-50/30 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
            />

            {imagePreviews.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {imagePreviews.map((image, index) => (
                  <div
                    key={`${image.file.name}-${index}`}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <img
                      src={image.url}
                      alt={`Product ${index + 1}`}
                      className="h-40 w-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white opacity-90 transition hover:bg-red-600"
                    >
                      ×
                    </button>
                    <div className="p-2">
                      <p className="truncate text-xs text-slate-500">{image.file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p className="text-sm font-medium text-slate-600">No images selected</p>
                <p className="mt-1 text-xs text-slate-400">
                  Select multiple images to create your product gallery
                </p>
              </div>
            )}
          </Section>

          {/* ================= COLORS ================= */}
          <Section title="Colors" subtitle="Add available color options with images">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Color Name</label>
                <input
                  type="text"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="e.g. Burgundy"
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Color Code</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    className="h-[46px] w-[70px] cursor-pointer rounded-xl border border-slate-300"
                  />
                  <input
                    type="text"
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    className="input-field flex-1 uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Color Image</label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-indigo-400">
                  {colorImagePreview ? (
                    <img
                      src={colorImagePreview}
                      alt="Color preview"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <>
                      <span className="text-3xl text-slate-400">+</span>
                      <span className="mt-1 text-xs text-slate-500">Choose Image</span>
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
                      <p className="text-sm font-medium text-slate-700">{colorImage.name}</p>
                      <p className="mt-1 text-xs text-emerald-600">Image selected</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Upload the product image for this color</p>
                  )}
                </div>
              </div>
            </div>

            <button type="button" onClick={addColor} className="btn-primary mt-5">
              + Add Color
            </button>

            {formData.colors.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Added Colors</h3>
                {formData.colors.map((color, index) => (
                  <div
                    key={`${color.name}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      {color.imagePreview ? (
                        <img
                          src={color.imagePreview}
                          alt={color.name}
                          className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain p-1"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-xl border bg-slate-50" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-5 w-5 rounded-full border"
                            style={{ backgroundColor: color.code }}
                          />
                          <span className="font-medium text-slate-800">{color.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{color.code}</p>
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
          </Section>

          {/* ================= SIZES ================= */}
          <Section title="Sizes" subtitle="Available size options">
            <div className="flex gap-3">
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="S / M / L / XL"
                className="input-field flex-1"
              />
              <button type="button" onClick={addSize} className="btn-primary">
                Add size
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {formData.sizes.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeSize(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* ================= SPECIFICATIONS ================= */}
          <Section title="Specifications" subtitle="Technical details & memory options">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-800">Add Specification</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Specification Name
                  </label>
                  <input
                    value={specKey}
                    onChange={(e) => setSpecKey(e.target.value)}
                    placeholder="e.g. Display Type"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                    className="input-field"
                  />
                </div>
              </div>
              <button type="button" onClick={addSpecification} className="btn-primary mt-4">
                + Add Specification
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <h3 className="mb-1 text-base font-semibold text-slate-800">Memory / RAM</h3>
              <p className="mb-4 text-sm text-slate-500">You can add multiple memory variants</p>
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
                  className="input-field flex-1"
                />
                <button type="button" onClick={addRam} className="btn-dark">
                  + Add Memory
                </button>
              </div>
              {formData.ram.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {formData.ram.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                    >
                      {item}
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
                  <h3 className="text-base font-semibold text-slate-800">Added Specifications</h3>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
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
                        <div className="px-4 py-4 text-sm text-slate-600">{item.value}</div>
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
          </Section>

          {/* ================= KEY FEATURES ================= */}
          <Section title="Key Features" subtitle="Main highlights shown on the product page">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={keyFeatureInput}
                onChange={(e) => setKeyFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyFeature();
                  }
                }}
                placeholder="e.g. AMD Ryzen 5 PRO 5650GE Processor"
                className="input-field flex-1"
              />
              <button type="button" onClick={addKeyFeature} className="btn-primary">
                + Add Feature
              </button>
            </div>

            {formData.keyFeatures.length > 0 && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 font-semibold text-slate-800">
                  Added Key Features ({formData.keyFeatures.length})
                </h3>
                <ul className="space-y-3">
                  {formData.keyFeatures.map((feature, index) => (
                    <li key={`${feature}-${index}`} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                      <span className="flex-1 text-sm text-slate-700">{feature}</span>
                      <button
                        type="button"
                        onClick={() => removeKeyFeature(index)}
                        className="text-sm font-medium text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {/* ================= VARIANTS ================= */}
          <Section
            title="Product Variants"
            subtitle="Combine color, RAM & storage with individual stock, cost price, price & SKU"
          >
            {formData.colors.length === 0 && (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Add at least one color above before creating variants.
              </p>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Color</label>
                  <select
                    value={variantColorName}
                    onChange={(e) => setVariantColorName(e.target.value)}
                    disabled={formData.colors.length === 0}
                    className="input-field"
                  >
                    <option value="">Select color</option>
                    {formData.colors.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">RAM</label>
                  <input
                    list="variant-ram-options"
                    value={variantRam}
                    onChange={(e) => setVariantRam(e.target.value)}
                    placeholder="8GB"
                    className="input-field"
                  />
                  <datalist id="variant-ram-options">
                    {formData.ram.map((item, i) => (
                      <option key={`${item}-${i}`} value={item} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Storage</label>
                  <input
                    value={variantStorage}
                    onChange={(e) => setVariantStorage(e.target.value)}
                    placeholder="256GB"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={variantStock}
                    onChange={(e) => setVariantStock(e.target.value)}
                    placeholder="5"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantCostPrice}
                    onChange={(e) => setVariantCostPrice(e.target.value)}
                    placeholder="48000"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                    placeholder="55000"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">SKU</label>
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
                    className="input-field"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addVariant}
                disabled={formData.colors.length === 0}
                className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Add Variant
              </button>
            </div>

            {formData.variants.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">Added Variants</h3>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                    {formData.variants.length} variants
                  </span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Color</th>
                        <th className="px-4 py-3 font-medium">RAM</th>
                        <th className="px-4 py-3 font-medium">Storage</th>
                        <th className="px-4 py-3 font-medium">Stock</th>
                        <th className="px-4 py-3 font-medium">Cost Price</th>
                        <th className="px-4 py-3 font-medium">Price</th>
                        <th className="px-4 py-3 font-medium">SKU</th>
                        <th className="px-4 py-3 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {formData.variants.map((variant, index) => (
                        <tr key={`${variant.sku}-${index}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-full border"
                                style={{ backgroundColor: variant.color.code }}
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
                          <td className="px-4 py-3">{variant.costPrice ?? 0}</td>
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
          </Section>

          {/* ================= STATUS + RATING ================= */}
          <Section title="Product Status & Rating">
            <div className="mb-5 max-w-xs">
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
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <Checkbox name="isActive" checked={formData.isActive} onChange={handleChange} label="Active" />
              <Checkbox
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleChange}
                label="Featured"
              />
              <Checkbox name="isNew" checked={formData.isNew} onChange={handleChange} label="New product" />
              <Checkbox
                name="isBestSeller"
                checked={formData.isBestSeller}
                onChange={handleChange}
                label="Best seller"
              />
            </div>
          </Section>

          {/* ================= SEO ================= */}
          <Section title="SEO" subtitle="Search engine optimization">
            <div className="space-y-5">
              <Input
                label="Meta Title"
                name="metaTitle"
                value={formData.metaTitle}
                onChange={handleChange}
                placeholder="Product SEO title"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Meta Description
                </label>
                <textarea
                  name="metaDescription"
                  value={formData.metaDescription}
                  onChange={handleChange}
                  rows={4}
                  placeholder="SEO description..."
                  className="input-field resize-none"
                />
              </div>
            </div>
          </Section>
        </form>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-4 md:px-6 lg:px-8">
          <button
            type="button"
            onClick={resetForm}
            disabled={loading}
            className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Clear form
          </button>
          <button
            type="submit"
            form="product-form"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-slate-900 px-8 py-3 font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Adding product..." : "Add Product"}
          </button>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      <Modal
        open={showCategoryModal}
        title="Add Category"
        onClose={() => {
          setShowCategoryModal(false);
          setNewCategoryName("");
          clearCategoryImage("main");
          clearCategoryBanner("main");
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
          className="input-field"
        />
        <CategoryImageUpload
          label="Category Image (optional)"
          preview={newCategoryImagePreview}
          fileName={newCategoryImage?.name}
          onChange={(e) => handleCategoryImageChange(e, "main")}
          onRemove={() => clearCategoryImage("main")}
        />
        <CategoryFileUpload
          label="Category banner image (optional)"
          fileName={newCategoryBannerImage?.name}
          preview={newCategoryBannerPreview}
          onChange={(e) => handleCategoryBannerChange(e, "main")}
          onRemove={() => clearCategoryBanner("main")}
        />
        <ModalActions
          onCancel={() => {
            setShowCategoryModal(false);
            setNewCategoryName("");
            clearCategoryImage("main");
            clearCategoryBanner("main");
          }}
          onSave={handleAddCategory}
          loading={categoryAdding}
          saveLabel="Save category"
        />
      </Modal>

      <Modal
        open={showSubCategoryModal}
        title="Add Sub Category"
        onClose={() => {
          setShowSubCategoryModal(false);
          setNewSubCategoryName("");
          clearCategoryImage("sub");
          clearCategoryBanner("sub");
        }}
      >
        <p className="mb-3 text-sm text-slate-500">
          Under <span className="font-semibold text-slate-700">{selectedCategoryName}</span>
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
          className="input-field"
        />
        <CategoryImageUpload
          label="Sub Category Image (optional)"
          preview={newSubCategoryImagePreview}
          fileName={newSubCategoryImage?.name}
          onChange={(e) => handleCategoryImageChange(e, "sub")}
          onRemove={() => clearCategoryImage("sub")}
        />
        <CategoryFileUpload
          label="Sub category banner image (optional)"
          fileName={newSubCategoryBannerImage?.name}
          preview={newSubCategoryBannerPreview}
          onChange={(e) => handleCategoryBannerChange(e, "sub")}
          onRemove={() => clearCategoryBanner("sub")}
        />
        <ModalActions
          onCancel={() => {
            setShowSubCategoryModal(false);
            setNewSubCategoryName("");
            clearCategoryImage("sub");
            clearCategoryBanner("sub");
          }}
          onSave={handleAddSubCategory}
          loading={subCategoryAdding}
          saveLabel="Save sub category"
        />
      </Modal>

      <Modal
        open={showChildCategoryModal}
        title="Add Child Category"
        onClose={() => {
          setShowChildCategoryModal(false);
          setNewChildCategoryName("");
          clearCategoryImage("child");
          clearCategoryBanner("child");
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
          className="input-field"
        />
        <CategoryImageUpload
          label="Child Category Image (optional)"
          preview={newChildCategoryImagePreview}
          fileName={newChildCategoryImage?.name}
          onChange={(e) => handleCategoryImageChange(e, "child")}
          onRemove={() => clearCategoryImage("child")}
        />
        <CategoryFileUpload
          label="Child category banner image (optional)"
          fileName={newChildCategoryBannerImage?.name}
          preview={newChildCategoryBannerPreview}
          onChange={(e) => handleCategoryBannerChange(e, "child")}
          onRemove={() => clearCategoryBanner("child")}
        />
        <ModalActions
          onCancel={() => {
            setShowChildCategoryModal(false);
            setNewChildCategoryName("");
            clearCategoryImage("child");
            clearCategoryBanner("child");
          }}
          onSave={handleAddChildCategory}
          loading={childCategoryAdding}
          saveLabel="Save child category"
        />
      </Modal>

      <Modal
        open={showSubChildCategoryModal}
        title="Add Sub Child Category"
        onClose={() => {
          setShowSubChildCategoryModal(false);
          setNewSubChildCategoryName("");
          clearCategoryImage("subChild");
          clearCategoryBanner("subChild");
        }}
      >
        <p className="mb-3 text-sm text-slate-500">
          Under{" "}
          <span className="font-semibold text-slate-700">
            {selectedCategoryName} › {selectedSubCategoryName} › {selectedChildCategoryName}
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
          className="input-field"
        />
        <CategoryImageUpload
          label="Sub Child Category Image (optional)"
          preview={newSubChildCategoryImagePreview}
          fileName={newSubChildCategoryImage?.name}
          onChange={(e) => handleCategoryImageChange(e, "subChild")}
          onRemove={() => clearCategoryImage("subChild")}
        />
        <CategoryFileUpload
          label="Sub child category banner image (optional)"
          fileName={newSubChildCategoryBannerImage?.name}
          preview={newSubChildCategoryBannerPreview}
          onChange={(e) => handleCategoryBannerChange(e, "subChild")}
          onRemove={() => clearCategoryBanner("subChild")}
        />
        <ModalActions
          onCancel={() => {
            setShowSubChildCategoryModal(false);
            setNewSubChildCategoryName("");
            clearCategoryImage("subChild");
            clearCategoryBanner("subChild");
          }}
          onSave={handleAddSubChildCategory}
          loading={subChildCategoryAdding}
          saveLabel="Save sub child category"
        />
      </Modal>

      {/* Global styles for consistent inputs */}
      <style jsx global>{`
        .input-field {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.15s;
        }
        .input-field:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }
        .input-field:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
        }
        .input-field:read-only {
          background: #f8fafc;
        }
        .btn-primary {
          border-radius: 0.75rem;
          background: #4f46e5;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          color: white;
          transition: all 0.15s;
        }
        .btn-primary:hover {
          background: #4338ca;
        }
        .btn-dark {
          border-radius: 0.75rem;
          background: #0f172a;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          color: white;
          transition: all 0.15s;
        }
        .btn-dark:hover {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
}

// ======================================
// REUSABLE COMPONENTS
// ======================================
function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-7">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Input({ label, name, value, onChange, placeholder, type = "text", required = false, ...rest }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        {...rest}
        className="input-field"
      />
    </div>
  );
}

function Checkbox({ name, checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 accent-indigo-600"
      />
      <span className="font-medium text-slate-700">{label}</span>
    </label>
  );
}

function CategoryImageUpload({ label, preview, fileName, onChange, onRemove }) {
  return (
    <div className="mt-4">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-4">
        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-indigo-400">
          {preview ? (
            <img src={preview} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <>
              <span className="text-2xl text-slate-400">+</span>
              <span className="mt-1 text-xs text-slate-500">Image</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={onChange} className="hidden" />
        </label>
        {fileName && (
          <div>
            <p className="max-w-[160px] truncate text-sm font-medium text-slate-700">{fileName}</p>
            <button
              type="button"
              onClick={onRemove}
              className="mt-1 text-xs font-medium text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryFileUpload({ label, fileName, preview, onChange, onRemove }) {
  return (
    <div className="mt-4">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex h-28 w-full max-w-xs cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-indigo-400">
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-cover" />
          ) : (
            <>
              <span className="text-2xl text-slate-400">+</span>
              <span className="mt-1 text-xs text-slate-500">Choose banner</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={onChange} className="hidden" />
        </label>
        {fileName && (
          <div className="min-w-0">
            <p className="max-w-[180px] truncate text-sm font-medium text-slate-700">{fileName}</p>
            <button
              type="button"
              onClick={onRemove}
              className="mt-1 text-xs font-medium text-red-500 hover:text-red-700"
            >
              Remove banner
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">Banner is saved separately from the category thumbnail.</p>
    </div>
  );
}

function ModalActions({ onCancel, onSave, loading, saveLabel }) {
  return (
    <div className="mt-5 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={loading}
        className="rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}