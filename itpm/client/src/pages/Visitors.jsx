import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

export default function VisitorsPage() {
  const [user, setUser] = useState(null);
  const [passes, setPasses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [readingIds, setReadingIds] = useState(new Set());
  const [approvingIds, setApprovingIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [prevRole, setPrevRole] = useState(null);

  const loadData = async () => {
    try {
      const me = await apiFetch("/users/me");
      
      // Detect role change and reload page
      if (prevRole && prevRole !== me.role) {
        window.location.reload();
        return;
      }
      
      setPrevRole(me.role);
      setUser(me);
      if (me.role !== "admin") {
        setLoading(false);
        return;
      }
      const [data, notes] = await Promise.all([
        apiFetch("/visitors"),
        apiFetch("/notifications?unread=true")
      ]);
      setPasses(data);
      // Filter for visitor-request type notifications
      setNotifications(notes.filter(n => n.type === "visitor-request"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!prevRole) return;
    // Check for role changes every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [prevRole]);


  const deletePass = async (id) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await apiFetch(`/visitors/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const approvePass = async (id) => {
    setApprovingIds((prev) => new Set(prev).add(id));
    try {
      await apiFetch(`/visitors/${id}/approve`, { method: "PATCH" });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const markNotificationRead = async (id) => {
    setReadingIds(prev => new Set(prev).add(id));
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(prev => prev.filter(n => n._id !== id));
      setSuccess("Notification marked as read");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setReadingIds(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }
  };

  const markAllRead = async () => {
    const allIds = notifications.map(n => n._id);
    setReadingIds(new Set(allIds));
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      setNotifications([]);
      setSuccess(`${allIds.length} notification${allIds.length !== 1 ? 's' : ''} marked as read`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    } finally {
      setReadingIds(new Set());
    }
  };


  if (loading) return <div className="page-loading">Loading...</div>;

  if (user && user.role !== "admin") {
    return (
      <div className="page">
        <Section title="Access Restricted">
          <p className="error">Admin access required.</p>
        </Section>
      </div>
    );
  }

  const generatedCount = passes.filter((p) => Boolean(p.passCode)).length;
  const pendingCount = passes.length - generatedCount;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayCount = passes.filter((p) => new Date(p.createdAt).getTime() >= startOfToday.getTime()).length;

  return (
    <div className="page visitors-admin-page">
      {error && <div className="alert alert-error" style={{
        background: "#fee2e2",
        border: "2px solid #dc2626",
        color: "#991b1b",
        padding: "1rem",
        borderRadius: "10px",
        marginBottom: "1rem"
      }}>{error}</div>}
      {success && <div className="alert alert-success" style={{
        background: "#d1fae5",
        border: "2px solid #059669",
        color: "#065f46",
        padding: "1rem",
        borderRadius: "10px",
        marginBottom: "1rem"
      }}>{success}</div>}
      
      {notifications.length > 0 && (
        <Section title="New Visitor Requests">
          <div style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "1.2rem",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
            marginBottom: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{
                background: "#f1f5f9",
                color: "#334155",
                padding: "0.4rem 0.9rem",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: "700",
                border: "1px solid #cbd5e1"
              }}>{notifications.length} new</span>
              <button 
                className="btn-secondary" 
                onClick={markAllRead}
                disabled={readingIds.size > 0}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  background: "#334155",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: readingIds.size > 0 ? "not-allowed" : "pointer",
                  opacity: readingIds.size > 0 ? 0.7 : 1
                }}
              >
                {readingIds.size > 0 ? "✓ Marking..." : "✓ Mark all as read"}
              </button>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem"
            }}>
              {notifications.map((n) => (
                <div key={n._id} style={{
                  background: "white",
                  borderRadius: "10px",
                  padding: "1rem",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "all 0.3s ease"
                }}>
                  <h3 style={{ margin: "0 0 0.3rem 0", color: "#0f172a", fontSize: "1rem" }}>{n.title}</h3>
                  <p style={{ margin: "0.3rem 0", color: "#666", fontSize: "0.9rem", lineHeight: "1.4" }}>{n.message}</p>
                  <p style={{ margin: "0.5rem 0 0 0", color: "#999", fontSize: "0.8rem" }}>{new Date(n.createdAt).toLocaleString()}</p>
                  <button 
                    className="btn-secondary" 
                    onClick={() => markNotificationRead(n._id)}
                    disabled={readingIds.has(n._id)}
                    style={{
                      marginTop: "0.7rem",
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      background: "#0f766e",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: readingIds.has(n._id) ? "not-allowed" : "pointer",
                      opacity: readingIds.has(n._id) ? 0.7 : 1,
                      width: "100%"
                    }}
                  >
                    {readingIds.has(n._id) ? "Marking..." : "Mark read"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section title="Visitor Passes Management">
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem"
        }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #dbe3ee",
            borderTop: "4px solid #334155",
            borderRadius: "10px",
            padding: "1rem",
            color: "#0f172a",
            textAlign: "center",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.06)"
          }}>
            <p style={{ margin: "0.3rem 0", fontSize: "0.8rem", color: "#64748b" }}>Total</p>
            <strong style={{ fontSize: "1.5rem" }}>{passes.length}</strong>
          </div>
          <div style={{
            background: "#ffffff",
            border: "1px solid #dbe3ee",
            borderTop: "4px solid #16a34a",
            borderRadius: "10px",
            padding: "1rem",
            color: "#0f172a",
            textAlign: "center",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.06)"
          }}>
            <p style={{ margin: "0.3rem 0", fontSize: "0.8rem", color: "#64748b" }}>Generated</p>
            <strong style={{ fontSize: "1.5rem" }}>{generatedCount}</strong>
          </div>
          <div style={{
            background: "#ffffff",
            border: "1px solid #dbe3ee",
            borderTop: "4px solid #d97706",
            borderRadius: "10px",
            padding: "1rem",
            color: "#0f172a",
            textAlign: "center",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.06)"
          }}>
            <p style={{ margin: "0.3rem 0", fontSize: "0.8rem", color: "#64748b" }}>Pending</p>
            <strong style={{ fontSize: "1.5rem" }}>{pendingCount}</strong>
          </div>
          <div style={{
            background: "#ffffff",
            border: "1px solid #dbe3ee",
            borderTop: "4px solid #2563eb",
            borderRadius: "10px",
            padding: "1rem",
            color: "#0f172a",
            textAlign: "center",
            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.06)"
          }}>
            <p style={{ margin: "0.3rem 0", fontSize: "0.8rem", color: "#64748b" }}>Today</p>
            <strong style={{ fontSize: "1.5rem" }}>{todayCount}</strong>
          </div>
        </div>

        {passes.length === 0 ? (
          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            color: "#999"
          }}>
            <p style={{ fontSize: "1.1rem" }}>No visitor passes yet</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1rem"
          }}>
            {passes.map((p) => (
              <div key={p._id} style={{
                background: "white",
                borderRadius: "10px",
                padding: "1rem",
                border: "1px solid #e2e8f0",
                borderLeft: p.passCode ? "4px solid #16a34a" : "4px solid #d97706",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.8rem", gap: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: "#0f172a", flex: 1, wordBreak: "break-word" }}>Visitor Name: {p.visitorName}</h3>
                  {p.passCode ? (
                    <span style={{
                      background: "#ecfdf3",
                      border: "1px solid #86efac",
                      color: "#166534",
                      padding: "0.3rem 0.6rem",
                      borderRadius: "20px",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                      whiteSpace: "nowrap"
                    }}>Generated</span>
                  ) : (
                    <span style={{
                      background: "#fffbeb",
                      border: "1px solid #fcd34d",
                      color: "#92400e",
                      padding: "0.3rem 0.6rem",
                      borderRadius: "20px",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                      whiteSpace: "nowrap"
                    }}>Pending</span>
                  )}
                </div>
                
                <div style={{ fontSize: "0.85rem", lineHeight: "1.5", color: "#666", flex: 1 }}>
                  {p.purpose && <p style={{ margin: "0.3rem 0" }}><strong>Purpose:</strong> {p.purpose}</p>}
                  <p style={{ margin: "0.3rem 0" }}><strong>Visit Date:</strong> {new Date(p.visitDate).toLocaleDateString()}</p>
                  
                  {p.studentId?.name && <p style={{ margin: "0.3rem 0" }}><strong>Student:</strong> {p.studentId.name}</p>}
                  {p.roomNumber && <p style={{ margin: "0.3rem 0" }}><strong>Room:</strong> {p.roomNumber}</p>}
                  {p.idType && <p style={{ margin: "0.3rem 0" }}><strong>{p.idType}:</strong> {p.idNumber ? p.idNumber : "—"}</p>}
                  {p.contact && <p style={{ margin: "0.3rem 0" }}><strong>Contact:</strong> {p.contact}</p>}
                </div>
                
                {p.passCode && (
                  <div style={{
                    margin: "0.8rem 0",
                    padding: "0.8rem",
                    background: "#f8fafc",
                    borderRadius: "6px",
                    border: "1px dashed #94a3b8",
                    textAlign: "center"
                  }}>
                    <p style={{ margin: "0 0 0.3rem 0", color: "#666", fontSize: "0.7rem" }}>Pass</p>
                    <p style={{ margin: 0, color: "#0f172a", fontWeight: "600", fontSize: "0.95rem", fontFamily: "monospace" }}>{p.passCode}</p>
                  </div>
                )}

                <div style={{
                  display: "flex",
                  gap: "0.6rem",
                  marginTop: "0.8rem",
                  flexWrap: "wrap"
                }}>
                  <button
                    className="btn-primary visitor-generate-btn"
                    onClick={() => approvePass(p._id)}
                    disabled={Boolean(p.passCode) || approvingIds.has(p._id) || deletingIds.has(p._id)}
                    style={{
                      flex: 1,
                      minWidth: "120px",
                      padding: "0.5rem 0.8rem",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      background: p.passCode ? "#e2e8f0" : "#0f766e",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: p.passCode || approvingIds.has(p._id) || deletingIds.has(p._id) ? "not-allowed" : "pointer",
                      opacity: p.passCode || approvingIds.has(p._id) || deletingIds.has(p._id) ? 0.6 : 1,
                      transition: "all 0.3s ease"
                    }}
                  >
                    {p.passCode
                      ? "Pass Generated"
                      : approvingIds.has(p._id)
                        ? "Generating..."
                        : "Generate Pass"}
                  </button>
                  <button
                    className="btn-delete visitor-delete-btn"
                    onClick={() => deletePass(p._id)}
                    disabled={approvingIds.has(p._id) || deletingIds.has(p._id)}
                    style={{
                      flex: 1,
                      minWidth: "80px",
                      padding: "0.5rem 0.8rem",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      background: "#b91c1c",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: approvingIds.has(p._id) || deletingIds.has(p._id) ? "not-allowed" : "pointer",
                      opacity: approvingIds.has(p._id) || deletingIds.has(p._id) ? 0.6 : 1,
                      transition: "all 0.3s ease"
                    }}
                  >
                    {deletingIds.has(p._id) ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}


