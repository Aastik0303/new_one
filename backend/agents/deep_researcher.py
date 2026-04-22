from typing import AsyncGenerator
import asyncio
import requests
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from .base import BaseAgent
from config import settings


class DeepResearcherAgent(BaseAgent):
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GOOGLE_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.4,
            streaming=True,
        )
        self.system_prompt = """You are an expert research analyst. 
You receive web search results and scraped content, then synthesize them into comprehensive, 
well-structured research reports. Always:
- Cite sources in your response
- Organize findings with clear sections
- Distinguish facts from opinions
- Highlight key insights and takeaways
- Use markdown formatting"""

    def get_name(self) -> str:
        return "Deep Researcher"

    def get_description(self) -> str:
        return "Research any topic using web search + scraping, synthesized by Gemini 2.5 Flash."

    def _search_web(self, query: str, max_results: int = 5) -> list[dict]:
        results = []
        try:
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=max_results):
                    results.append(r)
        except Exception as e:
            print(f"Search error: {e}")
        return results

    def _scrape_page(self, url: str, max_chars: int = 3000) -> str:
        try:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"}
            resp = requests.get(url, headers=headers, timeout=8)
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
            return text[:max_chars]
        except Exception:
            return ""

    async def run(self, message: str, session_id: str = "default") -> AsyncGenerator[str, None]:
        yield f"🔍 **Researching**: {message}\n\n"
        yield "📡 Searching the web...\n"

        loop = asyncio.get_event_loop()
        search_results = await loop.run_in_executor(None, self._search_web, message, 5)

        if not search_results:
            yield "❌ No search results found. Please try a different query."
            return

        yield f"✅ Found {len(search_results)} sources. Scraping content...\n\n"

        scraped_data = []
        for i, result in enumerate(search_results[:4], 1):
            url = result.get("href", "")
            title = result.get("title", "Unknown")
            snippet = result.get("body", "")

            yield f"📄 Scraping source {i}: {title[:60]}...\n"

            content = await loop.run_in_executor(None, self._scrape_page, url)
            scraped_data.append({
                "title": title,
                "url": url,
                "snippet": snippet,
                "content": content or snippet,
            })

        yield "\n🧠 **Synthesizing research report...**\n\n---\n\n"

        sources_text = "\n\n".join([
            f"**Source {i+1}**: {s['title']}\n**URL**: {s['url']}\n**Content**: {s['content']}"
            for i, s in enumerate(scraped_data)
        ])

        research_prompt = f"""Research Query: {message}

Web Sources:
{sources_text}

Please provide a comprehensive, well-structured research report covering:
1. Executive Summary
2. Key Findings
3. Detailed Analysis
4. Sources & Citations
5. Conclusion

Format with clear markdown headings and bullet points."""

        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=research_prompt),
        ]

        async for chunk in self.llm.astream(messages):
            yield chunk.content
