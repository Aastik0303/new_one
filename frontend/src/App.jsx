import { useState, useEffect } from "react";
import Header from "./components/Header.jsx";
import TabBar from "./components/TabBar.jsx";
import ChatTab from "./components/ChatTab.jsx";
import DeepfakeTab from "./components/DeepfakeTab.jsx";
import DataTab from "./components/DataTab.jsx";
import ParticleBackground from "./components/ParticleBackground.jsx";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export default function App() {
  const [activeTab, setActiveTab] = useState("chat");
  const [sessionId] = useState(() => `sess_${Date.now()}`);

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "var(--bg-void)", position: "relative", overflow: "hidden"
    }}>
      <ParticleBackground />

      {/* Scanline overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)"
      }} />

      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header />
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {activeTab === "chat" && <ChatTab sessionId={sessionId} />}
          {activeTab === "deepfake" && <DeepfakeTab />}
          {activeTab === "data" && <DataTab sessionId={sessionId} />}
        </main>
      </div>
    </div>
  );
}
