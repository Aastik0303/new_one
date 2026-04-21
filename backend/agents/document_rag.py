from typing import AsyncGenerator
import os
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
# UPDATED: Use the newer history and message classes
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
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
        # UPDATED: Store ChatMessageHistory instead of ConversationBufferMemory
        self.histories: dict[str, ChatMessageHistory] = {}
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=200
        )

    def get_name(self) -> str:
        return "Document RAG"

    def get_description(self) -> str:
        return "Upload and chat with documents (PDF, TXT, DOCX) using RAG with Gemini."

    async def ingest_document(self, file_path: str, session_id: str, filename: str) -> str:
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

        # UPDATED: Initialize history if it doesn't exist
        if session_id not in self.histories:
            self.histories[session_id] = ChatMessageHistory()

        # Retrieval logic
        retriever = self.vectorstores[session_id].as_retriever(search_kwargs={"k": 4})
        relevant_docs = await retriever.ainvoke(message)
        context = "\n\n".join([d.page_content for d in relevant_docs])

        # Modern Prompt Template with History Placeholder
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful AI assistant. Use the following document context to answer questions. If you don't know the answer based on the context, say so clearly.\n\nContext:\n{context}"),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
        ])

        # Prepare the input for the LLM
        input_data = {
            "context": context,
            "chat_history": self.histories[session_id].messages,
            "input": message
        }
        
        full_prompt = prompt_template.format_messages(**input_data)

        # Stream and capture the full response to update history
        full_response = ""
        async for chunk in self.llm.astream(full_prompt):
            content = chunk.content
            full_response += content
            yield content

        # UPDATED: Save the interaction to memory
        self.histories[session_id].add_user_message(message)
        self.histories[session_id].add_ai_message(full_response)
