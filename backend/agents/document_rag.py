from typing import AsyncGenerator
import os
import tempfile
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, SystemMessage
from .base import BaseAgent
from config import settings


class DocumentRAGAgent(BaseAgent):
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
        self.memories: dict[str, ConversationBufferMemory] = {}
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=200
        )

    def get_name(self) -> str:
        return "Document RAG"

    def get_description(self) -> str:
        return "Upload and chat with documents (PDF, TXT, DOCX) using RAG with Gemini embeddings."

    async def ingest_document(self, file_path: str, session_id: str, filename: str) -> str:
        """Load, chunk, embed and store a document."""
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".pdf":
            loader = PyPDFLoader(file_path)
        elif ext == ".docx":
            loader = Docx2txtLoader(file_path)
        else:
            loader = TextLoader(file_path)

        docs = loader.load()
        chunks = self.text_splitter.split_documents(docs)

        if session_id in self.vectorstores:
            self.vectorstores[session_id].add_documents(chunks)
        else:
            self.vectorstores[session_id] = FAISS.from_documents(chunks, self.embeddings)

        return f"Successfully ingested {len(chunks)} chunks from '{filename}'."

    async def run(self, message: str, session_id: str = "default") -> AsyncGenerator[str, None]:
        if session_id not in self.vectorstores:
            yield "⚠️ No documents loaded yet. Please upload a document first."
            return

        if session_id not in self.memories:
            self.memories[session_id] = ConversationBufferMemory(
                memory_key="chat_history", return_messages=True
            )

        retriever = self.vectorstores[session_id].as_retriever(search_kwargs={"k": 4})
        relevant_docs = retriever.get_relevant_documents(message)
        context = "\n\n".join([d.page_content for d in relevant_docs])

        prompt = f"""Based on the following document context, answer the question.
If the answer is not in the context, say so clearly.

Context:
{context}

Question: {message}"""

        async for chunk in self.llm.astream([HumanMessage(content=prompt)]):
            yield chunk.content
