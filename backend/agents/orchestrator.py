"""
Orchestrator: Routes user messages to the appropriate agent based on intent.
"""
from typing import AsyncGenerator
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from .general_chatbot import GeneralChatbotAgent
from .code_agent import CodeAgent
from .document_rag import DocumentRAGAgent
from .youtube_rag import YouTubeRAGAgent
from .deep_researcher import DeepResearcherAgent
from config import settings

AGENT_MAP = {
    "general": GeneralChatbotAgent,
    "code": CodeAgent,
    "document": DocumentRAGAgent,
    "youtube": YouTubeRAGAgent,
    "researcher": DeepResearcherAgent,
}

AGENT_LABELS = {
    "general": "🤖 General Chatbot",
    "code": "💻 Code Agent",
    "document": "📄 Document RAG",
    "youtube": "▶️ YouTube RAG",
    "researcher": "🔬 Deep Researcher",
}


class Orchestrator:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self.agents: dict[str, object] = {
            key: AgentClass() for key, AgentClass in AGENT_MAP.items()
        }

        self.router_llm = ChatGroq(
            model=settings.GROQ_MODEL,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0.0,
        )

        self.router_system = """You are an intelligent agent router. 
Based on the user message, respond with EXACTLY ONE of these labels (no other text):
- general   → casual chat, questions, general knowledge
- code      → writing code, debugging, programming questions, algorithms
- document  → questions about uploaded documents, files, PDFs
- youtube   → YouTube URLs, video analysis, video questions
- researcher → deep research, comprehensive analysis, fact-finding, current events

Respond with only the label."""

    async def route(self, message: str) -> str:
        """Determine which agent to use."""
        # Fast-path routing rules
        if "youtube.com" in message or "youtu.be" in message:
            return "youtube"
        keywords_code = ["debug", "code", "function", "algorithm", "error", "bug", "script", "python", "javascript", "sql"]
        if any(kw in message.lower() for kw in keywords_code):
            return "code"
        keywords_research = ["research", "analyze", "find information", "what is the latest", "current", "news"]
        if any(kw in message.lower() for kw in keywords_research):
            return "researcher"

        try:
            result = await self.router_llm.ainvoke([
                SystemMessage(content=self.router_system),
                HumanMessage(content=message),
            ])
            agent_key = result.content.strip().lower()
            if agent_key in AGENT_MAP:
                return agent_key
        except Exception:
            pass

        return "general"

    async def run(
        self,
        message: str,
        session_id: str = "default",
        agent_override: str | None = None,
    ) -> AsyncGenerator[str, None]:
        agent_key = agent_override or await self.route(message)
        agent = self.agents[agent_key]

        yield f"__AGENT__{agent_key}__"  # Signal to frontend which agent is responding
        async for chunk in agent.run(message, session_id):
            yield chunk

    def get_agent(self, key: str):
        return self.agents.get(key)

    def list_agents(self):
        return [
            {
                "key": key,
                "name": self.agents[key].get_name(),
                "description": self.agents[key].get_description(),
                "label": AGENT_LABELS.get(key, key),
            }
            for key in AGENT_MAP
        ]


orchestrator = Orchestrator()
