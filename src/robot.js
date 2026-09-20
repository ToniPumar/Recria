import * as XLSX from "xlsx";
import { normalizarTexto } from "./excel.js";

const CAMPOS = {
  numeroVaca:["Número de vaca","numero de vaca","nº vaca","no vaca","vaca"],
  numeroVida:["Número de vida","numero de vida","nº vida","no vida","vida"],
  lactacion:["Nº lactación.","nº lactacion","numero lactacion","lactacion"],
  diasLactacion:["Días lactación","dias de lactacion","dias lactacion","del"],
  estado:["Estado de reproducción","estado de reproduccion","estado reproductivo","estado"],
  mediaOrdenos:["Media de ordeños","media de ordenos","media ordeños","ordenos","ordeños"],
  celulas:["Indicación de células","indicacion de celulas","celulas","celulas somaticas"],
  tempoCubiculo:["Tiempo en cubículo","tiempo en el cubiculo","tempo no cubiculo","tiempo cubiculo"],
  graxa:["Media grasa %","media graxa %","grasa %","graxa %"],
  diasXestacion:["Días de gestación","dias de gestacion","dias gestacion","dias de xestacion","dias xestacion"],
  diasSecado:["Días hasta secado","dias hasta el secado","dias ata o secado","dias hasta secado"],
  dataPartoEsperada:["Fecha de parto esperada","data de parto esperada","fecha parto esperada"],
  producion:["Producción","produccion","producion"],
  proteina:["Media proteina %","media proteína %","proteina %"],
  producion305:["Producción prevista (305 días)","produccion prevista (305 dias)","produccion prevista 305 dias","producion prevista 305 dias","305 dias"],
  producion24:["Media de producción ultimas 24h","media de produccion ultimas 24h","media produccion ultimas 24h","produccion 24h","producion 24h"],
  sexado:["Sexado","semen sexado","seme sexado"],
  descarte:["Descarte","descartar","vaca descarte","non inseminar","no inseminar","non inseminar mais","no inseminar mas"]
};
const OBRIGATORIOS=["numeroVaca","numeroVida","lactacion","diasLactacion","estado","diasXestacion","diasSecado","producion","producion24","producion305","sexado","descarte"];
const NOMES_OBRIGATORIOS={
  numeroVaca:"Número de vaca", numeroVida:"Número de vida", lactacion:"Nº lactación.",
  diasLactacion:"Días lactación", estado:"Estado de reproducción", diasXestacion:"Días de gestación",
  diasSecado:"Días hasta secado", producion:"Producción",
  producion24:"Media de producción ultimas 24h", producion305:"Producción prevista (305 días)",
  sexado:"Sexado (S/N/C)", descarte:"Descarte (S/N)"
};
function detectar(headers){const h=headers.map((x,i)=>({i,n:normalizarTexto(x)}));const r={};for(const [k,a] of Object.entries(CAMPOS)){const aa=a.map(normalizarTexto);r[k]=h.find(x=>aa.includes(x.n))||null;}return r;}
function num(v){if(v==null||v==="")return null;const n=Number(String(v).replace(",","."));return Number.isFinite(n)?n:null;}
function tempoSegundos(v){
  if(v==null||v==="") return null;
  if(typeof v==="number"&&Number.isFinite(v)){
    // Excel pode gardar unha duración como fracción dun día.
    return v>0&&v<1 ? v*86400 : v;
  }
  const t=String(v).trim().replace(",",".");
  const m=t.match(/^(\d+):([0-5]?\d)$/);
  if(m) return Number(m[1])*60+Number(m[2]);
  const n=Number(t);
  return Number.isFinite(n)?n:null;
}
function data(v){if(!v)return null;if(v instanceof Date&&!Number.isNaN(v.getTime()))return v;if(typeof v==="number"){const d=XLSX.SSF.parse_date_code(v);return d?new Date(d.y,d.m-1,d.d):null;}const t=String(v).trim();const m=t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);if(m){let a=Number(m[3]);if(a<100)a+=2000;const d=new Date(a,Number(m[2])-1,Number(m[1]));return Number.isNaN(d.getTime())?null:d;}const d=new Date(t);return Number.isNaN(d.getTime())?null:d;}
function ultimos9(v){const d=String(v??"").replace(/\D/g,"");return d.length>=9?d.slice(-9):d.padStart(9,"0");}
function estado(v){
  const n=normalizarTexto(v);
  if(n.includes("pren")||n.includes("preñ")||n.includes("pregnant")) return "PRENADA";
  if(n.includes("never insaminated")||n.includes("never inseminated")||n.includes("sin insemin")||n.includes("sen insemin")) return "SEN_INSEMINAR";
  if(n.includes("inseminada")||n.includes("inseminated")) return "INSEMINADA";
  return n.toUpperCase();
}
function producion(v){const n=normalizarTexto(v);if(n.includes("sec"))return "SECADO";if(n.includes("lact"))return "LACTACION";if(n.includes("joven")||n.includes("xoven")||n.includes("novill"))return "GANADO_XOVEN";return n.toUpperCase();}

