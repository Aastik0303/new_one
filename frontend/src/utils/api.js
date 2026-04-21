const BASE = "/api";

export const api = {
  listAgents: () => fetch(`${BASE}/chat/agents`).then(r => r.json()),

  chatStream: async function* (message, sessionId, agent) {
    const res = await fetch(`${BASE}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId, agent }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const chunk = line.slice(6);
          if (chunk === "[DONE]") return;
          yield chunk;
        }
      }
    }
  },

  uploadDocument: (file, sessionId) => {
    const form = new FormData();
    form.append("file", file);
    form.append("session_id", sessionId);
    return fetch(`${BASE}/chat/upload-document`, { method: "POST", body: form }).then(r => r.json());
  },

  detectDeepfake: (file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/deepfake/detect`, { method: "POST", body: form }).then(r => r.json());
  },
  deepfakeStatus: () => fetch(`${BASE}/deepfake/status`).then(r => r.json()),

  uploadCSV: (file, sessionId) => {
    const form = new FormData();
    form.append("file", file);
    form.append("session_id", sessionId);
    return fetch(`${BASE}/data/upload`, { method: "POST", body: form }).then(r => r.json());
  },
  getEDA: (sessionId) => fetch(`${BASE}/data/eda/${sessionId}`).then(r => r.json()),
  generatePlot: (payload) =>
    fetch(`${BASE}/data/plot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => r.json()),
  previewData: (sessionId, rows = 50) =>
    fetch(`${BASE}/data/preview/${sessionId}?rows=${rows}`).then(r => r.json()),
};
