import React from "react";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="public-header">
      <div className="header-container">
        <div className="header-brand">
          <Link to="/">
            <h1>🏢 HostelMate</h1>
            <p className="brand-tagline">Your Campus Living Partner</p>
          </Link>
        </div>
        <nav className="header-nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/login" className="nav-link-btn login-btn">Login</Link>
        </nav>
      </div>
    </header>
  );
}
