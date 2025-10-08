import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ✅ Auth Pages
import Login from "./Login";
import Register from "./Register";

// ✅ Only Admin Dashboard (inside the admin folder)
import AdminDashboard from "./pages/admin/AdminDashboard";



export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Login & Register */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ✅ Admin Dashboard route */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Fallback for any unknown routes */}
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </BrowserRouter>
  );
}
