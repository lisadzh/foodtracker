import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Register from "./Register";
import Login from "./Login";
import Profile from "./Profile";
import Dashboard from "./Dashboard";
import Statistics from "./Statistics";
import Weight from "./Weight";
import FeedbackForm from "./FeedbackForm";
import AdminFeedback from "./AdminFeedback";
import MyFeedback from "./MyFeedback";
import AdminFoods from "./AdminFoods";
import backgroundImage from "./assets/images/background-pattern.png";
import "./App.css";
import { AuthProvider } from "./AuthContext";
import Navbar from "./Navbar";
import ProtectedRoute from "./ProtectedRoute";
import AdminDashboard from "./AdminDashboard";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function App() {
  return (
    <AuthProvider>
      <div
        className="app-background"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          minHeight: "100vh",
        }}
      >
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route
              path="/"
              element={
                localStorage.getItem("token") ? (
                  jwtDecode(localStorage.getItem("token")).role === "admin" ? (
                    <Navigate to="/admin" />
                  ) : (
                    <Navigate to="/profile" />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stats"
              element={
                <ProtectedRoute>
                  <Statistics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/weight"
              element={
                <ProtectedRoute>
                  <Weight />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback"
              element={
                <ProtectedRoute>
                  <FeedbackForm />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/feedbacks" element={<AdminFeedback />} />
            <Route
              path="/my-feedbacks"
              element={
                <ProtectedRoute>
                  <MyFeedback />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/foods"
              element={
                <ProtectedRoute>
                  <AdminFoods />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
