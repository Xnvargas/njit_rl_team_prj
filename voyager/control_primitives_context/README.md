# Control Primitives Context

## Overview
- JavaScript examples injected into prompts to teach the LLM how to invoke Mineflayer APIs.
- Emphasizes call signatures and typical usage patterns without extra guard logic.
- Loaded through `voyager.control_primitives_context.load_control_primitives_context`, which returns raw strings for inclusion in system messages.

## Key Files
- `mineflayer.js` lists pathfinder goals (`GoalNear`, `GoalGetToBlock`, `GoalPlaceBlock`, etc.) and common high-level APIs (`bot.equip`, `bot.activateItem`, `bot.useOn`).
- `mineBlock.js`, `placeItem.js`, `killMob.js`, `useChest.js`, etc., provide templates showing recommended argument shapes and async flow.
- `__init__.py::load_control_primitives_context(primitive_names=None)` mirrors the loader in `control_primitives`, defaulting to every `.js` file when no names are supplied.

## Prompting Considerations
- Context snippets purposefully omit the defensive code found in the executable primitives. They are meant to bias LLM generations rather than run verbatim.
- When adding new primitives, create both an executable implementation and a matching context example so ActionAgent prompts stay synchronized.
- Because Mineflayer globals are referenced (e.g., `GoalNear`, `bot.collectBlock`), keep names aligned with what `voyager/env/mineflayer/index.js` exposes.