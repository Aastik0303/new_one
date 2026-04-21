from typing import AsyncGenerator
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.messages import HumanMessage
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter
import re
from .base import BaseAgent
from config import settings


class YouTubeRAGAgent(BaseAgent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GOOGLE_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,
            streaming=True,
        )
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.GOOGLE_API_KEY,
        )
        self.vectorstores: dict[str, FAISS] = {}
        self.video_metadata: dict[str, dict] = {}
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800, chunk_overlap=150
        )

    def get_name(self) -> str:
        return "YouTube RAG"

    def get_description(self) -> str:
        return "Extract transcripts from YouTube videos and chat with the content."

    def _extract_video_id(self, url: str) -> str:
        patterns = [
            r"(?:v=|youtu\.be/|embed/|v/|shorts/)([a-zA-Z0-9_-]{11})",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        raise ValueError(f"Could not extract video ID from URL: {url}")

    async def ingest_youtube(self, url: str, session_id: str) -> str:
        video_id = self._extract_video_id(url)
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        formatter = TextFormatter()
        transcript_text = formatter.format_transcript(transcript_list)

        from langchain_core.documents import Document
        doc = Document(page_content=transcript_text, metadata={"source": url, "video_id": video_id})
        chunks = self.text_splitter.split_documents([doc])

        if session_id in self.vectorstores:
            self.vectorstores[session_id].add_documents(chunks)
        else:
            self.vectorstores[session_id] = FAISS.from_documents(chunks, self.embeddings)

        self.video_metadata[session_id] = {"video_id": video_id, "url": url}
        return f"✅ Ingested YouTube video transcript ({len(chunks)} chunks). You can now ask questions!"

    async def run(self, message: str, session_id: str = "default") -> AsyncGenerator[str, None]:
        # Check if message is a YouTube URL
        if "youtube.com" in message or "youtu.be" in message:
            try:
                result = await self.ingest_youtube(message.strip(), session_id)
                yield result
                return
            except Exception as e:
                yield f"❌ Failed to load YouTube video: {str(e)}"
                return

        if session_id not in self.vectorstores:
            yield "⚠️ No YouTube video loaded. Please send a YouTube URL first."
            return

        retriever = self.vectorstores[session_id].as_retriever(search_kwargs={"k": 5})
        relevant_docs = retriever.get_relevant_documents(message)
        context = "\n\n".join([d.page_content for d in relevant_docs])

        prompt = f"""You are analyzing a YouTube video transcript. Answer based on the content below.

Transcript Context:
{context}

Question: {message}

Provide a detailed answer based on the video content."""

        async for chunk in self.llm.astream([HumanMessage(content=prompt)]):
            yield chunk.content
