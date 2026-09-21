#!/usr/bin/env bash
# Builds the Expo web export and publishes it to the gh-pages branch (GitHub Pages).
# Usage: bash scripts/deploy-web.sh
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
npx expo export -p web --output-dir dist

# Project site is served from /learn/, so asset paths must be relative.
sed -i '' 's#href="/favicon.ico"#href="./favicon.ico"#; s#src="/_expo/#src="./_expo/#; s#<title>learn</title>#<title>Kelime Defteri</title>#' dist/index.html
touch dist/.nojekyll

# Bundle filename is content-hashed before our path rewrite, so bust caches explicitly.
sed -i '' "s#\\.js\" defer#.js?v=$(date +%s)\" defer#" dist/index.html

# Asset URLs (fonts, icons) are baked into the JS bundle as "/assets/..."; re-root them under /learn/.
sed -i '' "s#\"/assets/#\"/learn/assets/#g; s#'/assets/#'/learn/assets/#g" dist/_expo/static/js/web/*.js

# SPA fallback for GitHub Pages (rafgraph/spa-github-pages).
cat > dist/404.html <<'HTML'
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Kelime Defteri</title>
<script>
var pathSegmentsToKeep = 1; var l = window.location;
l.replace(l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' + l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') + (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') + l.hash);
</script></head><body></body></html>
HTML
python3 - <<'PY'
p='dist/index.html'
s=open(p).read()
snip="<script>(function(l){if(l.search[1]==='/'){var d=l.search.slice(1).split('&').map(function(s){return s.replace(/~and~/g,'&')}).join('?');window.history.replaceState(null,null,l.pathname.slice(0,-1)+d+l.hash)}})(window.location);</script>"
open(p,'w').write(s.replace('<title>Kelime Defteri</title>','<title>Kelime Defteri</title>'+snip))
PY

WT=$(mktemp -d)
git worktree prune
git branch -D gh-pages >/dev/null 2>&1 || true
git worktree add --orphan -b gh-pages "$WT"
cp -R dist/. "$WT"/
(cd "$WT" && git add -A && git commit -q -m "Deploy web build" && git push -f origin gh-pages)
git worktree remove --force "$WT"
echo "Yayında: https://hknkybs.github.io/learn/"
