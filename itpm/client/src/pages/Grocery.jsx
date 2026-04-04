import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

const groceryEmojis = {
  "rice": "🍚", "bread": "🍞", "milk": "🥛", "eggs": "🥚", "butter": "🧈",
  "cheese": "🧀", "water": "💧", "juice": "🧃", "tea": "🍵", "coffee": "☕",
  "salt": "🧂", "sugar": "🍯", "oil": "🫗", "spice": "🌶️", "flour": "🌾",
  "pasta": "🍝", "beans": "🫘", "soap": "🧼", "shampoo": "🧴", "bulb": "💡",
  "candle": "🕯️", "match": "🔥", "tissue": "🧻", "napkin": "🧻"
};

const getGroceryEmoji = (itemName) => {
  const lower = itemName.toLowerCase();
  for (const [key, emoji] of Object.entries(groceryEmojis)) {
    if (lower.includes(key)) return emoji;
  }
  return "🛒";
};

// Parse quantity with units: "500g", "0.5kg", "2l", "500ml" etc.
const parseQuantityWithUnit = (input, stockUnit) => {
  if (!input) return { value: 0, unit: stockUnit, error: "Invalid input" };
  
  const unitConversions = {
    // Weight conversions to kg
    "g": 0.001, "gram": 0.001, "grams": 0.001,
    "kg": 1, "kilogram": 1, "kilograms": 1,
    // Volume conversions to liters
    "ml": 0.001, "milliliter": 0.001, "milliliters": 0.001,
    "l": 1, "liter": 1, "liters": 1, "litre": 1, "litres": 1,
    // Count
    "pcs": 1, "pc": 1, "piece": 1, "pieces": 1, "qty": 1
  };
  
  const str = input.toString().toLowerCase().trim();
  const regex = /^([\d.]+)\s*([a-zA-Z]*)$/;
  const match = str.match(regex);
  
  if (!match) return { value: 0, unit: stockUnit, error: "Use format: 500g, 0.5kg, 2l, etc." };
  
  const rawValue = parseFloat(match[1]);
  const rawUnit = (match[2] || stockUnit).toLowerCase();
  
  if (isNaN(rawValue) || rawValue <= 0) {
    return { value: 0, unit: stockUnit, error: "Quantity must be greater than 0" };
  }
  
  // Normalize units
  const baseUnit = stockUnit.toLowerCase();
  
  // Convert to stock's unit system
  let finalValue = rawValue;
  
  if (baseUnit === "kg" || baseUnit === "kilogram") {
    if (unitConversions[rawUnit] !== undefined) {
      finalValue = rawValue * unitConversions[rawUnit];
    } else {
      return { value: 0, unit: stockUnit, error: `Unit '${rawUnit}' not recognized. Use: g, kg, ml, l, pcs` };
    }
  } else if (baseUnit === "liters" || baseUnit === "liter" || baseUnit === "litres" || baseUnit === "litre" || baseUnit === "l") {
    if (unitConversions[rawUnit] !== undefined) {
      finalValue = rawValue * unitConversions[rawUnit];
    } else {
      return { value: 0, unit: stockUnit, error: `Unit '${rawUnit}' not recognized. Use: ml, l` };
    }
  } else if (baseUnit === "pcs" || baseUnit === "pieces" || baseUnit === "pc" || baseUnit === "piece") {
    if (unitConversions[rawUnit] !== undefined || rawUnit === baseUnit) {
      finalValue = rawValue;
    } else {
      return { value: 0, unit: stockUnit, error: `Use pieces (pcs) format for ${stockUnit}` };
    }
  } else {
    // Assume direct numeric input
    finalValue = rawValue;
  }
  
  return { value: finalValue, unit: baseUnit, error: null };
};

