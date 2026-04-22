"""
agents/chatbot.py — General purpose conversational agent
"""
from __future__ import annotations
from typing import AsyncIterator, Any
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from agents.base import BaseAgent, get_google_llm


SYSTEM_PROMPT = """You are a highly capable, friendly AI assistant with broad knowledge across
science, technology, history, arts, mathematics, and everyday topics. You give thoughtful,
accurate, and well-structured responses. When appropriate, use markdown formatting."""


class ChatbotAgent(BaseAgent):
    name = "chatbot"
    description = "General-purpose conversational AI for any topic"

    def __init__(self):
        self.llm = get_google_llm(temperature=0.7, streaming=True)
        self._history: list[dict] = []

    def _build_messages(self, query: str, history: list[dict]) -> list:
        messages = [SystemMessage(content=SYSTEM_PROMPT)]
        for turn in history[-10:]:  # keep last 10 turns
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            else:
                messages.append(AIMessage(content=content))
        messages.append(HumanMessage(content=query))
        return messages

    async def run(self, query: str, history: list[dict] | None = None, **kwargs) -> dict[str, Any]:
        history = history or []
        messages = self._build_messages(query, history)
        response = await self.llm.ainvoke(messages)
        return {
            "agent": self.name,
            "response": response.content,
            "metadata": {"model": "gemini-2.5-flash"},
        }

    async def stream(self, query: str, history: list[dict] | None = None, **kwargs) -> AsyncIterator[str]:
        history = history or []
        messages = self._build_messages(query, history)
        async for chunk in self.llm.astream(messages):
            if chunk.content:
                yield chunk.content
