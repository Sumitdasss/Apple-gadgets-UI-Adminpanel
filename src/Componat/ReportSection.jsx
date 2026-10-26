"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Filter,
  ImageOff,
  LoaderCircle,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  AlertCircle,
  TrendingUp,
  XCircle,
  CreditCard,
  UserRoundCheck,
} from "lucide-react";


const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";

const REPORT_ENDPOINTS = {
  overview: "/api/dashboard/summary?allTime=true",
  sales: "/api/dashboard/Allorders",
  orders: "/api/dashboard/order",
  profit: "/api/dashboard/Allorders",
  products: "/api/dashboard/getALLproducts",
  customers: "/api/dashboard/AllCustomers",
  employees: "/api/dashboard/getEmployees",
  payments: "/api/dashboard/Allorders",
  courier: "/api/dashboard/Allorders",
};

const REPORTS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "sales", label: "Sales", icon: TrendingUp },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "profit", label: "Profit & Loss", icon: Wallet },
  { id: "products", label: "Products", icon: Package },
  { id: "customers", label: "Customers", icon: Users },
  { id: "employees", label: "Employees", icon: UserRoundCheck },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "courier", label: "Courier", icon: Truck },
];

const money = (value) =>
  `৳ ${Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;

const number = (value) => Number(value || 0).toLocaleString("en-BD");

const dateInput = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const pick = (obj, paths, fallback = 0) => {
  for (const path of paths) {
    const value = path.split(".").reduce((v, key) => v?.[key], obj);
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
};

const unwrap = (payload) => payload?.data ?? payload?.result ?? payload ?? {};

const asArray = (payload, keys = []) => {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

/* ---------- Order based calculations ---------- */
const ORDER_TABS = ["sales", "orders", "profit", "payments", "courier"];
const n = (v) => Number(v) || 0;
const statusOf = (o) => String(o?.status || o?.orderStatus || "").toLowerCase();
const isDelivered = (o) => /deliver|complete/.test(statusOf(o));
const isCancelled = (o) => /cancel/.test(statusOf(o));
const isReturned = (o) => /return|rto/.test(statusOf(o));
const isShipped = (o) => /courier|ship|transit|dispatch/.test(statusOf(o));
const orderTotal = (o) => n(o?.totalAmount ?? o?.total ?? o?.grandTotal ?? o?.amount);

const itemCost = (i) =>
  n(
    i?.costPrice ??
      i?.purchasePrice ??
      i?.buyingPrice ??
      i?.buyPrice ??
      i?.cost ??
      i?.product?.costPrice ??
      i?.product?.purchasePrice ??
      i?.product?.buyingPrice
  ) * (n(i?.quantity ?? i?.qty) || 1);

// returns { value, found } — found=false when the API gives no cost info at all
function orderCost(o) {
  const direct = o?.totalCost ?? o?.cost ?? o?.totalPurchasePrice ?? o?.purchaseCost;
  if (direct != null) return { value: n(direct), found: true };
  const items = o?.items || o?.products || o?.orderItems || o?.cart || [];
  if (Array.isArray(items) && items.length) {
    const found = items.some(
      (i) =>
        (i?.costPrice ?? i?.purchasePrice ?? i?.buyingPrice ?? i?.buyPrice ?? i?.cost ??
          i?.product?.costPrice ?? i?.product?.purchasePrice ?? i?.product?.buyingPrice) != null
    );
    return { value: items.reduce((s, i) => s + itemCost(i), 0), found };
  }
  return { value: 0, found: false };
}

function paidOf(o) {
  const direct = o?.paidAmount ?? o?.paid ?? o?.amountPaid ?? o?.advance ?? o?.advanceAmount;
  if (direct != null) return n(direct);
  if (/paid|success/.test(String(o?.paymentStatus || "").toLowerCase()) &&
      !/unpaid|partial/.test(String(o?.paymentStatus || "").toLowerCase())) {
    return orderTotal(o);
  }
  return isDelivered(o) ? orderTotal(o) : 0;
}

function deriveFromOrders(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const delivered = list.filter(isDelivered);
  const active = list.filter((o) => !isCancelled(o) && !isReturned(o));

  const revenue = delivered.reduce((s, o) => s + orderTotal(o), 0);
  const costs = delivered.map(orderCost);
  const totalCost = costs.reduce((s, c) => s + c.value, 0);
  const costFound = costs.some((c) => c.found);

  const collected = active.reduce((s, o) => s + paidOf(o), 0);
  const billed = active.reduce((s, o) => s + orderTotal(o), 0);

  return {
    // sales = every order that was not cancelled / returned
    totalRevenue: billed,
    salesOrders: active.length,
    averageOrderValue: active.length ? billed / active.length : 0,
    totalOrders: list.length,
    delivered: delivered.length,
    cancelled: list.filter(isCancelled).length,
    revenue,
    totalCost,
    netProfit: revenue - totalCost,
    costFound,
    collected,
    due: Math.max(billed - collected, 0),
    refunded: list.reduce((s, o) => s + n(o?.refundAmount ?? o?.refunded), 0),
    shipped: list.filter(isShipped).length,
    returned: list.filter(isReturned).length,
  };
}

function filterByDate(list, from, to) {
  if (!from || !to) return list;
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T23:59:59.999`).getTime();
  return list.filter((o) => {
    const raw = o?.createdAt ?? o?.orderDate ?? o?.date;
    if (!raw) return true;
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? true : t >= start && t <= end;
  });
}

