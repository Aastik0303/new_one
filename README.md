# NeuralNexus — Multi-Agent AI Platform

A futuristic multi-agent AI frontend built with React + Vite, powered by the NeuralNexus backend.

## Features

- **Multi-Agent Chat** — Auto-routes messages to the best agent (General, Code, Document RAG, YouTube RAG, Deep Researcher)
- **Data Analysis** — Upload CSV/TSV/XLSX for EDA, stats, correlation matrix, and chart generation

## Tech Stack

- React 18 + Vite
- Backend: `https://new-one-8.onrender.com`

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

## Build for Production

```bash
npm run build
```

## Project Structure

```
frontend/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── utils/
    │   └── api.js
    └── components/
        ├── Header.jsx
        ├── TabBar.jsx
        ├── ChatTab.jsx
        ├── DataTab.jsx
        ├── MessageBubble.jsx
        ├── ParticleBackground.jsx
        └── AgentSelector.jsx
```
