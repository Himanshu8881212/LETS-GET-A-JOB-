#!/usr/bin/env python3
"""
Apply Agent — powered by browser-use.

Reads a JSON payload on stdin and runs a browser-use Agent against the target
job URL. Writes a single-line JSON result to stdout and keeps the visible
Chromium window open for the user to review and submit.

Payload shape (all strings unless noted):
{
  "jobUrl":          "https://...",
  "jobDescription":  "text or empty",
  "profile":         {"first_name": "...", "last_name": "...", ...},
  "resumeText":      "flattened resume text or empty",
  "coverLetterText": "flattened cover letter or empty",
  "resumePath":      "/abs/path/to/resume.pdf or null",
  "coverLetterPath": "/abs/path/to/cl.pdf or null",
  "extraDocs":       [{"path": "...", "name": "...", "category": "..."}],
  "llm": {
    "kind":    "openai-compatible" | "anthropic" | "google",
    "baseUrl": "..." (openai-compatible only),
    "apiKey":  "...",
    "model":   "..."
  }
}

Result shape:
{
  "ok": bool,
  "jobUrl": "...",
  "finalUrl": "...",
  "message": "...",
  "error": "..." | null,
  "steps": [ {action: str, ...} ]   # trimmed step history
}
"""
from __future__ import annotations

import asyncio
import json
import sys
import traceback
from typing import Any


def _err(msg: str, jobUrl: str = "") -> dict:
    return {"ok": False, "jobUrl": jobUrl, "error": msg, "message": msg, "steps": []}


def _import_chat(name: str):
    """Try both browser_use and browser_use.llm import paths — the package
    re-exports the common classes from the top level, but some versions only
    ship them under .llm."""
    try:
        mod = __import__("browser_use", fromlist=[name])
        return getattr(mod, name)
    except Exception:
        mod = __import__("browser_use.llm", fromlist=[name])
        return getattr(mod, name)


def _detect_openai_compat_service(base_url: str | None) -> str:
    """Map a base URL to a known service key. Lets us pick the dedicated
    browser-use ChatXxx class when one exists — generally better than the
    generic ChatOpenAI with base_url because the dedicated wrapper knows
    each provider's quirks (tool-call schemas, rate limits, etc.)."""
    if not base_url:
        return "openai"
    b = base_url.lower()
    if "api.mistral.ai" in b:
        return "mistral"
    if "api.deepseek.com" in b:
        return "deepseek"
    if "api.groq.com" in b:
        return "groq"
    if "openrouter.ai" in b:
        return "openrouter"
    if "api.cerebras.ai" in b:
        return "cerebras"
    if "localhost:11434" in b or "127.0.0.1:11434" in b:
        return "ollama"
    if "localhost:1234" in b or "127.0.0.1:1234" in b:
        return "lmstudio"
    return "openai"


# Generous output budgets. browser-use's per-step JSON is large (thinking +
# actions + memory + judgement). Capping low causes "EOF while parsing"
# truncation errors. We size per-provider to the highest value each class
# accepts without rejecting or over-billing.
#   Mistral Large 3 has a 262k context, so 32k output is trivially safe.
#   Anthropic caps output at 16k on Sonnet 4.6.
#   OpenAI caps output at 16k for most 4.1/5 models.
_MAX_TOKENS_MISTRAL = 32_768
_MAX_TOKENS_ANTHROPIC = 16_384
_MAX_TOKENS_OPENAI = 16_384
_MAX_TOKENS_DEFAULT = 16_384

# Reasoning-model names that emit long thinking traces. browser-use's
# schema-constrained function-calling doesn't mix well with these — the
# Agent loop tends to stall mid-flight. We surface a warning on stderr so
# the Node side + the user know to switch.
_REASONING_MODEL_HINTS = (
    "magistral",       # Mistral reasoning
    "o1",              # OpenAI reasoning
    "o3",
    "o4-mini",
    "deepseek-reasoner",
    "deepseek-r1",
    "qwq",
    "thinking",        # any "-thinking" variant
)


def _is_reasoning_model(model: str) -> bool:
    m = (model or "").lower()
    return any(h in m for h in _REASONING_MODEL_HINTS)


