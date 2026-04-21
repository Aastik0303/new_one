from typing import AsyncGenerator
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.messages import HumanMessage, SystemMessage
from .base import BaseAgent
from config import settings


class GeneralChatbotAgent(BaseAgent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GOOGLE_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
            streaming=True,
        )
        self.sessions: dict[str, list] = {}
        self.system_prompt = (
            "You are a helpful, knowledgeable, and friendly AI assistant. "
            "Answer questions clearly and concisely. When appropriate, use markdown formatting."
        )

    def get_name(self) -> str:
        return "General Chatbot"

    def get_description(self) -> str:
        return "A general-purpose conversational AI powered by Google Gemini 2.5 Flash."

    async def run(self, message: str, session_id: str = "default") -> AsyncGenerator[str, None]:
        if session_id not in self.sessions:
            self.sessions[session_id] = [SystemMessage(content=self.system_prompt)]

        self.sessions[session_id].append(HumanMessage(content=message))

        # Keep last 20 messages + system prompt
        history = [self.sessions[session_id][0]] + self.sessions[session_id][-20:]

        full_response = ""
        async for chunk in self.llm.astream(history):
            token = chunk.content
            full_response += token
            yield token

        self.sessions[session_id].append(
            type("AIMessage", (), {"content": full_response, "type": "ai"})()
        )
