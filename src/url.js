const MAX_URLS = 10;

function chave(tipo) { return `recria_urls_${tipo}`; }

export function obterUltimasUrls(tipo) {
  try {
    const v = JSON.parse(localStorage.getItem(chave(tipo)) || "[]");
    return Array.isArray(v) ? v.filter(x => typeof x === "string" && x.trim()).slice(0, MAX_URLS) : [];
  } catch { return []; }
}

export function gardarUrl(tipo, url) {
  const limpa = String(url || "").trim();
  if (!limpa) return obterUltimasUrls(tipo);
  const urls = [limpa, ...obterUltimasUrls(tipo).filter(x => x !== limpa)].slice(0, MAX_URLS);
  try { localStorage.setItem(chave(tipo), JSON.stringify(urls)); } catch {}
  return urls;
}

export function resolverUrlCompartida(url) {
  const orixinal = String(url || "").trim();
  if (!orixinal) throw new Error("Introduce unha URL.");
  let u;
  try { u = new URL(orixinal); } catch { throw new Error("A URL non é válida."); }
  const host = u.hostname.toLowerCase();

  if (host.includes("dropbox.com")) {
    u.searchParams.delete("dl");
    u.searchParams.delete("raw");
    u.searchParams.set("dl", "1");
    return u.toString();
  }

  // Google Sheets: unha ligazón /edit devolve HTML. Convertémola a exportación XLSX.
  const sheet=u.pathname.match(/\/spreadsheets\/d\/([^/]+)/i);
  if ((host.includes("docs.google.com") || host.includes("drive.google.com")) && sheet?.[1]) {
    const gid=u.searchParams.get("gid");
    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheet[1])}/export?format=xlsx${gid?`&gid=${encodeURIComponent(gid)}`:""}`;
  }

  // Ficheiro Excel almacenado en Google Drive.
  if (host.includes("drive.google.com") || host.includes("docs.google.com")) {
    let id = null;
    const m = u.pathname.match(/\/file\/d\/([^/]+)/i);
    if (m) id = m[1];
    id ||= u.searchParams.get("id");
    if (id) return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;
  }
  return u.toString();
}

function nomeDesdeUrl(url, tipo) {
  try {
    const u = new URL(url);
    const n = decodeURIComponent(u.pathname.split("/").filter(Boolean).at(-1) || "");
    if (/\.(xlsx|xls|csv)$/i.test(n)) return n;
  } catch {}
  return tipo === "robot" ? "informe-robot.xlsx" : "libro-explotacion.xlsx";
}

export async function descargarArquivoUrl(url, tipo = "libro") {
  const resolta = resolverUrlCompartida(url);
  let resposta;
  try {
    resposta = await fetch(resolta, { redirect: "follow", cache: "no-store" });
  } catch (erro) {
    throw new Error("Non se puido descargar a URL desde o navegador. Comproba que o enlace é público e permite descargas (CORS)." );
  }
  if (!resposta.ok) throw new Error(`A URL respondeu con erro HTTP ${resposta.status}.`);
  const tipoContido = (resposta.headers.get("content-type") || "").toLowerCase();
  const blob = await resposta.blob();
  if (!blob.size) throw new Error("A URL devolveu un ficheiro baleiro.");
  if (tipoContido.includes("text/html")) {
    throw new Error("A URL devolveu unha páxina web, non o Excel. En Google Sheets usa unha ligazón pública ao documento; a aplicación tenta convertela automaticamente a /export?format=xlsx. Se segue fallando, comproba os permisos de acceso e CORS.");
  }
  const nome = nomeDesdeUrl(resolta, tipo);
  return new File([blob], nome, { type: blob.type || "application/octet-stream" });
}
