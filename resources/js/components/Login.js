import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../sass/Login.scss";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // No runtime background logic; CSS handles the page background for login.

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Send login request (use relative path so it uses the same origin as the browser)
      const { data } = await axios.post("/api/login", {
        email: email.trim(),
        password: password.trim(),
      });

      const user = data.user;

      // ✅ Save user info locally
      localStorage.setItem("user", JSON.stringify(user));

      // Provide a lightweight token flag so ProtectedRoute and other
      // components that check localStorage tokens won't immediately
      // redirect the user back to /login. In this app we don't use
      // a JWT here, so a simple presence flag is sufficient.
      if (user.role === 'admin') {
        localStorage.setItem('adminToken', '1');
        // also set a generic token for APIs that check 'token'
        localStorage.setItem('token', '1');
      } else {
        localStorage.setItem('token', '1');
        // normalize teacher role for areas that expect 'faculty'
        if (user.role === 'teacher') {
          // keep original role but also store a normalized role helper
          localStorage.setItem('roleNormalized', 'faculty');
        }
      }

      // ✅ Redirect instantly based on role
      switch (user.role) {
        case "admin":
          window.location.href = "/admin/dashboard";
          break;
        case "teacher":
          window.location.href = "/teacher/dashboard";
          break;
        case "student":
          window.location.href = "/student/dashboard";
          break;
        default:
          setError("❌ Unknown user role. Please contact the administrator.");
          break;
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.response && err.response.data) {
        // Print structured server response for easier copy/paste from browser console
        console.table(err.response.data);
      }
      // Gracefully handle all errors
      const msg =
        err.response?.data?.message ||
        (err.code === "ERR_NETWORK"
          ? "🚫 Cannot connect to server. Please start your Laravel backend."
          : "❌ Invalid credentials. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Development helper: call window.debugLogin(email, password) from the browser console
  // It will POST to /api/_debug-login and log the JSON response.
  useEffect(() => {
    window.debugLogin = async (e = "admin@urios.gmail.com", p = "admin123") => {
      try {
        const res = await axios.post('/api/_debug-login', { email: e, password: p });
        // eslint-disable-next-line no-console
        console.log('debugLogin:', res.data);
        return res.data;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('debugLogin failed', err.response?.data || err.message);
        throw err;
      }
    };
  }, []);

  return (
    <div className="login-page fade-in">
      {/* background slideshow (pure CSS driven) - added so login shows multiple pictures */}
      <div className="bg-slideshow" aria-hidden="true">
        <div className="slide" style={{ backgroundImage: "url('/images/main-campus.webp')" }} />
        <div className="slide" style={{ backgroundImage: "url('/images/sjit-cta-group-a-1168x657.webp')" }} />
        <div className="slide" style={{ backgroundImage: "url('/images/SJIT_Sample_Cover_Photo_2.original.png')" }} />
      </div>

      {/* Login Form Section */}
      <div className="login-section">
        <div className="login-card">
          <h2>Saint Joseph Institute of Technology</h2>
          <p className="subtitle">Sign in to access your account</p>

          <form onSubmit={handleLogin} autoComplete="off" className="login-form">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? "Logging in..." : "Login"}
            </button>

            {error && <p className="error-message">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
