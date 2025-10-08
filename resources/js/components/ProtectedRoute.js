// resources/js/components/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const adminToken = localStorage.getItem("adminToken");
  const userToken = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;

  if (role === "admin") {
    if (!adminToken) return <Navigate to="/login" replace />;
    return children;
  }

  if (role === "student") {
    if (!userToken || storedUser?.role !== "student") return <Navigate to="/login" replace />;
    return children;
  }

  if (role === "faculty") {
    if (!userToken || storedUser?.role !== "faculty") return <Navigate to="/login" replace />;
    return children;
  }

  return <Navigate to="/login" replace />;
}
