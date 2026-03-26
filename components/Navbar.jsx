import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { notificationService } from "../services/notificationService";

export default function Navbar({ user, onLogout }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase();

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const data = await notificationService.getNotifications({ unread: true });
        setUnreadCount(data.length);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  const handleNotificationClick = async () => {
    try {
      // Optimistic update
      setUnreadCount(0);
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>🏢 HostelMate</h1>
      </div>
      <div className="navbar-info">
        <Link
          to="/profile#profile-messages"
          className="nav-icon-link"
          style={{ position: "relative", marginRight: "1rem", textDecoration: "none", color: "inherit" }}
          onClick={handleNotificationClick}
        >
          <span style={{ fontSize: "1.5rem" }}>🔔</span>
          {unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              backgroundColor: "#ef4444",
              color: "white",
              borderRadius: "50%",
              width: "18px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              fontWeight: "bold"
            }}>
              {unreadCount}
            </span>
          )}
        </Link>
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
