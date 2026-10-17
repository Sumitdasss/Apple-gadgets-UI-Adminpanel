
import React, { useEffect, useState } from "react";

const API = (
  import.meta.env.VITE_API_URL ||
  "https://apple-gadgets-ui-backend.vercel.app"
).replace(/\/+$/, "");

const LOGIN_URL = "https://apple-gadgets-ui.vercel.app/Auth";

export default function AdminAuthGuard({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const controller = new AbortController();

    async function checkAccess() {
      try {
        const response = await fetch(`${API}/api/users/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Authentication failed"
          );
        }

        const user = result.data?.user ?? result.data;

        const allowedRoles = [
          "admin",
          "subadmin",
          "employee",
          "order_manager",
        ];

        if (!user || !allowedRoles.includes(user.role)) {
          window.location.replace(LOGIN_URL);
          return;
        }

        setStatus("authorized");
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Admin access check failed:", error);

        window.location.replace(LOGIN_URL);
      }
    }

    checkAccess();

    return () => controller.abort();
  }, []);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-red-700 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-gray-600">
            Checking admin access...
          </p>
        </div>
      </div>
    );
  }

  if (status !== "authorized") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-gray-600">
          Redirecting to login...
        </p>
      </div>
    );
  }

  return children;
}
