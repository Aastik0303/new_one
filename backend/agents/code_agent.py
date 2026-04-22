from typing import AsyncGenerator
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from .base import BaseAgent
from config import settings


class CodeAgent(BaseAgent):
    def __init__(self):
        self.llm = ChatGroq(
            model=settings.GROQ_MODEL,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0.1,
            streaming=True,
        )
        self.sessions: dict[str, list] = {}
        self.system_prompt = """You are an expert software engineer and debugging specialist.
Your capabilities:
- Write clean, efficient, well-documented code in any language
- Debug and fix code issues with clear explanations
- Explain complex algorithms and data structures
- Suggest best practices and optimizations
- Provide complete, runnable code examples

Always format code in proper markdown code blocks with language specification.
Explain your reasoning step by step."""

    def get_name(self) -> str:
        return "Code Generator & Debugger"

    def get_description(self) -> str:
        return "Expert coding assistant powered by Groq (Llama 3.3 70B) for fast code generation and debugging."

    async def run(self, message: str, session_id: str = "default") -> AsyncGenerator[str, None]:
        if session_id not in self.sessions:
            self.sessions[session_id] = [SystemMessage(content=self.system_prompt)]

        self.sessions[session_id].append(HumanMessage(content=message))
        history = [self.sessions[session_id][0]] + self.sessions[session_id][-16:]

        async for chunk in self.llm.astream(history):
            yield chunk.content
