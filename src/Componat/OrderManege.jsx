
import React, { useCallback, useEffect, useState } from "react";

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

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-BD");
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


async function apiRequest(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    console.error("Network/API connection error:", error);

    throw new Error(
      "Backend server-এর সঙ্গে সংযোগ হচ্ছে না। Server চালু আছে কি না দেখো।"
    );
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
    console.log("API ERROR URL:", url);
    console.log("API ERROR STATUS:", response.status);
    console.log(
      "API ERROR BODY:",
      JSON.stringify(result, null, 2)
    );

    throw new Error(
      result.message ||
        result.error ||
        `API request failed with status ${response.status}`
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

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [courierProvider, setCourierProvider] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
  });

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
      if (courierProvider.trim()) {
        params.set("courierProvider", courierProvider.trim());
      }
      if (source) params.set("source", source);

      const result = await apiRequest(
        `${ORDERS_API}?${params.toString()}`
      );



      
      const rows = Array.isArray(result.data) ? result.data : [];
      const total = Number(result.pagination?.total ?? 0);
      const pages = Math.max(
        1,
        Number(
          result.pagination?.pages ??
            Math.ceil(total / PAGE_SIZE) ??
            1
        )
      );

      setOrders(rows);
      setPagination({ total, pages });

      const visibleIds = new Set(rows.map(getOrderId));

      setSelectedIds((previous) =>
        previous.filter((id) => visibleIds.has(id))
      );
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

    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const visibleIds = orders.map(getOrderId).filter(Boolean);

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    setSelectedIds((previous) =>
      allVisibleSelected
        ? previous.filter((id) => !visibleIds.includes(id))
        : [...new Set([...previous, ...visibleIds])]
    );
  };

  const updateSingleOrder = async (id, newStatus) => {
    if (!id || !newStatus) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `${SINGLE_ORDER_API}/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          body: JSON.stringify({ status: newStatus }),
        }
      );

      setNotice("অর্ডারের স্ট্যাটাস আপডেট হয়েছে।");
      await loadOrders();
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
      if (field === "courierProvider") {
        body.courierProvider = cleanValue;
      }

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

    const confirmed = window.confirm(
      "তুমি কি এই অর্ডারটি ডিলিট করতে চাও?"
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        `${SINGLE_ORDER_API}/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      setNotice(result.message || "অর্ডার ডিলিট হয়েছে।");

      setSelectedIds((previous) =>
        previous.filter((item) => item !== id)
      );

      // Last page থেকে শেষ order delete হলে আগের page-এ যাবে।
      if (orders.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">Order Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              মোট অর্ডার: {pagination.total}
            </p>
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
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="font-bold"
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={search}
            onChange={(event) =>
              changeFilter(setSearch, event.target.value)
            }
            placeholder="Order ID, customer, phone..."
            className="min-w-0 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={status}
            onChange={(event) =>
              changeFilter(setStatus, event.target.value)
            }
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {formatStatus(item)}
              </option>
            ))}
          </select>

          <input
            value={courierProvider}
            onChange={(event) =>
              changeFilter(setCourierProvider, event.target.value)
            }
            placeholder="Courier provider"
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={source}
            onChange={(event) =>
              changeFilter(setSource, event.target.value)
            }
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All sources</option>
            <option value="website">Website</option>
            <option value="facebook_messenger">Facebook Messenger</option>
            <option value="admin">Admin</option>
          </select>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-sm font-semibold">
            Selected: {selectedIds.length}
          </span>

          <select
            key={`bulk-status-${selectedIds.length}`}
            defaultValue=""
            disabled={busy || !selectedIds.length}
            onChange={(event) => {
              const value = event.target.value;
              if (value) bulkUpdate("status", value);
              event.target.value = "";
            }}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Bulk: change status</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {formatStatus(item)}
              </option>
            ))}
          </select>

          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget)
                .get("courier")
                ?.toString()
                .trim();

              if (value) bulkUpdate("courierProvider", value);
              else setError("Courier name লিখো।");
            }}
          >
            <input
              name="courier"
              placeholder="Courier name"
              disabled={busy || !selectedIds.length}
              className="min-w-0 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || !selectedIds.length}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Update Courier
            </button>
          </form>

          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget)
                .get("source")
                ?.toString()
                .trim();

              if (value) bulkUpdate("source", value);
              else setError("Order source নির্বাচন করো।");
            }}
          >
            <select
              name="source"
              defaultValue=""
              disabled={busy || !selectedIds.length}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Select source</option>
              {SOURCES.map((item) => (
                <option key={item} value={item}>
                  {formatStatus(item)}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={busy || !selectedIds.length}
              className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Update Source
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all visible orders"
                    />
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
                  <tr>
                    <td
                      colSpan={9}
                      className="p-10 text-center text-slate-500"
                    >
                      অর্ডার লোড হচ্ছে...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-10 text-center text-slate-500"
                    >
                      কোনো অর্ডার পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const id = getOrderId(order);
                    const products = Array.isArray(order.products)
                      ? order.products
                      : [];

                    return (
                      <tr
                        key={id}
                        className="align-top hover:bg-slate-50"
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(id)}
                            onChange={() => toggleSelect(id)}
                            aria-label={`Select order ${order.orderId || id}`}
                          />
                        </td>

                        <td className="p-3">
                          <p className="font-semibold">
                            {order.orderId || id || "—"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatStatus(order.paymentMethod || "—")}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Payment: {formatStatus(order.paymentStatus || "unpaid")}
                          </p>
                        </td>

                        <td className="max-w-48 p-3">
                          <p className="font-medium">
                            {order.customerName || order.customer?.name || "—"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {order.phone || order.customer?.phone || "—"}
                          </p>
                          {order.email && (
                            <p className="break-all text-xs text-slate-500">
                              {order.email}
                            </p>
                          )}
                          <p className="mt-1 break-words text-xs text-slate-500">
                            {order.deliveryAddress || "—"}
                          </p>
                        </td>

                        <td className="max-w-64 p-3">
                          {products.length ? (
                            <ul className="space-y-3">
                              {products.map((item, index) => {
                                const product = getProductInfo(item);

                                return (
                                  <li
                                    key={item._id || item.product?._id || index}
                                    className="flex gap-2"
                                  >
                                    {product.image ? (
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                        loading="lazy"
                                        className="h-12 w-12 shrink-0 rounded-lg border object-cover"
                                        onError={(event) => {
                                          event.currentTarget.style.display = "none";
                                        }}
                                      />
                                    ) : null}

                                    <div className="min-w-0">
                                      <p className="break-words font-medium">
                                        {product.name}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        Qty: {product.quantity}
                                        {" · "}
                                        {formatMoney(product.price)}
                                      </p>

                                      {(product.color ||
                                        product.ram ||
                                        product.storage) && (
                                        <p className="mt-1 text-xs text-slate-500">
                                          {[
                                            product.color,
                                            product.ram,
                                            product.storage,
                                          ]
                                            .filter(Boolean)
                                            .join(" / ")}
                                        </p>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="p-3">
                          <p className="font-semibold">
                            {formatMoney(order.totalAmount)}
                          </p>

                          {Number(order.subTotal) > 0 && (
                            <p className="text-xs text-slate-500">
                              Subtotal: {formatMoney(order.subTotal)}
                            </p>
                          )}

                          {Number(order.discountAmount) > 0 && (
                            <p className="text-xs text-green-700">
                              Discount: {formatMoney(order.discountAmount)}
                            </p>
                          )}

                          {Number(order.deliveryCharge) > 0 && (
                            <p className="text-xs text-slate-500">
                              Delivery: {formatMoney(order.deliveryCharge)}
                            </p>
                          )}
                        </td>

                        <td className="p-3">
                          <p>
                            {order.courierDetails?.provider || "—"}
                          </p>
                          {order.courierDetails?.trackingCode && (
                            <p className="mt-1 text-xs text-slate-500">
                              Tracking: {order.courierDetails.trackingCode}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-slate-500">
                            {formatStatus(order.source || "—")}
                          </p>
                        </td>

                        <td className="p-3">
                          <span
                            className={`mb-2 inline-block rounded-full border px-2 py-1 text-xs font-medium ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {formatStatus(order.status || "pending")}
                          </span>

                          <select
                            value={order.status || "pending"}
                            disabled={busy}
                            onChange={(event) =>
                              updateSingleOrder(id, event.target.value)
                            }
                            className="block max-w-44 rounded-lg border px-2 py-2 text-xs disabled:opacity-50"
                            aria-label={`Update status for ${order.orderId || id}`}
                          >
                            {STATUSES.map((item) => (
                              <option key={item} value={item}>
                                {formatStatus(item)}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="whitespace-nowrap p-3 text-xs text-slate-500">
                          {formatDate(order.createdAt)}
                        </td>

                        <td className="p-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => deleteOrder(id)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col justify-between gap-3 border-t p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              Total: {pagination.total} · Page {page} of {pagination.pages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading || busy}
                onClick={() =>
                  setPage((previous) => Math.max(1, previous - 1))
                }
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={
                  page >= pagination.pages || loading || busy
                }
                onClick={() =>
                  setPage((previous) =>
                    Math.min(pagination.pages, previous + 1)
                  )
                }
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}

