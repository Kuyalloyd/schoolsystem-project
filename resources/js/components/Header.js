const React = require("react");

function Header() {
  const now = new Date().toLocaleString();
  return React.createElement("header", { className: "header" }, [
    React.createElement("div", { className: "breadcrumb", key: "crumb" }, [
      "School System / ",
      React.createElement("b", { key: "bold" }, "Dashboard"),
    ]),
    React.createElement("div", { className: "last-update", key: "time" }, `Last updated: ${now}`),
  ]);
}

module.exports = Header;
