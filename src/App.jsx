
import { Routes, Route } from "react-router-dom";
import DeshbordUI from "./Componat/DeshbordUI";

import "./App.css";

function App() {
  return (
    <Routes>
      {/* Order details page */}
    

      {/* Dashboard and other dashboard routes */}
      <Route
        path="/*"
        element={<DeshbordUI />}
      />
    </Routes>
  );
}

export default App;
