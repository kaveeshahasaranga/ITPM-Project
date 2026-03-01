import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

export default function ApprovalsPage() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
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
      const [studentsData, roomsData] = await Promise.all([
        apiFetch("/admin/students"),
        apiFetch("/admin/rooms/occupancy")
      ]);
      setStudents(studentsData);
      setRooms(roomsData);
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

  const approveStudent = async (id) => {
    try {
      await apiFetch(`/admin/students/${id}/approve`, { method: "PATCH" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const assignRoom = async (e, id) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch(`/admin/students/${id}/assign-room`, {
        method: "PATCH",
        body: JSON.stringify({
          roomNumber: form.get("roomNumber"),
          bedNumber: Number(form.get("bedNumber")),
          bedCount: Number(form.get("bedCount"))
        })
      });
      e.target.reset();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const changeRole = async (userId, newRole) => {
    try {
      await apiFetch(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole })
      });
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

  const pending = students.filter((s) => s.status === "pending");
  const approved = students.filter((s) => s.status !== "pending");

  return (
    <div className="page">
      <Section title="Pending Student Approvals">
        {error && <p className="error">{error}</p>}
        {pending.length === 0 ? (
          <p className="empty">No pending students</p>
        ) : (
          <div className="items-grid">
            {pending.map((s) => (
              <div key={s._id} className="item-card">
                <h3>{s.name}</h3>
                <p className="item-qty">{s.email}</p>
                <span className="badge badge-pending">Pending</span>
                <div style={{ marginTop: 8, marginBottom: 8, fontSize: "0.9rem", color: "#666" }}>
                  <div>Faculty: <strong>{s.faculty || "Not specified"}</strong></div>
                  <div>Visitor No: <strong>{s.visitorNumber || "Not assigned"}</strong></div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn-primary" onClick={() => approveStudent(s._id)}>
                    Approve Student
                  </button>
                </div>
                <form className="form-grid" onSubmit={(e) => assignRoom(e, s._id)} style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Room Number *</label>
                    <input name="roomNumber" placeholder="Room" required />
                  </div>
                  <div className="form-group">
                    <label>Bed Number *</label>
                    <input name="bedNumber" type="number" min="1" placeholder="Bed" required />
                  </div>
                  <div className="form-group">
                    <label>Beds in Room *</label>
                    <input name="bedCount" type="number" min="1" placeholder="Count" required />
                  </div>
                  <button type="submit" className="btn-secondary">Assign Room</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Assign / Change Room (All Students)">
        {approved.length === 0 ? (
          <p className="empty">No approved students yet</p>
        ) : (
          <div className="items-grid">
            {approved.map((s) => (
              <div key={s._id} className="item-card">
                <h3>{s.name}</h3>
                <p className="item-qty">{s.email}</p>
                <p className="item-notes">
                  Current: {s.roomId?.roomNumber ? `Room ${s.roomId.roomNumber}` : "No room"} {s.bedNumber ? `• Bed ${s.bedNumber}` : ""}
                </p>
                <div style={{ marginTop: 8, marginBottom: 4, fontSize: "0.9rem", color: "#666" }}>
                  <div>Faculty: <strong>{s.faculty || "Not specified"}</strong></div>
                  <div>Visitor No: <strong>{s.visitorNumber || "Not assigned"}</strong></div>
                </div>
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  <span className="badge badge-info">Role: {s.role}</span>
                  {s.role === "student" ? (
                    <button 
                      className="btn-secondary" 
                      style={{ marginLeft: 8, padding: "4px 12px", fontSize: "0.9rem" }}
                      onClick={() => changeRole(s._id, "admin")}
                    >
                      Make Admin
                    </button>
                  ) : (
                    <button 
                      className="btn-secondary" 
                      style={{ marginLeft: 8, padding: "4px 12px", fontSize: "0.9rem" }}
                      onClick={() => changeRole(s._id, "student")}
                    >
                      Make Student
                    </button>
                  )}
                </div>
                <form className="form-grid" onSubmit={(e) => assignRoom(e, s._id)}>
                  <div className="form-group">
                    <label>Room Number *</label>
                    <input name="roomNumber" placeholder="Room" required />
                  </div>
                  <div className="form-group">
                    <label>Bed Number *</label>
                    <input name="bedNumber" type="number" min="1" placeholder="Bed" required />
                  </div>
                  <div className="form-group">
                    <label>Beds in Room *</label>
                    <input name="bedCount" type="number" min="1" placeholder="Count" required />
                  </div>
                  <button type="submit" className="btn-secondary">Update Room</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Room Occupancy">
        {rooms.length === 0 ? (
          <p className="empty">No rooms assigned yet</p>
        ) : (
          <div className="room-info">
            {rooms.map((r) => (
              <div key={r.roomNumber} className="info-item">
                <span className="label">Room {r.roomNumber}</span>
                <span className="value">{r.occupiedBeds}/{r.bedCount} occupied</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
