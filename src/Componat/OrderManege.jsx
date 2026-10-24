import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
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
  UserPlus,
  Users,
  Search,
  Eye,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "./invoice-print.css";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

const ORDERS_API = `${API_BASE}/api/dashboard/order`;
const BULK_API = `${API_BASE}/api/dashboard/bulk-update`;
const SINGLE_ORDER_API = `${API_BASE}/api/dashboard/orders`;
const ASSIGN_API = `${API_BASE}/api/dashboard/assignOrder`;
const REASSIGN_API = `${API_BASE}/api/dashboard/reassignOrder`;
const EMPLOYEES_API = `${API_BASE}/api/dashboard/getEmployees`;

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

const DELIVERY_STATUSES = [
  "unassigned",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "returned",
  "cancelled",
];

const SOURCES = ["website", "facebook_messenger", "admin"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const getOrderId = (order) => {
  if (order?._id) return String(order._id);
  if (order?.id) return String(order.id);
  if (order?.orderId) return String(order.orderId);
  return "";
};

const getProductInfo = (item) => {
  const populated =
    item?.product &&
    typeof item.product === "object" &&
    !Array.isArray(item.product)
      ? item.product
      : null;

  return {
    name: item?.name || populated?.name || "Product unavailable",
    price: item?.price ?? populated?.price ?? 0,
    quantity: item?.quantity ?? 1,
    image: item?.image || populated?.images?.[0] || "",
    color: item?.color || "",
    ram: item?.ram || "",
    storage: item?.storage || "",
  };
};

const formatMoney = (value) => `৳${Number(value ?? 0).toLocaleString("en-BD")}`;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-BD");
};

const formatShortDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return {
    day: date.toLocaleDateString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-BD", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const humanize = (value) =>
  String(value || "Not available")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatStatus = (status = "") =>
  String(status).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const STATUS_CLASSES = {
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

const DELIVERY_CLASSES = {
  unassigned: "bg-slate-100 text-slate-600 border-slate-200",
  assigned: "bg-blue-50 text-blue-700 border-blue-200",
  picked_up: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_transit: "bg-cyan-50 text-cyan-700 border-cyan-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-orange-50 text-orange-700 border-orange-200",
  returned: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const FALLBACK_CLASS = "bg-slate-50 text-slate-700 border-slate-200";
const getStatusClass = (s) => STATUS_CLASSES[s] || FALLBACK_CLASS;
const getDeliveryStatusClass = (s) => DELIVERY_CLASSES[s] || FALLBACK_CLASS;

const getStatusStyle = (status) => {
  const value = String(status || "pending").toLowerCase();
  if (["delivered", "completed", "paid"].includes(value))
    return {
      className: "bg-green-50 text-green-700 border-green-200",
      icon: CheckCircle2,
    };
  if (["cancelled", "canceled", "returned", "failed"].includes(value))
    return {
      className: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    };
  if (["shipped", "handed_over_to_courier", "ready_for_shipment"].includes(value))
    return { className: "bg-blue-50 text-blue-700 border-blue-200", icon: Truck };
  if (["confirmed", "processing"].includes(value))
    return {
      className: "bg-purple-50 text-purple-700 border-purple-200",
      icon: RefreshCw,
    };
  return {
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock3,
  };
};

/* ---- Employee resolution (the fix) -------------------------------- */

const getEmployeeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return String(value._id || value.id || "");
  return "";
};

const getEmployeeName = (emp) =>
  emp?.name ||
  emp?.fullName ||
  emp?.username ||
  emp?.email ||
  (emp?._id ? `Employee …${String(emp._id).slice(-5)}` : "Unknown employee");

/**
 * The list API may return assignedEmployee as a populated object OR as a bare
 * ID string. Handle both, and fall back to the employees list for the name.
 */
const resolveAssignedEmployee = (order, employeeMap) => {
  const raw =
    order?.assignedEmployee ??
    order?.assignedTo ??
    order?.employee ??
    order?.assignedEmployeeId ??
    null;
  if (!raw) return null;

  if (typeof raw === "object" && (raw.name || raw.fullName || raw.username)) {
    return raw;
  }
  const id = getEmployeeId(raw);
  if (!id) return null;
  return employeeMap.get(id) || (typeof raw === "object" ? raw : { _id: id });
};

const getInitials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];
const avatarColor = (seed = "") => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

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
    throw new Error(
      "Backend server-এর সঙ্গে সংযোগ হচ্ছে না। Server চালু আছে কি না দেখো।"
    );
  }

  const text = await response.text();
  let result = {};
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      result = { message: text };
    }
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
        result.error ||
        `API request failed with status ${response.status}`
    );
  }
  return result;
}

