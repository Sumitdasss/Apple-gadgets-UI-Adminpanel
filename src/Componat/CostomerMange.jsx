/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  ShieldBan,
  ShieldCheck,
  Trash2,
  X,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  UserRound,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  Save,
} from "lucide-react";

const API_BASE = "https://apple-gadgets-ui-backend.vercel.app";
const CUSTOMER_API = `${API_BASE}/api/customers`;
const PAGE_SIZE = 10;

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "order_manager", label: "Order Manager" },
  { value: "subadmin", label: "Sub Admin" },
  { value: "employee", label: "Employee" },
  { value: "admin", label: "Admin" },
];

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed (${response.status})`
    );
  }

  return result;
}


function normalizeCustomerResponse(result) {
  const payload = result?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.customers)) return payload.customers;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}

function formatDate(date) {
  if (!date) return "N/A";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/api/customers/AllCustomers");
      setCustomers(normalizeCustomerResponse(result));
    } catch (err) {
      setError(err.message || "Unable to load customers.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const showMessage = (text) => {
    setMessage(text);
    setError("");
  };

  const filteredCustomers = customers.filter((customer) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      [customer.name, customer.email, customer.phone].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );

    const matchesStatus =
      status === "all" ||
      (status === "active" && customer.isActive !== false) ||
      (status === "blocked" && customer.isActive === false);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Keep pagination valid after filtering or deleting a customer.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleView = async (customer) => {
    setSelectedCustomer(customer);
    setDetailsLoading(true);
    setError("");

    try {
      const result = await apiRequest(
        `/api/customers/getCustomer/${customer._id}`
      );

      const details = result.data?.customer || result.data;

      if (!details || !details._id) {
        throw new Error("Customer details were not returned by the API.");
      }

      setSelectedCustomer(details);
    } catch (err) {
      setSelectedCustomer(null);
      setError(err.message || "Unable to load customer details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Change Active / Blocked.
  const handleStatusChange = async (customer) => {
    if (!customer?._id || customer.role === "admin") return;

    const nextStatus = customer.isActive === false;
    const key = `status-${customer._id}`;

    setActionLoading(key);
    setError("");
    setMessage("");

    try {
      const result = await apiRequest(
        `/api/customers/updateCustomerStatus/${customer._id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: nextStatus }),
        }
      );

      const updated = result.data || {
        ...customer,
        isActive: nextStatus,
      };

      setCustomers((previous) =>
        previous.map((item) =>
          item._id === customer._id
            ? { ...item, ...updated, isActive: nextStatus }
            : item
        )
      );

      setSelectedCustomer((previous) =>
        previous?._id === customer._id
          ? { ...previous, ...updated, isActive: nextStatus }
          : previous
      );

      showMessage(
        result.message ||
          (nextStatus
            ? "Customer unblocked successfully."
            : "Customer blocked successfully.")
      );
    } catch (err) {
      setError(err.message || "Unable to update customer status.");
    } finally {
      setActionLoading("");
    }
  };

  // Change Customer / Order Manager / Admin.
  const handleRoleChange = async (customer, nextRole) => {
    if (!customer?._id || customer.role === "admin") return;
    if (!ROLE_OPTIONS.some((option) => option.value === nextRole)) return;
    if (nextRole === customer.role) return;

    const previousRole = customer.role || "customer";
    const key = `role-${customer._id}`;

    setActionLoading(key);
    setError("");
    setMessage("");

    try {
      const result = await apiRequest(
        `/api/customers/updateCustomerRole/${customer._id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ role: nextRole }),
        }
      );

      const updatedRole = result.data?.role || nextRole;

      setCustomers((previous) =>
        previous.map((item) =>
          item._id === customer._id
            ? { ...item, role: updatedRole }
            : item
        )
      );

      setSelectedCustomer((previous) =>
        previous?._id === customer._id
          ? { ...previous, role: updatedRole }
          : previous
      );

      showMessage(
        result.message ||
          `Role updated to ${
            ROLE_OPTIONS.find((item) => item.value === updatedRole)?.label ||
            updatedRole
          }.`
      );
    } catch (err) {
      // The dropdown uses customer.role as its value, so it reverts on error.
      setError(err.message || "Unable to update customer role.");

      setCustomers((previous) =>
        previous.map((item) =>
          item._id === customer._id
            ? { ...item, role: previousRole }
            : item
        )
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const customerId = deleteTarget._id;
    const key = `delete-${customerId}`;

    setActionLoading(key);
    setError("");
    setMessage("");

    try {
      const result = await apiRequest(
        `/api/customers/deleteCustomer/${customerId}`,
        { method: "DELETE" }
      );

      setCustomers((previous) =>
        previous.filter((customer) => customer._id !== customerId)
      );

      if (selectedCustomer?._id === customerId) {
        setSelectedCustomer(null);
      }

      setDeleteTarget(null);
      showMessage(result.message || "Customer deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete customer.");
    } finally {
      setActionLoading("");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm text-slate-500">
              Admin Dashboard / Customers
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Customer Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage customer accounts, roles and access.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchCustomers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <XCircle size={19} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto"
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            <CheckCircle2 size={19} />
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="ml-auto"
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Customers"
            value={customers.length}
            icon={<Users size={22} />}
          />
          <StatCard
            title="Active Customers"
            value={customers.filter((c) => c.isActive !== false).length}
            icon={<CheckCircle2 size={22} />}
          />
          <StatCard
            title="Blocked Customers"
            value={customers.filter((c) => c.isActive === false).length}
            icon={<ShieldBan size={22} />}
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email or phone..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              aria-label="Filter by status"
            >
              <option value="all">All Customers</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            {filteredCustomers.length} customer(s) found
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <LoaderCircle
                        size={28}
                        className="mx-auto animate-spin text-slate-500"
                      />
                      <p className="mt-3 text-slate-500">
                        Loading customers...
                      </p>
                    </td>
                  </tr>
                ) : paginatedCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center text-slate-500"
                    >
                      <Users size={32} className="mx-auto mb-3" />
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                            {(customer.name || "C")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">
                              {customer.name || "Unnamed"}
                            </p>
                            <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                              {customer.email || "No email"}
                            </p>
                            {customer.isEmailVerified && (
                              <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600">
                                <BadgeCheck size={13} />
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {customer.phone || "N/A"}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={customer.role || "customer"}
                          onChange={(event) =>
                            handleRoleChange(customer, event.target.value)
                          }
                          disabled={
                            customer.role === "admin" ||
                            actionLoading === `role-${customer._id}` ||
                            actionLoading !== ""
                          }
                          aria-label={`Change role for ${customer.name || "customer"}`}
                          className="max-w-[170px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {actionLoading === `role-${customer._id}` && (
                          <LoaderCircle
                            size={14}
                            className="ml-2 inline animate-spin"
                          />
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge active={customer.isActive !== false} />
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(customer.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <ActionButton
                            title="View details"
                            onClick={() => handleView(customer)}
                          >
                            <Eye size={16} />
                          </ActionButton>

                          {customer.role !== "admin" && (
                            <>
                              <ActionButton
                                title={
                                  customer.isActive === false
                                    ? "Unblock customer"
                                    : "Block customer"
                                }
                                disabled={actionLoading !== ""}
                                onClick={() => handleStatusChange(customer)}
                              >
                                {actionLoading === `status-${customer._id}` ? (
                                  <LoaderCircle
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : customer.isActive === false ? (
                                  <ShieldCheck size={16} />
                                ) : (
                                  <ShieldBan size={16} />
                                )}
                              </ActionButton>

                              <ActionButton
                                title="Delete customer"
                                danger
                                disabled={actionLoading !== ""}
                                onClick={() => setDeleteTarget(customer)}
                              >
                                <Trash2 size={16} />
                              </ActionButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row">
            <p className="text-xs text-slate-500">
              Showing{" "}
              {filteredCustomers.length
                ? (currentPage - 1) * PAGE_SIZE + 1
                : 0}
              {" - "}
              {Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)}
              {" of "}
              {filteredCustomers.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="min-w-16 text-center text-sm font-medium">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((previous) => Math.min(totalPages, previous + 1))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCustomer(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-details-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 id="customer-details-title" className="text-lg font-bold">
                  Customer Details
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Complete account information
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="p-12 text-center">
                <LoaderCircle size={28} className="mx-auto animate-spin" />
                <p className="mt-3 text-sm text-slate-500">
                  Loading details...
                </p>
              </div>
            ) : (
              <>
                <div className="p-6">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-bold">
                      {(selectedCustomer.name || "C")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold">
                        {selectedCustomer.name || "Unnamed"}
                      </h3>
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {selectedCustomer.email || "No email"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge
                          active={selectedCustomer.isActive !== false}
                        />
                        {selectedCustomer.isEmailVerified && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                            Email verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <DetailRow
                      icon={<UserRound size={18} />}
                      label="Full Name"
                      value={selectedCustomer.name}
                    />
                    <DetailRow
                      icon={<Mail size={18} />}
                      label="Email Address"
                      value={selectedCustomer.email}
                    />
                    <DetailRow
                      icon={<Phone size={18} />}
                      label="Phone Number"
                      value={selectedCustomer.phone}
                    />
                    <DetailRow
                      icon={<MapPin size={18} />}
                      label="Address"
                      value={selectedCustomer.address || "Not provided"}
                    />
                    <DetailRow
                      icon={<Users size={18} />}
                      label="Role"
                      value={
                        ROLE_OPTIONS.find(
                          (item) => item.value === selectedCustomer.role
                        )?.label || selectedCustomer.role || "Customer"
                      }
                    />
                    <DetailRow
                      icon={<CalendarDays size={18} />}
                      label="Registered"
                      value={formatDate(selectedCustomer.createdAt)}
                    />
                    <DetailRow
                      icon={<CalendarDays size={18} />}
                      label="Last Updated"
                      value={formatDate(selectedCustomer.updatedAt)}
                    />
                  </div>

                  {selectedCustomer.role !== "admin" && (
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <label
                        htmlFor="details-role"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Change Role
                      </label>
                      <select
                        id="details-role"
                        value={selectedCustomer.role || "customer"}
                        onChange={(event) =>
                          handleRoleChange(
                            selectedCustomer,
                            event.target.value
                          )
                        }
                        disabled={actionLoading !== ""}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {selectedCustomer.role !== "admin" && (
                  <div className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row">
                    <button
                      type="button"
                      disabled={actionLoading !== ""}
                      onClick={() => handleStatusChange(selectedCustomer)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                    >
                      {selectedCustomer.isActive === false ? (
                        <>
                          <ShieldCheck size={17} />
                          Unblock Customer
                        </>
                      ) : (
                        <>
                          <ShieldBan size={17} />
                          Block Customer
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading !== ""}
                      onClick={() => setDeleteTarget(selectedCustomer)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 size={17} />
                      Delete Customer
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-customer-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={23} />
            </div>

            <h2 id="delete-customer-title" className="text-lg font-bold">
              Delete Customer?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Permanently delete{" "}
              <strong className="text-slate-800">
                {deleteTarget.name || "this customer"}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={actionLoading !== ""}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading !== ""}
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === `delete-${deleteTarget._id}` ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle size={16} className="animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
      </div>
      <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
        {icon}
      </div>
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      {active ? "Active" : "Blocked"}
    </span>
  );
}

function ActionButton({
  children,
  title,
  onClick,
  danger = false,
  disabled = false,
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? "border-red-100 text-red-600 hover:bg-red-50"
          : "border-slate-200 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-800">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}
