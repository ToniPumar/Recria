import { readFileSync, writeFileSync } from 'node:fs'

const ruta = new URL('../dist/index.html', import.meta.url)
let html = readFileSync(ruta, 'utf8')
// O bundle de produción é IIFE; cargámolo como script clásico para permitir file://.
html = html.replace(/<script\s+type="module"\s+crossorigin\s+src="(\.\/assets\/app\.js)"><\/script>/g, '<script defer src="$1"></script>')
html = html.replace(/<script\s+type="module"\s+src="(\.\/assets\/app\.js)"><\/script>/g, '<script defer src="$1"></script>')
writeFileSync(ruta, html)
