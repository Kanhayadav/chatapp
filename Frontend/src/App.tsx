import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Mainpage } from "./pages/Mainpage"
import { Signin } from "./pages/Signin";
import { Login } from "./pages/Login";
import { Chatpage } from "./pages/Chatpage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Guest Routes */}
        <Route path="/signup" element={<Signin />} /> {/* Renamed path to signup if it's registration */}
        <Route path="/login" element={<Login />} />

        {/* Smart Root Path: Redirects to mainpage if logged in, or login if not */}
        <Route path="/" element={
          <ProtectedRoute>
            <Mainpage />
          </ProtectedRoute>
        } />

        {/* Fully Protected Application Routes */}
        <Route path="/mainpage" element={
          <ProtectedRoute>
            <Mainpage />
          </ProtectedRoute>
        } />
        <Route path="/chat/:roomCode" element={<Chatpage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