/* ---------- Image helpers ---------- */
const IMAGE_KEY = /(image|img|photo|thumbnail|thumb|avatar|picture|logo|cover)/i;
const IMAGE_URL = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;
const HIDDEN_KEYS = new Set(["__v", "password", "token", "createdAt", "updatedAt"]);

// string / {url} / {secure_url} / [..]  ->  array of usable absolute URLs
function toImageUrls(value) {
  const out = [];
  const visit = (v) => {
    if (!v) return;
    if (typeof v === "string") {
      let src = v.trim();
      if (!src) return;
      if (src.startsWith("//")) src = `https:${src}`;
      else if (src.startsWith("/")) src = `${API_BASE}${src}`;
      else if (src.startsWith("http://") && !src.includes("localhost")) {
        src = src.replace("http://", "https://");
      } else if (!/^(https?:|data:|blob:)/i.test(src)) {
        src = `${API_BASE}/${src.replace(/^\.?\//, "")}`;
      }
      out.push(src);
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (typeof v === "object") {
      visit(v.secure_url || v.url || v.src || v.path || v.image || v.location);
    }
  };
  visit(value);
  return out;
}

const looksLikeImage = (key, value) => {
  if (IMAGE_KEY.test(key)) return toImageUrls(value).length > 0;
  if (typeof value === "string") return IMAGE_URL.test(value);
  if (Array.isArray(value) && value.length)
    return value.every((v) => typeof v === "string" && IMAGE_URL.test(v));
  return false;
};

function Thumb({ value }) {
  const urls = toImageUrls(value);
  const [failed, setFailed] = useState({});
  if (!urls.length) {
    return (
      <span className="ag-thumb-fallback">
        <ImageOff size={18} />
      </span>
    );
  }
  const shown = urls.slice(0, 2);
  return (
    <div className="ag-thumb-wrap">
      {shown.map((src, i) =>
        failed[i] ? (
          <span key={i} className="ag-thumb-fallback">
            <ImageOff size={18} />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src + i}
            src={src}
            alt=""
            className="ag-thumb"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed((f) => ({ ...f, [i]: true }))}
          />
        )
      )}
      {urls.length > 2 && <span className="ag-thumb-more">+{urls.length - 2}</span>}
    </div>
  );
}

/* ---------- Cell formatting ---------- */
const MONEY_KEY = /(price|amount|total|revenue|profit|cost|paid|due|balance|salary|charge|fee|sales)/i;
const DATE_KEY = /(date|createdat|updatedat|at$)/i;
const STATUS_KEY = /status/i;

