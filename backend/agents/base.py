from abc import ABC, abstractmethod
from typing import AsyncGenerator

class BaseAgent(ABC):
    """Abstract base class for all agents."""

    @abstractmethod
    async def run(self, message: str, session_id: str = "default") -> AsyncGenerator[str, None]:
        """Run the agent with a user message, yielding streamed response chunks."""
        pass

    @abstractmethod
    def get_name(self) -> str:
        pass

    @abstractmethod
    def get_description(self) -> str:
        pass
