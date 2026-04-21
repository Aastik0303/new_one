import { useState, useRef, useCallback } from "react";
import { api } from "../utils/api";

const SESSION_ID = "data_" + Math.random().toString(36).slice(2, 7);

const PLOT_TYPES = [
  { id: "histogram", label: "Histogram", icon: "📊", needsX: true },
  { id: "scatter", label: "Scatter", icon: "✦", needsX: true, needsY: true },
  { id: "box", label: "Box Plot", icon: "⬛", needsX: true },
  { id: "heatmap", label: "Heatmap", icon: "🔥", needsNone: true },
  { id: "bar", label: "Bar Chart", icon: "▮", needsX: true },
  { id: "line", label: "Line Chart", icon: "↗", needsX: true, needsY: true },
  { id: "violin", label: "Violin", icon: "♫", needsX: true },
];

export default function DataAnalysisTab() {
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [eda, setEda] = useState(null);
  const [preview, setPreview] = useState(null);
  const [plots, setPlots] = useState([]);
  const [plotConfig, setPlotConfig] = useState({ plot_type: "histogram", x_col: "", y_col: "", hue_col: "" });
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await api.uploadCSV(file, SESSION_ID);
      if (res.error) throw new Error(res.error);
      setUploaded(true);
      setPreview(res.preview);

      const edaRes = await api.getEDA(SESSION_ID);
      setEda(edaRes);

      if (edaRes.numeric_columns?.length) {
        setPlotConfig(c => ({ ...c, x_col: edaRes.numeric_columns[0], y_col: edaRes.numeric_columns[1] || "" }));
      }
      setActiveSection("overview");
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const generatePlot = async () => {
    setGenerating(true);
    setError("");
    try {
      const payload = { session_id: SESSION_ID, ...plotConfig };
      const res = await api.generatePlot(payload);
      if (res.error) throw new Error(res.error);
      setPlots(prev => [res, ...prev].slice(0, 12));
      setActiveSection("plots");
    } catch (err) {
      setError("Plot failed: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const allCols = eda ? [...(eda.numeric_columns || []), ...(eda.categorical_columns || [])] : [];
  const numCols = eda?.numeric_columns || [];

  if (!uploaded) {
    return (
      <UploadZone
        onFile={handleUpload} uploading={uploading} error={error}
        dragging={dragging} setDragging={setDragging} fileInputRef={fileInputRef}
      />
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg-void)", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, background: "var(--bg-deep)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", padding: "16px 12px", gap: 6, overflowY: "auto",
      }}>
        <p style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>NAVIGATION</p>
        {[
          { id: "overview", label: "📋 Overview", color: "#00d4ff" },
          { id: "preview", label: "🗃 Data Preview", color: "#ffd700" },
          { id: "eda", label: "🔍 EDA Stats", color: "#00ff88" },
          { id: "plots", label: "📈 Visualizations", color: "#8b5cf6" },
        ].map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
            padding: "10px 12px", borderRadius: "var(--radius)", textAlign: "left",
            border: activeSection === s.id ? `1px solid ${s.color}` : "1px solid var(--border)",
            background: activeSection === s.id ? `${s.color}12` : "transparent",
            color: activeSection === s.id ? s.color : "var(--text-secondary)",
            fontSize: 13, cursor: "pointer", transition: "all var(--transition)",
          }}>{s.label}</button>
        ))}

        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <p style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>GENERATE PLOT</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select value={plotConfig.plot_type}
              onChange={e => setPlotConfig(c => ({ ...c, plot_type: e.target.value }))}
              style={selectStyle}>
              {PLOT_TYPES.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
              ))}
            </select>

            {!PLOT_TYPES.find(p => p.id === plotConfig.plot_type)?.needsNone && (
              <select value={plotConfig.x_col} onChange={e => setPlotConfig(c => ({ ...c, x_col: e.target.value }))} style={selectStyle}>
                <option value="">X Column</option>
                {allCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {PLOT_TYPES.find(p => p.id === plotConfig.plot_type)?.needsY && (
              <select value={plotConfig.y_col} onChange={e => setPlotConfig(c => ({ ...c, y_col: e.target.value }))} style={selectStyle}>
                <option value="">Y Column</option>
                {numCols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            <button onClick={generatePlot} disabled={generating} style={{
              padding: "10px", borderRadius: "var(--radius)", border: "none",
              background: generating ? "var(--border)" : "linear-gradient(135deg, #00ff88, #00d4ff)",
              color: generating ? "var(--text-muted)" : "#000",
              fontWeight: 700, fontSize: 12, cursor: generating ? "not-allowed" : "pointer",
              fontFamily: "var(--font-display)", letterSpacing: 1,
            }}>
              {generating ? "GENERATING..." : "GENERATE"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: "auto" }}>
          <button onClick={() => { setUploaded(false); setEda(null); setPreview(null); setPlots([]); }} style={{
            width: "100%", padding: "8px", borderRadius: "var(--radius)",
            border: "1px dashed var(--border)", background: "transparent",
            color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
          }}>+ Upload New File</button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: "auto", padding: 28 }}>
        {error && (
          <div style={{ padding: "12px 16px", marginBottom: 16, borderRadius: 8, background: "rgba(255,45,120,0.1)", border: "1px solid #ff2d7840", color: "#ff2d78", fontSize: 13 }}>
            ❌ {error}
          </div>
        )}

        {activeSection === "overview" && eda && <OverviewSection eda={eda} />}
        {activeSection === "preview" && preview && <PreviewSection preview={preview} />}
        {activeSection === "eda" && eda && <EDASection eda={eda} />}
        {activeSection === "plots" && <PlotsSection plots={plots} />}
      </main>
    </div>
  );
}

function UploadZone({ onFile, uploading, error, dragging, setDragging, fileInputRef }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 24 }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900,
          background: "linear-gradient(90deg, #00ff88, #00d4ff)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: 2, marginBottom: 8,
        }}>DATA ANALYSIS ENGINE</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Upload CSV, TSV, or Excel to begin analysis</p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: 480, height: 240, borderRadius: 16, cursor: "pointer",
          border: `2px dashed ${dragging ? "#00ff88" : "var(--border-bright)"}`,
          background: dragging ? "rgba(0,255,136,0.05)" : "var(--bg-card)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
          transition: "all 0.25s",
        }}
      >
        {uploading ? (
          <>
            <div style={{ width: 48, height: 48, border: "3px solid var(--border)", borderTopColor: "#00ff88", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <p style={{ color: "#00ff88", fontSize: 14 }}>Processing file...</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 52, opacity: 0.4 }}>◎</div>
            <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>
              Drop your data file here<br />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>CSV • TSV • XLSX supported</span>
            </p>
          </>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept=".csv,.tsv,.xlsx" style={{ display: "none" }}
        onChange={e => onFile(e.target.files[0])} />
      {error && <p style={{ color: "#ff2d78", fontSize: 13 }}>{error}</p>}
    </div>
  );
}

