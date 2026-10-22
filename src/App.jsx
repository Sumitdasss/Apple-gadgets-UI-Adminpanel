
import { Routes, Route } from "react-router-dom";
import DeshbordUI from "./Componat/DeshbordUI";
import { Toaster } from "react-hot-toast";

import "./App.css";
import LandingPages from "./pages/LandingPages";
import CreateLandingPage from "./pages/CreateLandingPage";
import EditLandingPage from "./pages/EditLandingPage";

function App() {
  return (
   <>
        <Toaster position="top-center" />
<Routes>

  <Route
    path="/*"
    element={
      
        <DeshbordUI />
    
    }
  />

        <Route
        path="/admin/landing-pages"
        element={<LandingPages />}
      />

      <Route
        path="/admin/landing-pages/create"
        element={<CreateLandingPage />}
      />

      <Route
        path="/admin/landing-pages/:id/edit"
        element={<EditLandingPage />}
      />

 
</Routes>
</>
  );
}

export default App;
