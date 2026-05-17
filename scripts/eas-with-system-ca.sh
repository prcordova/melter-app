#!/usr/bin/env bash
set -euo pipefail
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--use-system-ca"
exec npx eas "$@"
