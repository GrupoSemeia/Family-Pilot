#!/bin/sh
# Gera docs/revisao-de-conteudo.docx a partir do conteúdo atual (worker/conteudo.ts e worker/modulos/*.ts).
# Requer: npm install (esbuild) e python3 com python-docx.  Uso: sh scripts/revisao/gerar.sh
set -e
cd "$(dirname "$0")/../.."
T=$(mktemp -d)
node_modules/.bin/esbuild scripts/revisao/exportar.ts --bundle --platform=node --format=esm --outfile="$T/e.mjs" --log-level=error
node "$T/e.mjs" "$T/conteudo.json"
python3 scripts/revisao/gerar.py "$T/conteudo.json" docs/revisao-de-conteudo.docx