function tipoSeme(v){
  if(v==null||String(v).trim()==="") return null;
  const n=normalizarTexto(v);
  if(["s","si","sí","sexado","sexada","sexed"].includes(n)) return "S";
  if(["n","no","normal","convencional","conventional"].includes(n)) return "N";
  if(["c","carne","beef","cruce carne"].includes(n)) return "C";
  return null;
}
function booleanoSN(v){
  if(v==null||String(v).trim()==="") return null;
  const n=normalizarTexto(v);
  if(["s","si","sí","yes","y","1","true","x"].includes(n)) return true;
  if(["n","no","0","false"].includes(n)) return false;
  return null;
}


export function leiteNormalizado4G33P(leite, graxa, proteina){
  const l=Number(leite), g=Number(graxa), p=Number(proteina);
  if(!Number.isFinite(l)||!Number.isFinite(g)||!Number.isFinite(p)) return null;
  // FPCM: normaliza a 4,0 % graxa e 3,3 % proteína. O factor vale ~1 neses sólidos.
  return l*(0.337+0.116*g+0.060*p);
}

function validarFilasRobot(datos){
  const erros=[];
  const avisos=[];
  for(const r of datos){
    const etiqueta=`Fila ${r.fila}${r.numeroVaca?` · vaca ${r.numeroVaca}`:""}`;
    if(!r.numeroVaca) erros.push(`${etiqueta}: Número de vaca baleiro`);
    if(!r.numeroVida) erros.push(`${etiqueta}: Número de vida baleiro`);
    if(!["PRENADA","SEN_INSEMINAR","INSEMINADA"].includes(r.estado)) erros.push(`${etiqueta}: Estado de reproducción non recoñecido`);
    if(!["LACTACION","SECADO","GANADO_XOVEN"].includes(r.producion)) erros.push(`${etiqueta}: Producción non recoñecida`);

    // Sexado só se valida se realmente está preñada/inseminada.
    // Baleiro = N. Se non está inseminada, ignórase o contido da cela.
    if(["PRENADA","INSEMINADA"].includes(r.estado) && !["S","N","C"].includes(r.tipoSeme)){
      erros.push(`${etiqueta}: Sexado debe ser S, N ou C (carne); baleiro equivale a N`);
    }
    if(typeof r.descarteImportado!=="boolean") erros.push(`${etiqueta}: Descarte debe ser S ou N; baleiro equivale a N`);
    if(r.estado==="PRENADA" && !Number.isFinite(r.diasXestacion) && !r.dataPartoEsperada){
      avisos.push(`${etiqueta}: figura preñada pero non ten días de gestación nin fecha de parto esperada`);
    }
  }
  return {erros,avisos};
}
export async function lerInformeRobot(arquivo){
  const b=await arquivo.arrayBuffer();
  const wb=XLSX.read(b,{type:"array",cellDates:true});
  const ws=wb.Sheets[wb.SheetNames[0]];
  const filas=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  if(!filas.length)throw new Error("O ficheiro do robot está baleiro.");
  const c=detectar(filas[0]);
  const faltan=OBRIGATORIOS.filter(k=>!c[k]);
  if(faltan.length)throw new Error(`Faltan columnas obrigatorias do robot: ${faltan.map(k=>NOMES_OBRIGATORIOS[k]||k).join(", ")}.`);

  const datos=[];
  for(let i=1;i<filas.length;i++){
    const f=filas[i];
    if(!f||f.every(x=>x==null||String(x).trim()===""))continue;
    const get=k=>c[k]?f[c[k].i]:null;
    const est=estado(get("estado"));
    const rawSexado=get("sexado");
    const sexadoBaleiro=rawSexado==null||String(rawSexado).trim()==="";
    let tipo=["PRENADA","INSEMINADA"].includes(est) ? (sexadoBaleiro?"N":tipoSeme(rawSexado)) : "N";
    const rawDescarte=get("descarte");
    const descarteBaleiro=rawDescarte==null||String(rawDescarte).trim()==="";
    const descarteImp=descarteBaleiro?false:booleanoSN(rawDescarte);

    datos.push({
      fila:i+1,
      numeroVaca:String(get("numeroVaca")??"").trim(),
      numeroVida:String(get("numeroVida")??"").trim(),
      claveVida:ultimos9(get("numeroVida")),
      lactacion:num(get("lactacion")),diasLactacion:num(get("diasLactacion")),
      mediaOrdenos:num(get("mediaOrdenos")),celulas:num(get("celulas")),
      estado:est,tempoCubiculo:tempoSegundos(get("tempoCubiculo")),
      graxa:num(get("graxa")),proteina:num(get("proteina")),
      diasXestacion:num(get("diasXestacion")),diasSecado:num(get("diasSecado")),
      dataPartoEsperada:data(get("dataPartoEsperada")),producion:producion(get("producion")),
      producion24:num(get("producion24")),producion305:num(get("producion305")),
      tipoSeme:tipo,sexadoImportado:tipo,sexado:tipo==="S",carne:tipo==="C",
      descarteImportado:descarteImp,descarte:descarteImp===true
    });
  }
  const validacionFilas=validarFilasRobot(datos);
  if(validacionFilas.erros.length) throw new Error(`Hai datos non válidos no informe do robot: ${validacionFilas.erros.slice(0,8).join("; ")}${validacionFilas.erros.length>8?"…":""}`);
  datos.avisos=validacionFilas.avisos;
  return datos;
}
function formatoData(d){
  if(!(d instanceof Date)||Number.isNaN(d.getTime())) return "data descoñecida";
  return new Intl.DateTimeFormat("gl-ES").format(d);
}
function describirNonPresente(a,data){
  if(a.dataNacemento && a.dataNacemento>data) return `aparece no Libro, pero nace o ${formatoData(a.dataNacemento)}, despois da data do informe`;
  if(a.baixa?.data && a.baixa.data<=data){
    const tipo=a.baixa.tipo?` (${a.baixa.tipo})`:"";
    return `aparece no Libro, pero ten baixa${tipo} o ${formatoData(a.baixa.data)}`;
  }
  return "aparece no Libro, pero non está presente na data do informe";
}
function claveCrotalCompleto(v){
  return String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function enlazarRobotRebano(datos,animais,data){
  const estaPresente=a=>(!a.dataNacemento||a.dataNacemento<=data)&&(!a.baixa?.data||a.baixa.data>data);
  // O Libro histórico NON se modifica nin deduplica. Só para o enlace co robot
  // agrupamos filas que teñen exactamente o mesmo crotal completo.
  const porSufixo=new Map();
  for(const a of animais){
    const sufixo=ultimos9(a.crotal);
    const completa=claveCrotalCompleto(a.crotal);
    if(!porSufixo.has(sufixo)) porSufixo.set(sufixo,new Map());
    const porCrotal=porSufixo.get(sufixo);
    if(!porCrotal.has(completa)) porCrotal.set(completa,[]);
    porCrotal.get(completa).push(a);
  }

  const erros=[],enlaces=new Map();
  const crotalesRobotUsados=new Set();
  for(const r of datos){
    const grupos=[...(porSufixo.get(r.claveVida)?.entries() ?? [])];
    const etiqueta=`${r.numeroVida || "Nº vida baleiro"}${r.numeroVaca?` (vaca ${r.numeroVaca})`:""} [${r.claveVida}]`;
    if(grupos.length===0){
      erros.push(`${etiqueta}: non aparece no Libro de explotación`);
      continue;
    }
    if(grupos.length>1){
      erros.push(`${etiqueta}: os 9 últimos díxitos corresponden a máis dun crotal distinto no Libro`);
      continue;
    }

    const [claveCompleta,rexistrosMesmoAnimal]=grupos[0];
    const presentes=rexistrosMesmoAnimal.filter(estaPresente);
    if(presentes.length===0){
      erros.push(`${etiqueta}: ${describirNonPresente(rexistrosMesmoAnimal[0],data)}`);
      continue;
    }
    if(crotalesRobotUsados.has(claveCompleta)){
      erros.push(`${etiqueta}: animal duplicado no informe do robot`);
      continue;
    }

    crotalesRobotUsados.add(claveCompleta);
    const animal=presentes[0];
    r.tipoSeme=["S","N","C"].includes(r.sexadoImportado)?r.sexadoImportado:(r.sexado?"S":"N");
    r.sexado=r.tipoSeme==="S"; r.carne=r.tipoSeme==="C";
    r.descarte=Boolean(r.descarteImportado);
    r.leiteNormalizado=leiteNormalizado4G33P(r.producion24,r.graxa,r.proteina);
    enlaces.set(animal.crotal,r);
  }
  return {enlaces,erros,avisos:datos.avisos||[],totalRobot:datos.length,totalEnlazados:enlaces.size};
}
