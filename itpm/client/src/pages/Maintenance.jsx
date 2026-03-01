import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

const categories = ["Water", "Electricity", "Wi-Fi", "Furniture", "Plumbing", "HVAC", "Appliances"];

const categoryEmoji = {
  "Water": "💧",
  "Electricity": "⚡",
  "Wi-Fi": "📡",
  "Furniture": "🪑",
  "Plumbing": "🚰",
  "HVAC": "❄️",
  "Appliances": "🔌"
};

const categoryColor = {
  "Water": "#0ea5e9",
  "Electricity": "#f59e0b",
  "Wi-Fi": "#8b5cf6",
  "Furniture": "#ec4899",
  "Plumbing": "#06b6d4",
  "HVAC": "#3b82f6",
  "Appliances": "#ef4444"
};

export default function MaintenancePage() {
  const [maintenance, setMaintenance] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState("Medium");
  const [selectedCategory, setSelectedCategory] = useState("");

  const loadMaintenance = async () => {
    try {
      const data = await apiFetch("/maintenance");
      setMaintenance(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaintenance();
  }, []);

  const submitMaintenance = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/maintenance", {
        method: "POST",
        body: JSON.stringify({
          category: form.get("category"),
          description: form.get("description"),
          priority: priority
        })
      });
      e.target.reset();
      setPriority("Medium");
      setSelectedCategory("");
      await loadMaintenance();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteRequest = async (requestId) => {
    if (!window.confirm("Delete this maintenance request?")) {
      return;
    }
    try {
      await apiFetch(`/maintenance/${requestId}`, {
        method: "DELETE"
      });
      await loadMaintenance();
    } catch (err) {
      setError(err.message || "Failed to delete request");
    }
  };

  if (loading) return <div className="page-loading">⏳ Loading maintenance requests...</div>;

  const stats = {
    total: maintenance.length,
    pending: maintenance.filter(m => m.status === "Pending").length,
    completed: maintenance.filter(m => m.status === "Completed").length
  };

  return (
    <div className="page">
      {/* Stats Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <p className="stat-value">{stats.total}</p>
            <p className="stat-label">Total Requests</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <p className="stat-value">{stats.pending}</p>
            <p className="stat-label">Pending</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <p className="stat-value">{stats.completed}</p>
            <p className="stat-label">Completed</p>
          </div>
        </div>
      </div>

      <Section title="📝 Submit Maintenance Request">
        {error && <div className="alert alert-error">{error}</div>}
        <form className="form-grid" onSubmit={submitMaintenance}>
          <div className="form-group">
            <label>🔧 Category *</label>
            <select 
              name="category" 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
            {selectedCategory && (
              <div className="category-preview" style={{ borderLeft: `4px solid ${categoryColor[selectedCategory]}` }}>
                <span style={{ fontSize: "1.5rem" }}>{categoryEmoji[selectedCategory]}</span>
                <span>{selectedCategory}</span>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>⚡ Priority Level *</label>
            <div className="priority-selector">
              {["Low", "Medium", "High"].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`priority-btn priority-${level.toLowerCase()} ${priority === level ? "active" : ""}`}
                  onClick={() => setPriority(level)}
                >
                  {level === "Low" && "🟢"}
                  {level === "Medium" && "🟡"}
                  {level === "High" && "🔴"}
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group full-width">
            <label>📝 Description *</label>
            <textarea 
              name="description" 
              placeholder="Describe the issue in detail... (e.g., water leaking from ceiling, lights flickering, etc.)"
              required
              minLength={10}
            ></textarea>
          </div>
          <button type="submit" className="btn-primary btn-large">
            🚀 Submit Request
          </button>
        </form>
      </Section>

      <Section title="📋 Your Requests">{maintenance.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">🏠</p>
            <p className="empty-text">No requests yet</p>
            <p className="empty-subtext">Submit a maintenance request above to get started</p>
          </div>
        ) : (
          <div className="maintenance-grid">
            {maintenance.map((m) => (
              <div key={m._id} className="maintenance-card">
                <div className="card-header" style={{ borderLeft: `5px solid ${categoryColor[m.category]}` }}>
                  <div className="category-info">
                    <span className="category-icon" style={{ fontSize: "1.75rem" }}>
                      {categoryEmoji[m.category] || "🔧"}
                    </span>
                    <div>
                      <h3>{m.category}</h3>
                      <p className="request-date">📅 {new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="card-badges">
                    <span className={`badge badge-${m.status.toLowerCase()}`}>
                      {m.status === "Pending" && "⏳"} {m.status}
                    </span>
                    {m.priority && (
                      <span className={`badge priority-badge priority-${m.priority.toLowerCase()}`}>
                        {m.priority === "Low" && "🟢"}
                        {m.priority === "Medium" && "🟡"}
                        {m.priority === "High" && "🔴"}
                        {m.priority}
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <p className="request-desc">{m.description}</p>
                  {m.adminRemarks && (
                    <div className="admin-remarks-box">
                      <p className="remarks-label">💬 Admin Response:</p>
                      <p className="remarks-text">{m.adminRemarks}</p>
                    </div>
                  )}
                </div>
                <div className="card-footer">
                  <small className="request-id">ID: {m._id.slice(-8)}</small>
                  {(m.status === "Pending" || m.status === "Completed") && (
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => deleteRequest(m._id)}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
