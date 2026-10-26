
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

const money = (value) =>
  `৳ ${Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;

const number = (value) =>
  Number(value || 0).toLocaleString("en-BD");

const dateInput = (date) => {
  const d = new Date(date);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const n = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const norm = (value) =>
  value == null ? "" : String(value).trim().toLowerCase();

const pick = (obj, paths, fallback = 0) => {
  for (const path of paths) {
    const value = path.split(".").reduce((v, key) => v?.[key], obj);

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return fallback;
};

/* =========================================================
   API RESPONSE HELPERS
========================================================= */

const unwrap = (payload) =>
  payload?.data ?? payload?.result ?? payload ?? {};

function asArray(payload, keys = []) {
  const seen = new Set();

  const walk = (node, depth = 0) => {
    if (Array.isArray(node)) return node;

    if (
      !node ||
      typeof node !== "object" ||
      depth > 5 ||
      seen.has(node)
    ) {
      return null;
    }

    seen.add(node);

    for (const key of keys) {
      if (Array.isArray(node[key])) {
        return node[key];
      }
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        return value;
      }
    }

    for (const value of Object.values(node)) {
      const found = walk(value, depth + 1);
      if (found) return found;
    }

    return null;
  };

  return walk(payload) || [];
}

/* =========================================================
   ORDER HELPERS
========================================================= */

const ORDER_TABS = [
  "sales",
  "orders",
  "profit",
  "payments",
  "courier",
];

const statusOf = (order) =>
  String(order?.status || order?.orderStatus || "").toLowerCase();

const isDelivered = (order) =>
  /deliver|complete/.test(statusOf(order));

const isCancelled = (order) =>
  /cancel/.test(statusOf(order));

const isReturned = (order) =>
  /return|rto/.test(statusOf(order));

const isShipped = (order) =>
  /courier|ship|transit|dispatch|handed_over|picked_up/.test(
    `${statusOf(order)} ${order?.deliveryStatus || ""} ${
      order?.courierDetails?.courierStatus || ""
    }`.toLowerCase()
  );

const orderTotal = (order) =>
  n(
    order?.totalAmount ??
      order?.total ??
      order?.grandTotal ??
      order?.amount
  );

/* =========================================================
   PRODUCT COST HELPERS
========================================================= */

function getId(value) {
  if (value == null) return "";

  if (typeof value === "object") {
    if (value._id != null) return String(value._id);
    if (value.$oid != null) return String(value.$oid);
    if (value.id != null) return String(value.id);

    return "";
  }

  return String(value);
}

function productCost(product) {
  if (!product || typeof product !== "object") {
    return null;
  }

  const value =
    product.costPrice ??
    product.purchasePrice ??
    product.buyingPrice ??
    product.buyPrice ??
    product.unitCost ??
    product.cost;

  if (value == null || value === "") {
    return null;
  }

  const cost = Number(value);

  return Number.isFinite(cost) && cost >= 0 ? cost : null;
}

function buildCostMap(products = []) {
  const map = {};

  const put = (prefix, key, cost) => {
    const normalized = norm(key);

    if (normalized) {
      map[`${prefix}:${normalized}`] = cost;
    }
  };

  for (const product of products) {
    if (!product || typeof product !== "object") {
      continue;
    }

    const cost = productCost(product);

    if (cost !== null) {
      [
        product._id,
        product.id,
        product.productId,
        product.product,
      ].forEach((value) => {
        put("id", getId(value), cost);
      });

      put("sku", product.sku, cost);
      put("slug", product.slug, cost);

      put(
        "name",
        product.name ?? product.title ?? product.productName,
        cost
      );
    }

    if (Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        if (!variant || typeof variant !== "object") {
          continue;
        }

        const variantCost = productCost(variant);

        if (variantCost === null) {
          continue;
        }

        put(
          "variant",
          getId(variant._id ?? variant.id),
          variantCost
        );

        put("sku", variant.sku, variantCost);
      }
    }
  }

  return map;
}

function itemCostInfo(item, costMap = {}) {
  if (!item || typeof item !== "object") {
    return { cost: 0, found: false };
  }

  const hit = (prefix, value) => {
    const normalized = norm(value);
    const key = `${prefix}:${normalized}`;

    if (
      normalized &&
      Object.prototype.hasOwnProperty.call(costMap, key)
    ) {
      return {
        cost: costMap[key],
        found: true,
      };
    }

    return null;
  };

  const variantId = getId(item.variantId);
  const productId = getId(item.product ?? item.productId);

  // Match the exact variant first.
  const variantMatch = hit("variant", variantId);
  if (variantMatch) return variantMatch;

  // Match the product ObjectId.
  const productMatch = hit("id", productId);
  if (productMatch) return productMatch;

  // Match SKU.
  const skuMatch = hit("sku", item.sku);
  if (skuMatch) return skuMatch;

  // Match slug.
  const slugMatch = hit("slug", item.slug);
  if (slugMatch) return slugMatch;

  // Match product name.
  const nameMatch = hit(
    "name",
    item.name ?? item.productName
  );
  if (nameMatch) return nameMatch;

  // If the order contains a populated product object.
  const populatedCost = productCost(item.product);

  if (populatedCost !== null) {
    return {
      cost: populatedCost,
      found: true,
    };
  }

  // Fallback to cost stored directly on the order item.
  const directCost = productCost(item);

  if (directCost !== null) {
    return {
      cost: directCost,
      found: true,
    };
  }

  return {
    cost: 0,
    found: false,
  };
}

function orderCost(order, costMap = {}) {
  const direct =
    order?.totalCost ??
    order?.totalPurchasePrice ??
    order?.purchaseCost;

  if (
    direct !== undefined &&
    direct !== null &&
    direct !== "" &&
    Number.isFinite(Number(direct)) &&
    Number(direct) >= 0
  ) {
    return {
      value: Number(direct),
      found: true,
      unmatchedItems: 0,
    };
  }

  const items =
    order?.products ??
    order?.items ??
    order?.orderItems ??
    order?.cart ??
    [];

  if (!Array.isArray(items) || items.length === 0) {
    return {
      value: 0,
      found: false,
      unmatchedItems: 0,
    };
  }

  let totalCost = 0;
  let matchedItems = 0;
  let unmatchedItems = 0;

  for (const item of items) {
    const info = itemCostInfo(item, costMap);

    if (!info.found) {
      unmatchedItems++;
      continue;
    }

    const quantity = Math.max(
      0,
      n(item?.quantity ?? item?.qty) || 1
    );

    totalCost += info.cost * quantity;
    matchedItems++;
  }

  return {
    value: totalCost,
    found: matchedItems > 0 && unmatchedItems === 0,
    unmatchedItems,
  };
}

/* =========================================================
   PAYMENT CALCULATIONS
========================================================= */

function paidOf(order) {
  const direct =
    order?.paidAmount ??
    order?.paid ??
    order?.amountPaid ??
    order?.advance ??
    order?.advanceAmount;

  if (direct != null) return n(direct);

  const paymentStatus = String(
    order?.paymentStatus || ""
  ).toLowerCase();

  if (
    /paid|success/.test(paymentStatus) &&
    !/unpaid|partial/.test(paymentStatus)
  ) {
    return orderTotal(order);
  }

  return isDelivered(order) ? orderTotal(order) : 0;
}

/* =========================================================
   SUMMARY CALCULATIONS
========================================================= */

function deriveFromOrders(rows, costMap = {}) {
  const list = Array.isArray(rows) ? rows : [];

  const delivered = list.filter(isDelivered);

  const active = list.filter(
    (order) => !isCancelled(order) && !isReturned(order)
  );

  const revenue = delivered.reduce(
    (sum, order) => sum + orderTotal(order),
    0
  );

  const costs = delivered.map((order) =>
    orderCost(order, costMap)
  );

  const totalCost = costs.reduce(
    (sum, result) => sum + result.value,
    0
  );

  const costFound = costs.some((result) => result.found);

  const unmatchedItems = costs.reduce(
    (sum, result) => sum + result.unmatchedItems,
    0
  );

  const collected = active.reduce(
    (sum, order) => sum + paidOf(order),
    0
  );

  const billed = active.reduce(
    (sum, order) => sum + orderTotal(order),
    0
  );

  return {
    totalRevenue: billed,
    salesOrders: active.length,
    averageOrderValue: active.length
      ? billed / active.length
      : 0,

    totalOrders: list.length,
    delivered: delivered.length,
    cancelled: list.filter(isCancelled).length,

    revenue,
    totalCost,
    netProfit: revenue - totalCost,

    costFound,
    unmatchedItems,

    collected,
    due: Math.max(billed - collected, 0),

    refunded: list.reduce(
      (sum, order) =>
        sum + n(order?.refundAmount ?? order?.refunded),
      0
    ),

    shipped: list.filter(isShipped).length,
    returned: list.filter(isReturned).length,
  };
}

function filterByDate(list, from, to) {
  if (!from || !to) return list;

  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T23:59:59.999`).getTime();

  return list.filter((order) => {
    const raw =
      order?.createdAt ??
      order?.orderDate ??
      order?.date;

    if (!raw) return true;

    const time = new Date(raw).getTime();

    return Number.isNaN(time) || (time >= start && time <= end);
  });
}

