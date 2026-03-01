import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import Section from "../components/Section.jsx";

export default function ScanQRPage() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyPass = async (passCode, resetForm = false) => {
    if (!passCode) {
      setError("Please enter or scan a pass code");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const pass = await apiFetch(`/visitors/scan?code=${encodeURIComponent(passCode)}`);

      setResult({
        passCode: pass.passCode,
        visitorName: pass.visitorName,
        purpose: pass.purpose || "—",
        visitDate: new Date(pass.visitDate).toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        studentName: pass.studentName || "Unknown Student",
        studentEmail: pass.studentEmail || "N/A",
        studentRoom: pass.roomNumber || "N/A",
        studentFaculty: pass.faculty || "Not specified",
        idType: pass.idType || "N/A",
        idNumber: pass.idNumber || "N/A",
        contact: pass.contact || "N/A",
        notes: pass.notes || "None"
      });

      if (resetForm) {
        resetForm.reset();
      }
    } catch (err) {
      setError(err.message || "Failed to verify pass");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") || "";
    if (code) {
      verifyPass(code);
    }
  }, []);

  const handleManualScan = async (e) => {
    e.preventDefault();
    const passCode = e.target.passCode.value.trim();
    await verifyPass(passCode, e.target);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <Section title="🔐 QR Pass Scanner">
        <div className="form-group" style={{ marginBottom: "20px" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: "15px" }}>
            Scan the visitor pass QR code or enter the pass code manually
          </p>

          <form onSubmit={handleManualScan} className="form-grid">
            <div className="form-group">
              <label>Pass Code *</label>
              <input
                type="text"
                name="passCode"
                placeholder="e.g., VIS-ABC123"
                required
                style={{ fontFamily: "monospace", fontSize: "16px" }}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Verifying..." : "Verify Pass"}
            </button>
          </form>
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              color: "#dc2626",
              marginBottom: "20px"
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div
            style={{
              padding: "20px",
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))",
              border: "2px solid #22c55e",
              borderRadius: "12px",
              marginTop: "20px"
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ color: "var(--primary)", marginBottom: "8px" }}>
                ✅ Pass Verified
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                Student details only
              </p>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "16px", borderRadius: "8px" }}>
              <p style={{ marginBottom: "8px" }}>
                <strong>Name:</strong> {result.studentName}
              </p>
              <p style={{ marginBottom: "8px" }}>
                <strong>Faculty:</strong> {result.studentFaculty}
              </p>
              <p>
                <strong>Room:</strong> {result.studentRoom}
              </p>
            </div>

            <button
              onClick={() => setResult(null)}
              style={{
                marginTop: "16px",
                padding: "10px 20px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              Scan Another Pass
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}