const badgeTone = (v) => {
  const s = String(v).toLowerCase();
  if (/(deliver|complete|paid|success|active|confirm|approved|in stock)/.test(s)) return "green";
  if (/(cancel|fail|return|rto|reject|refund|out of stock|inactive)/.test(s)) return "red";
  if (/(pending|process|hold|partial|low|wait)/.test(s)) return "amber";
  if (/(ship|transit|courier|dispatch)/.test(s)) return "blue";
  return "gray";
};

function Cell({ column, value }) {
  if (value == null || value === "") return <>—</>;

  if (looksLikeImage(column, value)) return <Thumb value={value} />;

  if (STATUS_KEY.test(column) && typeof value === "string") {
    return <span className={`ag-badge ag-badge-${badgeTone(value)}`}>{value}</span>;
  }

  if (typeof value === "object") {
    if (Array.isArray(value)) return <>{value.length} item{value.length === 1 ? "" : "s"}</>;
    return <>{value.name || value.orderId || value.title || value._id || JSON.stringify(value)}</>;
  }

  if (typeof value === "number" && MONEY_KEY.test(column)) {
    return <span className="ag-cell-num">{money(value)}</span>;
  }

  if (typeof value === "string" && DATE_KEY.test(column) && !Number.isNaN(Date.parse(value))) {
    return (
      <>
        {new Date(value).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </>
    );
  }

  if (typeof value === "number") return <span className="ag-cell-num">{number(value)}</span>;

  return <>{String(value)}</>;
}

/* ---------- CSV ---------- */
function downloadCSV(filename, rows) {
  if (!rows?.length) return;

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  const escape = (value) => {
    const raw =
      value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const csv = [
    columns.map(escape).join(","),
    ...rows.map((row) => columns.map((key) => escape(row[key])).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------- UI pieces ---------- */
function StatCard({ label, value, icon: Icon, hint }) {
  return (
    <div className="ag-report-stat">
      <div className="ag-report-stat-top">
        <span>{label}</span>
        <span className="ag-report-stat-icon">
          <Icon size={19} />
        </span>
      </div>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="ag-report-empty">
      <AlertCircle size={20} />
      <span>{children}</span>
    </div>
  );
}

function Table({ rows, loading, emptyText = "No report records found." }) {
  const columns = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const keys = [
      ...new Set(list.slice(0, 100).flatMap((row) => Object.keys(row || {}))),
    ].filter((k) => k !== "_id" && k !== "id" && !HIDDEN_KEYS.has(k));

    const sample = (k) => list.find((r) => r?.[k] != null)?.[k];
    const imageCols = keys.filter((k) => looksLikeImage(k, sample(k)));
    const rest = keys.filter((k) => !imageCols.includes(k));

    // image columns always come first so they are never cut off
    return [...imageCols.slice(0, 1), ...rest].slice(0, 8);
  }, [rows]);

  if (loading) {
    return (
      <div className="ag-report-loading">
        <LoaderCircle className="ag-spin" size={22} /> Loading report data…
      </div>
    );
  }

  if (!rows?.length) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div className="ag-report-table-wrap">
      <table className="ag-report-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>
                {column.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row._id || row.id || row.orderId || i}>
              {columns.map((column) => (
                <td
                  key={column}
                  title={
                    typeof row[column] === "object" ? undefined : String(row[column] ?? "")
                  }
                >
                  <Cell column={column} value={row[column]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Page ---------- */
export default function ReportSection() {
  const [active, setActive] = useState("overview");
  const [period, setPeriod] = useState("30");
  const [from, setFrom] = useState(dateInput(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(dateInput(new Date()));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (period === "custom") return;
    const today = new Date();
    const days = { "7": 6, "30": 29, "90": 89, "365": 364 }[period] ?? 29;
    setFrom(dateInput(new Date(today.getTime() - days * 86400000)));
    setTo(dateInput(today));
  }, [period]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint = REPORT_ENDPOINTS[active];
      if (!endpoint) throw new Error("Invalid report endpoint");

      const url = new URL(endpoint, API_BASE);
      if (from) url.searchParams.set("from", from);
      if (to) url.searchParams.set("to", to);
      if (debouncedSearch) url.searchParams.set("search", debouncedSearch);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token") || localStorage.getItem("accessToken") || ""
          : "";

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(json.message || `Request failed (${response.status})`);
      if (json?.success === false) throw new Error(json.message || "Could not load report.");

      setPayload(json);
    } catch (err) {
      setPayload(null);
      setError(err.message || "Could not load report data.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, from, to, debouncedSearch, refreshKey]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const data = unwrap(payload);

  const overviewSummary = Array.isArray(data.summary)
    ? Object.fromEntries(data.summary.map((item) => [item.key, item.value]))
    : data.summary || data.stats || {};

  const rows = useMemo(() => {
    if (active === "overview") {
      return asArray(payload, ["topProducts", "activity", "orders", "rows", "recentOrders"]);
    }
    const list = asArray(payload, [
      "rows",
      "items",
      "results",
      "records",
      "data",
      "orders",
      "products",
      "customers",
      "employees",
    ]);
    return ORDER_TABS.includes(active) ? filterByDate(list, from, to) : list;
  }, [payload, active, from, to]);

  const cards = useMemo(() => {
    const get = (...paths) =>
      pick(
        data,
        paths,
        pick(overviewSummary, paths.map((p) => p.split(".").at(-1)), 0)
      );

    if (active === "overview") {
      return [
        { label: "Total Orders", value: number(get("totalOrders", "orders", "counts.orders")), icon: ShoppingCart },
        { label: "Total Sales", value: money(get("totalSales", "sales", "revenue", "counts.sales")), icon: Banknote },
        { label: "Total Products", value: number(get("totalProducts", "items", "products")), icon: Package },
        { label: "Total Customers", value: number(get("totalCustomers", "customers")), icon: Users },
      ];
    }

    // order-list endpoints return an array, so totals are calculated from the rows
    const derived = ORDER_TABS.includes(active) ? deriveFromOrders(rows) : null;
    const src = derived || data;

    const definitions = {
      sales: [
        ["Total Revenue", ["totalRevenue", "totalSales", "sales", "revenue"], true, Banknote],
        ["Orders", ["salesOrders", "totalOrders", "orders", "count"], false, ShoppingCart],
        ["Average Order", ["averageOrderValue", "averageOrder"], true, Wallet],
      ],
      orders: [
        ["Total Orders", ["totalOrders", "total", "count"], false, ShoppingCart],
        ["Delivered", ["delivered", "deliveredOrders"], false, CheckCircle2],
        ["Cancelled", ["cancelled", "cancelledOrders"], false, XCircle],
      ],
      profit: [
        ["Revenue", ["revenue", "totalRevenue", "sales"], true, Banknote],
        ["Total Cost", ["totalCost", "cost"], true, CreditCard],
        ["Net Profit", ["netProfit", "profit"], true, TrendingUp],
      ],
      products: [
        ["Products", ["totalProducts", "total", "count"], false, Package],
        ["Low Stock", ["lowStock", "lowStockCount"], false, AlertCircle],
        ["Out of Stock", ["outOfStock", "outOfStockCount"], false, XCircle],
      ],
      customers: [
        ["Customers", ["totalCustomers", "total", "count"], false, Users],
        ["New Customers", ["newCustomers", "new"], false, UserRoundCheck],
        ["Repeat Customers", ["repeatCustomers", "repeat"], false, Users],
      ],
      employees: [
        ["Employees", ["totalEmployees", "total", "count"], false, UserRoundCheck],
        ["Completed Orders", ["completedOrders", "delivered"], false, CheckCircle2],
        ["Pending Orders", ["pendingOrders", "pending"], false, ShoppingCart],
      ],
      payments: [
        ["Collected", ["collected", "totalPaid", "paidAmount"], true, Banknote],
        ["Due", ["due", "totalDue", "unpaidAmount"], true, Wallet],
        ["Refunded", ["refunded", "refundAmount"], true, CreditCard],
      ],
      courier: [
        ["Shipped", ["shipped", "shippedOrders"], false, Truck],
        ["Delivered", ["delivered", "deliveredOrders"], false, CheckCircle2],
        ["Returned / RTO", ["returned", "rto", "returnedOrders"], false, XCircle],
      ],
    };

    return (definitions[active] || []).map(([label, paths, isMoney, icon]) => {
      let hint;
      if (active === "profit") {
        if (label === "Revenue") hint = "Delivered orders only";
        if (label === "Total Cost" && derived && !derived.costFound)
          hint = "Cost field not found in API data";
      }
      return {
        label,
        value: isMoney ? money(pick(src, paths, 0)) : number(pick(src, paths, 0)),
        icon,
        hint,
      };
    });
  }, [data, overviewSummary, active, rows]);

  const exportRows = rows.length ? rows : data ? [data] : [];
  const activeLabel = REPORTS.find((r) => r.id === active)?.label || "Report";

  return (
    <main className="ag-report-page">
      <header className="ag-report-header">
        <div>
          <div className="ag-report-eyebrow">APPLE GADGETS · ANALYTICS</div>
          <h1>Reports &amp; Analytics</h1>
          <p>Track sales, orders, products, customers and business performance.</p>
        </div>

        <button
          className="ag-report-button ag-report-button-dark"
          onClick={() => setRefreshKey((v) => v + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "ag-spin" : ""} />
          Refresh
        </button>
      </header>

      <section className="ag-report-filters">
        <div className="ag-report-period-group">
          {[
            { value: "7", label: "৭ দিন" },
            { value: "30", label: "৩০ দিন" },
            { value: "90", label: "৯০ দিন" },
            { value: "365", label: "১ বছর" },
            { value: "custom", label: "কাস্টম" },
          ].map((p) => (
            <button
              key={p.value}
              type="button"
              className={`ag-report-period-btn ${period === p.value ? "is-active" : ""}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="ag-report-field">
          <span>
            <CalendarDays size={15} /> From
          </span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value);
              setPeriod("custom");
            }}
          />
        </label>

        <label className="ag-report-field">
          <span>
            <CalendarDays size={15} /> To
          </span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            max={dateInput(new Date())}
            onChange={(e) => {
              setTo(e.target.value);
              setPeriod("custom");
            }}
          />
        </label>

        <label className="ag-report-field ag-report-search">
          <span>
            <Search size={15} /> Search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order, product, customer…"
          />
        </label>

        <button
          className="ag-report-button"
          onClick={() => setRefreshKey((v) => v + 1)}
          disabled={loading}
        >
          <Filter size={16} /> Apply filters
        </button>

        <button
          className="ag-report-button"
          onClick={() =>
            downloadCSV(`apple-gadgets-${active}-${dateInput(new Date())}.csv`, exportRows)
          }
          disabled={!payload || loading}
        >
          <Download size={16} /> Export CSV
        </button>
      </section>

      <nav className="ag-report-tabs" aria-label="Report types">
        {REPORTS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`ag-report-tab ${active === id ? "is-active" : ""}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="ag-report-error">
          <AlertCircle size={18} />
          <div>
            <strong>Could not load {activeLabel.toLowerCase()}</strong>
            <p>{error}</p>
            <small>
              Confirm that the endpoint in REPORT_ENDPOINTS matches your backend route and that
              your login token is available.
            </small>
          </div>
        </div>
      )}

      <section className="ag-report-stats">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="ag-report-panel">
        <div className="ag-report-panel-heading">
          <div>
            <h2>
              {active === "overview" ? "Recent Activity & Top Products" : `${activeLabel} Details`}
            </h2>
            <p>Filtered report data from your backend</p>
          </div>

          <button
            className="ag-report-button ag-report-button-small"
            onClick={() => downloadCSV(`apple-gadgets-${active}.csv`, exportRows)}
            disabled={!payload || loading}
          >
            <FileSpreadsheet size={16} /> Export
          </button>
        </div>

        <Table
          rows={rows}
          loading={loading}
          emptyText={
            active === "overview"
              ? "No activity or top-product data was returned."
              : "No records returned for these filters."
          }
        />
      </section>

      <p className="ag-report-footnote">
        Reports are calculated from the connected backend. Revenue and profit depend on the fields
        and business rules returned by your API.
      </p>
    </main>
  );
}
