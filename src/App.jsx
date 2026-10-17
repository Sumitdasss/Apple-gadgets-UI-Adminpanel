
import { Routes, Route } from "react-router-dom";
import DeshbordUI from "./DeshbordUI";
import AdminAuthGuard from "./AdminAuthGuard";

import "./App.css";

function App() {
  return (
   
<Routes>

  <Route
    path="/*"
    element={
      <AdminAuthGuard>
        <DeshbordUI />
      </AdminAuthGuard>
    }
  />
</Routes>

  );
}

export default App;
