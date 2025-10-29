# Prompt Templates

## Overview
- Holds the text templates for the action, critic, curriculum, and skill agents.
- Prompts are loaded at runtime by `load_prompt(prompt_name)`, returning raw strings that feed LangChain `SystemMessage` instances.

## Key Templates
- `action_template.txt` and `action_response_format.txt` define how the ActionAgent must structure control programs and parseable metadata.
- `critic.txt` drives the CriticAgent's JSON success/critique scoring loop.
- `curriculum.txt`, `curriculum_task_decomposition.txt`, and the two `curriculum_qa_step*.txt` templates steer task generation and Q&A refinement.
- `skill.txt` produces docstrings that SkillManager prepends to LLM-generated JavaScript functions.

## Usage Notes
- Templates may include Markdown tables or fenced blocks--the agents treat them as literal strings, so preserve indentation and delimiters when editing.
- Any schema change (e.g., updating `action_response_format.txt`) should be mirrored in downstream JSON parsers such as `voyager.utils.json_utils.fix_and_parse_json`.
