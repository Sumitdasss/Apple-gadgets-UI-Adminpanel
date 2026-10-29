import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import DeshbordUI from "./Componat/DeshbordUI";
import AdminLogin from "./pages/AdminLogin";
import LandingPages from "./pages/LandingPages";
import CreateLandingPage from "./pages/CreateLandingPage";
import EditLandingPage from "./pages/EditLandingPage";

import "./App.css";

function isAdminLoggedIn() {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    return (
      Boolean(token) &&
      user &&
      ["admin", "subadmin"].includes(
        String(user.role || "").toLowerCase()
      )
    );
  } catch {
    return false;
  }
}

function ProtectedRoute({ children }) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

function App() {
  return (
    <>
      <Toaster position="top-center" />

      <Routes>
        {/* Login page */}
        <Route
          path="/admin/login"
          element={
            isAdminLoggedIn() ? (
              <Navigate to="/" replace />
            ) : (
              <AdminLogin />
            )
          }
        />

        {/* Protected Dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DeshbordUI />
            </ProtectedRoute>
          }
        >
          <Route
            path="admin/landing-pages"
            element={<LandingPages />}
          />

          <Route
            path="admin/landing-pages/create"
            element={<CreateLandingPage />}
          />

          <Route
            path="admin/landing-pages/:id/edit"
            element={<EditLandingPage />}
          />
        </Route>

        {/* Unknown route */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </>
  );
}

export default App;