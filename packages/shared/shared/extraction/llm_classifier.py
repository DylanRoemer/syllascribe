"""Optional LLM-based event classifier.

Feature-flagged: only called when USE_LLM_CLASSIFIER=true and LLM_API_KEY is set.

Hard constraints enforced in code:
- The LLM cannot change dates.
- The LLM cannot invent events beyond the candidates provided.
- The LLM only classifies/labels and normalizes events from existing candidates.

Provider abstraction: initially supports OpenAI, structured for easy swapping.
"""

from __future__ import annotations

import json
from typing import Optional

from ..schemas import Candidate, LLMClassification


# ── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a precise academic calendar event classifier. You will receive a list of date candidates extracted from a course syllabus, each with a date and surrounding context text.

For each candidate, return:
1. A short, normalized title (e.g., "Midterm Exam", "Problem Set 3 Due", "Spring Break - No Class")
2. A category: one of "assignment", "exam", "reading", "holiday", "office_hours", "other"
3. An optional one-sentence description
4. A confidence adjustment (-0.2 to +0.2) based on how clear the context is

RULES:
- Do NOT change the date. You can only classify and label.
- Do NOT invent events that aren't in the candidates.
- Return ONLY the JSON array. No other text.
- Be conservative: if unsure, use category "other" and confidence_adjustment 0.

Return a JSON array where each element has:
{
  "candidate_index": <int>,
  "title": "<string>",
  "category": "<string>",
  "description": "<string or null>",
  "confidence_adjustment": <float>
}"""


# ── Provider interface ───────────────────────────────────────────────────────

def classify_with_llm_sync(
    candidates: list[Candidate],
    provider: str,
    api_key: str,
) -> list[LLMClassification]:
    """Synchronous wrapper for LLM classification (used by Celery worker).

    Args:
        candidates: List of date candidates to classify.
        provider: LLM provider name (e.g., "openai").
        api_key: API key for the provider.

    Returns:
        List of LLMClassification objects.
    """
    if provider == "openai":
        return _classify_openai(candidates, api_key)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}. Supported: openai")


def _classify_openai(
    candidates: list[Candidate],
    api_key: str,
) -> list[LLMClassification]:
    """Classify candidates using OpenAI API."""
    try:
        from openai import OpenAI
    except ImportError:
        raise ImportError(
            "openai package is required for LLM classification. "
            "Install with: pip install openai"
        )

    client = OpenAI(api_key=api_key)

    # Build the user message with candidate data
    candidate_data = []
    for i, c in enumerate(candidates):
        candidate_data.append({
            "index": i,
            "date": c.date.isoformat(),
            "raw_match": c.raw_match,
            "context": c.context[:300],  # Limit context length
            "page": c.page,
        })

    user_message = json.dumps(candidate_data, indent=2)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.1,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )

    # Parse response
    content = response.choices[0].message.content
    if not content:
        return []

    return _parse_llm_response(content, len(candidates))


def _parse_llm_response(
    content: str,
    num_candidates: int,
) -> list[LLMClassification]:
    """Parse and validate LLM response JSON.

    Enforces hard constraints:
    - candidate_index must be within range
    - confidence_adjustment clamped to [-0.2, 0.2]
    - category must be valid
    """
    valid_categories = {"assignment", "exam", "reading", "holiday", "office_hours", "other"}

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return []

    # Handle both {"results": [...]} and direct [...] formats
    if isinstance(data, dict):
        # Look for an array value
        for v in data.values():
            if isinstance(v, list):
                data = v
                break
        else:
            return []

    if not isinstance(data, list):
        return []

    results: list[LLMClassification] = []
    for item in data:
        if not isinstance(item, dict):
            continue

        idx = item.get("candidate_index")
        if not isinstance(idx, int) or idx < 0 or idx >= num_candidates:
            continue

        title = str(item.get("title", "")).strip()
        if not title:
            continue

        category = str(item.get("category", "other")).strip().lower()
        if category not in valid_categories:
            category = "other"

        description = item.get("description")
        if description is not None:
            description = str(description).strip() or None

        adj = item.get("confidence_adjustment", 0.0)
        try:
            adj = float(adj)
        except (TypeError, ValueError):
            adj = 0.0
        adj = max(-0.2, min(0.2, adj))

        results.append(LLMClassification(
            candidate_index=idx,
            title=title,
            category=category,
            description=description,
            confidence_adjustment=adj,
        ))

    return results
