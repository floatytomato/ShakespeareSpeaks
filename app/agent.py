# ruff: noqa
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
from pydantic import BaseModel, Field
from google.adk.agents import LlmAgent
from google.adk.workflow import Workflow, START, Edge, node
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

import google.auth
from .tools import (
    query_play_dialogue,
    search_shakespeare_text,
    read_historical_context,
    search_web_for_scholarship,
)

# Configure Google Cloud environment settings
_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

# Initialize model
model_instance = Gemini(
    model="gemini-flash-latest",
    retry_options=types.HttpRetryOptions(attempts=3),
)


# 1. Define output schema for intent routing
class RouteSelection(BaseModel):
    """Output schema for classifying user intent and selecting a query route."""

    route: str = Field(
        description="The chosen route category. Must be one of: 'read_corpus', 'search_corpus', 'history', 'advice', 'scholarship', 'general'."
    )
    explanation: str = Field(description="Brief explanation of the routing choice.")
    query: str = Field(
        description="The refined search term or query extracted from the user's message. If the user is accepting an offer to search the web for newer scholarship (e.g., saying 'yes', 'sure', 'please do'), you MUST extract the topic of the previous discussion from the conversation history and use that as the query."
    )


# 2. Define specialized agent nodes

# Router Node
intent_analyzer = LlmAgent(
    name="intent_analyzer",
    model=model_instance,
    instruction="""You are an intelligent coordinator. Analyze the user's input and select the most appropriate routing category:
- 'read_corpus': If they want to read or retrieve a specific play, scene, dialogue, or sonnet.
- 'search_corpus': If they want to search for a word, phrase, or line across all works.
- 'history': If they ask about Shakespeare's biography, contemporaries, theatres (like the Globe), times, or general thematic analysis and discussion of Shakespeare's works (e.g. inequality, ambition, betrayal, madness in his plays).
- 'advice': If they ask for advice on current events, politics, or life problems, comparing it to Shakespearean tragedies or nature/simplicity.
- 'scholarship': If the query asks about historical eras, times, or topics outside of Shakespeare's scope (e.g. Victorian times, modern events, general history), OR if they explicitly ask to search the web/internet, look up modern or newer scholarship/discoveries, OR if they accept the offer to look for newer scholarship on a topic (e.g., saying 'yes', 'please do', 'sure', 'yes search the web'). If the user accepts the offer to search, you MUST extract the topic discussed in the previous turn as the query.
- 'general': For general chat, greetings, help, or when none of the apply.""",
    output_schema=RouteSelection,
)

# Corpus Reader Node
corpus_reader_agent = LlmAgent(
    name="corpus_reader_agent",
    model=model_instance,
    instruction="You are a textual archivist. Use the 'query_play_dialogue' tool to retrieve the exact play scene or sonnet requested by the user, and print the lines clearly. Do not summarize unless asked.",
    tools=[query_play_dialogue],
)

# Corpus Searcher Node
corpus_searcher_agent = LlmAgent(
    name="corpus_searcher_agent",
    model=model_instance,
    instruction="You are a search coordinator. Use the 'search_shakespeare_text' tool to find all matching lines for the user's phrase and summarize the occurrences.",
    tools=[search_shakespeare_text],
)

# History Node
history_agent = LlmAgent(
    name="history_agent",
    model=model_instance,
    instruction="""You are a Shakespearean historian and literary scholar. Use the 'read_historical_context' tool to answer the user's question about Shakespeare's biography, contemporaries, theatres, times, or themes and analyses of his plays based on the retrieved facts and your general scholarly knowledge.
At the end of your answer, you MUST ALWAYS ask the user if they want to search the web for newer scholarship, using exactly this sentence on a new line:
"Would you like me to search the web for newer scholarship on this topic?" """,
    tools=[read_historical_context],
)

# Scholarship Node
scholarship_agent = LlmAgent(
    name="scholarship_agent",
    model=model_instance,
    instruction="""You are an academic researcher. You MUST ALWAYS call the 'search_web_for_scholarship' tool to search the internet for modern academic scholarship, research papers, or recent archaeological and historical discoveries.
If the last user message is a simple acceptance (e.g., 'yes', 'please', 'sure', 'yes search the web', 'please do'), identify the historical topic that was discussed in the previous turn, and immediately call the tool with that topic as the query.
Otherwise, use the topic from the user's message as the query.
Do not ask the user for clarification or a more specific topic; execute the search tool immediately for the query and summarize the findings with cited source URLs.""",
    tools=[search_web_for_scholarship],
)

# Advice Node (Chauncey Gardiner / Being There style + Max Headroom cadence if requested)
advice_agent = LlmAgent(
    name="advice_agent",
    model=model_instance,
    instruction="""You are a wise philosopher speaking in a blend of Shakespearean eloquence and the serene, nature-focused simplicity of Chauncey Gardiner (from the movie Being There). 
Give advice on current events, human nature, or politics by drawing parallels to the seasons, gardens, or characters in Shakespeare's tragedies (e.g. Macbeth's ambition, Hamlet's hesitation). 
Your advice should be simple, grounded, and profound. If the user asks for a modern edge, speak in a slightly theatrical, Max Headroom-like digital cadence, but keep the core advice wise and simple.""",
)

# General Chat Node
general_agent = LlmAgent(
    name="general_agent",
    model=model_instance,
    instruction="You are the Bard of Avon himself. Chat with the user in a friendly, helpful, and poetic Shakespearean persona.",
)

# 3. Router node function
from google.adk.events.event import Event


@node(name="route_intent")
def route_intent(node_input: dict) -> Event:
    """Routes the intent based on the analysis of intent_analyzer."""
    route = node_input.get("route", "general")
    query = node_input.get("query", "")
    return Event(output=query, route=route)


# 4. Assemble the Graph Workflow
root_agent = Workflow(
    name="shakespeare_orchestrator",
    description="An ADK 2.0 graph workflow that retrieves Shakespeare's works, searches text, answers historical questions, and gives advice.",
    edges=[
        (START, intent_analyzer),
        (intent_analyzer, route_intent),
        Edge(from_node=route_intent, to_node=corpus_reader_agent, route="read_corpus"),
        Edge(
            from_node=route_intent, to_node=corpus_searcher_agent, route="search_corpus"
        ),
        Edge(from_node=route_intent, to_node=history_agent, route="history"),
        Edge(from_node=route_intent, to_node=advice_agent, route="advice"),
        Edge(from_node=route_intent, to_node=scholarship_agent, route="scholarship"),
        Edge(from_node=route_intent, to_node=general_agent, route="__DEFAULT__"),
    ],
)

app = App(
    root_agent=root_agent,
    name="shakespeare_agent_app",
)
