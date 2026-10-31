#!/bin/sh
# Dev containers share one node_modules volume (Linux binaries; the host's are built for macOS).
# Reinstall when package-lock.json changes, one container at a time, then run the command.
set -e
mkdir -p node_modules
(
  flock 9
  want=$(sha256sum package-lock.json | cut -d' ' -f1)
  have=$(cat node_modules/.lock-hash 2>/dev/null || true)
  if [ "$want" != "$have" ]; then
    echo "dev-entrypoint: package-lock.json changed, installing dependencies…"
    npm ci --no-audit --no-fund
    echo "$want" > node_modules/.lock-hash
  fi
) 9>/tmp/cyberfunk-install.lock
exec "$@"
