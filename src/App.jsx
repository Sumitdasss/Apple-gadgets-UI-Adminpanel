
import { Routes, Route } from "react-router-dom";
import DeshbordUI from "./Componat/DeshbordUI";
import { Toaster } from "react-hot-toast";

import "./App.css";

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
</Routes>
</>
  );
}

export default App;