/* =========================================================
   IMAGE HELPERS
========================================================= */

const IMAGE_KEY =
  /(image|img|photo|thumbnail|thumb|avatar|picture|logo|cover)/i;

const IMAGE_URL =
  /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;

const HIDDEN_KEYS = new Set([
  "__v",
  "password",
  "token",
  "createdAt",
  "updatedAt",
]);

function toImageUrls(value) {
  const out = [];

  const visit = (item) => {
    if (!item) return;

    if (typeof item === "string") {
      let src = item.trim();

      if (!src) return;

      if (src.startsWith("//")) {
        src = `https:${src}`;
      } else if (src.startsWith("/")) {
        src = `${API_BASE}${src}`;
      } else if (
        src.startsWith("http://") &&
        !src.includes("localhost")
      ) {
        src = src.replace("http://", "https://");
      } else if (!/^(https?:|data:|blob:)/i.test(src)) {
        src = `${API_BASE}/${src.replace(/^\.?\//, "")}`;
      }

      out.push(src);
    } else if (Array.isArray(item)) {
      item.forEach(visit);
    } else if (typeof item === "object") {
      visit(
        item.secure_url ||
          item.url ||
          item.src ||
          item.path ||
          item.image ||
          item.location
      );
    }
  };

  visit(value);

  return out;
}

