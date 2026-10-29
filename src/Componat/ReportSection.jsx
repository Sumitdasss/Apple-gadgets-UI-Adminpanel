"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Download,
  FileSpreadsheet,
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
const getAdminToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};
const token = getAdminToken()
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

const PERIODS = [
  { value: "7", label: "৭ দিন", days: 6 },
  { value: "30", label: "৩০ দিন", days: 29 },
  { value: "90", label: "৯০ দিন", days: 89 },
  { value: "365", label: "১ বছর", days: 364 },
  { value: "custom", label: "কাস্টম" },
];

const ORDER_TABS = ["sales", "orders", "profit", "payments", "courier"];
const PAGE_SIZE = 25;

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

const str = (value) => (typeof value === "string" ? value.trim() : "");

const getId = (value) => {
  if (value == null) return "";
  if (typeof value === "object") {
    return String(value._id ?? value.$oid ?? value.id ?? "");
  }
  return String(value);
};

/* ---------- ID hiding helpers (IDs are never shown in the UI) ---------- */

const MONGO_ID = /^[a-f0-9]{24}$/i;

/** true for keys like _id, id, orderId, productId, customerId, user_id ... */
const isIdKey = (key) =>
  /^(_id|id|__v)$/i.test(key) || /(Id|ID|Ids|_id)$/.test(key);

/** returns a human-readable reference, or "" if the value looks like a DB id */
const cleanRef = (value) => {
  if (value == null) return "";
  const s = String(value).trim();
  return s && !MONGO_ID.test(s) ? s : "";
};

const dateInput = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtDate = (raw) => {
  if (!raw || Number.isNaN(Date.parse(raw))) return "—";
  return new Date(raw).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
    if (!result || typeof result !== "object" || Array.isArray(result)) break;
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
    if (!node || typeof node !== "object" || depth > 6 || seen.has(node)) return null;
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
    headers: { Accept: "application/json",Authorization: `Bearer ${token}` },
    credentials: "include",
    signal,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || `Request failed with status ${response.status}`);
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
  const fields = ["costPrice", "purchasePrice", "buyingPrice", "buyPrice", "unitCost", "cost"];
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
      for (const id of [product._id, product.id, product.productId, product.product]) {
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
  if (!item || typeof item !== "object") return { cost: null, found: false };
  const lookup = (type, value) => {
    const key = norm(getId(value) || value);
    if (!key) return null;
    const mapKey = `${type}:${key}`;
    return costMap.has(mapKey) ? { cost: costMap.get(mapKey), found: true } : null;
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
  const nameMatch = lookup("name", item.name ?? item.productName ?? item.product?.name);
  if (nameMatch) return nameMatch;
  const populatedCost = productCost(item.product);
  if (populatedCost !== null) return { cost: populatedCost, found: true };
  const variantCost = productCost(item.variant);
  if (variantCost !== null) return { cost: variantCost, found: true };
  const directCost = productCost(item);
  if (directCost !== null) return { cost: directCost, found: true };
  return { cost: null, found: false };
}

function orderCost(order, costMap) {
  const directFields = ["totalCost", "totalPurchasePrice", "purchaseCost"];
  for (const field of directFields) {
    const value = order?.[field];
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return { value: parsed, found: true, unmatchedItems: 0 };
    }
  }
  const items = itemsOf(order);
  if (items.length === 0) return { value: 0, found: false, unmatchedItems: 0 };
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

const statusOf = (order) => norm(order?.status ?? order?.orderStatus);
const isDelivered = (order) => /deliver|complete/.test(statusOf(order));
const isCancelled = (order) => /cancel/.test(statusOf(order));
const isReturned = (order) => /return|rto/.test(statusOf(order));
const isShipped = (order) =>
  /courier|ship|transit|dispatch|handed_over|picked_up/.test(
    `${statusOf(order)} ${norm(order?.deliveryStatus)} ${norm(order?.courierDetails?.courierStatus)}`
  );

const orderTotal = (order) =>
  n(order?.totalAmount ?? order?.grandTotal ?? order?.total ?? order?.amount);

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

  const paymentStatus = norm(order?.paymentStatus ?? order?.payment_status);
  if (/paid|success/.test(paymentStatus) && !/unpaid|partial/.test(paymentStatus)) {
    return orderTotal(order);
  }

  // COD assumption: delivered = fully paid
  return isDelivered(order) ? orderTotal(order) : 0;
}

