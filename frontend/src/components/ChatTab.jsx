import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "../utils/api";
import MessageBubble from "./MessageBubble";
import AgentSelector from "./AgentSelector";

const SESSION_ID = "session_" + Math.random().toString(36).slice(2, 9);

const AGENT_COLORS = {
  general: "#00d4ff",
  code: "#8b5cf6",
  document: "#ffd700",
  youtube: "#ff2d78",
  researcher: "#00ff88",
};

const AGENT_ICONS = {
  general: "🤖",
  code: "💻",
  document: "📄",
  youtube: "▶️",
  researcher: "🔬",
};

export default function ChatTab() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to **NeuralNexus** — your multi-agent AI platform.\n\nI automatically route your messages to the best agent:\n- 🤖 **General Chatbot** — Gemini 2.5 Flash\n- 💻 **Code Agent** — Groq Llama 3.3 70B\n- 📄 **Document RAG** — Upload PDFs and chat\n- ▶️ **YouTube RAG** — Paste a YouTube URL\n- 🔬 **Deep Researcher** — Web search + synthesis\n\nOr select an agent manually below.",
      agent: null,
    }
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agents, setAgents] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.listAgents().then(d => setAgents(d.agents || [])).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setStreaming(true);
    setActiveAgent(null);

    let assistantContent = "";
    let detectedAgent = null;

    setMessages(prev => [...prev, { role: "assistant", content: "", agent: null, loading: true }]);

    try {
      for await (const chunk of api.chatStream(text, SESSION_ID, selectedAgent)) {
        if (chunk.startsWith("__AGENT__") && chunk.endsWith("__")) {
          detectedAgent = chunk.slice(9, -2);
          setActiveAgent(detectedAgent);
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              agent: detectedAgent,
              loading: false,
            };
            return updated;
          });
          continue;
        }
        assistantContent += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: assistantContent,
            loading: false,
          };
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `❌ Connection error: ${err.message}`,
          loading: false,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, streaming, selectedAgent]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadStatus(`Uploading ${file.name}...`);
    try {
      const res = await api.uploadDocument(file, SESSION_ID);
      setUploadStatus("");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `📄 ${res.message || "Document uploaded successfully."}`,
        agent: "document",
      }]);
    } catch (err) {
      setUploadStatus("Upload failed: " + err.message);
    }
  };

  const accentColor = activeAgent ? AGENT_COLORS[activeAgent] : "var(--cyan)";

  return (
    <div style={{ display: "flex", height: "100%", background: "var(--bg-void)" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: "var(--bg-deep)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        padding: "16px 12px", gap: 8, overflowY: "auto",
      }}>
        <p style={{ fontSize: 10, letterSpacing: 2, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
          SELECT AGENT
        </p>

        <button
          onClick={() => setSelectedAgent(null)}
          style={{
            padding: "10px 12px", borderRadius: "var(--radius)", textAlign: "left",
            border: selectedAgent === null ? "1px solid var(--cyan)" : "1px solid var(--border)",
            background: selectedAgent === null ? "var(--cyan-glow)" : "transparent",
            color: selectedAgent === null ? "var(--cyan)" : "var(--text-secondary)",
            fontSize: 12, fontWeight: 600, transition: "all var(--transition)",
          }}
        >
          ⚡ Auto-Route
        </button>

        {agents.map(agent => (
          <button
            key={agent.key}
            onClick={() => setSelectedAgent(agent.key)}
            style={{
              padding: "10px 12px", borderRadius: "var(--radius)", textAlign: "left",
              border: selectedAgent === agent.key
                ? `1px solid ${AGENT_COLORS[agent.key]}` : "1px solid var(--border)",
              background: selectedAgent === agent.key
                ? `${AGENT_COLORS[agent.key]}15` : "transparent",
              color: selectedAgent === agent.key ? AGENT_COLORS[agent.key] : "var(--text-secondary)",
              fontSize: 12, transition: "all var(--transition)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 600 }}>{AGENT_ICONS[agent.key]} {agent.name}</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2, lineHeight: 1.4 }}>{agent.description?.slice(0, 60)}...</div>
          </button>
        ))}

        <div style={{ marginTop: "auto" }}>
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx" style={{ display: "none" }} onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: "var(--radius)",
              border: "1px dashed var(--border-bright)",
              background: "transparent", color: "var(--text-secondary)",
              fontSize: 12, cursor: "pointer", transition: "all var(--transition)",
            }}
            onMouseOver={e => e.target.style.borderColor = "var(--yellow)"}
            onMouseOut={e => e.target.style.borderColor = "var(--border-bright)"}
          >
            📎 Upload Doc
          </button>
          {uploadStatus && (
            <p style={{ fontSize: 11, color: "var(--cyan)", marginTop: 6, textAlign: "center" }}>{uploadStatus}</p>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Active Agent Banner */}
        {activeAgent && (
          <div style={{
            padding: "6px 20px", fontSize: 11, fontFamily: "var(--font-mono)",
            background: `${AGENT_COLORS[activeAgent]}10`,
            borderBottom: `1px solid ${AGENT_COLORS[activeAgent]}30`,
            color: AGENT_COLORS[activeAgent],
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ animation: "blink 1s infinite" }}>●</span>
            {AGENT_ICONS[activeAgent]} {agents.find(a => a.key === activeAgent)?.name || activeAgent} — responding
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} agentColors={AGENT_COLORS} agentIcons={AGENT_ICONS} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: "16px 24px",
          background: "var(--bg-deep)",
          borderTop: `1px solid ${streaming ? accentColor + "40" : "var(--border)"}`,
          transition: "border-color 0.3s",
        }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "var(--bg-card)",
            border: `1px solid ${streaming ? accentColor + "60" : "var(--border)"}`,
            borderRadius: "var(--radius-lg)", padding: "10px 14px",
            transition: "border-color 0.3s",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedAgent
                ? `Message ${AGENT_ICONS[selectedAgent]} ${agents.find(a => a.key === selectedAgent)?.name || selectedAgent}...`
                : "Message NeuralNexus... (auto-routes to best agent)"}
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "var(--text-primary)", fontSize: 14, resize: "none",
                maxHeight: 120, overflowY: "auto", lineHeight: 1.5,
              }}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: "50%", border: "none", flexShrink: 0,
                background: streaming || !input.trim()
                  ? "var(--border)" : `linear-gradient(135deg, ${accentColor}, var(--purple))`,
                color: "white", fontSize: 16, display: "flex",
                alignItems: "center", justifyContent: "center",
                transition: "all var(--transition)", cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
              }}
            >
              {streaming
                ? <span style={{ width: 14, height: 14, border: "2px solid #ffffff60", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "block" }} />
                : "↑"}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 10, color: "var(--text-muted)", marginTop: 8, fontFamily: "var(--font-mono)" }}>
            ENTER to send · SHIFT+ENTER for new line · Session: {SESSION_ID}
          </p>
        </div>
      </div>
    </div>
  );
}
