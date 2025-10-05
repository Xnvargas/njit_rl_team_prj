#!/usr/bin/env bash
set -euo pipefail

info () { echo -e "\033[1;34m[postcreate]\033[0m $*"; }

# Go to workspace root (cloned Voyager repo)
cd /workspaces/"${PWD##*/}"

# --- Python (uv) ---
info "Setting up environment with uv"
uv -v sync --all-extras --dev

info "Installing Voyager (editable mode)"
uv pip install -e .

# --- Node.js (Voyager mineflayer bot)---
if [[ -d "voyager/env/mineflayer" ]]; then
  cd voyager/env/mineflayer

  info "Installing mineflayer dependencies"
  npm install

  info "Compiling TypeScript in mineflayer-collectblock"
  cd mineflayer-collectblock
  npx tsc

  info "Installing Parent deps"
  npm install
fi

# --- Version check ---
echo ""
info "Versions:"
echo "  Python: $(python -V 2>&1)"
echo "  Pip:    $(pip -V 2>&1)"
echo "  Node:   $(node -v 2>/dev/null || echo 'not found')"
echo "  npm:    $(npm -v 2>/dev/null || echo 'not found')"
echo "  Java:   $(java -version 2>&1 | head -n1 || echo 'not found')"
echo ""
info "Voyager environment ready."
