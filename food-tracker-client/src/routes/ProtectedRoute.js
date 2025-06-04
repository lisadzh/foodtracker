import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { token } = useAuth();

  if (!token) return <Navigate to="/login" />;

  const decoded = jwtDecode(token);

  if (adminOnly && decoded.role !== "admin") {
    return <Navigate to="/profile" />; // звичайний користувач не може в /admin
  }

  return children;
}
