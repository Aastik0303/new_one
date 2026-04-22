from typing import AsyncGenerator
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
# REMOVED: Direct imports of heavy agents to save startup memory
from config import settings

# We store the classes in a map but DON'T initialize them yet
from .general_chatbot import GeneralChatbotAgent
from .code_agent import CodeAgent
from .document_rag import DocumentRAGAgent
from .youtube_rag import YouTubeRAGAgent
from .deep_researcher import DeepResearcherAgent

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

        # MEMORY FIX: Start with an empty dict. 
        # Agents will be created only when a user actually needs them.
        self._instantiated_agents: dict[str, object] = {}

        self.router_llm = ChatGroq(
            model=settings.GROQ_MODEL,
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0.0,
        )

        self.router_system = """You are an intelligent agent router. 
Respond with EXACTLY ONE label:
- general   → casual chat
- code      → programming/logic
- document  → files/PDFs
- youtube   → video URLs
- researcher → web search"""

    def get_agent(self, key: str):
        """Lazy loader: Creates the agent only if it doesn't exist in memory."""
        if key not in AGENT_MAP:
            key = "general"
        
        if key not in self._instantiated_agents:
            # When this line runs, it triggers the heavy imports inside the agent file
            AgentClass = AGENT_MAP[key]
            self._instantiated_agents[key] = AgentClass()
            
        return self._instantiated_agents[key]

    async def route(self, message: str) -> str:
        """Determine which agent to use without loading them yet."""
        msg_lower = message.lower()
        if "youtube.com" in msg_lower or "youtu.be" in msg_lower:
            return "youtube"
        
        keywords_code = ["debug", "code", "function", "algorithm", "error", "script"]
        if any(kw in msg_lower for kw in keywords_code):
            return "code"

        try:
            result = await self.router_llm.ainvoke([
                SystemMessage(content=self.router_system),
                HumanMessage(content=message),
            ])
            agent_key = result.content.strip().lower()
            return agent_key if agent_key in AGENT_MAP else "general"
        except Exception:
            return "general"

    async def run(
        self,
        message: str,
        session_id: str = "default",
        agent_override: str | None = None,
    ) -> AsyncGenerator[str, None]:
        agent_key = agent_override or await self.route(message)
        
        # Use the lazy loader to get the agent
        agent = self.get_agent(agent_key)

        yield f"__AGENT__{agent_key}__"
        async for chunk in agent.run(message, session_id):
            yield chunk

    def list_agents(self):
        """Return basic info without instantiating all agents."""
        return [
            {
                "key": key,
                "name": key.replace("_", " ").title(), # Basic placeholder
                "label": AGENT_LABELS.get(key, key),
            }
            for key in AGENT_MAP
        ]
import gc # Garbage Collector

def cleanup_memory():
    """Manually trigger Python's garbage collection to free up RAM."""
    gc.collect()        

orchestrator = Orchestrator()

