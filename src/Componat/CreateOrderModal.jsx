
"use client";

import React, { useMemo, useState } from "react";
import {
  X,
  Plus,
  Minus,
  Search,
  Truck,
  Store,
  Banknote,
  CreditCard,
  Wallet,
  Trash2,
  ShoppingBag,
  CheckCircle,
} from "lucide-react";

import { BANGLADESH_GEO } from "../BangladeshLocation.js";

const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";

/* =========================================================
   CREATE ORDER MODAL
========================================================= */

export default function CreateOrderModal({
  open,
  onClose,
  onSuccess,
}) {
  /* =======================================================
     CUSTOMER FORM
  ======================================================= */

  const initialFormData = {
    fullName: "",
    email: "",
    phone: "",
    selectArea: "",
    address: "",
    note: "",
    paymentMethod: "cash_on_delivery",
    deliveryMethod: "courier_service",
  };

  const [formData, setFormData] = useState(initialFormData);

  /* =======================================================
     GEO STATE
  ======================================================= */

  const [geo, setGeo] = useState({
    division: "",
    district: "",
    upazila: "",
  });

  const divisions = Object.keys(BANGLADESH_GEO);

  const districts = geo.division
    ? Object.keys(BANGLADESH_GEO[geo.division] || {})
    : [];

  const upazilas =
    geo.division && geo.district
      ? BANGLADESH_GEO[geo.division]?.[geo.district] || []
      : [];

  /* =======================================================
     PRODUCT SEARCH
  ======================================================= */

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  /* =======================================================
     SELECTED PRODUCTS
  ======================================================= */

  const [selectedProducts, setSelectedProducts] = useState([]);

  /* =======================================================
     LOADING
  ======================================================= */

  const [loading, setLoading] = useState(false);

  /* =======================================================
     HELPERS
  ======================================================= */

  const formatPrice = (price) =>
    Number(price || 0).toLocaleString("en-BD");

  const normalize = (value) => {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string" || typeof value === "number") {
      return String(value).trim();
    }

    if (typeof value === "object") {
      return String(
        value.name ??
          value.value ??
          value.label ??
          value.title ??
          value._id ??
          "",
      ).trim();
    }

    return "";
  };

  const getProductId = (product) =>
    String(product?._id || product?.id || "");

  const getProductImage = (product) => {
    if (Array.isArray(product?.images) && product.images.length) {
      const firstImage = product.images[0];

      if (typeof firstImage === "string") {
        return firstImage;
      }

      return firstImage?.url || firstImage?.secure_url || "/images.png";
    }

    if (typeof product?.image === "string" && product.image) {
      return product.image;
    }

    return "/images.png";
  };

  const getProductPrice = (product) =>
    Number(product?.discountPrice ?? product?.price ?? 0);

  /* =======================================================
     GET PRODUCT VARIANTS
  ======================================================= */

  const getVariants = (product) => {
    if (!Array.isArray(product?.variants)) {
      return [];
    }

    return product.variants.map((variant, index) => ({
      ...variant,

      _variantIndex: index,

      color: normalize(variant?.color),
      ram: normalize(variant?.ram),
      storage: normalize(variant?.storage),
      sku: normalize(variant?.sku),

      variantId: variant?._id
        ? String(variant._id)
        : "",

      price: Number(variant?.price ?? 0),
      stock: Number(variant?.stock ?? 0),

      image:
        typeof variant?.image === "string"
          ? variant.image
          : variant?.image?.url ||
            variant?.image?.secure_url ||
            "",
    }));
  };

  /* =======================================================
     GET SELECTED VARIANT
  ======================================================= */

  const getSelectedVariant = (item) => ({
    color: item?.selectedVariant?.color || "",
    ram: item?.selectedVariant?.ram || "",
    storage: item?.selectedVariant?.storage || "",
  });

  /* =======================================================
     GET VARIANT OPTIONS
     Color → RAM → Storage
  ======================================================= */

  const getVariantOptions = (item) => {
    const variants = getVariants(item.productData);
    const selected = getSelectedVariant(item);

    if (!variants.length) {
      return {
        colors: [],
        rams: [],
        storages: [],
      };
    }

    const colors = [
      ...new Set(
        variants.map((variant) => variant.color).filter(Boolean),
      ),
    ];

    let filtered = variants;

    if (selected.color) {
      filtered = filtered.filter(
        (variant) => variant.color === selected.color,
      );
    }

    const rams = [
      ...new Set(
        filtered.map((variant) => variant.ram).filter(Boolean),
      ),
    ];

    if (selected.ram) {
      filtered = filtered.filter(
        (variant) => variant.ram === selected.ram,
      );
    }

    const storages = [
      ...new Set(
        filtered.map((variant) => variant.storage).filter(Boolean),
      ),
    ];

    return {
      colors,
      rams,
      storages,
    };
  };

  /* =======================================================
     GET EXACT MATCHED VARIANT
  ======================================================= */

  const getMatchedVariant = (item) => {
    const variants = getVariants(item.productData);

    if (!variants.length) {
      return null;
    }

    const selected = getSelectedVariant(item);

    const hasColor = variants.some((variant) =>
      Boolean(variant.color),
    );

    const hasRam = variants.some((variant) =>
      Boolean(variant.ram),
    );

    const hasStorage = variants.some((variant) =>
      Boolean(variant.storage),
    );

    if (
      (hasColor && !selected.color) ||
      (hasRam && !selected.ram) ||
      (hasStorage && !selected.storage)
    ) {
      return null;
    }

    return (
      variants.find(
        (variant) =>
          (!hasColor || variant.color === selected.color) &&
          (!hasRam || variant.ram === selected.ram) &&
          (!hasStorage || variant.storage === selected.storage),
      ) || null
    );
  };

  /* =======================================================
     VARIANT STATUS
  ======================================================= */

  const getVariantStatus = (item) => {
    const variants = getVariants(item.productData);

    if (!variants.length) {
      return {
        hasVariants: false,
        complete: true,
        available: true,
        variant: null,
        stock: Infinity,
        message: "",
      };
    }

    const selected = getSelectedVariant(item);

    const hasColor = variants.some((variant) =>
      Boolean(variant.color),
    );

    const hasRam = variants.some((variant) =>
      Boolean(variant.ram),
    );

    const hasStorage = variants.some((variant) =>
      Boolean(variant.storage),
    );

    const missing = [];

    if (hasColor && !selected.color) {
      missing.push("Color");
    }

    if (hasRam && !selected.ram) {
      missing.push("RAM");
    }

    if (hasStorage && !selected.storage) {
      missing.push("Storage");
    }

    if (missing.length) {
      return {
        hasVariants: true,
        complete: false,
        available: false,
        variant: null,
        stock: 0,
        message: `Please select ${missing.join(", ")}`,
      };
    }

    const variant = getMatchedVariant(item);

    if (!variant) {
      return {
        hasVariants: true,
        complete: true,
        available: false,
        variant: null,
        stock: 0,
        message: "এই combination-এর variant available নেই।",
      };
    }

    const stock = Number(variant.stock || 0);

    return {
      hasVariants: true,
      complete: true,
      available: stock > 0,
      variant,
      stock,
      message:
        stock > 0
          ? `Variant available — Stock: ${stock}`
          : "এই selected variant-এর stock শেষ।",
    };
  };

  /* =======================================================
     GET SELECTED PRODUCT PRICE
  ======================================================= */

  const getSelectedProductPrice = (item) => {
    const status = getVariantStatus(item);

    if (status.hasVariants) {
      if (!status.variant) {
        return 0;
      }

      return (
        Number(status.variant.price || 0) ||
        getProductPrice(item.productData)
      );
    }

    return Number(
      item.price ?? getProductPrice(item.productData),
    );
  };

  /* =======================================================
     GET SELECTED PRODUCT IMAGE
  ======================================================= */

  const getSelectedProductImage = (item) => {
    const variant = getMatchedVariant(item);

    return (
      variant?.image ||
      getProductImage(item.productData)
    );
  };

  /* =======================================================
     CHANGE VARIANT
  ======================================================= */

  const changeProductVariant = (productId, field, value) => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (String(item.product) !== String(productId)) {
          return item;
        }

        const current = getSelectedVariant(item);

        const next = {
          ...current,
          [field]: value,

          ...(field === "color" && {
            ram: "",
            storage: "",
          }),

          ...(field === "ram" && {
            storage: "",
          }),
        };

        return {
          ...item,
          selectedVariant: next,
        };
      }),
    );
  };

  /* =======================================================
     GEO CHANGE
  ======================================================= */

  const handleGeoChange = (level, value) => {
    if (level === "division") {
      setGeo({
        division: value,
        district: "",
        upazila: "",
      });

      setFormData((prev) => ({
        ...prev,
        selectArea: "",
      }));

      return;
    }

    if (level === "district") {
      setGeo((prev) => ({
        ...prev,
        district: value,
        upazila: "",
      }));

      setFormData((prev) => ({
        ...prev,
        selectArea: "",
      }));

      return;
    }

    if (level === "upazila") {
      setGeo((prev) => ({
        ...prev,
        upazila: value,
      }));

      setFormData((prev) => ({
        ...prev,
        selectArea: `${geo.division} > ${geo.district} > ${value}`,
      }));
    }
  };

  /* =======================================================
     FORM CHANGE
  ======================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =======================================================
     SEARCH PRODUCTS
  ======================================================= */

  const searchProducts = async (value) => {
    setSearch(value);
    setSearchError("");

    if (!value.trim()) {
      setProducts([]);
      setSearchLoading(false);
      return;
    }

    try {
      setSearchLoading(true);

      const response = await fetch(
        `${API_BASE}/api/dashboard/products?search=${encodeURIComponent(value.trim())}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load products",
        );
      }

      const productList = Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data?.data)
            ? data.data
            : [];

      const keyword = value.trim().toLowerCase();

      const filteredProducts = productList.filter((product) =>
        String(product?.name || "")
          .toLowerCase()
          .includes(keyword),
      );

      setProducts(filteredProducts);
    } catch (error) {
      console.error("PRODUCT SEARCH ERROR:", error);
      setProducts([]);
      setSearchError(error?.message || "Product search failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  /* =======================================================
     ADD PRODUCT
  ======================================================= */

  const addProduct = (product) => {
    const productId = getProductId(product);

    if (!productId) {
      alert("Product ID is missing.");
      return;
    }

    const existing = selectedProducts.find(
      (item) => String(item.product) === productId,
    );

    if (existing) {
      const status = getVariantStatus(existing);

      if (status.hasVariants && !status.complete) {
        alert(
          "আগে এই product-এর Color, RAM ও Storage select করুন।",
        );

        setSearch("");
        setProducts([]);
        return;
      }

      if (status.hasVariants && !status.available) {
        alert(status.message);
        return;
      }

      if (
        status.hasVariants &&
        existing.quantity >= status.stock
      ) {
        alert(
          `এই variant-এর সর্বোচ্চ ${status.stock}টি stock আছে।`,
        );
        return;
      }

      setSelectedProducts((prev) =>
        prev.map((item) =>
          String(item.product) === productId
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        ),
      );
    } else {
      setSelectedProducts((prev) => [
        ...prev,
        {
          product: productId,
          productData: product,
          quantity: 1,
          price: getProductPrice(product),

          selectedVariant: {
            color: "",
            ram: "",
            storage: "",
          },
        },
      ]);
    }

    setSearch("");
    setProducts([]);
    setSearchError("");
  };

  /* =======================================================
     REMOVE PRODUCT
  ======================================================= */

  const removeProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.filter(
        (item) => String(item.product) !== String(productId),
      ),
    );
  };

  /* =======================================================
     INCREASE QUANTITY
  ======================================================= */

  const increaseQuantity = (productId) => {
    const item = selectedProducts.find(
      (product) => String(product.product) === String(productId),
    );

    if (!item) {
      return;
    }

    const status = getVariantStatus(item);

    if (status.hasVariants && !status.complete) {
      alert(status.message);
      return;
    }

    if (status.hasVariants && !status.available) {
      alert(status.message);
      return;
    }

    if (
      status.hasVariants &&
      item.quantity >= status.stock
    ) {
      alert(
        `এই variant-এর সর্বোচ্চ ${status.stock}টি available আছে।`,
      );
      return;
    }

    setSelectedProducts((prev) =>
      prev.map((product) =>
        String(product.product) === String(productId)
          ? {
              ...product,
              quantity: product.quantity + 1,
            }
          : product,
      ),
    );
  };

  /* =======================================================
     DECREASE QUANTITY
  ======================================================= */

  const decreaseQuantity = (productId) => {
    setSelectedProducts((prev) =>
      prev
        .map((item) =>
          String(item.product) === String(productId)
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  /* =======================================================
     TOTAL ITEMS
  ======================================================= */

  const totalItems = useMemo(
    () =>
      selectedProducts.reduce(
        (total, item) =>
          total + Number(item.quantity || 0),
        0,
      ),
    [selectedProducts],
  );

  /* =======================================================
     SUBTOTAL
  ======================================================= */

  const subTotal = useMemo(
    () =>
      selectedProducts.reduce(
        (total, item) =>
          total +
          getSelectedProductPrice(item) *
            Number(item.quantity || 0),
        0,
      ),
    [selectedProducts],
  );

  /* =======================================================
     DELIVERY CHARGE
  ======================================================= */

  const deliveryCharge = useMemo(() => {
    if (formData.deliveryMethod === "shop_pickup") {
      return 0;
    }

    if (!formData.selectArea) {
      return 0;
    }

    // Dhaka Division: ৳80
    // Other divisions: ৳150
    return geo.division === "Dhaka" ? 80 : 150;
  }, [formData.deliveryMethod, formData.selectArea, geo.division]);

  /* =======================================================
     TOTAL AMOUNT
  ======================================================= */

  const totalAmount = subTotal + deliveryCharge;

  /* =======================================================
     RESET FORM
  ======================================================= */

  const resetForm = () => {
    setFormData({
      ...initialFormData,
    });

    setGeo({
      division: "",
      district: "",
      upazila: "",
    });

    setSearch("");
    setProducts([]);
    setSearchError("");
    setSelectedProducts([]);
  };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const handleClose = () => {
    if (loading) {
      return;
    }

    resetForm();
    onClose?.();
  };

  /* =======================================================
     SUBMIT ORDER
  ======================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    if (!selectedProducts.length) {
      alert("Please select at least one product.");
      return;
    }

    if (!formData.fullName.trim()) {
      alert("Please enter customer name.");
      return;
    }

    if (!formData.phone.trim()) {
      alert("Please enter customer phone number.");
      return;
    }

    if (!formData.selectArea) {
      alert("Please select Division, District and Upazila.");
      return;
    }

    if (!formData.address.trim()) {
      alert("Please enter delivery address.");
      return;
    }

    /* =====================================================
       VALIDATE VARIANTS AND STOCK
    ===================================================== */

    for (const item of selectedProducts) {
      const status = getVariantStatus(item);

      if (status.hasVariants && !status.complete) {
        alert(
          `${item.productData?.name}: ${status.message}`,
        );
        return;
      }

      if (status.hasVariants && !status.available) {
        alert(
          `${item.productData?.name}: ${status.message}`,
        );
        return;
      }

      if (
        status.hasVariants &&
        item.quantity > status.stock
      ) {
        alert(
          `${item.productData?.name}: এই variant-এর মাত্র ${status.stock}টি available আছে।`,
        );
        return;
      }
    }

    try {
      setLoading(true);

      /* ===================================================
         BUILD PRODUCTS PAYLOAD
      =================================================== */

      const orderProducts = selectedProducts.map((item) => {
        const status = getVariantStatus(item);

        const variant = status.hasVariants
          ? status.variant
          : null;

        const price = status.hasVariants
          ? Number(variant?.price || 0) ||
            getProductPrice(item.productData)
          : getSelectedProductPrice(item);

        const quantity = Number(item.quantity || 1);

        const productImage = getSelectedProductImage(item);

        return {
          // Keep these identifiers for backend compatibility.
          product: item.product,
          productId: item.product,

          name: item.productData?.name || "",
          image: productImage,

          price,
          quantity,

          total: price * quantity,
          subtotal: price * quantity,

          slug: item.productData?.slug || "",

          // Checkout-compatible variant object.
          variant: variant
            ? {
                color: variant.color || "",
                ram: variant.ram || "",
                storage: variant.storage || "",
                sku: variant.sku || "",
                variantId: variant.variantId || "",
                variantPrice: Number(variant.price || 0),
                variantStock: Number(variant.stock || 0),
              }
            : null,

          // Flat fields for compatibility with existing APIs.
          color: variant?.color || "",
          ram: variant?.ram || "",
          storage: variant?.storage || "",
          sku: variant?.sku || "",
          variantId: variant?.variantId || "",
        };
      });

      /* ===================================================
         ORDER PAYLOAD
      =================================================== */

      const payload = {
        customerName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),

        selectArea: formData.selectArea,
        deliveryAddress: formData.address.trim(),
        note: formData.note.trim(),

        products: orderProducts,

        totalItems,
        subTotal,
        deliveryCharge,

        discountAmount: 0,
        totalAmount,

        couponCode: "",

        paymentMethod: formData.paymentMethod,
        deliveryMethod: formData.deliveryMethod,

        termsAgreed: true,
        orderSource: "admin",
      };

      console.log("ADMIN CREATE ORDER PAYLOAD:", payload);

      /* ===================================================
         API REQUEST
      =================================================== */

      const response = await fetch(
        `${API_BASE}/products/CreateOrder`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      console.log("CREATE ORDER RESPONSE:", data);

      if (!response.ok || data?.success !== true) {
        throw new Error(
          data?.message || "Order creation failed.",
        );
      }

      const orderId =
        data?.data?.orderId ||
        data?.orderId ||
        "Created";

      alert(
        `Order created successfully!\nOrder ID: ${orderId}`,
      );

      resetForm();

      // Refresh parent order list/dashboard if provided.
      onSuccess?.(data);

      onClose?.();
    } catch (error) {
      console.error("CREATE ORDER ERROR:", error);

      alert(
        error?.message || "Failed to create order.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     DON'T RENDER WHEN CLOSED
  ======================================================= */

  if (!open) {
    return null;
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
              Create New Order
            </h2>

            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Create an order manually from the admin panel
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================================
            FORM BODY
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto bg-[#f8f9fa] p-3 sm:p-6"
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

            {/* =============================================
                LEFT SIDE
            ============================================= */}

            <div className="space-y-5 lg:col-span-2">

              {/* ===========================================
                  CUSTOMER INFORMATION
              =========================================== */}

              <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-4 text-base font-bold text-gray-900">
                  Customer Information
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  {/* NAME */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Customer Name *
                    </label>

                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter customer name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#b40000]"
                    />
                  </div>

                  {/* PHONE */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Phone Number *
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="01XXXXXXXXX"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#b40000]"
                    />
                  </div>

                  {/* EMAIL */}

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Email
                    </label>

                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="customer@email.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#b40000]"
                    />
                  </div>
                </div>

                {/* DELIVERY AREA */}

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Delivery Area *
                  </label>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                    {/* DIVISION */}

                    <select
                      value={geo.division}
                      required
                      onChange={(e) =>
                        handleGeoChange(
                          "division",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b40000]"
                    >
                      <option value="">Select Division</option>

                      {divisions.map((division) => (
                        <option key={division} value={division}>
                          {division}
                        </option>
                      ))}
                    </select>

                    {/* DISTRICT */}

                    <select
                      value={geo.district}
                      required
                      disabled={!geo.division}
                      onChange={(e) =>
                        handleGeoChange(
                          "district",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b40000] disabled:bg-gray-100"
                    >
                      <option value="">Select District</option>

                      {districts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>

                    {/* UPAZILA */}

                    <select
                      value={geo.upazila}
                      required
                      disabled={!geo.district}
                      onChange={(e) =>
                        handleGeoChange(
                          "upazila",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b40000] disabled:bg-gray-100"
                    >
                      <option value="">Select Upazila</option>

                      {upazilas.map((upazila) => (
                        <option key={upazila} value={upazila}>
                          {upazila}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.selectArea && (
                    <p className="mt-2 text-xs text-green-700">
                      <CheckCircle
                        size={14}
                        className="mr-1 inline"
                      />
                      {formData.selectArea}
                    </p>
                  )}
                </div>

                {/* ADDRESS */}

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Delivery Address *
                  </label>

                  <textarea
                    name="address"
                    rows={3}
                    required
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="House, road, area and other address details"
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#b40000]"
                  />
                </div>

                {/* NOTE */}

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Order Note
                  </label>

                  <textarea
                    name="note"
                    rows={2}
                    value={formData.note}
                    onChange={handleChange}
                    placeholder="Optional note"
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#b40000]"
                  />
                </div>
              </section>

              {/* ===========================================
                  PRODUCT SEARCH
              =========================================== */}

              <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-4 text-base font-bold text-gray-900">
                  Add Product
                </h3>

                <div className="relative">
                  <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3">
                    <Search
                      size={18}
                      className="shrink-0 text-gray-400"
                    />

                    <input
                      type="search"
                      value={search}
                      onChange={(e) =>
                        searchProducts(e.target.value)
                      }
                      placeholder="Search product by name..."
                      className="w-full border-0 px-3 py-3 text-sm outline-none"
                    />

                    {searchLoading && (
                      <span className="shrink-0 text-xs text-gray-400">
                        Loading...
                      </span>
                    )}
                  </div>

                  {/* SEARCH ERROR */}

                  {searchError && (
                    <p className="mt-2 text-xs text-red-600">
                      {searchError}
                    </p>
                  )}

                  {/* SEARCH RESULTS */}

                  {products.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                      {products.map((product) => (
                        <button
                          key={getProductId(product)}
                          type="button"
                          onClick={() => addProduct(product)}
                          className="flex w-full items-center gap-3 border-b border-gray-100 p-3 text-left transition last:border-0 hover:bg-gray-50"
                        >
                          <img
                            src={getProductImage(product)}
                            alt={product?.name || "Product"}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/images.png";
                            }}
                            className="h-12 w-12 shrink-0 rounded-md bg-gray-50 object-contain"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {product.name}
                            </p>

                            <p className="mt-1 text-sm font-bold text-[#b40000]">
                              ৳ {formatPrice(getProductPrice(product))}
                            </p>

                            {Array.isArray(product.variants) &&
                              product.variants.length > 0 && (
                                <p className="mt-1 text-xs text-blue-600">
                                  {product.variants.length} variants available
                                </p>
                              )}
                          </div>

                          <Plus
                            size={18}
                            className="shrink-0 text-[#b40000]"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* NO RESULTS */}

                  {!searchLoading &&
                    search.trim() &&
                    !searchError &&
                    products.length === 0 && (
                      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
                        No products found.
                      </div>
                    )}
                </div>

                {/* =========================================
                    SELECTED PRODUCTS
                ========================================= */}

                <div className="mt-5 space-y-4">

                  {selectedProducts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
                      <ShoppingBag
                        size={30}
                        className="mx-auto mb-2 text-gray-300"
                      />

                      No product selected
                    </div>
                  ) : (
                    selectedProducts.map((item) => {
                      const status = getVariantStatus(item);

                      const options = getVariantOptions(item);

                      const selected = getSelectedVariant(item);

                      const matchedVariant = status.variant;

                      const price = getSelectedProductPrice(item);

                      const itemTotal = price * item.quantity;

                      const hasVariants = status.hasVariants;

                      return (
                        <div
                          key={item.product}
                          className="rounded-xl border border-gray-200 p-3 sm:p-4"
                        >
                          <div className="flex items-start gap-3">

                            {/* PRODUCT IMAGE */}

                            <img
                              src={getSelectedProductImage(item)}
                              alt={item.productData?.name || "Product"}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/images.png";
                              }}
                              className="h-16 w-16 shrink-0 rounded-lg bg-gray-50 object-contain sm:h-20 sm:w-20"
                            />

                            {/* PRODUCT DETAILS */}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                                  {item.productData?.name}
                                </p>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeProduct(item.product)
                                  }
                                  aria-label="Remove product"
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <p className="mt-1 text-sm font-bold text-[#b40000]">
                                ৳ {formatPrice(price)}
                              </p>

                              {hasVariants && (
                                <p className="mt-1 text-xs text-gray-500">
                                  Select the exact product variant below.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* =================================
                              VARIANT SELECTORS
                          ================================= */}

                          {hasVariants && (
                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">

                              {/* COLOR */}

                              {options.colors.length > 0 && (
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    Select Color *
                                  </label>

                                  <select
                                    value={selected.color}
                                    onChange={(e) =>
                                      changeProductVariant(
                                        item.product,
                                        "color",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#b40000]"
                                  >
                                    <option value="">
                                      Select Color
                                    </option>

                                    {options.colors.map((color) => (
                                      <option
                                        key={color}
                                        value={color}
                                      >
                                        {color}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* RAM */}

                              {options.rams.length > 0 && (
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    Select RAM *
                                  </label>

                                  <select
                                    value={selected.ram}
                                    disabled={
                                      options.colors.length > 0 &&
                                      !selected.color
                                    }
                                    onChange={(e) =>
                                      changeProductVariant(
                                        item.product,
                                        "ram",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#b40000] disabled:bg-gray-100"
                                  >
                                    <option value="">
                                      {options.colors.length > 0 &&
                                      !selected.color
                                        ? "Select Color First"
                                        : "Select RAM"}
                                    </option>

                                    {options.rams.map((ram) => (
                                      <option key={ram} value={ram}>
                                        {ram}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* STORAGE */}

                              {options.storages.length > 0 && (
                                <div>
                                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    Select Storage *
                                  </label>

                                  <select
                                    value={selected.storage}
                                    disabled={
                                      (options.colors.length > 0 &&
                                        !selected.color) ||
                                      (options.rams.length > 0 &&
                                        !selected.ram)
                                    }
                                    onChange={(e) =>
                                      changeProductVariant(
                                        item.product,
                                        "storage",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#b40000] disabled:bg-gray-100"
                                  >
                                    <option value="">
                                      Select Storage
                                    </option>

                                    {options.storages.map((storage) => (
                                      <option
                                        key={storage}
                                        value={storage}
                                      >
                                        {storage}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}

                          {/* =================================
                              SELECTED VARIANT DETAILS
                          ================================= */}

                          {hasVariants &&
                            (selected.color ||
                              selected.ram ||
                              selected.storage) && (
                              <div className="mt-3 rounded-lg bg-orange-50 p-2.5 text-xs text-orange-800">
                                <b>Selected:</b>{" "}

                                {selected.color &&
                                  `Color: ${selected.color}`}

                                {selected.ram &&
                                  ` • RAM: ${selected.ram}`}

                                {selected.storage &&
                                  ` • Storage: ${selected.storage}`}
                              </div>
                            )}

                          {/* SKU */}

                          {matchedVariant?.sku && (
                            <p className="mt-2 text-xs text-gray-500">
                              SKU: {matchedVariant.sku}
                            </p>
                          )}

                          {/* =================================
                              VARIANT STATUS
                          ================================= */}

                          {hasVariants && (
                            <div
                              className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                                status.available
                                  ? "bg-green-50 text-green-700"
                                  : status.complete
                                    ? "bg-red-50 text-red-600"
                                    : "bg-gray-50 text-gray-600"
                              }`}
                            >
                              {status.available ? (
                                <CheckCircle
                                  size={14}
                                  className="mr-1 inline"
                                />
                              ) : null}

                              <span className="font-semibold">
                                {status.message}
                              </span>
                            </div>
                          )}

                          {/* =================================
                              QUANTITY AND ITEM TOTAL
                          ================================= */}

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">

                            {/* QUANTITY */}

                            <div className="flex items-center rounded-lg border border-gray-300">
                              <button
                                type="button"
                                onClick={() =>
                                  decreaseQuantity(item.product)
                                }
                                aria-label="Decrease quantity"
                                className="flex h-9 w-9 items-center justify-center transition hover:bg-gray-100"
                              >
                                <Minus size={14} />
                              </button>

                              <span className="w-10 text-center text-sm font-semibold">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  increaseQuantity(item.product)
                                }
                                disabled={
                                  hasVariants &&
                                  (!status.available ||
                                    item.quantity >= status.stock)
                                }
                                aria-label="Increase quantity"
                                className="flex h-9 w-9 items-center justify-center transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            {/* ITEM TOTAL */}

                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                Item Total
                              </p>

                              <p className="text-base font-bold text-gray-900">
                                ৳ {formatPrice(itemTotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* ===========================================
                  DELIVERY METHOD
              =========================================== */}

              <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-4 text-base font-bold text-gray-900">
                  Delivery Method
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {/* COURIER */}

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                      formData.deliveryMethod === "courier_service"
                        ? "border-[#b40000] bg-red-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Truck size={20} className="text-gray-600" />

                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        Courier Delivery
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Deliver to customer
                      </p>
                    </div>

                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="courier_service"
                      checked={
                        formData.deliveryMethod === "courier_service"
                      }
                      onChange={handleChange}
                      className="accent-[#b40000]"
                    />
                  </label>

                  {/* PICKUP */}

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                      formData.deliveryMethod === "shop_pickup"
                        ? "border-[#b40000] bg-red-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Store size={20} className="text-gray-600" />

                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        Shop Pickup
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Customer will pickup
                      </p>
                    </div>

                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="shop_pickup"
                      checked={
                        formData.deliveryMethod === "shop_pickup"
                      }
                      onChange={handleChange}
                      className="accent-[#b40000]"
                    />
                  </label>
                </div>
              </section>

              {/* ===========================================
                  PAYMENT METHOD
              =========================================== */}

              <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-4 text-base font-bold text-gray-900">
                  Payment Method
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                  {[
                    {
                      id: "cash_on_delivery",
                      label: "Cash on Delivery",
                      icon: Banknote,
                    },
                    {
                      id: "online_payment",
                      label: "Online Payment",
                      icon: CreditCard,
                    },
                    {
                      id: "partial_payment",
                      label: "Partial Payment",
                      icon: Wallet,
                    },
                  ].map((payment) => {
                    const Icon = payment.icon;

                    const selected =
                      formData.paymentMethod === payment.id;

                    return (
                      <label
                        key={payment.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition ${
                          selected
                            ? "border-[#b40000] bg-red-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <Icon
                          size={19}
                          className="shrink-0 text-gray-600"
                        />

                        <span className="flex-1 text-xs font-medium text-gray-800">
                          {payment.label}
                        </span>

                        <input
                          type="radio"
                          name="paymentMethod"
                          value={payment.id}
                          checked={selected}
                          onChange={handleChange}
                          className="accent-[#b40000]"
                        />
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* =============================================
                RIGHT SIDE — ORDER SUMMARY
            ============================================= */}

            <div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:sticky sm:top-0 sm:p-5">

                <h3 className="mb-5 text-base font-bold text-gray-900">
                  Order Summary
                </h3>

                {/* ITEM COUNT */}

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">
                      Total Items
                    </span>

                    <span className="font-semibold text-gray-900">
                      {totalItems}
                    </span>
                  </div>

                  {/* SUBTOTAL */}

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">
                      Subtotal
                    </span>

                    <span className="font-semibold text-gray-900">
                      ৳ {formatPrice(subTotal)}
                    </span>
                  </div>

                  {/* DELIVERY */}

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">
                      Delivery Charge
                    </span>

                    <span className="font-semibold text-gray-900">
                      ৳ {formatPrice(deliveryCharge)}
                    </span>
                  </div>

                  {/* DISCOUNT */}

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">
                      Discount
                    </span>

                    <span className="font-semibold text-green-600">
                      − ৳ 0
                    </span>
                  </div>
                </div>

                <div className="my-5 border-t border-gray-200" />

                {/* TOTAL */}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-gray-900">
                    Total Amount
                  </span>

                  <span className="text-xl font-bold text-[#b40000]">
                    ৳ {formatPrice(totalAmount)}
                  </span>
                </div>

                {/* VARIANT WARNING */}

                {selectedProducts.some((item) => {
                  const status = getVariantStatus(item);

                  return (
                    status.hasVariants &&
                    (!status.complete || !status.available)
                  );
                }) && (
                  <div className="mt-4 rounded-lg bg-orange-50 p-3 text-xs text-orange-700">
                    Please select valid variants for all products before creating the order.
                  </div>
                )}

                {/* CREATE ORDER */}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedProducts.length ||
                    selectedProducts.some((item) => {
                      const status = getVariantStatus(item);

                      return (
                        status.hasVariants &&
                        (!status.complete || !status.available)
                      );
                    })
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#b40000] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#970000] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={17} />
                      Create Order
                    </>
                  )}
                </button>

                {/* CANCEL */}

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <p className="mt-3 text-center text-xs text-gray-400">
                  Admin manual order
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
