
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import RichTextEditor from "./RichTextEditor";
import { showReviewToast } from "./SavedToast";

const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";

const CATEGORY_API = {
  tree: `${API_BASE}/category/tree`,
};

const initialFormData = {
  name: "",
  slug: "",
  description: "",
  descriptionSections: [],
  shortDescription: "",
  category: "",
  subCategory: "",
  childCategory: "",
  subChildCategory: "",
  brand: "",
  price: "",
  costPrice: "",
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
  existingImages: [],
};

const buttonClass =
  "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const emptyVariant = {
  colorName: "",
  ram: "",
  storage: "",
  stock: "",
  costPrice: "",
  price: "",
  sku: "",
};

const normalize = (value) =>
  String(value ?? "").trim().toLowerCase();

const getImageUrl = (image) => {
  if (typeof image === "string") return image;
  return image?.url || image?.secure_url || "";
};

export default function UpdateProductPage({ productId: propProductId }) {
  const [selectedProductId, setSelectedProductId] = useState(
    propProductId || null
  );

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState(initialFormData);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [childCategories, setChildCategories] = useState([]);
  const [subChildCategories, setSubChildCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

  const [existingImages, setExistingImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const imageInputRef = useRef(null);

  // Description builder
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [sectionImage, setSectionImage] = useState(null);
  const [sectionImagePreview, setSectionImagePreview] = useState("");
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);

  // Color builder
  const [colorName, setColorName] = useState("");
  const [colorCode, setColorCode] = useState("#000000");
  const [colorImage, setColorImage] = useState(null);
  const [colorImagePreview, setColorImagePreview] = useState("");
  const [editingColorIndex, setEditingColorIndex] = useState(null);

  // Other arrays
  const [size, setSize] = useState("");
  const [editingSizeIndex, setEditingSizeIndex] = useState(null);

  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [editingSpecIndex, setEditingSpecIndex] = useState(null);

  const [ramValue, setRamValue] = useState("");
  const [editingRamIndex, setEditingRamIndex] = useState(null);

  const [keyFeatureInput, setKeyFeatureInput] = useState("");
  const [editingFeatureIndex, setEditingFeatureIndex] = useState(null);

  // Variant builder
  const [variantForm, setVariantForm] = useState(emptyVariant);
  const [editingVariantIndex, setEditingVariantIndex] = useState(null);

  // ------------------------------------------
  // Shared helpers
  // ------------------------------------------

  const updateFormField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const revokePreview = (url) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  const resetSectionEditor = () => {
    revokePreview(sectionImagePreview);
    setSectionTitle("");
    setSectionDescription("");
    setSectionImage(null);
    setSectionImagePreview("");
    setEditingSectionIndex(null);
  };

  const resetColorEditor = () => {
    revokePreview(colorImagePreview);
    setColorName("");
    setColorCode("#000000");
    setColorImage(null);
    setColorImagePreview("");
    setEditingColorIndex(null);
  };

  const resetSizeEditor = () => {
    setSize("");
    setEditingSizeIndex(null);
  };

  const resetSpecEditor = () => {
    setSpecKey("");
    setSpecValue("");
    setEditingSpecIndex(null);
  };

  const resetRamEditor = () => {
    setRamValue("");
    setEditingRamIndex(null);
  };

  const resetFeatureEditor = () => {
    setKeyFeatureInput("");
    setEditingFeatureIndex(null);
  };

  const resetVariantEditor = () => {
    setVariantForm(emptyVariant);
    setEditingVariantIndex(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "name") {
        next.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");
      }

      if (name === "category") {
        next.subCategory = "";
        next.childCategory = "";
        next.subChildCategory = "";
      }

      if (name === "subCategory") {
        next.childCategory = "";
        next.subChildCategory = "";
      }

      if (name === "childCategory") {
        next.subChildCategory = "";
      }

      if (name === "price" || name === "discountPrice") {
        const price = Number(
          name === "price" ? value : prev.price
        );
        const discount = Number(
          name === "discountPrice" ? value : prev.discountPrice
        );

        next.discountPercentage =
          price > 0 && discount > 0 && discount < price
            ? (((price - discount) / price) * 100).toFixed(2)
            : "";
      }

      return next;
    });
  };

  // ------------------------------------------
  // Load product list
  // ------------------------------------------

  useEffect(() => {
    if (selectedProductId) return;

    let active = true;

    const loadProducts = async () => {
      try {
        setListLoading(true);

        const response = await fetch(
          `${API_BASE}/products/getALLproducts`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "Failed to load products");
        }

        const products = Array.isArray(result)
          ? result
          : result?.products || result?.data || [];

        if (active) setProductsList(products);
      } catch (error) {
        if (active) {
          showReviewToast(
            error.message || "Failed to load products",
            8000,
            "error"
          );
        }
      } finally {
        if (active) setListLoading(false);
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, [selectedProductId]);

  // ------------------------------------------
  // Load categories
  // ------------------------------------------

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError("");

      const response = await fetch(CATEGORY_API.tree, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Could not load categories");
      }

      setCategories(
        Array.isArray(result?.categories) ? result.categories : []
      );
    } catch (error) {
      setCategoriesError(error.message || "Could not load categories");
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const selected = categories.find(
      (item) => item._id === formData.category
    );
    setSubCategories(selected?.subCategories || []);
  }, [categories, formData.category]);

  useEffect(() => {
    const selected = subCategories.find(
      (item) => item._id === formData.subCategory
    );
    setChildCategories(selected?.children || []);
  }, [subCategories, formData.subCategory]);

  useEffect(() => {
    const selected = childCategories.find(
      (item) => item._id === formData.childCategory
    );
    setSubChildCategories(selected?.subChildren || []);
  }, [childCategories, formData.childCategory]);

  // ------------------------------------------
  // Load selected product
  // ------------------------------------------

  useEffect(() => {
    if (!selectedProductId) {
      setFetching(false);
      return;
    }

    let active = true;

    const loadProduct = async () => {
      try {
        setFetching(true);

        const response = await fetch(
          `${API_BASE}/products/${selectedProductId}`,
          {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await response.text();
          throw new Error(
            `API JSON ফেরত দেয়নি। HTTP ${response.status}: ${text.slice(0, 150)}`
          );
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "Product not found");
        }

        const product = result?.product || result?.data || result;

        if (!active) return;

        setFormData({
          ...initialFormData,
          ...product,
          name: product.name || "",
          slug: product.slug || "",
          description: product.description || "",
          descriptionSections: (product.descriptionSections || []).map(
            (section) => ({
              title: section.title || "",
              description: section.description || "",
              image: getImageUrl(section.image),
              imagePreview: getImageUrl(section.image),
              imageFile: null,
            })
          ),
          shortDescription: product.shortDescription || "",
          category: product.category?._id || product.category || "",
          subCategory:
            product.subCategory?._id || product.subCategory || "",
          childCategory:
            product.childCategory?._id || product.childCategory || "",
          subChildCategory:
            product.subChildCategory?._id ||
            product.subChildCategory ||
            "",
          brand: product.brand || "",
          price: product.price ?? "",
          costPrice: product.costPrice ?? "",
          discountPrice: product.discountPrice ?? "",
          discountPercentage: product.discountPercentage ?? "",
          additionalCategories: (product.additionalCategories || []).map(
            (category) =>
              typeof category === "object" ? category._id : category
          ),
          stock: product.stock ?? "",
          sku: product.sku || "",
          colors: (product.colors || []).map((color) => ({
            name: color.name || "",
            code: color.code || "#000000",
            imagePreview: getImageUrl(
              color.image || color.imageUrl
            ),
            imageFile: null,
            existingImage: getImageUrl(
              color.image || color.imageUrl
            ),
          })),
          sizes: product.sizes || [],
          specifications: product.specifications || [],
          ram: product.ram || [],
          keyFeatures: Array.isArray(product.keyFeatures)
            ? product.keyFeatures
            : [],
          variants: (product.variants || []).map((variant) => ({
            ...variant,
            color: {
              name: variant.color?.name || "",
              code: variant.color?.code || "#000000",
            },
            costPrice: variant.costPrice ?? 0,
          })),
          rating: product.rating ?? 0,
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
        resetSectionEditor();
        resetColorEditor();
        resetSizeEditor();
        resetSpecEditor();
        resetRamEditor();
        resetFeatureEditor();
        resetVariantEditor();
      } catch (error) {
        if (active) {
          showReviewToast(
            error.message || "Failed to load product",
            8000,
            "error"
          );
          setSelectedProductId(null);
        }
      } finally {
        if (active) setFetching(false);
      }
    };

    loadProduct();

    return () => {
      active = false;
    };
    // Only reload when selected product changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  // ------------------------------------------
  // Description sections: add / edit / cancel
  // ------------------------------------------

  const handleSectionImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showReviewToast("Please select a valid image", 8000, "error");
      e.target.value = "";
      return;
    }

    revokePreview(sectionImagePreview);
    setSectionImage(file);
    setSectionImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const addDescriptionSection = () => {
    if (!sectionTitle.trim() || !sectionDescription.trim()) {
      showReviewToast("Heading and description are required", 8000, "error");
      return;
    }

    const section = {
      title: sectionTitle.trim(),
      description: sectionDescription,
      image:
        editingSectionIndex !== null
          ? formData.descriptionSections[editingSectionIndex]?.image || ""
          : "",
      imageFile: sectionImage,
      imagePreview: sectionImagePreview,
    };

    setFormData((prev) => {
      const sections = [...(prev.descriptionSections || [])];

      if (editingSectionIndex !== null) {
        const oldSection = sections[editingSectionIndex];

        sections[editingSectionIndex] = {
          ...oldSection,
          ...section,
          image:
            sectionImage
              ? ""
              : oldSection?.image || "",
          imageFile:
            sectionImage || oldSection?.imageFile || null,
          imagePreview:
            sectionImagePreview ||
            oldSection?.imagePreview ||
            oldSection?.image ||
            "",
        };
      } else {
        sections.push(section);
      }

      return { ...prev, descriptionSections: sections };
    });

    resetSectionEditor();
    showReviewToast(
      editingSectionIndex !== null
        ? "Description section updated"
        : "Description section added",
      3000,
      "success"
    );
  };

  const editDescriptionSection = (index) => {
    const section = formData.descriptionSections[index];

    setEditingSectionIndex(index);
    setSectionTitle(section.title || "");
    setSectionDescription(section.description || "");
    setSectionImage(null);
    setSectionImagePreview(
      section.imagePreview || section.image || ""
    );
  };

  const removeDescriptionSection = (index) => {
    setFormData((prev) => ({
      ...prev,
      descriptionSections: prev.descriptionSections.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));

    if (editingSectionIndex === index) {
      resetSectionEditor();
    } else if (
      editingSectionIndex !== null &&
      editingSectionIndex > index
    ) {
      setEditingSectionIndex((current) => current - 1);
    }
  };

  // ------------------------------------------
  // Product gallery
  // ------------------------------------------

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length !== files.length) {
      showReviewToast("Only image files are allowed", 8000, "error");
    }

    if (!validFiles.length) return;

    const previews = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...validFiles],
    }));

    setImagePreviews((prev) => [...prev, ...previews]);
    e.target.value = "";
  };

  const removeNewImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, itemIndex) => itemIndex !== index),
    }));

    setImagePreviews((prev) => {
      const copy = [...prev];
      revokePreview(copy[index]?.url);
      copy.splice(index, 1);
      return copy;
    });
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) =>
      prev.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  // ------------------------------------------
  // Colors: add / edit / cancel
  // ------------------------------------------

  const handleColorImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showReviewToast("Only image files are allowed", 8000, "error");
      e.target.value = "";
      return;
    }

    revokePreview(colorImagePreview);
    setColorImage(file);
    setColorImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const addColor = () => {
    const name = colorName.trim();

    if (!name) {
      showReviewToast("Enter color name", 8000, "error");
      return;
    }

    const duplicate = formData.colors.some(
      (color, index) =>
        index !== editingColorIndex &&
        normalize(color.name) === normalize(name)
    );

    if (duplicate) {
      showReviewToast("This color is already added", 8000, "error");
      return;
    }

    setFormData((prev) => {
      const colors = [...prev.colors];
      const oldColor =
        editingColorIndex !== null
          ? colors[editingColorIndex]
          : null;

      const updatedColor = {
        name,
        code: colorCode || "#000000",
        imageFile:
          colorImage || oldColor?.imageFile || null,
        imagePreview:
          colorImagePreview ||
          oldColor?.imagePreview ||
          oldColor?.existingImage ||
          "",
        existingImage: colorImage
          ? ""
          : oldColor?.existingImage || "",
      };

      if (editingColorIndex !== null) {
        colors[editingColorIndex] = updatedColor;

        // Keep existing variants linked to the edited color.
        const oldName = oldColor?.name;

        return {
          ...prev,
          colors,
          variants: prev.variants.map((variant) =>
            normalize(variant.color?.name) === normalize(oldName)
              ? {
                  ...variant,
                  color: {
                    name: updatedColor.name,
                    code: updatedColor.code,
                  },
                }
              : variant
          ),
        };
      }

      colors.push(updatedColor);
      return { ...prev, colors };
    });

    resetColorEditor();
    showReviewToast(
      editingColorIndex !== null ? "Color updated" : "Color added",
      3000,
      "success"
    );
  };

  const editColor = (index) => {
    const color = formData.colors[index];

    setEditingColorIndex(index);
    setColorName(color.name || "");
    setColorCode(color.code || "#000000");
    setColorImage(null);
    setColorImagePreview(
      color.imagePreview || color.existingImage || ""
    );
  };

  const removeColor = (index) => {
    const color = formData.colors[index];

    const usedInVariants = formData.variants.some(
      (variant) =>
        normalize(variant.color?.name) === normalize(color?.name)
    );

    if (usedInVariants) {
      showReviewToast(
        "This color is used by a variant. Edit or remove those variants first.",
        6000,
        "error"
      );
      return;
    }

    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, itemIndex) => itemIndex !== index),
    }));

    if (editingColorIndex === index) {
      resetColorEditor();
    } else if (
      editingColorIndex !== null &&
      editingColorIndex > index
    ) {
      setEditingColorIndex((current) => current - 1);
    }
  };

  // ------------------------------------------
  // Sizes: add / edit / cancel
  // ------------------------------------------

  const addSize = () => {
    const value = size.trim();

    if (!value) {
      showReviewToast("Enter a size", 4000, "error");
      return;
    }

    if (
      formData.sizes.some(
        (item, index) =>
          index !== editingSizeIndex &&
          normalize(item) === normalize(value)
      )
    ) {
      showReviewToast("This size already exists", 5000, "error");
      return;
    }

    setFormData((prev) => {
      const sizes = [...prev.sizes];

      if (editingSizeIndex !== null) {
        sizes[editingSizeIndex] = value;
      } else {
        sizes.push(value);
      }

      return { ...prev, sizes };
    });

    resetSizeEditor();
  };

  const editSize = (index) => {
    setSize(formData.sizes[index]);
    setEditingSizeIndex(index);
  };

  const removeSize = (index) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, itemIndex) => itemIndex !== index),
    }));

    if (editingSizeIndex === index) resetSizeEditor();
    else if (editingSizeIndex !== null && editingSizeIndex > index) {
      setEditingSizeIndex((current) => current - 1);
    }
  };

  // ------------------------------------------
  // Specifications: add / edit / cancel
  // ------------------------------------------

  const addSpecification = () => {
    const key = specKey.trim();
    const value = specValue.trim();

    if (!key || !value) {
      showReviewToast("Please enter both name and value", 5000, "error");
      return;
    }

    const duplicate = formData.specifications.some(
      (item, index) =>
        index !== editingSpecIndex &&
        normalize(item.key) === normalize(key)
    );

    if (duplicate) {
      showReviewToast("This specification already exists", 5000, "error");
      return;
    }

    setFormData((prev) => {
      const specifications = [...prev.specifications];
      const item = { key, value };

      if (editingSpecIndex !== null) {
        specifications[editingSpecIndex] = item;
      } else {
        specifications.push(item);
      }

      return { ...prev, specifications };
    });

    resetSpecEditor();
  };

  const editSpecification = (index) => {
    const item = formData.specifications[index];
    setSpecKey(item.key || "");
    setSpecValue(item.value || "");
    setEditingSpecIndex(index);
  };

  const removeSpecification = (index) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));

    if (editingSpecIndex === index) resetSpecEditor();
    else if (
      editingSpecIndex !== null &&
      editingSpecIndex > index
    ) {
      setEditingSpecIndex((current) => current - 1);
    }
  };

  // ------------------------------------------
  // RAM: add / edit / cancel
  // ------------------------------------------

  const addRam = () => {
    const value = ramValue.trim();

    if (!value) {
      showReviewToast("Enter RAM / Memory value", 5000, "error");
      return;
    }

    if (
      formData.ram.some(
        (item, index) =>
          index !== editingRamIndex &&
          normalize(item) === normalize(value)
      )
    ) {
      showReviewToast("This RAM / Memory already exists", 5000, "error");
      return;
    }

    setFormData((prev) => {
      const ram = [...prev.ram];

      if (editingRamIndex !== null) {
        ram[editingRamIndex] = value;
      } else {
        ram.push(value);
      }

      return { ...prev, ram };
    });

    resetRamEditor();
  };

  const editRam = (index) => {
    setRamValue(formData.ram[index]);
    setEditingRamIndex(index);
  };

  const removeRam = (index) => {
    setFormData((prev) => ({
      ...prev,
      ram: prev.ram.filter((_, itemIndex) => itemIndex !== index),
    }));

    if (editingRamIndex === index) resetRamEditor();
    else if (editingRamIndex !== null && editingRamIndex > index) {
      setEditingRamIndex((current) => current - 1);
    }
  };

  // ------------------------------------------
  // Key features: add / edit / cancel
  // ------------------------------------------

  const addKeyFeature = () => {
    const feature = keyFeatureInput.trim();

    if (!feature) {
      showReviewToast("Please enter a key feature", 5000, "error");
      return;
    }

    const duplicate = formData.keyFeatures.some(
      (item, index) =>
        index !== editingFeatureIndex &&
        normalize(item) === normalize(feature)
    );

    if (duplicate) {
      showReviewToast("This key feature already exists", 5000, "error");
      return;
    }

    setFormData((prev) => {
      const keyFeatures = [...prev.keyFeatures];

      if (editingFeatureIndex !== null) {
        keyFeatures[editingFeatureIndex] = feature;
      } else {
        keyFeatures.push(feature);
      }

      return { ...prev, keyFeatures };
    });

    resetFeatureEditor();
  };

  const editKeyFeature = (index) => {
    setKeyFeatureInput(formData.keyFeatures[index]);
    setEditingFeatureIndex(index);
  };

  const removeKeyFeature = (index) => {
    setFormData((prev) => ({
      ...prev,
      keyFeatures: prev.keyFeatures.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));

    if (editingFeatureIndex === index) resetFeatureEditor();
    else if (
      editingFeatureIndex !== null &&
      editingFeatureIndex > index
    ) {
      setEditingFeatureIndex((current) => current - 1);
    }
  };

  // ------------------------------------------
  // Variants: add / edit / cancel
  // ------------------------------------------

  const handleVariantChange = (e) => {
    const { name, value } = e.target;
    setVariantForm((prev) => ({ ...prev, [name]: value }));
  };

  const addVariant = () => {
    const {
      colorName,
      ram,
      storage,
      stock,
      costPrice,
      price,
      sku,
    } = variantForm;

    if (!colorName) {
      showReviewToast("Select a color", 5000, "error");
      return;
    }

    if (!ram.trim() || !storage.trim()) {
      showReviewToast("Enter RAM and storage", 5000, "error");
      return;
    }

    if (stock === "" || !Number.isFinite(Number(stock)) || Number(stock) < 0) {
      showReviewToast("Enter valid stock", 5000, "error");
      return;
    }

    if (price === "" || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      showReviewToast("Enter valid price", 5000, "error");
      return;
    }

    if (
      costPrice !== "" &&
      (!Number.isFinite(Number(costPrice)) || Number(costPrice) < 0)
    ) {
      showReviewToast("Enter valid cost price", 5000, "error");
      return;
    }

    if (!sku.trim()) {
      showReviewToast("Enter SKU", 5000, "error");
      return;
    }

    const skuTaken = formData.variants.some(
      (variant, index) =>
        index !== editingVariantIndex &&
        normalize(variant.sku) === normalize(sku)
    );

    if (skuTaken) {
      showReviewToast("This SKU is already used", 5000, "error");
      return;
    }

    const selectedColor = formData.colors.find(
      (color) => normalize(color.name) === normalize(colorName)
    );

    if (!selectedColor) {
      showReviewToast("Selected color not found", 5000, "error");
      return;
    }

    const variant = {
      color: {
        name: selectedColor.name,
        code: selectedColor.code || "#000000",
      },
      ram: ram.trim(),
      storage: storage.trim(),
      stock: Number(stock),
      costPrice: costPrice === "" ? 0 : Number(costPrice),
      price: Number(price),
      sku: sku.trim(),
    };

    setFormData((prev) => {
      const variants = [...prev.variants];

      if (editingVariantIndex !== null) {
        variants[editingVariantIndex] = variant;
      } else {
        variants.push(variant);
      }

      return { ...prev, variants };
    });

    resetVariantEditor();
  };

  const editVariant = (index) => {
    const variant = formData.variants[index];

    setVariantForm({
      colorName: variant.color?.name || "",
      ram: variant.ram || "",
      storage: variant.storage || "",
      stock: String(variant.stock ?? 0),
      costPrice: String(variant.costPrice ?? 0),
      price: String(variant.price ?? ""),
      sku: variant.sku || "",
    });

    setEditingVariantIndex(index);
  };

  const removeVariant = (index) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, itemIndex) => itemIndex !== index),
    }));

    if (editingVariantIndex === index) resetVariantEditor();
    else if (
      editingVariantIndex !== null &&
      editingVariantIndex > index
    ) {
      setEditingVariantIndex((current) => current - 1);
    }
  };

  // ------------------------------------------
  // Submit product
  // ------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProductId) return;

    if (existingImages.length === 0 && formData.images.length === 0) {
      showReviewToast("At least one product image is required", 6000, "error");
      return;
    }

    const rating = Number(formData.rating);

    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      showReviewToast("Rating must be between 0 and 5", 5000, "error");
      return;
    }

    if (
      formData.discountPrice !== "" &&
      Number(formData.discountPrice) >= Number(formData.price)
    ) {
      showReviewToast("Discount price must be lower than price", 5000, "error");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();

      [
        "name",
        "slug",
        "description",
        "shortDescription",
        "category",
        "subCategory",
        "childCategory",
        "subChildCategory",
        "brand",
        "price",
        "costPrice",
        "discountPrice",
        "discountPercentage",
        "stock",
        "sku",
        "metaTitle",
        "metaDescription",
      ].forEach((field) => {
        data.append(field, formData[field] ?? "");
      });

      // Description sections: preserve old image URLs.
      let imageIndex = 0;

      const sectionsMetadata = formData.descriptionSections.map(
        (section) => {
          const metadata = {
            title: section.title,
            description: section.description,
            image: section.image || "",
            imageIndex: null,
          };

          if (section.imageFile) {
            metadata.imageIndex = imageIndex++;
          }

          return metadata;
        }
      );

      data.append(
        "descriptionSections",
        JSON.stringify(sectionsMetadata)
      );

      formData.descriptionSections.forEach((section) => {
        if (section.imageFile) {
          data.append(
            "descriptionSectionImages",
            section.imageFile
          );
        }
      });

      data.append(
        "additionalCategories",
        JSON.stringify(formData.additionalCategories || [])
      );

      // Color images
      data.append(
        "colors",
        JSON.stringify(
          formData.colors.map((color) => ({
            name: color.name,
            code: color.code,
            existingImage: color.existingImage || "",
          }))
        )
      );

      formData.colors.forEach((color) => {
        if (color.imageFile) {
          data.append("colorImages", color.imageFile);
        }
      });

      data.append("sizes", JSON.stringify(formData.sizes));
      data.append("ram", JSON.stringify(formData.ram));
      data.append(
        "specifications",
        JSON.stringify(formData.specifications)
      );
      data.append("variants", JSON.stringify(formData.variants));
      data.append("keyFeatures", JSON.stringify(formData.keyFeatures));

      data.append("rating", String(rating));
      data.append("isActive", String(formData.isActive));
      data.append("isFeatured", String(formData.isFeatured));
      data.append("isNew", String(formData.isNew));
      data.append("isBestSeller", String(formData.isBestSeller));

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

      const responseText = await response.text();

      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        result = {
          success: false,
          message: responseText || "Invalid server response",
        };
      }

      if (!response.ok) {
        throw new Error(result.message || "Could not update product");
      }

      showReviewToast("Product updated successfully!", 6000, "success");

      // Return to product list after successful update.
      setSelectedProductId(null);
    } catch (error) {
      console.error("Update product error:", error);
      showReviewToast(
        error.message || "Something went wrong",
        8000,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------
  // Product list UI
  // ------------------------------------------

  const filteredProducts = productsList.filter((product) => {
    const query = normalize(searchTerm);

    if (!query) return true;

    return (
      normalize(product.name).includes(query) ||
      normalize(product.sku).includes(query) ||
      normalize(product.brand).includes(query)
    );
  });

  if (!selectedProductId) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <Toaster position="top-center" />

        <h1 className="text-2xl font-bold text-slate-900">
          Update Product
        </h1>
        <p className="mb-5 mt-1 text-sm text-slate-500">
          Select a product to edit.
        </p>

        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, SKU or brand..."
          className={`${inputClass} mb-5 max-w-lg`}
        />

        {listLoading ? (
          <p className="py-12 text-center">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="rounded-xl border bg-white p-10 text-center text-slate-500">
            No products found.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {["Image", "Name", "Brand", "Price", "Stock", "Action"].map(
                    (label) => (
                      <th key={label} className="px-4 py-3">
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((product) => (
                  <tr key={product._id || product.id}>
                    <td className="px-4 py-3">
                      <img
                        src={
                          getImageUrl(product.images?.[0]) ||
                          product.image ||
                          "/images.png"
                        }
                        alt={product.name || "Product"}
                        className="h-12 w-12 rounded-lg object-contain"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {product.name}
                    </td>
                    <td className="px-4 py-3">
                      {product.brand || "—"}
                    </td>
                    <td className="px-4 py-3">
                      ৳{Number(
                        product.discountPrice || product.price || 0
                      ).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{product.stock ?? 0}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedProductId(product._id || product.id)
                        }
                        className={`${buttonClass} bg-red-800 text-white hover:bg-red-900`}
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

  if (fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Toaster position="top-center" />
        <p className="text-slate-600">Loading product...</p>
      </div>
    );
  }

  // ------------------------------------------
  // Edit form UI
  // ------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <Toaster position="top-center" />

      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Update Product
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Edit product details and saved items.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedProductId(null)}
            className={`${buttonClass} border border-slate-300 bg-white`}
          >
            ← Back to list
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* BASIC INFORMATION */}
          <Section title="Basic Information">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Product Name">
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </Field>

              <Field label="Slug">
                <input
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </Field>

              <Field label="Short Description" full>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  rows={3}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          {/* DESCRIPTION SECTIONS */}
          <Section title="Product Description Builder">
            <div className="space-y-4 rounded-xl border bg-slate-50 p-4">
              <Field label="Section Heading">
                <input
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  placeholder="e.g. Pro Camera System"
                  className={inputClass}
                />
              </Field>

              <Field label="Section Description">
                <RichTextEditor
                  value={sectionDescription}
                  onChange={setSectionDescription}
                />
              </Field>

              <Field label="Section Image (Optional)">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSectionImageChange}
                  className={inputClass}
                />

                {sectionImagePreview && (
                  <div className="mt-3">
                    <img
                      src={sectionImagePreview}
                      alt="Section preview"
                      className="max-h-64 w-full rounded-xl bg-white object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        // If editing an existing section, removing a
                        // newly-selected file restores its previous image.
                        revokePreview(sectionImagePreview);
                        setSectionImage(null);

                        const oldSection =
                          editingSectionIndex !== null
                            ? formData.descriptionSections[
                                editingSectionIndex
                              ]
                            : null;

                        setSectionImagePreview(
                          oldSection?.image || ""
                        );
                      }}
                      className="mt-2 text-sm text-red-600"
                    >
                      Remove selected image
                    </button>
                  </div>
                )}
              </Field>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addDescriptionSection}
                  className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
                >
                  {editingSectionIndex !== null
                    ? "Update Description Section"
                    : "+ Add Description Section"}
                </button>

                {editingSectionIndex !== null && (
                  <button
                    type="button"
                    onClick={resetSectionEditor}
                    className={`${buttonClass} border bg-white`}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {formData.descriptionSections.map((section, index) => (
                <div
                  key={`section-${index}`}
                  className="rounded-xl border bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">
                      {index + 1}. {section.title}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editDescriptionSection(index)}
                        className={`${buttonClass} bg-amber-100 text-amber-800`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDescriptionSection(index)}
                        className={`${buttonClass} bg-red-50 text-red-600`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div
                    className="product-description-content mt-3 text-sm leading-7 text-slate-600"
                    dangerouslySetInnerHTML={{
                      __html: section.description || "",
                    }}
                  />

                  {(section.imagePreview || section.image) && (
                    <img
                      src={section.imagePreview || section.image}
                      alt={section.title}
                      className="mt-4 max-h-72 w-full rounded-xl bg-slate-50 object-contain"
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* CATEGORY & BRAND */}
          <Section title="Category & Brand">
            {categoriesError && (
              <p className="mb-4 text-sm text-red-600">
                {categoriesError}
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Field label="Category">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  disabled={categoriesLoading}
                  className={inputClass}
                >
                  <option value="">
                    {categoriesLoading ? "Loading..." : "Select category"}
                  </option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Sub Category">
                <select
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  disabled={!formData.category}
                  className={inputClass}
                >
                  <option value="">Select sub category</option>
                  {subCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Child Category">
                <select
                  name="childCategory"
                  value={formData.childCategory}
                  onChange={handleChange}
                  disabled={!formData.subCategory}
                  className={inputClass}
                >
                  <option value="">Select child category</option>
                  {childCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Sub Child Category">
                <select
                  name="subChildCategory"
                  value={formData.subChildCategory}
                  onChange={handleChange}
                  disabled={!formData.childCategory}
                  className={inputClass}
                >
                  <option value="">Select sub child category</option>
                  {subChildCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Brand" full>
                <input
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-6 border-t pt-5">
              <h3 className="mb-3 font-semibold">Additional Categories</h3>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {categories
                  .filter((category) => category._id !== formData.category)
                  .map((category) => {
                    const checked = formData.additionalCategories.includes(
                      category._id
                    );

                    return (
                      <label
                        key={category._id}
                        className="flex items-center gap-2 rounded-xl border p-3"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const selected = e.target.checked;

                            setFormData((prev) => ({
                              ...prev,
                              additionalCategories: selected
                                ? [
                                    ...prev.additionalCategories,
                                    category._id,
                                  ]
                                : prev.additionalCategories.filter(
                                    (id) => id !== category._id
                                  ),
                            }));
                          }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          </Section>

          {/* PRICING & INVENTORY */}
          <Section title="Pricing & Inventory">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Price">
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>

              <Field label="Discount Price">
                <input
                  name="discountPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discountPrice}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>

              <Field label="Cost Price">
                <input
                  name="costPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>

              <Field label="Discount Percentage">
                <input
                  name="discountPercentage"
                  type="number"
                  value={formData.discountPercentage}
                  readOnly
                  className={inputClass}
                />
              </Field>

              <Field label="Stock">
                <input
                  name="stock"
                  type="number"
                  min="0"
                  required
                  value={formData.stock}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>

              <Field label="SKU">
                <input
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          {/* PRODUCT GALLERY */}
          <Section title="Product Gallery">
            <p className="mb-4 text-sm text-slate-500">
              Keep existing images, remove unwanted images or upload new ones.
            </p>

            {existingImages.length > 0 && (
              <>
                <h3 className="mb-3 font-medium">Current Images</h3>
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                  {existingImages.map((image, index) => (
                    <div
                      key={`existing-${index}`}
                      className="relative rounded-xl border p-2"
                    >
                      <img
                        src={getImageUrl(image)}
                        alt={`Existing image ${index + 1}`}
                        className="h-32 w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute right-1 top-1 rounded-full bg-red-600 px-3 py-1 text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className={inputClass}
            />

            {imagePreviews.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                {imagePreviews.map((image, index) => (
                  <div
                    key={`new-${index}`}
                    className="relative rounded-xl border p-2"
                  >
                    <img
                      src={image.url}
                      alt={`New image ${index + 1}`}
                      className="h-32 w-full object-contain"
                    />
                    <span className="absolute left-2 top-2 rounded bg-green-600 px-2 py-1 text-xs text-white">
                      New
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-red-600 px-3 py-1 text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* COLORS */}
          <Section title="Colors">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Color Name">
                <input
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="e.g. Burgundy"
                  className={inputClass}
                />
              </Field>

              <Field label="Color Code">
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    className="h-12 w-16 rounded-lg border"
                  />
                  <input
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </Field>
            </div>

            <Field label="Color Image">
              <input
                type="file"
                accept="image/*"
                onChange={handleColorImageChange}
                className={inputClass}
              />
              {colorImagePreview && (
                <img
                  src={colorImagePreview}
                  alt="Color preview"
                  className="mt-3 h-36 w-36 rounded-xl border object-contain p-2"
                />
              )}
            </Field>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addColor}
                className={`${buttonClass} bg-blue-600 text-white`}
              >
                {editingColorIndex !== null ? "Update Color" : "+ Add Color"}
              </button>

              {editingColorIndex !== null && (
                <button
                  type="button"
                  onClick={resetColorEditor}
                  className={`${buttonClass} border bg-white`}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="mt-5 space-y-3">
              {formData.colors.map((color, index) => (
                <div
                  key={`color-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="flex items-center gap-3">
                    {(color.imagePreview || color.existingImage) && (
                      <img
                        src={color.imagePreview || color.existingImage}
                        alt={color.name}
                        className="h-16 w-16 rounded-lg border object-contain"
                      />
                    )}
                    <span
                      className="h-5 w-5 rounded-full border"
                      style={{ backgroundColor: color.code }}
                    />
                    <div>
                      <p className="font-medium">{color.name}</p>
                      <p className="text-xs text-slate-500">{color.code}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editColor(index)}
                      className={`${buttonClass} bg-amber-100 text-amber-800`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeColor(index)}
                      className={`${buttonClass} bg-red-50 text-red-600`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* SIZES */}
          <Section title="Sizes">
            <div className="flex flex-wrap gap-3">
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="S / M / L / XL"
                className={`${inputClass} min-w-[200px] flex-1`}
              />
              <button
                type="button"
                onClick={addSize}
                className={`${buttonClass} bg-blue-600 text-white`}
              >
                {editingSizeIndex !== null ? "Update Size" : "+ Add Size"}
              </button>
              {editingSizeIndex !== null && (
                <button
                  type="button"
                  onClick={resetSizeEditor}
                  className={`${buttonClass} border bg-white`}
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {formData.sizes.map((item, index) => (
                <div
                  key={`size-${index}`}
                  className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => editSize(index)}
                    className="text-sm font-semibold text-amber-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSize(index)}
                    className="text-sm font-semibold text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* SPECIFICATIONS */}
          <Section title="Specifications">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Specification Name">
                <input
                  value={specKey}
                  onChange={(e) => setSpecKey(e.target.value)}
                  placeholder="e.g. Display Type"
                  className={inputClass}
                />
              </Field>
              <Field label="Specification Value">
                <input
                  value={specValue}
                  onChange={(e) => setSpecValue(e.target.value)}
                  placeholder="e.g. OLED"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addSpecification}
                className={`${buttonClass} bg-blue-600 text-white`}
              >
                {editingSpecIndex !== null
                  ? "Update Specification"
                  : "+ Add Specification"}
              </button>
              {editingSpecIndex !== null && (
                <button
                  type="button"
                  onClick={resetSpecEditor}
                  className={`${buttonClass} border bg-white`}
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {formData.specifications.map((item, index) => (
                    <tr key={`spec-${index}`}>
                      <td className="px-4 py-3 font-medium">{item.key}</td>
                      <td className="px-4 py-3">{item.value}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => editSpecification(index)}
                            className="text-amber-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSpecification(index)}
                            className="text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* RAM */}
          <Section title="Memory / RAM">
            <div className="flex flex-wrap gap-3">
              <input
                value={ramValue}
                onChange={(e) => setRamValue(e.target.value)}
                placeholder="e.g. 8GB RAM"
                className={`${inputClass} min-w-[200px] flex-1`}
              />
              <button
                type="button"
                onClick={addRam}
                className={`${buttonClass} bg-blue-600 text-white`}
              >
                {editingRamIndex !== null ? "Update RAM" : "+ Add RAM"}
              </button>
              {editingRamIndex !== null && (
                <button
                  type="button"
                  onClick={resetRamEditor}
                  className={`${buttonClass} border bg-white`}
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {formData.ram.map((item, index) => (
                <div
                  key={`ram-${index}`}
                  className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => editRam(index)}
                    className="text-sm text-amber-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRam(index)}
                    className="text-sm text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* KEY FEATURES */}
          <Section title="Key Features">
            <div className="flex flex-wrap gap-3">
              <input
                value={keyFeatureInput}
                onChange={(e) => setKeyFeatureInput(e.target.value)}
                placeholder="Enter a product feature"
                className={`${inputClass} min-w-[200px] flex-1`}
              />
              <button
                type="button"
                onClick={addKeyFeature}
                className={`${buttonClass} bg-blue-600 text-white`}
              >
                {editingFeatureIndex !== null
                  ? "Update Feature"
                  : "+ Add Feature"}
              </button>
              {editingFeatureIndex !== null && (
                <button
                  type="button"
                  onClick={resetFeatureEditor}
                  className={`${buttonClass} border bg-white`}
                >
                  Cancel
                </button>
              )}
            </div>

            <ul className="mt-5 space-y-3">
              {formData.keyFeatures.map((feature, index) => (
                <li
                  key={`feature-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3"
                >
                  <span className="flex-1">{feature}</span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => editKeyFeature(index)}
                      className="text-sm font-semibold text-amber-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeKeyFeature(index)}
                      className="text-sm font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          {/* VARIANTS */}
          <Section title="Product Variants">
            {formData.colors.length === 0 && (
              <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Add a color before creating variants.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Field label="Color">
                <select
                  name="colorName"
                  value={variantForm.colorName}
                  onChange={handleVariantChange}
                  disabled={formData.colors.length === 0}
                  className={inputClass}
                >
                  <option value="">Select color</option>
                  {formData.colors.map((color, index) => (
                    <option key={`variant-color-${index}`} value={color.name}>
                      {color.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="RAM">
                <input
                  name="ram"
                  list="variant-ram-options"
                  value={variantForm.ram}
                  onChange={handleVariantChange}
                  placeholder="8GB"
                  className={inputClass}
                />
                <datalist id="variant-ram-options">
                  {formData.ram.map((item, index) => (
                    <option key={`ram-option-${index}`} value={item} />
                  ))}
                </datalist>
              </Field>

              <Field label="Storage">
                <input
                  name="storage"
                  value={variantForm.storage}
                  onChange={handleVariantChange}
                  placeholder="256GB"
                  className={inputClass}
                />
              </Field>

              <Field label="Stock">
                <input
                  name="stock"
                  type="number"
                  min="0"
                  value={variantForm.stock}
                  onChange={handleVariantChange}
                  className={inputClass}
                />
              </Field>

              <Field label="Cost Price">
                <input
                  name="costPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={variantForm.costPrice}
                  onChange={handleVariantChange}
                  className={inputClass}
                />
              </Field>

              <Field label="Price">
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={variantForm.price}
                  onChange={handleVariantChange}
                  className={inputClass}
                />
              </Field>

              <Field label="SKU">
                <input
                  name="sku"
                  value={variantForm.sku}
                  onChange={handleVariantChange}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addVariant}
                disabled={formData.colors.length === 0}
                className={`${buttonClass} bg-blue-600 text-white`}
              >
                {editingVariantIndex !== null
                  ? "Update Variant"
                  : "+ Add Variant"}
              </button>
              {editingVariantIndex !== null && (
                <button
                  type="button"
                  onClick={resetVariantEditor}
                  className={`${buttonClass} border bg-white`}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Color",
                      "RAM",
                      "Storage",
                      "Stock",
                      "Cost Price",
                      "Price",
                      "SKU",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {formData.variants.map((variant, index) => (
                    <tr key={`variant-${index}`}>
                      <td className="px-4 py-3">
                        <span
                          className="mr-2 inline-block h-4 w-4 rounded-full border align-middle"
                          style={{
                            backgroundColor:
                              variant.color?.code || "#000000",
                          }}
                        />
                        {variant.color?.name}
                      </td>
                      <td className="px-4 py-3">{variant.ram}</td>
                      <td className="px-4 py-3">{variant.storage}</td>
                      <td className="px-4 py-3">{variant.stock}</td>
                      <td className="px-4 py-3">
                        {variant.costPrice ?? 0}
                      </td>
                      <td className="px-4 py-3">{variant.price}</td>
                      <td className="px-4 py-3">{variant.sku}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => editVariant(index)}
                            className="font-semibold text-amber-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="font-semibold text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* STATUS AND RATING */}
          <Section title="Product Status & Rating">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Rating (0-5)">
                <input
                  name="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={handleChange}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["isActive", "Active"],
                ["isFeatured", "Featured"],
                ["isNew", "New product"],
                ["isBestSeller", "Best seller"],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="flex items-center gap-3 rounded-xl border p-4"
                >
                  <input
                    type="checkbox"
                    name={name}
                    checked={Boolean(formData[name])}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Section>

          {/* SEO */}
          <Section title="SEO">
            <Field label="Meta Title">
              <input
                name="metaTitle"
                value={formData.metaTitle}
                onChange={handleChange}
                className={inputClass}
              />
            </Field>

            <Field label="Meta Description">
              <textarea
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleChange}
                rows={4}
                className={inputClass}
              />
            </Field>
          </Section>

          {/* SUBMIT */}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedProductId(null)}
              disabled={loading}
              className={`${buttonClass} border border-slate-300 bg-white px-6 py-3`}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className={`${buttonClass} bg-slate-900 px-8 py-3 text-white hover:bg-slate-800`}
            >
              {loading ? "Updating..." : "Update Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------
// Reusable UI components
// ------------------------------------------

function Section({ title, children }) {
  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children, full = false }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
