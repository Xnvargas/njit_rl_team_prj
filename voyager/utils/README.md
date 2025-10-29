# Utility Modules

## Overview
- Shared helpers for filesystem access, JSON sanitation, telemetry recording, and external service initialization.
- Imported across agents, the environment bridge, and packaging hooks to hide platform-specific quirks behind stable APIs.

## Core Modules & Functions
- `file_utils.py`
  - `f_join`, `f_mkdir`, `f_listdir` normalize path handling and directory creation across the codebase.
  - `utf_open`, `pack_varargs`, `f_not_empty` provide safe wrappers used by recorders and checkpoint writers.
- `json_utils.py`
  - `fix_and_parse_json` repairs common LLM response issues (missing quotes, imbalanced braces, stray prefixes) before deserializing.
  - `json_load/json_dump` wrap standard JSON IO but respect Voyager's path helpers.
- `record_utils.py`
  - `EventRecorder` tracks inventory, biome, and position trends, serializing event timelines under `ckpt/events`.
  - Automatic filename sanitization (`re.sub` on task names) prevents OS errors when logging runs.
- `watsonx.py`
  - `init_llm_client` and `init_embedding_client` load IBM watsonx credentials from `.env`, configuring chat (`ChatWatsonx`) and embedding (`WatsonxEmbeddings`) clients with Voyager-specific defaults.

## Integration Notes
- IBM credentials (`WATSONX_APIKEY`, `WATSONX_PROJECT`) must be present before any agent instantiation.
- `record_utils` assumes Mineflayer event schemas (`event["status"]` fields and `event["inventory"]` dictionaries).
