# Control Primitives

## Overview
- JavaScript building blocks executed inside the Mineflayer runtime to control the Minecraft bot.
- Exposed to Python via `voyager.control_primitives.load_control_primitives`, which loads file contents into LLM prompts or runtime injections.
- Provides helpers (collecting blocks, crafting, pathing, combat) that Voyager-generated code can call directly.

## Important Functions
- `__init__.py::load_control_primitives(primitive_names=None)` loads the requested `.js` source strings from the package directory.
- `mineBlock.js::mineBlock(bot, name, count=1)` locates nearby blocks using `mcData.blocksByName` and `bot.collectBlock.collect`, throttling repeated failures.
- `exploreUntil.js::exploreUntil(bot, conditionFn, timeout)` (see source) drives long-range exploration over Mineflayer pathfinder goals.
- `craftItem.js::craftItem(bot, name, count)` and `smeltItem.js::smeltItem(bot, inputItem, fuelItem, count)` wrap crafting-table and furnace workflows with automatic inventory checks.
- `useChest.js::useChest(bot, position, callback)` coordinates inventory transfers and ensures chests are reopened until completion.

## Mineflayer-Specific Notes
- These scripts assume Mineflayer globals (`bot`, `mcData`, `bot.collectBlock`, pathfinder `Goal` classes) are registered by `voyager/env/mineflayer/index.js`.
- `bot.save(...)` calls persist state for telemetry.
- Functions throw descriptive errors instead of returning booleans so the Python critic can surface failures through the event stream.
- Keep async signatures (`async function ...`) intact--Voyager awaits these from generated code, and removing `async` will deadlock the bridge.
