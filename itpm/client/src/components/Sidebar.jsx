import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const studentLinks = [
  {
    section: "Main", items: [
      { path: "/dashboard", label: "Dashboard", icon: "📊" },
      { path: "/profile", label: "Profile", icon: "👤" }
    ]
  },
  {
    section: "Room Management", items: [
      { path: "/notices", label: "Room Notices", icon: "📌" },
      { path: "/bookings", label: "Bookings", icon: "📅" },
      { path: "/maintenance", label: "Maintenance", icon: "🔧" }
    ]
  },
  {
    section: "Services", items: [
      { path: "/grocery", label: "Grocery", icon: "🛒" }
    ]
  }
];

const adminLinks = [
  {
    section: "Main", items: [
      { path: "/dashboard", label: "Dashboard", icon: "📊" }
    ]
  },
  {
    section: "Approvals", items: [
      { path: "/approvals", label: "Student Approvals", icon: "✔️" }
    ]
  },
  {
    section: "Management", items: [
      { path: "/maintenance-admin", label: "Maintenance", icon: "🔧" },
      { path: "/grocery-admin", label: "Grocery", icon: "🛒" },
      { path: "/resources", label: "Resources", icon: "🎁" },
      { path: "/visitors", label: "Visitors", icon: "🛡️" }
    ]
  },
  {
    section: "Communications", items: [
      { path: "/announcements", label: "Announcements", icon: "📢" },
      { path: "/scan-qr", label: "Scan Pass", icon: "📱" },
      { path: "/messages", label: "Messages", icon: "💬" }
    ]
  }
];

export default function Sidebar({ user }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const sections = user?.role === "admin" ? adminLinks : studentLinks;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)} title="Toggle Sidebar">
        {collapsed ? "▼→" : "◀◀"}
      </button>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section.section} className="nav-section">
            {!collapsed && <div className="nav-section-title">{section.section}</div>}
            {section.items.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${location.pathname === link.path ? "active" : ""}`}
                title={link.label}
                data-tooltip={link.label}
              >
                <span className="nav-icon">{link.icon}</span>
                <span className="nav-label">{link.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
