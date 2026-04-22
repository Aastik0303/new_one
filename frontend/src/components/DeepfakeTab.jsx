import { useState, useRef, useCallback } from "react";
import { api } from "../utils/api";

export default function DeepfakeTab() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    setError("");
    setResult(null);
    setImage(file);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.detectDeepfake(image);
      setResult(res);
    } catch (err) {
      setError("Analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isReal = result?.verdict === "REAL";
  const verdictColor = result ? (isReal ? "#00ff88" : "#ff2d78") : "#00d4ff";
  const fakeProb = result ? result.fake_probability : 0;
  const realProb = result ? result.real_probability : 0;

  return (
    <div style={{
      flex: 1, display: "flex", height: "100%", background: "var(--bg-void)",
      gap: 0, overflow: "hidden",
    }}>
      {/* Left Panel - Upload */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 40, gap: 24,
        borderRight: "1px solid var(--border)",
      }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900,
            background: "linear-gradient(90deg, #ff2d78, #8b5cf6)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: 2, marginBottom: 8,
          }}>DEEPFAKE DETECTOR</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Upload a face image to detect AI manipulation
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%", maxWidth: 400, aspectRatio: "1",
            border: `2px dashed ${dragging ? "#ff2d78" : preview ? "#ff2d7840" : "var(--border-bright)"}`,
            borderRadius: 16, cursor: "pointer",
            background: dragging ? "rgba(255,45,120,0.05)" : "var(--bg-card)",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", transition: "all 0.25s", position: "relative",
            overflow: "hidden",
          }}
        >
          {preview ? (
            <>
              <img src={preview} alt="preview" style={{
                width: "100%", height: "100%", objectFit: "cover", borderRadius: 14,
              }} />
              {/* Scan line effect */}
              {loading && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(transparent 0%, rgba(255,45,120,0.15) 50%, transparent 100%)",
                  backgroundSize: "100% 40%",
                  animation: "scan 1.5s linear infinite",
                  pointerEvents: "none",
                }} />
              )}
              {result && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
                }}>
                  <div style={{
                    fontSize: 52, border: `4px solid ${verdictColor}`,
                    borderRadius: "50%", width: 100, height: 100,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 40px ${verdictColor}60`,
                  }}>
                    {isReal ? "✓" : "✗"}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>◈</div>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center" }}>
                Drop image here<br />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>or click to browse</span>
              </p>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])} />

        {error && <p style={{ color: "#ff2d78", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          {preview && (
            <button onClick={() => { setImage(null); setPreview(null); setResult(null); }} style={{
              padding: "10px 20px", borderRadius: "var(--radius)",
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
            }}>Clear</button>
          )}
          <button
            onClick={analyze}
            disabled={!image || loading}
            style={{
              padding: "12px 32px", borderRadius: "var(--radius)",
              border: "none",
              background: !image || loading ? "var(--border)" : "linear-gradient(135deg, #ff2d78, #8b5cf6)",
              color: "white", fontSize: 14, fontWeight: 700, cursor: !image || loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-display)", letterSpacing: 1,
              boxShadow: !image || loading ? "none" : "0 0 20px rgba(255,45,120,0.4)",
            }}
          >
            {loading ? "SCANNING..." : "ANALYZE IMAGE"}
          </button>
        </div>
      </div>

      {/* Right Panel - Results */}
      <div style={{
        width: 360, flexShrink: 0,
        background: "var(--bg-deep)", padding: 32,
        display: "flex", flexDirection: "column", gap: 20, overflowY: "auto",
      }}>
        <h3 style={{
          fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: 2,
          color: "var(--text-muted)", borderBottom: "1px solid var(--border)", paddingBottom: 12,
        }}>ANALYSIS RESULTS</h3>

        {!result && !loading && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, opacity: 0.4 }}>
            <div style={{ fontSize: 56 }}>◎</div>
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
              Upload an image and click<br />Analyze to see results
            </p>
          </div>
        )}

        {loading && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              border: "3px solid var(--border)",
              borderTopColor: "#ff2d78",
              animation: "spin 1s linear infinite",
            }} />
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Scanning image...</p>
          </div>
        )}

        {result && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Verdict */}
            <div style={{
              padding: 20, borderRadius: 12, textAlign: "center",
              border: `1px solid ${verdictColor}40`,
              background: `${verdictColor}08`,
              boxShadow: `0 0 30px ${verdictColor}15`,
            }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>VERDICT</div>
              <div style={{
                fontSize: 36, fontWeight: 900, fontFamily: "var(--font-display)",
                color: verdictColor, letterSpacing: 3,
              }}>{result.verdict}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                {result.confidence?.toFixed(1)}% confidence
              </div>
            </div>

            {/* Probability Bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <ProbBar label="REAL" value={realProb} color="#00ff88" />
              <ProbBar label="FAKE" value={fakeProb} color="#ff2d78" />
            </div>

            {/* Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <StatCard label="Fake Prob" value={`${(fakeProb * 100).toFixed(1)}%`} color="#ff2d78" />
              <StatCard label="Real Prob" value={`${(realProb * 100).toFixed(1)}%`} color="#00ff88" />
              <StatCard label="Confidence" value={`${result.confidence?.toFixed(1)}%`} color="#00d4ff" />
              <StatCard label="Model" value={result.model_used || "tflite"} color="#8b5cf6" />
            </div>

            {result.note && (
              <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)",
                fontSize: 11, color: "#ffd700", lineHeight: 1.5,
              }}>
                ℹ️ {result.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProbBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div style={{ height: 8, background: "var(--bg-elevated)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value * 100}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: 99, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: `0 0 10px ${color}60`,
        }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      padding: "12px", borderRadius: 8,
      background: "var(--bg-card)", border: "1px solid var(--border)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
