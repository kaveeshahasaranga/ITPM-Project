import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

export default function MaintenanceAdminPage() {
  const [user, setUser] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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
      const data = await apiFetch("/maintenance");
      setMaintenance(data);

      // Fetch alerts for admin
      const alertsData = await apiFetch("/notifications?type=maintenance&unread=true");
      setAlerts(alertsData);
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

  const updateStatus = async (e, id) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch(`/maintenance/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: form.get("status"),
          adminRemarks: form.get("adminRemarks")
        })
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteRequest = async (id) => {
    try {
      await apiFetch(`/maintenance/${id}/admin`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err.message);
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

  return (
    <div className="page">
      <Section title="Maintenance Requests">
        {error && <p className="error">{error}</p>}

        {maintenance.length === 0 ? (
          <p className="empty">No requests yet</p>
        ) : (
          <div className="request-list">
            {maintenance.map((m) => (
              <div key={m._id} className="request-card">
                <div className="request-header">
                  <h3>{m.category}</h3>
                  <span className={`badge badge-${m.status.toLowerCase()}`}>{m.status}</span>
                </div>
                <p className="request-desc">{m.description}</p>
                {m.studentId && (
                  <p className="muted">Student: {m.studentId.name} ({m.studentId.email})</p>
                )}
                {m.adminRemarks && <p className="admin-remarks">Admin: {m.adminRemarks}</p>}
                <form className="form-grid" onSubmit={(e) => updateStatus(e, m._id)}>
                  <div className="form-group">
                    <label>Status *</label>
                    <select name="status" defaultValue={m.status} required>
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Admin Remarks</label>
                    <input name="adminRemarks" placeholder="Optional remarks" defaultValue={m.adminRemarks || ""} />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="submit" className="btn-primary">Update Status</button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => deleteRequest(m._id)}
                    >
                      Delete
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
