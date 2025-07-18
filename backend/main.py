import os
import arxiv
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
import fitz  # PyMuPDF
from typing import TypedDict, List, Annotated
from langgraph.graph import StateGraph, END
# CORRECTED: Import AIMessage for chat history
from langchain_core.messages import HumanMessage, AIMessage 
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_tavily import TavilySearch

# --- Load Environment Variables ---
load_dotenv()

# --- Initialize Flask App ---
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:5173",  # For development
    "https://learning-assistant-ianu.onrender.com" # Your production frontend
]}})

# --- Initialize LLM and Tools ---
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash-latest", temperature=0)
web_search_tool = TavilySearch(max_results=4)

# --- Graph State Definition ---
class ResearchGraphState(TypedDict):
    query: str
    source_selection: List[str]
    youtube_link: str
    pdf_document: bytes
    results: Annotated[dict, lambda x, y: {**x, **y}]
    chat_history: List
    final_summary: str

# --- All Nodes are the same ---

def web_search_node(state: ResearchGraphState):
    print("---EXECUTING WEB SEARCH---")
    query = state["query"]
    web_results = web_search_tool.invoke({"query": query})
    return {"results": {"web": web_results}}

def youtube_node(state: ResearchGraphState):
    print("---EXECUTING YOUTUBE SEARCH---")
    youtube_link = state.get("youtube_link")
    if not youtube_link:
        return {"results": {"youtube": {"error": "No YouTube link provided."}}}
    try:
        video_id = youtube_link.split("v=")[1].split("&")[0]
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        full_transcript = " ".join([item['text'] for item in transcript_list])
        return {"results": {"youtube": {"transcript_snippet": full_transcript[:3000], "url": youtube_link}}}
    except Exception as e:
        return {"results": {"youtube": {"error": f"Could not process YouTube link: {e}"}}}

def pdf_node(state: ResearchGraphState):
    print("---EXECUTING PDF ANALYSIS---")
    pdf_document_bytes = state.get("pdf_document")
    if not pdf_document_bytes:
        return {"results": {"pdf": {"error": "No PDF document provided."}}}
    try:
        doc = fitz.open(stream=pdf_document_bytes, filetype="pdf")
        full_text = "".join(page.get_text() for page in doc)
        return {"results": {"pdf": {"text_snippet": full_text[:3000]}}}
    except Exception as e:
        return {"results": {"pdf": {"error": f"Failed to read or process PDF: {e}"}}}

def research_papers_node(state: ResearchGraphState):
    print("---EXECUTING RESEARCH PAPER SEARCH---")
    query = state["query"]
    try:
        client = arxiv.Client()
        search = arxiv.Search(query=query, max_results=3, sort_by=arxiv.SortCriterion.Relevance)
        results = client.results(search)
        papers = [{"title": result.title, "summary": result.summary, "pdf_link": result.pdf_url} for result in results]
        return {"results": {"papers": papers}}
    except Exception as e:
        return {"results": {"papers": {"error": f"Failed to fetch papers from ArXiv: {e}"}}}

def summarizer_node(state: ResearchGraphState):
    print("---GENERATING FINAL SUMMARY---")
    query = state["query"]
    results = state.get("results", {})
    prompt_text = f"You are a research assistant. Your task is to produce a unified, comprehensive summary based on the provided data. The user should be able to ask follow-up questions about this summary. \n\nUser's original query: '{query}'\n\nHere is the information gathered:\n\n"
    if "web" in results: prompt_text += f"--- Web Search Results ---\n{results['web']}\n\n"
    if "youtube" in results: prompt_text += f"--- YouTube Transcript Snippet ---\n{results['youtube']}\n\n"
    if "pdf" in results: prompt_text += f"--- PDF Content Snippet ---\n{results['pdf']}\n\n"
    if "papers" in results: prompt_text += f"--- Research Paper Summaries ---\n{results['papers']}\n\n"
    prompt_text += "Synthesize this information into a clear, structured answer using Markdown. Start with a final takeaway, then provide a breakdown for each source. After this, invite the user to ask follow-up questions."
    
    summary_prompt_message = HumanMessage(content=prompt_text)
    response = llm.invoke([summary_prompt_message])
    
    return {
        "final_summary": response.content,
        "chat_history": [
            HumanMessage(content=f"Original query was: '{query}'. The summarized context is: {prompt_text}"),
            AIMessage(content=response.content)
        ]
    }

