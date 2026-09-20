#!/usr/bin/env bash
# Ships the working tree to the container, builds and restarts.
#
# .env.local is excluded on purpose: the container's copy holds the app_server
# password, which is generated there. Syncing the local file over it breaks the
# database connection in a way that looks like an auth bug.
set -euo pipefail

HOST="${SOLMARA_HOST:-root@192.168.1.230}"
KEY="${SOLMARA_KEY:-$HOME/.ssh/solmara_deploy}"

cd "$(dirname "$0")/.."

tar czf - \
  --exclude=node_modules --exclude=.next --exclude=.git \
  --exclude='*.tsbuildinfo' --exclude=.env.local \
  . | ssh -i "$KEY" -o BatchMode=yes "$HOST" '
    rm -rf /opt/solmara/app /opt/solmara/components /opt/solmara/lib
    tar xzf - -C /opt/solmara
    chown -R solmara:solmara /opt/solmara
    cd /opt/solmara
    npm run build 2>&1 | tail -5
    systemctl restart solmara
    sleep 3
    systemctl is-active solmara
  '
