import { CONFIGURACION_PREDETERMINADA } from "./configuracion.js";

const MS_DIA = 1000 * 60 * 60 * 24;

function limiteTenreiro(parametros={}) {
  return Math.max(1, Number(parametros.idadeMaximaTenreiroDias ?? CONFIGURACION_PREDETERMINADA.idadeMaximaTenreiroDias) || 60);
}
function limiteVacaMeses(parametros={}) {
  return Math.max(1, Number(parametros.idadeVacaMeses ?? CONFIGURACION_PREDETERMINADA.idadeVacaMeses) || 27);
}
function eFrisona(animal){ return animal?.razaGrupo === "FRISONA" || String(animal?.raza||"").toLowerCase().includes("frisona"); }
function grupoRaza(animal){ return animal?.razaGrupo === "CARNE" ? "CARNE" : (eFrisona(animal) ? "FRISONA" : "OUTRA"); }

function inicioDia(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return null;
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function sumarDias(data, dias) {
  const resultado = inicioDia(data);
  if (!resultado) return null;
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

function sumarMeses(data, meses) {
  const resultado = inicioDia(data);
  if (!resultado) return null;
  const dia = resultado.getDate();
  resultado.setDate(1);
  resultado.setMonth(resultado.getMonth() + meses);
  const ultimoDia = new Date(resultado.getFullYear(), resultado.getMonth() + 1, 0).getDate();
  resultado.setDate(Math.min(dia, ultimoDia));
  return resultado;
}

function porcentaxe(numerador, denominador) {
  return denominador ? (numerador / denominador) * 100 : null;
}

function intervalosSolapan(inicioA, finA, inicioB, finB) {
  return inicioA <= finB && finA >= inicioB;
}

function finVidaNoPeriodo(animal, finPeriodo) {
  const baixa = inicioDia(animal.baixa?.data);
  return baixa && baixa < finPeriodo ? baixa : finPeriodo;
}

function intervaloTenreiro(animal, finPeriodo, parametros={}) {
  if (!(animal.dataNacemento instanceof Date)) return null;
  const nacemento = inicioDia(animal.dataNacemento);
  const finGrupo = sumarDias(nacemento, limiteTenreiro(parametros));
  const finVida = finVidaNoPeriodo(animal, finPeriodo);
  const fin = finVida < finGrupo ? finVida : finGrupo;
  return fin < nacemento ? null : { inicio: nacemento, fin };
}

function intervaloXovenca(animal, finPeriodo, parametros={}) {
  if (animal.sexo !== "F" || !eFrisona(animal) || !(animal.dataNacemento instanceof Date)) return null;
  const inicio = sumarDias(animal.dataNacemento, limiteTenreiro(parametros) + 1);
  const inicioVaca = sumarMeses(animal.dataNacemento, limiteVacaMeses(parametros));
  const finGrupo = sumarDias(inicioVaca, -1);
  const finVida = finVidaNoPeriodo(animal, finPeriodo);
  const fin = finVida < finGrupo ? finVida : finGrupo;
  return fin < inicio ? null : { inicio, fin };
}

function intervaloVaca(animal, finPeriodo, parametros={}) {
  if (animal.sexo !== "F" || !eFrisona(animal) || !(animal.dataNacemento instanceof Date)) return null;
  const inicio = sumarMeses(animal.dataNacemento, limiteVacaMeses(parametros));
  const fin = finVidaNoPeriodo(animal, finPeriodo);
  return fin < inicio ? null : { inicio, fin };
}

function estivoExposto(intervalo, inicioPeriodo, finPeriodo) {
  return intervalo ? intervalosSolapan(intervalo.inicio, intervalo.fin, inicioPeriodo, finPeriodo) : false;
}

function eventoDentroPeriodo(animal, tipo, inicioPeriodo, finPeriodo) {
  const data = inicioDia(animal.baixa?.data);
  return animal.baixa?.tipo === tipo && data && data >= inicioPeriodo && data <= finPeriodo;
}

export function grupoNaData(animal, data, parametros={}) {
  const nacemento = inicioDia(animal.dataNacemento);
  const referencia = inicioDia(data);
  if (!nacemento || !referencia || referencia < nacemento) return null;

  const finTenreiro = sumarDias(nacemento, limiteTenreiro(parametros));
  if (referencia <= finTenreiro) return "TENREIRO";
  if (animal.sexo !== "F") return "MACHO_MAIOR";
  if (!eFrisona(animal)) return "FEMIA_CARNE_MAIOR";

  const inicioVaca = sumarMeses(nacemento, limiteVacaMeses(parametros));
  return referencia < inicioVaca ? "XOVENCA" : "VACA";
}

function custoMorte(animal, parametros) {
  if (animal.baixa?.tipo !== "MORTE" || !(animal.baixa?.data instanceof Date)) return 0;
  const grupo = grupoNaData(animal, animal.baixa.data, parametros);
  if (grupo === "VACA") return Number(parametros.custoMorteVaca)||0;

  const nacemento = inicioDia(animal.dataNacemento);
  const baixa = inicioDia(animal.baixa.data);
  if (!nacemento || !baixa || baixa < nacemento) return 0;
  const dias = Math.floor((baixa - nacemento) / MS_DIA);
  const custoDias = dias * (Number(parametros.custoDiario)||0);
  const raza=grupoRaza(animal);
  let base=0;
  if(raza==="CARNE") base=animal.sexo==="F" ? Number(parametros.valorPerdaCarneFemia)||0 : Number(parametros.valorPerdaCarneMacho)||0;
  else base=animal.sexo==="F" ? Number(parametros.valorPerdaFrisonaFemia ?? parametros.custoOportunidadeFemia)||0 : Number(parametros.valorPerdaFrisonaMacho ?? parametros.custoOportunidadeMacho)||0;
  return custoDias + base;
}

function resumoRazaSexo(mortes,parametros){
  const res={
    frisonaF:{mortes:0,perda:0},frisonaM:{mortes:0,perda:0},
    carneF:{mortes:0,perda:0},carneM:{mortes:0,perda:0},
    outra:{mortes:0,perda:0}
  };
  for(const a of mortes){
    const r=grupoRaza(a), sexo=a.sexo;
    let k="outra";
    if(r==="FRISONA"&&sexo==="F")k="frisonaF";
    else if(r==="FRISONA"&&sexo==="M")k="frisonaM";
    else if(r==="CARNE"&&sexo==="F")k="carneF";
    else if(r==="CARNE"&&sexo==="M")k="carneM";
    res[k].mortes++; res[k].perda+=custoMorte(a,parametros);
  }
  return res;
}

export function animalPresenteNaData(animal, data) {
  const referencia = inicioDia(data);
  const nacemento = inicioDia(animal.dataNacemento);
  if (!referencia || !nacemento || nacemento > referencia) return false;
  const baixa = inicioDia(animal.baixa?.data);
  return !baixa || baixa > referencia;
}

function animaisPresentesNoPeriodo(animais, inicioPeriodo, finPeriodo) {
  return animais.filter(animal => {
    const nacemento = inicioDia(animal.dataNacemento);
    if (!nacemento || nacemento > finPeriodo) return false;
    const baixa = inicioDia(animal.baixa?.data) ?? finPeriodo;
    return intervalosSolapan(nacemento, baixa, inicioPeriodo, finPeriodo);
  });
}

function calcularPeriodo(animais, inicioPeriodo, finPeriodo, parametros) {
  const presentes = animaisPresentesNoPeriodo(animais, inicioPeriodo, finPeriodo);
  const tenreirosExpostos = animais.filter(animal =>
    estivoExposto(intervaloTenreiro(animal, finPeriodo, parametros), inicioPeriodo, finPeriodo)
  );
  const machosExpostos = tenreirosExpostos.filter(animal => animal.sexo === "M");
  // Para a recría leiteira só interesa femia Frisona.
  const femiasExpostas = tenreirosExpostos.filter(animal => animal.sexo === "F" && eFrisona(animal));
  const xovencasExpostas = animais.filter(animal =>
    estivoExposto(intervaloXovenca(animal, finPeriodo, parametros), inicioPeriodo, finPeriodo)
  );
  const vacasExpostas = animais.filter(animal =>
    estivoExposto(intervaloVaca(animal, finPeriodo, parametros), inicioPeriodo, finPeriodo)
  );

  const mortes = animais.filter(animal => eventoDentroPeriodo(animal, "MORTE", inicioPeriodo, finPeriodo));
  const saidas = animais.filter(animal => eventoDentroPeriodo(animal, "SAIDA", inicioPeriodo, finPeriodo));

  // O evento sempre pertence ao ano/data da D. Baixa; a categoría calcúlase coa idade exacta nese día.
  const mortesTenreiros = mortes.filter(animal => grupoNaData(animal, animal.baixa.data, parametros) === "TENREIRO");
  const mortesMachos = mortesTenreiros.filter(animal => animal.sexo === "M");
  const mortesFemias = mortesTenreiros.filter(animal => animal.sexo === "F" && eFrisona(animal));
  const mortesXovencas = mortes.filter(animal => grupoNaData(animal, animal.baixa.data, parametros) === "XOVENCA");
  const mortesVacas = mortes.filter(animal => grupoNaData(animal, animal.baixa.data, parametros) === "VACA");

  // Saída non é mortalidade. Só unha femia Frisona adulta (>= idadeVacaMeses)
  // entra na taxa de reposición.
  const saidasVacas = saidas.filter(animal => grupoNaData(animal, animal.baixa.data, parametros) === "VACA");

  const perdasMachos = mortes.filter(a => a.sexo === "M").reduce((s, a) => s + custoMorte(a, parametros), 0);
  const perdasFemias = mortesFemias.reduce((s, a) => s + custoMorte(a, parametros), 0);
  const perdasXovencas = mortesXovencas.reduce((s, a) => s + custoMorte(a, parametros), 0);
  const perdasVacas = mortesVacas.reduce((s, a) => s + custoMorte(a, parametros), 0);
  // Incluímos tamén perdas de femias de carne/ outras que non forman parte da recría leiteira.
  const perdaTodasMortes=mortes.reduce((sum,a)=>sum+custoMorte(a,parametros),0);
  const desglose=resumoRazaSexo(mortes,parametros);

  return {
    animaisPresentes: presentes.length,
    tenreiros: { expostos: tenreirosExpostos.length, mortes: mortesTenreiros.length, taxa: porcentaxe(mortesTenreiros.length, tenreirosExpostos.length) },
    machos: { expostos: machosExpostos.length, mortes: mortesMachos.length, taxa: porcentaxe(mortesMachos.length, machosExpostos.length) },
    femias: { expostas: femiasExpostas.length, mortes: mortesFemias.length, taxa: porcentaxe(mortesFemias.length, femiasExpostas.length) },
    xovencas: { expostas: xovencasExpostas.length, mortes: mortesXovencas.length, taxa: porcentaxe(mortesXovencas.length, xovencasExpostas.length) },
    vacas: {
      expostas: vacasExpostas.length,
      mortes: mortesVacas.length,
      saidas: saidasVacas.length,
      mortalidade: porcentaxe(mortesVacas.length, vacasExpostas.length),
      reposicion: porcentaxe(mortesVacas.length + saidasVacas.length, vacasExpostas.length)
    },
    mortesRazaSexo: desglose,
    economia: { machos: perdasMachos, femias: perdasFemias, xovencas: perdasXovencas, vacas: perdasVacas, total: perdaTodasMortes }
  };
}

function eAnoCompleto(ano, inicio, fin) {
  return inicio <= new Date(ano, 0, 1) && fin >= new Date(ano, 11, 31);
}

function diagnosticoIntervalo(animais, inicio, fin) {
  return {
    baixasAntesInicio: animais.filter(a => {
      const d = inicioDia(a.baixa?.data); return d && d < inicio;
    }).length,
    nacementosDespoisFin: animais.filter(a => {
      const d = inicioDia(a.dataNacemento); return d && d > fin;
    }).length,
    baixasDespoisFin: animais.filter(a => {
      const d = inicioDia(a.baixa?.data); return d && d > fin;
    }).length
  };
}

export function obterRebanoNaData(animais = [], data) {
  const referencia = inicioDia(data);
  if (!referencia) return [];

  return animais
    .filter(animal => animalPresenteNaData(animal, referencia))
    .map(animal => {
      const nacemento = inicioDia(animal.dataNacemento);
      const dias = Math.max(0, Math.floor((referencia - nacemento) / MS_DIA));
      return {
        crotal: animal.crotal,
        sexo: animal.sexo,
        dataNacemento: nacemento,
        idadeDias: dias,
        grupo: grupoNaData(animal, referencia)
      };
    })
    .sort((a, b) => {
      const grupos = { VACA: 0, XOVENCA: 1, TENREIRO: 2, MACHO_MAIOR: 3 };
      return (grupos[a.grupo] ?? 9) - (grupos[b.grupo] ?? 9) || a.crotal.localeCompare(b.crotal);
    });
}

export function calcularEstatisticas(animais = [], dataInicio, dataFin, parametros = CONFIGURACION_PREDETERMINADA) {
  const inicio = inicioDia(dataInicio);
  const fin = inicioDia(dataFin);
  if (!inicio || !fin) throw new Error("O período de análise non é válido.");
  if (inicio > fin) throw new Error("A data inicial non pode ser posterior á data final.");

  const anos = [];
  for (let ano = inicio.getFullYear(); ano <= fin.getFullYear(); ano += 1) {
    const inicioAno = ano === inicio.getFullYear() ? inicio : new Date(ano, 0, 1);
    const finAno = ano === fin.getFullYear() ? fin : new Date(ano, 11, 31);
    anos.push({ ano, completo: eAnoCompleto(ano, inicio, fin), desde: inicioAno, ata: finAno, ...calcularPeriodo(animais, inicioAno, finAno, parametros) });
  }

  const global = calcularPeriodo(animais, inicio, fin, parametros);
  const anosCompletos = anos.filter(item => item.completo);
  const ponderar = (items, num, den) => {
    const numerador = items.reduce((s, item) => s + num(item), 0);
    const denominador = items.reduce((s, item) => s + den(item), 0);
    return { numerador, denominador, taxa: porcentaxe(numerador, denominador) };
  };

  const mediaPonderada = {
    anosIncluidos: anosCompletos.map(item => item.ano),
    tenreiros: ponderar(anosCompletos, x => x.tenreiros.mortes, x => x.tenreiros.expostos),
    machos: ponderar(anosCompletos, x => x.machos.mortes, x => x.machos.expostos),
    femias: ponderar(anosCompletos, x => x.femias.mortes, x => x.femias.expostas),
    xovencas: ponderar(anosCompletos, x => x.xovencas.mortes, x => x.xovencas.expostas),
    vacas: {
      mortalidade: ponderar(anosCompletos, x => x.vacas.mortes, x => x.vacas.expostas),
      reposicion: ponderar(anosCompletos, x => x.vacas.mortes + x.vacas.saidas, x => x.vacas.expostas)
    }
  };

  const presentes = animaisPresentesNoPeriodo(animais, inicio, fin);
  return {
    total: presentes.length,
    mortes: animais.filter(a => eventoDentroPeriodo(a, "MORTE", inicio, fin)).length,
    saidas: animais.filter(a => eventoDentroPeriodo(a, "SAIDA", inicio, fin)).length,
    femias: presentes.filter(a => a.sexo === "F").length,
    machos: presentes.filter(a => a.sexo === "M").length,
    diagnostico: diagnosticoIntervalo(animais, inicio, fin),
    parametrosEconomicos: { ...parametros },
    periodo: {
      desde: inicio,
      ata: fin,
      anosCompletos: anos.filter(x => x.completo).map(x => x.ano),
      anosIncompletos: anos.filter(x => !x.completo).map(x => x.ano)
    },
    global,
    mediaPonderada,
    anos
  };
}
