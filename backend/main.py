"""
FastAPI Application — NeuralNexus Multi-Agent AI Platform
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from config import settings
from routers import chat, deepfake, data_analysis

app = FastAPI(
    title="NeuralNexus — Multi-Agent AI Platform",
    description="Full-stack AI: multi-agent chat, deepfake detection, and data analysis.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(deepfake.router)
app.include_router(data_analysis.router)

os.makedirs("models", exist_ok=True)


@app.get("/")
async def root():
    return {
        "status": "online",
        "name": "NeuralNexus",
        "version": "2.0.0",
        "docs": "/docs",
    }


# Both /health and /api/health work (Header.jsx uses /api/health via Vite proxy)
@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    # Render (and most PaaS) injects $PORT — must bind to it or deploy fails
    port = int(os.environ.get("PORT", settings.APP_PORT))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
