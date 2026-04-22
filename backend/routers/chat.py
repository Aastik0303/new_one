import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import tempfile, os
from agents.orchestrator import orchestrator

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    agent: str | None = None  # Optional override


@router.get("/agents")
async def list_agents():
    return {"agents": orchestrator.list_agents()}


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    async def event_stream():
        try:
            async for chunk in orchestrator.run(
                message=request.message,
                session_id=request.session_id,
                agent_override=request.agent,
            ):
                if chunk:
                    yield f"data: {chunk}\n\n"
        except Exception as e:
            yield f"data: ❌ Error: {str(e)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form("default"),
):
    if not file.filename.endswith((".pdf", ".txt", ".docx")):
        raise HTTPException(400, "Only PDF, TXT, DOCX files are supported.")

    with tempfile.NamedTemporaryFile(
        delete=False, suffix=os.path.splitext(file.filename)[1]
    ) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        doc_agent = orchestrator.get_agent("document")
        result = await doc_agent.ingest_document(tmp_path, session_id, file.filename)
    finally:
        os.unlink(tmp_path)

    return {"message": result, "filename": file.filename}
