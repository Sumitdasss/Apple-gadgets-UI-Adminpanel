import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Truck,
  MessageSquare,
  Calculator,
  Mail,
  Globe,
  Settings,
  Bell,
  Plus,
  AlertTriangle,
  Wallet,
  ChevronDown,
  TrendingUp,
  CalendarDays,
  RotateCcw,
} from "lucide-react";

import OrderActivityChart from "./OderActivityChart.jsx";
import CreateOrderModal from "./CreateOrderModal.jsx";
import AddProductPage from "./Addproduct.jsx";
import ProductListView from "./ProductListView.jsx";
import UpdateProductPage from "./UpdateProduct.jsx";
import OrdersPage from "./OrderManege.jsx";

const API = (
  import.meta.env.VITE_API_URL || "https://apple-gadgets-ui-backend.vercel.app"
).replace(/\/+$/, "");

// =====================================================
// DATE HELPERS — ASIA/DHAKA
// =====================================================

const getToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "all") return "All Time";
  if (!isValidDate(dateStr)) return dateStr;

  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const taka = (value) => `৳ ${Number(value || 0).toLocaleString("en-US")}`;

const getDateFromItem = (item) => {
  const value = item?.date ?? item?._id ?? item?.day ?? "";
  return typeof value === "string" ? value.slice(0, 10) : "";
};

// =====================================================
// SUMMARY CARD META
// =====================================================

const cardMeta = {
  orders: { title: "Total Orders", icon: ShoppingCart, money: false },
  sales: { title: "Total Sales", icon: Wallet, money: true },
  items: { title: "Total Items", icon: Package, money: false },
  customers: { title: "Total Customers", icon: Users, money: false },
};

// =====================================================
// STATUS HELPERS (matches real order statuses)
// =====================================================

const statusColor = {
  pending: "bg-amber-400",
  confirmed: "bg-blue-500",
  processing: "bg-indigo-500",
  ready_for_shipment: "bg-purple-500",
  handed_over_to_courier: "bg-violet-500",
  shipped: "bg-cyan-500",
  delivered: "bg-emerald-500",
  returned: "bg-orange-500",
  cancelled: "bg-red-500",
};

const donutColors = {
  pending: "#fbbf24",
  confirmed: "#3b82f6",
  processing: "#6366f1",
  ready_for_shipment: "#a855f7",
  handed_over_to_courier: "#8b5cf6",
  shipped: "#06b6d4",
  delivered: "#10b981",
  returned: "#f97316",
  cancelled: "#ef4444",
};

const formatStatusLabel = (status = "") =>
  status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// =====================================================
// NOTICE
// =====================================================

const Notice = ({ children }) => (
  <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-slate-50 p-8 text-center text-sm text-gray-500">
    {children}
  </div>
);

// =====================================================
// MAIN DASHBOARD
// =====================================================