/** Derive payment status when API doesn't send paymentStatus */
function paymentStatusOf(order) {
  const direct = str(order?.paymentStatus ?? order?.payment_status);
  if (direct) return direct;

  if (isCancelled(order) || isReturned(order)) return "cancelled";

  const paid = paidOf(order);
  const total = orderTotal(order);

  if (paid <= 0) return "unpaid";
  if (paid < total) return "partial";
  return "paid";
}

const STATUS_META = [
  { key: "pending", label: "Pending", tone: "amber" },
  { key: "processing", label: "Processing", tone: "violet" },
  { key: "shipped", label: "Shipped", tone: "blue" },
  { key: "delivered", label: "Delivered", tone: "green" },
  { key: "cancelled", label: "Cancelled", tone: "red" },
  { key: "returned", label: "Returned", tone: "gray" },
];

function statusGroup(order) {
  if (isCancelled(order)) return "cancelled";
  if (isReturned(order)) return "returned";
  if (isDelivered(order)) return "delivered";
  if (isShipped(order)) return "shipped";
  if (/process|confirm|packag|ready|approv/.test(statusOf(order))) return "processing";
  return "pending";
}

const toneOfGroup = (group) =>
  STATUS_META.find((item) => item.key === group)?.tone ?? "gray";

function paymentTone(value) {
  const s = norm(value);
  if (!s) return "gray";
  if (/unpaid|fail|due|cancel/.test(s)) return "red";
  if (/partial|pending|advance/.test(s)) return "amber";
  if (/paid|success|complete/.test(s)) return "green";
  return "gray";
}

function itemsOf(order) {
  const items = order?.products ?? order?.items ?? order?.orderItems ?? order?.cart ?? [];
  return Array.isArray(items) ? items : [];
}

function itemImage(item) {
  if (!item || typeof item !== "object") return "";
  const candidates = [
    item.image,
    item.images,
    item.thumbnail,
    item.photo,
    item.img,
    item.variant?.image,
    item.variant?.images,
    item.product?.images,
    item.product?.image,
    item.product?.thumbnail,
  ];
  for (const candidate of candidates) {
    const urls = imageUrls(candidate);
    if (urls.length) return urls[0];
  }
  return "";
}

function itemName(item) {
  return (
    str(item?.name) ||
    str(item?.productName) ||
    str(item?.title) ||
    str(item?.product?.name) ||
    str(item?.product?.title) ||
    "Product"
  );
}

/** Human-readable order number only — never a database id */
function orderRef(order) {
  return (
    cleanRef(order?.orderNumber) ||
    cleanRef(order?.invoiceNumber) ||
    cleanRef(order?.orderId) ||
    ""
  );
}

function customerOf(order) {
  const c = order?.customer && typeof order.customer === "object" ? order.customer : {};
  const ship = order?.shippingAddress ?? order?.address ?? {};
  const name =
    str(order?.customerName) ||
    str(c.name) ||
    str(ship.name) ||
    str(order?.name) ||
    str(order?.fullName) ||
    "Guest";
  const phone =
    str(order?.customerPhone) ||
    str(order?.phone) ||
    str(c.phone) ||
    str(ship.phone) ||
    "";
  return { name, phone };
}

function deriveFromOrders(rows, costMap) {
  const list = Array.isArray(rows) ? rows : [];
  const delivered = list.filter(isDelivered);
  const active = list.filter((order) => !isCancelled(order) && !isReturned(order));
  const revenue = delivered.reduce((sum, order) => sum + orderTotal(order), 0);
  const costResults = delivered.map((order) => orderCost(order, costMap));
  const totalCost = costResults.reduce((sum, result) => sum + result.value, 0);
  const unmatchedItems = costResults.reduce((sum, result) => sum + result.unmatchedItems, 0);
  const costFound = delivered.length > 0 && costResults.every((result) => result.found);
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
    refunded: list.reduce((sum, order) => sum + n(order.refundAmount ?? order.refunded), 0),
    shipped: list.filter(isShipped).length,
    returned: list.filter(isReturned).length,
  };
}

function filterByDate(list, from, to) {
  const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
  const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
  return list.filter((order) => {
    const raw = order.createdAt ?? order.orderDate ?? order.date;
    if (!raw) return !from && !to;
    const time = new Date(raw).getTime();
    return Number.isFinite(time) && time >= start && time <= end;
  });
}