function OverviewSection({ eda }) {
  const stats = [
    { label: "Rows", value: eda.shape?.[0]?.toLocaleString(), color: "#00d4ff" },
    { label: "Columns", value: eda.shape?.[1], color: "#8b5cf6" },
    { label: "Numeric Cols", value: eda.numeric_columns?.length, color: "#00ff88" },
    { label: "Categorical Cols", value: eda.categorical_columns?.length, color: "#ffd700" },
    { label: "Duplicate Rows", value: eda.duplicate_rows, color: "#ff8c42" },
    { label: "Memory", value: eda.memory_usage, color: "#ff2d78" },
  ];
  return (
    <div className="fade-in">
      <SectionHeader title="Dataset Overview" icon="📋" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            padding: "20px", borderRadius: 12,
            background: "var(--bg-card)", border: `1px solid ${s.color}20`,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color, fontFamily: "var(--font-display)" }}>{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ColumnList title="Numeric Columns" cols={eda.numeric_columns} color="#00ff88" />
        <ColumnList title="Categorical Columns" cols={eda.categorical_columns} color="#ffd700" />
      </div>

      {eda.null_counts && Object.keys(eda.null_counts).length > 0 && (
        <div style={{ marginTop: 14 }}>
          <NullsTable nullCounts={eda.null_counts} totalRows={eda.shape?.[0]} />
        </div>
      )}
    </div>
  );
}

function ColumnList({ title, cols, color }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
      <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>{title.toUpperCase()}</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(cols || []).map(c => (
          <span key={c} style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 12,
            background: `${color}15`, border: `1px solid ${color}30`, color,
          }}>{c}</span>
        ))}
        {(!cols || cols.length === 0) && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>None</span>}
      </div>
    </div>
  );
}