function useDebounced(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

const Avatar = ({ name, size = "h-9 w-9", text = "text-xs" }) => (
  <div
    className={`flex ${size} shrink-0 items-center justify-center rounded-full font-bold ${text} ${avatarColor(
      name
    )}`}
  >
    {getInitials(name)}
  </div>
);

const StatusBadge = ({ status }) => {
  const style = getStatusStyle(status);
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${style.className}`}
    >
      <Icon size={14} />
      {humanize(status)}
    </span>
  );
};

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 py-2.5">
    {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />}
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">
        {value === undefined || value === null || value === ""
          ? "Not available"
          : String(value)}
      </p>
    </div>
  </div>
);

const SectionCard = ({ title, icon: Icon, children }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
    <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/60">
        <Icon size={16} className="text-slate-600" />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
    </div>
    <div className="px-5 py-4">{children}</div>
  </section>
);

const StatCard = ({ label, value, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-50 text-slate-900",
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <div className={`rounded-xl px-4 py-2.5 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
        {label}
      </p>
      <p className="text-lg font-extrabold leading-tight">{value}</p>
    </div>
  );
};

const AssigneeCell = ({ assigned, deliveryStatus }) => {
  if (!assigned) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400">
        <UserRound size={12} />
        Unassigned
      </span>
    );
  }
  const name = getEmployeeName(assigned);
  return (
    <div className="flex items-start gap-2.5">
      <Avatar name={name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
        {(assigned.phone || assigned.email) && (
          <p className="truncate text-xs text-slate-500">
            {assigned.phone || assigned.email}
          </p>
        )}
        <span
          className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getDeliveryStatusClass(
            deliveryStatus
          )}`}
        >
          {formatStatus(deliveryStatus)}
        </span>
      </div>
    </div>
  );
};

const ActionBtn = ({ icon: Icon, label, onClick, tone, disabled }) => {
  const tones = {
    slate: "text-slate-600 hover:bg-slate-100",
    emerald: "text-emerald-600 hover:bg-emerald-50",
    indigo: "text-indigo-600 hover:bg-indigo-50",
    red: "text-red-500 hover:bg-red-50",
  };
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-2 transition disabled:opacity-40 ${tones[tone]}`}
    >
      <Icon size={16} />
    </button>
  );
};

/* ---- Memoized table row -------------------------------------------- */

