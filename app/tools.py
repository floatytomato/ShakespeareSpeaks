import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "shakespeare.db")
HISTORY_DIR = os.path.join(BASE_DIR, "data", "history")


def query_play_dialogue(
    work_id: str,
    act: int | None = None,
    scene: int | None = None,
    sonnet_num: int | None = None,
) -> str:
    """Retrieves lines of text/dialogue for a play scene or a specific sonnet from the local Shakespeare database.

    Args:
        work_id: The ID code of the play/work (e.g. 'hamlet', 'macbeth', 'romeojuliet', 'sonnets').
        act: Optional integer for the Act number (1 to 5).
        scene: Optional integer for the Scene number in the Act.
        sonnet_num: Optional integer (1 to 154) if querying a specific Sonnet (work_id must be 'sonnets').

    Returns:
        A text representation of the scene dialogues or sonnet.
    """
    if not os.path.exists(DB_PATH):
        return (
            f"Error: Database not found at {DB_PATH}. Please run setup_data.py first."
        )

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    sql = """
        SELECT p.plain_text, c.name as character_name
        FROM paragraph p
        LEFT JOIN character c ON p.character_id = c.id
        WHERE p.work_id = ?
    """
    params = [work_id]

    if sonnet_num is not None:
        sql += " AND p.chapter_number = ?"
        params.append(sonnet_num)
    else:
        if act is not None:
            sql += " AND p.section_number = ?"
            params.append(act)
        if scene is not None:
            sql += " AND p.chapter_number = ?"
            params.append(scene)

    sql += " ORDER BY p.paragraph_num ASC LIMIT 200"

    try:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return f"No lines found for work '{work_id}' with the specified parameters."

        lines = []
        for r in rows:
            char_prefix = f"[{r['character_name']}]: " if r["character_name"] else ""
            clean_text = (
                r["plain_text"].replace("\n[p]", "\n").replace("[p]", "").strip()
            )
            lines.append(f"{char_prefix}{clean_text}")

        return "\n".join(lines)
    except Exception as e:
        conn.close()
        return f"Database query error: {e!s}"


def get_search_stems(query: str) -> list[str]:
    """Generates a list of potential root stems for a search term to handle Shakespearean spelling variations."""
    query = query.strip().lower()
    stems = {query}

    # Split query into words to stem individual words if it's a single word
    words = query.split()
    if len(words) == 1:
        word = words[0]
        # Remove common suffixes
        suffixes = [
            ("s", 1),
            ("ed", 2),
            ("'d", 2),
            ("ing", 3),
            ("eth", 3),
            ("est", 3),
            ("y", 1),
        ]

        for suff, length in suffixes:
            if word.endswith(suff) and len(word) > length + 2:
                stem = word[:-length]
                stems.add(stem)
                if suff in ("ed", "'d", "ing"):
                    if not stem.endswith("y"):
                        stems.add(stem + "e")
                    if len(stem) > 2 and stem[-1] == stem[-2]:
                        stems.add(stem[:-1])
                if stem.endswith("i"):
                    stems.add(stem[:-1] + "y")
        if word == "betrayal":
            stems.add("betray")

    return sorted(stems, key=len)


def search_shakespeare_text(query: str) -> str:
    """Searches the entire Shakespeare corpus (plays and sonnets) for matching phrases or words.

    Args:
        query: The word or phrase to search for (e.g. 'dagger', 'star-cross', 'frailty').

    Returns:
        A list of matching snippets along with their play, act, and scene context.
    """
    if not os.path.exists(DB_PATH):
        return f"Error: Database not found at {DB_PATH}."

    if len(query) < 3:
        return "Search query must be at least 3 characters."

    stems = get_search_stems(query)
    like_clauses = " OR ".join(["p.plain_text LIKE ?" for _ in stems])

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    sql = f"""
        SELECT p.plain_text, p.section_number, p.chapter_number, w.title as work_title, c.name as character_name
        FROM paragraph p
        JOIN work w ON p.work_id = w.id
        LEFT JOIN character c ON p.character_id = c.id
        WHERE ({like_clauses})
        ORDER BY w.year ASC, p.paragraph_num ASC LIMIT 20
    """
    params = [f"%{s}%" for s in stems]

    try:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return f"No matches found in the corpus for '{query}'."

        snippets = []
        for r in rows:
            loc = (
                f"Sonnet {r['chapter_number']}"
                if r["work_title"] == "Sonnets"
                else f"Act {r['section_number']}, Scene {r['chapter_number']}"
            )
            char_info = f" ({r['character_name']})" if r["character_name"] else ""
            clean_text = (
                r["plain_text"].replace("\n[p]", " ").replace("[p]", " ").strip()
            )
            snippets.append(f'- {r["work_title"]} {loc}{char_info}: "{clean_text}"')

        return "\n".join(snippets)
    except Exception as e:
        conn.close()
        return f"Search error: {e!s}"


