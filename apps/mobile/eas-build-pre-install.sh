#!/bin/bash
# Ensure expo config-plugins resolves from the monorepo root
cd "$EAS_BUILD_WORKINGDIR"
npm install expo@^54.0.0 --legacy-peer-deps --no-save 2>/dev/null || true