export default function GroceryPage() {
  const [grocery, setGrocery] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ item: "", quantity: 1, notes: "" });
  const [showStockRequest, setShowStockRequest] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockRequestQty, setStockRequestQty] = useState("");
  const [stockRequestQtyError, setStockRequestQtyError] = useState("");

  const loadGrocery = async () => {
    try {
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
    loadGrocery();
  }, []);

  const submitGrocery = async (e) => {
    e.preventDefault();
    console.log("[Grocery] Submit form clicked");
    setError("");
    
    try {
      const form = new FormData(e.target);
      const item = form.get("item");
      const quantity = Number(form.get("quantity"));
      
      console.log("[Grocery] Form data:", { item, quantity });
      
      if (!item || item.trim() === "") {
        const err = "Item name is required";
        console.log("[Grocery] Validation error:", err);
        setError(err);
        return;
      }
      
      if (quantity <= 0) {
        const err = "Quantity must be greater than 0";
        console.log("[Grocery] Validation error:", err);
        setError(err);
        return;
      }

      const photos = [
        form.get("photo1"),
        form.get("photo2"),
        form.get("photo3"),
        form.get("photo4")
      ].filter((v) => v && v.trim().length > 0);

      const payload = {
        item,
        quantity,
        notes: form.get("notes"),
        photos
      };
      
      console.log("[Grocery] Sending API request:", payload);
      
      const result = await apiFetch("/grocery", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      console.log("[Grocery] API response:", result);
      e.target.reset();
      setError("");
      alert("✅ Request submitted successfully!");
      await loadGrocery();
    } catch (err) {
      console.error("[Grocery] Error:", err);
      setError(err.message || "Failed to submit request. Please try again.");
    }
  };

  const submitGroceryDirect = async () => {
    console.log("[Grocery-Direct] Submit clicked");
    setError("");
    
    try {
      const itemField = document.getElementById("groceryItemField");
      const qtyField = document.getElementById("groceryQtyField");
      const notesField = document.getElementById("groceryNotesField");
      
      const item = itemField?.value?.trim() || "";
      const quantity = Number(qtyField?.value || 0);
      const notes = notesField?.value || "";
      
      console.log("[Grocery-Direct] Form data:", { item, quantity });
      
      if (!item) {
        const err = "Item name is required";
        console.log("[Grocery-Direct] Validation error:", err);
        setError(err);
        return;
      }
      
      if (quantity <= 0) {
        const err = "Quantity must be greater than 0";
        console.log("[Grocery-Direct] Validation error:", err);
        setError(err);
        return;
      }

      const payload = {
        item,
        quantity,
        notes: notes || undefined
      };
      
      console.log("[Grocery-Direct] Sending API request:", payload);
      
      const result = await apiFetch("/grocery", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      console.log("[Grocery-Direct] API response:", result);
      
      // Clear fields
      if (itemField) itemField.value = "";
      if (qtyField) qtyField.value = "";
      if (notesField) notesField.value = "";
      
      setError("");
      alert("✅ Request submitted successfully!");
      await loadGrocery();
    } catch (err) {
      console.error("[Grocery-Direct] Error:", err);
      setError(err.message || "Failed to submit request. Please try again.");
    }
  };

  const requestFromStock = async (stock) => {
    setSelectedStock(stock);
    setShowStockRequest(true);
    setStockRequestQty("");
    setStockRequestQtyError("");
    setError("");
  };

  const submitStockRequest = async (e) => {
    e.preventDefault();
    console.log("[StockRequest] Submit form clicked");
    
    // Clear previous errors
    setError("");
    setStockRequestQtyError("");
    
    try {
      const form = new FormData(e.target);
      const rawQuantity = form.get("quantity");
      const payNow = form.get("payNow") === "on";
      
      console.log("[StockRequest] Form data:", { rawQuantity, payNow, stock: selectedStock?.name });
      
      // Validate quantity is filled
      if (!rawQuantity || rawQuantity.trim() === "") {
        const err = "Please enter a quantity";
        console.log("[StockRequest] Validation error:", err);
        setError(err);
        setStockRequestQtyError(err);
        return;
      }
      
      // Parse quantity with unit
      const parsed = parseQuantityWithUnit(rawQuantity, selectedStock.unit);
      console.log("[StockRequest] Parsed quantity:", parsed);
      
      if (parsed.error) {
        console.log("[StockRequest] Parsing error:", parsed.error);
        setError(parsed.error);
        setStockRequestQtyError(parsed.error);
        return;
      }
      
      const quantity = parsed.value;

      if (quantity > selectedStock.quantity) {
        const err = `Only ${selectedStock.quantity} ${selectedStock.unit} available`;
        console.log("[StockRequest] Quantity validation error:", err);
        setError(err);
        return;
      }

      if (!payNow) {
        const err = "⚠️ You must confirm payment to submit this request";
        console.log("[StockRequest] Payment validation error:", err);
        setError(err);
        return;
      }

      const payload = {
        item: selectedStock.name,
        quantity,
        notes: form.get("notes") || `Request from available stock`,
        stockId: selectedStock._id,
        payNow: true
      };
      
      console.log("[StockRequest] Sending API request:", payload);

      const result = await apiFetch("/grocery", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      console.log("[StockRequest] API response:", result);
      setShowStockRequest(false);
      setSelectedStock(null);
      setError("");
      setStockRequestQty("");
      alert("✅ Stock request submitted successfully! Payment received.");
      await loadGrocery();
    } catch (err) {
      console.error("[StockRequest] Error:", err);
      setError(err.message || "Failed to submit stock request. Please try again.");
    }
  };

  const submitStockRequestDirect = async () => {
    console.log("[StockRequest-Direct] Submit clicked");
    
    setError("");
    setStockRequestQtyError("");
    
    try {
      const rawQuantity = stockRequestQty;
      const payNowCheckbox = document.getElementById("payNowCheckbox");
      const payNow = payNowCheckbox?.checked || false;
      const notesField = document.getElementById("stockNotesField");
      const notes = notesField?.value || "";
      
      console.log("[StockRequest-Direct] Form data:", { rawQuantity, payNow, stock: selectedStock?.name });
      
      // Validate quantity is filled
      if (!rawQuantity || rawQuantity.trim() === "") {
        const err = "Please enter a quantity";
        console.log("[StockRequest-Direct] Validation error:", err);
        setError(err);
        setStockRequestQtyError(err);
        return;
      }
      
      // Parse quantity with unit
      const parsed = parseQuantityWithUnit(rawQuantity, selectedStock.unit);
      console.log("[StockRequest-Direct] Parsed quantity:", parsed);
      
      if (parsed.error) {
        console.log("[StockRequest-Direct] Parsing error:", parsed.error);
        setError(parsed.error);
        setStockRequestQtyError(parsed.error);
        return;
      }
      
      const quantity = parsed.value;

      if (quantity > selectedStock.quantity) {
        const err = `Only ${selectedStock.quantity} ${selectedStock.unit} available`;
        console.log("[StockRequest-Direct] Quantity validation error:", err);
        setError(err);
        return;
      }

      if (!payNow) {
        const err = "⚠️ You must confirm payment to submit this request";
        console.log("[StockRequest-Direct] Payment validation error:", err);
        setError(err);
        return;
      }

      const payload = {
        item: selectedStock.name,
        quantity,
        notes: notes || `Request from available stock`,
        stockId: selectedStock._id,
        payNow: true
      };
      
      console.log("[StockRequest-Direct] Sending API request:", payload);

      const result = await apiFetch("/grocery", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      console.log("[StockRequest-Direct] API response:", result);
      setShowStockRequest(false);
      setSelectedStock(null);
      setError("");
      setStockRequestQty("");
      alert("✅ Stock request submitted successfully! Payment received.");
      await loadGrocery();
    } catch (err) {
      console.error("[StockRequest-Direct] Error:", err);
      setError(err.message || "Failed to submit stock request. Please try again.");
    }
  };

  const deleteGrocery = async (id) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    
    try {
      await apiFetch(`/grocery/${id}`, { method: "DELETE" });
      await loadGrocery();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (g) => {
    setEditingId(g._id);
    setEditForm({ item: g.item, quantity: g.quantity, notes: g.notes || "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ item: "", quantity: 1, notes: "" });
  };

  const updateGrocery = async (id) => {
    if (editForm.quantity <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    try {
      await apiFetch(`/grocery/${id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm)
      });
      setEditingId(null);
      setEditForm({ item: "", quantity: 1, notes: "" });
      await loadGrocery();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      "Pending Admin Review": "#f59e0b",
      "Awaiting Payment": "#fb923c",
      "Waiting for Delivery": "#3b82f6",
      Delivered: "#10b981",
      Rejected: "#ef4444"
    };
    return colors[status] || "#6b7280";
  };

  const payForRequest = async (id) => {
    try {
      await apiFetch(`/grocery/${id}/pay`, { method: "POST" });
      await loadGrocery();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="page">
      <Section title="  How to Request from Available Stocks">
        <div style={{ backgroundColor: "#f3f4f6", padding: "1rem", borderRadius: "0.5rem", fontSize: "0.95rem" }}>
          <p><strong>✅ You can request ANY quantity you need!</strong></p>
          <p style={{ marginTop: "0.5rem" }}>Examples:</p>
          <ul style={{ marginLeft: "1.5rem", marginTop: "0.5rem" }}>
            <li><strong>For weight items (kg, g):</strong> Enter "500g", "0.5kg", "250g", or just "0.5"</li>
            <li><strong>For liquid items (l, ml):</strong> Enter "500ml", "0.5l", "250ml", or just "0.25"</li>
            <li><strong>For items in pieces (pcs):</strong> Enter "5", "10", "2", etc.</li>
          </ul>
          <p style={{ marginTop: "0.5rem", color: "#6b7280" }}>💡 <strong>Price automatically adjusts</strong> based on what you request!</p>
          <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b7280" }}>Example: Admin added 1kg rice for LKR 1000. You request 500g? You pay only LKR 500! ✓</p>
        </div>
      </Section>

      <Section title=" 🛒 Available Stocks">
        {stocks.length === 0 ? (
          <p className="empty">No items in stock right now</p>
        ) : (
          <div className="stock-items-grid">
            {stocks.map((s) => (
              <div key={s._id} className="stock-item-card">
                <div className="stock-emoji-badge">{getGroceryEmoji(s.name)}</div>
                <h3>{s.name}</h3>
                <p className="stock-qty">
                  📦 <strong>{s.quantity}</strong> <span style={{ color: "#6b7280" }}>{s.unit}</span> Available
                </p>
                <p className="stock-price">
                  💰 LKR <strong>{Number(s.price || 0).toFixed(2)}</strong> per {s.unit}
                </p>
                <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem" }}>
                  💵 Unit Price: LKR {Number((s.price || 0) / (s.quantity || 1)).toFixed(4)}/{s.unit}
                </p>
                <button 
                  className="btn-stock-request"
                  onClick={() => requestFromStock(s)}
                  disabled={s.quantity === 0}
                >
                  {s.quantity > 0 ? "🛒 Request" : "Out of Stock"}
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {showStockRequest && selectedStock && (
        <Section title={`Request ${selectedStock.name}`}>
          {error && <p className="error">{error}</p>}
          <div className="form-grid">
            <div className="form-group">
              <label>Item</label>
              <input type="text" value={selectedStock.name} disabled />
            </div>
            <div className="form-group">
              <label>Available Quantity</label>
              <input type="text" value={`${selectedStock.quantity} ${selectedStock.unit}`} disabled />
            </div>
            <div className="form-group">
              <label>Price</label>
              <input type="text" value={`LKR ${Number(selectedStock.price || 0).toFixed(2)} per ${selectedStock.unit}`} disabled />
            </div>
            <div className="form-group">
              <label>Request Quantity * (with {selectedStock.unit})</label>
              <input 
                type="text" 
                placeholder={
                  selectedStock.unit === "kg" ? "e.g., 500g, 0.5kg, 1, 250" :
                  selectedStock.unit === "g" ? "e.g., 500, 0.5kg" :
                  selectedStock.unit === "liters" || selectedStock.unit === "liter" ? "e.g., 500ml, 0.5l, 1" :
                  selectedStock.unit === "ml" ? "e.g., 500, 1l" :
                  selectedStock.unit === "pcs" ? "e.g., 2, 5, 10" :
                  "e.g., 1, 100, 0.5"
                }
                title={
                  selectedStock.unit === "kg" ? "Enter weight: 500g, 0.5kg, 1.5, etc." :
                  selectedStock.unit === "liters" || selectedStock.unit === "liter" ? "Enter volume: 500ml, 0.5l, 1, etc." :
                  selectedStock.unit === "pcs" ? "Enter quantity: 2, 5, 10, etc." :
                  `Enter quantity in ${selectedStock.unit}`
                }
                value={stockRequestQty}
                onChange={(e) => {
                  setStockRequestQty(e.target.value);
                  setStockRequestQtyError("");
                }}
              />
              <small style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem", display: "block" }}>
                {selectedStock.unit === "kg" ? "Can use: kg, g (example: 500g = 0.5kg)" :
                 selectedStock.unit === "liters" || selectedStock.unit === "liter" ? "Can use: l, ml (example: 500ml = 0.5l)" :
                 selectedStock.unit === "pcs" ? "Enter number of pieces" :
                 `Unit: ${selectedStock.unit}`}
              </small>
              {stockRequestQtyError && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>⚠️ {stockRequestQtyError}</p>}
            </div>
            <div className="form-group">
              <label>Price Per Unit</label>
              <input type="text" value={`LKR ${Number((selectedStock.price || 0) / (selectedStock.quantity || 1)).toFixed(2)} per ${selectedStock.unit}`} disabled />
            </div>
            <div className="form-group">
              <label>💰 Total Amount</label>
              <input
                type="text"
                value={(() => {
                  const parsed = parseQuantityWithUnit(stockRequestQty, selectedStock.unit);
                  if (parsed.error || !stockRequestQty) return "LKR 0.00";
                  const pricePerUnit = (selectedStock.price || 0) / (selectedStock.quantity || 1);
                  const total = Number(pricePerUnit * parsed.value).toFixed(2);
                  return `LKR ${total} (${parsed.value} ${selectedStock.unit})`;
                })()}
                disabled
                style={{ fontWeight: "bold", fontSize: "1.1rem" }}
              />
            </div>
            <div className="form-group full-width">
              <label>Notes (Optional)</label>
              <textarea placeholder="Any special requirements..." id="stockNotesField"></textarea>
            </div>
            <div className="form-group full-width">
              <label className="payment-confirm">
                <input type="checkbox" id="payNowCheckbox" /> I confirm payment
              </label>
            </div>
            <div className="button-group">
              <button 
                type="button"
                className="btn-primary"
                onClick={() => submitStockRequestDirect()}
              >
                ✅ Submit Request
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => {
                  setShowStockRequest(false);
                  setSelectedStock(null);
                  setError("");
                  setStockRequestQtyError("");
                  setStockRequestQty("");
                }}
              >
                ✖️ Cancel
              </button>
            </div>
          </div>
        </Section>
      )}

      <Section title="Request Items (If not in stock)">
        {error && <p className="error">{error}</p>}
        <div className="form-grid">
          <div className="form-group">
            <label>Item Name *</label>
            <input type="text" id="groceryItemField" placeholder="e.g., Rice, Water, Bulb" />
          </div>
          <div className="form-group">
            <label>Quantity * (with unit)</label>
            <input type="number" id="groceryQtyField" min="0.01" step="0.01" placeholder="e.g., 0.5, 1, 10" />
          </div>
          <div className="form-group full-width">
            <label>Notes (include unit: kg, pcs, liters, ml, etc.)</label>
            <textarea id="groceryNotesField" placeholder="e.g., 500g rice, 2 liters milk, 10 pcs eggs"></textarea>
          </div>
          <button type="button" className="btn-primary" onClick={submitGroceryDirect}>Request Item</button>
        </div>
      </Section>

      <Section title="Your Requests">
        {grocery.length === 0 ? (
          <p className="empty">No requests yet</p>
        ) : (
          <div className="grocery-requests-grid">
            {grocery.map((g) => (
              <div key={g._id} className="grocery-request-card">
                {editingId === g._id ? (
                  <div className="grocery-edit-form">
                    <div className="form-group">
                      <label>Item Name</label>
                      <input
                        type="text"
                        value={editForm.item}
                        onChange={(e) => setEditForm({ ...editForm, item: e.target.value })}
                        disabled={g.status !== "Pending Admin Review"}
                      />
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editForm.quantity}
                        onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                        disabled={g.status !== "Pending Admin Review"}
                      />
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        disabled={g.status !== "Pending Admin Review"}
                      />
                    </div>
                    <div className="grocery-button-group">
                      <button 
                        onClick={() => updateGrocery(g._id)} 
                        className="btn-save"
                        disabled={g.status !== "Pending Admin Review"}
                      >
                        💾 Save
                      </button>
                      <button onClick={cancelEdit} className="btn-cancel">
                        ✖️ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grocery-card-header">
                      <div className="grocery-emoji-lg">{getGroceryEmoji(g.item)}</div>
                      <div className="grocery-name-section">
                        <h3>{g.item}</h3>
                        <p className="grocery-qty">Qty: <strong>{g.quantity}</strong></p>
                      </div>
                    </div>
                    {g.notes && <p className="grocery-notes">📝 {g.notes}</p>}
                    {g.totalAmount > 0 && (
                      <p className="grocery-notes">💰 Total: LKR {Number(g.totalAmount).toFixed(2)}</p>
                    )}
                    <p className="grocery-notes">💳 Payment: {g.paymentStatus || "Unpaid"}</p>
                    {g.photos?.length > 0 && (
                      <div className="grocery-photo-grid">
                        {g.photos.slice(0, 4).map((url, idx) => (
                          <img key={`${g._id}-${idx}`} src={url} alt="grocery" className="grocery-photo-thumb" />
                        ))}
                      </div>
                    )}
                    <div className={`grocery-status-badge grocery-status-${g.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {g.status}
                    </div>
                    {g.status === "Awaiting Payment" && g.paymentStatus !== "Paid" && (
                      <div className="grocery-button-group">
                        <button onClick={() => payForRequest(g._id)} className="btn-save">
                          💳 Pay Now
                        </button>
                      </div>
                    )}
                    {g.status === "Pending Admin Review" && (
                      <div className="grocery-button-group">
                        <button onClick={() => startEdit(g)} className="btn-edit-sm">
                          ✏️ Edit
                        </button>
                        <button onClick={() => deleteGrocery(g._id)} className="btn-delete-sm">
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
