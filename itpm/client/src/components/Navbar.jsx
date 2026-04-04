import React from "react";
import { Link } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>🏢 HostelMate</h1>
      </div>
      <div className="navbar-info">
        <span className="user-badge">{initials}</span>
        <div className="user-info">
          <p className="user-name">{user?.name}</p>
          <p className="user-role">{user?.role === "admin" ? "🔑 Admin" : "👤 Student"}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
}
