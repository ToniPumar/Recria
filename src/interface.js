import * as XLSX from "xlsx";
import { crearEscenarioRegulacionRecria } from "./planificacion.js";
import {
  cargarConfiguracion,
  guardarConfiguracion,
  restaurarConfiguracionPredeterminada
} from "./configuracion.js";
import { descargarArquivoUrl, obterUltimasUrls, gardarUrl } from "./url.js";


let bloqueoCalculoInicio = 0;
let bloqueoCalculoProfundidade = 0;

export async function executarConBloqueoCalculo(traballo, mensaxe = "Calculando planificación…", minimoMs = 3000) {
  const overlay = document.getElementById("bloqueo-calculo-global");
  const texto = document.getElementById("bloqueo-calculo-mensaxe");
  if (texto) texto.textContent = mensaxe;
  if (bloqueoCalculoProfundidade === 0) {
    bloqueoCalculoInicio = performance.now();
    if (overlay) overlay.hidden = false;
    document.body.classList.add("calculando-global");
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }
  bloqueoCalculoProfundidade++;
  try {
    return await traballo();
  } finally {
    bloqueoCalculoProfundidade = Math.max(0, bloqueoCalculoProfundidade - 1);
    if (bloqueoCalculoProfundidade === 0) {
      const restante = Math.max(0, minimoMs - (performance.now() - bloqueoCalculoInicio));
      if (restante) await new Promise(resolve => setTimeout(resolve, restante));
      if (overlay) overlay.hidden = true;
      document.body.classList.remove("calculando-global");
    }
  }
}
function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatoPorcentaxe(valor) {
  if (valor == null || !Number.isFinite(valor)) return "—";
  return `${valor.toFixed(1).replace(".", ",")} %`;
}

function formatoEuro(valor) {
  if (!Number.isFinite(valor)) return "0 €";
  return new Intl.NumberFormat("gl-ES", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0
  }).format(valor);
}

function formatoData(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("gl-ES").format(data);
}

function etiquetaMesInterface(clave) {
  const [a,m] = String(clave || "").split("-").map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(m)) return String(clave || "—");
  return new Intl.DateTimeFormat("gl-ES", { month: "short", year: "numeric" })
    .format(new Date(a, m - 1, 1))
    .replace(".", "");
}

