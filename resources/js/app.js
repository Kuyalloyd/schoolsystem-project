import React from "react";
import ReactDOM from "react-dom";
import Router from "./components/Router";
import axios from "axios";

// ✅ Configure Axios
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
// Send cookies on same-origin requests so Laravel session auth works
axios.defaults.withCredentials = true;

const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
if (token) {
  axios.defaults.headers.common["X-CSRF-TOKEN"] = token;
}

// Small interceptor to turn network errors into a consistent shape
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // network or CORS error
      return Promise.reject({ message: 'network_error', original: error });
    }
    return Promise.reject(error);
  }
);

// ✅ Mount the app
// Install global error handlers so runtime exceptions are visible (helpful for debugging)
window.__lastClientError = null;
function showClientErrorOverlay(err) {
  try {
    window.__lastClientError = err;
    console.error('Client error captured:', err);
    let overlay = document.getElementById('__client_error_overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '__client_error_overlay';
      overlay.style.position = 'fixed';
      overlay.style.left = '12px';
      overlay.style.right = '12px';
      overlay.style.bottom = '12px';
      overlay.style.zIndex = 2147483647;
      overlay.style.background = 'linear-gradient(90deg, rgba(255,85,85,0.95), rgba(255,140,140,0.95))';
      overlay.style.color = '#fff';
      overlay.style.padding = '12px 14px';
      overlay.style.borderRadius = '8px';
      overlay.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)';
      overlay.style.fontFamily = 'Inter, system-ui, -apple-system, Roboto, Arial';
      overlay.style.fontSize = '13px';
      overlay.style.maxHeight = '40vh';
      overlay.style.overflow = 'auto';
      overlay.style.whiteSpace = 'pre-wrap';
      overlay.style.lineHeight = '1.3';
      document.body.appendChild(overlay);
    }
    overlay.textContent = typeof err === 'string' ? err : (err && err.stack) ? err.stack : JSON.stringify(err);
  } catch (e) { console.error('Failed to render error overlay', e); }
}

window.addEventListener('error', (ev) => {
  try { showClientErrorOverlay(ev.error || ev.message || 'Unknown error'); } catch(e){}
});
window.addEventListener('unhandledrejection', (ev) => {
  try { showClientErrorOverlay(ev.reason || ev); } catch(e){}
});

try {
  ReactDOM.render(<Router />, document.getElementById("app"));
} catch (e) {
  showClientErrorOverlay(e);
}
