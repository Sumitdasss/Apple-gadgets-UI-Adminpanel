import React, { useEffect, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

import OrderActivityChart from "./OderActivityChart.jsx";

const API =
  import.meta.env.VITE_API_URL ||
  "https://apple-gadgets-ui-backend.vercel.app";

// =========================================================
// HELPERS
// =========================================================

const getToday = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (date) => {
  if (!date) return "";

  const d = new Date(`${date}T00:00:00`);

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const taka = (n) =>
  `৳ ${Number(n || 0).toLocaleString("en-US")}`;

// =========================================================
// SUMMARY CARD
// =========================================================

const cardMeta = {
  orders: {
    title: "Total Orders",
    icon: ShoppingCart,
    money: false,
  },

  sales: {
    title: "Total Sales",
    icon: Wallet,
    money: true,
  },

  items: {
    title: "Total Items",
    icon: Package,
    money: false,
  },

  customers: {
    title: "Total Customers",
    icon: Users,
    money: false,
  },
};

// =========================================================
// STATUS COLOR
// =========================================================

const statusColor = {
  Pending: "bg-amber-400",
  Completed: "bg-emerald-500",
  Incomplete: "bg-slate-400",
};

// =========================================================
// NOTICE
// =========================================================

const Notice = ({ children }) => (
  <div className="p-8 text-center text-sm text-gray-500 min-h-[calc(100vh-65px)] bg-slate-50">
    {children}
  </div>
);

// =========================================================
// MAIN
// =========================================================

export default function DeshbordUI() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  // Selected calendar date
  const [selectedDate, setSelectedDate] = useState(getToday());

  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API}/api/dashboard/summary?date=${selectedDate}`
        );

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(
            result.message || "Dashboard data load failed"
          );
        }

        setDashboard(result);
      } catch (err) {
        console.error("Dashboard error:", err);

        setError(err.message);

        setDashboard(null);
      } finally {
        setLoading(false);
      }
    };

    if (selectedDate) {
      loadDashboard();
    }
  }, [selectedDate]);

  // =========================================================
  // NAVIGATION
  // =========================================================

  const navItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
    },

    {
      name: "Orders",
      icon: ShoppingCart,
    },

    {
      name: "Product",
      icon: Package,
      hasSub: true,
    },

    {
      name: "Users",
      icon: Users,
      hasSub: true,
    },

    {
      name: "Reports",
      icon: BarChart3,
      hasSub: true,
    },

    {
      name: "Courier",
      icon: Truck,
      hasSub: true,
    },

    {
      name: "SMS",
      icon: MessageSquare,
      hasSub: true,
    },

    {
      name: "Accounting",
      icon: Calculator,
    },

    {
      name: "Messages",
      icon: Mail,
    },

    {
      name: "Landing Pages",
      icon: Globe,
    },

    {
      name: "Settings",
      icon: Settings,
    },
  ];

  // =========================================================
  // DASHBOARD DATA
  // =========================================================

  const d = {
    summary: dashboard?.summary || [],

    activity: dashboard?.activity || [],

    stockAlerts: dashboard?.stockAlerts || 0,

    notifications: dashboard?.notifications || 0,

    topProducts: dashboard?.topProducts || [],

    status: dashboard?.status || [],

    areas: dashboard?.areas || [],

    store: dashboard?.store || {
      store_name: "Apple Gadgets",
      store_sub: "Admin Dashboard",
    },
  };

  // =========================================================
  // CHANGE DAY
  // =========================================================

  const changeDate = (days) => {
    const current = new Date(`${selectedDate}T00:00:00`);

    current.setDate(current.getDate() + days);

    const year = current.getFullYear();

    const month = String(
      current.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      current.getDate()
    ).padStart(2, "0");

    setSelectedDate(
      `${year}-${month}-${day}`
    );
  };

  // =========================================================
  // HEADER
  // =========================================================

  const Header = () => (
    <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm">

      {/* DATE SELECTOR */}

      <div className="flex items-center gap-2">

        <button
          type="button"
          onClick={() => changeDate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition"
          title="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="relative">

          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-700 pointer-events-none" />

          <input
            type="date"
            value={selectedDate}
            onChange={(e) =>
              setSelectedDate(e.target.value)
            }
            className="bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium cursor-pointer"
          />

        </div>

        <button
          type="button"
          onClick={() => changeDate(1)}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition"
          title="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="hidden md:block text-xs font-semibold text-gray-500 ml-2">
          {formatDate(selectedDate)}
        </span>

      </div>

      {/* RIGHT SIDE */}

      <div className="flex items-center gap-3 ml-auto">

        {/* STOCK ALERT */}

        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-md hover:bg-amber-100 transition">

          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />

          <span>
            Stock Alert ({d.stockAlerts})
          </span>

        </button>

        {/* CREATE ORDER */}

        <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-800 text-white text-xs font-medium rounded-md hover:bg-red-900 transition shadow-sm">

          <Plus className="w-4 h-4" />

          <span>Create Order</span>

        </button>

        {/* BALANCE */}

        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-100 transition">

          <span className="w-5 h-5 rounded-full bg-red-700 text-white text-[10px] flex items-center justify-center font-bold">
            ৳
          </span>

          <span>Check Balance</span>

        </button>

        {/* NOTIFICATION */}

        <div className="relative cursor-pointer p-1.5 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100">

          <Bell className="w-5 h-5" />

          {d.notifications > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {d.notifications}
            </span>
          )}

        </div>

        {/* ADMIN */}

        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">

          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs border border-red-200">
            A
          </div>

        </div>

      </div>

    </header>
  );

  // =========================================================
  // DASHBOARD VIEW
  // =========================================================

  const DashboardView = () => {
    if (loading) {
      return (
        <Notice>
          <div className="flex flex-col items-center justify-center gap-3">

            <div className="w-7 h-7 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />

            <span>
              Loading dashboard...
            </span>

          </div>
        </Notice>
      );
    }

    if (error) {
      return (
        <Notice>

          <div className="max-w-md mx-auto">

            <p className="text-red-600 font-semibold">
              Dashboard load failed
            </p>

            <p className="mt-2 text-xs">
              {error}
            </p>

            <button
              onClick={() =>
                setSelectedDate(getToday())
              }
              className="mt-4 px-4 py-2 bg-red-800 text-white rounded-md text-xs font-semibold hover:bg-red-900"
            >
              Go to Today
            </button>

          </div>

        </Notice>
      );
    }

    const totalOrders =
      d.summary.find(
        (s) => s.key === "orders"
      )?.value || 0;

    const totalSales =
      d.summary.find(
        (s) => s.key === "sales"
      )?.value || 0;

    const maxArea = Math.max(
      1,
      ...d.areas.map(
        (a) => Number(a.count || 0)
      )
    );

    let offset = 0;

    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-[calc(100vh-65px)]">

        {/* SELECTED DATE */}

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-xl font-bold text-gray-800">
              Dashboard
            </h1>

            <p className="text-xs text-gray-500 mt-1">
              Showing details for{" "}
              <span className="font-semibold text-gray-700">
                {formatDate(selectedDate)}
              </span>
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              setSelectedDate(getToday())
            }
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Today
          </button>

        </div>

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {d.summary.map((s) => {

            const m = cardMeta[s.key];

            if (!m) return null;

            const Icon = m.icon;

            return (
              <div
                key={s.key}
                className="bg-white p-4 rounded-xl border border-gray-200/80 flex items-center justify-between"
              >

                <div className="space-y-1">

                  <span className="text-xs text-gray-500 font-medium">
                    {m.title}
                  </span>

                  <div className="text-xl font-bold text-gray-800">
                    {m.money
                      ? taka(s.value)
                      : s.value}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">

                    <TrendingUp className="w-3 h-3" />

                    <span>
                      {s.growth || "+0.0%"}
                    </span>

                  </div>

                </div>

                <div className="p-3 rounded-lg bg-red-50 text-red-500">

                  <Icon className="w-5 h-5" />

                </div>

              </div>
            );
          })}

        </div>

        {/* CHART + PRODUCTS */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* CHART */}

          <OrderActivityChart
            data={d.activity}
          />

          {/* TOP PRODUCTS */}

          <div className="bg-white p-5 rounded-xl border border-gray-200/80">

            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">
              Top Selling Products
            </h3>

            {d.topProducts.length === 0 ? (
              <p className="text-xs text-gray-400">
                No product data available.
              </p>
            ) : (
              <table className="w-full text-left text-xs">

                <thead>

                  <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-semibold">

                    <th className="pb-2">
                      Image
                    </th>

                    <th className="pb-2">
                      Name
                    </th>

                    <th className="pb-2 text-center">
                      Sold
                    </th>

                    <th className="pb-2 text-right">
                      Price
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-50">

                  {d.topProducts.map((p) => (

                    <tr
                      key={p.id || p._id}
                    >

                      <td className="py-2.5">

                        <img
                          src={
                            p.image ||
                            "/images.png"
                          }
                          alt={
                            p.name ||
                            "Product"
                          }
                          className="w-8 h-8 rounded-md object-cover border border-gray-200"
                        />

                      </td>

                      <td className="py-2.5 font-medium text-gray-700 max-w-[120px] truncate">
                        {p.name}
                      </td>

                      <td className="py-2.5 text-center text-gray-600">
                        {p.sold || 0}
                      </td>

                      <td className="py-2.5 text-right font-semibold text-gray-800">
                        {taka(p.price)}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>
            )}

          </div>

        </div>

        {/* STATUS + AREAS */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ORDER STATUS */}

          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200/80">

            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">
              Order Status
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">

              {/* DONUT */}

              <div className="relative w-36 h-36 flex items-center justify-center">

                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 36 36"
                >

                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="4"
                  />

                  {d.status.map((s) => {

                    const len = totalOrders
                      ? (Number(s.count || 0) /
                          totalOrders) *
                        100
                      : 0;

                    const circle = (
                      <circle
                        key={s.status}
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="none"
                        strokeWidth="4.5"
                        stroke={
                          {
                            Pending:
                              "#fbbf24",

                            Completed:
                              "#10b981",

                            Incomplete:
                              "#94a3b8",
                          }[s.status] ||
                          "#cbd5e1"
                        }
                        strokeDasharray={`${len} ${
                          100 - len
                        }`}
                        strokeDashoffset={
                          -offset
                        }
                      />
                    );

                    offset += len;

                    return circle;
                  })}

                </svg>

                <span className="absolute text-2xl font-extrabold text-gray-800">
                  {totalOrders}
                </span>

              </div>

              {/* STATUS LIST */}

              <div className="space-y-3 w-full max-w-xs">

                {d.status.length === 0 && (
                  <p className="text-xs text-gray-400">
                    No orders in this period.
                  </p>
                )}

                {d.status.map((s) => (

                  <div
                    key={s.status}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs"
                  >

                    <div className="flex items-center gap-2">

                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          statusColor[
                            s.status
                          ] ||
                          "bg-slate-300"
                        }`}
                      />

                      <span className="font-semibold text-slate-700">
                        {s.status}
                      </span>

                    </div>

                    <div className="flex items-center gap-3">

                      <span className="font-bold text-gray-700">
                        {s.count}
                      </span>

                      <span className="font-bold text-gray-800">
                        {taka(s.total)}
                      </span>

                    </div>

                  </div>

                ))}

              </div>

            </div>

            <div className="text-right text-xs font-semibold text-gray-600 border-t border-gray-100 pt-3 mt-2">

              Total:{" "}

              <span className="text-gray-900 font-bold">
                {taka(totalSales)}
              </span>

            </div>

          </div>

          {/* AREAS */}

          <div className="bg-white p-5 rounded-xl border border-gray-200/80 flex flex-col justify-between">

            <div>

              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-6">
                Order Areas
              </h3>

              <div className="space-y-4">

                {d.areas.length === 0 && (
                  <p className="text-xs text-gray-400">
                    No orders in this period.
                  </p>
                )}

                {d.areas.map((a) => (

                  <div
                    key={a.location}
                  >

                    <div className="flex justify-between text-xs font-medium text-gray-600 mb-1.5">

                      <span>
                        {a.location}
                      </span>

                      <span className="font-bold text-gray-800">
                        {a.count}
                      </span>

                    </div>

                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">

                      <div
                        className="h-full bg-red-700 rounded-full"
                        style={{
                          width: `${
                            (Number(
                              a.count || 0
                            ) /
                              maxArea) *
                            100
                          }%`,
                        }}
                      />

                    </div>

                  </div>

                ))}

              </div>

            </div>

            <div className="text-center pt-4 border-t border-gray-100 text-[11px] text-gray-400">
              Delivery location breakdown
            </div>

          </div>

        </div>

      </div>
    );
  };

  // =========================================================
  // ORDERS VIEW
  // =========================================================

  const OrdersView = () => (
    <div className="p-6 bg-slate-50 min-h-[calc(100vh-65px)]">

      <div className="bg-white p-5 rounded-xl border border-gray-200">

        <h2 className="text-lg font-bold text-gray-800">
          Orders Management
        </h2>

        <p className="text-xs text-gray-500 mt-1">
          Orders API can be connected here later.
        </p>

      </div>

    </div>
  );

  // =========================================================
  // GENERIC VIEW
  // =========================================================

  const Generic = () => {

    const item = navItems.find(
      (n) => n.name === activeTab
    );

    const Icon =
      item?.icon || LayoutDashboard;

    return (
      <div className="p-8 bg-slate-50 min-h-[calc(100vh-65px)] flex flex-col items-center justify-center text-center">

        <div className="w-16 h-16 rounded-full bg-red-100 text-red-800 flex items-center justify-center mb-4">

          <Icon className="w-8 h-8" />

        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {activeTab}
        </h2>

        <p className="text-sm text-gray-500 max-w-md mb-6">
          This page is not built yet.
        </p>

        <button
          onClick={() =>
            setActiveTab("Dashboard")
          }
          className="px-4 py-2 bg-red-800 text-white rounded-lg text-xs font-semibold hover:bg-red-900 transition"
        >
          Return to Dashboard
        </button>

      </div>
    );
  };

  // =========================================================
  // STORE
  // =========================================================

  const storeName =
    d.store?.store_name ||
    "Apple Gadgets";

  // =========================================================
  // MAIN LAYOUT
  // =========================================================

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans antialiased text-gray-800">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="w-60 shrink-0 bg-[#0f172a] text-slate-300 sticky top-0 h-screen flex flex-col">

        {/* LOGO */}

        <div className="h-16 px-5 flex items-center border-b border-slate-800 shrink-0">

          <span className="text-red-500 text-xl font-black italic tracking-tighter">
            Apple
          </span>

          <span className="text-white text-xl font-light tracking-wide ml-1">
            Gadgets
          </span>

        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

          {navItems.map(
            ({
              name,
              icon: Icon,
              hasSub,
            }) => {

              const active =
                activeTab === name;

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() =>
                    setActiveTab(name)
                  }
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-slate-800/90 text-white font-semibold"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >

                  <div className="flex items-center gap-3">

                    <Icon
                      className={`w-4 h-4 ${
                        active
                          ? "text-red-500"
                          : "text-slate-400"
                      }`}
                    />

                    <span>
                      {name}
                    </span>

                  </div>

                  {hasSub && (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}

                </button>
              );
            }
          )}

        </nav>

        {/* STORE */}

        <div className="p-3 border-t border-slate-800/80 bg-[#0b1120] shrink-0">

          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40">

            <div className="w-7 h-7 shrink-0 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
              AG
            </div>

            <div className="overflow-hidden min-w-0">

              <p className="text-xs font-semibold text-slate-200 truncate">
                {storeName}
              </p>

              <p className="text-[10px] text-slate-400 truncate">
                {d.store?.store_sub ||
                  "Admin Dashboard"}
              </p>

            </div>

          </div>

        </div>

      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="flex-1 min-w-0">

        <header className="sticky top-0 z-40">
          <Header />
        </header>

        <div className="min-w-0">

          {activeTab === "Dashboard" ? (
            <DashboardView />
          ) : activeTab === "Orders" ? (
            <OrdersView />
          ) : (
            <Generic />
          )}

        </div>

      </main>

    </div>
  );
}