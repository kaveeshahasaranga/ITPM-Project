import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Recover from "./pages/Recover.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import Maintenance from "./pages/Maintenance.jsx";
import Grocery from "./pages/Grocery.jsx";
import Bookings from "./pages/Bookings.jsx";
import Notices from "./pages/Notices.jsx";
import Approvals from "./pages/Approvals.jsx";
import MaintenanceAdmin from "./pages/MaintenanceAdmin.jsx";
import GroceryAdmin from "./pages/GroceryAdmin.jsx";
import Announcements from "./pages/Announcements.jsx";
import Resources from "./pages/Resources.jsx";
import Visitors from "./pages/Visitors.jsx";
import ScanQR from "./pages/ScanQR.jsx";
import AdminMessages from "./pages/AdminMessages.jsx";
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import { getToken, clearToken, apiFetch } from "./api.js";
import { useNavigate } from "react-router-dom";

function ProtectedLayout({ children, user, onLogout }) {
  const location = useLocation();

  const getPageClass = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes("dashboard")) return "page-dashboard";
    if (path.includes("profile")) return "page-profile";
    if (path.includes("approvals")) return "page-approvals";
    if (path.includes("announcements")) return "page-announcements";
    if (path.includes("bookings")) return "page-bookings";
    if (path.includes("grocery-admin")) return "page-grocery-admin";
    if (path.includes("grocery")) return "page-grocery";
    if (path.includes("maintenance-admin")) return "page-maintenance-admin";
    if (path.includes("maintenance")) return "page-maintenance";
    if (path.includes("todos")) return "page-todos";
    if (path.includes("visitors")) return "page-visitors";
    if (path.includes("notices")) return "page-notices";
    if (path.includes("resources")) return "page-resources";
    if (path.includes("scan-qr")) return "page-scan-qr";
    return "page-default";
  };

  return (
    <div className="app-layout">
      <Navbar user={user} onLogout={onLogout} />
      <div className="layout-content">
        <Sidebar user={user} />
        <main className={`main-content ${getPageClass()}`}>{children}</main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, user, onLogout }) {
  const token = getToken();
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return <ProtectedLayout user={user} onLogout={onLogout}>{children}</ProtectedLayout>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const lastRoleRef = useRef(null);

  const refreshUser = async () => {
    try {
      const data = await apiFetch("/users/me");
      if (lastRoleRef.current && lastRoleRef.current !== data.role) {
        // Role changed - update and send user to dashboard
        setUser(data);
        lastRoleRef.current = data.role;
        navigate("/dashboard", { replace: true });
        return data;
      }
      setUser(data);
      lastRoleRef.current = data.role;
      return data;
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        clearToken();
        setUser(null);
      }
      return null;
    }
  };

  useEffect(() => {
    const token = getToken();
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Ensure we load full user details after login
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    if (!user || !user.role || !user.status) {
      refreshUser();
    }
  }, [user]);

  // Periodically refresh user data to catch role changes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshUser, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    clearToken();
    setUser(null);
    navigate("/");
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login onLoginSuccess={(u) => setUser(u)} />} />
      <Route path="/register" element={<Register />} />
      <Route path="/recover" element={<Recover />} />

      <Route path="/dashboard" element={<ProtectedRoute user={user} onLogout={handleLogout}><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute user={user} onLogout={handleLogout}><Profile /></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute user={user} onLogout={handleLogout}><Maintenance /></ProtectedRoute>} />
      <Route path="/grocery" element={<ProtectedRoute user={user} onLogout={handleLogout}><Grocery /></ProtectedRoute>} />
      <Route path="/bookings" element={<ProtectedRoute user={user} onLogout={handleLogout}><Bookings /></ProtectedRoute>} />
      <Route path="/notices" element={<ProtectedRoute user={user} onLogout={handleLogout}><Notices /></ProtectedRoute>} />

      <Route path="/approvals" element={<ProtectedRoute user={user} onLogout={handleLogout}><Approvals /></ProtectedRoute>} />
      <Route path="/maintenance-admin" element={<ProtectedRoute user={user} onLogout={handleLogout}><MaintenanceAdmin /></ProtectedRoute>} />
      <Route path="/grocery-admin" element={<ProtectedRoute user={user} onLogout={handleLogout}><GroceryAdmin /></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute user={user} onLogout={handleLogout}><Announcements /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute user={user} onLogout={handleLogout}><Resources /></ProtectedRoute>} />
      <Route path="/visitors" element={<ProtectedRoute user={user} onLogout={handleLogout}><Visitors /></ProtectedRoute>} />
      <Route path="/scan-qr" element={<ProtectedRoute user={user} onLogout={handleLogout}><ScanQR /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute user={user} onLogout={handleLogout}><AdminMessages /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
