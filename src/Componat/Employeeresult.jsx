"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/* =====================================================
   CONFIG
===================================================== */

const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";
const ROUTE_PREFIX = "/api/dashboard";

const request = async (path) => {
  const url = `${API_BASE}${ROUTE_PREFIX}${path}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`API JSON response দেয়নি। Status: ${res.status}`);
  }

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed: ${res.status}`);
  }
  return json;
};

/* =====================================================
   CONSTANTS
===================================================== */

const STAT_COLUMNS = [
  { key: "totalAssigned", label: "Total", color: "text-slate-700", bg: "bg-slate-50" },
  { key: "currentlyAssigned", label: "Current", color: "text-blue-600", bg: "bg-blue-50" },
  { key: "assigned", label: "Assigned", color: "text-indigo-600", bg: "bg-indigo-50" },
  { key: "pickedUp", label: "Picked Up", color: "text-amber-600", bg: "bg-amber-50" },
  { key: "inTransit", label: "In Transit", color: "text-cyan-600", bg: "bg-cyan-50" },
  { key: "delivered", label: "Delivered", color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "failed", label: "Failed", color: "text-red-600", bg: "bg-red-50" },
  { key: "returned", label: "Returned", color: "text-orange-600", bg: "bg-orange-50" },
  { key: "cancelled", label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50" },
];

/* =====================================================
   HELPERS
===================================================== */

function calcSuccessRate(stats = {}) {
  const delivered = Number(stats.delivered) || 0;
  const failed = Number(stats.failed) || 0;
  const returned = Number(stats.returned) || 0;
  const cancelled = Number(stats.cancelled) || 0;
  const pickedUp = Number(stats.pickedUp) || 0;
  const inTransit = Number(stats.inTransit) || 0;
  const assigned = Number(stats.assigned) || 0;
  const currentlyAssigned = Number(stats.currentlyAssigned) || 0;
  const totalAssigned = Number(stats.totalAssigned) || 0;

  // Backend e totalAssigned 0 ashte pare — fallback calculate kori
  const computedTotal =
    totalAssigned ||
    delivered + failed + returned + cancelled + pickedUp + inTransit + assigned ||
    currentlyAssigned ||
    0;

  if (computedTotal <= 0) return 0;
  return Math.min(100, Math.round((delivered / computedTotal) * 100));
}

/* =====================================================
   UI COMPONENTS
===================================================== */

function SummaryCard({ label, value, color, icon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)]">
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-indigo-50 to-transparent opacity-60" />
      <p className="relative text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className={`relative mt-2 text-3xl font-bold tracking-tight ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function StatusBadge({ active }) {
  const isActive = active !== false;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
          : "bg-red-50 text-red-600 ring-1 ring-red-200/60"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function SuccessBar({ stats }) {
  const pct = calcSuccessRate(stats);

  let barColor = "bg-emerald-500";
  let textColor = "text-emerald-700";
  if (pct < 40) {
    barColor = "bg-red-500";
    textColor = "text-red-600";
  } else if (pct < 70) {
    barColor = "bg-amber-500";
    textColor = "text-amber-600";
  }

  return (
    <div className="flex min-w-[110px] items-center gap-2.5">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-9 text-right text-xs font-bold tabular-nums ${textColor}`}>
        {pct}%
      </span>
    </div>
  );
}

function DetailModal({ employee, loading, error, onClose }) {
  const pct = employee?.stats ? calcSuccessRate(employee.stats) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-6 py-6 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
          <div className="relative flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {employee?.name || "Employee Report"}
              </h2>
              {employee && (
                <p className="mt-1 text-sm text-indigo-100">
                  {employee.email || "—"} · {employee.phone || "—"}
                </p>
              )}
              {employee && !loading && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                  Success Rate
                  <span className="font-bold">{pct}%</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
              <p className="mt-4 text-sm text-gray-500">Loading details...</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {employee && !loading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {STAT_COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className={`rounded-2xl border border-gray-100 p-4 ${col.bg}`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    {col.label}
                  </p>
                  <p className={`mt-1.5 text-2xl font-bold tabular-nums ${col.color}`}>
                    {(employee.stats?.[col.key] ?? 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   PAGE
===================================================== */

export default function EmployeeSummaryPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const json = await request("/employee-summary");
      setEmployees(json.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const openDetail = async (employee) => {
    setSelected(employee);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const json = await request(`/getEmployeeReportById/${employee._id}`);
      setDetail(json.data);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
    setDetailError("");
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (filter === "active" && emp.isActive === false) return false;
      if (filter === "inactive" && emp.isActive !== false) return false;
      if (!term) return true;
      return [emp.name, emp.email, emp.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [employees, search, filter]);

  const totals = useMemo(() => {
    const sum = (key) =>
      employees.reduce((acc, e) => acc + (Number(e.stats?.[key]) || 0), 0);

    return {
      employees: employees.length,
      totalAssigned: sum("totalAssigned") || sum("assigned") || sum("currentlyAssigned"),
      pending: sum("pending"),
      delivered: sum("delivered"),
      failed: sum("failed"),
    };
  }, [employees]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      <div className="mx-auto max-w-370 px-4 py-8 md:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
              Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Employee Summary
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Delivery performance of all employees
            </p>
          </div>

          <button
            onClick={loadSummary}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 hover:shadow-indigo-300 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          <SummaryCard label="Employees" value={totals.employees} color="text-slate-800" />
          <SummaryCard label="Total Assigned" value={totals.totalAssigned} color="text-indigo-600" />
          <SummaryCard label="Pending" value={totals.pending} color="text-amber-600" />
          <SummaryCard label="Delivered" value={totals.delivered} color="text-emerald-600" />
          <SummaryCard label="Failed" value={totals.failed} color="text-red-600" />
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Employees</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-slate-50/80">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Employee
                  </th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                  {STAT_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Success
                  </th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {loading && (
                  <tr>
                    <td
                      colSpan={STAT_COLUMNS.length + 4}
                      className="px-5 py-16 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
                        <p className="text-sm text-gray-400">Loading employees...</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={STAT_COLUMNS.length + 4}
                      className="px-5 py-16 text-center text-sm text-gray-400"
                    >
                      No employees found
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((emp) => (
                    <tr
                      key={emp._id}
                      className="group transition-colors hover:bg-indigo-50/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white shadow-sm">
                            {(emp.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {emp.name || "—"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {emp.email || emp.phone || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge active={emp.isActive} />
                      </td>

                      {STAT_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className={`px-3 py-4 text-center font-semibold tabular-nums ${col.color}`}
                        >
                          {(emp.stats?.[col.key] ?? 0).toLocaleString()}
                        </td>
                      ))}

                      <td className="px-4 py-4">
                        <SuccessBar stats={emp.stats || {}} />
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openDetail(emp)}
                          className="rounded-lg border border-indigo-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 group-hover:shadow"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <DetailModal
          employee={detail || (detailLoading ? null : selected)}
          loading={detailLoading}
          error={detailError}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}