/* =========================================================
   PRODUCT HELPERS
========================================================= */

const textOf = (value) => {
  if (value == null) return "";
  if (typeof value === "object") {
    return str(value.name) || str(value.title) || str(value.label) || "";
  }
  return String(value).trim();
};

function productImageOf(product) {
  if (!product || typeof product !== "object") return "";
  const candidates = [
    product.image,
    product.images,
    product.thumbnail,
    product.photo,
    product.img,
    product.picture,
    product.cover,
  ];
  if (Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      candidates.push(variant?.image, variant?.images);
    }
  }
  for (const candidate of candidates) {
    const urls = imageUrls(candidate);
    if (urls.length) return urls[0];
  }
  return "";
}

function productTitle(product) {
  return (
    str(product?.name) ||
    str(product?.title) ||
    str(product?.productName) ||
    "Untitled product"
  );
}

function productStock(product) {
  const direct =
    product?.stock ?? product?.quantity ?? product?.countInStock ?? product?.totalStock;
  if (direct !== undefined && direct !== null && direct !== "") return n(direct);
  if (Array.isArray(product?.variants) && product.variants.length) {
    const hasStock = product.variants.some(
      (v) => v?.stock !== undefined || v?.quantity !== undefined
    );
    if (hasStock) {
      return product.variants.reduce((sum, v) => sum + n(v?.stock ?? v?.quantity), 0);
    }
  }
  return null;
}

function productPrice(product) {
  const value = pick(
    product,
    ["price", "sellingPrice", "salePrice", "offerPrice", "regularPrice"],
    null
  );
  if (value !== null) return n(value);
  if (Array.isArray(product?.variants) && product.variants.length) {
    const prices = product.variants
      .map((v) => pick(v, ["price", "sellingPrice", "salePrice"], null))
      .filter((p) => p !== null)
      .map(n);
    if (prices.length) return Math.min(...prices);
  }
  return null;
}

/* =========================================================
   CSV EXPORT
========================================================= */

function downloadCSV(filename, rows) {
  if (!Array.isArray(rows) || !rows.length) return;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row ?? {})))].filter(
    (key) => !HIDDEN_KEYS.has(key) && !isIdKey(key)
  );
  const escapeCSV = (value) => {
    let raw =
      value == null
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
    if (/^[\s]*[=+\-@]/.test(raw)) raw = `'${raw}`;
    return `"${raw.replace(/"/g, '""')}"`;
  };
  const csv = [
    columns.map(escapeCSV).join(","),
    ...rows.map((row) => columns.map((key) => escapeCSV(row[key])).join(",")),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
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
   SMALL UI PIECES (Tailwind)
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
      if (/^(https?:\/\/|data:image\/|blob:)/i.test(src)) result.push(src);
      else if (src.startsWith("//")) result.push(`https:${src}`);
    } else if (Array.isArray(item)) {
      item.forEach(visit);
    } else if (typeof item === "object") {
      visit(item.secure_url ?? item.url ?? item.src ?? item.image);
    }
  };
  visit(value);
  return [...new Set(result)];
}

const badgeTones = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

const dotTones = {
  gray: "bg-slate-400",
  red: "bg-red-500",
  amber: "bg-amber-400",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
};

const cardTones = [
  "bg-blue-50 text-blue-600",
  "bg-emerald-50 text-emerald-600",
  "bg-violet-50 text-violet-600",
  "bg-amber-50 text-amber-600",
];

function Badge({ tone = "gray", children }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${badgeTones[tone] || badgeTones.gray}`}
    >
      {children}
    </span>
  );
}

function Thumb({ src, size = "md", alt = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const sizeClass =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const iconSize = size === "sm" ? 14 : size === "lg" ? 22 : 18;
  if (!src || failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200 ${sizeClass}`}
      >
        <ImageOff size={iconSize} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`shrink-0 rounded-xl bg-white object-cover ring-1 ring-slate-200 ${sizeClass}`}
      onError={() => setFailed(true)}
    />
  );
}