const looksLikeImage = (key, value) => {
  if (IMAGE_KEY.test(key)) {
    return toImageUrls(value).length > 0;
  }

  if (typeof value === "string") {
    return IMAGE_URL.test(value);
  }

  if (Array.isArray(value) && value.length) {
    return value.every(
      (item) =>
        typeof item === "string" && IMAGE_URL.test(item)
    );
  }

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
      {shown.map((src, index) =>
        failed[index] ? (
          <span
            key={src + index}
            className="ag-thumb-fallback"
          >
            <ImageOff size={18} />
          </span>
        ) : (
          <img
            key={src + index}
            src={src}
            alt=""
            className="ag-thumb"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() =>
              setFailed((previous) => ({
                ...previous,
                [index]: true,
              }))
            }
          />
        )
      )}

      {urls.length > 2 && (
        <span className="ag-thumb-more">
          +{urls.length - 2}
        </span>
      )}
    </div>
  );
}

/* =========================================================
   CELL FORMATTING
========================================================= */

const MONEY_KEY =
  /(price|amount|total|revenue|profit|cost|paid|due|balance|salary|charge|fee|sales)/i;

const DATE_KEY = /(date|createdat|updatedat|at$)/i;
const STATUS_KEY = /status/i;

const badgeTone = (value) => {
  const status = String(value).toLowerCase();

  if (
    /(deliver|complete|paid|success|active|confirm|approved|in stock)/.test(
      status
    )
  ) {
    return "green";
  }

  if (
    /(cancel|fail|return|rto|reject|refund|out of stock|inactive)/.test(
      status
    )
  ) {
    return "red";
  }

  if (/(pending|process|hold|partial|low|wait)/.test(status)) {
    return "amber";
  }

  if (/(ship|transit|courier|dispatch)/.test(status)) {
    return "blue";
  }

  return "gray";
};

function Cell({ column, value }) {
  if (value == null || value === "") return <>—</>;

  if (looksLikeImage(column, value)) {
    return <Thumb value={value} />;
  }

  if (STATUS_KEY.test(column) && typeof value === "string") {
    return (
      <span className={`ag-badge ag-badge-${badgeTone(value)}`}>
        {value}
      </span>
    );
  }

  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return (
        <>
          {value.length} item{value.length === 1 ? "" : "s"}
        </>
      );
    }

    return (
      <>
        {value.name ||
          value.orderId ||
          value.title ||
          value._id ||
          JSON.stringify(value)}
      </>
    );
  }

  if (typeof value === "number" && MONEY_KEY.test(column)) {
    return (
      <span className="ag-cell-num">{money(value)}</span>
    );
  }

  if (
    typeof value === "string" &&
    DATE_KEY.test(column) &&
    !Number.isNaN(Date.parse(value))
  ) {
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

  if (typeof value === "number") {
    return (
      <span className="ag-cell-num">{number(value)}</span>
    );
  }

  return <>{String(value)}</>;
}

