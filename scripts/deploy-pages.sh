#!/usr/bin/env bash
# Interim deploy (used while the Actions workflow is not installed): build and publish dist/ to the gh-pages branch.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
rm -rf /tmp/pp-deploy && mkdir /tmp/pp-deploy && cp -r dist/. /tmp/pp-deploy/ && touch /tmp/pp-deploy/.nojekyll
cd /tmp/pp-deploy
git init -q -b gh-pages
git add -A
git -c user.name=parcelopoly-bot -c user.email=actions@users.noreply.github.com commit -qm "deploy $(date -u +%FT%TZ)"
git push -f https://github.com/kingwize1/parcelopoly.git gh-pages
