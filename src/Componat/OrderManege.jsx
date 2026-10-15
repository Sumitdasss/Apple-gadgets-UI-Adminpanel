import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Package,
  UserRound,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  CalendarDays,
  Hash,
  Truck,
  CheckCircle2,
  Clock3,
  XCircle,
  ShoppingBag,
  Receipt,
  X,
} from "lucide-react";
import "./invoice-print.css";

const API_BASE = (
  import.meta.env.VITE_API_URL || "https://apple-gadgets-ui-backend.vercel.app"
).replace(/\/+$/, "");

const ORDERS_API = `${API_BASE}/api/dashboard/order`;
const BULK_API = `${API_BASE}/api/dashboard/bulk-update`;
const SINGLE_ORDER_API = `${API_BASE}/api/dashboard/orders`;

const PAGE_SIZE = 20;

const STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready_for_shipment",
  "handed_over_to_courier",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
];

const SOURCES = ["website", "facebook_messenger", "admin"];

const getOrderId = (order) => String(order?._id || order?.id || "");

const getProductInfo = (item) => {
  const populatedProduct =
    item?.product &&
    typeof item.product === "object" &&
    !Array.isArray(item.product)
      ? item.product
      : null;

  return {
    name: item?.name || populatedProduct?.name || "Product unavailable",
    price: item?.price ?? populatedProduct?.price ?? 0,
    quantity: item?.quantity ?? 1,
    image: item?.image || populatedProduct?.images?.[0] || "",
    color: item?.color || "",
    ram: item?.ram || "",
    storage: item?.storage || "",
  };
};

const formatMoney = (value) =>
  `৳${Number(value ?? 0).toLocaleString("en-BD")}`;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-BD");
};

const formatStatus = (status = "") =>
  status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const getStatusClass = (status) => {
  const classes = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
    ready_for_shipment: "bg-purple-50 text-purple-700 border-purple-200",
    handed_over_to_courier: "bg-violet-50 text-violet-700 border-violet-200",
    shipped: "bg-cyan-50 text-cyan-700 border-cyan-200",
    delivered: "bg-green-50 text-green-700 border-green-200",
    returned: "bg-orange-50 text-orange-700 border-orange-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  return classes[status] || "bg-slate-50 text-slate-700 border-slate-200";
};

const humanize = (value) =>
  String(value || "Not available")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getStatusStyle = (status) => {
  const value = String(status || "pending").toLowerCase();
  if (["delivered", "completed", "paid"].includes(value)) {
    return { className: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 };
  }
  if (["cancelled", "canceled", "returned", "failed"].includes(value)) {
    return { className: "bg-red-50 text-red-700 border-red-200", icon: XCircle };
  }
  if (["shipped", "handed_over_to_courier", "ready_for_shipment"].includes(value)) {
    return { className: "bg-blue-50 text-blue-700 border-blue-200", icon: Truck };
  }
  if (["confirmed", "processing"].includes(value)) {
    return { className: "bg-purple-50 text-purple-700 border-purple-200", icon: RefreshCw };
  }
  return { className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock3 };
};

