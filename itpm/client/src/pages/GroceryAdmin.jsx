import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

export default function GroceryAdminPage() {
  const [user, setUser] = useState(null);
  const [grocery, setGrocery] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [prevRole, setPrevRole] = useState(null);

  const formatAmount = (value) => {
    if (typeof value !== "number") return "-";
    return `LKR ${value.toFixed(2)}`;
  };

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
      const [data, stockData] = await Promise.all([
        apiFetch("/grocery"),
        apiFetch("/grocery/stocks")
      ]);
      setGrocery(data);
      setStocks(stockData);
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
      await apiFetch(`/grocery/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: form.get("status") })
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const createStock = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch("/grocery/stocks", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          quantity: Number(form.get("quantity")) || 0,
          price: Number(form.get("price")) || 0,
          unit: form.get("unit") || "pcs",
          active: form.get("active") === "on"
        })
      });
      e.target.reset();
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateStock = async (e, id) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch(`/grocery/stocks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.get("name"),
          quantity: Number(form.get("quantity")) || 0,
          price: Number(form.get("price")) || 0,
          unit: form.get("unit") || "pcs",
          active: form.get("active") === "on"
        })
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const setPricing = async (e, id) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await apiFetch(`/grocery/${id}/pricing`, {
        method: "PATCH",
        body: JSON.stringify({
          pricePerUnit: Number(form.get("pricePerUnit")) || 0
        })
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteStock = async (id) => {
    try {
      await apiFetch(`/grocery/stocks/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteGroceryRequest = async (id) => {
    try {
      await apiFetch(`/grocery/${id}/admin`, { method: "DELETE" });
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
      <Section title="Available Stocks">
        <div style={{ backgroundColor: "#e0f2fe", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
          <strong>💡 Tip:</strong> When you add 1kg rice for LKR 1000, users can request 500g and pay only LKR 500!
        </div>
        {error && <p className="error">{error}</p>}
        <form className="form-grid" onSubmit={createStock}>
          <div className="form-group">
            <label>Item Name *</label>
            <input name="name" placeholder="e.g., Rice" required />
          </div>
          <div className="form-group">
            <label>Quantity *</label>
            <input type="number" name="quantity" min="0" placeholder="0" required />
          </div>
          <div className="form-group">
            <label>Price (LKR) *</label>
            <input type="number" name="price" min="0" step="0.01" placeholder="0.00" required />
          </div>
          <div className="form-group">
            <label>Unit *</label>
            <select name="unit" required defaultValue="pcs">
              <option value="">-- Select Unit --</option>
              <option value="kg">kg (Kilograms)</option>
              <option value="g">g (Grams)</option>
              <option value="liters">liters (Litres)</option>
              <option value="ml">ml (Millilitres)</option>
              <option value="pcs">pcs (Pieces)</option>
              <option value="boxes">boxes</option>
              <option value="dozens">dozens</option>
            </select>
            <small style={{ display: "block", marginTop: "0.25rem", color: "#6b7280" }}>Users can request with compatible units (kg and g, liters and ml, etc.)</small>
          </div>
          <div className="form-group">
            <label>Active</label>
            <input type="checkbox" name="active" defaultChecked />
          </div>
          <button type="submit" className="btn-primary">Add Stock</button>
        </form>

        {stocks.length === 0 ? (
          <p className="empty">No stocks yet</p>
        ) : (
          <div className="items-grid" style={{ marginTop: 16 }}>
            {stocks.map((s) => (
              <div key={s._id} className="item-card">
                <h3>{s.name}</h3>
                <p className="item-qty">📦 Available: <strong>{s.quantity}</strong> {s.unit}</p>
                <p className="item-qty">💰 Total Price: {formatAmount(s.price)} for {s.quantity} {s.unit}</p>
                <p className="item-qty" style={{ fontSize: "0.85rem", color: "#6b7280" }}>💵 Per Unit: LKR {Number(s.price / s.quantity).toFixed(4)}/{s.unit}</p>
                <span className={`badge ${s.active ? "badge-approved" : "badge-rejected"}`}>
                  {s.active ? "Active" : "Inactive"}
                </span>
                <form className="form-grid" id={`stock-form-${s._id}`} onSubmit={(e) => updateStock(e, s._id)} style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Name</label>
                    <input name="name" defaultValue={s.name} />
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" name="quantity" min="0" defaultValue={s.quantity} />
                  </div>
                  <div className="form-group">
                    <label>Price (LKR)</label>
                    <input type="number" name="price" min="0" step="0.01" defaultValue={s.price} />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <select name="unit" defaultValue={s.unit}>
                      <option value="kg">kg (Kilograms)</option>
                      <option value="g">g (Grams)</option>
                      <option value="liters">liters (Litres)</option>
                      <option value="ml">ml (Millilitres)</option>
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="boxes">boxes</option>
                      <option value="dozens">dozens</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Active</label>
                    <input type="checkbox" name="active" defaultChecked={s.active} />
                  </div>
                </form>
                <div className="button-group">
                  <button type="submit" form={`stock-form-${s._id}`} className="btn-primary btn-sm">
                    💾 Update
                  </button>
                  <button className="btn-delete btn-sm" onClick={() => deleteStock(s._id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Grocery Requests">
        {error && <p className="error">{error}</p>}
        {grocery.length === 0 ? (
          <p className="empty">No requests yet</p>
        ) : (
          <div className="items-grid">
            {grocery.map((g) => (
              <div key={g._id} className="item-card">
                <div className="request-header">
                  <h3>{g.item}</h3>
                  <span className={`badge badge-${g.status.toLowerCase().replace(/\s+/g, "-")}`}>{g.status}</span>
                </div>
                <div className="requester-info">
                  <p><strong>👤 Requester:</strong> {g.studentId?.name || 'Unknown'}</p>
                  <p><strong>📧 Email:</strong> {g.studentId?.email || 'N/A'}</p>
                </div>
                <p className="item-qty"><strong>📦 Quantity:</strong> {g.quantity}</p>
                <p className="item-qty"><strong>💳 Payment:</strong> {g.paymentStatus || "Unpaid"}</p>
                <p className="item-qty"><strong>💰 Total:</strong> {formatAmount(g.totalAmount)}</p>
                {g.notes && <p className="item-notes"><strong>📝 Notes:</strong> {g.notes}</p>}
                {g.photos?.length > 0 && (
                  <div className="photo-grid">
                    {g.photos.slice(0, 4).map((url, idx) => (
                      <img key={`${g._id}-${idx}`} src={url} alt="grocery" className="photo-thumb" />
                    ))}
                  </div>
                )}
                <p className="timestamp">🕒 {new Date(g.createdAt).toLocaleString()}</p>
                {g.requestType === "new" && g.status === "Pending Admin Review" && (
                  <form id={`pricing-form-${g._id}`} className="form-grid" onSubmit={(e) => setPricing(e, g._id)} style={{ marginTop: 12 }}>
                    <div className="form-group">
                      <label>Set Price (LKR) *</label>
                      <input type="number" name="pricePerUnit" min="0.01" step="0.01" placeholder="0.00" required />
                    </div>
                  </form>
                )}
                <form id={`request-form-${g._id}`} className="form-grid" onSubmit={(e) => updateStatus(e, g._id)} style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Update Status *</label>
                    <select name="status" defaultValue={g.status} required>
                      {(g.requestType === "stock"
                        ? ["Waiting for Delivery", "Delivered", "Rejected"]
                        : ["Pending Admin Review", "Awaiting Payment", "Waiting for Delivery", "Delivered", "Rejected"]
                      ).map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </form>
                <div className="button-group">
                  {g.requestType === "new" && g.status === "Pending Admin Review" && (
                    <button type="submit" form={`pricing-form-${g._id}`} className="btn-secondary btn-sm">
                      💰 Set Price
                    </button>
                  )}
                  <button type="submit" form={`request-form-${g._id}`} className="btn-primary btn-sm">
                    💾 Update Status
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => deleteGroceryRequest(g._id)}
                  >
                    Delete
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