function NullsTable({ nullCounts, totalRows }) {
  const entries = Object.entries(nullCounts).filter(([, v]) => v > 0);
  if (!entries.length) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
      <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>MISSING VALUES</h4>
      {entries.map(([col, count]) => {
        const pct = ((count / totalRows) * 100).toFixed(1);
        return (
          <div key={col} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{col}</span>
              <span style={{ fontSize: 12, color: "#ff8c42" }}>{count} ({pct}%)</span>
            </div>
            <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "#ff8c42", borderRadius: 99 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PreviewSection({ preview }) {
  const cols = preview.columns || [];
  const data = preview.data || [];
  return (
    <div className="fade-in">
      <SectionHeader title="Data Preview" icon="🗃" subtitle={`${data.length} rows shown`} />
      <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--bg-elevated)" }}>
              {cols.map(col => (
                <th key={col} style={{
                  padding: "10px 12px", textAlign: "left",
                  color: "var(--cyan)", fontFamily: "var(--font-mono)",
                  fontSize: 11, letterSpacing: 0.5,
                  borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg-deep)" }}>
                {cols.map(col => (
                  <td key={col} style={{
                    padding: "8px 12px", borderBottom: "1px solid var(--border)",
                    color: "var(--text-secondary)", whiteSpace: "nowrap",
                    maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis",
                  }}>{String(row[col] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EDASection({ eda }) {
  const desc = eda.description || {};
  const cols = Object.keys(desc);
  return (
    <div className="fade-in">
      <SectionHeader title="Statistical Summary" icon="🔍" />
      {eda.correlation_matrix && (
        <div style={{ marginBottom: 20, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
          <h4 style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: 1, marginBottom: 12 }}>CORRELATION MATRIX</h4>
          <CorrelationMatrix matrix={eda.correlation_matrix} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {cols.slice(0, 12).map(col => (
          <div key={col} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
            <h5 style={{ color: "var(--cyan)", fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: "var(--font-mono)" }}>{col}</h5>
            {Object.entries(desc[col]).slice(0, 6).map(([stat, val]) => (
              <div key={stat} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{stat}</span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  {typeof val === "number" ? val.toFixed(3) : String(val)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrelationMatrix({ matrix }) {
  const cols = Object.keys(matrix);
  const getColor = (val) => {
    if (typeof val !== "number") return "transparent";
    const abs = Math.abs(val);
    if (val > 0) return `rgba(0,212,255,${abs * 0.8})`;
    return `rgba(255,45,120,${abs * 0.8})`;
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ padding: "4px 8px", color: "var(--text-muted)" }}></th>
            {cols.map(c => (
              <th key={c} style={{ padding: "4px 8px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map(row => (
            <tr key={row}>
              <td style={{ padding: "4px 8px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{row}</td>
              {cols.map(col => {
                const val = matrix[row]?.[col];
                return (
                  <td key={col} style={{
                    padding: "4px 8px", textAlign: "center",
                    background: getColor(val), borderRadius: 4,
                    color: Math.abs(val) > 0.5 ? "white" : "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                  }}>
                    {typeof val === "number" ? val.toFixed(2) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlotsSection({ plots }) {
  const [selected, setSelected] = useState(null);
  if (!plots.length) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.4 }}>
        <div style={{ fontSize: 56 }}>📈</div>
        <p style={{ color: "var(--text-muted)", textAlign: "center", fontSize: 13 }}>Generate plots using the sidebar controls</p>
      </div>
    );
  }
  return (
    <div className="fade-in">
      <SectionHeader title="Visualizations" icon="📈" subtitle={`${plots.length} plots generated`} />
      {selected !== null && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
        }} onClick={() => setSelected(null)}>
          <img src={`data:image/png;base64,${plots[selected].image}`} alt="plot"
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {plots.map((plot, i) => (
          <div key={i} onClick={() => setSelected(i)} style={{
            borderRadius: 12, overflow: "hidden",
            border: "1px solid var(--border)", cursor: "zoom-in",
            transition: "all var(--transition)",
          }}
            onMouseOver={e => e.currentTarget.style.borderColor = "var(--cyan)"}
            onMouseOut={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            <div style={{ padding: "8px 12px", background: "var(--bg-elevated)", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {plot.plot_type?.toUpperCase()} · {plot.title}
            </div>
            <img src={`data:image/png;base64,${plot.image}`} alt={plot.title}
              style={{ width: "100%", display: "block" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, icon, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
        <span>{icon}</span> {title}
      </h2>
      {subtitle && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
}

const selectStyle = {
  width: "100%", padding: "8px 10px", borderRadius: "var(--radius)",
  background: "var(--bg-card)", border: "1px solid var(--border)",
  color: "var(--text-primary)", fontSize: 12, outline: "none",
};