const StatusBadge = ({ status }) => {
  const style = getStatusStyle(status);
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${style.className}`}>
      <Icon size={14} />
      {humanize(status)}
    </span>
  );
};

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 py-2">
    {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-gray-400" />}
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-gray-800">
        {value === undefined || value === null || value === "" ? "Not available" : String(value)}
      </p>
    </div>
  </div>
);

async function apiRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    console.error("Network/API connection error:", error);
    throw new Error("Backend server-এর সঙ্গে সংযোগ হচ্ছে না। Server চালু আছে কি না দেখো।");
  }

  const responseText = await response.text();
  let result = {};
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || result.error || `API request failed with status ${response.status}`
    );
  }
  return result;
}

export default function OrderManege() {
  const [orders, setOrders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showInvoices, setShowInvoices] = useState(false);
  const [invoiceOrders, setInvoiceOrders] = useState([]);

  // ===== Details Panel =====
  const [showDetails, setShowDetails] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [courierProvider, setCourierProvider] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      if (courierProvider.trim()) params.set("courierProvider", courierProvider.trim());
      if (source) params.set("source", source);

      const result = await apiRequest(`${ORDERS_API}?${params.toString()}`);
      const rows = Array.isArray(result.data) ? result.data : [];
      const total = Number(result.pagination?.total ?? 0);
      const pages = Math.max(
        1,
        Number(result.pagination?.pages ?? Math.ceil(total / PAGE_SIZE) ?? 1)
      );

      setOrders(rows);
      setPagination({ total, pages });
      const visibleIds = new Set(rows.map(getOrderId));
      setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));
    } catch (err) {
      setError(err.message || "অর্ডার লোড করা যায়নি।");
      setOrders([]);
      setPagination({ total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, search, status, courierProvider, source]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const toggleSelect = (id) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const visibleIds = orders.map(getOrderId).filter(Boolean);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])]
    );
  };

  const openSelectedInvoices = () => {
    const selected = orders.filter((order) => selectedIds.includes(getOrderId(order)));
    if (!selected.length) {
      setError("প্রথমে অন্তত একটি অর্ডার নির্বাচন করো।");
      return;
    }
    setInvoiceOrders(selected);
    setShowInvoices(true);
    setError("");
  };

  const openSingleInvoice = (order) => {
    setInvoiceOrders([order]);
    setShowInvoices(true);
    setError("");
  };

  const printInvoices = () => {
    if (!invoiceOrders.length) return;
    window.print();
  };

  // ===== Open Full Details on Right Side =====
  const openOrderDetails = async (order) => {
    const id = getOrderId(order);
    if (!id) return;

    setShowDetails(true);
    setDetailsOrder(order);
    setDetailsLoading(true);
    setError("");

    try {
      const result = await apiRequest(`${SINGLE_ORDER_API}/${encodeURIComponent(id)}`);
      const data =
        result?.data?.order ??
        result?.data?.data ??
        result?.data ??
        result?.order ??
        result;

      if (data && typeof data === "object" && !Array.isArray(data)) {
        setDetailsOrder(data);
      }
    } catch (err) {
      // list data already shown
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeOrderDetails = () => {
    setShowDetails(false);
    setDetailsOrder(null);
    setDetailsLoading(false);
  };

  const updateSingleOrder = async (id, newStatus) => {
    if (!id || !newStatus) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`${SINGLE_ORDER_API}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setNotice("অর্ডারের স্ট্যাটাস আপডেট হয়েছে।");
      await loadOrders();
      if (detailsOrder && getOrderId(detailsOrder) === id) {
        setDetailsOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
    } catch (err) {
      setError(err.message || "স্ট্যাটাস আপডেট করা যায়নি।");
    } finally {
      setBusy(false);
    }
  };

  const bulkUpdate = async (field, value) => {
    if (!selectedIds.length) {
      setError("প্রথমে অন্তত একটি অর্ডার নির্বাচন করো।");
      return;
    }
    const cleanValue = String(value || "").trim();
    if (!cleanValue) {
      setError("আপডেট করার একটি অপশন নির্বাচন করো।");
      return;
    }
    if (field === "status" && !STATUSES.includes(cleanValue)) {
      setError("সঠিক order status নির্বাচন করো।");
      return;
    }
    if (field === "source" && !SOURCES.includes(cleanValue)) {
      setError("সঠিক order source নির্বাচন করো।");
      return;
    }
    if (!["status", "source", "courierProvider"].includes(field)) {
      setError("এই update field সমর্থিত নয়।");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = { orderIds: selectedIds };
      if (field === "status") body.status = cleanValue;
      if (field === "source") body.source = cleanValue;
      if (field === "courierProvider") body.courierProvider = cleanValue;

      const result = await apiRequest(BULK_API, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setNotice(result.message || "অর্ডারগুলো আপডেট হয়েছে।");
      setSelectedIds([]);
      await loadOrders();
    } catch (err) {
      setError(err.message || "Bulk update করা যায়নি।");
    } finally {
      setBusy(false);
    }
  };

  const deleteOrder = async (id) => {
    if (!id) return;
    const confirmed = window.confirm("তুমি কি এই অর্ডারটি ডিলিট করতে চাও?");
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(`${SINGLE_ORDER_API}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setNotice(result.message || "অর্ডার ডিলিট হয়েছে।");
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      if (detailsOrder && getOrderId(detailsOrder) === id) closeOrderDetails();
      if (orders.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await loadOrders();
      }
    } catch (err) {
      setError(err.message || "অর্ডার ডিলিট করা যায়নি।");
    } finally {
      setBusy(false);
    }
  };

  const changeFilter = (setter, value) => {
    setter(value);
    setPage(1);
    setSelectedIds([]);
    setError("");
    setNotice("");
  };

  // ===== Details derived values =====
  const d = detailsOrder;
  const dProducts = Array.isArray(d?.products) ? d.products : [];
  const dCustomer = typeof d?.customer === "object" ? d.customer : {};
  const dCustomerName = d?.customerName ?? dCustomer?.name ?? d?.name;
  const dPhone = d?.phone ?? d?.customerPhone ?? dCustomer?.phone;
  const dEmail = d?.email ?? d?.customerEmail ?? dCustomer?.email;
  const dAddress = d?.deliveryAddress ?? d?.address ?? dCustomer?.address;
  const dStatus = d?.orderStatus ?? d?.status ?? "pending";
  const dPaymentMethod = d?.paymentMethod ?? d?.paymentType ?? d?.payment?.method;
  const dPaymentStatus = d?.paymentStatus ?? d?.payment?.status ?? "Not available";
  const dSubtotal = Number(d?.subtotal ?? d?.subTotal ?? d?.totalAmount ?? 0);
  const dDelivery = Number(d?.deliveryCharge ?? d?.shippingCost ?? 0);
  const dDiscount = Number(d?.discount ?? d?.discountAmount ?? 0);
  const dTotal = Number(
    d?.grandTotal ?? d?.finalAmount ?? d?.total ?? d?.totalAmount ?? dSubtotal + dDelivery - dDiscount
  );
  const dCourier =
    d?.courierDetails?.provider ?? d?.courier ?? d?.courierName ?? d?.courierProvider;
  const dTracking =
    d?.courierDetails?.trackingCode ?? d?.trackingNumber ?? d?.trackingId ?? d?.consignmentId;

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">Order Management</h1>
            <p className="mt-1 text-sm text-slate-500">মোট অর্ডার: {pagination.total}</p>
          </div>
          <button
            type="button"
            onClick={loadOrders}
            disabled={loading || busy}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </header>

        {error && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="font-bold" aria-label="Dismiss error">×</button>
          </div>
        )}

        {notice && (
          <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} className="font-bold" aria-label="Dismiss notice">×</button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={search}
            onChange={(e) => changeFilter(setSearch, e.target.value)}
            placeholder="Order ID, customer, phone..."
            className="min-w-0 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            value={status}
            onChange={(e) => changeFilter(setStatus, e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>{formatStatus(item)}</option>
            ))}
          </select>
          <input
            value={courierProvider}
            onChange={(e) => changeFilter(setCourierProvider, e.target.value)}
            placeholder="Courier provider"
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <select
            value={source}
            onChange={(e) => changeFilter(setSource, e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All sources</option>
            <option value="website">Website</option>
            <option value="facebook_messenger">Facebook Messenger</option>
            <option value="admin">Admin</option>
          </select>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-sm font-semibold">Selected: {selectedIds.length}</span>
          <button
            type="button"
            onClick={openSelectedInvoices}
            disabled={loading || busy || selectedIds.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            View Selected Invoices ({selectedIds.length})
          </button>
          <select
            key={`bulk-status-${selectedIds.length}`}
            defaultValue=""
            disabled={busy || !selectedIds.length}
            onChange={(e) => {
              const value = e.target.value;
              if (value) bulkUpdate("status", value);
              e.target.value = "";
            }}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Bulk: change status</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>{formatStatus(item)}</option>
            ))}
          </select>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget).get("courier")?.toString().trim();
              if (value) bulkUpdate("courierProvider", value);
              else setError("Courier name লিখো।");
            }}
          >
            <input name="courier" placeholder="Courier name" disabled={busy || !selectedIds.length} className="min-w-0 rounded-lg border px-3 py-2 text-sm disabled:opacity-50" />
            <button type="submit" disabled={busy || !selectedIds.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Update Courier</button>
          </form>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget).get("source")?.toString().trim();
              if (value) bulkUpdate("source", value);
              else setError("Order source নির্বাচন করো।");
            }}
          >
            <select name="source" defaultValue="" disabled={busy || !selectedIds.length} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">
              <option value="">Select source</option>
              {SOURCES.map((item) => (
                <option key={item} value={item}>{formatStatus(item)}</option>
              ))}
            </select>
            <button type="submit" disabled={busy || !selectedIds.length} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Update Source</button>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="Select all visible orders" />
                  </th>
                  <th className="p-3">Order</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Products</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Courier / Source</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="p-10 text-center text-slate-500">অর্ডার লোড হচ্ছে...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={9} className="p-10 text-center text-slate-500">কোনো অর্ডার পাওয়া যায়নি।</td></tr>
                ) : (
                  orders.map((order) => {
                    const id = getOrderId(order);
                    const products = Array.isArray(order.products) ? order.products : [];
                    return (
                      <tr key={id} className="align-top hover:bg-slate-50">
                        <td className="p-3">
                          <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleSelect(id)} aria-label={`Select order ${order.orderId || id}`} />
                        </td>
                        <td className="p-3">
                          <p className="font-semibold">{order.orderId || id || "—"}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatStatus(order.paymentMethod || "—")}</p>
                          <p className="mt-1 text-xs text-slate-500">Payment: {formatStatus(order.paymentStatus || "unpaid")}</p>
                        </td>
                        <td className="max-w-48 p-3">
                          <p className="font-medium">{order.customerName || order.customer?.name || "—"}</p>
                          <p className="text-xs text-slate-500">{order.phone || order.customer?.phone || "—"}</p>
                          {order.email && <p className="break-all text-xs text-slate-500">{order.email}</p>}
                          <p className="mt-1 break-words text-xs text-slate-500">{order.deliveryAddress || "—"}</p>
                        </td>
                        <td className="max-w-64 p-3">
                          {products.length ? (
                            <ul className="space-y-3">
                              {products.map((item, index) => {
                                const product = getProductInfo(item);
                                return (
                                  <li key={item._id || item.product?._id || index} className="flex gap-2">
                                    {product.image ? (
                                      <img src={product.image} alt={product.name} loading="lazy" className="h-12 w-12 shrink-0 rounded-lg border object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                    ) : null}
                                    <div className="min-w-0">
                                      <p className="break-words font-medium">{product.name}</p>
                                      <p className="text-xs text-slate-500">Qty: {product.quantity} · {formatMoney(product.price)}</p>
                                      {(product.color || product.ram || product.storage) && (
                                        <p className="mt-1 text-xs text-slate-500">{[product.color, product.ram, product.storage].filter(Boolean).join(" / ")}</p>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : "—"}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold">{formatMoney(order.totalAmount)}</p>
                          {Number(order.subTotal) > 0 && <p className="text-xs text-slate-500">Subtotal: {formatMoney(order.subTotal)}</p>}
                          {Number(order.discountAmount) > 0 && <p className="text-xs text-green-700">Discount: {formatMoney(order.discountAmount)}</p>}
                          {Number(order.deliveryCharge) > 0 && <p className="text-xs text-slate-500">Delivery: {formatMoney(order.deliveryCharge)}</p>}
                        </td>
                        <td className="p-3">
                          <p>{order.courierDetails?.provider || "—"}</p>
                          {order.courierDetails?.trackingCode && <p className="mt-1 text-xs text-slate-500">Tracking: {order.courierDetails.trackingCode}</p>}
                          <p className="mt-1 text-xs text-slate-500">{formatStatus(order.source || "—")}</p>
                        </td>
                        <td className="p-3">
                          <span className={`mb-2 inline-block rounded-full border px-2 py-1 text-xs font-medium ${getStatusClass(order.status)}`}>
                            {formatStatus(order.status || "pending")}
                          </span>
                          <select
                            value={order.status || "pending"}
                            disabled={busy}
                            onChange={(e) => updateSingleOrder(id, e.target.value)}
                            className="block max-w-44 rounded-lg border px-2 py-2 text-xs disabled:opacity-50"
                            aria-label={`Update status for ${order.orderId || id}`}
                          >
                            {STATUSES.map((item) => (
                              <option key={item} value={item}>{formatStatus(item)}</option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap p-3 text-xs text-slate-500">{formatDate(order.createdAt)}</td>
                        <td className="p-3">
                          <div className="flex flex-col items-start gap-2">
                            <button
                              type="button"
                              onClick={() => openOrderDetails(order)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => openSingleInvoice(order)}
                              className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                            >
                              Invoice
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => deleteOrder(id)}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-col justify-between gap-3 border-t p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">Total: {pagination.total} · Page {page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading || busy} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= pagination.pages || loading || busy} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">Next</button>
            </div>
          </footer>
        </section>
      </div>

      {/* ========== FULL ORDER DETAILS – RIGHT SIDE PANEL ========== */}
      {showDetails && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/50" onClick={closeOrderDetails} />

          <aside className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-gray-50 shadow-2xl">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-100 p-2.5">
                  <Receipt size={20} className="text-gray-800" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
                  <p className="text-sm text-gray-500">
                    {d?.orderId ?? d?._id ?? "—"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeOrderDetails}
                className="rounded-lg border p-2 hover:bg-gray-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {detailsLoading && !d ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="animate-spin text-gray-500" size={32} />
                  <p className="mt-3 text-sm text-gray-500">Loading order details...</p>
                </div>
              ) : !d ? (
                <p className="py-20 text-center text-sm text-gray-500">Order not found.</p>
              ) : (
                <div className="space-y-5">
                  {/* Summary card */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Order Number</p>
                        <h3 className="mt-1 break-all text-xl font-extrabold text-gray-900">
                          {d.orderId ?? d._id}
                        </h3>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StatusBadge status={dStatus} />
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <CalendarDays size={13} />
                            {formatDate(d.createdAt ?? d.orderDate)}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-5 py-4 text-right">
                        <p className="text-sm text-gray-500">Order Total</p>
                        <p className="mt-1 text-2xl font-extrabold text-gray-900">
                          {formatMoney(dTotal)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {dProducts.length} product item type(s)
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Customer */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
                      <div className="rounded-lg bg-gray-100 p-2"><UserRound size={18} className="text-gray-700" /></div>
                      <h3 className="font-bold text-gray-900">Customer Information</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                      <InfoRow label="Customer Name" value={dCustomerName} icon={UserRound} />
                      <InfoRow label="Phone Number" value={dPhone} icon={Phone} />
                      <InfoRow label="Email Address" value={dEmail} icon={Mail} />
                      <InfoRow
                        label="Customer ID"
                        value={typeof d.customer === "object" ? d.customer?._id : d.customerId}
                        icon={Hash}
                      />
                    </div>
                  </section>

                  {/* Delivery */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
                      <div className="rounded-lg bg-gray-100 p-2"><Truck size={18} className="text-gray-700" /></div>
                      <h3 className="font-bold text-gray-900">Delivery Information</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                      <InfoRow label="Delivery Address" value={dAddress} icon={MapPin} />
                      <InfoRow label="Division" value={d.division ?? d.selectDivision} />
                      <InfoRow label="District" value={d.district ?? d.selectDistrict} />
                      <InfoRow label="Area / Upazila" value={d.selectArea ?? d.upazila ?? d.area} />
                      <InfoRow label="Courier" value={dCourier} icon={Truck} />
                      <InfoRow label="Tracking Number" value={dTracking} icon={Hash} />
                    </div>
                    {d.notes && (
                      <div className="mt-3 rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-semibold text-gray-500">Order Notes</p>
                        <p className="mt-1 text-sm text-gray-800">{d.notes}</p>
                      </div>
                    )}
                  </section>

                  {/* Products */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
                      <div className="rounded-lg bg-gray-100 p-2"><ShoppingBag size={18} className="text-gray-700" /></div>
                      <h3 className="font-bold text-gray-900">Ordered Products</h3>
                    </div>
                    {dProducts.length === 0 ? (
                      <div className="py-8 text-center">
                        <Package size={32} className="mx-auto text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">No product items found.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dProducts.map((product, index) => {
                          const info = getProductInfo(product);
                          const qty = Number(info.quantity || 1);
                          const price = Number(info.price || 0);
                          const lineTotal = Number(product.subtotal ?? product.total ?? price * qty);
                          return (
                            <div
                              key={product._id ?? product.productId ?? index}
                              className="flex flex-col gap-3 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-center"
                            >
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                                {info.image ? (
                                  <img src={info.image} alt={info.name} className="h-full w-full object-contain" loading="lazy" />
                                ) : (
                                  <Package size={24} className="text-gray-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-gray-900">{info.name}</h4>
                                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-gray-500">
                                  {info.color && <span className="rounded-md bg-gray-100 px-2 py-0.5">Color: {info.color}</span>}
                                  {info.ram && <span className="rounded-md bg-gray-100 px-2 py-0.5">RAM: {info.ram}</span>}
                                  {info.storage && <span className="rounded-md bg-gray-100 px-2 py-0.5">Storage: {info.storage}</span>}
                                </div>
                                <p className="mt-1 text-xs text-gray-500">{formatMoney(price)} × {qty}</p>
                              </div>
                              <div className="sm:text-right">
                                <p className="text-xs text-gray-500">Item Total</p>
                                <p className="font-extrabold text-gray-900">{formatMoney(lineTotal)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Payment */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
                      <div className="rounded-lg bg-gray-100 p-2"><CreditCard size={18} className="text-gray-700" /></div>
                      <h3 className="font-bold text-gray-900">Payment Information</h3>
                    </div>
                    <InfoRow label="Payment Method" value={humanize(dPaymentMethod)} icon={CreditCard} />
                    <InfoRow label="Payment Status" value={humanize(dPaymentStatus)} />
                    <InfoRow
                      label="Transaction ID"
                      value={d.transactionId ?? d.paymentTransactionId ?? d.payment?.transactionId}
                      icon={Hash}
                    />
                    <div className="my-3 border-t border-gray-100" />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-semibold text-gray-800">{formatMoney(dSubtotal)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Delivery Charge</span>
                        <span className="font-semibold text-gray-800">{formatMoney(dDelivery)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Discount</span>
                        <span className="font-semibold text-green-600">-{formatMoney(dDiscount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-3">
                        <span className="font-bold text-gray-900">Grand Total</span>
                        <span className="text-xl font-extrabold text-gray-900">{formatMoney(dTotal)}</span>
                      </div>
                    </div>
                  </section>

                  {/* Order Info */}
                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
                      <div className="rounded-lg bg-gray-100 p-2"><Package size={18} className="text-gray-700" /></div>
                      <h3 className="font-bold text-gray-900">Order Information</h3>
                    </div>
                    <InfoRow label="Order ID" value={d.orderId ?? d._id} icon={Hash} />
                    <InfoRow label="Order Source" value={humanize(d.orderSource ?? d.source)} />
                    <InfoRow label="Created At" value={formatDate(d.createdAt ?? d.orderDate)} icon={CalendarDays} />
                    <InfoRow label="Last Updated" value={formatDate(d.updatedAt)} icon={CalendarDays} />
                    <InfoRow
                      label="Shipping Status"
                      value={humanize(d.shippingStatus ?? d.shipmentStatus ?? d.courierStatus)}
                      icon={Truck}
                    />
                  </section>

                  {/* Status summary box */}
                  <div className="rounded-2xl bg-gray-900 p-5 text-white">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={22} />
                      <h3 className="font-bold">Order Summary</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      Review customer order, delivery, products and payment before processing.
                    </p>
                    <div className="mt-3 border-t border-gray-700 pt-3">
                      <p className="text-xs text-gray-400">Current Status</p>
                      <p className="mt-1 font-bold">{humanize(dStatus)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ========== INVOICE MODAL ========== */}
      {showInvoices && (
        <div className="invoice-modal fixed inset-0 z-[100] overflow-y-auto bg-slate-900/70 p-3 sm:p-6">
          <div className="mx-auto max-w-5xl rounded-xl bg-white p-4 shadow-2xl sm:p-8">
            <div className="invoice-controls mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Invoice Preview</h2>
                <p className="text-sm text-slate-500">{invoiceOrders.length} invoice(s)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={printInvoices} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                  Print / Save PDF
                </button>
                <button type="button" onClick={() => setShowInvoices(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                  Close
                </button>
              </div>
            </div>

            <div className="invoice-list space-y-8">
              {invoiceOrders.map((order) => {
                const products = Array.isArray(order.products) ? order.products : [];
                const subtotal =
                  order.subTotal ??
                  products.reduce((sum, item) => {
                    const product = getProductInfo(item);
                    return sum + Number(product.price) * Number(product.quantity);
                  }, 0);

                return (
                  <article key={getOrderId(order)} className="invoice-sheet mx-auto max-w-3xl border border-slate-200 p-5 sm:p-8">
                    <header className="flex flex-wrap justify-between gap-4 border-b-2 border-slate-900 pb-5">
                      <div>
                        <h1 className="text-2xl font-black tracking-wide">APPLE GADGETS</h1>
                        <p className="mt-1 text-sm text-slate-500">Customer Invoice</p>
                      </div>
                      <div className="text-right">
                        <h2 className="text-xl font-bold">INVOICE</h2>
                        <p className="mt-2 text-sm">Order ID: {order.orderId || getOrderId(order)}</p>
                        <p className="mt-1 text-sm">Date: {formatDate(order.createdAt)}</p>
                        <p className="mt-1 text-sm">Status: {formatStatus(order.status || "pending")}</p>
                      </div>
                    </header>

                    <section className="grid grid-cols-1 gap-5 py-6 sm:grid-cols-2">
                      <div>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Bill To</h3>
                        <p className="font-semibold">{order.customerName || order.customer?.name || "—"}</p>
                        <p className="mt-1 text-sm">Phone: {order.phone || order.customer?.phone || "—"}</p>
                        {order.email && <p className="mt-1 break-all text-sm">Email: {order.email}</p>}
                        <p className="mt-2 text-sm">Address: {order.deliveryAddress || "—"}</p>
                      </div>
                      <div className="sm:text-right">
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Payment Information</h3>
                        <p className="text-sm">Method: {formatStatus(order.paymentMethod || "—")}</p>
                        <p className="mt-1 text-sm">Payment status: {formatStatus(order.paymentStatus || "unpaid")}</p>
                        <p className="mt-1 text-sm">Source: {formatStatus(order.source || "website")}</p>
                      </div>
                    </section>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-y bg-slate-50">
                            <th className="p-3">Product</th>
                            <th className="p-3 text-center">Qty</th>
                            <th className="p-3 text-right">Price</th>
                            <th className="p-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((item, index) => {
                            const product = getProductInfo(item);
                            const lineTotal = Number(product.price) * Number(product.quantity);
                            return (
                              <tr key={item._id || index} className="border-b">
                                <td className="p-3">
                                  <p className="font-medium">{product.name}</p>
                                  {(product.color || product.ram || product.storage) && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      {[product.color, product.ram, product.storage].filter(Boolean).join(" / ")}
                                    </p>
                                  )}
                                </td>
                                <td className="p-3 text-center">{product.quantity}</td>
                                <td className="p-3 text-right">{formatMoney(product.price)}</td>
                                <td className="p-3 text-right font-medium">{formatMoney(lineTotal)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="ml-auto mt-6 max-w-sm space-y-2 text-sm">
                      <div className="flex justify-between gap-4"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
                      {Number(order.discountAmount) > 0 && (
                        <div className="flex justify-between gap-4 text-green-700">
                          <span>Discount</span><span>-{formatMoney(order.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-4"><span>Delivery Charge</span><span>{formatMoney(order.deliveryCharge)}</span></div>
                      <div className="flex justify-between gap-4 border-t-2 border-slate-900 pt-3 text-lg font-black">
                        <span>Grand Total</span><span>{formatMoney(order.totalAmount)}</span>
                      </div>
                    </div>

                    <footer className="mt-10 border-t pt-5 text-center text-sm text-slate-500">
                      <p className="font-semibold text-slate-800">Thank you for shopping with Apple Gadgets!</p>
                      <p className="mt-1">Please keep this invoice for your records.</p>
                    </footer>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}