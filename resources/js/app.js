import React from "react";
import ReactDOM from "react-dom";
import Router from "./components/Router";
import axios from "axios";

// ✅ Configure Axios
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
if (token) {
  axios.defaults.headers.common["X-CSRF-TOKEN"] = token;
}

// ✅ Mount the app
ReactDOM.render(<Router />, document.getElementById("app"));
