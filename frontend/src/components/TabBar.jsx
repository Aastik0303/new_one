const TABS = [
  { id: "chat", label: "Multi-Agent Chat", icon: "◈", sub: "5 Specialized Agents" },
  { id: "data", label: "Data Analysis",   icon: "◇", sub: "EDA & Visualization" },
];

export default function TabBar({ activeTab, setActiveTab }) {
  return (
    <div style={{
      display: "flex", gap: 0,
      borderBottom: "1px solid var(--border)",
      background: "rgba(8,8,23,0.6)",
      backdropFilter: "blur(16px)",
      flexShrink: 0, padding: "0 24px",
    }}>
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 24px",
            border: "none", background: "none",
            borderBottom: active ? "2px solid var(--cyan)" : "2px solid transparent",
            color: active ? "var(--cyan)" : "var(--text-secondary)",
            cursor: "pointer", transition: "all var(--transition)",
            position: "relative",
          }}>
            <span style={{ fontSize: 18, opacity: active ? 1 : 0.5 }}>{tab.icon}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{
                fontWeight: 600, letterSpacing: "0.02em",
                fontFamily: "var(--font-display)", fontSize: 11,
              }}>{tab.label}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{tab.sub}</div>
            </div>
            {active && (
              <div style={{
                position: "absolute", bottom: -1, left: 0, right: 0, height: 2,
                background: "linear-gradient(90deg, transparent, var(--cyan), transparent)",
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