def read_historical_context(query: str) -> str:
    """Retrieves relevant historical facts about William Shakespeare's biography, the Elizabethan/Jacobean era,
    theatre structure (like the Globe), and his contemporaries (like Ben Jonson or Christopher Marlowe).

    Args:
        query: The user's question or search keywords (e.g. 'Globe Theatre', 'bubonic plague', 'parents').

    Returns:
        Curated historical records matching the topic keywords.
    """
    if not os.path.exists(HISTORY_DIR):
        return "Error: History folder not found."

    docs = {}
    for filename in os.listdir(HISTORY_DIR):
        if filename.endswith(".md"):
            with open(os.path.join(HISTORY_DIR, filename), encoding="utf-8") as f:
                docs[filename] = f.read()

    if not docs:
        return "No historical documents found."

    query_words = set(query.lower().split())
    doc_keywords = {
        "biography.md": [
            "stratford",
            "born",
            "died",
            "will",
            "anne",
            "hathaway",
            "hamnet",
            "birth",
            "family",
            "education",
            "school",
            "son",
            "daughter",
            "susanna",
            "judith",
            "life",
            "career",
        ],
        "elizabethan_era.md": [
            "queen",
            "king",
            "elizabeth",
            "james",
            "plague",
            "bubonic",
            "protestant",
            "catholic",
            "reformation",
            "gunpowder",
            "treason",
            "tudor",
            "stuart",
            "politics",
            "religion",
            "era",
            "times",
        ],
        "theatre.md": [
            "globe",
            "blackfriars",
            "stage",
            "actor",
            "actors",
            "acting",
            "company",
            "playhouse",
            "playhouses",
            "burbage",
            "groundlings",
            "theatre",
            "theatres",
            "fool",
            "costumes",
        ],
        "contemporaries.md": [
            "marlowe",
            "jonson",
            "fletcher",
            "ben",
            "christopher",
            "john",
            "contemporary",
            "contemporaries",
            "rival",
            "collaborated",
            "collaboration",
            "playwrights",
        ],
    }

    scores = {}
    for filename, text in docs.items():
        score = 0
        text_lower = text.lower()
        for word in query_words:
            if len(word) > 3:
                score += text_lower.count(word) * 2

        keywords = doc_keywords.get(filename, [])
        for kw in keywords:
            if kw in query.lower():
                score += 10
        scores[filename] = score

    sorted_docs = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    # Default to biography if no keywords matched
    if not sorted_docs or sorted_docs[0][1] == 0:
        return docs.get("biography.md", "")

    context = f"--- HISTORICAL RECORD (from {sorted_docs[0][0]}) ---\n{docs[sorted_docs[0][0]]}"
    if len(sorted_docs) > 1 and sorted_docs[1][1] > 5:
        context += f"\n\n--- HISTORICAL RECORD (from {sorted_docs[1][0]}) ---\n{docs[sorted_docs[1][0]]}"

    return context


def search_web_for_scholarship(query: str) -> str:
    """Searches the internet for modern academic scholarship, research papers, and articles on the given Shakespearean topic.

    Args:
        query: The academic topic or question to search for (e.g. 'recent discoveries Globe Theatre', 'Christopher Marlowe rival').

    Returns:
        A grounded summary of recent scholarship with links/sources.
    """
    if len(query) < 3:
        return "Query must be at least 3 characters."

    try:
        from google import genai
        from google.genai import types

        # Client respects Vertex AI ADC and GOOGLE_GENAI_USE_VERTEXAI settings
        client = genai.Client()
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

        prompt = f"Provide a summary of recent academic scholarship, articles, or discoveries regarding: {query}. Keep it scholarly and professional."
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            ),
        )

        text = response.text or ""
        metadata = (
            response.candidates[0].grounding_metadata if response.candidates else None
        )
        if metadata and metadata.grounding_chunks:
            sources = "\n\n**Sources & Modern Scholarship:**\n"
            seen = set()
            for chunk in metadata.grounding_chunks:
                if chunk.web and chunk.web.uri and chunk.web.uri not in seen:
                    title = chunk.web.title or chunk.web.uri
                    sources += f"- [{title}]({chunk.web.uri})\n"
                    seen.add(chunk.web.uri)
            if seen:
                text += sources
        return text
    except Exception as e:
        return f"Web search error: {e!s}"
