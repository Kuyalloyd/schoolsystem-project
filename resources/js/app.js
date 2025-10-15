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
ReactDOM.render(<Router />, document.getElementById("app"));