def _build_llm(cfg: dict):
    """Map the Next.js LLM config to the best browser-use Chat wrapper.

    Our app exposes three provider kinds (openai-compatible / anthropic / google)
    but browser-use has dedicated classes for Mistral, DeepSeek, Groq,
    OpenRouter, Ollama, Cerebras. We detect those from base_url and use the
    native class when available for the best schema + tool-call support.
    """
    kind = cfg.get("kind")
    api_key = cfg.get("apiKey") or ""
    model = cfg.get("model") or ""
    base_url = cfg.get("baseUrl") or None

    if _is_reasoning_model(model):
        sys.stderr.write(
            f"⚠️  Warning: '{model}' looks like a reasoning model. browser-use's "
            f"schema-heavy workload is unreliable on reasoning models — they stall "
            f"mid-flight with provider errors. For Apply, use mistral-large-latest, "
            f"claude-sonnet-4-*, or gpt-5.\n"
        )

    if kind == "anthropic":
        ChatAnthropic = _import_chat("ChatAnthropic")
        return ChatAnthropic(model=model, api_key=api_key, max_tokens=_MAX_TOKENS_ANTHROPIC)

    if kind == "google":
        ChatGoogle = _import_chat("ChatGoogle")
        return ChatGoogle(model=model, api_key=api_key)

    if kind != "openai-compatible":
        raise ValueError(f"Unsupported llm kind: {kind!r}")

    service = _detect_openai_compat_service(base_url)

    if service == "mistral":
        ChatMistral = _import_chat("ChatMistral")
        return ChatMistral(model=model, api_key=api_key, max_tokens=_MAX_TOKENS_MISTRAL)
    if service == "deepseek":
        ChatDeepSeek = _import_chat("ChatDeepSeek")
        return ChatDeepSeek(model=model, api_key=api_key)
    if service == "groq":
        ChatGroq = _import_chat("ChatGroq")
        return ChatGroq(model=model, api_key=api_key)
    if service == "openrouter":
        ChatOpenRouter = _import_chat("ChatOpenRouter")
        return ChatOpenRouter(model=model, api_key=api_key)
    if service == "cerebras":
        ChatCerebras = _import_chat("ChatCerebras")
        return ChatCerebras(model=model, api_key=api_key)
    if service == "ollama":
        ChatOllama = _import_chat("ChatOllama")
        host = (base_url or "http://localhost:11434").rstrip("/")
        if host.endswith("/v1"):
            host = host[:-3]
        try:
            return ChatOllama(model=model, host=host)
        except TypeError:
            return ChatOllama(model=model, base_url=host)

    # Generic OpenAI-compatible — ChatOpenAI uses `max_completion_tokens`
    # (not `max_tokens`) in the current browser-use signature.
    ChatOpenAI = _import_chat("ChatOpenAI")
    kwargs: dict = {
        "model": model,
        "api_key": api_key,
        "max_completion_tokens": _MAX_TOKENS_OPENAI,
    }
    if base_url:
        kwargs["base_url"] = base_url
    return ChatOpenAI(**kwargs)


def _build_task(payload: dict) -> str:
    p = payload.get("profile") or {}
    profile_lines = [f"- {k}: {v}" for k, v in p.items() if v]
    resume_text = (payload.get("resumeText") or "").strip()
    cover_text = (payload.get("coverLetterText") or "").strip()
    job_description = (payload.get("jobDescription") or "").strip()
    resume_path = payload.get("resumePath")
    cover_path = payload.get("coverLetterPath")
    extras = payload.get("extraDocs") or []

    lines: list[str] = [
        f"Open {payload['jobUrl']} and fill out the job application form on the candidate's behalf.",
        "",
        "Candidate profile (use these values verbatim where they apply):",
        *profile_lines,
        "",
    ]

    if resume_path or cover_path or extras:
        lines.append("FILES AVAILABLE FOR UPLOAD (use the upload_file_from_disk action / your built-in file upload tool with these EXACT paths):")
        if resume_path:
            lines.append(f"  • Resume/CV — path: {resume_path}")
        if cover_path:
            lines.append(f"  • Cover letter — path: {cover_path}")
        for doc in extras:
            if doc.get("path") and doc.get("name"):
                lines.append(
                    f"  • {doc.get('category', 'other')} — {doc['name']} — path: {doc['path']}"
                )
        lines.append(
            "When the form shows a file-upload control (resume/CV, cover letter, portfolio, transcript, etc.), "
            "call the file-upload action with the matching path from above. DO NOT try to drag-and-drop from "
            "the filesystem or paste the path into a text field — use the dedicated upload action."
        )
        lines.append("")

    if resume_text:
        lines.append("Resume content (source of truth for experience / achievements — never invent anything beyond this):")
        lines.append(resume_text[:6000])
        lines.append("")
    if cover_text:
        lines.append("Cover letter content (reuse for motivation textareas where appropriate):")
        lines.append(cover_text[:4000])
        lines.append("")
    if job_description:
        lines.append("Job description for context:")
        lines.append(job_description[:4000])
        lines.append("")

    lines += [
        "═══════════════════════════════════════════════════════════════",
        "HARD RULE — READ FIRST, HOLDS ALWAYS:",
        "You MUST NOT click any button labelled Submit, Apply, Send, Finish,",
        "Confirm, Complete, or similar final-submission action. You are filling",
        "the form on behalf of a human who will review and submit personally.",
        "If you reach a step where the only remaining action is the final",
        "submit button, STOP IMMEDIATELY and hand the window back to the",
        "human with a summary of everything you filled.",
        "═══════════════════════════════════════════════════════════════",
        "",
        "Other rules:",
        "- NEVER fabricate employers, titles, dates, or metrics beyond the resume content provided.",
        "- For open-ended questions ('why this role', 'tell us about a time…', 'describe a project'), compose tailored answers using the resume + cover letter as source. Stay under any maxlength. Lead with a specific moment.",
        "- For demographic/EEO fields (gender, race, ethnicity, veteran, disability, pronouns): LEAVE BLANK or skip.",
        "- For 'I agree' / consent checkboxes: LEAVE UNCHECKED — the human must consent.",
        "- Handle cookie banners, 'Apply now' buttons, login walls (only if 'Continue as guest' or similar is visible), and multi-step wizards by advancing with Next/Continue — but STOP before the terminal Submit step.",
        "- If the page is empty, shows 'no jobs available', returns 404, or you can't make progress, explain why and stop — do not wander.",
        "",
        "REMINDER before you stop: confirm you did NOT click any final submit.",
        "",
        "When you're done, briefly summarize what you filled, what you skipped, and what the human still needs to verify before pressing Submit.",
    ]

    return "\n".join(lines)


