// Simple markdown renderer without external deps
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  let codeBlock = null;
  let codeLines = [];
  let codeLang = "";

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (!codeBlock) {
        codeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        elements.push(
          <div key={`code-${i}`} style={{
            background: "#0a0a18", border: "1px solid #2a2a45",
            borderRadius: 8, overflow: "hidden", margin: "12px 0",
          }}>
            {codeLang && (
              <div style={{
                padding: "4px 12px", background: "#13131f",
                borderBottom: "1px solid #2a2a45",
                fontSize: 11, color: "#8b5cf6", fontFamily: "var(--font-mono)",
              }}>{codeLang}</div>
            )}
            <pre style={{
              padding: "12px 14px", margin: 0, overflowX: "auto",
              fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.6,
              color: "#c8d3f5", whiteSpace: "pre-wrap",
            }}>
              <code>{codeLines.join("\n")}</code>
            </pre>
          </div>
        );
        codeBlock = false;
        codeLines = [];
        codeLang = "";
      }
      i++;
      continue;
    }

    if (codeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} style={{ color: "#00d4ff", fontSize: 14, marginTop: 14, marginBottom: 6, fontWeight: 700 }}>{formatInline(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} style={{ color: "#8b5cf6", fontSize: 16, marginTop: 16, marginBottom: 8, fontWeight: 700 }}>{formatInline(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} style={{ color: "#00d4ff", fontSize: 18, marginTop: 16, marginBottom: 8, fontWeight: 900 }}>{formatInline(line.slice(2))}</h1>);
    } else if (line.match(/^[-*] /)) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, margin: "3px 0", paddingLeft: 8 }}>
          <span style={{ color: "#00d4ff", flexShrink: 0, marginTop: 2 }}>▸</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)[1];
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, margin: "3px 0", paddingLeft: 8 }}>
          <span style={{ color: "#8b5cf6", flexShrink: 0, fontWeight: 700, minWidth: 18 }}>{num}.</span>
          <span>{formatInline(line.replace(/^\d+\. /, ""))}</span>
        </div>
      );
    } else if (line === "---") {
      elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #2a2a45", margin: "12px 0" }} />);
    } else if (!line.trim()) {
      elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      elements.push(<p key={i} style={{ margin: "2px 0", lineHeight: 1.7 }}>{formatInline(line)}</p>);
    }
    i++;
  }
  return elements;
}

function formatInline(text) {
  if (!text) return "";
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  const processed = [];

  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      processed.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      processed.push(<strong key={key++} style={{ color: "#e8e8ff", fontWeight: 700 }}>{match[2]}</strong>);
    } else if (match[3]) {
      processed.push(<em key={key++} style={{ color: "#c8d3f5" }}>{match[3]}</em>);
    } else if (match[4]) {
      processed.push(<code key={key++} style={{
        background: "#1a1a30", padding: "1px 5px", borderRadius: 4,
        fontFamily: "var(--font-mono)", fontSize: "0.9em", color: "#00d4ff",
      }}>{match[4]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) processed.push(text.slice(lastIndex));
  return processed.length > 0 ? processed : text;
}

export default function MessageBubble({ message, agentColors, agentIcons }) {
  const isUser = message.role === "user";
  const agentColor = message.agent ? (agentColors[message.agent] || "#00d4ff") : "#00d4ff";
  const agentIcon = message.agent ? (agentIcons[message.agent] || "🤖") : "🤖";

  return (
    <div className="fade-in" style={{
      display: "flex", flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      gap: 4,
    }}>
      {!isUser && message.agent && (
        <div style={{
          fontSize: 10, fontFamily: "var(--font-mono)",
          color: agentColor, display: "flex", alignItems: "center", gap: 4,
          paddingLeft: 4,
        }}>
          {agentIcon} <span style={{ opacity: 0.7 }}>{message.agent?.toUpperCase()} AGENT</span>
        </div>
      )}
      <div style={{
        maxWidth: isUser ? "72%" : "90%",
        padding: "10px 14px",
        borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
        background: isUser
          ? "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))"
          : "var(--bg-card)",
        border: isUser
          ? "1px solid rgba(0,212,255,0.3)"
          : `1px solid ${message.agent ? agentColor + "20" : "var(--border)"}`,
        color: "var(--text-primary)",
        fontSize: 13.5, lineHeight: 1.65,
        boxShadow: !isUser && message.agent ? `0 0 20px ${agentColor}08` : "none",
        position: "relative",
      }}>
        {message.loading ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
            {[0, 1, 2].map(d => (
              <div key={d} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: agentColor, opacity: 0.7,
                animation: `blink 1.2s ${d * 0.2}s infinite`,
              }} />
            ))}
          </div>
        ) : (
          <div>{renderMarkdown(message.content)}</div>
        )}
      </div>
    </div>
  );
}
