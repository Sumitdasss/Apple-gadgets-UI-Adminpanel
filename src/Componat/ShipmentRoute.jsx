import React from "react";
import { Package, MapPin, Phone, Store, Truck, ArrowRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Pickup location — এখানে তোমার আসল দোকান/ওয়্যারহাউসের তথ্য বসাও        */
/* ------------------------------------------------------------------ */
export const PICKUP_LOCATION = {
  name: "Apple Gadgets",
  phone: "01XXXXXXXXX",
  address: "Shop address, Area, City",
};

const money = (v) => `৳${Number(v ?? 0).toLocaleString("en-BD")}`;

const productInfo = (item) => {
  const populated =
    item?.product && typeof item.product === "object" && !Array.isArray(item.product)
      ? item.product
      : null;
  return {
    name: item?.name || populated?.name || "Product unavailable",
    price: item?.price ?? populated?.price ?? 0,
    quantity: item?.quantity ?? 1,
    image: item?.image || populated?.images?.[0] || "",
    variant: [item?.color, item?.ram, item?.storage].filter(Boolean).join(" / "),
  };
};

const OrderRoute = ({ order, carrier }) => {
  const products = Array.isArray(order?.products) ? order.products : [];
  const customerName = order?.customerName || order?.customer?.name || "—";
  const phone = order?.phone || order?.customer?.phone || "—";
  const address = order?.deliveryAddress || order?.address || "—";
  const totalQty = products.reduce((s, p) => s + Number(p?.quantity ?? 1), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-bold text-slate-900">
          #{order?.orderId || order?._id || "—"}
        </p>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {totalQty} item · {money(order?.totalAmount)}
        </span>
      </div>

      {/* Products */}
      <ul className="space-y-2">
        {products.length === 0 && (
          <li className="text-xs text-slate-400">No products found.</li>
        )}
        {products.map((item, i) => {
          const p = productInfo(item);
          return (
            <li key={item?._id || i} className="flex items-center gap-3">
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
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
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500">
                  Qty {p.quantity} · {money(p.price)}
                  {p.variant ? ` · ${p.variant}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* From -> To */}
      <div className="mt-4 grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-xl bg-amber-50/70 p-3 ring-1 ring-amber-100">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <Store size={12} /> Pickup From
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{PICKUP_LOCATION.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Phone size={11} /> {PICKUP_LOCATION.phone}
          </p>
          <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
            <MapPin size={11} className="mt-0.5 shrink-0" />
            <span className="break-words">{PICKUP_LOCATION.address}</span>
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
          <ArrowRight size={18} className="hidden sm:block" />
          <ArrowRight size={18} className="rotate-90 sm:hidden" />
          {carrier && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              <Truck size={10} />
              <span className="max-w-24 truncate">{carrier}</span>
            </span>
          )}
        </div>

        <div className="rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-100">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <MapPin size={12} /> Deliver To
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{customerName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Phone size={11} /> {phone}
          </p>
          <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
            <MapPin size={11} className="mt-0.5 shrink-0" />
            <span className="break-words">{address}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * orders  : array of order objects (1 or many)
 * carrier : optional label shown on the arrow (rider / courier name)
 */
export default function ShipmentRoute({ orders = [], carrier = "" }) {
  if (!orders.length) return null;
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Shipment Summary
      </p>
      <div className="max-h-[46vh] space-y-3 overflow-y-auto pr-1">
        {orders.map((o) => (
          <OrderRoute key={o?._id || o?.id || o?.orderId} order={o} carrier={carrier} />
        ))}
      </div>
    </div>
  );
}
