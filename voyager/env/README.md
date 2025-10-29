# Environment Bridge

## Overview
- Implements the interface that connects Voyager to a Mineflayer-powered Minecraft server.
- Manages two long-running processes: a NodeJS mineflayer bridge (`mineflayer/index.js`) and an optional local Minecraft server launched via Azure.
- Makes step/reset calls over HTTP to the Node server (`/start`, `/step`, `/pause`, `/stop`).

## Important Classes
- `bridge.py::VoyagerEnv`
  - `reset` creates reset options (mode, inventory, equipment) and restarts the Mineflayer process before calling `/start`.
  - `step(code, programs)` sends generated JavaScript and skill context to the Node server, pauses the world between steps, and returns decoded telemetry.
  - `check_process` restarts Mineflayer when needed and (optionally) spins up a Minecraft server via `MinecraftInstance`.

- `minecraft_launcher.py::MinecraftInstance`
  - Handles Microsoft authentication with `minecraft_launcher_lib` and spawns the dedicated server using `SubprocessMonitor`.

- `process_monitor.py::SubprocessMonitor`
  - Wraps `psutil.Popen`, pipes stdout through regex-based readiness detection, triggers callbacks on specific log lines, and persists logs per run.

## Mineflayer Integration Notes
- The Node entrypoint (`mineflayer/index.js`) exposes an HTTP service that executes incoming code with access to the `bot` and registered control primitives.
- `VoyagerEnv` assumes the bridge prints `Server started on port <n>` when ready; changing that log line requires updating `ready_match`.
- Both the Minecraft server and Mineflayer log streams are time-stamped to `./logs/`.
- Azure-hosted worlds require `.env` or runtime-provided credentials (`client_id`, `redirect_url`, `secret_value`, `version`). Without them pass `mc_port` to reuse an existing server.
