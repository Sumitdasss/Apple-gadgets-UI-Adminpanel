import React, { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* IP -> Location (Auto load)                                         */
/* ------------------------------------------------------------------ */

const getOrderIp = (order) =>
  order?.ipAddress ||
  order?.ip ||
  order?.clientIp ||
  order?.customerIp ||
  order?.meta?.ip ||
  "";

// Admin / Shop লোকেশন (Maps origin)
const ADMIN_ORIGIN =
  "Keraniganj, Konakhola, Basta Radha Krishna Mondir, Dhaka, Bangladesh";

/**
 * অর্ডার খোলার সাথে সাথেই IP থেকে লোকেশন লোড করে দেখায়
 * অর্ডারের selectArea থাকলে সেটা প্রাধান্য পায়
 */
export function IpLocationCheck({ order }) {
  const ip = getOrderIp(order);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");

  // অর্ডারের delivery area (যেমন: Dhaka > Dhaka > Gulshan)
  const orderArea =
    order?.selectArea ||
    order?.deliveryArea ||
    order?.area ||
    [
      order?.division || order?.selectDivision,
      order?.district || order?.selectDistrict,
      order?.upazila || order?.area,
    ]
      .filter(Boolean)
      .join(" > ") ||
    "";

  useEffect(() => {
    setInfo(null);
    setErr("");
  }, [ip]);

  useEffect(() => {
    if (!ip) return;

    let cancelled = false;

    const fetchLocation = async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
        const data = await res.json();

        if (cancelled) return;

        if (!data.success) {
          throw new Error(data.message || "IP লোকেশন পাওয়া যায়নি।");
        }

        setInfo({
          lat: data.latitude,
          lng: data.longitude,
          city: data.city || "",
          region: data.region || "",
          country: data.country || "",
          isp: data.connection?.isp || data.connection?.org || "",
        });
      } catch (e) {
        if (!cancelled) {
          setErr(e.message || "IP চেক করা যায়নি।");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLocation();

    return () => {
      cancelled = true;
    };
  }, [ip]);

  /**
   * Maps-এ যাবে এমন লোকেশন:
   * ১. অর্ডারের selectArea থাকলে সেটা প্রাধান্য
   * ২. না থাকলে IP থেকে city + region + country
   */
  const getMapDestination = () => {
    if (orderArea && orderArea.trim()) {
      // "Dhaka > Gazipur > Tongi" → "Tongi, Gazipur, Dhaka, Bangladesh"
      const parts = orderArea
        .split(">")
        .map((p) => p.trim())
        .filter(Boolean)
        .reverse();

      const areaText = parts.join(", ");
      return `${areaText}, Bangladesh`;
    }

    if (info) {
      const fromIp = [info.city, info.region, info.country]
        .filter(Boolean)
        .join(", ");
      if (fromIp) return fromIp;
    }

    if (info?.lat && info?.lng) {
      return `${info.lat},${info.lng}`;
    }

    return "";
  };

  const openInMaps = () => {
    const destination = getMapDestination();
    if (!destination) return;

    // Shop → Customer area (Directions mode)
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      ADMIN_ORIGIN
    )}&destination=${encodeURIComponent(destination)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // UI-তে দেখানো টেক্সট
  const locationText = (() => {
    if (orderArea) {
      return orderArea.replace(/\s*>\s*/g, ", ");
    }
    if (info) {
      return [info.city, info.region, info.country].filter(Boolean).join(", ");
    }
    return "";
  })();

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/60">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        Customer IP Address
      </p>

      {!ip ? (
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Not available
          <span className="ml-2 text-xs font-normal text-slate-400">
            (backend-এ অর্ডারের সময় IP সেভ করতে হবে)
          </span>
        </p>
      ) : (
        <>
          {/* IP নম্বর */}
          <p className="mt-1.5 text-sm font-bold text-slate-800">{ip}</p>

          {/* লোডিং */}
          {loading && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw size={13} className="animate-spin" />
              লোকেশন লোড হচ্ছে...
            </div>
          )}

          {/* এরর */}
          {err && (
            <p className="mt-2 text-xs font-medium text-red-600">{err}</p>
          )}

          {/* লোকেশন বাটন */}
          {(locationText || (info && !loading)) && (
            <button
              type="button"
              onClick={openInMaps}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:underline"
              title="Google Maps-এ দেখো"
            >
              <MapPin size={14} />
              {locationText || "Location found"}
              <ExternalLink size={12} className="opacity-60" />
            </button>
          )}

          {/* IP থেকে পাওয়া city (আলাদা করে দেখানো) */}
          {info && orderArea && (
            <p className="mt-1 text-[11px] text-slate-500">
              IP Location:{" "}
              {[info.city, info.region, info.country].filter(Boolean).join(", ")}
            </p>
          )}

          {/* ISP */}
          {info?.isp && (
            <p className="mt-1 text-[11px] text-slate-400">
              ISP: {info.isp}
            </p>
          )}

          <p className="mt-2 text-[11px] text-slate-400">
            রুট: Keraniganj (Shop) → কাস্টমারের এলাকা
          </p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Customer order history + ratio                                      */
/* ------------------------------------------------------------------ */

const normalizePhone = (p = "") => String(p).replace(/\D/g, "").slice(-10);

const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);

function Bar({ label, count, total, barClass, textClass }) {
  const value = pct(count, total);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className={`font-bold ${textClass}`}>
          {count} / {total} · {value}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Props:
 *  - order: current order (phone দিয়ে customer চেনা হয়)
 *  - ordersApi: ORDERS_API
 *  - apiRequest: মূল ফাইলের apiRequest ফাংশন
 */
export function CustomerOrderStats({ order, ordersApi, apiRequest }) {
  const phone = order?.phone || order?.customerPhone || order?.customer?.phone || "";
  const key = normalizePhone(phone);

  const [state, setState] = useState({ loading: false, error: "", orders: [] });

  useEffect(() => {
    if (!key) {
      setState({ loading: false, error: "", orders: [] });
      return undefined;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: "" }));

    const params = new URLSearchParams({ search: phone, page: "1", limit: "500" });
    apiRequest(`${ordersApi}?${params}`, { signal: controller.signal })
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        // search আংশিক মিল দিতে পারে, তাই ফোন নম্বর মিলিয়ে ফিল্টার
        const mine = rows.filter(
          (o) =>
            normalizePhone(o.phone || o.customerPhone || o.customer?.phone) === key
        );
        setState({ loading: false, error: "", orders: mine });
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setState({ loading: false, error: e.message || "লোড করা যায়নি।", orders: [] });
      });

    return () => controller.abort();
  }, [key, phone, ordersApi, apiRequest]);

  const stats = useMemo(() => {
    const total = state.orders.length;
    const count = (s) => state.orders.filter((o) => o.status === s).length;
    const delivered = count("delivered");
    const cancelled = count("cancelled");
    const returned = count("returned");
    return {
      total,
      delivered,
      cancelled,
      returned,
      other: total - delivered - cancelled - returned,
    };
  }, [state.orders]);

  const failRate = pct(stats.cancelled + stats.returned, stats.total);
  const risky = stats.total >= 2 && failRate >= 50;
  const good = stats.total >= 3 && pct(stats.delivered, stats.total) >= 80;

  if (!key) {
    return (
      <p className="text-sm font-medium text-slate-400">
        ফোন নম্বর নেই, তাই customer history দেখানো সম্ভব নয়।
      </p>
    );
  }

  if (state.loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
        <RefreshCw size={16} className="animate-spin" />
        Customer history লোড হচ্ছে...
      </div>
    );
  }

  if (state.error) {
    return <p className="text-sm font-medium text-red-600">{state.error}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["Total Orders", stats.total, "bg-slate-100 text-slate-900"],
          ["Delivered", stats.delivered, "bg-green-50 text-green-700"],
          ["Cancelled", stats.cancelled, "bg-red-50 text-red-700"],
          ["Returned", stats.returned, "bg-orange-50 text-orange-700"],
        ].map(([label, value, cls]) => (
          <div key={label} className={`rounded-xl px-3.5 py-3 ${cls}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
              {label}
            </p>
            <p className="text-2xl font-black leading-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Ratios */}
      <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <BarChart3 size={14} />
          Order Ratio
        </div>
        <Bar
          label="Delivered"
          count={stats.delivered}
          total={stats.total}
          barClass="bg-green-500"
          textClass="text-green-700"
        />
        <Bar
          label="Cancelled"
          count={stats.cancelled}
          total={stats.total}
          barClass="bg-red-500"
          textClass="text-red-700"
        />
        <Bar
          label="Returned"
          count={stats.returned}
          total={stats.total}
          barClass="bg-orange-500"
          textClass="text-orange-700"
        />
        <p className="pt-1 text-xs text-slate-500">
          Delivered : Cancelled = <b>{stats.delivered} : {stats.cancelled}</b>
        </p>
      </div>

      {/* Verdict */}
      {risky ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>
            <b>ঝুঁকিপূর্ণ customer:</b> {failRate}% অর্ডার cancel/return হয়েছে। অর্ডার
            confirm করার আগে ফোন করে যাচাই করো।
          </span>
        </div>
      ) : good ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-700">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <span>
            <b>বিশ্বস্ত customer:</b> বেশিরভাগ অর্ডার সফলভাবে delivered হয়েছে।
          </span>
        </div>
      ) : null}
    </div>
  );
}