def route_to_tools(state: ResearchGraphState):
    #... (no changes)
    print("---ROUTING TO TOOLS---")
    selected_sources = state.get("source_selection", [])
    nodes_to_run = []
    if "fromWeb" in selected_sources: nodes_to_run.append("web_search")
    if "fromYouTube" in selected_sources: nodes_to_run.append("youtube")
    if "fromPDF" in selected_sources: nodes_to_run.append("pdf")
    if "fromResearchPapers" in selected_sources: nodes_to_run.append("research_papers")
    return nodes_to_run if nodes_to_run else "summarizer"

# --- Graph and Flask Endpoints ---

workflow = StateGraph(ResearchGraphState)
workflow.add_node("web_search", web_search_node)
workflow.add_node("youtube", youtube_node)
workflow.add_node("pdf", pdf_node)
workflow.add_node("research_papers", research_papers_node)
workflow.add_node("summarizer", summarizer_node)
workflow.set_conditional_entry_point(route_to_tools, {
    "web_search": "web_search", "youtube": "youtube", "pdf": "pdf",
    "research_papers": "research_papers", "summarizer": "summarizer"
})
workflow.add_edge("web_search", "summarizer")
workflow.add_edge("youtube", "summarizer")
workflow.add_edge("pdf", "summarizer")
workflow.add_edge("research_papers", "summarizer")
workflow.add_edge("summarizer", END)
langgraph_app = workflow.compile()

@app.route("/api/research", methods=["POST"])
def research_endpoint():
    #... (no changes here)
    try:
        form_data = request.form
        query = form_data.get("prompt")
        source_selection = form_data.getlist("sources")
        youtube_link = form_data.get("youtube_link", "")
        pdf_file = request.files.get("pdf_document")
        pdf_bytes = pdf_file.read() if pdf_file else None
        if not query:
            return jsonify({"error": "Prompt is required"}), 400
        initial_state = {"query": query, "source_selection": source_selection,
                         "youtube_link": youtube_link, "pdf_document": pdf_bytes,
                         "results": {}, "chat_history": []}
        final_state = langgraph_app.invoke(initial_state)
        serializable_history = [{"type": msg.type, "content": msg.content} for msg in final_state["chat_history"]]
        return jsonify({"summary": final_state.get("final_summary", "No summary could be generated."),
                        "chat_history": serializable_history})
    except Exception as e:
        print(f"An error occurred during graph invocation: {e}")
        return jsonify({"error": "An internal error occurred in the research agent."}), 500

# +++ NEW CHAT ENDPOINT +++
@app.route("/api/chat", methods=["POST"])
def chat_endpoint():
    """Handles follow-up questions from the user."""
    data = request.get_json()
    
    # Reconstruct the chat history from the frontend
    # Note: The first message is a hidden context prompt for the AI
    chat_history_from_frontend = data.get("chat_history", [])
    
    messages = []
    for msg in chat_history_from_frontend:
        if msg.get("type") == "human":
            messages.append(HumanMessage(content=msg.get("content")))
        elif msg.get("type") == "ai":
            messages.append(AIMessage(content=msg.get("content")))

    if not messages:
        return jsonify({"error": "Chat history is required."}), 400
    
    print("---RESPONDING TO FOLLOW-UP---")
    try:
        # Get the AI's response
        response = llm.invoke(messages)
        return jsonify({"ai_message": {"type": "ai", "content": response.content}})
    except Exception as e:
        print(f"An error occurred during chat invocation: {e}")
        return jsonify({"error": "An internal error occurred during chat."}), 500
# +++ END OF NEW CODE +++

if __name__ == "__main__":
    app.run(debug=True, port=5000)