async def run(payload: dict) -> dict:
    try:
        from browser_use import Agent, Browser  # type: ignore
    except Exception as e:  # pragma: no cover
        return _err(
            "browser-use is not installed. Run: pip install browser-use && playwright install chromium",
            payload.get("jobUrl", ""),
        )

    try:
        llm = _build_llm(payload.get("llm") or {})
    except Exception as e:
        return _err(f"Failed to build LLM client: {e}", payload.get("jobUrl", ""))

    # Collect pre-authorized file paths so the upload tool can use them.
    file_paths: list[str] = []
    if payload.get("resumePath"):
        file_paths.append(payload["resumePath"])
    if payload.get("coverLetterPath"):
        file_paths.append(payload["coverLetterPath"])
    for doc in payload.get("extraDocs") or []:
        if doc.get("path"):
            file_paths.append(doc["path"])

    try:
        # keep_alive=True → window stays open after agent.run() so the user
        # can review and submit manually.
        from urllib.parse import urlparse

        parsed = urlparse(payload.get("jobUrl", "") or "")
        target_host = (parsed.netloc or "").lower().split(":")[0]  # strip port
        is_local = target_host in ("localhost", "127.0.0.1", "::1") or target_host.endswith(".local")

        browser_kwargs: dict = {"headless": False, "keep_alive": True}

        if not is_local and target_host:
            # allowed_domains pins the agent to the job host + common ATS
            # redirects (Greenhouse/Workday/Lever/…) so it can't wander off
            # to DuckDuckGo. We skip this for localhost so sample forms and
            # dev tests keep working.
            root = ".".join(target_host.split(".")[-2:]) if target_host.count(".") >= 1 else target_host
            browser_kwargs["allowed_domains"] = [
                target_host,
                f"*.{root}",
                "*.greenhouse.io",
                "job-boards.greenhouse.io",
                "boards.greenhouse.io",
                "*.myworkdayjobs.com",
                "*.workday.com",
                "*.lever.co",
                "*.smartrecruiters.com",
                "*.ashbyhq.com",
                "*.teamtailor.com",
                "*.workable.com",
                "*.personio.de",
                "*.bamboohr.com",
            ]

        browser = Browser(**browser_kwargs)
    except Exception as e:
        return _err(f"Failed to construct Browser: {e}", payload.get("jobUrl", ""))

    try:
        agent_kwargs: dict = {
            "task": _build_task(payload),
            "llm": llm,
            "browser": browser,
            # One JSON-validation error from the model shouldn't kill the run.
            "max_failures": 6,
            # Skip browser-use's "figure out where I am" preamble — we already
            # know the URL, just go there on launch.
            "directly_open_url": payload.get("jobUrl"),
        }
        if file_paths:
            agent_kwargs["available_file_paths"] = file_paths
        agent = Agent(**agent_kwargs)
    except Exception as e:
        return _err(f"Failed to construct browser-use Agent: {e}", payload.get("jobUrl", ""))

    try:
        history = await agent.run()
    except Exception as e:
        tb = traceback.format_exc(limit=3)
        return _err(f"Agent run crashed: {e}\n{tb}", payload.get("jobUrl", ""))

    # browser-use returns AgentHistoryList. Build a clean, human-readable trace.
    try:
        final_result: Any = (
            history.final_result() if hasattr(history, "final_result") else None
        )
        urls_visited = history.urls() if hasattr(history, "urls") else []

        steps_raw = _extract_steps(history)
        uploaded_paths = _find_uploaded_paths(history, file_paths)

        final_url = urls_visited[-1] if urls_visited else payload.get("jobUrl", "")
        return {
            "ok": True,
            "jobUrl": payload.get("jobUrl", ""),
            "finalUrl": final_url,
            "message": "Browser is open. Review what the agent filled and submit when you're ready.",
            "summary": str(final_result) if final_result is not None else "",
            "steps": steps_raw,
            "uploaded_files": uploaded_paths,
            "error": None,
        }
    except Exception as e:
        tb = traceback.format_exc(limit=3)
        return {
            "ok": True,
            "jobUrl": payload.get("jobUrl", ""),
            "message": "Agent finished but result parsing partial: " + str(e),
            "steps": [],
            "uploaded_files": [],
            "error": tb,
        }