const OrderRow = memo(function OrderRow({
  order,
  assigned,
  selected,
  busy,
  onToggle,
  onDetails,
  onAssign,
  onInvoice,
  onDelete,
  onStatusChange,
}) {
  const id = getOrderId(order);
  const products = Array.isArray(order.products) ? order.products : [];
  const delStatus = order.deliveryStatus || (assigned ? "assigned" : "unassigned");
  const date = formatShortDate(order.createdAt);
  const customerName = order.customerName || order.customer?.name || "—";

  return (
    <tr
      className={`align-top transition hover:bg-slate-50/80 ${
        selected ? "bg-blue-50/40" : ""
      }`}
    >
      <td className="p-3.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(id)}
          aria-label={`Select order ${order.orderId || id}`}
          className="h-4 w-4 rounded border-slate-300"
        />
      </td>

      <td className="p-3.5">
        <p className="font-bold text-slate-900">{order.orderId || id || "—"}</p>
        <p className="mt-1 text-xs text-slate-500">
          {formatStatus(order.paymentMethod || "—")}
        </p>
        <span
          className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            order.paymentStatus === "paid"
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {formatStatus(order.paymentStatus || "unpaid")}
        </span>
      </td>

      <td className="max-w-52 p-3.5">
        <p className="font-semibold text-slate-800">{customerName}</p>
        <p className="text-xs text-slate-500">
          {order.phone || order.customer?.phone || "—"}
        </p>
        {order.email && (
          <p className="break-all text-xs text-slate-400">{order.email}</p>
        )}
        <p className="mt-1 line-clamp-2 break-words text-xs text-slate-500">
          {order.deliveryAddress || "—"}
        </p>
      </td>

      <td className="max-w-64 p-3.5">
        {products.length ? (
          <ul className="space-y-2.5">
            {products.map((item, index) => {
              const product = getProductInfo(item);
              return (
                <li
                  key={item._id || item.product?._id || index}
                  className="flex gap-2.5"
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Package size={16} className="text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-2 break-words text-sm font-medium text-slate-800">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Qty {product.quantity} · {formatMoney(product.price)}
                    </p>
                    {(product.color || product.ram || product.storage) && (
                      <p className="text-[11px] text-slate-400">
                        {[product.color, product.ram, product.storage]
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

      <td className="p-3.5">
        <p className="text-base font-extrabold text-slate-900">
          {formatMoney(order.totalAmount)}
        </p>
        {Number(order.subTotal) > 0 && (
          <p className="text-xs text-slate-500">
            Subtotal {formatMoney(order.subTotal)}
          </p>
        )}
        {Number(order.discountAmount) > 0 && (
          <p className="text-xs text-emerald-600">
            −{formatMoney(order.discountAmount)} discount
          </p>
        )}
        {Number(order.deliveryCharge) > 0 && (
          <p className="text-xs text-slate-500">
            +{formatMoney(order.deliveryCharge)} delivery
          </p>
        )}
      </td>

      <td className="p-3.5">
        <AssigneeCell assigned={assigned} deliveryStatus={delStatus} />
      </td>

      <td className="p-3.5">
        <p className="text-sm font-medium text-slate-800">
          {order.courierDetails?.provider || "—"}
        </p>
        {order.courierDetails?.trackingCode && (
          <p className="mt-0.5 text-xs text-slate-500">
            #{order.courierDetails.trackingCode}
          </p>
        )}
        <span className="mt-1 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
          {formatStatus(order.source || "—")}
        </span>
      </td>

      <td className="p-3.5">
        <select
          value={order.status || "pending"}
          disabled={busy}
          onChange={(e) => onStatusChange(id, e.target.value)}
          aria-label={`Update status for ${order.orderId || id}`}
          className={`max-w-44 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold outline-none disabled:opacity-50 ${getStatusClass(
            order.status || "pending"
          )}`}
        >
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {formatStatus(item)}
            </option>
          ))}
        </select>
      </td>

      <td className="whitespace-nowrap p-3.5 text-xs text-slate-500">
        {date === "—" ? (
          "—"
        ) : (
          <>
            <p className="font-medium text-slate-700">{date.day}</p>
            <p>{date.time}</p>
          </>
        )}
      </td>

      <td className="p-3.5">
        <div className="flex items-center gap-0.5">
          <ActionBtn icon={Eye} label="Details" tone="slate" onClick={() => onDetails(order)} />
          <ActionBtn
            icon={UserPlus}
            label={assigned ? "Reassign" : "Assign"}
            tone="emerald"
            onClick={() => onAssign([id])}
          />
          <ActionBtn icon={FileText} label="Invoice" tone="indigo" onClick={() => onInvoice(order)} />
          <ActionBtn
            icon={Trash2}
            label="Delete"
            tone="red"
            disabled={busy}
            onClick={() => onDelete(id)}
          />
        </div>
      </td>
    </tr>
  );
});

/* ---- Invoice sheet -------------------------------------------------- */

const InvoiceSheet = memo(function InvoiceSheet({ order }) {
  const products = Array.isArray(order.products) ? order.products : [];
  const subtotal =
    order.subTotal ??
    products.reduce((sum, item) => {
      const p = getProductInfo(item);
      return sum + Number(p.price) * Number(p.quantity);
    }, 0);

  return (
    <article className="invoice-sheet mx-auto max-w-3xl border border-slate-200 p-5 sm:p-8">
      <header className="flex flex-wrap justify-between gap-4 border-b-2 border-slate-900 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-wide">APPLE GADGETS</h1>
          <p className="mt-1 text-sm text-slate-500">Customer Invoice</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">INVOICE</h2>
          <p className="mt-2 text-sm">Order ID: {order.orderId || getOrderId(order)}</p>
          <p className="mt-1 text-sm">Date: {formatDate(order.createdAt)}</p>
          <p className="mt-1 text-sm">
            Status: {formatStatus(order.status || "pending")}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 py-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Bill To
          </h3>
          <p className="font-semibold">
            {order.customerName || order.customer?.name || "—"}
          </p>
          <p className="mt-1 text-sm">
            Phone: {order.phone || order.customer?.phone || "—"}
          </p>
          {order.email && (
            <p className="mt-1 break-all text-sm">Email: {order.email}</p>
          )}
          <p className="mt-2 text-sm">Address: {order.deliveryAddress || "—"}</p>
        </div>
        <div className="sm:text-right">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Payment Information
          </h3>
          <p className="text-sm">
            Method: {formatStatus(order.paymentMethod || "—")}
          </p>
          <p className="mt-1 text-sm">
            Payment status: {formatStatus(order.paymentStatus || "unpaid")}
          </p>
          <p className="mt-1 text-sm">
            Source: {formatStatus(order.source || "website")}
          </p>
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
              const p = getProductInfo(item);
              return (
                <tr key={item._id || index} className="border-b">
                  <td className="p-3">
                    <p className="font-medium">{p.name}</p>
                    {(p.color || p.ram || p.storage) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {[p.color, p.ram, p.storage].filter(Boolean).join(" / ")}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-center">{p.quantity}</td>
                  <td className="p-3 text-right">{formatMoney(p.price)}</td>
                  <td className="p-3 text-right font-medium">
                    {formatMoney(Number(p.price) * Number(p.quantity))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ml-auto mt-6 max-w-sm space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        {Number(order.discountAmount) > 0 && (
          <div className="flex justify-between gap-4 text-green-700">
            <span>Discount</span>
            <span>-{formatMoney(order.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span>Delivery Charge</span>
          <span>{formatMoney(order.deliveryCharge)}</span>
        </div>
        <div className="flex justify-between gap-4 border-t-2 border-slate-900 pt-3 text-lg font-black">
          <span>Grand Total</span>
          <span>{formatMoney(order.totalAmount)}</span>
        </div>
      </div>

      <footer className="mt-10 border-t pt-5 text-center text-sm text-slate-500">
        <p className="font-semibold text-slate-800">
          Thank you for shopping with Apple Gadgets!
        </p>
        <p className="mt-1">Please keep this invoice for your records.</p>
      </footer>
    </article>
  );
});

const inputCls =
  "rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20";

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function OrderManege() {
  const [orders, setOrders] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showInvoices, setShowInvoices] = useState(false);
  const [invoiceOrders, setInvoiceOrders] = useState([]);

  const [showDetails, setShowDetails] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [allEmployees, setAllEmployees] = useState([]);
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetIds, setAssignTargetIds] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [courierInput, setCourierInput] = useState("");
  const search = useDebounced(searchInput.trim());
  const courierProvider = useDebounced(courierInput.trim());
  const [status, setStatus] = useState("all");
  const [deliveryStatus, setDeliveryStatus] = useState("all");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const requestRef = useRef(0);

  /* ---- Employees ---- */

  useEffect(() => {
    (async () => {
      try {
        const result = await apiRequest(EMPLOYEES_API);
        setAllEmployees(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        console.error("Failed to load employees:", err);
      }
    })();
  }, []);

  // id -> employee, used to resolve names when API returns only an ID
  const employeeMap = useMemo(() => {
    const map = new Map();
    allEmployees.forEach((e) => {
      const id = getEmployeeId(e);
      if (id) map.set(id, e);
    });
    return map;
  }, [allEmployees]);

  const activeEmployees = useMemo(
    () => allEmployees.filter((e) => e.role === "employee" && e.isActive !== false),
    [allEmployees]
  );

  /* ---- Orders ---- */

  const loadOrders = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (deliveryStatus !== "all") params.set("deliveryStatus", deliveryStatus);
      if (courierProvider) params.set("courierProvider", courierProvider);
      if (source) params.set("source", source);

      const result = await apiRequest(`${ORDERS_API}?${params.toString()}`);
      if (requestId !== requestRef.current) return; // stale response

      const rows = Array.isArray(result.data) ? result.data : [];
      const total = Number(result.pagination?.total ?? 0);
      const pages = Math.max(
        1,
        Number(result.pagination?.pages ?? (Math.ceil(total / PAGE_SIZE) || 1))
      );

      setOrders(rows);
      setPagination({ total, pages });
      const visible = new Set(rows.map(getOrderId));
      setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(err.message || "অর্ডার লোড করা যায়নি।");
      setOrders([]);
      setPagination({ total: 0, pages: 1 });
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [page, search, status, deliveryStatus, courierProvider, source]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const ordersById = useMemo(
    () => new Map(orders.map((o) => [getOrderId(o), o])),
    [orders]
  );
  const visibleIds = useMemo(() => orders.map(getOrderId).filter(Boolean), [orders]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));

  const pageStats = useMemo(() => {
    let assigned = 0;
    orders.forEach((o) => {
      if (resolveAssignedEmployee(o, employeeMap)) assigned += 1;
    });
    return { assigned, unassigned: orders.length - assigned };
  }, [orders, employeeMap]);

  /* ---- Selection ---- */

  const toggleSelect = useCallback((id) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = () =>
    setSelectedIds((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])]
    );

  /* ---- Details ---- */

  const fetchDetails = useCallback(async (id) => {
    setDetailsLoading(true);
    try {
      const result = await apiRequest(
        `${SINGLE_ORDER_API}/${encodeURIComponent(id)}`
      );
      const data =
        result?.data?.order ??
        result?.data?.data ??
        result?.data ??
        result?.order ??
        result;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        setDetailsOrder(data);
      }
    } catch {
      // list data is already shown
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const openOrderDetails = useCallback(
    (order) => {
      const id = getOrderId(order);
      if (!id) return;
      setShowDetails(true);
      setDetailsOrder(order);
      setError("");
      fetchDetails(id);
    },
    [fetchDetails]
  );

  const closeOrderDetails = () => {
    setShowDetails(false);
    setDetailsOrder(null);
    setDetailsLoading(false);
  };

  const detailsIndex = useMemo(() => {
    if (!detailsOrder) return -1;
    const currentId = getOrderId(detailsOrder);
    return orders.findIndex((o) => getOrderId(o) === currentId);
  }, [detailsOrder, orders]);

  const goToAdjacentDetails = (direction) => {
    if (detailsIndex < 0) return;
    const next = direction === "previous" ? detailsIndex - 1 : detailsIndex + 1;
    if (next < 0 || next >= orders.length) return;
    openOrderDetails(orders[next]);
  };

  /* ---- Assign ---- */

  const openAssignModal = useCallback((orderIds) => {
    if (!orderIds?.length) {
      setError("প্রথমে অন্তত একটি অর্ডার নির্বাচন করো।");
      return;
    }
    setAssignTargetIds(orderIds);
    setAssignEmployeeId("");
    setAssignNote("");
    setShowAssignModal(true);
    setError("");
  }, []);

  const handleAssign = async () => {
    if (!assignEmployeeId) {
      setError("একজন employee নির্বাচন করো।");
      return;
    }
    if (!assignTargetIds.length) return;

    setBusy(true);
    setError("");
    setNotice("");

    const results = await Promise.allSettled(
      assignTargetIds.map((orderId) => {
        const existing = ordersById.get(orderId);
        const alreadyAssigned = existing
          ? Boolean(resolveAssignedEmployee(existing, employeeMap))
          : false;
        const url = alreadyAssigned
          ? `${REASSIGN_API}/${encodeURIComponent(orderId)}`
          : ASSIGN_API;
        return apiRequest(url, {
          method: alreadyAssigned ? "PATCH" : "POST",
          body: JSON.stringify({
            orderId: String(orderId).trim(),
            employeeId: assignEmployeeId,
            note: assignNote.trim(),
          }),
        });
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.find((r) => r.status === "rejected");
    const lastError = failed?.reason?.message || "";

    if (successCount > 0) {
      setNotice(
        `${successCount} টি অর্ডার সফলভাবে assign করা হয়েছে।${
          lastError ? ` কিছু অর্ডারে সমস্যা: ${lastError}` : ""
        }`
      );
      setShowAssignModal(false);
      setSelectedIds([]);
      const targets = assignTargetIds;
      setAssignTargetIds([]);
      await loadOrders();
      if (detailsOrder && targets.includes(getOrderId(detailsOrder))) {
        fetchDetails(getOrderId(detailsOrder));
      }
    } else {
      setError(lastError || "Assign করা যায়নি।");
    }
    setBusy(false);
  };

  /* ---- Invoices ---- */

  const openSelectedInvoices = () => {
    const selected = orders.filter((o) => selectedSet.has(getOrderId(o)));
    if (!selected.length) {
      setError("প্রথমে অন্তত একটি অর্ডার নির্বাচন করো।");
      return;
    }
    setInvoiceOrders(selected);
    setShowInvoices(true);
    setError("");
  };

  const openSingleInvoice = useCallback((order) => {
    setInvoiceOrders([order]);
    setShowInvoices(true);
    setError("");
  }, []);

  /* ---- Updates ---- */

  const updateSingleOrder = useCallback(
    async (id, newStatus) => {
      if (!id || !newStatus) return;
      setBusy(true);
      setError("");
      setNotice("");
      try {
        await apiRequest(`${SINGLE_ORDER_API}/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify({ status: newStatus }),
        });
        setNotice("অর্ডারের স্ট্যাটাস আপডেট হয়েছে।");
        // optimistic local update instead of re-fetching the whole page
        setOrders((prev) =>
          prev.map((o) => (getOrderId(o) === id ? { ...o, status: newStatus } : o))
        );
        setDetailsOrder((prev) =>
          prev && getOrderId(prev) === id ? { ...prev, status: newStatus } : prev
        );
      } catch (err) {
        setError(err.message || "স্ট্যাটাস আপডেট করা যায়নি।");
      } finally {
        setBusy(false);
      }
    },
    []
  );

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
      setError("এই update field সমর্থিত নয়।");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest(BULK_API, {
        method: "PATCH",
        body: JSON.stringify({ orderIds: selectedIds, [field]: cleanValue }),
      });
      setNotice(result.message || "অর্ডারগুলো আপডেট হয়েছে।");
      setSelectedIds([]);
      await loadOrders();
    } catch (err) {
      setError(err.message || "Bulk update করা যায়নি।");
    } finally {
      setBusy(false);
    }
  };

  const deleteOrder = useCallback(
    async (id) => {
      if (!id) return;
      if (!window.confirm("তুমি কি এই অর্ডারটি ডিলিট করতে চাও?")) return;

      setBusy(true);
      setError("");
      setNotice("");
      try {
        const result = await apiRequest(
          `${SINGLE_ORDER_API}/${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );
        setNotice(result.message || "অর্ডার ডিলিট হয়েছে।");
        setSelectedIds((prev) => prev.filter((x) => x !== id));
        if (detailsOrder && getOrderId(detailsOrder) === id) closeOrderDetails();
        if (orders.length === 1 && page > 1) setPage((p) => p - 1);
        else await loadOrders();
      } catch (err) {
        setError(err.message || "অর্ডার ডিলিট করা যায়নি।");
      } finally {
        setBusy(false);
      }
    },
    [detailsOrder, orders.length, page, loadOrders]
  );

  const changeFilter = (setter, value) => {
    setter(value);
    setPage(1);
    setSelectedIds([]);
    setError("");
    setNotice("");
  };

  /* ---- Derived details ---- */

  const d = detailsOrder;
  const dProducts = Array.isArray(d?.products) ? d.products : [];
  const dCustomer = d?.customer && typeof d.customer === "object" ? d.customer : {};
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
    d?.grandTotal ??
      d?.finalAmount ??
      d?.total ??
      d?.totalAmount ??
      dSubtotal + dDelivery - dDiscount
  );
  const dCourier =
    d?.courierDetails?.provider ?? d?.courier ?? d?.courierName ?? d?.courierProvider;
  const dTracking =
    d?.courierDetails?.trackingCode ??
    d?.trackingNumber ??
    d?.trackingId ??
    d?.consignmentId;

  const dAssignedEmployee = d ? resolveAssignedEmployee(d, employeeMap) : null;
  const dAssignedByEmployee = d?.assignedBy
    ? typeof d.assignedBy === "object"
      ? d.assignedBy
      : employeeMap.get(String(d.assignedBy)) || null
    : null;
  const dDeliveryStatus =
    d?.deliveryStatus || (dAssignedEmployee ? "assigned" : "unassigned");

  const hasPrev = detailsIndex > 0;
  const hasNext = detailsIndex >= 0 && detailsIndex < orders.length - 1;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100/80 p-4 text-slate-800 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Order Management
              </h1>
              <p className="text-sm font-medium text-slate-500">
                অর্ডার, assign ও delivery এক জায়গায়
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatCard label="Total orders" value={pagination.total} />
            <StatCard label="Assigned (page)" value={pageStats.assigned} tone="emerald" />
            <StatCard label="Unassigned (page)" value={pageStats.unassigned} tone="blue" />
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading || busy}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700 shadow-sm"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 font-bold hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50/90 p-4 text-sm text-green-700 shadow-sm"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="rounded-lg p-1 font-bold hover:bg-green-100"
              aria-label="Dismiss notice"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filters */}
        <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
                setSelectedIds([]);
              }}
              placeholder="Order ID, customer, phone..."
              className={`${inputCls} w-full min-w-0 pl-9`}
            />
          </div>
          <select
            value={status}
            onChange={(e) => changeFilter(setStatus, e.target.value)}
            className={inputCls}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {formatStatus(item)}
              </option>
            ))}
          </select>
          <select
            value={deliveryStatus}
            onChange={(e) => changeFilter(setDeliveryStatus, e.target.value)}
            className={inputCls}
          >
            <option value="all">All delivery status</option>
            {DELIVERY_STATUSES.map((item) => (
              <option key={item} value={item}>
                {formatStatus(item)}
              </option>
            ))}
          </select>
          <input
            value={courierInput}
            onChange={(e) => {
              setCourierInput(e.target.value);
              setPage(1);
              setSelectedIds([]);
            }}
            placeholder="Courier provider"
            className={inputCls}
          />
          <select
            value={source}
            onChange={(e) => changeFilter(setSource, e.target.value)}
            className={inputCls}
          >
            <option value="">All sources</option>
            {SOURCES.map((item) => (
              <option key={item} value={item}>
                {formatStatus(item)}
              </option>
            ))}
          </select>
        </section>

        {/* Bulk actions */}
        <section
          className={`sticky top-2 z-20 flex flex-col gap-3 rounded-2xl border p-3.5 shadow-sm transition sm:flex-row sm:flex-wrap sm:items-center ${
            selectedIds.length
              ? "border-blue-200 bg-blue-50/95 backdrop-blur"
              : "border-slate-200/80 bg-white"
          }`}
        >
          <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
            Selected: {selectedIds.length}
          </span>

          <button
            type="button"
            onClick={() => openAssignModal(selectedIds)}
            disabled={loading || busy || selectedIds.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus size={16} />
            Assign
          </button>

          <button
            type="button"
            onClick={openSelectedInvoices}
            disabled={loading || busy || selectedIds.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText size={16} />
            Invoices
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
            className={`${inputCls} disabled:opacity-50`}
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
            onSubmit={(e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget).get("courier")?.toString().trim();
              if (value) bulkUpdate("courierProvider", value);
              else setError("Courier name লিখো।");
            }}
          >
            <input
              name="courier"
              placeholder="Courier name"
              disabled={busy || !selectedIds.length}
              className={`${inputCls} min-w-0 disabled:opacity-50`}
            />
            <button
              type="submit"
              disabled={busy || !selectedIds.length}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              Update Courier
            </button>
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
            <select
              name="source"
              defaultValue=""
              disabled={busy || !selectedIds.length}
              className={`${inputCls} disabled:opacity-50`}
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Update Source
            </button>
          </form>
        </section>

        {/* Orders table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100/95 text-[11px] uppercase tracking-wider text-slate-500 backdrop-blur">
                <tr>
                  <th className="w-10 p-3.5">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all visible orders"
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="p-3.5 font-semibold">Order</th>
                  <th className="p-3.5 font-semibold">Customer</th>
                  <th className="p-3.5 font-semibold">Products</th>
                  <th className="p-3.5 font-semibold">Amount</th>
                  <th className="p-3.5 font-semibold">Assigned To</th>
                  <th className="p-3.5 font-semibold">Courier / Source</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold">Date</th>
                  <th className="p-3.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-14 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw size={28} className="animate-spin text-slate-400" />
                        <span className="text-sm font-medium">অর্ডার লোড হচ্ছে...</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-14 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <Package size={32} className="text-slate-300" />
                        <span className="text-sm font-medium">কোনো অর্ডার পাওয়া যায়নি।</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const id = getOrderId(order);
                    return (
                      <OrderRow
                        key={id}
                        order={order}
                        assigned={resolveAssignedEmployee(order, employeeMap)}
                        selected={selectedSet.has(id)}
                        busy={busy}
                        onToggle={toggleSelect}
                        onDetails={openOrderDetails}
                        onAssign={openAssignModal}
                        onInvoice={openSingleInvoice}
                        onDelete={deleteOrder}
                        onStatusChange={updateSingleOrder}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-slate-500">
              Total: {pagination.total} · Page {page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading || busy}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pagination.pages || loading || busy}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </section>
      </div>

      {/* ========== ASSIGN MODAL ========== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !busy && setShowAssignModal(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/60">
            <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 shadow-sm">
                    <Users size={20} className="text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Assign Order</h3>
                    <p className="text-sm text-slate-500">
                      {assignTargetIds.length} order(s) selected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !busy && setShowAssignModal(false)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Select Employee *
                </label>
                <select
                  value={assignEmployeeId}
                  onChange={(e) => setAssignEmployeeId(e.target.value)}
                  disabled={busy}
                  className={`${inputCls} w-full`}
                >
                  <option value="">-- Choose employee --</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {getEmployeeName(emp)}
                      {emp.phone ? ` (${emp.phone})` : ""}
                      {emp.stats?.currentlyAssigned
                        ? ` · ${emp.stats.currentlyAssigned} active`
                        : ""}
                    </option>
                  ))}
                </select>
                {activeEmployees.length === 0 && (
                  <p className="mt-1.5 text-xs font-medium text-amber-600">
                    কোনো active employee পাওয়া যায়নি।
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Note (optional)
                </label>
                <textarea
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  disabled={busy}
                  rows={3}
                  placeholder="Any special instruction..."
                  className={`${inputCls} w-full`}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  disabled={busy}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={busy || !assignEmployeeId}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy ? "Assigning..." : "Assign Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== ORDER DETAILS PANEL ========== */}
      {showDetails && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={closeOrderDetails}
          />

          <aside className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-slate-50 shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                    <Receipt size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900">Order Details</h2>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {d?.orderId ?? d?._id ?? "—"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeOrderDetails}
                  className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!hasPrev || detailsLoading}
                  onClick={() => goToAdjacentDetails("previous")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowLeft size={15} />
                  Previous Order
                </button>
                <span className="shrink-0 px-2 text-xs font-medium text-slate-400">
                  {detailsIndex >= 0 ? `${detailsIndex + 1} / ${orders.length}` : "—"}
                </span>
                <button
                  type="button"
                  disabled={!hasNext || detailsLoading}
                  onClick={() => goToAdjacentDetails("next")}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Next Order
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {detailsLoading && !d ? (
                <div className="flex flex-col items-center justify-center py-28">
                  <RefreshCw className="animate-spin text-slate-400" size={28} />
                  <p className="mt-4 text-sm font-medium text-slate-500">
                    Loading order details...
                  </p>
                </div>
              ) : !d ? (
                <div className="flex flex-col items-center justify-center py-28">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                    <Package size={28} className="text-slate-400" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-500">Order not found.</p>
                </div>
              ) : (
                <div className={`space-y-5 transition ${detailsLoading ? "opacity-70" : ""}`}>
                  {/* Hero */}
                  <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl shadow-slate-900/20">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
                    <div className="relative flex flex-wrap items-start justify-between gap-5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Order Number
                        </p>
                        <h3 className="mt-1.5 break-all text-2xl font-black tracking-tight">
                          {d.orderId ?? d._id}
                        </h3>
                        <div className="mt-4 flex flex-wrap items-center gap-2.5">
                          <StatusBadge status={dStatus} />
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300 backdrop-blur-sm">
                            <CalendarDays size={12} />
                            {formatDate(d.createdAt ?? d.orderDate)}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/10 px-6 py-4 text-right ring-1 ring-white/10 backdrop-blur-md">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Grand Total
                        </p>
                        <p className="mt-1 text-3xl font-black tracking-tight">
                          {formatMoney(dTotal)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {dProducts.length} product type{dProducts.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Assignment */}
                  <SectionCard title="Assignment" icon={UserPlus}>
                    <div className="space-y-3">
                      {dAssignedEmployee ? (
                        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/60 p-3.5 ring-1 ring-emerald-100">
                          <Avatar
                            name={getEmployeeName(dAssignedEmployee)}
                            size="h-12 w-12"
                            text="text-sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700/70">
                              Assigned Employee
                            </p>
                            <p className="truncate text-base font-bold text-slate-900">
                              {getEmployeeName(dAssignedEmployee)}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {[dAssignedEmployee.phone, dAssignedEmployee.email]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${getDeliveryStatusClass(
                              dDeliveryStatus
                            )}`}
                          >
                            {formatStatus(dDeliveryStatus)}
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm font-medium text-slate-400">
                          এখনো কোনো employee assign করা হয়নি
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-2">
                        <InfoRow
                          label="Assigned At"
                          value={formatDate(d?.assignedAt)}
                          icon={CalendarDays}
                        />
                        <InfoRow
                          label="Assigned By"
                          value={
                            dAssignedByEmployee
                              ? getEmployeeName(dAssignedByEmployee)
                              : "—"
                          }
                          icon={UserRound}
                        />
                      </div>

                      {d?.deliveryNote && (
                        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          <span className="font-semibold">Note: </span>
                          {d.deliveryNote}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openAssignModal([getOrderId(d)])}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <UserPlus size={16} />
                        {dAssignedEmployee ? "Reassign Employee" : "Assign Employee"}
                      </button>
                    </div>
                  </SectionCard>

                  {/* Customer */}
                  <SectionCard title="Customer Information" icon={UserRound}>
                    <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-2">
                      <InfoRow label="Customer Name" value={dCustomerName} icon={UserRound} />
                      <InfoRow label="Phone Number" value={dPhone} icon={Phone} />
                      <InfoRow label="Email Address" value={dEmail} icon={Mail} />
                      <InfoRow
                        label="Customer ID"
                        value={
                          typeof d.customer === "object" ? d.customer?._id : d.customerId
                        }
                        icon={Hash}
                      />
                    </div>
                  </SectionCard>

                  {/* Delivery */}
                  <SectionCard title="Delivery Information" icon={Truck}>
                    <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-2">
                      <InfoRow label="Delivery Address" value={dAddress} icon={MapPin} />
                      <InfoRow label="Division" value={d.division ?? d.selectDivision} />
                      <InfoRow label="District" value={d.district ?? d.selectDistrict} />
                      <InfoRow
                        label="Area / Upazila"
                        value={d.selectArea ?? d.upazila ?? d.area}
                      />
                      <InfoRow label="Courier" value={dCourier} icon={Truck} />
                      <InfoRow label="Tracking Number" value={dTracking} icon={Hash} />
                    </div>
                    {d.notes && (
                      <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 ring-1 ring-amber-200/60">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700/80">
                          📝 Order Notes
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">{d.notes}</p>
                      </div>
                    )}
                  </SectionCard>

                  {/* Products */}
                  <SectionCard title="Ordered Products" icon={ShoppingBag}>
                    {dProducts.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                          <Package size={26} className="text-slate-400" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-500">
                          No product items found.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dProducts.map((product, index) => {
                          const info = getProductInfo(product);
                          const qty = Number(info.quantity || 1);
                          const price = Number(info.price || 0);
                          const lineTotal = Number(
                            product.subtotal ?? product.total ?? price * qty
                          );
                          return (
                            <div
                              key={product._id ?? product.productId ?? index}
                              className="group flex flex-col gap-3.5 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50/80 to-white p-4 transition hover:border-slate-200 hover:shadow-md sm:flex-row sm:items-center"
                            >
                              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
                                {info.image ? (
                                  <img
                                    src={info.image}
                                    alt={info.name}
                                    className="h-full w-full object-contain p-1.5 transition group-hover:scale-105"
                                    loading="lazy"
                                  />
                                ) : (
                                  <Package size={26} className="text-slate-300" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-[15px] font-bold leading-snug text-slate-900">
                                  {info.name}
                                </h4>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {[info.color, info.ram, info.storage]
                                    .filter(Boolean)
                                    .map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/80"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                </div>
                                <p className="mt-2 text-xs font-medium text-slate-400">
                                  {formatMoney(price)}
                                  <span className="mx-1.5 text-slate-300">×</span>
                                  {qty}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end sm:pl-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Item Total
                                </p>
                                <p className="mt-0.5 text-lg font-black text-slate-900">
                                  {formatMoney(lineTotal)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </SectionCard>

                  {/* Payment */}
                  <SectionCard title="Payment Information" icon={CreditCard}>
                    <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-2">
                      <InfoRow
                        label="Payment Method"
                        value={humanize(dPaymentMethod)}
                        icon={CreditCard}
                      />
                      <InfoRow label="Payment Status" value={humanize(dPaymentStatus)} />
                      <InfoRow
                        label="Transaction ID"
                        value={
                          d.transactionId ?? d.paymentTransactionId ?? d.payment?.transactionId
                        }
                        icon={Hash}
                      />
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200/60">
                      <div className="divide-y divide-slate-200/70 px-4 py-1">
                        <div className="flex justify-between gap-3 py-3 text-sm">
                          <span className="text-slate-500">Subtotal</span>
                          <span className="font-semibold text-slate-800">
                            {formatMoney(dSubtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 py-3 text-sm">
                          <span className="text-slate-500">Delivery Charge</span>
                          <span className="font-semibold text-slate-800">
                            {formatMoney(dDelivery)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 py-3 text-sm">
                          <span className="text-slate-500">Discount</span>
                          <span className="font-semibold text-emerald-600">
                            −{formatMoney(dDiscount)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3.5 text-white">
                        <span className="text-sm font-bold">Grand Total</span>
                        <span className="text-xl font-black tracking-tight">
                          {formatMoney(dTotal)}
                        </span>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Order info */}
                  <SectionCard title="Order Information" icon={Package}>
                    <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-2">
                      <InfoRow label="Order ID" value={d.orderId ?? d._id} icon={Hash} />
                      <InfoRow
                        label="Order Source"
                        value={humanize(d.orderSource ?? d.source)}
                      />
                      <InfoRow
                        label="Created At"
                        value={formatDate(d.createdAt ?? d.orderDate)}
                        icon={CalendarDays}
                      />
                      <InfoRow
                        label="Last Updated"
                        value={formatDate(d.updatedAt)}
                        icon={CalendarDays}
                      />
                      <InfoRow
                        label="Shipping Status"
                        value={humanize(
                          d.shippingStatus ?? d.shipmentStatus ?? d.courierStatus
                        )}
                        icon={Truck}
                      />
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ========== INVOICE MODAL ========== */}
      {showInvoices && (
        <div className="invoice-modal fixed inset-0 z-[100] overflow-y-auto bg-slate-900/70 p-3 sm:p-6">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow-2xl sm:p-8">
            <div className="invoice-controls mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Invoice Preview</h2>
                <p className="text-sm text-slate-500">{invoiceOrders.length} invoice(s)</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => invoiceOrders.length && window.print()}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoices(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="invoice-list space-y-8">
              {invoiceOrders.map((order) => (
                <InvoiceSheet key={getOrderId(order)} order={order} />
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
