const flag = (c: string) => String.fromCodePoint(...[...c].map(x => 127397 + x.charCodeAt(0)))
let cache: { code: string; name: string }[] | null = null
export function countries() {
  if (cache) return cache
  const dn = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' }); const out: { code: string; name: string }[] = []
  for (let a = 65; a < 91; a++) for (let b = 65; b < 91; b++) {
    const code = String.fromCharCode(a, b); let n: string | undefined
    try { n = dn.of(code) } catch { n = undefined }
    if (n && n !== code && !/Unknown|European Union|United Nations|Pseudo/.test(n)) out.push({ code, name: n })
  }
  return (cache = out.sort((x, y) => x.name.localeCompare(y.name)))
}
export const countryName = (c?: string | null) => (c ? countries().find(x => x.code === c)?.name ?? c : '')
export const countryFlag = (c?: string | null) => (c ? flag(c) : '')
