import { useState, useEffect } from "react";

export default function Header() {
  const [time, setTime] = useState(new Date());
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    fetch("https://new-one-8.onrender.com/api/health")
      .then(r => r.ok && setOnline(true))
      .catch(() => setOnline(false));
    return () => clearInterval(t);
  }, []);

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 24px",
      borderBottom: "1px solid var(--border)",
      background: "rgba(8,8,23,0.8)",
      backdropFilter: "blur(20px)",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "linear-gradient(135deg, var(--cyan), var(--violet))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 900, color: "white",
          boxShadow: "0 0 16px rgba(0,229,255,0.4)",
        }}>N</div>

        <div>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700,
            background: "linear-gradient(90deg, var(--cyan), var(--violet-bright))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "0.08em",
          }}>NEURALNEXUS</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", fontFamily: "var(--font-mono)" }}>
            MULTI-AGENT AI PLATFORM
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: online ? "var(--green)" : "var(--red)",
            boxShadow: online ? "0 0 8px var(--green)" : "none",
            animation: online ? "pulse-glow 2s infinite" : "none",
          }} />
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {online ? "BACKEND ONLINE" : "OFFLINE"}
          </span>
        </div>

        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--cyan-dim)", letterSpacing: "0.1em",
          padding: "4px 10px", borderRadius: 6,
          border: "1px solid var(--border)",
          background: "rgba(0,229,255,0.04)",
        }}>
          {time.toLocaleTimeString()}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {["Gemini 2.5", "Groq Llama"].map((m, i) => (
            <div key={m} style={{
              fontSize: 10, padding: "3px 10px", borderRadius: 20,
              border: `1px solid ${i === 0 ? "var(--cyan)" : "var(--violet-bright)"}`,
              color: i === 0 ? "var(--cyan)" : "var(--violet-bright)",
              background: i === 0 ? "rgba(0,229,255,0.06)" : "rgba(168,85,247,0.06)",
              fontFamily: "var(--font-mono)", letterSpacing: "0.05em",
            }}>{m}</div>
          ))}
        </div>
      </div>
    </header>
  );
}