function dataInput(data) {
  if (!(data instanceof Date)) return "";
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function converterDataInput(valor) {
  if (!valor) return null;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function obterPeriodoSeleccionado() {
  const dataInicio = converterDataInput(document.getElementById("data-inicio-libro")?.value);
  const dataFin = converterDataInput(document.getElementById("data-fin-libro")?.value);
  if (!dataInicio || !dataFin) {
    return { valido: false, erro: "Debes indicar a data inicial e a data final que comprende o Libro de explotación." };
  }
  if (dataInicio > dataFin) {
    return { valido: false, erro: "A data inicial do libro non pode ser posterior á data final." };
  }
  return { valido: true, dataInicio, dataFin };
}

export function obterParametrosEconomicos() {
  const valores = {
    custoOportunidadeFemia: Number(document.getElementById("custo-oportunidade-femia")?.value),
    custoOportunidadeMacho: Number(document.getElementById("custo-oportunidade-macho")?.value),
    custoDiario: Number(document.getElementById("custo-diario")?.value),
    custoMorteVaca: Number(document.getElementById("custo-morte-vaca")?.value),
    valorPerdaFrisonaFemia: Number(document.getElementById("perda-frisona-femia")?.value),
    valorPerdaFrisonaMacho: Number(document.getElementById("perda-frisona-macho")?.value),
    valorPerdaCarneFemia: Number(document.getElementById("perda-carne-femia")?.value),
    valorPerdaCarneMacho: Number(document.getElementById("perda-carne-macho")?.value)
  };
  const invalido = Object.values(valores).some(v => !Number.isFinite(v) || v < 0);
  return invalido
    ? { valido: false, erro: "Os parámetros económicos deben ser números iguais ou superiores a 0." }
    : { valido: true, valores };
}

export function obterParametrosHistoricos() {
  const valores={
    idadeMaximaTenreiroDias:Number(document.getElementById("idade-max-tenreiro")?.value),
    idadeVacaMeses:Number(document.getElementById("idade-vaca-meses")?.value)
  };
  const invalido=Object.values(valores).some(v=>!Number.isFinite(v)||v<=0);
  return invalido?{valido:false,erro:"Os límites de idade do histórico deben ser maiores que 0."}:{valido:true,valores};
}

export function obterParametrosReprodutivos() {
  const valores = {
    idadePrimeiraInseminacionMeses: Number(document.getElementById("idade-primeira-inseminacion")?.value),
    diasLeitePrimeiraInseminacionVacas: Number(document.getElementById("dias-leite-primeira-inseminacion-vacas")?.value),
    diasLeitePrimeiraInseminacionPrimiparas: Number(document.getElementById("dias-leite-primeira-inseminacion-primiparas")?.value),
    taxaPrenezXovencas: Number(document.getElementById("taxa-prenez-xovencas")?.value),
    taxaPrenezVacas: Number(document.getElementById("taxa-prenez-vacas")?.value),
    duracionCicloDias: Number(document.getElementById("duracion-ciclo")?.value),
    duracionXestacionDias: Number(document.getElementById("duracion-xestacion")?.value),
    duracionSecadoDias: Number(document.getElementById("duracion-secado")?.value),
    marxeSeguridadePuntos: Number(document.getElementById("marxe-seguridade")?.value),
    marxeVacasLeite: Number(document.getElementById("marxe-vacas-leite")?.value),
    sexadoPreferencia: document.getElementById("sexado-preferencia")?.value || "XOVENCAS_MELLORES_SE_FAN_FALTA",
    duracionLactacionDescarteDias: Number(document.getElementById("duracion-lactacion-descarte")?.value),
    lactacionsMediasPorVaca: Number(document.getElementById("lactacions-medias-vaca")?.value),
    horizontePlanMeses: Number(document.getElementById("horizonte-plan-meses")?.value)
  };
  const camposNumericos = Object.entries(valores).filter(([k]) => k !== "sexadoPreferencia").map(([,v]) => v);
  const invalido = camposNumericos.some(v => !Number.isFinite(v) || v < 0)
    || valores.taxaPrenezXovencas > 100 || valores.taxaPrenezVacas > 100
    || valores.marxeSeguridadePuntos > 100 || valores.duracionCicloDias < 1 || valores.duracionXestacionDias < 1;
  return invalido
    ? { valido: false, erro: "Revisa os parámetros reprodutivos: deben ser valores válidos e as porcentaxes estar entre 0 e 100." }
    : { valido: true, valores };
}

export function obterParametrosDescarte() {
  const valores={
    delMinPrimiparas:Number(document.getElementById("descarte-del-primiparas")?.value),
    delMinAdultas:Number(document.getElementById("descarte-del-adultas")?.value),
    diasAntesParto:Number(document.getElementById("descarte-dias-parto")?.value),
    desfasePrimiparaPct:Number(document.getElementById("descarte-desfase-primipara")?.value),
    pesoLeite:Number(document.getElementById("descarte-peso-leite")?.value),
    peso305:Number(document.getElementById("descarte-peso-305")?.value),
    pesoCelulas:Number(document.getElementById("descarte-peso-celulas")?.value),
    pesoTempo:Number(document.getElementById("descarte-peso-tempo")?.value)
  };
  if(Object.values(valores).some(v=>!Number.isFinite(v)||v<0)) return {valido:false,erro:"Revisa os parámetros do sistema de descarte."};
  const suma=valores.pesoLeite+valores.peso305+valores.pesoCelulas+valores.pesoTempo;
  if(Math.abs(suma-100)>0.01) return {valido:false,erro:`Os pesos do descarte deben sumar 100 %. Agora suman ${suma.toFixed(1)} %.`};
  return {valido:true,valores};
}

function cargarInputsConfiguracion(config) {
  const mapa = {
    "custo-oportunidade-femia": config.economia.custoOportunidadeFemia,
    "custo-oportunidade-macho": config.economia.custoOportunidadeMacho,
    "custo-diario": config.economia.custoDiario,
    "custo-morte-vaca": config.economia.custoMorteVaca,
    "perda-frisona-femia": config.economia.valorPerdaFrisonaFemia,
    "perda-frisona-macho": config.economia.valorPerdaFrisonaMacho,
    "perda-carne-femia": config.economia.valorPerdaCarneFemia,
    "perda-carne-macho": config.economia.valorPerdaCarneMacho,
    "idade-max-tenreiro": config.historico.idadeMaximaTenreiroDias,
    "idade-vaca-meses": config.historico.idadeVacaMeses,
    "idade-primeira-inseminacion": config.reproducion.idadePrimeiraInseminacionMeses,
    "dias-leite-primeira-inseminacion-vacas": config.reproducion.diasLeitePrimeiraInseminacionVacas,
    "dias-leite-primeira-inseminacion-primiparas": config.reproducion.diasLeitePrimeiraInseminacionPrimiparas,
    "taxa-prenez-xovencas": config.reproducion.taxaPrenezXovencas,
    "taxa-prenez-vacas": config.reproducion.taxaPrenezVacas,
    "duracion-ciclo": config.reproducion.duracionCicloDias,
    "duracion-xestacion": config.reproducion.duracionXestacionDias,
    "duracion-secado": config.reproducion.duracionSecadoDias,
    "marxe-seguridade": config.reproducion.marxeSeguridadePuntos,
    "marxe-vacas-leite": config.reproducion.marxeVacasLeite,
    "sexado-preferencia": config.reproducion.sexadoPreferencia,
    "duracion-lactacion-descarte": config.reproducion.duracionLactacionDescarteDias,
    "lactacions-medias-vaca": config.reproducion.lactacionsMediasPorVaca,
    "horizonte-plan-meses": config.reproducion.horizontePlanMeses,
    "descarte-del-primiparas": config.descarte.delMinPrimiparas,
    "descarte-del-adultas": config.descarte.delMinAdultas,
    "descarte-dias-parto": config.descarte.diasAntesParto,
    "descarte-desfase-primipara": config.descarte.desfasePrimiparaPct,
    "descarte-peso-leite": config.descarte.pesoLeite,
    "descarte-peso-305": config.descarte.peso305,
    "descarte-peso-celulas": config.descarte.pesoCelulas,
    "descarte-peso-tempo": config.descarte.pesoTempo
  };
  for (const [id, valor] of Object.entries(mapa)) {
    const input = document.getElementById(id);
    if (input) input.value = valor;
  }
}


function activarGardadoAutomaticoConfiguracion(callbackDespoisDeGardar=null){
  const contedor=document.getElementById("vista-configuracion");
  if(!contedor||contedor.dataset.autosave==="1") return;
  contedor.dataset.autosave="1";
  let temporizador=null;
  const gardar=()=>{
    const economia=obterParametrosEconomicos();
    const historico=obterParametrosHistoricos();
    const reproducion=obterParametrosReprodutivos();
    const descarte=obterParametrosDescarte();
    if(!economia.valido||!historico.valido||!reproducion.valido||!descarte.valido) return;
    try{
      const gardada=guardarConfiguracion({version:20,economia:economia.valores,historico:historico.valores,reproducion:reproducion.valores,descarte:descarte.valores});
      // Usar sempre o obxecto devolto por localStorage/normalización como fonte de verdade.
      // Así evitamos calcular cunha variable antiga despois de editar un campo.
      cargarInputsConfiguracion(gardada);
      const relida=cargarConfiguracion();
      if(Math.abs(relida.reproducion.taxaPrenezXovencas-reproducion.valores.taxaPrenezXovencas)>1e-9 ||
         Math.abs(relida.reproducion.taxaPrenezVacas-reproducion.valores.taxaPrenezVacas)>1e-9){
        console.warn("A configuración reprodutiva gardada non coincide cos inputs.",{inputs:reproducion.valores,gardada:relida.reproducion});
      }
      const m=document.getElementById("mensaxe-configuracion");
      if(m) m.textContent="Configuración gardada automaticamente.";
      callbackDespoisDeGardar?.(relida);
    }catch{}
  };
  contedor.querySelectorAll("input,select").forEach(el=>{
    const evento=el.tagName==="SELECT"?"change":"input";
    el.addEventListener(evento,()=>{
      clearTimeout(temporizador);
      temporizador=setTimeout(gardar,350);
    });
  });
}

export function inicializarConfiguracion(callbackGardada) {
  cargarInputsConfiguracion(cargarConfiguracion());
  activarGardadoAutomaticoConfiguracion(callbackGardada);

  document.getElementById("boton-gardar-configuracion")?.addEventListener("click", () => {
    const economia = obterParametrosEconomicos();
    const historico = obterParametrosHistoricos();
    const reproducion = obterParametrosReprodutivos();
    const descarte = obterParametrosDescarte();
    const mensaxe = document.getElementById("mensaxe-configuracion");

    if (!economia.valido || !historico.valido || !reproducion.valido || !descarte.valido) {
      if (mensaxe) mensaxe.textContent = !economia.valido ? economia.erro : (!historico.valido ? historico.erro : (!reproducion.valido ? reproducion.erro : descarte.erro));
      return;
    }

    const gardada = guardarConfiguracion({
      version:20,
      economia: economia.valores,
      historico: historico.valores,
      reproducion: reproducion.valores,
      descarte: descarte.valores
    });

    const relida=cargarConfiguracion();
    cargarInputsConfiguracion(relida);
    if (mensaxe) mensaxe.textContent = "Configuración gardada, relida de localStorage e aplicada.";
    callbackGardada?.(relida);
  });

  document.getElementById("boton-restaurar-configuracion")?.addEventListener("click", () => {
    const restaurada = restaurarConfiguracionPredeterminada();
    cargarInputsConfiguracion(restaurada);
    const mensaxe = document.getElementById("mensaxe-configuracion");
    if (mensaxe) mensaxe.textContent = "Valores predeterminados restaurados e gardados.";
    callbackGardada?.();
  });
}


function encherHistorialUrls(select, tipo) {
  if (!select) return;
  const actual=select.value;
  const urls=obterUltimasUrls(tipo);
  select.innerHTML='<option value="">Últimas URLs…</option>'+urls.map(u=>`<option value="${escaparHTML(u)}">${escaparHTML(u)}</option>`).join("");
  if (urls.includes(actual)) select.value=actual;
}

function inicializarCargaUrlLibro(callback) {
  const input=document.getElementById("url-libro");
  const boton=document.getElementById("boton-cargar-url-libro");
  const historial=document.getElementById("historial-url-libro");
  const estado=document.getElementById("estado-url-libro");
  encherHistorialUrls(historial,"libro");
  if(historial) historial.onchange=()=>{ if(historial.value && input) input.value=historial.value; };
  if(boton) boton.onclick=async()=>{
    const periodo=obterPeriodoSeleccionado();
    if(!periodo.valido) return mostrarErroImportacion(periodo.erro);
    const url=input?.value?.trim(); if(!url) return mostrarErroImportacion("Introduce unha URL para o Libro de explotación.");
    boton.disabled=true; if(estado) estado.textContent="Descargando URL…";
    try{
      const arquivo=await descargarArquivoUrl(url,"libro");
      const ok=await callback?.(arquivo);
      if(ok===false) throw new Error("O ficheiro descargado non se puido importar como Libro de explotación.");
      gardarUrl("libro",url); encherHistorialUrls(historial,"libro");
      if(estado) estado.textContent="✓ URL cargada. Gardada no historial deste navegador.";
    }catch(err){ mostrarErroImportacion(err?.message||String(err)); if(estado) estado.textContent=`Erro: ${err?.message||err}`; }
    finally{ boton.disabled=false; }
  };
}

function mediaSimpleHistorica(estatisticas) {
  const completos=(estatisticas?.anos||[]).filter(x=>x.completo);
  const base=completos.length?completos:(estatisticas?.anos||[]);
  const media=f=>{const v=base.map(f).filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;};
  return {femias:media(x=>x.femias?.taxa),xovencas:media(x=>x.xovencas?.taxa),reposicion:media(x=>x.vacas?.reposicion)};
}

function referenciaHistorica(estatisticas, clave) {
  if(clave?.startsWith("ano:")){
    const ano=Number(clave.slice(4)); const x=estatisticas?.anos?.find(a=>a.ano===ano);
    if(x) return {femias:x.femias?.taxa||0,xovencas:x.xovencas?.taxa||0,reposicion:x.vacas?.reposicion||0,descricion:`Ano ${ano}${x.completo?"":" (parcial)"}`};
  }
  if(clave==="media") { const m=mediaSimpleHistorica(estatisticas); return {...m,descricion:"Media simple dos anos completos"}; }
  if(clave==="global") return {femias:estatisticas?.global?.femias?.taxa||0,xovencas:estatisticas?.global?.xovencas?.taxa||0,reposicion:estatisticas?.global?.vacas?.reposicion||0,descricion:"Período completo cargado"};
  return {femias:estatisticas?.mediaPonderada?.femias?.taxa||0,xovencas:estatisticas?.mediaPonderada?.xovencas?.taxa||0,reposicion:estatisticas?.mediaPonderada?.vacas?.reposicion?.taxa||0,descricion:"Media ponderada dos anos completos"};
}

function configurarReferenciaHistorica(estatisticas){
  const select=document.getElementById("plan-referencia-historica"); if(!select) return;
  const gardada=localStorage.getItem("recria_referencia_historica")||"ponderada";
  const anos=(estatisticas?.anos||[]).map(x=>`<option value="ano:${x.ano}">${x.ano}${x.completo?"":" · parcial"}</option>`).join("");
  select.innerHTML=`<option value="ponderada">Media ponderada</option><option value="media">Media simple</option><option value="global">Período completo</option><option value="personalizada">Personalizada · mortalidade femias</option>${anos}`;
  select.value=[...select.options].some(o=>o.value===gardada)?gardada:"ponderada";
  const aplicar=()=>{
    let r=referenciaHistorica(estatisticas,select.value);
    const personalizada=select.value==="personalizada";
    const wrap=document.getElementById("plan-personalizada-femias-wrap");
    const inputPersonalizado=document.getElementById("plan-mort-femias-personalizada");
    if(wrap) wrap.hidden=!personalizada;
    if(personalizada){
      const base=referenciaHistorica(estatisticas,"ponderada");
      let taxa=Number(inputPersonalizado?.value);
      if(!Number.isFinite(taxa)) taxa=Number(localStorage.getItem("recria_mort_femias_personalizada"));
      if(!Number.isFinite(taxa)) taxa=base.femias||0;
      taxa=Math.max(0,Math.min(90,taxa));
      if(inputPersonalizado) inputPersonalizado.value=taxa;
      r={...base,femias:taxa,descricion:`Personalizada · mortalidade femias ${taxa.toFixed(1)} %`};
      try{localStorage.setItem("recria_mort_femias_personalizada",String(taxa));}catch{}
    }
    document.getElementById("plan-mort-femias").value=Number(r.femias||0).toFixed(2);
    document.getElementById("plan-mort-xovencas").value=Number(r.xovencas||0).toFixed(2);
    document.getElementById("plan-reposicion").value=Number(r.reposicion||0).toFixed(2);
    document.getElementById("ref-mort-femias").textContent=`${r.descricion}: ${porcentaxePlan(r.femias)}`;
    document.getElementById("ref-mort-xovencas").textContent=`${r.descricion}: ${porcentaxePlan(r.xovencas)}`;
    document.getElementById("ref-reposicion").textContent=`${r.descricion}: ${porcentaxePlan(r.reposicion)}`;
    const d=document.getElementById("plan-referencia-descricion"); if(d) d.textContent=`Referencia activa: ${r.descricion}.`;
    try{localStorage.setItem("recria_referencia_historica",select.value);}catch{}
    ["plan-mort-femias","plan-mort-xovencas","plan-reposicion"].forEach(id=>{
      const el=document.getElementById(id); if(el) el.dispatchEvent(new Event("input",{bubbles:true}));
    });
  };
  select.onchange=aplicar; const inputPersonalizado=document.getElementById("plan-mort-femias-personalizada"); if(inputPersonalizado){ const gardada=Number(localStorage.getItem("recria_mort_femias_personalizada")); if(Number.isFinite(gardada)) inputPersonalizado.value=Math.max(0,Math.min(90,gardada)); inputPersonalizado.onchange=()=>{ let v=Number(inputPersonalizado.value); if(!Number.isFinite(v)) v=0; inputPersonalizado.value=Math.max(0,Math.min(90,v)); aplicar(); }; } aplicar();
}

function abrirSelectorArquivo() {
  const periodo = obterPeriodoSeleccionado();
  if (!periodo.valido) return mostrarErroImportacion(periodo.erro);
  const input = document.getElementById("input-arquivo");
  if (!input) return;
  input.value = "";
  input.click();
}

export function actualizarResolucion() {
  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  const compatible = ancho >= 1280 && alto >= 720;
  const elemento = document.getElementById("resolucion-actual");
  const avisoDispositivo = document.getElementById("aviso-dispositivo");

  if (elemento) elemento.textContent = `${ancho} × ${alto} px`;

  const tactil = window.matchMedia?.("(pointer: coarse)")?.matches || navigator.maxTouchPoints > 1;
  const tipo = tactil && Math.min(ancho, alto) < 600 ? "móbil" : tactil ? "tablet" : "ordenador";
  if (avisoDispositivo) {
    avisoDispositivo.textContent = tipo === "ordenador"
      ? "O tamaño actual da xanela non é compatible coa aplicación."
      : `A aplicación non está dispoñible neste ${tipo} con esta resolución.`;
  }

  document.documentElement.classList.toggle("resolucion-incompatible", !compatible);
  document.body.classList.toggle("resolucion-incompatible", !compatible);
}

export function inicializarSelectorArquivo(callback) {
  document.getElementById("boton-seleccionar-arquivo")?.addEventListener("click", abrirSelectorArquivo);
  document.getElementById("input-arquivo")?.addEventListener("change", async evento => {
    const arquivo = evento.target.files?.[0];
    if (arquivo) await callback(arquivo);
  });
  inicializarCargaUrlLibro(callback);
  inicializarNavegacion();
}

function inicializarNavegacion() {
  const titulos = {
    resumo: ["Resumo", "Análise histórica de mortalidade, reposición e perdas"],
    rebano: ["Rebaño", "Reconstrución do rebaño nunha data concreta"],
    planificacion: ["Planificación", "Necesidade de femias para reposición e crecemento"],
    configuracion: ["Configuración", "Parámetros globais gardados neste navegador"],
    axuda: ["Axuda", "Como funciona a aplicación e que datos necesita"]
  };
  const botones = [...document.querySelectorAll(".menu-elemento[data-vista]")];
  botones.forEach(boton => boton.addEventListener("click", () => {
    const vista = boton.dataset.vista;
    botones.forEach(item => item.classList.remove("activo"));
    boton.classList.add("activo");
    document.querySelectorAll(".vista").forEach(seccion => {
      seccion.classList.toggle("vista-activa", seccion.id === `vista-${vista}`);
    });
    const [titulo, subtitulo] = titulos[vista] ?? titulos.resumo;
    document.getElementById("titulo-vista").textContent = titulo;
    document.getElementById("subtitulo-vista").textContent = subtitulo;
  }));
}

export function bloquearImportacion(mensaxe = "Procesando o Libro de explotación...") {
  const panel = document.querySelector(".panel-importacion");
  const zona = document.getElementById("zona-subida");
  if (!panel || !zona) return;
  panel.classList.add("procesando-panel");
  const bloqueo = document.createElement("div");
  bloqueo.className = "bloqueo-importacion";
  bloqueo.innerHTML = `<div class="estado-procesando"><div class="spinner"></div><strong>${escaparHTML(mensaxe)}</strong><span>Lendo, comprobando e calculando os datos</span></div>`;
  panel.querySelector(".bloqueo-importacion")?.remove();
  panel.appendChild(bloqueo);
}

export function desbloquearImportacion() {
  const panel = document.querySelector(".panel-importacion");
  panel?.classList.remove("procesando-panel");
  panel?.querySelector(".bloqueo-importacion")?.remove();
}

export function mostrarErroImportacion(mensaxe) {
  const zona = document.getElementById("zona-subida");
  if (!zona) return;
  zona.innerHTML = `<div class="resultado-importacion resultado-erro"><div class="resultado-icono">!</div><h3>Non se puido procesar o arquivo</h3><p>${escaparHTML(mensaxe)}</p><button id="boton-reintentar" type="button" class="boton-principal">Seleccionar outro Excel</button></div>`;
  document.getElementById("boton-reintentar")?.addEventListener("click", abrirSelectorArquivo);
  actualizarEstadoArquivo("Erro no arquivo", mensaxe, "erro");
  document.getElementById("resultados-analise").innerHTML = "";
}

function resumoMortesRaza(item){
  const d=item?.mortesRazaSexo||{};
  const fF=d.frisonaF?.mortes||0,fM=d.frisonaM?.mortes||0,cF=d.carneF?.mortes||0,cM=d.carneM?.mortes||0;
  return `<span class="detalle-mortes"><b>Frisona:</b> F ${fF} · M ${fM}<br><b>Carne:</b> F ${cF} · M ${cM}</span>`;
}
function resumoPerdasRaza(item){
  const d=item?.mortesRazaSexo||{};
  return `<span class="detalle-mortes"><b>Frisona:</b> F ${formatoEuro(d.frisonaF?.perda||0)} · M ${formatoEuro(d.frisonaM?.perda||0)}<br><b>Carne:</b> F ${formatoEuro(d.carneF?.perda||0)} · M ${formatoEuro(d.carneM?.perda||0)}</span>`;
}

function crearFilaAno(item) {
  return `<tr>
    <td><strong>${item.ano}${item.completo ? "" : " · parcial"}</strong><span class="detalle-celda">${formatoData(item.desde)} → ${formatoData(item.ata)}</span></td>
    <td>${formatoPorcentaxe(item.tenreiros.taxa)}<span class="detalle-celda">${item.tenreiros.mortes}/${item.tenreiros.expostos}</span></td>
    <td>${formatoPorcentaxe(item.machos.taxa)}<span class="detalle-celda">${item.machos.mortes}/${item.machos.expostos}</span></td>
    <td>${formatoPorcentaxe(item.femias.taxa)}<span class="detalle-celda">${item.femias.mortes}/${item.femias.expostas}</span></td>
    <td>${formatoPorcentaxe(item.xovencas.taxa)}<span class="detalle-celda">${item.xovencas.mortes}/${item.xovencas.expostas}</span></td>
    <td>${formatoPorcentaxe(item.vacas.mortalidade)}<span class="detalle-celda">${item.vacas.mortes}/${item.vacas.expostas}</span></td>
    <td>${formatoPorcentaxe(item.vacas.reposicion)}<span class="detalle-celda">${item.vacas.mortes + item.vacas.saidas}/${item.vacas.expostas}</span></td>
    <td>${resumoMortesRaza(item)}</td>
    <td>${resumoPerdasRaza(item)}</td>
    <td>${formatoEuro(item.economia.machos)}</td><td>${formatoEuro(item.economia.femias)}</td><td>${formatoEuro(item.economia.xovencas)}</td><td>${formatoEuro(item.economia.vacas)}</td>
    <td class="perda-total"><strong>${formatoEuro(item.economia.total)}</strong></td>
  </tr>`;
}

function mostrarAnalise(estatisticas) {
  const c = document.getElementById("resultados-analise");
  const { periodo, global, mediaPonderada, anos } = estatisticas;
  c.innerHTML = `<article class="panel panel-analise">
    <div class="panel-cabeceira panel-cabeceira-flex"><div><h2>Análise histórica</h2><p>Período global: <strong>${formatoData(periodo.desde)}</strong> → <strong>${formatoData(periodo.ata)}</strong>. Os eventos fóra destas datas non entran nos cálculos.</p></div><div class="perda-total-global"><span>Perda total</span><strong>${formatoEuro(global.economia.total)}</strong></div></div>
    <div class="resumo-global resumo-global-10">
      <div><span>Tenreiros</span><strong>${formatoPorcentaxe(global.tenreiros.taxa)}</strong><small>${global.tenreiros.mortes}/${global.tenreiros.expostos}</small></div>
      <div><span>Machos</span><strong>${formatoPorcentaxe(global.machos.taxa)}</strong><small>${global.machos.mortes}/${global.machos.expostos}</small></div>
      <div><span>Femias</span><strong>${formatoPorcentaxe(global.femias.taxa)}</strong><small>${global.femias.mortes}/${global.femias.expostas}</small></div>
      <div><span>Xovencas</span><strong>${formatoPorcentaxe(global.xovencas.taxa)}</strong><small>${global.xovencas.mortes}/${global.xovencas.expostas}</small></div>
      <div><span>Mort. vacas</span><strong>${formatoPorcentaxe(global.vacas.mortalidade)}</strong><small>${global.vacas.mortes}/${global.vacas.expostas}</small></div>
      <div><span>Reposición</span><strong>${formatoPorcentaxe(global.vacas.reposicion)}</strong><small>${global.vacas.mortes} mortes + ${global.vacas.saidas} saídas adultas Frisona</small></div>
      <div><span>Mortes Frisona</span><strong>F ${global.mortesRazaSexo?.frisonaF?.mortes||0} · M ${global.mortesRazaSexo?.frisonaM?.mortes||0}</strong></div>
      <div><span>Mortes carne</span><strong>F ${global.mortesRazaSexo?.carneF?.mortes||0} · M ${global.mortesRazaSexo?.carneM?.mortes||0}</strong></div>
      <div><span>Perda machos</span><strong>${formatoEuro(global.economia.machos)}</strong></div><div><span>Perda femias</span><strong>${formatoEuro(global.economia.femias)}</strong></div><div><span>Perda xovencas</span><strong>${formatoEuro(global.economia.xovencas)}</strong></div><div><span>Perda vacas</span><strong>${formatoEuro(global.economia.vacas)}</strong></div>
    </div>
    <div class="media-ponderada"><div class="media-ponderada-cabeceira"><div><span class="etiqueta-secundaria">Referencia histórica</span><h3>Media histórica ponderada</h3></div><small>${mediaPonderada.anosIncluidos.length ? `Só anos completos: ${mediaPonderada.anosIncluidos.join(", ")}` : "Aínda non hai anos completos no período"}</small></div>
      <div class="media-ponderada-grella"><div><span>Tenreiros</span><strong>${formatoPorcentaxe(mediaPonderada.tenreiros.taxa)}</strong><small>${mediaPonderada.tenreiros.numerador}/${mediaPonderada.tenreiros.denominador}</small></div><div><span>Machos</span><strong>${formatoPorcentaxe(mediaPonderada.machos.taxa)}</strong><small>${mediaPonderada.machos.numerador}/${mediaPonderada.machos.denominador}</small></div><div><span>Femias</span><strong>${formatoPorcentaxe(mediaPonderada.femias.taxa)}</strong><small>${mediaPonderada.femias.numerador}/${mediaPonderada.femias.denominador}</small></div><div><span>Xovencas</span><strong>${formatoPorcentaxe(mediaPonderada.xovencas.taxa)}</strong><small>${mediaPonderada.xovencas.numerador}/${mediaPonderada.xovencas.denominador}</small></div><div><span>Mort. vacas</span><strong>${formatoPorcentaxe(mediaPonderada.vacas.mortalidade.taxa)}</strong><small>${mediaPonderada.vacas.mortalidade.numerador}/${mediaPonderada.vacas.mortalidade.denominador}</small></div><div><span>Reposición</span><strong>${formatoPorcentaxe(mediaPonderada.vacas.reposicion.taxa)}</strong><small>${mediaPonderada.vacas.reposicion.numerador}/${mediaPonderada.vacas.reposicion.denominador}</small></div></div>
    </div>
    <div class="tabela-scroll"><table class="tabela-anual"><thead><tr><th>Ano</th><th>Tenreiros</th><th>Machos</th><th>Femias</th><th>Xovencas</th><th>Mort. vacas</th><th>Reposición</th><th>Mortes raza/sexo</th><th>Perdas raza/sexo</th><th>Perda machos</th><th>Perda femias</th><th>Perda xovencas</th><th>Perda vacas</th><th>Perda total</th></tr></thead><tbody>${[...anos].reverse().map(crearFilaAno).join("")}</tbody></table></div>
  </article>`;
}

export function mostrarResultadoImportacion({ nomeArquivo, estatisticas, avisos = [] }) {
  const zona = document.getElementById("zona-subida");
  const d = estatisticas.diagnostico;
  zona.innerHTML = `<div class="resultado-importacion resultado-correcto"><div class="resultado-cabeceira"><div><span class="resultado-ok">✓ Libro procesado correctamente</span><h3>${escaparHTML(nomeArquivo)}</h3><span class="anos-analizados">${formatoData(estatisticas.periodo.desde)} → ${formatoData(estatisticas.periodo.ata)}</span></div><button id="boton-cambiar-arquivo" type="button" class="boton-secundario">Cambiar arquivo</button></div>
    <div class="resumo-importacion"><div><span>Animais no período</span><strong>${estatisticas.total}</strong></div><div><span>Mortes</span><strong>${estatisticas.mortes}</strong></div><div><span>Saídas</span><strong>${estatisticas.saidas}</strong></div><div><span>Femias</span><strong>${estatisticas.femias}</strong></div><div><span>Machos</span><strong>${estatisticas.machos}</strong></div></div>
    <div class="diagnostico-periodo"><strong>Control do intervalo</strong><span>${d.baixasAntesInicio} baixas anteriores ignoradas · ${d.nacementosDespoisFin} nacementos posteriores ignorados · ${d.baixasDespoisFin} baixas posteriores non contabilizadas</span></div>
    ${avisos.length ? `<div class="avisos-importacion"><strong>${avisos.length} aviso${avisos.length === 1 ? "" : "s"}</strong><span>Hai rexistros que convén revisar.</span></div>` : ""}</div>`;
  document.getElementById("boton-cambiar-arquivo")?.addEventListener("click", abrirSelectorArquivo);
  actualizarEstadoArquivo("Libro cargado", `${formatoData(estatisticas.periodo.desde)} → ${formatoData(estatisticas.periodo.ata)}`, "correcto");
  mostrarAnalise(estatisticas);
}

export function prepararVistaRebano(dataInicio, dataFin, callback) {
  const input = document.getElementById("data-rebano");
  input.min = dataInput(dataInicio);
  input.max = dataInput(dataFin);
  if (!input.value || input.value < input.min || input.value > input.max) input.value = input.max;
  input.onchange = () => callback?.(converterDataInput(input.value));
  callback?.(converterDataInput(input.value));
}

function idadeTexto(dias) {
  if (dias < 61) return `${dias} días`;
  const meses = Math.floor(dias / 30.4375);
  if (meses < 24) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  return `${anos} anos ${meses % 12} meses`;
}

function nomeGrupo(grupo) {
  return { TENREIRO: "Tenreiro", XOVENCA: "Xovenca", VACA: "Vaca", MACHO_MAIOR: "Macho >60 d" }[grupo] ?? "—";
}

function nomeProducionRobot(valor) {
  return { LACTACION: "En lactación", SECADO: "Secado", GANADO_XOVEN: "Ganado joven" }[valor] ?? "—";
}

function nomeEstadoRobot(valor) {
  return { PRENADA: "Preñada", INSEMINADA: "Inseminada", SEN_INSEMINAR: "Sen inseminar" }[valor] ?? "—";
}

export function mostrarRebano(rebano, data, datosRobot = null, callbackSexado = null, callbackDescarte = null, rankingDescartes = []) {
  const contedor = document.getElementById("resultado-rebano");
  if (!data) return;
  const vacas = rebano.filter(a => a.grupo === "VACA").length;
  const xovencas = rebano.filter(a => a.grupo === "XOVENCA").length;
  const tenreiros = rebano.filter(a => a.grupo === "TENREIRO").length;
  const machosMaiores = rebano.filter(a => a.grupo === "MACHO_MAIOR").length;
  const conRobot = datosRobot instanceof Map;
  const rankingMap=new Map((rankingDescartes||[]).map(x=>[x.crotal,x]));
  const cabeceiraRobot = conRobot ? "<th>Nº robot</th><th>Producción</th><th>Estado reprod.</th><th>Leite 24h</th><th>Graxa</th><th>Proteína</th><th>Leite norm. 4/3,3</th><th>Punt. descarte</th><th>Seme</th><th>Descarte</th>" : "";
  const filas = rebano.map(a => {
    const r = conRobot ? datosRobot.get(a.crotal) : null;
    const podeSexado = r && a.sexo === "F" && ["PRENADA","INSEMINADA"].includes(r.estado);
    const rank=rankingMap.get(a.crotal);
    const podeDescarte = r && a.sexo === "F" && a.grupo === "VACA";
    const columnasRobot = conRobot ? `<td>${r ? escaparHTML(r.numeroVaca) : "—"}</td><td>${r ? escaparHTML(nomeProducionRobot(r.producion)) : "—"}</td><td>${r ? `<span class="badge-robot badge-${String(r.estado).toLowerCase()}">${escaparHTML(nomeEstadoRobot(r.estado))}</span>` : "—"}</td><td>${r?numero(r.producion24,1):"—"}</td><td>${r?numero(r.graxa,2):"—"}</td><td>${r?numero(r.proteina,2):"—"}</td><td><strong>${r?numero(r.leiteNormalizado,1):"—"}</strong></td><td>${rank?`<strong>${numero(rank.score,0)}</strong><br><small>${escaparHTML(rank.motivos.slice(0,2).join(" · "))}</small>`:"—"}</td><td>${r && ["PRENADA","INSEMINADA"].includes(r.estado)?`<select class="selector-seme" data-sexado-crotal="${escaparHTML(a.crotal)}" title="S = sexado · N = normal · C = carne"><option value="S" ${r.tipoSeme==="S"?"selected":""}>S · sexado</option><option value="N" ${r.tipoSeme==="N"?"selected":""}>N · normal</option><option value="C" ${r.tipoSeme==="C"?"selected":""}>C · carne</option></select>`:""}</td><td>${podeDescarte?`<label class="check-sexado"><input type="checkbox" data-descarte-crotal="${escaparHTML(a.crotal)}" ${r.descarte?"checked":""}><span>${r.descarte?"S":"N"}</span></label>`:"—"}</td>` : "";
    return `<tr><td><strong>${escaparHTML(a.crotal)}</strong></td><td>${a.sexo === "F" ? "Femia" : a.sexo === "M" ? "Macho" : "—"}</td><td>${formatoData(a.dataNacemento)}</td><td>${idadeTexto(a.idadeDias)}</td><td><span class="badge-grupo">${nomeGrupo(a.grupo)}</span></td>${columnasRobot}</tr>`;
  }).join("");
  contedor.innerHTML = `<div class="resumo-rebano"><div><span>Total</span><strong>${rebano.length}</strong></div><div><span>Vacas</span><strong>${vacas}</strong></div><div><span>Xovencas</span><strong>${xovencas}</strong></div><div><span>Tenreiros</span><strong>${tenreiros}</strong></div><div><span>Machos >60 d</span><strong>${machosMaiores}</strong></div></div>
    ${conRobot ? `<div class="nota-robot-rebano"><strong>Datos do robot cargados para esta data.</strong> Aquí podes revisar produción, sólidos, leite normalizado e puntuación de descarte. A columna Seme só se mostra en animais xa preñados ou inseminados. S = sexado, N = normal e C = carne. Descarte=S impide programar novas IA desa vaca, aínda que unha preñez xa existente se conserva.</div>` : ""}
    <div class="tabela-scroll"><table class="tabela-anual tabela-rebano"><thead><tr><th>Identificación</th><th>Sexo</th><th>Data nacemento</th><th>Idade a ${formatoData(data)}</th><th>Grupo</th>${cabeceiraRobot}</tr></thead><tbody>${filas}</tbody></table></div>`;
  contedor.querySelectorAll("select[data-sexado-crotal]").forEach(input => input.addEventListener("change", () => {
    callbackSexado?.(input.dataset.sexadoCrotal, input.value);
    const span = input.closest("label")?.querySelector("span");
    if (span) span.textContent = input.checked ? "90 % femia" : "50 % femia";
  }));
  contedor.querySelectorAll("input[data-descarte-crotal]").forEach(input => input.addEventListener("change", () => {
    callbackDescarte?.(input.dataset.descarteCrotal,input.checked);
    const span=input.closest("label")?.querySelector("span"); if(span) span.textContent=input.checked?"Non inseminar":"Seguir no programa";
  }));
}

export function mostrarRebanoSenLibro() {
  document.getElementById("resultado-rebano").innerHTML = `<div class="estado-baleiro"><h3>Primeiro carga un Libro de explotación</h3><p>Despois poderás reconstruír o rebaño en calquera data comprendida no período do ficheiro.</p></div>`;
}


function numero(valor, decimais = 1) {
  if (valor == null || !Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat("gl-ES", {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais
  }).format(valor);
} 
function formatoTempoRobot(seg){
  if(!Number.isFinite(seg)) return "—";
  const total=Math.max(0,Math.round(seg));
  return `${Math.floor(total/60)}:${String(total%60).padStart(2,"0")}`;
}

function porcentaxePlan(valor) {
  return valor == null || !Number.isFinite(valor) ? "—" : `${numero(valor, 1)} %`;
}

function sumarAnoData(data) {
  const r = new Date(data.getFullYear() + 1, data.getMonth(), data.getDate());
  return r;
}

function taxaReferencia(ponderada, global) {
  return Number.isFinite(ponderada) ? ponderada : Number.isFinite(global) ? global : 0;
}

export function prepararVistaPlanificacion(dataInicio, dataFin, estatisticas, callbackCalcular, callbackSituacion, callbackRobot, callbackInvalidarRobot) {
  const senLibro = document.getElementById("planificacion-sen-libro");
  const formulario = document.getElementById("formulario-planificacion");
  if (!formulario) return;

  if (senLibro) senLibro.hidden = true;
  formulario.hidden = false;

  const config = cargarConfiguracion();
  const dataSituacion = document.getElementById("plan-data-situacion");
  const dataObxectivo = document.getElementById("plan-data-obxectivo");

  dataSituacion.min = dataInput(dataInicio);
  dataSituacion.max = dataInput(dataFin);
  dataSituacion.value = dataInput(dataFin);

  if (!dataObxectivo.value) dataObxectivo.value = dataInput(sumarAnoData(dataFin));
  dataObxectivo.min = dataInput(new Date(dataFin.getFullYear(), dataFin.getMonth(), dataFin.getDate() + 1));

  configurarReferenciaHistorica(estatisticas);
  document.getElementById("plan-marxe").value = config.reproducion.marxeSeguridadePuntos;

  const horizonte=document.getElementById("plan-horizonte");
  if(horizonte && !formulario.dataset.horizonteInicializado){
    horizonte.onchange=()=>{
      if(horizonte.value==="custom") return;
      const base=converterDataInput(dataSituacion.value); if(!base) return;
      const meses=Number(horizonte.value)||24;
      const d=new Date(base.getFullYear(),base.getMonth()+meses,base.getDate());
      dataObxectivo.value=dataInput(d);
    };
    dataObxectivo.onchange=()=>{ if(horizonte) horizonte.value="custom"; };
    formulario.dataset.horizonteInicializado="1";
  }
  if(horizonte && !dataObxectivo.dataset.usuarioDefiniu){
    horizonte.value=String(config.reproducion.horizontePlanMeses||24);
    const base=converterDataInput(dataSituacion.value);
    if(base){ const d=new Date(base.getFullYear(),base.getMonth()+(Number(config.reproducion.horizontePlanMeses)||24),base.getDate()); dataObxectivo.value=dataInput(d); }
  }

  const auto = document.getElementById("plan-automatico");
  const botonRobot = document.getElementById("plan-cargar-robot");
  const inputRobot = document.getElementById("plan-input-robot");
  const dataRobot = document.getElementById("plan-data-robot");
  const estadoRobot = document.getElementById("plan-estado-robot");
  const inputUrlRobot = document.getElementById("plan-url-robot");
  const botonUrlRobot = document.getElementById("plan-cargar-url-robot");
  const historialUrlRobot = document.getElementById("plan-historial-url-robot");
  encherHistorialUrls(historialUrlRobot,"robot");
  if(historialUrlRobot) historialUrlRobot.onchange=()=>{ if(historialUrlRobot.value && inputUrlRobot) inputUrlRobot.value=historialUrlRobot.value; };
  const campoLeite = document.getElementById("plan-vacas-leite");
  const campoSecas = document.getElementById("plan-vacas-secas");
  const indicadorAuto = document.getElementById("plan-datos-automaticos");
  let dataRobotValida = formulario.dataset.robotDataValida || null;
  let valoresRobotValidos = formulario.dataset.robotLeite != null && formulario.dataset.robotSecas != null
    ? { leite: Number(formulario.dataset.robotLeite), secas: Number(formulario.dataset.robotSecas) }
    : null;

  const aplicarModo = () => {
    const automatico = Boolean(auto?.checked && dataRobotValida && valoresRobotValidos);
    if (automatico) {
      if (campoLeite) campoLeite.value = valoresRobotValidos.leite;
      if (campoSecas) campoSecas.value = valoresRobotValidos.secas;
    }
    if (campoLeite) campoLeite.readOnly = automatico;
    if (campoSecas) campoSecas.readOnly = automatico;
    campoLeite?.classList.toggle("campo-automatico", automatico);
    campoSecas?.classList.toggle("campo-automatico", automatico);
    if (indicadorAuto) {
      indicadorAuto.hidden = !automatico;
      indicadorAuto.textContent = automatico ? "✓ Datos obtidos automaticamente do informe do robot" : "";
    }
  };

  const actualizarSituacion = () => {
    const data = converterDataInput(dataSituacion?.value);
    const resumo = data ? callbackSituacion?.(data) : null;
    const total = resumo?.total;
    const totalEl = document.getElementById("plan-total-animais");
    if (totalEl) totalEl.textContent = Number.isFinite(total) ? `Animais presentes: ${total}` : "Animais presentes: —";
    validarSumaVacasPlanificacion(total);
  };

  dataSituacion.onchange = () => {
    // Un informe do robot é unha fotografía dunha data concreta: ao cambiala deixa de ser válido.
    if (dataRobotValida && dataSituacion.value !== dataRobotValida) {
      dataRobotValida = null;
      valoresRobotValidos = null;
      delete formulario.dataset.robotDataValida;
      delete formulario.dataset.robotLeite;
      delete formulario.dataset.robotSecas;
      if (auto) auto.checked = false;
      callbackInvalidarRobot?.();
      if (estadoRobot) {
        estadoRobot.textContent = "A Data situación cambiou. Carga un informe do robot correspondente á nova data.";
        estadoRobot.className = "estado-robot aviso-robot";
      }
    }
    if (dataRobot) dataRobot.value = dataSituacion.value;
    aplicarModo();
    actualizarSituacion();
  };
  if (campoLeite) campoLeite.oninput = actualizarSituacion;
  if (campoSecas) campoSecas.oninput = actualizarSituacion;
  actualizarSituacion();

  if (dataRobot && !dataRobot.value) dataRobot.value = dataSituacion.value;
  if (auto) auto.onchange = () => {
    if (auto.checked && !dataRobotValida) {
      auto.checked = false;
      if (estadoRobot) {
        estadoRobot.textContent = "Para activar o modo automático, carga primeiro un informe do robot válido para a Data situación.";
        estadoRobot.className = "estado-robot aviso-robot";
      }
    }
    aplicarModo();
  };
  if (botonRobot) botonRobot.onclick = () => {
    if (inputRobot) {
      inputRobot.value = "";
      inputRobot.click();
    }
  };
  const procesarRobotArquivo = async (arquivo, urlOrixe=null) => {
    if (botonRobot) botonRobot.disabled = true;
    if (botonUrlRobot) botonUrlRobot.disabled = true;
    try {
      const dr = converterDataInput(dataRobot?.value);
      if (estadoRobot) { estadoRobot.textContent = "Procesando e enlazando o informe do robot…"; estadoRobot.className = "estado-robot procesando-robot"; }
      const r = await callbackRobot?.(arquivo, dr);
      const leite = r.resumo?.leite ?? r.datos.filter(x => x.producion === "LACTACION").length;
      const secas = r.resumo?.secas ?? r.datos.filter(x => x.producion === "SECADO").length;
      const xoven = r.resumo?.ganadoXoven ?? r.datos.filter(x => x.producion === "GANADO_XOVEN").length;
      dataRobotValida = dataInput(dr); valoresRobotValidos = { leite, secas };
      formulario.dataset.robotDataValida = dataRobotValida; formulario.dataset.robotLeite = String(leite); formulario.dataset.robotSecas = String(secas);
      if (campoLeite) campoLeite.value = leite; if (campoSecas) campoSecas.value = secas; if (auto) auto.checked = true;
      aplicarModo();
      if(urlOrixe){ gardarUrl("robot",urlOrixe); encherHistorialUrls(historialUrlRobot,"robot"); }
      if (estadoRobot) { const aviso = r.avisos?.length ? ` · ${r.avisos.length} aviso(s) para revisar` : ""; estadoRobot.textContent = `✓ ${r.totalEnlazados}/${r.totalRobot} animais enlazados · ${leite} en leite · ${secas} secas · ${xoven} ganado joven${aviso}.`; estadoRobot.className = "estado-robot correcto-robot"; }
      actualizarSituacion();
    } catch(err) {
      if (estadoRobot) { const mantense = dataRobotValida ? " Mantense activo o último informe válido." : ""; estadoRobot.textContent = `Erro: ${err.message || err}.${mantense}`.replace("..", "."); estadoRobot.className = "estado-robot erro-robot"; }
      if (!dataRobotValida && auto) auto.checked = false; aplicarModo();
    } finally { if (botonRobot) botonRobot.disabled = false; if (botonUrlRobot) botonUrlRobot.disabled = false; }
  };
  if (inputRobot) inputRobot.onchange = async e => { const arquivo=e.target.files?.[0]; if(arquivo) await procesarRobotArquivo(arquivo); e.target.value=""; };
  if (botonUrlRobot) botonUrlRobot.onclick = async()=>{
    const url=inputUrlRobot?.value?.trim();
    if(!url){ if(estadoRobot){estadoRobot.textContent="Erro: introduce unha URL do informe do robot.";estadoRobot.className="estado-robot erro-robot";} return; }
    try{ const arquivo=await descargarArquivoUrl(url,"robot"); await procesarRobotArquivo(arquivo,url); }
    catch(err){ if(estadoRobot){estadoRobot.textContent=`Erro: ${err?.message||err}`;estadoRobot.className="estado-robot erro-robot";} }
  };

  aplicarModo();
  const boton = document.getElementById("boton-calcular-planificacion");
  if (boton) boton.onclick = () => callbackCalcular?.();
}

export function reiniciarModoAutomaticoPlanificacion() {
  const formulario = document.getElementById("formulario-planificacion");
  if (formulario) {
    delete formulario.dataset.robotDataValida;
    delete formulario.dataset.robotLeite;
    delete formulario.dataset.robotSecas;
  }
  const auto = document.getElementById("plan-automatico");
  const leite = document.getElementById("plan-vacas-leite");
  const secas = document.getElementById("plan-vacas-secas");
  const estado = document.getElementById("plan-estado-robot");
  const indicador = document.getElementById("plan-datos-automaticos");
  if (auto) auto.checked = false;
  for (const campo of [leite, secas]) {
    if (!campo) continue;
    campo.readOnly = false;
    campo.classList.remove("campo-automatico");
  }
  if (indicador) {
    indicador.hidden = true;
    indicador.textContent = "";
  }
  if (estado) {
    estado.textContent = "Sen informe cargado. Todo animal do robot debe existir no Libro; un animal do Libro pode non aparecer no robot.";
    estado.className = "estado-robot";
  }
}

function validarSumaVacasPlanificacion(totalAnimais) {
  const leite = Number(document.getElementById("plan-vacas-leite")?.value);
  const secas = Number(document.getElementById("plan-vacas-secas")?.value);
  const aviso = document.getElementById("plan-validacion-vacas");
  if (!aviso || !Number.isFinite(totalAnimais)) return;
  const suma = (Number.isFinite(leite) ? leite : 0) + (Number.isFinite(secas) ? secas : 0);
  const valido = suma <= totalAnimais;
  aviso.textContent = valido
    ? `Adultas indicadas: ${suma} de ${totalAnimais} animais presentes.`
    : `Erro: ${suma} adultas supera os ${totalAnimais} animais presentes.`;
  aviso.classList.toggle("texto-erro", !valido);
  return valido;
}

export function mostrarPlanificacionSenLibro() {
  const senLibro = document.getElementById("planificacion-sen-libro");
  const formulario = document.getElementById("formulario-planificacion");
  if (senLibro) senLibro.hidden = false;
  if (formulario) formulario.hidden = true;
  const resultado = document.getElementById("resultado-planificacion");
  if (resultado) resultado.innerHTML = "";
}

export function obterDatosPlanificacion(totalAnimaisPresentes = null) {
  const dataSituacion = converterDataInput(document.getElementById("plan-data-situacion")?.value);
  const dataObxectivo = converterDataInput(document.getElementById("plan-data-obxectivo")?.value);

  const campos = {
    vacasLeite: Number(document.getElementById("plan-vacas-leite")?.value),
    vacasSecas: Number(document.getElementById("plan-vacas-secas")?.value),
    obxectivoLeite: Number(document.getElementById("plan-obxectivo-leite")?.value),
    mortalidadeFemias: Number(document.getElementById("plan-mort-femias")?.value),
    mortalidadeXovencas: Number(document.getElementById("plan-mort-xovencas")?.value),
    reposicion: Number(document.getElementById("plan-reposicion")?.value),
    marxeSeguridade: Number(document.getElementById("plan-marxe")?.value)
  };

  if (!dataSituacion || !dataObxectivo) {
    return { valido: false, erro: "Indica a data de situación e a data obxectivo." };
  }
  if (dataObxectivo <= dataSituacion) {
    return { valido: false, erro: "A data obxectivo debe ser posterior á data de situación." };
  }
  if (Object.values(campos).some(v => !Number.isFinite(v) || v < 0)) {
    return { valido: false, erro: "Todos os datos da planificación deben ser números iguais ou superiores a 0." };
  }

  const adultas = campos.vacasLeite + campos.vacasSecas;
  if (Number.isFinite(totalAnimaisPresentes) && adultas > totalAnimaisPresentes) {
    return {
      valido: false,
      erro: `As vacas en leite (${campos.vacasLeite}) + secas (${campos.vacasSecas}) = ${adultas}, pero só hai ${totalAnimaisPresentes} animais presentes na data seleccionada.`
    };
  }

  const automatico = Boolean(document.getElementById("plan-automatico")?.checked);
  return { valido: true, dataSituacion, dataObxectivo, totalAnimaisPresentes, automatico, ...campos };
}

export function mostrarErroPlanificacion(mensaxe) {
  const c = document.getElementById("resultado-planificacion");
  if (c) c.innerHTML = `<div class="resultado-plan erro-plan"><strong>Non se puido calcular</strong><span>${escaparHTML(mensaxe)}</span></div>`;
}

export function mostrarResultadoPlanificacion(resultado, callbackSeleccionDescarte = null, callbackRecalcular = null) {
  const c = document.getElementById("resultado-planificacion");
  if (!c) return;
  const d = resultado.dispoñibilidade, n = resultado.necesidade;
  const estado = d.deficit > 0.05 ? "deficit" : "excedente";
  const mensaxePrincipal = d.deficit > 0.05
    ? `Faltan aproximadamente ${numero(d.deficit,1)} novas vacas para cubrir as necesidades ata ${formatoData(resultado.dataObxectivo)}.`
    : `A recría estimada cobre a necesidade ata ${formatoData(resultado.dataObxectivo)} cun excedente de ${numero(d.excedente,1)} novas vacas.`;

  const pipeline = resultado.pipelineRobot;
  const resumoRobot = pipeline?.activo ? `<div class="tarxetas-pipeline tarxetas-pipeline-compactas">
    <div><span>Preñadas confirmadas</span><strong>${numero(pipeline.prenadas,0)}</strong></div>
    <div><span>Inseminadas pendentes</span><strong>${numero(pipeline.inseminadas,0)}</strong></div>
    <div><span>Preñeces probables</span><strong>${numero(pipeline.prenecesProbablesInseminadas,1)}</strong><small>nas inseminadas actuais</small></div>
    <div><span>Femias esperadas</span><strong>${numero(pipeline.femiasEsperadas,1)}</strong><small>90 % sexado · 50 % normal</small></div>
  </div>` : "";

  const confirmado = resultado.proxeccionConfirmada;
  let confirmadoHTML = "";
  if (confirmado?.activo) {
    if (confirmado.filas.length) {
      const obx=Number(resultado.obxectivoLeite||0);
      const marxe=Math.max(0,Number(resultado.marxeVacasLeite)||0);
      confirmadoHTML = `<div class="lenda-plan-leite">
        <div><span>Obxectivo</span><strong>${numero(obx,0)}</strong><small>vacas en leite</small></div>
        <div><span>Marxe operativa</span><strong>+${numero(marxe,0)}</strong><small>non obriga a descartar</small></div>
        <div><span>Zona desexada</span><strong>${numero(obx,0)}–${numero(obx+marxe,0)}</strong><small>vacas en leite</small></div>
        <div><span>Protección futura</span><strong>45 días</strong><small>antes de aceptar un descarte</small></div>
      </div>
      <div class="fluxo-plan"><span class="fluxo-no inicio">Inicio</span><i>→</i><span class="fluxo-no entrada">+ Partos</span><i>→</i><span class="fluxo-no saida">− Secados</span><i>→</i><span class="fluxo-no calculo">Antes descarte</span><i>→</i><span class="fluxo-no saida">− Descartes</span><i>→</i><span class="fluxo-no final">Final</span></div>
      <div id="comparativa-regulacion" class="comparativa-regulacion" hidden></div>
    <div id="editor-regulacion-recria" class="editor-regulacion-recria" hidden></div>
    <div class="tabela-scroll tabela-scroll-plan"><table class="tabela-anual tabela-plan tabela-plan-fluxo"><thead>
        <tr class="cabeceira-grupos"><th rowspan="2">Período</th><th rowspan="2" class="col-inicio">Inicio</th><th colspan="2">Movementos confirmados</th><th rowspan="2">Antes<br>descarte</th><th rowspan="2">Descartes</th><th rowspan="2" class="col-final">Final</th><th rowspan="2">Estado</th></tr>
        <tr><th class="th-entrada">+ Partos</th><th class="th-saida">− Secados</th></tr>
      </thead><tbody>${confirmado.filas.map((x,i) => {
        const ok = x.estado === "CUBERTO";
        const mesActual=x.dataInicio instanceof Date?`${x.dataInicio.getFullYear()}-${x.dataInicio.getMonth()}`:"";
        const ant=i>0&&confirmado.filas[i-1].dataInicio instanceof Date?`${confirmado.filas[i-1].dataInicio.getFullYear()}-${confirmado.filas[i-1].dataInicio.getMonth()}`:"";
        const cambiaMes=i===0||mesActual!==ant;
        let textoEstado;
        if(!ok) textoEstado=`−${numero(Math.abs(x.diferenza),0)} déficit`;
        else if(Math.abs(x.diferenza)<0.05) textoEstado="✓ Obxectivo";
        else if(x.vacasLeite<=obx+marxe+0.05) textoEstado=`✓ +${numero(x.diferenza,0)} marxe`;
        else textoEstado=`+${numero(x.diferenza,0)} · retense por futuro`;
        const sux=(x.descartesSuxeridos||[]);
        const detalle=sux.length?`<details class="descartes-mes"><summary>${sux.length} candidata${sux.length===1?"":"s"} ▾</summary><div class="lista-descartes-plan">${sux.map(v=>`<label class="descarte-candidata ${v.seleccionado?"":"descarte-protexida"}"><input type="checkbox" data-plan-descarte-crotal="${escaparHTML(v.crotal)}" ${v.seleccionado?"checked":""}><span><strong>Vaca ${escaparHTML(v.numeroVaca||v.crotal)}</strong> · ${numero(v.score,0)} pt<br><small>Leite norm. 4/3,3: <strong>${numero(v.leiteNormalizado,1)} kg</strong> · 24 h ${numero(v.producion24,1)} kg · G ${numero(v.graxa,2)} % · P ${numero(v.proteina,2)} %<br>${escaparHTML(v.motivos.slice(0,4).join(" · "))}</small></span></label>`).join("")}</div></details>`:"";
        const descartes=x.descartes?`<strong class="valor-saida">−${numero(x.descartes,0)}</strong>`:"<span class='valor-cero'>—</span>";
        return `<tr class="${ok ? "fila-obxectivo-ok" : "fila-obxectivo-baixo"} ${cambiaMes?"inicio-mes-plan":""}">
          <td class="periodo-plan"><strong>${escaparHTML(x.etiqueta)}</strong></td>
          <td class="numero-plan col-inicio"><strong>${numero(x.vacasInicio,0)}</strong></td>
          <td class="numero-plan entrada-plan">${x.partosConfirmados?`+${numero(x.partosConfirmados,0)}`:"—"}</td>
          <td class="numero-plan saida-plan">${x.secados?`−${numero(x.secados,0)}`:"—"}</td>
          <td class="numero-plan">${numero(x.leiteAntesDescartes,0)}</td>
          <td class="descartes-plan-cela">${descartes}${detalle}</td>
          <td class="numero-plan col-final"><strong>${numero(x.vacasLeite,0)}</strong></td>
          <td><span class="estado-plan estado-${ok?"ok":"deficit"}">${escaparHTML(textoEstado)}</span></td>
        </tr>`;
      }).join("")}</tbody></table></div>
      <p class="nota-fluxo-plan">O valor <strong>Inicio</strong> é exactamente o <strong>Final</strong> da quincena anterior. “Antes descarte” xa incorpora os partos e secados dese período. Un excedente por riba da marxe pode conservarse se fai falta para soportar os eventos confirmados dos 45 días seguintes.</p>`;
    } else {
      confirmadoHTML = `<div class="estado-baleiro estado-baleiro-pequeno"><p>O informe do robot non ten partos ou secados confirmados dentro do horizonte seleccionado.</p></div>`;
    }
  } else {
    confirmadoHTML = `<div class="estado-baleiro estado-baleiro-pequeno"><p>Carga un informe válido do robot para proxectar partos e secados confirmados.</p></div>`;
  }

  const ultimaConfirmada=confirmado?.filas?.at?.(-1);
  const resumoReposicion=ultimaConfirmada ? `<div class="nota-secado-plan"><strong>Reposición acumulada no tramo confirmado:</strong> referencia ${numero(ultimaConfirmada.reposicionAcumuladaObx,1)} vacas · descartes propostos ${numero(ultimaConfirmada.descartesAcumulados,0)} · desviación ${ultimaConfirmada.desviacionReposicion>=0?"+":""}${numero(ultimaConfirmada.desviacionReposicion,1)}. A referencia informa; non forza nin limita un descarte necesario para manter o obxectivo.</div>` : "";

  const accions = resultado.obxectivosReprodutivos?.filas || [];
  const accionsHTML=accions.length?`<div class="tabela-scroll tabela-scroll-plan"><table class="tabela-anual tabela-plan tabela-plan-repro tabela-repro-simple"><thead><tr>
    <th>Mes</th><th>Para partos en</th><th>Xa cuberto</th><th>Falta</th><th>IA recomendadas</th><th>Leite</th><th>Secas</th><th>Recría mínima</th><th>Cabaña mínima</th>
  </tr></thead><tbody>${accions.map(x=>{
    const cuberto=Number(x.confirmadas||0)+Number(x.probables||0);
    const iaTxt=`${numero(x.sexadosXovencas||0,0)} sex. xov. + ${numero(x.sexadosVacas||0,0)} sex. vac. + ${numero(x.carnes||0,0)} carne`;
    const falta=Math.max(0,Number(x.novasPreneces||0));
    const estado=falta<=0.05?"cuberto":(x.fiabilidade==="PLANIFICADA"?"planificado":"accion");
    return `<tr class="fila-repro-${estado}">
      <td><strong>${escaparHTML(x.etiqueta)}</strong></td>
      <td>${escaparHTML(x.paraPartos)}</td>
      <td class="numero-plan"><strong>${numero(cuberto,1)}</strong>
        <details class="detalle-repro"><summary>detalle</summary><div>
          <span>Confirmadas: <b>${numero(x.confirmadas,1)}</b></span>
          <span>Probables: <b>${numero(x.probables,1)}</b> (IA sen confirmar × taxa de preñez)</span>
          <span>Secados coñecidos: <b>${numero(x.secadosConfirmados,1)}</b> conf. + <b>${numero(x.secadosProbables,1)}</b> prob.</span>
          <span>Femias que faltan: <b>${numero(x.femiasNecesarias,1)}</b>, xa corrixido pola mortalidade.</span>
        </div></details>
      </td>
      <td class="numero-plan">${falta>0.05?`<strong>${numero(falta,1)}</strong>`:`<span class="estado-plan estado-ok">✓ Cuberto</span>`}</td>
      <td class="numero-plan"><strong class="ia-destacada">${iaTxt}</strong></td>
      <td class="numero-plan">${numero(x.vacasLeitePrevistas,1)}</td>
      <td class="numero-plan">${numero(x.vacasSecasPrevistas,1)}</td>
      <td class="numero-plan">${numero(x.recriaMinima,1)}</td>
      <td class="numero-plan"><strong>${numero(x.cabanaTotalMinima,1)}</strong></td>
    </tr>`;
  }).join("")}</tbody></table></div>
  <p class="nota-fluxo-plan"><strong>Criterio:</strong> a acción é o número de inseminacións, non o número de preñeces. O programa resta primeiro o que xa está cuberto por preñadas confirmadas e inseminadas sen confirmar, aplica as taxas de preñez e recomenda só as IA que faltan. O sexado úsase unicamente para producir a recría necesaria. A “cabaña mínima” é vacas en leite + secas + recría estrutural mínima; baixa automaticamente se baixa a taxa de reposición ou mellora a supervivencia.</p>`:`<div class="estado-baleiro estado-baleiro-pequeno"><p>Non hai meses accionables dentro do horizonte actual.</p></div>`;
  const seme=resultado.obxectivosReprodutivos?.semeMesActual;
  const semeHTML=seme?`<div class="resumo-seme-mes"><div><span>Que facer en ${escaparHTML(seme.etiqueta)}</span><strong>${numero(seme.sexadosXovencas||0,0)} sex. xov. + ${numero(seme.sexadosVacas||0,0)} sex. vac. + ${numero(seme.carnes||0,0)} carne</strong><small>Para cubrir os partos de ${escaparHTML(seme.paraPartos)} mantendo a recría no mínimo necesario.</small></div><p>Xa están cubertos ${numero((seme.confirmadas||0)+(seme.probables||0),1)} partos esperados; faltan ${numero(seme.novasPreneces,1)} preñeces novas antes de aplicar a taxa de preñez ás IA.</p></div>`:"";


  let modoRegulacion=false;
  let mesSaidaRecria=resultado.dataSituacion?`${resultado.dataSituacion.getFullYear()}-${String(resultado.dataSituacion.getMonth()+1).padStart(2,"0")}`:"";
  const idsRegulados=new Set();
  let escenarioRegulado=crearEscenarioRegulacionRecria(resultado);
  const balanceBase=resultado.balanceMensual?.filas||[];
  let balance=balanceBase;
  const duracionDescarteHTML=`<div class="aviso-horizonte"><strong>Vacas marcadas Descarte=S:</strong> pasan a ser candidatas ao chegar a ${Math.round(resultado.duracionLactacionDescarteDias||0)} DEL. Non se eliminan automaticamente: consérvanse se fan falta para manter o lote de ordeño nos meses seguintes.</div>`;

  const balanceHTML=balance.length?`<div class="calendario-plan bloque-balance-principal">
    <div class="panel-cabeceira"><div><span class="etiqueta-secundaria">Plan mensual único</span><h3>Fluxo do rabaño</h3><p>Comeza cos datos reais da Data situación. Cada fila explica como pasamos do leite de inicio ao leite final dese mes e que IA fan falta agora para o futuro.</p></div>
    <div class="accion-plan"><button type="button" class="boton-secundario" id="alternar-regulacion-recria">⚖ Regular recría</button><button type="button" class="boton-secundario" id="abrir-calendario-plan">📅 Calendario</button><button type="button" class="boton-secundario" id="imprimir-plan">Informe PDF</button><button type="button" class="boton-secundario" id="exportar-plan-excel">Excel</button></div></div>
    <div id="comparativa-regulacion" class="comparativa-regulacion" hidden></div>
    <div id="editor-regulacion-recria" class="editor-regulacion-recria" hidden></div>
    <div class="tabela-scroll tabela-scroll-plan"><table class="tabela-anual tabela-plan tabela-balance-rabano"><thead><tr>
      <th>Detalle</th><th>Mes</th><th>Leite inicio</th><th>+ Partos</th><th>− Secados</th><th>− Descartes</th><th>Regulación recría</th><th>Leite final</th><th>Secas final</th><th>Recría femia</th><th>Femias a producir</th><th>IA totais</th><th>IA sex. xov.</th><th>IA sex. vac.</th><th>IA carne</th><th>Cabaña</th><th>Estado</th>
    </tr></thead><tbody>${balance.map(x=>`<tr class="${x.deficitLeite>=1?"fila-obxectivo-baixo":(x.excesoLeite>=1?"fila-balance-exceso":"fila-obxectivo-ok")}">
      <td class="detalle-celda">${x.detalleIA?`<details class="detalle-raciocinio"><summary>Ver</summary><div class="detalle-raciocinio-panel">
        <strong>Por que estas IA?</strong>
        <span><b>IA obrigatorias polo calendario:</b> ${Math.round(x.detalleIA.iaObligatoriasXovencas||0)} xovencas + ${Math.round(x.detalleIA.iaObligatoriasVacas||0)} vacas. Estas IA fanse porque os animais chegaron á idade/DEL ou son repeticións estatísticas. As xovencas que se conservan como recría van sempre con sexado por mellora xenética; non depende de que falte recría.</span>
        <span>O calendario corta novas IA cando se alcanza a media de <b>${numero(resultado.reproducion.lactacionsMediasPorVaca,1)} lactacións</b>. Se unha vaca xa estaba inseminada/preñada por riba dese límite, respéctase esa preñez e o corte faise despois do seguinte parto.</span>
        <span>Partos esperados ligados ao calendario: <b>${numero(x.detalleIA.partosNecesarios||0,1)}</b>, arredor de ${escaparHTML(x.detalleIA.paraPartos||"—")}.</span>
        <span>Xa confirmados: <b>${numero(x.detalleIA.confirmadas||0,1)}</b>.</span>
        <span>IA pendentes: <b>${Math.round(x.detalleIA.inseminadasPendentes||0)}</b> (${Math.round(x.detalleIA.inseminadasSexadas||0)} sexadas + ${Math.round(x.detalleIA.inseminadasConvencionais||0)} normais + ${Math.round(x.detalleIA.inseminadasCarne||0)} carne), que pola taxa de preñez equivalen a <b>${numero(x.detalleIA.probables||0,2)}</b> preñeces esperadas.</span>
        <span>Femias xa esperadas dese pipeline: <b>${numero(x.detalleIA.femiasXa||0,2)}</b>.</span>
        <span>Femias que quedan por producir despois de asignar o seme deste mes: <b>${numero(x.detalleIA.femiasNecesarias||0,2)}</b>.</span>
        <span>Taxa preñez: xovencas <b>${numero(x.detalleIA.taxaPrenezXovencas||0,1)}%</b> · vacas <b>${numero(x.detalleIA.taxaPrenezVacas||0,1)}%</b>. Supervivencia recría usada: <b>${numero((x.detalleIA.supervivenciaRecria||0)*100,1)}%</b>.</span>
        <span><b>${escaparHTML(x.detalleIA.motivoSexado||"")}</b></span>
        ${x.detalleIA.insuficienciaFemias?`<span class="saldo-negativo"><b>Aviso:</b> nin usando todas as xovencas dispoñibles para sexado se cobre a femia futura estimada.</span>`:""}
      </div></details>`:"—"}</td>
      <td><strong>${escaparHTML(x.etiqueta)}</strong></td>
      <td class="numero-plan"><strong>${x.leiteInicio}</strong></td>
      <td class="numero-plan">${x.partos?`+${x.partos}`:"—"}</td>
      <td class="numero-plan">${x.secados?`−${x.secados}`:"—"}</td>
      <td class="numero-plan">${x.descartes?`−${x.descartes}`:"—"}</td>
      <td class="numero-plan">${x.regulacionRecria?`<strong>−${x.regulacionRecria}</strong><small>venda/saída proposta</small>`:"—"}</td>
      <td class="numero-plan"><strong>${x.leiteFinal}</strong></td>
      <td class="numero-plan">${x.secasFinal}</td>
      <td class="numero-plan"><strong>${Math.round(x.recriaPrevista)}</strong><small>referencia estrutural ${Math.round(x.recriaNecesaria)}</small></td>
      <td class="numero-plan">${x.femiasAProducir?`<strong>${x.femiasAProducir}</strong>`:"0"}<small>futuras, non déficit actual</small></td>
      <td class="numero-plan"><strong>${Math.round((x.detalleIA?.iaObligatoriasXovencas||0)+(x.detalleIA?.iaObligatoriasVacas||0))}</strong><small>por idade/DEL + repeticións</small></td>
      <td class="numero-plan"><strong class="ia-destacada">${Math.round(x.detalleIA?.sexadosXovencas||0)}</strong></td>
      <td class="numero-plan"><strong class="ia-destacada">${Math.round(x.detalleIA?.sexadosVacas||0)}</strong></td>
      <td class="numero-plan">${x.iaCarne||0}</td>
      <td class="numero-plan"><strong>${x.cabanaTotal}</strong><small>${x.leiteFinal} leite + ${x.secasFinal} secas + ${Math.round(x.recriaPrevista)} recría</small></td>
      <td><span class="estado-plan ${x.deficitLeite>=1?"estado-deficit":"estado-ok"}">${escaparHTML(x.estado)}</span></td>
    </tr>`).join("")}</tbody></table></div>
    <dialog id="dialogo-calendario-plan" class="dialogo-calendario"><div class="calendario-modal"><div class="calendario-cabeceira"><button type="button" id="cal-mes-anterior">‹</button><h3 id="cal-titulo-mes">Calendario</h3><button type="button" id="cal-mes-seguinte">›</button><button type="button" id="pechar-calendario-plan">✕</button></div><div id="calendario-plan-contido"></div></div></dialog>
    <p class="nota-fluxo-plan"><strong>IA totais</strong> vén primeiro do calendario dos animais: xovencas ao chegar á idade de IA, vacas aos DEL configurados e repeticións segundo a taxa de preñez. <strong>Femias a producir</strong> non significa “faltan esas xovencas hoxe”. É a descendencia femia futura que aínda queda por cubrir despois de contar recría existente, preñadas confirmadas e IA pendentes coas súas probabilidades. As IA sexadas en xovencas/vacas e as IA de carne son a acción dese mes. Os machos non entran no cálculo de recría.</p>
  </div>`:"";
  c.innerHTML = `<div class="resultado-plan ${estado}">
    <div class="resultado-plan-cabeceira"><div><span class="etiqueta-secundaria">Resultado</span><h3>${mensaxePrincipal}</h3></div><div class="cobertura-plan"><span>Cobertura da reposición/recría</span><strong>${porcentaxePlan(d.cobertura)}</strong><small>${numero(d.entradasPrevistas,1)} previstas / ${numero(n.entradasTotais,1)} necesarias</small></div></div>
    <div class="tarxetas-plan"><div><span>Reposición necesaria</span><strong>${numero(n.reposicion,1)}</strong></div><div><span>Crecemento necesario</span><strong>${numero(n.crecemento,1)}</strong></div><div><span>Recría prevista</span><strong>${numero(d.entradasPrevistas,1)}</strong><small>estimación probabilística</small></div><div class="tarxeta-destacada"><span>Femias adicionais a criar</span><strong>${d.femiasAdicionaisACriar==null?"—":numero(d.femiasAdicionaisACriar,1)}</strong><small>corrixido por mortalidade</small></div></div>
    <div class="taxas-usadas"><strong>Taxas utilizadas</strong><span>Reposición ${porcentaxePlan(resultado.taxas.reposicionUsada)} · Preñez vacas ${porcentaxePlan(resultado.reproducion.taxaPrenezVacas)} · Preñez xovencas ${porcentaxePlan(resultado.reproducion.taxaPrenezXovencas)} · marxe recría ${numero(resultado.taxas.marxe,1)} puntos · marxe leite ${numero(resultado.marxeVacasLeite,0)} vacas</span></div>
    ${resumoRobot}
    ${duracionDescarteHTML}
    ${resultado.horizonte?.limitado?`<div class="aviso-horizonte"><strong>Horizonte aplicado:</strong> ${formatoData(resultado.horizonte.finCalculado)}. Motivo: ${escaparHTML(resultado.horizonte.motivoLimite||"horizonte configurado")}. A simulación si inclúe unha xeración virtual adicional: as fillas dos animais que existen hoxe poden medrar, inseminarse e chegar ao primeiro parto; as súas propias crías xa non se simulan.</div>`:`<div class="aviso-horizonte aviso-horizonte-ok"><strong>1ª xeración virtual activa.</strong> As fillas previstas dos animais actuais poden avanzar ata a IA e primeiro parto dentro do horizonte; non se crean netas.</div>`}
    ${balanceHTML}
  </div>`;
  // Calendario diario e exportación do plan
  let mesesEventos=(resultado.pipelineRobot?.calendario||[]).filter(m=>Array.isArray(m.eventos));
  let indiceMesCalendario=Math.max(0,mesesEventos.findIndex(m=>m.mes===balance[0]?.mes));
  const dialogo=c.querySelector("#dialogo-calendario-plan");
  const renderCalendario=()=>{
    if(!mesesEventos.length){const z=c.querySelector("#calendario-plan-contido");if(z)z.innerHTML="<p>Non hai eventos no horizonte.</p>";return;}
    const m=mesesEventos[Math.max(0,Math.min(indiceMesCalendario,mesesEventos.length-1))];
    const [ano,mes]=m.mes.split("-").map(Number);
    const primeiro=new Date(ano,mes-1,1), dias=new Date(ano,mes,0).getDate();
    const inicioSemana=(primeiro.getDay()+6)%7;
    const titulo=c.querySelector("#cal-titulo-mes");if(titulo)titulo.textContent=m.etiqueta;
    const porDia=new Map();
    for(const ev of (m.eventos||[])){const d=new Date(ev.data).getDate();if(!porDia.has(d))porDia.set(d,[]);porDia.get(d).push(ev);}
    let html='<div class="cal-grid cal-semana"><b>Lun</b><b>Mar</b><b>Mér</b><b>Xov</b><b>Ven</b><b>Sáb</b><b>Dom</b></div><div class="cal-grid">';
    for(let i=0;i<inicioSemana;i++)html+='<div class="cal-dia cal-baleiro"></div>';
    for(let d=1;d<=dias;d++){
      const evs=porDia.get(d)||[];
      html+=`<div class="cal-dia"><strong>${d}</strong>${evs.map(ev=>`<div class="cal-evento"><b>${escaparHTML(String(ev.tipo||"Evento").replaceAll("_"," "))}</b><span>${escaparHTML(ev.identificacion||"Sen identificación")}${Number(ev.peso)<.995?` · ${numero(Number(ev.peso),2)}`:""}</span><small>${escaparHTML(ev.detalle||"")}</small></div>`).join("")}</div>`;
    }
    html+="</div>"; const z=c.querySelector("#calendario-plan-contido");if(z)z.innerHTML=html;
  };

  const recalcularEscenarioRegulado=()=>{
    const [a,m]=String(mesSaidaRecria||"").split("-").map(Number);
    const inicioMes=Number.isFinite(a)&&Number.isFinite(m)?new Date(a,m-1,1):resultado.dataSituacion;
    // Se se escolle o mes actual, nunca aplicamos unha saída antes da Data situación.
    const dataSaida=(inicioMes instanceof Date && resultado.dataSituacion instanceof Date && inicioMes<resultado.dataSituacion)
      ? new Date(resultado.dataSituacion)
      : inicioMes;
    escenarioRegulado=crearEscenarioRegulacionRecria(resultado,{ids:[...idsRegulados],dataSaida});
  };

  const renderEditorRegulacion=()=>{
    const ed=c.querySelector("#editor-regulacion-recria");if(!ed)return;
    ed.hidden=!modoRegulacion;if(!modoRegulacion){ed.innerHTML="";return;}
    const rec=escenarioRegulado.recomendacions||[],cand=escenarioRegulado.candidatas||[];
    const seleccionPorPico=new Map();
    cand.filter(x=>idsRegulados.has(String(x.id))).forEach(x=>(x.mesesPico||[]).forEach(m=>seleccionPorPico.set(m,(seleccionPorPico.get(m)||0)+1)));
    const recHTML=rec.length?rec.map(r=>{
      const pico=String(r.mesParto||r.mes||"");
      const seleccionadas=seleccionPorPico.get(pico)||0;
      const pendentes=Math.max(0,Number(r.cantidade||0)-seleccionadas);
      const cuberta=pendentes===0;
      return `<div class="reg-recomendacion ${cuberta?"reg-ok":""}"><div class="reg-rec-top"><strong>${escaparHTML(r.etiquetaParto)}</strong><span class="reg-rec-badge">${cuberta?"✓ Cuberta":`${pendentes} pendente${pendentes===1?"":"s"}`}</span></div><span>${cuberta?"Selección suficiente para este pico":`Valorar saída de <b>${pendentes}</b> máis`}</span><small>${escaparHTML(r.explicacion)}</small></div>`;
    }).join(""):`<div class="reg-recomendacion reg-ok"><strong>Sen pico claro</strong><small>Podes igualmente simular saídas manuais para comparar o resultado.</small></div>`;
    const filas=cand.map(x=>{
      const marcada=idsRegulados.has(String(x.id));
      const dn=x.dataNacemento instanceof Date?formatoData(x.dataNacemento):"—";
      const idade=Number.isFinite(Number(x.idadeMeses))?`${numero(Number(x.idadeMeses),1)} m`:"—";
      const ia=x.iaPrincipal?.data instanceof Date?formatoData(x.iaPrincipal.data):"—";
      const parto=(x.dataPartoEsperada instanceof Date?formatoData(x.dataPartoEsperada):(x.partoPrincipal?.data instanceof Date?formatoData(x.partoPrincipal.data):"—"));
      const estadoRaw=String(x.estado||"").toUpperCase();
      let estado="Sen inseminar", detalleRepro="";
      if(x.virtual){estado="Futura · 1ª xeración";detalleRepro=`Nacemento estimado ${dn}`;}
      else if(estadoRaw==="PRENADA"){estado="PREÑADA";detalleRepro=Number.isFinite(Number(x.diasXestacion))?`${numero(Number(x.diasXestacion),0)} días de xestación`:"Preñez confirmada";}
      else if(estadoRaw==="INSEMINADA"){estado="INSEMINADA";detalleRepro="Preñez aínda non confirmada";}
      else if(estadoRaw==="SEN_INSEMINAR"){estado="SEN INSEMINAR";detalleRepro="Aínda sen IA confirmada no robot";}
      else if(estadoRaw==="FORA_ROBOT"){estado="Sen inseminar · fóra do robot";detalleRepro="Recría real do Libro";}
      const iaTexto=(x.virtual||!["PRENADA","INSEMINADA"].includes(estadoRaw))?ia:(estadoRaw==="INSEMINADA"?"Xa inseminada":"Xa preñada");
      const picoTexto=x.mesesPico?.length?x.mesesPico.map(m=>etiquetaMesInterface(m)).join(", "):"—";
      const tooltip=`<span class="reg-tooltip" role="tooltip"><b>${escaparHTML(x.identificacion||x.id)}</b><span><small>Idade</small><strong>${idade}</strong></span><span><small>Nacemento</small><strong>${dn}</strong></span><span><small>Estado actual</small><strong>${escaparHTML(estado)}</strong></span>${detalleRepro?`<span><small>Detalle</small><strong>${escaparHTML(detalleRepro)}</strong></span>`:""}<span><small>IA probable</small><strong>${iaTexto}</strong></span><span><small>Parto probable</small><strong>${parto}</strong></span><span><small>Impacto</small><strong>${x.mesesPico?.length?escaparHTML(picoTexto):"Non afecta directamente aos picos recomendados"}</strong></span></span>`;
      return `<label class="reg-animal reg-animal-tooltip ${x.pesoMesRecomendado>0?"reg-animal-recomendado":""}"><input type="checkbox" class="reg-check" data-id="${escaparHTML(String(x.id))}" ${marcada?"checked":""}><span class="reg-identidade"><b>${escaparHTML(x.identificacion||x.id)}</b><small>${x.virtual?"Animal virtual":escaparHTML(String(x.crotal||x.id))}</small></span><span class="reg-idade"><b>${idade}</b><small>${dn}</small></span><span class="reg-estado-visible"><b>${escaparHTML(estado)}</b><small>${escaparHTML(detalleRepro)}</small></span><span class="reg-ia-visible"><b>${iaTexto}</b><small>IA probable</small></span><span class="reg-parto-visible"><b>${parto}</b><small>Parto probable</small></span><span class="reg-pico-visible ${x.mesesPico?.length?"":"reg-pico-neutro"}"><b>${escaparHTML(picoTexto)}</b><small>${x.mesesPico?.length?"Pico afectado":"Sen impacto directo"}</small></span>${tooltip}</label>`;
    }).join("");
    const decisions=escenarioRegulado.decisions||[];
    ed.innerHTML=`<div class="reg-layout"><section class="reg-picos-panel"><div class="reg-seccion-titulo"><span class="reg-paso">1</span><div><strong>Picos detectados</strong><small>Prioriza as xovencas amarelas que alimentan estes picos.</small></div></div><div class="reg-recomendacions">${recHTML}</div></section><section class="reg-decision-panel"><div class="reg-seccion-titulo"><span class="reg-paso">2</span><div><strong>Decisión de saída</strong><small>Escolle o mes e marca os animais que queres retirar do escenario.</small></div></div><label class="reg-mes">Mes de saída <input type="month" id="mes-saida-recria" value="${escaparHTML(mesSaidaRecria)}"></label><small class="reg-data-aviso">Se escolles o mes da Data situación, a saída aplícase como mínimo desde ${formatoData(resultado.dataSituacion)}.</small><div class="reg-seleccion-kpi"><span>Seleccionadas</span><strong>${idsRegulados.size}</strong></div></section></div><div class="reg-lista-bloque"><div class="reg-lista-cabeceira"><div><strong>Xovencas de recría dispoñibles</strong><small>Só sen Nº de lactación + 1ª xeración virtual. Amarelo = afecta directamente a un pico recomendado.</small></div><span>${cand.length} dispoñibles</span></div><div class="reg-tabla-head"><span></span><span>Animal</span><span>Idade</span><span>Estado</span><span>IA probable</span><span>Parto probable</span><span>Impacto</span></div><div class="reg-lista">${filas||"<p>Non hai recría dispoñible no horizonte.</p>"}</div></div><div class="reg-decisions"><div><strong>Decisións aplicadas</strong><small>Saídas que modifican o escenario regulado.</small></div><div class="reg-decision-chips">${decisions.length?decisions.map(d=>`<span><b>${escaparHTML(d.identificacion)}</b><small>saída ${formatoData(d.dataSaida)}</small></span>`).join(""):"<small>Aínda non seleccionaches ningún animal.</small>"}</div></div>`;
    ed.querySelector("#mes-saida-recria")?.addEventListener("change",async e=>{mesSaidaRecria=e.target.value;await executarConBloqueoCalculo(async()=>{recalcularEscenarioRegulado();pintarModoRegulacion();},"Recalculando regulación de recría…");});
    ed.querySelectorAll(".reg-check").forEach(inp=>inp.addEventListener("change",async()=>{const id=String(inp.dataset.id||"");if(inp.checked)idsRegulados.add(id);else idsRegulados.delete(id);await executarConBloqueoCalculo(async()=>{recalcularEscenarioRegulado();pintarModoRegulacion();},"Recalculando regulación de recría…");}));
  };

  const pintarModoRegulacion=()=>{
    balance=modoRegulacion?escenarioRegulado.filas:balanceBase;
    mesesEventos=(modoRegulacion?escenarioRegulado.calendario:(resultado.pipelineRobot?.calendario||[])).filter(m=>Array.isArray(m.eventos));
    const boton=c.querySelector("#alternar-regulacion-recria"); if(boton)boton.textContent=modoRegulacion?"↩ Volver ao plan base":"⚖ Regular recría";
    const comp=c.querySelector("#comparativa-regulacion");
    if(comp){
      comp.hidden=!modoRegulacion;
      comp.innerHTML=modoRegulacion?`<div class="comparativa-titulo"><strong>Impacto da regulación</strong><small>Comparación automática co plan base.</small></div><div class="comparativa-kpis"><div><span>Xovencas seleccionadas</span><strong>${escenarioRegulado.totalRegulado}</strong></div><div><span>Descartes adultos</span><strong>${numero(escenarioRegulado.comparativa.descartesBase,0)} <i>→</i> ${numero(escenarioRegulado.comparativa.descartesReg,0)}</strong></div><div><span>Descartes evitados</span><strong>${numero(escenarioRegulado.descartesAdultosEvitados,0)}</strong></div><div><span>IA sexadas xovencas</span><strong>${numero(escenarioRegulado.comparativa.iaSexadasBase,0)} <i>→</i> ${numero(escenarioRegulado.comparativa.iaSexadasReg,0)}</strong></div><div><span>Pico vacas en leite</span><strong>${numero(escenarioRegulado.comparativa.picoBase,0)} <i>→</i> ${numero(escenarioRegulado.comparativa.picoRegulado,0)}</strong></div></div><small class="comparativa-nota">Escenario simulado. O calendario e o algoritmo base seguen gardados sen modificación.</small>`:"";
    }
    renderEditorRegulacion();
    [...c.querySelectorAll(".tabela-balance-rabano tbody tr")].forEach((tr,i)=>{
      const x=balance[i]; if(!x)return; const td=tr.querySelectorAll("td"); if(td.length<17)return;
      td[5].innerHTML=x.descartes?`−${x.descartes}`:"—";
      td[6].innerHTML=x.regulacionRecria?`<strong>−${x.regulacionRecria}</strong><small>saída aplicada</small>`:"—";
      td[7].innerHTML=`<strong>${x.leiteFinal}</strong>`;
      td[9].innerHTML=`<strong>${Math.round(x.recriaPrevista)}</strong><small>referencia estrutural ${Math.round(x.recriaNecesaria)}</small>`;
      td[15].innerHTML=`<strong>${x.cabanaTotal}</strong><small>${x.leiteFinal} leite + ${x.secasFinal} secas + ${Math.round(x.recriaPrevista)} recría</small>`;
      td[16].innerHTML=`<span class="estado-plan ${x.deficitLeite>=1?"estado-deficit":"estado-ok"}">${escaparHTML(x.estado)}</span>`;
    });
  };
  c.querySelector("#alternar-regulacion-recria")?.addEventListener("click",()=>{
    modoRegulacion=!modoRegulacion;
    if(modoRegulacion)recalcularEscenarioRegulado();
    pintarModoRegulacion();
  });

  c.querySelector("#abrir-calendario-plan")?.addEventListener("click",()=>{renderCalendario();dialogo?.showModal?.();});
  c.querySelector("#pechar-calendario-plan")?.addEventListener("click",()=>dialogo?.close?.());
  c.querySelector("#cal-mes-anterior")?.addEventListener("click",()=>{indiceMesCalendario=Math.max(0,indiceMesCalendario-1);renderCalendario();});
  c.querySelector("#cal-mes-seguinte")?.addEventListener("click",()=>{indiceMesCalendario=Math.min(mesesEventos.length-1,indiceMesCalendario+1);renderCalendario();});
  c.querySelector("#imprimir-plan")?.addEventListener("click",()=>{
    const periodoDesde=document.getElementById("data-inicio-libro")?.value||"—", periodoAta=document.getElementById("data-fin-libro")?.value||"—";
    const historico=document.querySelector("#resultados-analise .panel-analise"), tabelaPlan=c.querySelector(".tabela-balance-rabano"), cfg=cargarConfiguracion();
    const parametros=[["Idade 1ª IA xovencas",`${cfg.reproducion.idadePrimeiraInseminacionMeses} meses`],["1ª lactación: primeira IA",`${cfg.reproducion.diasLeitePrimeiraInseminacionPrimiparas} DEL`],["2ª+ lactación: primeira IA",`${cfg.reproducion.diasLeitePrimeiraInseminacionVacas} DEL`],["Preñez xovencas",`${cfg.reproducion.taxaPrenezXovencas} %`],["Preñez vacas",`${cfg.reproducion.taxaPrenezVacas} %`],["Ciclo",`${cfg.reproducion.duracionCicloDias} días`],["Xestación",`${cfg.reproducion.duracionXestacionDias} días`],["Período seco",`${cfg.reproducion.duracionSecadoDias} días`],["Lactacións medias",`${cfg.reproducion.lactacionsMediasPorVaca}`],["DEL terminal",`${cfg.reproducion.duracionLactacionDescarteDias}`],["Obxectivo leite",`${resultado.obxectivoLeite}`],["Marxe leite",`${cfg.reproducion.marxeVacasLeite}`],["Horizonte",`${cfg.reproducion.horizontePlanMeses} meses`],["Escenario",modoRegulacion?"Regulación de recría":"Plan base"],["Mes saída recría",modoRegulacion?mesSaidaRecria:"—"]];
    const parametrosHTML=parametros.map(([a,b])=>`<tr><td>${escaparHTML(a)}</td><td><strong>${escaparHTML(b)}</strong></td></tr>`).join("");
    const decisionsPDF=modoRegulacion&&escenarioRegulado.decisions?.length?`<section><h2>Decisións de regulación aplicadas</h2><table><thead><tr><th>Animal</th><th>Estratexia</th><th>Data saída</th></tr></thead><tbody>${escenarioRegulado.decisions.map(d=>`<tr><td>${escaparHTML(d.identificacion)}</td><td>Saída manual</td><td>${formatoData(d.dataSaida)}</td></tr>`).join("")}</tbody></table></section>`:"";
    const comparativa=modoRegulacion?`<section><h2>Resultado comparativo</h2><table><tbody><tr><td>Xovencas seleccionadas</td><td><strong>${escenarioRegulado.totalRegulado}</strong></td></tr><tr><td>Descartes adultos evitados</td><td><strong>${numero(escenarioRegulado.descartesAdultosEvitados,0)}</strong></td></tr><tr><td>Descartes base → regulado</td><td><strong>${numero(escenarioRegulado.comparativa.descartesBase,0)} → ${numero(escenarioRegulado.comparativa.descartesReg,0)}</strong></td></tr><tr><td>IA sexadas xovencas base → regulado</td><td><strong>${numero(escenarioRegulado.comparativa.iaSexadasBase,0)} → ${numero(escenarioRegulado.comparativa.iaSexadasReg,0)}</strong></td></tr></tbody></table></section>${decisionsPDF}`:"";
    const html=`<!doctype html><html lang="gl"><head><meta charset="utf-8"><title>Informe</title><style>@page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#182028;margin:0;font-size:8.5px}h1{font-size:19px}h2{font-size:13px;margin:14px 0 6px;border-bottom:1px solid #bbb}table{width:100%;border-collapse:collapse;margin:5px 0 10px}tr{page-break-inside:avoid}th,td{border:1px solid #cfd5da;padding:3px;vertical-align:top}th{background:#eef1f3}.resumo-global,.resumo-global-10,.media-ponderada-grella,.tarxetas-plan,.taxas-usadas{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}.panel-cabeceira,.panel-cabeceira-flex,.media-ponderada-cabeceira{display:flex;justify-content:space-between;gap:8px}.tabela-scroll{overflow:visible}.detalle-raciocinio,details,summary,.accion-plan,.nota-fluxo-plan,.estado-plan small,.comparativa-regulacion{display:none!important}.seccion-plan{page-break-before:always}.parametros{width:58%}.tabela-balance-rabano{font-size:6.5px}.tabela-balance-rabano th,.tabela-balance-rabano td{padding:2px}</style></head><body><h1>Informe de análise e planificación do rabaño</h1><p>Período: ${escaparHTML(periodoDesde)} → ${escaparHTML(periodoAta)} · Data situación: ${escaparHTML(formatoData(resultado.dataSituacion))} · ${modoRegulacion?"Escenario regulado":"Plan base"}</p><section><h2>Análise histórica</h2>${historico?historico.innerHTML:"<p>Sen análise histórica.</p>"}</section>${comparativa}<section><h2>Parámetros empregados</h2><table class="parametros"><tbody>${parametrosHTML}</tbody></table></section><section class="seccion-plan"><h2>Planificación mensual</h2>${tabelaPlan?tabelaPlan.outerHTML:"<p>Sen planificación.</p>"}</section></body></html>`;
    document.getElementById("frame-informe-pdf")?.remove();
    const frame=document.createElement("iframe");frame.id="frame-informe-pdf";frame.setAttribute("aria-hidden","true");Object.assign(frame.style,{position:"fixed",right:"0",bottom:"0",width:"1px",height:"1px",border:"0",opacity:"0",pointerEvents:"none"});document.body.appendChild(frame);
    const doc=frame.contentDocument||frame.contentWindow.document;doc.open();doc.write(html);doc.close();
    setTimeout(()=>{frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),1500);},300);
  });
  c.querySelector("#exportar-plan-excel")?.addEventListener("click",()=>{
    const datos=balance.map(x=>({
      "Mes":x.etiqueta,
      "Leite inicio":x.leiteInicio,
      "Partos":x.partos,
      "Secados":x.secados,
      "Descartes":x.descartes,
      "Saída recría regulación":x.regulacionRecria||0,
      "Leite final":x.leiteFinal,
      "Secas final":x.secasFinal,
      "Recría femia":Math.round(x.recriaPrevista),
      "Femias a producir":x.femiasAProducir,
      "IA totais":Math.round((x.detalleIA?.iaObligatoriasXovencas||0)+(x.detalleIA?.iaObligatoriasVacas||0)),
      "IA sexado xovencas":Math.round(x.detalleIA?.sexadosXovencas||0),
      "IA sexado vacas":Math.round(x.detalleIA?.sexadosVacas||0),
      "IA carne":x.iaCarne||0,
      "Cabaña":x.cabanaTotal,
      "Estado":x.estado
    }));
    const libro=XLSX.utils.book_new();
    const folla=XLSX.utils.json_to_sheet(datos);
    folla["!cols"]=[{wch:18},{wch:12},{wch:9},{wch:9},{wch:11},{wch:11},{wch:11},{wch:12},{wch:15},{wch:10},{wch:18},{wch:16},{wch:10},{wch:10},{wch:38}];
    XLSX.utils.book_append_sheet(libro,folla,"Planificación");
    const cfg=cargarConfiguracion();
    const parametros=[
      ["Parámetro","Valor"],["Idade 1ª IA xovencas",cfg.reproducion.idadePrimeiraInseminacionMeses],
      ["DEL IA 1ª lactación",cfg.reproducion.diasLeitePrimeiraInseminacionPrimiparas],
      ["DEL IA 2ª+",cfg.reproducion.diasLeitePrimeiraInseminacionVacas],
      ["Taxa preñez xovencas",cfg.reproducion.taxaPrenezXovencas],["Taxa preñez vacas",cfg.reproducion.taxaPrenezVacas],
      ["Ciclo",cfg.reproducion.duracionCicloDias],["Xestación",cfg.reproducion.duracionXestacionDias],
      ["Período seco",cfg.reproducion.duracionSecadoDias],["Lactacións medias",cfg.reproducion.lactacionsMediasPorVaca],
      ["DEL terminal",cfg.reproducion.duracionLactacionDescarteDias],["Obxectivo leite",resultado.obxectivoLeite],["Marxe leite",cfg.reproducion.marxeVacasLeite]
    ];
    XLSX.utils.book_append_sheet(libro,XLSX.utils.aoa_to_sheet(parametros),"Parámetros");
    XLSX.writeFile(libro,"planificacion-rebano.xlsx");
  });

  c.querySelectorAll("input[data-plan-descarte-crotal]").forEach(input=>input.addEventListener("change",()=>{
    callbackSeleccionDescarte?.(input.dataset.planDescarteCrotal,input.checked);
  }));
  const btn=document.createElement("button"); btn.type="button"; btn.className="boton-secundario boton-recalcular-seleccions"; btn.textContent="Recalcular coas seleccións";
  btn.addEventListener("click",()=>callbackRecalcular?.());
  c.querySelector(".bloque-xa-tes .panel-cabeceira")?.appendChild(btn);
}


function actualizarEstadoArquivo(titulo, subtitulo, estado) {
  document.querySelector(".estado-titulo").textContent = titulo;
  document.querySelector(".estado-subtitulo").textContent = subtitulo;
  const punto = document.querySelector(".estado-punto");
  punto.classList.remove("correcto", "erro");
  if (estado) punto.classList.add(estado);
}