function Cell({ column, value }) {
  if (value == null || value === "") return <span className="text-slate-400">—</span>;
  if (IMAGE_KEY.test(column)) {
    const urls = imageUrls(value);
    if (urls.length) {
      return (
        <div className="flex items-center gap-1">
          {urls.slice(0, 3).map((src) => (
            <Thumb key={src} src={src} />
          ))}
        </div>
      );
    }
    return <Thumb src="" />;
  }
  if (typeof value === "number" && MONEY_KEY.test(column)) {
    return <span className="font-medium tabular-nums">{money(value)}</span>;
  }
  if (DATE_KEY.test(column) && !Number.isNaN(Date.parse(value))) {
    return <>{fmtDate(value)}</>;
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) return <>{value.length} items</>;
    // Never fall back to _id — IDs must not be shown
    const label =
      cleanRef(value.name) ||
      cleanRef(value.productName) ||
      cleanRef(value.title) ||
      cleanRef(value.orderNumber) ||
      "";
    return label ? <>{label}</> : <span className="text-slate-400">—</span>;
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
    return <Badge tone={tone}>{String(value)}</Badge>;
  }
  return <>{String(value)}</>;
}

function TableState({ loading, empty, emptyText }) {
  if (loading) {
    return (
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-center gap-2 pb-2 text-sm text-slate-500">
          <LoaderCircle className="animate-spin" size={18} />
          Loading report data…
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex animate-pulse items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-slate-100" />
              <div className="h-3 w-1/5 rounded bg-slate-100" />
            </div>
            <div className="h-3 w-16 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
        <span className="rounded-full bg-slate-100 p-3">
          <AlertCircle size={22} />
        </span>
        <span className="text-sm">{emptyText || "No report records found."}</span>
      </div>
    );
  }
  return null;
}

const columnRank = (key) =>
  IMAGE_KEY.test(key) ? 0 : /^(name|title|productName)$/i.test(key) ? 1 : 2;

const prettyHeader = (column) =>
  column.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

const thClass =
  "sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500";