# ───────────────────────────────────────────────────────────────────────
# Step extraction helpers — pull structured action names from AgentHistory
# instead of dumping the full repr (which gets truncated uselessly).
# ───────────────────────────────────────────────────────────────────────


def _action_dict(action_obj: Any) -> dict:
    """ActionModel is a pydantic model with exactly one non-None field (the
    action that was taken). Turn it into a tidy {name: args} dict."""
    try:
        if hasattr(action_obj, "model_dump"):
            d = action_obj.model_dump(exclude_none=True)
        elif hasattr(action_obj, "dict"):
            d = action_obj.dict(exclude_none=True)
        else:
            d = dict(action_obj.__dict__)
    except Exception:
        return {}
    # Drop keys whose values are None/empty after dump.
    return {k: v for k, v in d.items() if v not in (None, "", [], {})}


def _summarize_args(args: Any, max_len: int = 120) -> str:
    try:
        import json as _j
        s = _j.dumps(args, ensure_ascii=False, default=str)
    except Exception:
        s = str(args)
    return s if len(s) <= max_len else s[: max_len - 1] + "…"


def _extract_steps(history: Any) -> list[dict]:
    out: list[dict] = []
    steps = getattr(history, "history", []) or []
    for step in steps[-40:]:
        mo = getattr(step, "model_output", None)
        if mo is not None:
            actions = getattr(mo, "action", []) or []
            for a in actions:
                ad = _action_dict(a)
                if not ad:
                    continue
                # Each ActionModel has exactly one non-None field → that's the action name.
                for name, args in ad.items():
                    out.append({
                        "action": name,
                        "args": _summarize_args(args),
                    })
                    break
        else:
            # Pure ActionResult rows (no model output) — summarize their
            # extracted_content or errors if any.
            for res in getattr(step, "result", []) or []:
                err = getattr(res, "error", None)
                extracted = getattr(res, "extracted_content", None)
                if err:
                    out.append({"action": "error", "args": str(err)[:160]})
                elif extracted:
                    out.append({"action": "observation", "args": str(extracted)[:160]})
    return out


def _find_uploaded_paths(history: Any, allowed: list[str]) -> list[str]:
    """Scan the action history for file-upload actions and report which
    pre-authorized paths were actually passed to them."""
    hits: set[str] = set()
    steps = getattr(history, "history", []) or []
    for step in steps:
        mo = getattr(step, "model_output", None)
        if mo is None:
            continue
        for a in getattr(mo, "action", []) or []:
            ad = _action_dict(a)
            for name, args in ad.items():
                if "upload" in name.lower():
                    blob = _summarize_args(args, 500)
                    for p in allowed:
                        if p in blob:
                            hits.add(p)
    return sorted(hits)


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read())
    except Exception as e:
        sys.stdout.write(json.dumps(_err(f"Invalid JSON payload on stdin: {e}")) + "\n")
        return 1
    if not payload.get("jobUrl"):
        sys.stdout.write(json.dumps(_err("jobUrl is required")) + "\n")
        return 1

    try:
        result = asyncio.run(run(payload))
    except KeyboardInterrupt:
        result = _err("Interrupted", payload.get("jobUrl", ""))
    except Exception as e:
        result = _err(f"Uncaught error: {e}", payload.get("jobUrl", ""))

    sys.stdout.write(json.dumps(result) + "\n")
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
