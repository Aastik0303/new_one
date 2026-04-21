"""
FastAPI Application Entry Point
Multi-Agent AI Platform
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from config import settings
from routers import chat, deepfake, data_analysis

app = FastAPI(
    title="Multi-Agent AI Platform",
    description="Full-stack AI platform with multi-agent chat, deepfake detection, and data analysis.",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chat.router)
app.include_router(deepfake.router)
app.include_router(data_analysis.router)

# Ensure model directory exists
os.makedirs("models", exist_ok=True)


@app.get("/")
async def root():
    return {
        "status": "online",
        "name": "Multi-Agent AI Platform",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "deepfake": "/api/deepfake",
            "data": "/api/data",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=True,
    )