/* =========================================================
   CSV EXPORT
========================================================= */

function downloadCSV(filename, rows) {
  if (!rows?.length) return;

  const columns = [
    ...new Set(
      rows.flatMap((row) => Object.keys(row || {}))
    ),
  ];

  const escapeCSV = (value) => {
    const raw =
      value == null
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

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
  link.click();

  URL.revokeObjectURL(url);
}

/* =========================================================
   UI COMPONENTS
========================================================= */

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

function Table({
  rows,
  loading,
  emptyText = "No report records found.",
}) {
  const columns = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    const keys = [
      ...new Set(
        list
          .slice(0, 100)
          .flatMap((row) => Object.keys(row || {}))
      ),
    ].filter(
      (key) =>
        key !== "_id" &&
        key !== "id" &&
        !HIDDEN_KEYS.has(key)
    );

    const sample = (key) =>
      list.find((row) => row?.[key] != null)?.[key];

    const imageColumns = keys.filter((key) =>
      looksLikeImage(key, sample(key))
    );

    const rest = keys.filter(
      (key) => !imageColumns.includes(key)
    );

    return [...imageColumns.slice(0, 1), ...rest].slice(0, 8);
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
    return <EmptyState>{emptyText}</EmptyState>;
  }

  return (
    <div className="ag-report-table-wrap">
      <table className="ag-report-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>
                {column
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (s) => s.toUpperCase())}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={
                row._id ||
                row.id ||
                row.orderId ||
                index
              }
            >
              {columns.map((column) => (
                <td
                  key={column}
                  title={
                    typeof row[column] === "object"
                      ? undefined
                      : String(row[column] ?? "")
                  }
                >
                  <Cell
                    column={column}
                    value={row[column]}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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

  const [costMap, setCostMap] = useState({});
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState("");

  /* =======================================================
     LOAD PRODUCT COSTS
  ======================================================= */

  useEffect(() => {
    if (active !== "profit") return;

    let cancelled = false;

    async function loadProductCosts() {
      setCostLoading(true);
      setCostError("");

      try {
        const response = await fetch(
          new URL(
            REPORT_ENDPOINTS.productCosts,
            API_BASE
          ).toString(),
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            credentials: "include",
          }
        );

        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            json?.message ||
              `Product cost request failed (${response.status})`
          );
        }

        if (json?.success === false) {
          throw new Error(
            json.message || "Could not load product costs."
          );
        }

        const products = asArray(json, [
          "products",
          "items",
          "rows",
          "results",
          "records",
        ]);

        const nextMap = buildCostMap(products);

        if (cancelled) return;

        setCostMap(nextMap);

        if (!products.length) {
          setCostError(
            "Product cost API returned no products. Check the endpoint and response."
          );
        } else if (!Object.keys(nextMap).length) {
          setCostError(
            "Products were returned, but no valid product or variant cost fields were found."
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCostMap({});
          setCostError(
            err?.message || "Could not load product costs."
          );
        }
      } finally {
        if (!cancelled) {
          setCostLoading(false);
        }
      }
    }

    loadProductCosts();

    return () => {
      cancelled = true;
    };
  }, [active, refreshKey]);

  /* =======================================================
     SEARCH DEBOUNCE
  ======================================================= */

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  /* =======================================================
     DATE PRESETS
  ======================================================= */

  useEffect(() => {
    if (period === "custom") return;

    const today = new Date();

    const days = {
      "7": 6,
      "30": 29,
      "90": 89,
      "365": 364,
    }[period] ?? 29;

    setFrom(
      dateInput(
        new Date(today.getTime() - days * 86400000)
      )
    );

    setTo(dateInput(today));
  }, [period]);

  /* =======================================================
     LOAD REPORT
  ======================================================= */

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint = REPORT_ENDPOINTS[active];

      if (!endpoint) {
        throw new Error("Invalid report endpoint.");
      }

      const url = new URL(endpoint, API_BASE);

      if (from) url.searchParams.set("from", from);
      if (to) url.searchParams.set("to", to);

      if (debouncedSearch) {
        url.searchParams.set("search", debouncedSearch);
      }

      // No Authorization header or localStorage token.
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        credentials: "include",
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            `Request failed (${response.status})`
        );
      }

      if (json?.success === false) {
        throw new Error(
          json.message || "Could not load report."
        );
      }

      setPayload(json);
    } catch (err) {
      setPayload(null);
      setError(
        err?.message || "Could not load report data."
      );
    } finally {
      setLoading(false);
    }
  }, [
    active,
    from,
    to,
    debouncedSearch,
    refreshKey,
  ]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const data = unwrap(payload);

  const overviewSummary = Array.isArray(data?.summary)
    ? Object.fromEntries(
        data.summary.map((item) => [
          item.key,
          item.value,
        ])
      )
    : data?.summary || data?.stats || {};

  /* =======================================================
     REPORT ROWS
  ======================================================= */

  const rows = useMemo(() => {
    if (active === "overview") {
      return asArray(payload, [
        "topProducts",
        "activity",
        "orders",
        "rows",
        "recentOrders",
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

  /* =======================================================
     STAT CARDS
  ======================================================= */

  const cards = useMemo(() => {
    const get = (...paths) =>
      pick(
        data,
        paths,
        pick(
          overviewSummary,
          paths.map((path) => path.split(".").at(-1)),
          0
        )
      );

    if (active === "overview") {
      return [
        {
          label: "Total Orders",
          value: number(
            get("totalOrders", "orders", "counts.orders")
          ),
          icon: ShoppingCart,
        },
        {
          label: "Total Sales",
          value: money(
            get(
              "totalSales",
              "sales",
              "revenue",
              "counts.sales"
            )
          ),
          icon: Banknote,
        },
        {
          label: "Total Products",
          value: number(
            get("totalProducts", "items", "products")
          ),
          icon: Package,
        },
        {
          label: "Total Customers",
          value: number(
            get("totalCustomers", "customers")
          ),
          icon: Users,
        },
      ];
    }

    const derived = ORDER_TABS.includes(active)
      ? deriveFromOrders(rows, costMap)
      : null;

    const source = derived || data;

    const definitions = {
      sales: [
        [
          "Total Revenue",
          ["totalRevenue", "totalSales", "sales", "revenue"],
          true,
          Banknote,
        ],
        [
          "Orders",
          ["salesOrders", "totalOrders", "orders", "count"],
          false,
          ShoppingCart,
        ],
        [
          "Average Order",
          ["averageOrderValue", "averageOrder"],
          true,
          Wallet,
        ],
      ],

      orders: [
        [
          "Total Orders",
          ["totalOrders", "total", "count"],
          false,
          ShoppingCart,
        ],
        [
          "Delivered",
          ["delivered", "deliveredOrders"],
          false,
          CheckCircle2,
        ],
        [
          "Cancelled",
          ["cancelled", "cancelledOrders"],
          false,
          XCircle,
        ],
      ],

      profit: [
        [
          "Revenue",
          ["revenue", "totalRevenue", "sales"],
          true,
          Banknote,
        ],
        [
          "Total Cost",
          ["totalCost", "cost"],
          true,
          CreditCard,
        ],
        [
          "Net Profit",
          ["netProfit", "profit"],
          true,
          TrendingUp,
        ],
      ],

      products: [
        [
          "Products",
          ["totalProducts", "total", "count"],
          false,
          Package,
        ],
        [
          "Low Stock",
          ["lowStock", "lowStockCount"],
          false,
          AlertCircle,
        ],
        [
          "Out of Stock",
          ["outOfStock", "outOfStockCount"],
          false,
          XCircle,
        ],
      ],

      customers: [
        [
          "Customers",
          ["totalCustomers", "total", "count"],
          false,
          Users,
        ],
        [
          "New Customers",
          ["newCustomers", "new"],
          false,
          UserRoundCheck,
        ],
        [
          "Repeat Customers",
          ["repeatCustomers", "repeat"],
          false,
          Users,
        ],
      ],

      employees: [
        [
          "Employees",
          ["totalEmployees", "total", "count"],
          false,
          UserRoundCheck,
        ],
        [
          "Completed Orders",
          ["completedOrders", "delivered"],
          false,
          CheckCircle2,
        ],
        [
          "Pending Orders",
          ["pendingOrders", "pending"],
          false,
          ShoppingCart,
        ],
      ],

      payments: [
        [
          "Collected",
          ["collected", "totalPaid", "paidAmount"],
          true,
          Banknote,
        ],
        [
          "Due",
          ["due", "totalDue", "unpaidAmount"],
          true,
          Wallet,
        ],
        [
          "Refunded",
          ["refunded", "refundAmount"],
          true,
          CreditCard,
        ],
      ],

      courier: [
        [
          "Shipped",
          ["shipped", "shippedOrders"],
          false,
          Truck,
        ],
        [
          "Delivered",
          ["delivered", "deliveredOrders"],
          false,
          CheckCircle2,
        ],
        [
          "Returned / RTO",
          ["returned", "rto", "returnedOrders"],
          false,
          XCircle,
        ],
      ],
    };

    return (definitions[active] || []).map(
      ([label, paths, isMoney, icon]) => {
        let hint;

        if (active === "profit" && derived) {
          if (label === "Revenue") {
            hint = "Delivered orders only";
          }

          if (label === "Total Cost") {
            if (costLoading) {
              hint = "Loading product costs…";
            } else if (costError) {
              hint = costError;
            } else if (derived.unmatchedItems > 0) {
              hint = `${derived.unmatchedItems} order item(s) unmatched · ${
                Object.keys(costMap).length
              } cost keys loaded`;
            } else if (
              !derived.costFound &&
              derived.delivered > 0
            ) {
              hint =
                "No delivered order item costs matched · " +
                `${Object.keys(costMap).length} cost keys loaded`;
            } else if (derived.delivered === 0) {
              hint = "No delivered orders in the selected report";
            } else {
              hint =
                "Calculated using product costPrice × quantity";
            }
          }

          if (
            label === "Net Profit" &&
            (derived.unmatchedItems > 0 ||
              (derived.delivered > 0 && !derived.costFound))
          ) {
            hint =
              "May be inaccurate because some product costs are missing";
          }
        }

        return {
          label,
          value: isMoney
            ? money(pick(source, paths, 0))
            : number(pick(source, paths, 0)),
          icon,
          hint,
        };
      }
    );
  }, [
    data,
    overviewSummary,
    active,
    rows,
    costMap,
    costLoading,
    costError,
  ]);

  /* =======================================================
     EXPORT DATA
  ======================================================= */

  const exportRows = rows.length
    ? rows
    : data && typeof data === "object"
      ? [data]
      : [];

  const activeLabel =
    REPORTS.find((report) => report.id === active)?.label ||
    "Report";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="ag-report-page">
      <header className="ag-report-header">
        <div>
          <div className="ag-report-eyebrow">
            APPLE GADGETS · ANALYTICS
          </div>

          <h1>Reports &amp; Analytics</h1>

          <p>
            Track sales, orders, products, customers and
            business performance.
          </p>
        </div>

        <button
          className="ag-report-button ag-report-button-dark"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading || costLoading}
        >
          <RefreshCw
            size={16}
            className={
              loading || costLoading ? "ag-spin" : ""
            }
          />
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
              className={`ag-report-period-btn ${
                period === item.value ? "is-active" : ""
              }`}
              onClick={() => setPeriod(item.value)}
            >
              {item.label}
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
            onChange={(event) => {
              setFrom(event.target.value);
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
            onChange={(event) => {
              setTo(event.target.value);
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
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Order, product, customer…"
          />
        </label>

        <button
          className="ag-report-button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
        >
          <Filter size={16} /> Apply filters
        </button>

        <button
          className="ag-report-button"
          onClick={() =>
            downloadCSV(
              `apple-gadgets-${active}-${dateInput(
                new Date()
              )}.csv`,
              exportRows
            )
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
            className={`ag-report-tab ${
              active === id ? "is-active" : ""
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="ag-report-error">
          <AlertCircle size={18} />

          <div>
            <strong>
              Could not load {activeLabel.toLowerCase()}
            </strong>

            <p>{error}</p>

            <small>
              Check the backend route, CORS configuration,
              and whether the endpoint allows requests
              without an Authorization header.
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
              {active === "overview"
                ? "Recent Activity & Top Products"
                : `${activeLabel} Details`}
            </h2>

            <p>Filtered report data from your backend</p>
          </div>

          <button
            className="ag-report-button ag-report-button-small"
            onClick={() =>
              downloadCSV(
                `apple-gadgets-${active}.csv`,
                exportRows
              )
            }
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
        Reports are calculated from the connected backend.
        Revenue and profit depend on the returned orders and
        available product cost prices.
      </p>
    </main>
  );
}
