import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

export default function ApprovalsPage() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
      setError("");
      setSuccess("Room updated successfully.");
    } catch (err) {
      setSuccess("");
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

  const requests = students.filter((s) => s.roomRequest?.requested);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRequests = requests
    .filter((s) => {
      if (!normalizedSearch) return true;
      const source = [
        s.name,
        s.email,
        s.faculty,
        s.visitorNumber,
        s.roomRequest?.notes
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return source.includes(normalizedSearch);
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "oldest") {
        const aTime = new Date(a.roomRequest?.requestedAt || 0).getTime();
        const bTime = new Date(b.roomRequest?.requestedAt || 0).getTime();
        return aTime - bTime;
      }
      const aTime = new Date(a.roomRequest?.requestedAt || 0).getTime();
      const bTime = new Date(b.roomRequest?.requestedAt || 0).getTime();
      return bTime - aTime;
    });

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const requestedToday = requests.filter(
    (s) => new Date(s.roomRequest?.requestedAt || 0).getTime() >= startOfToday
  ).length;
  const withoutRoomCount = requests.filter((s) => !s.roomId?.roomNumber).length;
  const totalBeds = rooms.reduce((sum, room) => sum + (room.bedCount || 0), 0);
  const totalOccupiedBeds = rooms.reduce((sum, room) => sum + (room.occupiedBeds || 0), 0);
  const overallOccupancyRate = totalBeds > 0 ? Math.round((totalOccupiedBeds / totalBeds) * 100) : 0;

  return (
    <div className="page room-requests-admin-page">
      <Section title="Room Requests">
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <div className="room-request-stats">
          <div className="room-request-stat-card">
            <span className="room-request-stat-label">Active Requests</span>
            <strong className="room-request-stat-value">{requests.length}</strong>
          </div>
          <div className="room-request-stat-card">
            <span className="room-request-stat-label">Requested Today</span>
            <strong className="room-request-stat-value">{requestedToday}</strong>
          </div>
          <div className="room-request-stat-card">
            <span className="room-request-stat-label">Without Assignment</span>
            <strong className="room-request-stat-value">{withoutRoomCount}</strong>
          </div>
        </div>

        <div className="room-request-toolbar">
          <input
            type="text"
            placeholder="Search by name, email, faculty or request details"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="latest">Latest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        {filteredRequests.length === 0 ? (
          <p className="empty">No room requests yet</p>
        ) : (
          <div className="items-grid">
            {filteredRequests.map((s) => (
              <div key={s._id} className="item-card room-request-card">
                <h3>{s.name}</h3>
                <p className="item-qty">{s.email}</p>
                <span className="badge badge-info">Room Requested</span>
                <p className="item-notes">
                  Requested At: {s.roomRequest?.requestedAt ? new Date(s.roomRequest.requestedAt).toLocaleString() : "N/A"}
                </p>
                <div style={{ marginTop: 8, marginBottom: 8, fontSize: "0.9rem", color: "#666" }}>
                  <div>Faculty: <strong>{s.faculty || "Not specified"}</strong></div>
                  <div>Visitor No: <strong>{s.visitorNumber || "Not assigned"}</strong></div>
                  <div>
                    Request Details: <strong>{s.roomRequest?.notes || "No notes"}</strong>
                  </div>
                  <div>Current Assignment: <strong>{s.roomId?.roomNumber ? `Room ${s.roomId.roomNumber}` : "Not assigned"}{s.bedNumber ? ` • Bed ${s.bedNumber}` : ""}</strong></div>
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
                  <button type="submit" className="btn-secondary">Assign Room & Bed</button>
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
          <div className="room-occupancy-panel">
            <div className="room-occupancy-overview">
              <div className="room-occupancy-overview-card">
                <span>Total Rooms</span>
                <strong>{rooms.length}</strong>
              </div>
              <div className="room-occupancy-overview-card">
                <span>Total Beds</span>
                <strong>{totalBeds}</strong>
              </div>
              <div className="room-occupancy-overview-card">
                <span>Occupied Beds</span>
                <strong>{totalOccupiedBeds}</strong>
              </div>
              <div className="room-occupancy-overview-card">
                <span>Overall Utilization</span>
                <strong>{overallOccupancyRate}%</strong>
              </div>
            </div>

            <div className="room-occupancy-grid">
              {rooms.map((r) => {
                const utilization = r.bedCount > 0 ? Math.round((r.occupiedBeds / r.bedCount) * 100) : 0;
                const status = utilization === 100 ? "Full" : utilization >= 70 ? "Busy" : "Available";
                return (
                  <div key={r.roomNumber} className="room-occupancy-card">
                    <div className="room-occupancy-header">
                      <h4>Room {r.roomNumber}</h4>
                      <span className={`room-occupancy-status status-${status.toLowerCase()}`}>{status}</span>
                    </div>
                    <p className="room-occupancy-meta">{r.occupiedBeds} of {r.bedCount} beds occupied</p>
                    <div className="room-occupancy-progress-track">
                      <div
                        className="room-occupancy-progress-fill"
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <p className="room-occupancy-percent">{utilization}% utilized</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
