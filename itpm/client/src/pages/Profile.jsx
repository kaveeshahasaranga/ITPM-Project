import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

const PROFILE_CROP_SIZE = 320;
const PROFILE_PREVIEW_SIZE = 260;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [visitorPasses, setVisitorPasses] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pictureSaving, setPictureSaving] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState("");
  const [selectedImageMeta, setSelectedImageMeta] = useState({ width: 0, height: 0 });
  const [imageAdjust, setImageAdjust] = useState({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0
  });
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [submittingVisitor, setSubmittingVisitor] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestCancelling, setRequestCancelling] = useState(false);
  const [roomRequestPurpose, setRoomRequestPurpose] = useState("new-allocation");
  const [roomRequestPriority, setRoomRequestPriority] = useState("normal");
  const [roomPreference, setRoomPreference] = useState("any");
  const [roomRequestDetails, setRoomRequestDetails] = useState("");

  const loadUser = async () => {
    try {
      const [data, passes] = await Promise.all([
        apiFetch("/users/me"),
        apiFetch("/visitors/student/passes")
      ]);
      setUser(data);
      setVisitorPasses(passes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const formatAmount = (value) => {
    if (typeof value !== "number") return "LKR 0.00";
    return `LKR ${value.toFixed(2)}`;
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const getMinZoom = (meta) => {
    if (!meta.width || !meta.height) return 1;
    return Math.max(PROFILE_CROP_SIZE / meta.width, PROFILE_CROP_SIZE / meta.height);
  };

  const clampImageAdjust = (adjust, meta = selectedImageMeta) => {
    if (!meta.width || !meta.height) {
      return { ...adjust, zoom: Math.max(1, adjust.zoom) };
    }

    const minZoom = getMinZoom(meta);
    const zoom = Math.max(minZoom, adjust.zoom);
    const maxOffsetX = Math.max((meta.width * zoom - PROFILE_CROP_SIZE) / 2, 0);
    const maxOffsetY = Math.max((meta.height * zoom - PROFILE_CROP_SIZE) / 2, 0);

    return {
      ...adjust,
      zoom,
      offsetX: clamp(adjust.offsetX, -maxOffsetX, maxOffsetX),
      offsetY: clamp(adjust.offsetY, -maxOffsetY, maxOffsetY),
      rotation: 0
    };
  };

  const renderAdjustedImage = (source, adjust) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const size = PROFILE_CROP_SIZE;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to process image"));
          return;
        }

        const safeAdjust = clampImageAdjust(adjust, { width: image.width, height: image.height });
        ctx.clearRect(0, 0, size, size);
        ctx.translate(size / 2 + safeAdjust.offsetX, size / 2 + safeAdjust.offsetY);
        ctx.rotate((safeAdjust.rotation * Math.PI) / 180);
        ctx.scale(safeAdjust.zoom, safeAdjust.zoom);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      image.onerror = () => reject(new Error("Failed to load selected image"));
      image.src = source;
    });

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Profile picture must be 2MB or smaller");
      e.target.value = "";
      return;
    }

    try {
      const profilePicture = await fileToDataUrl(file);
      setSelectedImageSrc(profilePicture);

      const img = new Image();
      img.onload = () => {
        const meta = { width: img.width, height: img.height };
        const minZoom = getMinZoom(meta);
        setSelectedImageMeta(meta);
        setImageAdjust({ zoom: minZoom, offsetX: 0, offsetY: 0, rotation: 0 });
      };
      img.src = profilePicture;
    } catch (err) {
      setError(err.message || "Failed to load selected image");
    } finally {
      e.target.value = "";
    }
  };

  const closeImageAdjuster = () => {
    setSelectedImageSrc("");
    setSelectedImageMeta({ width: 0, height: 0 });
    setImageAdjust({ zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 });
    setIsDraggingPreview(false);
    setDragStart(null);
  };

  const previewScale = PROFILE_PREVIEW_SIZE / PROFILE_CROP_SIZE;

  const handlePreviewPointerDown = (e) => {
    if (!selectedImageSrc) return;
    e.preventDefault();
    setIsDraggingPreview(true);
    setDragStart({
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: imageAdjust.offsetX,
      offsetY: imageAdjust.offsetY
    });
  };

  const handlePreviewPointerMove = (e) => {
    if (!isDraggingPreview || !dragStart) return;
    e.preventDefault();

    const deltaX = (e.clientX - dragStart.clientX) / previewScale;
    const deltaY = (e.clientY - dragStart.clientY) / previewScale;

    setImageAdjust((prev) =>
      clampImageAdjust({
        ...prev,
        offsetX: dragStart.offsetX + deltaX,
        offsetY: dragStart.offsetY + deltaY
      })
    );
  };

  const stopPreviewDragging = () => {
    if (!isDraggingPreview) return;
    setIsDraggingPreview(false);
    setDragStart(null);
  };

  const nudgeZoom = (delta) => {
    setImageAdjust((prev) => clampImageAdjust({ ...prev, zoom: prev.zoom + delta }));
  };

  const saveAdjustedProfilePicture = async () => {
    if (!selectedImageSrc) return;
    setError("");
    setSuccess("");

    try {
      setPictureSaving(true);
      const profilePicture = await renderAdjustedImage(selectedImageSrc, imageAdjust);
      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify({ profilePicture })
      });
      setSuccess("Profile picture updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
      closeImageAdjuster();
      await loadUser();
    } catch (err) {
      setError(err.message || "Failed to save adjusted picture");
    } finally {
      setPictureSaving(false);
    }
  };

  const handleProfilePictureRemove = async () => {
    setError("");
    setSuccess("");
    try {
      setPictureSaving(true);
      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify({ profilePicture: "" })
      });
      setSuccess("Profile picture removed successfully!");
      setTimeout(() => setSuccess(""), 3000);
      await loadUser();
    } catch (err) {
      setError(err.message || "Failed to remove profile picture");
    } finally {
      setPictureSaving(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    const form = new FormData(e.target);
    const name = form.get("name")?.trim() || "";
    const emergencyName = form.get("emergencyContactName")?.trim() || "";

    // Strip non-digit characters from phone numbers
    const phone = form.get("phone")?.replace(/\D/g, "") || "";
    const emergency = form.get("emergencyContact")?.replace(/\D/g, "") || "";

    // Validate phone numbers are exactly 10 digits
    if (!phone || phone.length !== 10) {
      setError("Phone number must be exactly 10 digits");
      return;
    }
    if (!emergency || emergency.length !== 10) {
      setError("Emergency contact must be exactly 10 digits");
      return;
    }

    if (!name || name.length < 2) {
      setSaving(false);
      setError("Name must be at least 2 characters");
      return;
    }

    if (emergencyName && emergencyName.length < 2) {
      setSaving(false);
      setError("Emergency contact name must be at least 2 characters");
      return;
    }

    try {
      const payload = {
        name,
        phone,
        emergencyContact: emergency,
        emergencyContactName: emergencyName || undefined
      };

      const faculty = form.get("faculty")?.trim();
      if (faculty) {
        payload.faculty = faculty;
      }

      const year = form.get("year")?.trim();
      if (year) {
        payload.year = year;
      }

      const visitorNumber = form.get("visitorNumber")?.trim();
      if (visitorNumber) {
        payload.visitorNumber = visitorNumber;
      }

      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
      await loadUser();
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentUpdate = async (e) => {
    e.preventDefault();
    setPaymentError("");
    setPaymentSuccess("");
    setPaymentSaving(true);
    const form = new FormData(e.target);
    const walletBalanceRaw = String(form.get("walletBalance") || "");
    const walletBalance = Number(walletBalanceRaw.replace(/[^\d.]/g, ""));
    const cardHolder = form.get("paymentCardHolderName")?.trim() || "";
    const cardBrand = form.get("paymentCardBrand")?.trim() || "";
    const cardNumberRaw = form.get("paymentCardNumber")?.replace(/\D/g, "") || "";

    if (Number.isNaN(walletBalance) || walletBalance < 0) {
      setPaymentSaving(false);
      setPaymentError("Account amount must be a valid number");
      return;
    }

    if (!cardNumberRaw) {
      setPaymentSaving(false);
      setPaymentError("Card number is required");
      return;
    }

    if (!/^\d{16}$/.test(cardNumberRaw)) {
      setPaymentSaving(false);
      setPaymentError("Card number must be exactly 16 digits");
      return;
    }

    try {
      const payload = { walletBalance };
      if (cardHolder) payload.paymentCardHolderName = cardHolder;
      if (cardBrand) payload.paymentCardBrand = cardBrand;
      payload.paymentCardNumber = cardNumberRaw;

      await apiFetch("/users/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setPaymentSuccess("Payment details updated successfully!");
      setTimeout(() => setPaymentSuccess(""), 3000);
      await loadUser();
    } catch (err) {
      setPaymentError(err.message || "Failed to update payment details");
    } finally {
      setPaymentSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <div className="page-loading">User not found</div>;

  const submitRoomRequest = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const requestDetails = roomRequestDetails.trim();

    const payload = {};
    const purposeLabels = {
      "new-allocation": "Need first room assignment",
      "change-room": "Need room change",
      "urgent-stay": "Urgent accommodation need"
    };
    const priorityLabels = {
      normal: "Normal",
      high: "High",
      urgent: "Urgent"
    };
    const preferenceLabels = {
      any: "Any available room",
      quiet: "Quiet area preferred",
      lower: "Lower floor preferred",
      upper: "Upper floor preferred"
    };

    const combinedNotes = [
      `Purpose: ${purposeLabels[roomRequestPurpose]}`,
      `Priority: ${priorityLabels[roomRequestPriority]}`,
      `Preference: ${preferenceLabels[roomPreference]}`,
      requestDetails ? `Additional details: ${requestDetails}` : ""
    ].filter(Boolean).join("\n\n");

    if (combinedNotes.length > 700) {
      setError("Room request details are too long. Please keep under 700 characters.");
      return;
    }

    if (combinedNotes) payload.notes = combinedNotes;

    try {
      setRequestSubmitting(true);
      await apiFetch("/users/me/room-request", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setSuccess("Room request sent to admin.");
      setTimeout(() => setSuccess(""), 3000);
      setRoomRequestDetails("");
      setRoomRequestPurpose("new-allocation");
      setRoomRequestPriority("normal");
      setRoomPreference("any");
      await loadUser();
    } catch (err) {
      setError(err.message || "Failed to submit room request");
    } finally {
      setRequestSubmitting(false);
    }
  };

  const cancelRoomRequest = async () => {
    setError("");
    setSuccess("");
    try {
      setRequestCancelling(true);
      await apiFetch("/users/me/room-request", { method: "DELETE" });
      setSuccess("Room request cancelled.");
      setTimeout(() => setSuccess(""), 3000);
      await loadUser();
    } catch (err) {
      setError(err.message || "Failed to cancel room request");
    } finally {
      setRequestCancelling(false);
    }
  };

  return (
    <div className="page">
      <Section title="🔗 Quick Navigation">
        <div className="profile-nav">
          <a href="#profile-overview">Overview</a>
          <a href="#profile-room">Room Info</a>
          {user.role === "student" && <a href="#profile-room-request">Room Request</a>}
          <a href="#profile-edit">Edit Profile</a>
          {user.role !== "admin" && <a href="#profile-payment">Payment</a>}
          <a href="#profile-visitors">Visitor Requests</a>
        </div>
      </Section>

      <div id="profile-overview">
        <Section title="👤 My Profile">
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}

          <div className="profile-card">
            <div className="profile-avatar">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={`${user.name} profile`} className="profile-avatar-image" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="profile-info">
              <h2>{user.name}</h2>
              <p className="profile-email">{user.email}</p>
              <div className="profile-meta">
                <span className="meta-pill">Role: {user.role === "admin" ? "Admin" : "Student"}</span>
                <span className={`status-pill status-${user.status}`}>{user.status}</span>
              </div>
              {user.role !== "admin" && (
                <div className="profile-meta" style={{ marginTop: 10 }}>
                  <span className="meta-pill">Account: {formatAmount(user.walletBalance || 0)}</span>
                  {user.paymentCard?.last4 && (
                    <span className="meta-pill">Card: {user.paymentCard.brand || "Card"} **** {user.paymentCard.last4}</span>
                  )}
                </div>
              )}
            </div>
            <div className="profile-actions" style={{
              display: "flex",
              gap: "0.8rem",
              flexWrap: "wrap"
            }}>
              <label className="btn-secondary profile-picture-upload-btn" style={{
                flex: 1,
                minWidth: "130px",
                padding: "0.6rem 1rem",
                fontSize: "0.9rem",
                fontWeight: "600",
                background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
                transition: "all 0.3s ease"
              }}>
                📷 Choose Picture
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleProfilePictureChange}
                  disabled={pictureSaving}
                  hidden
                />
              </label>
              {user.profilePicture && (
                <button
                  className="btn-delete"
                  type="button"
                  onClick={handleProfilePictureRemove}
                  disabled={pictureSaving}
                  style={{
                    flex: 1,
                    minWidth: "130px",
                    padding: "0.6rem 1rem",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
                    transition: "all 0.3s ease",
                    opacity: pictureSaving ? 0.7 : 1
                  }}
                >
                  {pictureSaving ? "🗑 Removing..." : "🗑 Remove"}
                </button>
              )}
              <button 
                className="btn-secondary" 
                onClick={() => document.getElementById("profile-edit")?.scrollIntoView({ behavior: "smooth" })}
                style={{
                  flex: 1,
                  minWidth: "130px",
                  padding: "0.6rem 1rem",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                  transition: "all 0.3s ease"
                }}
              >
                ✏️ Edit Profile
              </button>
            </div>
          </div>

          {selectedImageSrc && (
            <div className="profile-image-adjuster" style={{
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              borderRadius: "12px",
              padding: "2rem",
              marginTop: "2rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.5rem", color: "#333" }}>👤 User Profile</h3>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeImageAdjuster}
                  disabled={pictureSaving}
                  style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
                >
                  ✕ Close
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                <div>
                  <p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.95rem" }}>Preview of your profile picture</p>
                  <div className="profile-image-adjuster-preview" style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "1rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                  }}>
                    <div
                      className="profile-image-adjuster-crop-box"
                      onPointerDown={handlePreviewPointerDown}
                      onPointerMove={handlePreviewPointerMove}
                      onPointerUp={stopPreviewDragging}
                      onPointerLeave={stopPreviewDragging}
                    >
                      <img
                        src={selectedImageSrc}
                        alt="Profile adjustment preview"
                        draggable={false}
                        style={{
                          width: `${selectedImageMeta.width * previewScale}px`,
                          height: `${selectedImageMeta.height * previewScale}px`,
                          transform: `translate(${imageAdjust.offsetX * previewScale}px, ${imageAdjust.offsetY * previewScale}px) scale(${imageAdjust.zoom})`,
                          cursor: isDraggingPreview ? "grabbing" : "grab"
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.95rem" }}>Adjust your picture</p>
                  <div className="profile-image-adjuster-controls" style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem"
                  }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <span style={{ fontWeight: "600", color: "#333", fontSize: "0.95rem" }}>
                        🔍 Zoom: {imageAdjust.zoom.toFixed(2)}x
                      </span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button type="button" className="btn-secondary" onClick={() => nudgeZoom(-0.1)} disabled={pictureSaving}>-</button>
                        <button type="button" className="btn-secondary" onClick={() => nudgeZoom(0.1)} disabled={pictureSaving}>+</button>
                      </div>
                      <input
                        type="range"
                        min={getMinZoom(selectedImageMeta)}
                        max="4"
                        step="0.1"
                        value={imageAdjust.zoom}
                        onChange={(e) =>
                          setImageAdjust((prev) =>
                            clampImageAdjust({ ...prev, zoom: Number(e.target.value) })
                          )
                        }
                        style={{ cursor: "pointer" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <span style={{ fontWeight: "600", color: "#333", fontSize: "0.95rem" }}>↔️ Move Left/Right</span>
                      <input
                        type="range"
                        min={-Math.max((selectedImageMeta.width * imageAdjust.zoom - PROFILE_CROP_SIZE) / 2, 0)}
                        max={Math.max((selectedImageMeta.width * imageAdjust.zoom - PROFILE_CROP_SIZE) / 2, 0)}
                        step="1"
                        value={imageAdjust.offsetX}
                        onChange={(e) =>
                          setImageAdjust((prev) =>
                            clampImageAdjust({ ...prev, offsetX: Number(e.target.value) })
                          )
                        }
                        style={{ cursor: "pointer" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <span style={{ fontWeight: "600", color: "#333", fontSize: "0.95rem" }}>↕️ Move Up/Down</span>
                      <input
                        type="range"
                        min={-Math.max((selectedImageMeta.height * imageAdjust.zoom - PROFILE_CROP_SIZE) / 2, 0)}
                        max={Math.max((selectedImageMeta.height * imageAdjust.zoom - PROFILE_CROP_SIZE) / 2, 0)}
                        step="1"
                        value={imageAdjust.offsetY}
                        onChange={(e) =>
                          setImageAdjust((prev) =>
                            clampImageAdjust({ ...prev, offsetY: Number(e.target.value) })
                          )
                        }
                        style={{ cursor: "pointer" }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="profile-image-adjuster-actions" style={{
                display: "flex",
                gap: "1rem",
                marginTop: "2rem",
                justifyContent: "flex-end"
              }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setImageAdjust({
                      zoom: getMinZoom(selectedImageMeta),
                      offsetX: 0,
                      offsetY: 0,
                      rotation: 0
                    })
                  }
                  disabled={pictureSaving}
                  style={{ padding: "0.6rem 1.2rem" }}
                >
                  🔄 Reset
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={saveAdjustedProfilePicture}
                  disabled={pictureSaving}
                  style={{ padding: "0.6rem 1.2rem" }}
                >
                  {pictureSaving ? "💾 Saving..." : "✓ Save Picture"}
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>

      <div id="profile-room">
        <Section title="🏠 Room Information">
          <div className="room-info">
            {user.role === "admin" && (
              <>
                <div className="info-item">
                  <span className="label">Room:</span>
                  <span className="value">{user.roomId?.roomNumber || "Not assigned"}</span>
                </div>
                <div className="info-item">
                  <span className="label">Bed:</span>
                  <span className="value">{user.bedNumber || "Not assigned"}</span>
                </div>
              </>
            )}
            <div className="info-item">
              <span className="label">Roommates:</span>
              <span className="value">{user.roommates?.length ? user.roommates.map((m) => m.name).join(", ") : "—"}</span>
            </div>
            {user.role === "student" && (
              <div className="info-item">
                <span className="label">Assignment:</span>
                <span className="value">Assigned by admin after your request</span>
              </div>
            )}
          </div>
        </Section>
      </div>

      {user.role === "student" && (
        <div id="profile-room-request">
          <Section title="🛏 Room Request">
            {user.roomRequest?.requested ? (
              <div className="item-card room-request-user-card">
                <span className="badge badge-approved">Request Active</span>
                <p className="item-notes">
                  Request sent on {user.roomRequest?.requestedAt ? new Date(user.roomRequest.requestedAt).toLocaleString() : "-"}
                </p>
                <p className="item-notes" style={{ whiteSpace: "pre-wrap" }}>
                  Request details: {user.roomRequest?.notes || "No details provided"}
                </p>
                <button className="btn-delete" type="button" onClick={cancelRoomRequest} disabled={requestCancelling}>
                  {requestCancelling ? "Cancelling..." : "Cancel Request"}
                </button>
              </div>
            ) : (
              <form className="form-grid" onSubmit={submitRoomRequest}>
                <div className="form-group full-width">
                  <label>Request Type</label>
                  <div className="room-request-choice-grid">
                    <button
                      type="button"
                      className={`room-request-choice ${roomRequestPurpose === "new-allocation" ? "active" : ""}`}
                      onClick={() => setRoomRequestPurpose("new-allocation")}
                    >
                      <strong>New Allocation</strong>
                      <span>First-time room assignment</span>
                    </button>
                    <button
                      type="button"
                      className={`room-request-choice ${roomRequestPurpose === "change-room" ? "active" : ""}`}
                      onClick={() => setRoomRequestPurpose("change-room")}
                    >
                      <strong>Room Change</strong>
                      <span>Need to move from current room</span>
                    </button>
                    <button
                      type="button"
                      className={`room-request-choice ${roomRequestPurpose === "urgent-stay" ? "active" : ""}`}
                      onClick={() => setRoomRequestPurpose("urgent-stay")}
                    >
                      <strong>Urgent Stay</strong>
                      <span>Immediate accommodation request</span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <div className="room-request-pill-row">
                    {[
                      { key: "normal", label: "Normal" },
                      { key: "high", label: "High" },
                      { key: "urgent", label: "Urgent" }
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={`room-request-pill ${roomRequestPriority === option.key ? "active" : ""}`}
                        onClick={() => setRoomRequestPriority(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Room Preference</label>
                  <div className="room-request-pill-row">
                    {[
                      { key: "any", label: "Any" },
                      { key: "quiet", label: "Quiet Area" },
                      { key: "lower", label: "Lower Floor" },
                      { key: "upper", label: "Upper Floor" }
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={`room-request-pill ${roomPreference === option.key ? "active" : ""}`}
                        onClick={() => setRoomPreference(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Additional Details (Optional)</label>
                  <textarea
                    name="requestDetails"
                    placeholder="Add specific details if needed (medical, accessibility, etc.)"
                    maxLength="350"
                    rows={3}
                    value={roomRequestDetails}
                    onChange={(e) => setRoomRequestDetails(e.target.value)}
                  />
                  <small className="item-notes">{roomRequestDetails.length}/350</small>
                </div>
                <button type="submit" className="btn-primary" disabled={requestSubmitting}>
                  {requestSubmitting ? "Sending..." : "Send Room Request"}
                </button>
              </form>
            )}
          </Section>
        </div>
      )}

      <div id="profile-edit">
        <Section title="👤 User Profile">
          <form className="form-grid" onSubmit={handleProfileUpdate} style={{
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            borderRadius: "12px",
            padding: "2rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
          }}>
            <div className="form-group" style={{
              background: "white",
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>👤 Full Name *</label>
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                defaultValue={user.name || ""}
                pattern="[a-zA-Z\s]+"
                title="Name must contain only letters and spaces"
                required
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.3s ease"
                }}
              />
            </div>
            <div className="form-group" style={{
              background: "white",
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>📧 Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                readOnly
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  backgroundColor: "#f9fafb",
                  color: "#999"
                }}
              />
            </div>
            <div className="form-group" style={{
              background: "white",
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>📱 Phone Number *</label>
              <input
                type="tel"
                name="phone"
                placeholder="10-digit phone number"
                defaultValue={user.phone || ""}
                pattern="[0-9]{10}"
                maxLength="10"
                required
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.3s ease"
                }}
              />
            </div>
            <div className="form-group" style={{
              background: "white",
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>👥 Emergency Contact Name *</label>
              <input
                type="text"
                name="emergencyContactName"
                placeholder="Emergency contact name"
                defaultValue={user.emergencyContact?.name || ""}
                pattern="[a-zA-Z\s]+"
                title="Name must contain only letters and spaces"
                required
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.3s ease"
                }}
              />
            </div>
            <div className="form-group" style={{
              background: "white",
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>☎️ Emergency Number *</label>
              <input
                type="tel"
                name="emergencyContact"
                placeholder="Emergency contact number"
                defaultValue={user.emergencyContact?.phone || ""}
                pattern="[0-9]{10}"
                maxLength="10"
                required
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.3s ease"
                }}
              />
            </div>
            <div className="form-group" style={{
              background: "white",
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>🎓 Faculty</label>
              <input
                type="text"
                name="faculty"
                placeholder="e.g., Engineering, Arts, Science"
                defaultValue={user.faculty || ""}
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.3s ease"
                }}
              />
            </div>
            <div className="form-group" style={{
              background: "white",
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>📚 Year</label>
              <input
                type="text"
                name="year"
                placeholder="e.g., 1st, 2nd, 3rd, 4th"
                defaultValue={user.year || ""}
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.3s ease"
                }}
              />
            </div>
            <div className="form-group" style={{
              background: "white",
              padding: "1.2rem",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
            }}>
              <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>🎫 Visitor Number</label>
              <input
                type="text"
                name="visitorNumber"
                placeholder="Your visitor pass number"
                defaultValue={user.visitorNumber || ""}
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.3s ease"
                }}
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={saving}
              style={{
                gridColumn: "1 / -1",
                padding: "1rem",
                fontSize: "1.1rem",
                fontWeight: "600",
                background: "linear-gradient(135deg, #0284c7 0%, #5b21b6 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                transition: "all 0.3s ease"
              }}
            >
              {saving ? "💾 Saving..." : "✓ Save Changes"}
            </button>
          </form>
        </Section>
      </div>

      {
        user.role !== "admin" && (
          <div id="profile-payment">
            <Section title="💳 Payment Details">
              {paymentError && <p className="error">{paymentError}</p>}
              {paymentSuccess && <p className="success">{paymentSuccess}</p>}
              <form className="form-grid" onSubmit={handlePaymentUpdate}>
                <div className="form-group">
                  <label>Account Amount (LKR) *</label>
                  <input
                    type="number"
                    name="walletBalance"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    defaultValue={user.walletBalance || 0}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Card Holder Name</label>
                  <input
                    type="text"
                    name="paymentCardHolderName"
                    placeholder="Name on card"
                    defaultValue={user.paymentCard?.holderName || ""}
                  />
                </div>
                <div className="form-group">
                  <label>Card Brand</label>
                  <input
                    type="text"
                    name="paymentCardBrand"
                    placeholder="Visa / MasterCard"
                    defaultValue={user.paymentCard?.brand || ""}
                  />
                </div>
                <div className="form-group">
                  <label>Card Number *</label>
                  <input
                    type="text"
                    name="paymentCardNumber"
                    placeholder="Enter 16-digit card number"
                    inputMode="numeric"
                    pattern="[0-9]{16}"
                    minLength="16"
                    maxLength="16"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={paymentSaving}>
                  {paymentSaving ? "Saving..." : "Save Payment Details"}
                </button>
              </form>
            </Section>
          </div>
        )
      }

      <div id="profile-visitors">
        <Section title="👥 Visitor Requests">
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          
          <button
            className="btn-primary visitor-toggle-btn"
            onClick={() => setShowVisitorForm(!showVisitorForm)}
            style={{
              padding: "0.8rem 1.6rem",
              fontSize: "1rem",
              fontWeight: "600",
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
              marginBottom: "1.5rem",
              transition: "all 0.3s ease"
            }}
          >
            {showVisitorForm ? "✕ Cancel Request" : "➕ New Visitor Request"}
          </button>

          {showVisitorForm && (
            <form className="form-grid visitor-form" onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setSuccess("");
              const form = new FormData(e.target);

              // Validation
              const visitorName = form.get("visitorName")?.trim();
              if (!visitorName || visitorName.length < 2) {
                setError("Visitor name must be at least 2 characters");
                return;
              }
              if (!/^[a-zA-Z\s]+$/.test(visitorName)) {
                setError("Visitor name must contain only letters and spaces");
                return;
              }

              const visitDate = form.get("visitDate");
              if (!visitDate) {
                setError("Visit date and time is required");
                return;
              }

              const visitDateTime = new Date(visitDate);
              const now = new Date();
              // Set time to compare properly (remove seconds/milliseconds)
              const visitDateOnly = new Date(visitDateTime.getFullYear(), visitDateTime.getMonth(), visitDateTime.getDate(), visitDateTime.getHours(), visitDateTime.getMinutes());
              const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

              if (visitDateOnly <= nowDateOnly) {
                setError("Visit date and time must be in the future, not in the past");
                return;
              }

              const contact = form.get("contact")?.replace(/\D/g, "");
              if (!contact) {
                setError("Contact number is required");
                return;
              }
              if (contact.length !== 10) {
                setError("Contact number must be exactly 10 digits");
                return;
              }
              if (!/^\d{10}$/.test(contact)) {
                setError("Contact number must contain only digits");
                return;
              }

              const purpose = form.get("purpose")?.trim();
              if (purpose && purpose.length > 200) {
                setError("Purpose must not exceed 200 characters");
                return;
              }

              const idNumber = form.get("idNumber")?.trim();
              if (idNumber && idNumber.length > 20) {
                setError("ID number must not exceed 20 characters");
                return;
              }

              const notes = form.get("notes")?.trim();
              if (notes && notes.length > 500) {
                setError("Notes must not exceed 500 characters");
                return;
              }

              // Build payload with only non-empty fields
              const payload = {
                visitorName,
                visitDate: visitDateTime.toISOString()
              };

              // Only include optional fields if they have values
              if (purpose) payload.purpose = purpose;

              const idType = form.get("idType")?.trim();
              if (idType) payload.idType = idType;

              if (idNumber) payload.idNumber = idNumber;
              if (contact) payload.contact = contact;
              if (notes) payload.notes = notes;

              if (user.room?.roomNumber) {
                payload.roomNumber = user.room.roomNumber;
              }

              setSubmittingVisitor(true);
              apiFetch("/visitors/request", {
                method: "POST",
                body: JSON.stringify(payload)
              }).then(() => {
                setSuccess("✅ Visitor request sent to admin successfully!");
                setTimeout(() => setSuccess(""), 4000);
                e.target.reset();
                setShowVisitorForm(false);
                loadUser();
              }).catch(err => {
                setError("❌ " + (err.message || "Failed to send visitor request"));
                setTimeout(() => setError(""), 4000);
              }).finally(() => setSubmittingVisitor(false));
            }} style={{
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              marginBottom: "2rem"
            }}>
              <div className="form-group" style={{
                background: "white",
                padding: "1.2rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>👤 Visitor Name *</label>
                <input
                  name="visitorName"
                  placeholder="Full name"
                  maxLength="100"
                  pattern="[a-zA-Z\s]+"
                  title="Name must contain only letters and spaces"
                  required
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    transition: "all 0.3s ease"
                  }}
                />
              </div>
              <div className="form-group" style={{
                background: "white",
                padding: "1.2rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>📋 Purpose</label>
                <input
                  name="purpose"
                  placeholder="Meeting/Delivery/Other"
                  maxLength="200"
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    transition: "all 0.3s ease"
                  }}
                />
              </div>
              <div className="form-group" style={{
                background: "white",
                padding: "1.2rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>📅 Visit Date & Time *</label>
                <input
                  type="datetime-local"
                  name="visitDate"
                  required
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    transition: "all 0.3s ease"
                  }}
                />
              </div>
              <div className="form-group" style={{
                background: "white",
                padding: "1.2rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>🪪 ID Type</label>
                <select name="idType" style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "all 0.3s ease"
                }}>
                  <option value="">Select ID Type</option>
                  <option value="License">License</option>
                  <option value="Passport">Passport</option>
                  <option value="NIC">NIC</option>
                </select>
              </div>
              <div className="form-group" style={{
                background: "white",
                padding: "1.2rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>🔢 ID Number</label>
                <input
                  name="idNumber"
                  placeholder="ID number"
                  maxLength="20"
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    transition: "all 0.3s ease"
                  }}
                />
              </div>
              <div className="form-group" style={{
                background: "white",
                padding: "1.2rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>📱 Contact Number (10 digits) *</label>
                <input
                  type="tel"
                  name="contact"
                  placeholder="10-digit phone (digits only)"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  required
                  title="Must be exactly 10 digits"
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    transition: "all 0.3s ease"
                  }}
                />
              </div>
              <div className="form-group full-width" style={{
                background: "white",
                padding: "1.2rem",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <label style={{ fontWeight: "600", color: "#333", display: "block", marginBottom: "0.6rem" }}>📝 Notes</label>
                <textarea
                  name="notes"
                  placeholder="Additional notes or special requests"
                  maxLength="500"
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontFamily: "inherit",
                    resize: "vertical",
                    transition: "all 0.3s ease"
                  }}
                ></textarea>
              </div>
              <button
                type="submit"
                className="btn-primary visitor-submit-btn"
                disabled={submittingVisitor}
                style={{
                  gridColumn: "1 / -1",
                  padding: "1rem",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: submittingVisitor ? "not-allowed" : "pointer",
                  opacity: submittingVisitor ? 0.7 : 1,
                  transition: "all 0.3s ease"
                }}
              >
                {submittingVisitor ? "🔄 Sending Request..." : "✉️ Send Request"}
              </button>
            </form>
          )}

          <h3 style={{ marginTop: "2rem", marginBottom: "1rem", fontSize: "1.3rem", color: "#333" }}>📋 Your Visitor Passes</h3>
          {visitorPasses.length === 0 ? (
            <div style={{
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              color: "#666"
            }}>
              <p style={{ fontSize: "1rem" }}>No visitor passes yet</p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: "1.5rem"
            }}>
              {visitorPasses.map((p) => (
                <div key={p._id} style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  borderLeft: p.passCode ? "5px solid #10b981" : "5px solid #f59e0b",
                  transition: "all 0.3s ease"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#333" }}>{p.visitorName}</h3>
                    {p.passCode ? (
                      <span style={{
                        background: "#10b981",
                        color: "white",
                        padding: "0.4rem 0.8rem",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: "600"
                      }}>✓ Generated</span>
                    ) : (
                      <span style={{
                        background: "#f59e0b",
                        color: "white",
                        padding: "0.4rem 0.8rem",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: "600"
                      }}>⏳ Pending</span>
                    )}
                  </div>
                  {p.purpose && <p style={{ margin: "0.5rem 0", color: "#666", fontSize: "0.95rem" }}>📋 <strong>Purpose:</strong> {p.purpose}</p>}
                  <p style={{ margin: "0.5rem 0", color: "#666", fontSize: "0.95rem" }}>📅 <strong>Visit:</strong> {new Date(p.visitDate).toLocaleString()}</p>
                  {p.passCode && (
                    <p style={{
                      margin: "1rem 0 0 0",
                      padding: "1rem",
                      background: "#f0f9ff",
                      borderRadius: "8px",
                      color: "#10b981",
                      fontWeight: "600",
                      fontSize: "1.1rem",
                      textAlign: "center",
                      fontFamily: "monospace"
                    }}>🎫 {p.passCode}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

    </div>
  );
}
