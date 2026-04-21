# 🧠 NeuralNexus — Multi-Agent AI Platform

A full-stack AI platform featuring a multi-agent chat system, deepfake detection, and interactive data analysis.

---

## 🏗 Architecture

```
project/
├── backend/                   # FastAPI + LangChain
│   ├── main.py                # App entry point
│   ├── config.py              # Settings from .env
│   ├── requirements.txt
│   ├── agents/
│   │   ├── orchestrator.py    # Routes messages to agents
│   │   ├── general_chatbot.py # Gemini 2.5 Flash
│   │   ├── code_agent.py      # Groq Llama 3.3 70B
│   │   ├── document_rag.py    # PDF/DOCX RAG
│   │   ├── youtube_rag.py     # YouTube transcript RAG
│   │   └── deep_researcher.py # Web search + scraping
│   ├── routers/
│   │   ├── chat.py            # /api/chat endpoints
│   │   ├── deepfake.py        # /api/deepfake endpoints
│   │   └── data_analysis.py   # /api/data endpoints
│   └── models/                # TFLite model goes here
│
├── frontend/                  # React + Vite
│   └── src/
│       ├── App.jsx            # Tab layout + navigation
│       ├── components/
│       │   ├── ChatTab.jsx        # Multi-agent chat UI
│       │   ├── MessageBubble.jsx  # Message renderer w/ markdown
│       │   ├── DeepfakeTab.jsx    # Upload & analyze images
│       │   └── DataAnalysisTab.jsx# CSV upload, EDA, plots
│       └── utils/api.js       # API client + SSE streaming
│
├── .env                       # API keys & config
├── start_backend.sh
├── start_frontend.sh
└── start_all.sh
```

---

## 🚀 Quick Start

### 1. Configure API Keys
Edit `.env` and add your keys:
```env
GOOGLE_API_KEY=your_google_api_key_here     # Gemini 2.5 Flash
GROQ_API_KEY=your_groq_api_key_here         # Llama 3.3 70B
SERPAPI_API_KEY=your_serpapi_key_here       # Optional for research
```

Get keys:
- Google: https://aistudio.google.com/apikey
- Groq: https://console.groq.com/keys

### 2. Start Backend
```bash
./start_backend.sh
# OR manually:
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
```

### 3. Start Frontend
```bash
./start_frontend.sh
# OR manually:
cd frontend && npm install && npm run dev
```

### 4. Open Browser
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

---

## 🤖 Agents

| Agent | Model | Trigger |
|-------|-------|---------|
| General Chatbot | Gemini 2.5 Flash | Default / casual questions |
| Code Agent | Groq Llama 3.3 70B | Code, debugging, algorithms |
| Document RAG | Gemini 2.5 Flash + FAISS | After uploading PDF/DOCX/TXT |
| YouTube RAG | Gemini 2.5 Flash + FAISS | Paste YouTube URL |
| Deep Researcher | Gemini 2.5 Flash + DuckDuckGo | Research queries |

The **orchestrator** auto-routes messages using keyword matching + Groq LLM classification.
You can also manually select an agent from the sidebar.

---

## 📡 API Endpoints

### Chat
- `GET  /api/chat/agents` — List all agents
- `POST /api/chat/stream` — SSE streaming chat
- `POST /api/chat/upload-document` — Upload document for RAG

### DeepFake
- `POST /api/deepfake/detect` — Analyze image
- `GET  /api/deepfake/status` — Check model status

### Data Analysis
- `POST /api/data/upload` — Upload CSV/TSV/XLSX
- `GET  /api/data/eda/{session_id}` — Get EDA statistics
- `POST /api/data/plot` — Generate visualization
- `GET  /api/data/preview/{session_id}` — Preview data

---

## 🔧 DeepFake Model Setup

Place a TFLite model at `backend/models/deepfake_model.tflite`.

Without a model, the API runs in **demo mode** using image statistics.
See `backend/models/README.md` for model conversion instructions.

---

## 🛠 Tech Stack

**Backend**: FastAPI · LangChain · Google Gemini 2.5 Flash · Groq Llama 3.3 · FAISS · TFLite · Pandas · Matplotlib · Seaborn

**Frontend**: React 18 · Vite · Server-Sent Events (SSE streaming)