export default function DeshbordUI() {
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const [productSubTab, setProductSubTab] = useState("add");
  const [selectedDate, setSelectedDate] = useState("all");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const today = getToday();

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API}/api/dashboard/summary?date=${encodeURIComponent(selectedDate)}`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const result = await response.json();
        if (!result.success) throw new Error(result.message || "Dashboard data load failed");

        setDashboard(result);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Dashboard error:", err);
        setError(err.message || "Unable to load dashboard");
        setDashboard(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadDashboard();
    return () => controller.abort();
  }, [selectedDate, refreshKey]);

  // =====================================================
  // NAVIGATION
  // =====================================================

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Orders", icon: ShoppingCart },
    {
      name: "Product",
      icon: Package,
      hasSub: true,
      subItems: [
        { name: "Add Product", key: "add" },
        { name: "Update Product", key: "update" },
        { name: "Product List", key: "list" },
      ],
    },
    { name: "Users", icon: Users, hasSub: true },
    { name: "Reports", icon: BarChart3, hasSub: true },
    { name: "Courier", icon: Truck, hasSub: true },
    { name: "SMS", icon: MessageSquare, hasSub: true },
    { name: "Accounting", icon: Calculator },
    { name: "Messages", icon: Mail },
    { name: "Landing Pages", icon: Globe },
    { name: "Settings", icon: Settings },
  ];

  // =====================================================
  // NORMALIZE DASHBOARD DATA
  // =====================================================

  const d = {
    summary: dashboard?.summary || [],
    activity: dashboard?.activity || [],
    stockAlerts: dashboard?.stockAlerts || 0,
    notifications: dashboard?.notifications || 0,
    topProducts: dashboard?.topProducts || [],
    status: dashboard?.status || [],
    areas: dashboard?.areas || [],
    availableDates: dashboard?.availableDates || [],
    store: dashboard?.store || {
      store_name: "Apple Gadgets",
      store_sub: "Admin Dashboard",
    },
  };

  const availableDates = useMemo(() => {
    return [
      ...new Set(
        d.availableDates
          .filter((date) => typeof date === "string")
          .map((date) => date.slice(0, 10))
          .filter(isValidDate),
      ),
    ].sort((a, b) => b.localeCompare(a));
  }, [d.availableDates]);

  // =====================================================
  // HEADER
  // =====================================================

  const Header = () => (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200/80 bg-white/90 px-4 py-3.5 shadow-sm backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-50 to-red-100 text-red-700 shadow-sm">
          <CalendarDays className="h-5 w-5" />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label
            htmlFor="dashboard-date"
            className="text-[10px] font-bold uppercase tracking-wider text-gray-500"
          >
            Dashboard Report
          </label>

          <div className="relative">
            <input
              id="dashboard-date"
              type="date"
              value={selectedDate === "all" ? "" : selectedDate}
              max={today}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  setSelectedDate("all");
                  return;
                }
                if (isValidDate(value)) setSelectedDate(value);
              }}
              onClick={(event) => {
                if (typeof event.currentTarget.showPicker === "function") {
                  try {
                    event.currentTarget.showPicker();
                  } catch {
                    // ignore
                  }
                }
              }}
              className="w-[190px] cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              aria-label="Select dashboard report date"
            />
          </div>

          <span className="text-[10px] text-gray-400">
            {selectedDate === "all"
              ? "Showing all available dates"
              : `Selected: ${formatDate(selectedDate)}`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSelectedDate("all")}
          className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
            selectedDate === "all"
              ? "border-red-800 bg-red-800 text-white shadow-sm"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          All Time
        </button>

        <button
          type="button"
          onClick={() => setSelectedDate(today)}
          className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
            selectedDate === today
              ? "border-red-800 bg-red-800 text-white shadow-sm"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Today
        </button>

        {selectedDate !== "all" && (
          <button
            type="button"
            onClick={() => setSelectedDate("all")}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab("Product");
            setProductSubTab("list");
            setOpenSubMenu("Product");
          }}
          className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>Stock Alert ({d.stockAlerts})</span>
        </button>

        <button
          type="button"
          onClick={() => setCreateOrderOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-700 to-red-800 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-red-200 transition hover:from-red-800 hover:to-red-900"
        >
          <Plus className="h-4 w-4" />
          <span>Create Order</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("Accounting")}
          className="hidden items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 md:flex"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-700 text-[10px] font-bold text-white">
            ৳
          </span>
          Check Balance
        </button>

        <button
          type="button"
          aria-label="Notifications"
          onClick={() => setActiveTab("Messages")}
          className="relative rounded-full p-2.5 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <Bell className="h-5 w-5" />
          {d.notifications > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold text-white">
              {d.notifications}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-gradient-to-br from-red-50 to-red-100 text-xs font-bold text-red-700 shadow-sm">
            A
          </div>
        </div>
      </div>
    </header>
  );

  // =====================================================
  // DASHBOARD VIEW
  // =====================================================

  const DashboardView = () => {
    if (loading) {
      return (
        <Notice>
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-red-700 border-t-transparent" />
            <span className="text-sm font-medium text-gray-500">Loading dashboard...</span>
          </div>
        </Notice>
      );
    }

    if (error) {
      return (
        <Notice>
          <div className="mx-auto max-w-md">
            <p className="text-base font-semibold text-red-600">Dashboard load failed</p>
            <p className="mt-2 break-words text-xs text-gray-500">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-800 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-red-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </Notice>
      );
    }

    const totalOrders = Number(
      d.summary.find((item) => item.key === "orders")?.value || 0,
    );
    const totalSales = Number(
      d.summary.find((item) => item.key === "sales")?.value || 0,
    );
    const maxArea = Math.max(1, ...d.areas.map((area) => Number(area.count || 0)));

    return (
      <div className="min-h-[calc(100vh-65px)] space-y-6 bg-gradient-to-b from-slate-50 to-slate-100/80 p-4 sm:p-6">
        {/* PAGE TITLE */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              {selectedDate === "all"
                ? "Showing all-time store performance and date-wise activity"
                : `Showing details for ${formatDate(selectedDate)}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-500 shadow-sm">
              {selectedDate === "all" ? "ALL-TIME REPORT" : "DAILY REPORT"}
            </span>

            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm transition hover:bg-gray-50"
              title="Refresh dashboard"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {selectedDate !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedDate("all")}
                className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
              >
                All Time
              </button>
            )}
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(cardMeta).map(([key, meta]) => {
            const item = d.summary.find((entry) => entry.key === key);
            const value = Number(item?.value || 0);
            const Icon = meta.icon;

            return (
              <div
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-red-50/50 transition group-hover:bg-red-50" />
                <div className="relative flex items-center justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <span className="text-xs font-medium text-gray-500">{meta.title}</span>
                    <div className="break-words text-2xl font-bold tracking-tight text-gray-900">
                      {meta.money ? taka(value) : value.toLocaleString("en-US")}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>{item?.growth || "+0.0%"}</span>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-red-50 to-red-100 p-3 text-red-600 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ORDER CHART + TOP PRODUCTS */}
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <OrderActivityChart
              data={d.activity}
              title="Order Activity"
              subtitle={
                selectedDate === "all"
                  ? "Date-wise order activity"
                  : `Order activity for ${formatDate(selectedDate)}`
              }
            />
          </div>

          <div className="min-w-0 rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-800">
              Top Selling Products
            </h3>

            {d.topProducts.length === 0 ? (
              <p className="text-xs text-gray-400">No product data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      <th className="pb-3">Image</th>
                      <th className="pb-3">Name</th>
                      <th className="pb-3 text-center">Sold</th>
                      <th className="pb-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {d.topProducts.map((product) => (
                      <tr key={product.id || product._id || product.name} className="group">
                        <td className="py-3 pr-2">
                          <img
                            src={product.image || "/images.png"}
                            alt={product.name || "Product"}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/images.png";
                            }}
                            className="h-9 w-9 rounded-lg border border-gray-100 object-cover shadow-sm"
                          />
                        </td>
                        <td className="max-w-[130px] truncate py-3 pr-2 font-medium text-gray-700 group-hover:text-gray-900">
                          {product.name || "Unnamed Product"}
                        </td>
                        <td className="py-3 text-center text-gray-600">
                          {Number(product.sold || 0).toLocaleString("en-US")}
                        </td>
                        <td className="whitespace-nowrap py-3 text-right font-semibold text-gray-800">
                          {taka(product.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ORDER STATUS + AREAS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ORDER STATUS */}
          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-5 text-xs font-bold uppercase tracking-wider text-gray-800">
              Order Status
            </h3>

            <div className="flex flex-col items-center justify-around gap-8 py-2 sm:flex-row">
              {/* DONUT */}
              <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="3.5"
                  />
                  {(() => {
                    let offset = 0;
                    return d.status.map((item) => {
                      const count = Number(item.count || 0);
                      const length = totalOrders ? (count / totalOrders) * 100 : 0;
                      const circle = (
                        <circle
                          key={item.status}
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          strokeWidth="4"
                          stroke={donutColors[item.status] || "#cbd5e1"}
                          strokeDasharray={`${length} ${100 - length}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="round"
                        />
                      );
                      offset += length;
                      return circle;
                    });
                  })()}
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold tracking-tight text-gray-900">
                    {totalOrders.toLocaleString("en-US")}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    Orders
                  </span>
                </div>
              </div>

              {/* STATUS LIST */}
              <div className="w-full max-w-sm space-y-2">
                {d.status.length === 0 ? (
                  <p className="text-xs text-gray-400">No orders in this period.</p>
                ) : (
                  d.status.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-xs transition hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            statusColor[item.status] || "bg-slate-300"
                          }`}
                        />
                        <span className="font-semibold text-slate-700">
                          {formatStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="font-bold text-gray-800">
                          {Number(item.count || 0).toLocaleString("en-US")}
                        </span>
                        <span className="min-w-[70px] text-right font-bold text-gray-900">
                          {taka(item.total)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4 text-right text-sm font-semibold text-gray-600">
              Total Sales:{" "}
              <span className="text-base font-bold text-gray-900">{taka(totalSales)}</span>
            </div>
          </div>

          {/* ORDER AREAS */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <div>
              <h3 className="mb-6 text-xs font-bold uppercase tracking-wider text-gray-800">
                Order Areas
              </h3>

              <div className="space-y-5">
                {d.areas.length === 0 ? (
                  <p className="text-xs text-gray-400">No orders in this period.</p>
                ) : (
                  d.areas.map((area) => (
                    <div key={area.location}>
                      <div className="mb-1.5 flex justify-between gap-3 text-xs font-medium text-gray-600">
                        <span className="truncate">{area.location || "Unknown"}</span>
                        <span className="font-bold text-gray-900">
                          {Number(area.count || 0).toLocaleString("en-US")}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-700 transition-all duration-500"
                          style={{
                            width: `${(Number(area.count || 0) / maxArea) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-4 text-center text-[11px] text-gray-400">
              Delivery location breakdown
            </div>
          </div>
        </div>

        {/* DATE-WISE ACTIVITY TABLE */}
        {selectedDate === "all" && (
          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Date-wise Order Activity
                </h3>
                <p className="mt-1 text-xs text-gray-500">Orders and sales by date</p>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-gray-500">
                {d.activity.length} records
              </span>
            </div>

            {d.activity.length === 0 ? (
              <p className="text-xs text-gray-400">No activity data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-500">
                      <th className="py-3 pr-4 font-semibold">Date</th>
                      <th className="px-4 py-3 text-right font-semibold">Orders</th>
                      <th className="py-3 pl-4 text-right font-semibold">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...d.activity]
                      .sort((a, b) => getDateFromItem(b).localeCompare(getDateFromItem(a)))
                      .map((item, index) => {
                        const date = getDateFromItem(item);
                        const count = Number(item.orders ?? item.count ?? item.totalOrders ?? 0);
                        const sales = Number(item.sales ?? item.total ?? item.revenue ?? 0);

                        return (
                          <tr key={`${date}-${index}`} className="transition hover:bg-slate-50/80">
                            <td className="whitespace-nowrap py-3.5 pr-4 font-medium text-gray-700">
                              {isValidDate(date) ? formatDate(date) : date || "Unknown"}
                            </td>
                            <td className="px-4 py-3.5 text-right text-gray-700">
                              {count.toLocaleString("en-US")}
                            </td>
                            <td className="whitespace-nowrap py-3.5 pl-4 text-right font-semibold text-gray-900">
                              {taka(sales)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // GENERIC VIEW
  // =====================================================

  const Generic = () => {
    const item = navItems.find((nav) => nav.name === activeTab);
    const Icon = item?.icon || LayoutDashboard;

    return (
      <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-red-100 text-red-700 shadow-sm">
          <Icon className="h-9 w-9" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">{activeTab}</h2>
        <p className="mb-6 max-w-md text-sm text-gray-500">This page is not built yet.</p>
        <button
          type="button"
          onClick={() => {
            setActiveTab("Dashboard");
            setOpenSubMenu(null);
          }}
          className="rounded-xl bg-red-800 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-red-900"
        >
          Return to Dashboard
        </button>
      </div>
    );
  };

  const storeName = d.store?.store_name || "Apple Gadgets";

  // =====================================================
  // MAIN LAYOUT
  // =====================================================

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased text-gray-800">
      {/* SIDEBAR */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-[#0f172a] text-slate-300">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-800/80 px-5">
          <span className="text-xl font-black italic tracking-tighter text-red-500">Apple</span>
          <span className="ml-1 text-xl font-light tracking-wide text-white">Gadgets</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ name, icon: Icon, hasSub, subItems }) => {
            const active = activeTab === name;
            const isOpen = openSubMenu === name;

            return (
              <div key={name}>
                <button
                  type="button"
                  onClick={() => {
                    if (hasSub) {
                      setOpenSubMenu(isOpen ? null : name);
                      setActiveTab(name);
                    } else {
                      setActiveTab(name);
                      setOpenSubMenu(null);
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-slate-800 font-semibold text-white shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${active ? "text-red-500" : "text-slate-400"}`} />
                    <span>{name}</span>
                  </div>
                  {hasSub && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {hasSub && isOpen && subItems && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-slate-700/80 pl-3">
                    {subItems.map((sub) => (
                      <button
                        key={sub.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(name);
                          setProductSubTab(sub.key);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-[11px] font-medium transition ${
                          productSubTab === sub.key && activeTab === name
                            ? "bg-red-900/40 text-red-400"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* STORE INFO */}
        <div className="shrink-0 border-t border-slate-800/80 bg-[#0b1120] p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/40 p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
              AG
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-xs font-semibold text-slate-200">{storeName}</p>
              <p className="truncate text-[10px] text-slate-400">
                {d.store?.store_sub || "Admin Dashboard"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* CREATE ORDER MODAL */}
      <CreateOrderModal
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
        onSuccess={() => {
          setCreateOrderOpen(false);
          setRefreshKey((key) => key + 1);
        }}
      />

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-40">
          <Header />
        </header>

        <div className="min-w-0">
          {activeTab === "Dashboard" ? (
            <DashboardView />
          ) : activeTab === "Orders" ? (
            <OrdersPage />
          ) : activeTab === "Product" ? (
            <>
              {productSubTab === "add" && <AddProductPage />}
              {productSubTab === "update" && <UpdateProductPage />}
              {productSubTab === "list" && <ProductListView />}
            </>
          ) : (
            <Generic />
          )}
        </div>
      </main>
    </div>
  );
}