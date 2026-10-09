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
} from "lucide-react";
import { BANGLADESH_GEO } from "../BangladeshLocation.js";
/* =========================================================
   API
========================================================= */

const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";

/* =========================================================
   BANGLADESH GEO DATA
========================================================= */

/* =========================================================
   CREATE ORDER MODAL
========================================================= */

export default function CreateOrderModal({ open, onClose, onSuccess }) {
  /* =======================================================
     CUSTOMER FORM
  ======================================================= */

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    selectArea: "",
    address: "",
    note: "",
    paymentMethod: "cash_on_delivery",
    deliveryMethod: "courier_service",
  });

  /* =======================================================
     GEO STATE (Division → District → Upazila)
  ======================================================= */

  const [geo, setGeo] = useState({
    division: "",
    district: "",
    upazila: "",
  });

  /* =======================================================
     PRODUCT SEARCH
  ======================================================= */

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  /* =======================================================
     SELECTED PRODUCTS
  ======================================================= */

  const [selectedProducts, setSelectedProducts] = useState([]);

  /* =======================================================
     LOADING
  ======================================================= */

  const [loading, setLoading] = useState(false);

  /* =======================================================
     GEO HELPERS
  ======================================================= */

  const divisions = Object.keys(BANGLADESH_GEO);

  const districts = geo.division
    ? Object.keys(BANGLADESH_GEO[geo.division] || {})
    : [];

  const upazilas =
    geo.division && geo.district
      ? BANGLADESH_GEO[geo.division]?.[geo.district] || []
      : [];

  const handleGeoChange = (level, value) => {
    if (level === "division") {
      setGeo({ division: value, district: "", upazila: "" });
      setFormData((prev) => ({ ...prev, selectArea: "" }));
    } else if (level === "district") {
      setGeo((prev) => ({ ...prev, district: value, upazila: "" }));
      setFormData((prev) => ({ ...prev, selectArea: "" }));
    } else if (level === "upazila") {
      setGeo((prev) => ({ ...prev, upazila: value }));
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
     SEARCH PRODUCT
  ======================================================= */

  const searchProducts = async (value) => {
    setSearch(value);

    if (!value.trim()) {
      setProducts([]);
      return;
    }

    try {
      setSearchLoading(true);

      const response = await fetch(
        `${API_BASE}/api/dashboard/products?search=${encodeURIComponent(value)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load products");
      }

      const productList = Array.isArray(data)
        ? data
        : data?.products || data?.data || [];

      const keyword = value.trim().toLowerCase();

      const filteredProducts = productList.filter((product) =>
        product?.name?.toLowerCase().includes(keyword),
      );

      setProducts(filteredProducts);
    } catch (error) {
      console.error("PRODUCT SEARCH ERROR:", error);
      setProducts([]);
    } finally {
      setSearchLoading(false);
    }
  };

  /* =======================================================
     GET PRODUCT IMAGE
  ======================================================= */

  const getProductImage = (product) => {
    if (Array.isArray(product?.images) && product.images.length) {
      return product.images[0];
    }
    return "/images.png";
  };

  /* =======================================================
     GET PRODUCT PRICE
  ======================================================= */

  const getProductPrice = (product) => {
    return Number(product?.discountPrice ?? product?.price ?? 0);
  };

  /* =======================================================
     ADD PRODUCT
  ======================================================= */

  const addProduct = (product) => {
    const productId = product?._id || product?.id;
    if (!productId) return;

    const alreadyExists = selectedProducts.find(
      (item) => String(item.product) === String(productId),
    );

    if (alreadyExists) {
      setSelectedProducts((prev) =>
        prev.map((item) =>
          String(item.product) === String(productId)
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
      setSearch("");
      setProducts([]);
      return;
    }

    const price = getProductPrice(product);

    setSelectedProducts((prev) => [
      ...prev,
      {
        product: productId,
        productData: product,
        quantity: 1,
        price,
      },
    ]);

    setSearch("");
    setProducts([]);
  };

  /* =======================================================
     REMOVE PRODUCT
  ======================================================= */

  const removeProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.filter((item) => String(item.product) !== String(productId)),
    );
  };

  /* =======================================================
     INCREASE
  ======================================================= */

  const increaseQuantity = (productId) => {
    setSelectedProducts((prev) =>
      prev.map((item) =>
        String(item.product) === String(productId)
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    );
  };

  /* =======================================================
     DECREASE
  ======================================================= */

  const decreaseQuantity = (productId) => {
    setSelectedProducts((prev) =>
      prev
        .map((item) =>
          String(item.product) === String(productId)
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  /* =======================================================
     TOTAL ITEMS
  ======================================================= */

  const totalItems = useMemo(() => {
    return selectedProducts.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0,
    );
  }, [selectedProducts]);

  /* =======================================================
     SUB TOTAL
  ======================================================= */

  const subTotal = useMemo(() => {
    return selectedProducts.reduce(
      (total, item) =>
        total + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    );
  }, [selectedProducts]);

  /* =======================================================
     DELIVERY CHARGE
  ======================================================= */

  const deliveryCharge = useMemo(() => {
    if (formData.deliveryMethod === "shop_pickup") {
      return 0;
    }

    if (!geo.division) {
      return 0;
    }

    // Dhaka division → 80, others → 150
    return geo.division === "Dhaka" ? 80 : 150;
  }, [formData.deliveryMethod, geo.division]);

  /* =======================================================
     TOTAL
  ======================================================= */

  const totalAmount = subTotal + deliveryCharge;

  /* =======================================================
     FORMAT PRICE
  ======================================================= */

  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString("en-BD");
  };

  /* =======================================================
     RESET
  ======================================================= */

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      selectArea: "",
      address: "",
      note: "",
      paymentMethod: "cash_on_delivery",
      deliveryMethod: "courier_service",
    });

    setGeo({ division: "", district: "", upazila: "" });
    setSearch("");
    setProducts([]);
    setSelectedProducts([]);
  };

  /* =======================================================
     CLOSE
  ======================================================= */

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose?.();
  };

  /* =======================================================
     CREATE ORDER
  ======================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

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

    try {
      setLoading(true);

      const orderProducts = selectedProducts.map((item) => ({
        product: item.product,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        total: Number(item.price || 0) * Number(item.quantity || 1),
      }));

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

      const response = await fetch(`${API_BASE}/products/CreateOrder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("CREATE ORDER RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data?.message || "Order creation failed");
      }

      if (data?.success) {
        alert(
          `Order created successfully!\nOrder ID: ${
            data?.data?.orderId || data?.orderId || "Created"
          }`,
        );

        resetForm();
        onSuccess?.(data);
        onClose?.();
      } else {
        alert(data?.message || "Something went wrong.");
      }
    } catch (error) {
      console.error("CREATE ORDER ERROR:", error);
      alert(error?.message || "Failed to create order.");
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     DON'T RENDER
  ======================================================= */

  if (!open) {
    return null;
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[94vh] w-full max-w-[1150px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Create New Order
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Create order manually from admin panel
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto bg-[#f8f9fa] p-6"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* LEFT */}
            <div className="space-y-6 lg:col-span-2">
              {/* CUSTOMER INFORMATION */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 text-base font-bold">
                  Customer Information
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Customer Name
                    </label>
                    <input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter customer name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#b40000]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Phone Number
                    </label>
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="01XXXXXXXXX"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#b40000]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
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

                {/* DELIVERY AREA - Cascading Selects */}
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium">
                    Delivery Area
                  </label>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {/* Division */}
                    <select
                      value={geo.division}
                      onChange={(e) =>
                        handleGeoChange("division", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b40000]"
                    >
                      <option value="">Select Division</option>
                      {divisions.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                    </select>

                    {/* District */}
                    <select
                      value={geo.district}
                      onChange={(e) =>
                        handleGeoChange("district", e.target.value)
                      }
                      disabled={!geo.division}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b40000] disabled:bg-gray-100"
                    >
                      <option value="">Select District</option>
                      {districts.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>

                    {/* Upazila */}
                    <select
                      value={geo.upazila}
                      onChange={(e) =>
                        handleGeoChange("upazila", e.target.value)
                      }
                      disabled={!geo.district}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b40000] disabled:bg-gray-100"
                    >
                      <option value="">Select Upazila</option>
                      {upazilas.map((upa) => (
                        <option key={upa} value={upa}>
                          {upa}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium">
                    Delivery Address
                  </label>
                  <textarea
                    name="address"
                    rows={3}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter full delivery address"
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#b40000]"
                  />
                </div>

                {/* Order Note */}
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium">
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
              </div>

              {/* PRODUCT SEARCH */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 text-base font-bold">Add Product</h3>

                <div className="relative">
                  <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3">
                    <Search size={18} className="text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => searchProducts(e.target.value)}
                      placeholder="Search product..."
                      className="w-full border-0 px-3 py-3 text-sm outline-none"
                    />
                    {searchLoading && (
                      <span className="text-xs text-gray-400">Loading...</span>
                    )}
                  </div>

                  {/* SEARCH RESULTS */}
                  {products.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                      {products.map((product) => (
                        <button
                          key={product._id || product.id}
                          type="button"
                          onClick={() => addProduct(product)}
                          className="flex w-full items-center gap-3 border-b border-gray-100 p-3 text-left hover:bg-gray-50"
                        >
                          <img
                            src={getProductImage(product)}
                            alt=""
                            className="h-12 w-12 rounded-md object-contain"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {product.name}
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#b40000]">
                              ৳ {formatPrice(getProductPrice(product))}
                            </p>
                          </div>
                          <Plus size={18} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* SELECTED PRODUCTS */}
                <div className="mt-5 space-y-3">
                  {selectedProducts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
                      No product selected
                    </div>
                  ) : (
                    selectedProducts.map((item) => (
                      <div
                        key={item.product}
                        className="flex items-center gap-4 rounded-lg border border-gray-200 p-3"
                      >
                        <img
                          src={getProductImage(item.productData)}
                          alt=""
                          className="h-16 w-16 rounded-lg bg-gray-50 object-contain"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {item.productData?.name}
                          </p>
                          <p className="mt-1 text-sm font-bold text-[#b40000]">
                            ৳ {formatPrice(item.price)}
                          </p>
                        </div>

                        {/* QUANTITY */}
                        <div className="flex items-center rounded-lg border border-gray-300">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item.product)}
                            className="flex h-8 w-8 items-center justify-center hover:bg-gray-100"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseQuantity(item.product)}
                            className="flex h-8 w-8 items-center justify-center hover:bg-gray-100"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* REMOVE */}
                        <button
                          type="button"
                          onClick={() => removeProduct(item.product)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* DELIVERY METHOD */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 text-base font-bold">Delivery Method</h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="courier_service"
                      checked={formData.deliveryMethod === "courier_service"}
                      onChange={handleChange}
                    />
                    <Truck size={19} />
                    <div>
                      <p className="text-sm font-semibold">Courier Delivery</p>
                      <p className="text-xs text-gray-500">
                        Deliver to customer
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="shop_pickup"
                      checked={formData.deliveryMethod === "shop_pickup"}
                      onChange={handleChange}
                    />
                    <Store size={19} />
                    <div>
                      <p className="text-sm font-semibold">Shop Pickup</p>
                      <p className="text-xs text-gray-500">
                        Customer will pickup
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* PAYMENT METHOD */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 text-base font-bold">Payment Method</h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash_on_delivery"
                      checked={formData.paymentMethod === "cash_on_delivery"}
                      onChange={handleChange}
                    />
                    <Banknote size={17} />
                    <span className="text-sm">Cash on Delivery</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online_payment"
                      checked={formData.paymentMethod === "online_payment"}
                      onChange={handleChange}
                    />
                    <CreditCard size={17} />
                    <span className="text-sm">Online Payment</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="partial_payment"
                      checked={formData.paymentMethod === "partial_payment"}
                      onChange={handleChange}
                    />
                    <Wallet size={17} />
                    <span className="text-sm">Partial Payment</span>
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT SUMMARY */}
            <div>
              <div className="sticky top-0 rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-5 text-base font-bold">Order Summary</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Items</span>
                    <span className="font-semibold">{totalItems}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold">
                      ৳ {formatPrice(subTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery</span>
                    <span className="font-semibold">
                      ৳ {formatPrice(deliveryCharge)}
                    </span>
                  </div>
                </div>

                <div className="my-5 border-t border-gray-200" />

                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Total</span>
                  <span className="text-xl font-bold text-[#b40000]">
                    ৳ {formatPrice(totalAmount)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading || !selectedProducts.length}
                  className="mt-6 w-full rounded-lg bg-[#b40000] px-4 py-3 text-sm font-bold text-white hover:bg-[#970000] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creating Order..." : "Create Order"}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
