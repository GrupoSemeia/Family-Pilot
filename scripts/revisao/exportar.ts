// Exporta o conteúdo dos módulos para JSON (entrada de gerar.py). Uso: veja scripts/revisao/gerar.sh
import { CONTEUDO } from '../../worker/conteudo'
import { MODULOS, CATALOGO } from '../../worker/modulos'
import { writeFileSync } from 'node:fs'
writeFileSync(process.argv[2], JSON.stringify({ birra: CONTEUDO, modulos: MODULOS, catalogo: CATALOGO }))