function Table({ rows, loading, emptyText }) {
  const columns = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const keys = [...new Set(list.slice(0, 100).flatMap((row) => Object.keys(row ?? {})))];
    return keys
      .filter((key) => !HIDDEN_KEYS.has(key) && !isIdKey(key))
      .sort((a, b) => columnRank(a) - columnRank(b))
      .slice(0, 8);
  }, [rows]);

  if (loading || !rows?.length) {
    return <TableState loading={loading} empty={!rows?.length} emptyText={emptyText} />;
  }

  return (
    <div className="max-h-[70vh] overflow-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th key={column} className={thClass}>
                {prettyHeader(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row._id ?? row.id ?? index} className="transition hover:bg-slate-50/70">
              {columns.map((column) => (
                <td key={column} className="px-4 py-3 align-middle text-slate-700">
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

/** Dedicated products table: image + name first, no IDs anywhere */
function ProductTable({ rows, loading, emptyText }) {
  if (loading || !rows?.length) {
    return <TableState loading={loading} empty={!rows?.length} emptyText={emptyText} />;
  }

  return (
    <div className="max-h-[70vh] overflow-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className={thClass}>Product</th>
            <th className={thClass}>Category</th>
            <th className={thClass}>Price</th>
            <th className={thClass}>Stock</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Added</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((product, index) => {
            const title = productTitle(product);
            const brand = textOf(product.brand);
            const sku = cleanRef(product.sku);
            const category = textOf(product.category) || textOf(product.categoryName);
            const price = productPrice(product);
            const stock = productStock(product);
            const rawStatus =
              product.status ??
              (typeof product.isActive === "boolean"
                ? product.isActive
                  ? "Active"
                  : "Inactive"
                : "");

            return (
              <tr key={product._id ?? product.id ?? index} className="transition hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb src={productImageOf(product)} alt={title} size="lg" />
                    <div className="min-w-0">
                      <div className="max-w-[260px] truncate font-semibold text-slate-900" title={title}>
                        {title}
                      </div>
                      {(brand || sku) && (
                        <div className="truncate text-xs text-slate-500">
                          {[brand, sku].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{category || "—"}</td>
                <td className="px-4 py-3 font-medium tabular-nums text-slate-900">
                  {price === null ? "—" : money(price)}
                </td>
                <td className="px-4 py-3">
                  {stock === null ? (
                    <span className="text-slate-400">—</span>
                  ) : stock <= 0 ? (
                    <Badge tone="red">Out of stock</Badge>
                  ) : stock <= 5 ? (
                    <Badge tone="amber">Low · {number(stock)}</Badge>
                  ) : (
                    <Badge tone="green">{number(stock)} in stock</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {rawStatus ? (
                    <Badge tone={/inactive|draft|hidden|disable/i.test(String(rawStatus)) ? "gray" : "green"}>
                      {String(rawStatus)}
                    </Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {fmtDate(product.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ItemsCell({ order }) {
  const items = itemsOf(order);
  if (!items.length) return <span className="text-slate-400">—</span>;
  const qty = items.reduce((sum, item) => sum + Math.max(0, n(item?.quantity ?? item?.qty ?? 1)), 0);
  const extra = items.length - 1;
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3">
        {items.slice(0, 3).map((item, index) => (
          <Thumb key={index} src={itemImage(item)} alt={itemName(item)} size="md" />
        ))}
      </div>
      <div className="min-w-0">
        <div className="max-w-[200px] truncate font-medium text-slate-800" title={itemName(items[0])}>
          {itemName(items[0])}
        </div>
        <div className="text-xs text-slate-500">
          {qty} pc{qty === 1 ? "" : "s"}
          {extra > 0 ? ` · +${extra} more` : ""}
        </div>
      </div>
    </div>
  );
}

function orderColumns(tab, costMap) {
  const orderCol = {
    key: "order",
    label: "Order",
    render: (o) => {
      const ref = orderRef(o);
      return (
        <div>
          <div className="font-semibold text-slate-900">{ref ? `#${ref}` : "Order"}</div>
          <div className="text-xs text-slate-500">{fmtDate(o.createdAt ?? o.orderDate ?? o.date)}</div>
        </div>
      );
    },
  };

  const customerCol = {
    key: "customer",
    label: "Customer",
    render: (o) => {
      const { name, phone } = customerOf(o);
      return (
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-semibold text-slate-700">
            {name.charAt(0).toUpperCase() || "G"}
          </span>
          <div className="min-w-0">
            <div className="max-w-[180px] truncate font-medium text-slate-800">{name}</div>
            {phone && <div className="text-xs text-slate-500">{phone}</div>}
          </div>
        </div>
      );
    },
  };

  const itemsCol = {
    key: "items",
    label: "Products",
    render: (o) => <ItemsCell order={o} />,
  };

  const totalCol = {
    key: "total",
    label: "Total",
    render: (o) => <span className="font-semibold tabular-nums text-slate-900">{money(orderTotal(o))}</span>,
  };

  const paymentCol = {
    key: "payment",
    label: "Payment",
    render: (o) => {
      const status = paymentStatusOf(o);
      return <Badge tone={paymentTone(status)}>{status}</Badge>;
    },
  };

  const statusCol = {
    key: "status",
    label: "Status",
    render: (o) => (
      <Badge tone={toneOfGroup(statusGroup(o))}>
        {String(o.status ?? o.orderStatus ?? statusGroup(o))}
      </Badge>
    ),
  };

  if (tab === "profit") {
    return [
      orderCol,
      itemsCol,
      totalCol,
      {
        key: "cost",
        label: "Cost",
        render: (o) => {
          if (!isDelivered(o)) return <span className="text-slate-400">—</span>;
          const c = orderCost(o, costMap);
          return c.found ? (
            <span className="font-medium tabular-nums">{money(c.value)}</span>
          ) : (
            <span className="text-slate-400">N/A</span>
          );
        },
      },
      {
        key: "profit",
        label: "Profit",
        render: (o) => {
          if (!isDelivered(o)) return <span className="text-slate-400">—</span>;
          const c = orderCost(o, costMap);
          if (!c.found) return <span className="text-slate-400">N/A</span>;
          const profit = orderTotal(o) - c.value;
          return (
            <span className={`font-semibold tabular-nums ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {profit >= 0 ? "+" : "−"}
              {money(Math.abs(profit))}
            </span>
          );
        },
      },
      statusCol,
    ];
  }

  if (tab === "payments") {
    return [
      orderCol,
      customerCol,
      totalCol,
      {
        key: "paid",
        label: "Paid",
        render: (o) => <span className="font-medium tabular-nums">{money(paidOf(o))}</span>,
      },
      {
        key: "due",
        label: "Due",
        render: (o) => {
          const due = isCancelled(o) || isReturned(o) ? 0 : Math.max(0, orderTotal(o) - paidOf(o));
          return (
            <span className={`font-medium tabular-nums ${due > 0 ? "text-red-600" : "text-slate-700"}`}>
              {money(due)}
            </span>
          );
        },
      },
      paymentCol,
      statusCol,
    ];
  }

  if (tab === "courier") {
    const cd = (o) => o.courierDetails ?? {};
    return [
      orderCol,
      customerCol,
      {
        key: "courier",
        label: "Courier",
        render: (o) => str(cd(o).courierName) || str(o.courierName) || str(o.courier) || "—",
      },
      {
        key: "tracking",
        label: "Tracking No.",
        render: (o) => {
          const id =
            cleanRef(str(cd(o).trackingId)) ||
            cleanRef(str(cd(o).consignmentId)) ||
            cleanRef(str(o.trackingId)) ||
            cleanRef(str(o.consignmentId));
          return id ? <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{id}</code> : "—";
        },
      },
      {
        key: "courierStatus",
        label: "Courier status",
        render: (o) => {
          const s = str(cd(o).courierStatus) || str(o.deliveryStatus);
          return s ? <Badge tone="blue">{s}</Badge> : "—";
        },
      },
      statusCol,
    ];
  }

  return [orderCol, customerCol, itemsCol, totalCol, paymentCol, statusCol];
}

function OrderTable({ rows, columns, loading, emptyText }) {
  if (loading || !rows?.length) {
    return <TableState loading={loading} empty={!rows?.length} emptyText={emptyText} />;
  }
  return (
    <div className="max-h-[70vh] overflow-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th key={column.key} className={thClass}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((order, index) => (
            <tr key={order._id ?? order.id ?? index} className="transition hover:bg-slate-50/70">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 align-middle text-slate-700">
                  {column.render(order)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, hint, tone }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`rounded-xl p-2.5 ${tone}`}>
          <Icon size={19} />
        </span>
      </div>
      <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function StatusOverview({ counts, total, selected, onSelect }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Order status</h2>
        <p className="text-sm text-slate-500">
          {number(total)} orders in this period · click a status to filter
        </p>
      </div>

      <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        {STATUS_META.map(({ key, tone }) =>
          counts[key] ? (
            <span
              key={key}
              className={`h-full ${dotTones[tone]}`}
              style={{ flexGrow: counts[key] }}
              title={`${key}: ${counts[key]}`}
            />
          ) : null
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            selected === "all"
              ? "bg-slate-900 text-white shadow"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
          onClick={() => onSelect("all")}
        >
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          All <b>{number(total)}</b>
        </button>

        {STATUS_META.map(({ key, label, tone }) => (
          <button
            key={key}
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              selected === key
                ? "bg-slate-900 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => onSelect(selected === key ? "all" : key)}
          >
            <span className={`h-2 w-2 rounded-full ${dotTones[tone]}`} />
            {label} <b>{number(counts[key] ?? 0)}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   MAIN REPORT PAGE
========================================================= */

export default function ReportSection() {
  const [active, setActive] = useState("overview");
  const [period, setPeriod] = useState("30");
  const [from, setFrom] = useState(dateInput(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(dateInput(new Date()));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [payloadCache, setPayloadCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
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
    const days = PERIODS.find((item) => item.value === period)?.days ?? 29;
    const today = new Date();
    setFrom(dateInput(new Date(today.getTime() - days * 86400000)));
    setTo(dateInput(today));
  }, [period]);

  useEffect(() => {
    setStatusFilter("all");
  }, [active]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [active, statusFilter, from, to, debouncedSearch]);

  // Parallel fetch of ALL unique report endpoints + product costs via Promise.all
  useEffect(() => {
    const controller = new AbortController();
    const currentRequest = ++requestId.current;

    async function loadAll() {
      setLoading(true);
      setCostLoading(true);
      setError("");
      setCostError("");

      // Unique endpoints to avoid duplicate network calls
      const uniqueFetches = {
        overview: REPORT_ENDPOINTS.overview,
        allOrders: REPORT_ENDPOINTS.sales, // shared by sales / profit / payments / courier
        orders: REPORT_ENDPOINTS.orders,
        products: REPORT_ENDPOINTS.products,
        customers: REPORT_ENDPOINTS.customers,
        employees: REPORT_ENDPOINTS.employees,
        productCosts: REPORT_ENDPOINTS.productCosts,
      };

      const buildUrl = (endpoint, key) => {
        const url = new URL(endpoint, API_BASE);
        if (key !== "overview" && key !== "productCosts") {
          if (from) url.searchParams.set("from", from);
          if (to) url.searchParams.set("to", to);
        }
        if (debouncedSearch && key !== "productCosts") {
          url.searchParams.set("search", debouncedSearch);
        }
        return url.toString();
      };

      try {
        const entries = Object.entries(uniqueFetches);
        const results = await Promise.all(
          entries.map(async ([key, endpoint]) => {
            try {
              const json = await requestJSON(buildUrl(endpoint, key), controller.signal);
              return [key, json, null];
            } catch (err) {
              if (err.name === "AbortError") throw err;
              return [key, null, err.message || "Request failed"];
            }
          })
        );

        if (currentRequest !== requestId.current || controller.signal.aborted) return;

        const nextCache = {};
        let firstError = "";

        for (const [key, json, errMsg] of results) {
          if (key === "productCosts") {
            if (json) {
              const products = asArray(json, ["products", "items", "rows", "results", "records"]);
              const map = buildCostMap(products);
              setCostMap(map);
              if (!products.length) {
                setCostError("No products returned by product-costs-report.");
              } else if (!map.size) {
                setCostError("Products returned, but no valid cost fields were found.");
              }
            } else {
              setCostMap(new Map());
              setCostError(errMsg || "Could not load product costs.");
            }
            continue;
          }

          if (json) {
            nextCache[key] = json;
          } else if (errMsg && !firstError) {
            firstError = errMsg;
          }
        }

        // Map unique results back to report tabs
        setPayloadCache({
          overview: nextCache.overview ?? null,
          sales: nextCache.allOrders ?? null,
          orders: nextCache.orders ?? null,
          profit: nextCache.allOrders ?? null,
          products: nextCache.products ?? null,
          customers: nextCache.customers ?? null,
          employees: nextCache.employees ?? null,
          payments: nextCache.allOrders ?? null,
          courier: nextCache.allOrders ?? null,
        });

        if (firstError) setError(firstError);
      } catch (err) {
        if (err.name !== "AbortError" && currentRequest === requestId.current) {
          setPayloadCache({});
          setCostMap(new Map());
          setError(err.message || "Could not load reports.");
          setCostError(err.message || "Could not load product costs.");
        }
      } finally {
        if (currentRequest === requestId.current) {
          setLoading(false);
          setCostLoading(false);
        }
      }
    }

    loadAll();
    return () => controller.abort();
  }, [from, to, debouncedSearch, refreshKey]);

  const payload = payloadCache[active] ?? null;
  const isOrderTab = ORDER_TABS.includes(active);

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
      return asArray(payload, ["recentOrders", "activity", "topProducts", "orders", "rows", "items"]);
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
    return isOrderTab ? filterByDate(list, from, to) : list;
  }, [payload, active, from, to, isOrderTab]);

  const statusCounts = useMemo(() => {
    const counts = {};
    if (!isOrderTab) return counts;
    for (const order of rows) {
      const group = statusGroup(order);
      counts[group] = (counts[group] ?? 0) + 1;
    }
    return counts;
  }, [rows, isOrderTab]);

  const visibleRows = useMemo(() => {
    if (!isOrderTab || statusFilter === "all") return rows;
    return rows.filter((order) => statusGroup(order) === statusFilter);
  }, [rows, isOrderTab, statusFilter]);

  const pagedRows = useMemo(() => visibleRows.slice(0, limit), [visibleRows, limit]);

  const columns = useMemo(
    () => (isOrderTab ? orderColumns(active, costMap) : []),
    [active, isOrderTab, costMap]
  );

  const summary = useMemo(() => {
    if (Array.isArray(data?.summary)) {
      return Object.fromEntries(data.summary.map((item) => [item.key, item.value]));
    }
    return data?.summary ?? data?.stats ?? {};
  }, [data]);

  const cards = useMemo(() => {
    const derived = isOrderTab ? deriveFromOrders(rows, costMap) : null;
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

    return (definitions[active] ?? []).map(([label, paths, isMoney, icon], index) => {
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
          value = null;
        }
      }

      return {
        label,
        value: value === null ? "Unavailable" : isMoney ? money(value) : number(value),
        icon,
        hint,
        tone: cardTones[index % cardTones.length],
      };
    });
  }, [active, isOrderTab, rows, costMap, costLoading, costError, data, summary]);

  const activeLabel = REPORTS.find((item) => item.id === active)?.label ?? "Report";

  const exportRows = visibleRows.length
    ? visibleRows
    : data && typeof data === "object" && !Array.isArray(data) && !isOrderTab
      ? [data]
      : [];

  const refresh = () => setRefreshKey((value) => value + 1);

  const exportCurrent = () =>
    downloadCSV(`apple-gadgets-${active}-${dateInput(new Date())}.csv`, exportRows);

  const rangeLabel =
    active === "overview" ? "All time" : `${fmtDate(from)} → ${fmtDate(to)}`;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Hero */}
        <header className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl md:flex-row md:items-center md:justify-between md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative">
            <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
              APPLE GADGETS · ANALYTICS
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Reports & Analytics</h1>
            <p className="mt-1 max-w-xl text-slate-300">
              Track sales, orders, products, customers and business performance.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm ring-1 ring-white/15">
              <CalendarDays size={14} /> {rangeLabel}
            </div>
          </div>

          <div className="relative flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow transition hover:bg-slate-100 disabled:opacity-50"
              onClick={exportCurrent}
              disabled={!payload || loading || !exportRows.length}
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
              onClick={refresh}
              disabled={loading || costLoading}
            >
              <RefreshCw size={16} className={loading || costLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </header>

        {/* Tabs */}
        <nav
          className="mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
          aria-label="Report types"
        >
          {REPORTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                active === id
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              aria-current={active === id ? "page" : undefined}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        {/* Filters */}
        <section className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Period">
            {PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  period === item.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setPeriod(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={14} /> From
            </span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPeriod("custom");
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={14} /> To
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
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Search size={14} /> Search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order, product, customer…"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </section>

        {error && (
          <div
            className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"
            role="alert"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <strong>Could not load {activeLabel.toLowerCase()}</strong>
              <p className="mt-0.5 text-sm">{error}</p>
              <small className="text-red-600">
                Verify the backend route, response format, CORS and authentication.
              </small>
            </div>
          </div>
        )}

        {/* Stats */}
        <section className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </section>

        {/* Order status */}
        {isOrderTab && !loading && rows.length > 0 && (
          <div className="mb-5">
            <StatusOverview
              counts={statusCounts}
              total={rows.length}
              selected={statusFilter}
              onSelect={setStatusFilter}
            />
          </div>
        )}

        {/* Data panel */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {active === "overview" ? "Recent Activity & Top Products" : `${activeLabel} Details`}
              </h2>
              <p className="text-sm text-slate-500">
                {loading
                  ? "Loading…"
                  : `${number(visibleRows.length)} record${visibleRows.length === 1 ? "" : "s"}${
                      statusFilter !== "all" ? ` · ${statusFilter}` : ""
                    } · filtered report data from your backend`}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              onClick={exportCurrent}
              disabled={!payload || loading || !exportRows.length}
            >
              <FileSpreadsheet size={16} /> Export
            </button>
          </div>

          {isOrderTab ? (
            <OrderTable
              rows={pagedRows}
              columns={columns}
              loading={loading}
              emptyText="No orders match these filters."
            />
          ) : active === "products" ? (
            <ProductTable
              rows={pagedRows}
              loading={loading}
              emptyText="No products returned for these filters."
            />
          ) : (
            <Table
              rows={pagedRows}
              loading={loading}
              emptyText={
                active === "overview"
                  ? "No activity or top-product data was returned."
                  : "No records returned for these filters."
              }
            />
          )}

          {!loading && visibleRows.length > pagedRows.length && (
            <div className="border-t border-slate-100 p-4 text-center">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => setLimit((value) => value + PAGE_SIZE)}
              >
                <ChevronDown size={16} /> Show more ({number(visibleRows.length - pagedRows.length)} remaining)
              </button>
            </div>
          )}
        </section>

        <p className="mt-4 text-center text-xs text-slate-400">
          Reports use the data returned by your backend. Profit is only reliable when delivered order
          totals and product purchase costs are available.
        </p>
      </div>
    </main>
  );
}
