import React, { useState } from "react";
import axios from "axios";
import "../../sass/Login.scss";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Send login request to backend (trim spaces)
      const response = await axios.post("http://127.0.0.1:8000/api/login", {
        email: email.trim(),
        password: password.trim(),
      });

      const user = response.data.user;

      // ✅ Save user info locally
      localStorage.setItem("user", JSON.stringify(user));

      // ✅ Redirect instantly by role
      if (user.role === "admin") {
        window.location.href = "/admin/dashboard";
      } else if (user.role === "teacher") {
        window.location.href = "/teacher/dashboard";
      } else if (user.role === "student") {
        window.location.href = "/student/dashboard";
      } else {
        setError("❌ Unknown user role. Please contact admin.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "❌ Invalid credentials. Please try again.");
    } finally {
      // ✅ Stop loading animation fast
      setLoading(false);
    }
  };

  return (
    <div className="login-page fade-in">
      <div className="login-card">
        <h2>Welcome Back 👋</h2>
        <p className="subtitle">Sign in to access your account</p>

        <form onSubmit={handleLogin} autoComplete="off">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? "🔒 Logging in..." : "Login"}
          </button>

          {error && <p className="error-message">{error}</p>}
        </form>

        <p className="create-account">
          Don’t have an account?{" "}
          <a href="/register" className="link">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
