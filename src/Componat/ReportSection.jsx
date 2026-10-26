
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
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
  TrendingUp,
  XCircle,
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
  productCosts: "/api/dashboard/product-costs-report",
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

const ORDER_TABS = ["sales", "orders", "profit", "payments", "courier"];

const HIDDEN_KEYS = new Set([
  "__v",
  "password",
  "token",
  "accessToken",
  "refreshToken",
]);

const money = (value) =>
  `৳ ${Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;

const number = (value) => Number(value || 0).toLocaleString("en-BD");

const n = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const norm = (value) =>
  value == null ? "" : String(value).trim().toLowerCase();

const getId = (value) => {
  if (value == null) return "";

  if (typeof value === "object") {
    return String(value._id ?? value.$oid ?? value.id ?? "");
  }

  return String(value);
};

const dateInput = (date) => {
  const d = new Date(date);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const pick = (obj, paths, fallback = 0) => {
  for (const path of paths) {
    const value = path.split(".").reduce((v, key) => v?.[key], obj);

    if (value !== undefined && value !== null) return value;
  }

  return fallback;
};

/* =========================================================
   API HELPERS
========================================================= */

function unwrap(payload) {
  let result = payload;

  for (let i = 0; i < 4; i++) {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      break;
    }

    if (result.success === false) {
      throw new Error(result.message || "API request failed.");
    }

    if (result.data !== undefined) {
      result = result.data;
      continue;
    }

    if (result.result !== undefined) {
      result = result.result;
      continue;
    }

    break;
  }

  return result ?? {};
}

function asArray(payload, keys = []) {
  const seen = new Set();

  function walk(node, depth = 0) {
    if (Array.isArray(node)) return node;

    if (!node || typeof node !== "object" || depth > 6 || seen.has(node)) {
      return null;
    }

    seen.add(node);

    for (const key of keys) {
      if (Array.isArray(node[key])) return node[key];
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) return value;
    }

    for (const value of Object.values(node)) {
      const result = walk(value, depth + 1);
      if (result !== null) return result;
    }

    return null;
  }

  return walk(payload) ?? [];
}

async function requestJSON(url, signal) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
    signal,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      json?.message || `Request failed with status ${response.status}`
    );
  }

  if (json?.success === false) {
    throw new Error(json.message || "The server returned an error.");
  }

  return json;
}

/* =========================================================
   COST HELPERS
========================================================= */

function productCost(product) {
  if (!product || typeof product !== "object") return null;

  const fields = [
    "costPrice",
    "purchasePrice",
    "buyingPrice",
    "buyPrice",
    "unitCost",
    "cost",
  ];

  for (const field of fields) {
    const value = product[field];

    if (value === null || value === undefined || value === "") continue;

    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }

  return null;
}

function buildCostMap(products) {
  const map = new Map();

  const put = (type, value, cost) => {
    const key = norm(getId(value) || value);
    if (key) map.set(`${type}:${key}`, cost);
  };

  for (const product of products) {
    if (!product || typeof product !== "object") continue;

    const cost = productCost(product);

    if (cost !== null) {
      for (const id of [
        product._id,
        product.id,
        product.productId,
        product.product,
      ]) {
        put("id", id, cost);
      }

      put("sku", product.sku, cost);
      put("slug", product.slug, cost);
      put("name", product.name ?? product.title ?? product.productName, cost);
    }

    if (Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        const variantCost = productCost(variant);

        if (variantCost === null) continue;

        put("variant", variant._id ?? variant.id, variantCost);
        put("sku", variant.sku, variantCost);
      }
    }
  }

  return map;
}

function itemCostInfo(item, costMap) {
  if (!item || typeof item !== "object") {
    return { cost: null, found: false };
  }

  const lookup = (type, value) => {
    const key = norm(getId(value) || value);

    if (!key) return null;

    const mapKey = `${type}:${key}`;

    return costMap.has(mapKey)
      ? { cost: costMap.get(mapKey), found: true }
      : null;
  };

  const product = item.product ?? item.productId;
  const variantId = item.variantId ?? item.variant?._id ?? item.variant?.id;

  const directVariant = lookup("variant", variantId);
  if (directVariant) return directVariant;

  const productMatch = lookup("id", product);
  if (productMatch) return productMatch;

  const skuMatch = lookup("sku", item.sku ?? item.variant?.sku);
  if (skuMatch) return skuMatch;

  const slugMatch = lookup("slug", item.slug ?? item.product?.slug);
  if (slugMatch) return slugMatch;

  const nameMatch = lookup(
    "name",
    item.name ?? item.productName ?? item.product?.name
  );
  if (nameMatch) return nameMatch;

  // The populated order item may already contain costPrice.
  const populatedCost = productCost(item.product);
  if (populatedCost !== null) {
    return { cost: populatedCost, found: true };
  }

  const variantCost = productCost(item.variant);
  if (variantCost !== null) {
    return { cost: variantCost, found: true };
  }

  const directCost = productCost(item);
  if (directCost !== null) {
    return { cost: directCost, found: true };
  }

  return { cost: null, found: false };
}

function orderCost(order, costMap) {
  const directFields = [
    "totalCost",
    "totalPurchasePrice",
    "purchaseCost",
  ];

  for (const field of directFields) {
    const value = order?.[field];

    if (value === null || value === undefined || value === "") continue;

    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return {
        value: parsed,
        found: true,
        unmatchedItems: 0,
      };
    }
  }

  const items =
    order?.products ??
    order?.items ??
    order?.orderItems ??
    order?.cart ??
    [];

  if (!Array.isArray(items) || items.length === 0) {
    return { value: 0, found: false, unmatchedItems: 0 };
  }

  let value = 0;
  let matchedItems = 0;
  let unmatchedItems = 0;

  for (const item of items) {
    const info = itemCostInfo(item, costMap);

    if (!info.found) {
      unmatchedItems++;
      continue;
    }

    const quantity = Math.max(0, n(item.quantity ?? item.qty ?? 1));

    value += info.cost * quantity;
    matchedItems++;
  }

  return {
    value,
    found: matchedItems > 0 && unmatchedItems === 0,
    unmatchedItems,
  };
}

/* =========================================================
   ORDER HELPERS
========================================================= */

const statusOf = (order) =>
  norm(order?.status ?? order?.orderStatus);

const isDelivered = (order) =>
  /deliver|complete/.test(statusOf(order));

const isCancelled = (order) =>
  /cancel/.test(statusOf(order));

const isReturned = (order) =>
  /return|rto/.test(statusOf(order));

const isShipped = (order) =>
  /courier|ship|transit|dispatch|handed_over|picked_up/.test(
    `${statusOf(order)} ${norm(order?.deliveryStatus)} ${norm(
      order?.courierDetails?.courierStatus
    )}`
  );

const orderTotal = (order) =>
  n(
    order?.totalAmount ??
      order?.grandTotal ??
      order?.total ??
      order?.amount
  );

function paidOf(order) {
  const direct =
    order?.paidAmount ??
    order?.amountPaid ??
    order?.advanceAmount ??
    order?.advance ??
    order?.paid;

  if (direct !== undefined && direct !== null && direct !== "") {
    return Math.max(0, n(direct));
  }

  const paymentStatus = norm(order?.paymentStatus);

  if (/paid|success/.test(paymentStatus) && !/unpaid|partial/.test(paymentStatus)) {
    return orderTotal(order);
  }

  return isDelivered(order) ? orderTotal(order) : 0;
}

function deriveFromOrders(rows, costMap) {
  const list = Array.isArray(rows) ? rows : [];
  const delivered = list.filter(isDelivered);
  const active = list.filter(
    (order) => !isCancelled(order) && !isReturned(order)
  );

  const revenue = delivered.reduce((sum, order) => sum + orderTotal(order), 0);

  const costResults = delivered.map((order) => orderCost(order, costMap));

  const totalCost = costResults.reduce((sum, result) => sum + result.value, 0);

  const unmatchedItems = costResults.reduce(
    (sum, result) => sum + result.unmatchedItems,
    0
  );

  const costFound =
    delivered.length > 0 &&
    costResults.every((result) => result.found);

  const billed = active.reduce((sum, order) => sum + orderTotal(order), 0);
  const collected = active.reduce((sum, order) => sum + paidOf(order), 0);

  return {
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
    unmatchedItems,
    collected,
    due: Math.max(0, billed - collected),
    refunded: list.reduce(
      (sum, order) => sum + n(order.refundAmount ?? order.refunded),
      0
    ),
    shipped: list.filter(isShipped).length,
    returned: list.filter(isReturned).length,
  };
}

function filterByDate(list, from, to) {
  const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
  const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;

  return list.filter((order) => {
    const raw = order.createdAt ?? order.orderDate ?? order.date;

    // Exclude records without a date if a date filter is applied.
    if (!raw) return !from && !to;

    const time = new Date(raw).getTime();

    return Number.isFinite(time) && time >= start && time <= end;
  });
}

/* =========================================================
   CSV EXPORT
========================================================= */

function downloadCSV(filename, rows) {
  if (!Array.isArray(rows) || !rows.length) return;

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row ?? {})))]
    .filter((key) => !HIDDEN_KEYS.has(key));

  const escapeCSV = (value) => {
    let raw =
      value == null
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

    // Avoid spreadsheet formula injection.
    if (/^[\s]*[=+\-@]/.test(raw)) raw = `'${raw}`;

    return `"${raw.replace(/"/g, '""')}"`;
  };

  const csv = [
    columns.map(escapeCSV).join(","),
    ...rows.map((row) =>
      columns.map((key) => escapeCSV(row[key])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================================================
   TABLE
========================================================= */

const IMAGE_KEY = /(image|img|photo|thumbnail|thumb|avatar|picture|logo|cover)/i;
const MONEY_KEY = /(price|amount|total|revenue|profit|cost|paid|due|balance|salary|charge|fee|sales)/i;
const DATE_KEY = /(date|createdat|updatedat|timestamp|time$)/i;

function imageUrls(value) {
  const result = [];

  const visit = (item) => {
    if (!item) return;

    if (typeof item === "string") {
      const src = item.trim();
      if (/^(https?:\/\/|data:image\/|blob:)/i.test(src)) {
        result.push(src);
      } else if (src.startsWith("//")) {
        result.push(`https:${src}`);
      }
    } else if (Array.isArray(item)) {
      item.forEach(visit);
    } else if (typeof item === "object") {
      visit(item.secure_url ?? item.url ?? item.src ?? item.image);
    }
  };

  visit(value);

  return [...new Set(result)];
}

function Cell({ column, value }) {
  if (value == null || value === "") return <>—</>;

  if (IMAGE_KEY.test(column)) {
    const urls = imageUrls(value);

    if (urls.length) {
      return (
        <div className="ag-thumb-wrap">
          {urls.slice(0, 2).map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              className="ag-thumb"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <span className="ag-thumb-fallback">
        <ImageOff size={18} />
      </span>
    );
  }

  if (typeof value === "number" && MONEY_KEY.test(column)) {
    return <span className="ag-cell-num">{money(value)}</span>;
  }

  if (DATE_KEY.test(column) && !Number.isNaN(Date.parse(value))) {
    return (
      <>
        {new Date(value).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </>
    );
  }

  if (typeof value === "object") {
    if (Array.isArray(value)) return <>{value.length} items</>;

    return (
      <>
        {String(
          value.name ??
            value.productName ??
            value.orderId ??
            value.title ??
            value._id ??
            "[Object]"
        )}
      </>
    );
  }

  if (/status/i.test(column)) {
    const status = norm(value);
    const tone = /deliver|complete|paid|success|active|confirm/.test(status)
      ? "green"
      : /cancel|fail|return|refund|reject/.test(status)
        ? "red"
        : /pending|process|partial|hold/.test(status)
          ? "amber"
          : /ship|transit|courier/.test(status)
            ? "blue"
            : "gray";

    return <span className={`ag-badge ag-badge-${tone}`}>{String(value)}</span>;
  }

  return <>{String(value)}</>;
}

function Table({ rows, loading, emptyText }) {
  const columns = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const keys = [...new Set(list.slice(0, 100).flatMap((row) => Object.keys(row ?? {})))];

    return keys
      .filter(
        (key) =>
          !["_id", "id", "__v", "password", "token"].includes(key) &&
          !HIDDEN_KEYS.has(key)
      )
      .slice(0, 8);
  }, [rows]);

  if (loading) {
    return (
      <div className="ag-report-loading">
        <LoaderCircle className="ag-spin" size={22} />
        Loading report data…
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="ag-report-empty">
        <AlertCircle size={20} />
        <span>{emptyText || "No report records found."}</span>
      </div>
    );
  }

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
          {rows.map((row, index) => (
            <tr key={row._id ?? row.id ?? row.orderId ?? index}>
              {columns.map((column) => (
                <td key={column}>
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

/* =========================================================
   MAIN REPORT PAGE
========================================================= */

export default function ReportSection() {
  const [active, setActive] = useState("overview");
  const [period, setPeriod] = useState("30");
  const [from, setFrom] = useState(
    dateInput(new Date(Date.now() - 29 * 86400000))
  );
  const [to, setTo] = useState(dateInput(new Date()));

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [costMap, setCostMap] = useState(new Map());
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState("");

  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (period === "custom") return;

    const days = { "7": 6, "30": 29, "90": 89, "365": 364 }[period] ?? 29;
    const today = new Date();

    setFrom(dateInput(new Date(today.getTime() - days * 86400000)));
    setTo(dateInput(today));
  }, [period]);

  const loadCosts = useCallback(async (signal) => {
    setCostLoading(true);
    setCostError("");

    try {
      const json = await requestJSON(
        new URL(REPORT_ENDPOINTS.productCosts, API_BASE).toString(),
        signal
      );

      const products = asArray(json, [
        "products",
        "items",
        "rows",
        "results",
        "records",
      ]);

      const map = buildCostMap(products);

      if (signal.aborted) return;

      setCostMap(map);

      if (!products.length) {
        setCostError("No products returned by product-costs-report.");
      } else if (!map.size) {
        setCostError("Products returned, but no valid cost fields were found.");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setCostMap(new Map());
        setCostError(err.message || "Could not load product costs.");
      }
    } finally {
      if (!signal.aborted) setCostLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active !== "profit") return;

    const controller = new AbortController();
    loadCosts(controller.signal);

    return () => controller.abort();
  }, [active, refreshKey, loadCosts]);

  const loadReport = useCallback(async () => {
    const controller = new AbortController();
    const currentRequest = ++requestId.current;

    setLoading(true);
    setError("");

    try {
      const endpoint = REPORT_ENDPOINTS[active];

      if (!endpoint) throw new Error("Invalid report endpoint.");

      const url = new URL(endpoint, API_BASE);

      // The overview endpoint explicitly requests all-time data.
      // Other tabs use the selected date range.
      if (active !== "overview") {
        if (from) url.searchParams.set("from", from);
        if (to) url.searchParams.set("to", to);
      }

      if (debouncedSearch) {
        url.searchParams.set("search", debouncedSearch);
      }

      const json = await requestJSON(url.toString(), controller.signal);

      if (currentRequest !== requestId.current) return;

      setPayload(json);
    } catch (err) {
      if (err.name !== "AbortError" && currentRequest === requestId.current) {
        setPayload(null);
        setError(err.message || "Could not load report data.");
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }

    return () => controller.abort();
  }, [active, from, to, debouncedSearch, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    const currentRequest = ++requestId.current;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const endpoint = REPORT_ENDPOINTS[active];
        if (!endpoint) throw new Error("Invalid report endpoint.");

        const url = new URL(endpoint, API_BASE);

        if (active !== "overview") {
          if (from) url.searchParams.set("from", from);
          if (to) url.searchParams.set("to", to);
        }

        if (debouncedSearch) url.searchParams.set("search", debouncedSearch);

        const json = await requestJSON(url.toString(), controller.signal);

        if (currentRequest === requestId.current) setPayload(json);
      } catch (err) {
        if (
          err.name !== "AbortError" &&
          currentRequest === requestId.current
        ) {
          setPayload(null);
          setError(err.message || "Could not load report.");
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }

    run();

    return () => controller.abort();
  }, [active, from, to, debouncedSearch, refreshKey]);

  const data = useMemo(() => {
    try {
      return unwrap(payload);
    } catch {
      return {};
    }
  }, [payload]);

  const rows = useMemo(() => {
    if (!payload) return [];

    if (active === "overview") {
      return asArray(payload, [
        "recentOrders",
        "activity",
        "topProducts",
        "orders",
        "rows",
        "items",
      ]);
    }

    const list = asArray(payload, [
      "rows",
      "items",
      "results",
      "records",
      "orders",
      "products",
      "customers",
      "employees",
    ]);

    return ORDER_TABS.includes(active)
      ? filterByDate(list, from, to)
      : list;
  }, [payload, active, from, to]);

  const summary = useMemo(() => {
    if (Array.isArray(data?.summary)) {
      return Object.fromEntries(
        data.summary.map((item) => [item.key, item.value])
      );
    }

    return data?.summary ?? data?.stats ?? {};
  }, [data]);

  const cards = useMemo(() => {
    const derived = ORDER_TABS.includes(active)
      ? deriveFromOrders(rows, costMap)
      : null;

    const source = derived ?? data;

    const stat = (paths) => pick(source, paths, pick(summary, paths, 0));

    const definitions = {
      overview: [
        ["Total Orders", ["totalOrders", "orders", "counts.orders"], false, ShoppingCart],
        ["Total Sales", ["totalSales", "sales", "revenue"], true, Banknote],
        ["Total Products", ["totalProducts", "products"], false, Package],
        ["Total Customers", ["totalCustomers", "customers"], false, Users],
      ],
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

    return (definitions[active] ?? []).map(([label, paths, isMoney, icon]) => {
      let value = stat(paths);
      let hint = "";

      if (active === "profit" && derived) {
        if (label === "Revenue") hint = "Delivered orders only";

        if (label === "Total Cost") {
          if (costLoading) hint = "Loading product costs…";
          else if (costError) hint = costError;
          else if (derived.unmatchedItems) {
            hint = `${derived.unmatchedItems} item(s) missing cost match`;
          } else if (derived.delivered && !derived.costFound) {
            hint = "Cost data incomplete; verify backend order items";
          } else if (!derived.delivered) {
            hint = "No delivered orders in this report";
          } else {
            hint = "Product cost × quantity";
          }
        }

        if (label === "Net Profit" && derived.delivered && !derived.costFound) {
          hint = "Estimated only; cost data is incomplete";
        }

        // Do not display a misleading profit figure when cost is incomplete.
        if (label === "Net Profit" && derived.delivered && !derived.costFound) {
          value = null;
        }
      }

      return {
        label,
        value: value === null
          ? "Unavailable"
          : isMoney
            ? money(value)
            : number(value),
        icon,
        hint,
      };
    });
  }, [active, rows, costMap, costLoading, costError, data, summary]);

  const activeLabel = REPORTS.find((item) => item.id === active)?.label ?? "Report";

  const exportRows = rows.length
    ? rows
    : data && typeof data === "object" && !Array.isArray(data)
      ? [data]
      : [];

  const refresh = () => setRefreshKey((value) => value + 1);

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
          onClick={refresh}
          disabled={loading || costLoading}
        >
          <RefreshCw size={16} className={loading || costLoading ? "ag-spin" : ""} />
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
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={`ag-report-period-btn ${period === item.value ? "is-active" : ""}`}
              onClick={() => setPeriod(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="ag-report-field">
          <span><CalendarDays size={15} /> From</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              setPeriod("custom");
            }}
          />
        </label>

        <label className="ag-report-field">
          <span><CalendarDays size={15} /> To</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            max={dateInput(new Date())}
            onChange={(event) => {
              setTo(event.target.value);
              setPeriod("custom");
            }}
          />
        </label>

        <label className="ag-report-field ag-report-search">
          <span><Search size={15} /> Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Order, product, customer…"
          />
        </label>

        <button className="ag-report-button" onClick={refresh} disabled={loading}>
          <Filter size={16} /> Apply filters
        </button>

        <button
          className="ag-report-button"
          onClick={() => downloadCSV(`apple-gadgets-${active}-${dateInput(new Date())}.csv`, exportRows)}
          disabled={!payload || loading || !exportRows.length}
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
              Verify the backend route, response format, CORS and authentication.
            </small>
          </div>
        </div>
      )}

      <section className="ag-report-stats">
        {cards.map((card) => <StatCard key={card.label} {...card} />)}
      </section>

      <section className="ag-report-panel">
        <div className="ag-report-panel-heading">
          <div>
            <h2>{active === "overview" ? "Recent Activity & Top Products" : `${activeLabel} Details`}</h2>
            <p>Filtered report data from your backend</p>
          </div>

          <button
            className="ag-report-button ag-report-button-small"
            onClick={() => downloadCSV(`apple-gadgets-${active}.csv`, exportRows)}
            disabled={!payload || loading || !exportRows.length}
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
        Reports use the data returned by your backend. Profit is only reliable
        when delivered order totals and product purchase costs are available.
      </p>
    </main>
  );
}
