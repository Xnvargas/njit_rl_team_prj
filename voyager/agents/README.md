# Agents Package

## Overview
- Coordinates the language-model-driven agents that decide, critique, and store Minecraft behaviors for Voyager.
- Wraps chat and embedding clients so agent prompts, memories, and feedback persist across episodes.
- Stores checkpoints under `ckpt/` (action history, curriculum progress, skill definitions) to support resume and analysis.

## Key Components
- `action.py::ActionAgent`
  - Builds system prompts by stitching control primitive snippets via `render_system_message`.
  - Converts Mineflayer event logs into structured observations with `render_human_message`, tracking chest state via `update_chest_memory`.
  - Writes generated code to the environment by streaming LLM output obtained from `init_llm_client`.

- `critic.py::CriticAgent`
  - Uses `render_human_message` to summarize the latest world observation and replay errors before judging task success.
  - `check_task_success` toggles between manual confirmation and automatic JSON-scored critiques parsed with `fix_and_parse_json`.

- `curriculum.py::CurriculumAgent`
  - Maintains warm-up rules and task history, turning Mineflayer telemetry into prompt text in `render_observation`.
  - Caches Q&A responses in a Chroma vector store (see `_collection` assertions) and serializes outcomes under `ckpt/curriculum/`.
  
- `skill.py::SkillManager`
  - Loads reusable JavaScript control primitives plus discovered LLM-generated skills into a combined `programs` context.
  - `add_new_skill` versions skills on disk, keeps the Chroma vector index in sync, and stores machine-generated docstrings.

## Non-Standard Implementation Notes
- Agents depend on IBM watsonx (`voyager.utils.watsonx`) instead of OpenAI; `.env` must provide `WATSONX_APIKEY` and `WATSONX_PROJECT`.
- Observations mirror Mineflayer's JSON schema (`events[-1]["status"]`, chest inventories, etc.).
