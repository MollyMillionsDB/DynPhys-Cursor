#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
glib-compile-schemas --strict schemas
gjs -m tests/physics.test.js
gjs -m tests/lease.test.js
gjs -m tests/config.test.js
python3 scripts/package.py
