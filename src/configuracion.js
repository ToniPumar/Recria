export const CONFIGURACION_PREDETERMINADA = {
  custoOportunidadeFemia: 600,
  custoOportunidadeMacho: 400,
  custoDiario: 4,
  custoMorteVaca: 1500,
  valorPerdaFrisonaFemia: 600,
  valorPerdaFrisonaMacho: 400,
  valorPerdaCarneFemia: 600,
  valorPerdaCarneMacho: 400,

  idadeMaximaTenreiroDias: 60,
  idadeVacaMeses: 27,

  idadePrimeiraInseminacionMeses: 15,
  diasLeitePrimeiraInseminacionVacas: 130,
  diasLeitePrimeiraInseminacionPrimiparas: 160,
  taxaPrenezXovencas: 75.5,
  taxaPrenezVacas: 75.5,
  duracionCicloDias: 21,
  duracionXestacionDias: 283,
  duracionSecadoDias: 50,
  marxeSeguridadePuntos: 5,
  marxeVacasLeite: 2,
  sexadoPreferencia: "XOVENCAS_MELLORES_SE_FAN_FALTA",
  duracionLactacionDescarteDias: 420,
  lactacionsMediasPorVaca: 3,
  horizontePlanMeses: 24,

  // Sistema de puntuación de descartes
  descarteDelMinPrimiparas: 60,
  descarteDelMinAdultas: 50,
  descarteDiasAntesParto: 90,
  descarteDesfasePrimiparaPct: 25,
  descartePesoLeite: 20,
  descartePeso305: 20,
  descartePesoCelulas: 10,
  descartePesoTempo: 50
};

const CHAVE_CONFIGURACION = "recria_configuracion";
const VERSION_CONFIGURACION = 21;

function configuracionBase() {
  return {
    version: VERSION_CONFIGURACION,
    economia: {
      custoOportunidadeFemia: CONFIGURACION_PREDETERMINADA.custoOportunidadeFemia,
      custoOportunidadeMacho: CONFIGURACION_PREDETERMINADA.custoOportunidadeMacho,
      custoDiario: CONFIGURACION_PREDETERMINADA.custoDiario,
      custoMorteVaca: CONFIGURACION_PREDETERMINADA.custoMorteVaca,
      valorPerdaFrisonaFemia: CONFIGURACION_PREDETERMINADA.valorPerdaFrisonaFemia,
      valorPerdaFrisonaMacho: CONFIGURACION_PREDETERMINADA.valorPerdaFrisonaMacho,
      valorPerdaCarneFemia: CONFIGURACION_PREDETERMINADA.valorPerdaCarneFemia,
      valorPerdaCarneMacho: CONFIGURACION_PREDETERMINADA.valorPerdaCarneMacho
    },
    historico: {
      idadeMaximaTenreiroDias: CONFIGURACION_PREDETERMINADA.idadeMaximaTenreiroDias,
      idadeVacaMeses: CONFIGURACION_PREDETERMINADA.idadeVacaMeses
    },
    reproducion: {
      idadePrimeiraInseminacionMeses: CONFIGURACION_PREDETERMINADA.idadePrimeiraInseminacionMeses,
      diasLeitePrimeiraInseminacionVacas: CONFIGURACION_PREDETERMINADA.diasLeitePrimeiraInseminacionVacas,
      diasLeitePrimeiraInseminacionPrimiparas: CONFIGURACION_PREDETERMINADA.diasLeitePrimeiraInseminacionPrimiparas,
      taxaPrenezXovencas: CONFIGURACION_PREDETERMINADA.taxaPrenezXovencas,
      taxaPrenezVacas: CONFIGURACION_PREDETERMINADA.taxaPrenezVacas,
      duracionCicloDias: CONFIGURACION_PREDETERMINADA.duracionCicloDias,
      duracionXestacionDias: CONFIGURACION_PREDETERMINADA.duracionXestacionDias,
      duracionSecadoDias: CONFIGURACION_PREDETERMINADA.duracionSecadoDias,
      marxeSeguridadePuntos: CONFIGURACION_PREDETERMINADA.marxeSeguridadePuntos,
      marxeVacasLeite: CONFIGURACION_PREDETERMINADA.marxeVacasLeite,
      sexadoPreferencia: CONFIGURACION_PREDETERMINADA.sexadoPreferencia,
      duracionLactacionDescarteDias: CONFIGURACION_PREDETERMINADA.duracionLactacionDescarteDias,
      lactacionsMediasPorVaca: CONFIGURACION_PREDETERMINADA.lactacionsMediasPorVaca,
      horizontePlanMeses: CONFIGURACION_PREDETERMINADA.horizontePlanMeses
    },
    descarte: {
      delMinPrimiparas: CONFIGURACION_PREDETERMINADA.descarteDelMinPrimiparas,
      delMinAdultas: CONFIGURACION_PREDETERMINADA.descarteDelMinAdultas,
      diasAntesParto: CONFIGURACION_PREDETERMINADA.descarteDiasAntesParto,
      desfasePrimiparaPct: CONFIGURACION_PREDETERMINADA.descarteDesfasePrimiparaPct,
      pesoLeite: CONFIGURACION_PREDETERMINADA.descartePesoLeite,
      peso305: CONFIGURACION_PREDETERMINADA.descartePeso305,
      pesoCelulas: CONFIGURACION_PREDETERMINADA.descartePesoCelulas,
      pesoTempo: CONFIGURACION_PREDETERMINADA.descartePesoTempo
    }
  };
}

function normalizarConfiguracion(datos) {
  const base = configuracionBase();
  const economia = datos?.economia ?? {};
  const historico = datos?.historico ?? {};
  const reproducion = datos?.reproducion ?? {};
  const descarte = datos?.descarte ?? {};

  for (const campo of Object.keys(base.economia)) {
    const valor = Number(economia[campo]);
    if (Number.isFinite(valor) && valor >= 0) {
      base.economia[campo] = valor;
    }
  }



  for (const campo of Object.keys(base.historico)) {
    const valor = Number(historico[campo]);
    if (Number.isFinite(valor) && valor >= 0) base.historico[campo] = valor;
  }
  base.historico.idadeMaximaTenreiroDias = Math.max(1, Math.round(base.historico.idadeMaximaTenreiroDias));
  base.historico.idadeVacaMeses = Math.max(1, Number(base.historico.idadeVacaMeses));

  for (const campo of Object.keys(base.reproducion)) {
    if (campo === "sexadoPreferencia") {
      if (typeof reproducion[campo] === "string" && reproducion[campo]) base.reproducion[campo] = reproducion[campo];
      continue;
    }
    const valor = Number(reproducion[campo]);
    if (Number.isFinite(valor) && valor >= 0) base.reproducion[campo] = valor;
  }


  for (const campo of Object.keys(base.descarte)) {
    const valor = Number(descarte[campo]);
    if (Number.isFinite(valor) && valor >= 0) base.descarte[campo] = valor;
  }
  const sumaPesos=base.descarte.pesoLeite+base.descarte.peso305+base.descarte.pesoCelulas+base.descarte.pesoTempo;
  if(sumaPesos<=0){base.descarte.pesoLeite=40;base.descarte.peso305=20;base.descarte.pesoCelulas=20;base.descarte.pesoTempo=20;}

  // Migración v21: antes había un único DEL de primeira IA para todas as vacas.
  // Conservámolo para vacas de 2ª+ e damos ás primíparas o novo valor predeterminado.
  if (!Number.isFinite(Number(reproducion.diasLeitePrimeiraInseminacionPrimiparas))) {
    base.reproducion.diasLeitePrimeiraInseminacionPrimiparas = CONFIGURACION_PREDETERMINADA.diasLeitePrimeiraInseminacionPrimiparas;
  }

  // Migración das versións anteriores, que tiñan unha única taxa de preñez.
  const taxaAntiga = Number(reproducion.taxaPrenez);
  if (!Number.isFinite(Number(reproducion.taxaPrenezXovencas)) && Number.isFinite(taxaAntiga)) base.reproducion.taxaPrenezXovencas = Math.min(100, Math.max(0, taxaAntiga));
  if (!Number.isFinite(Number(reproducion.taxaPrenezVacas)) && Number.isFinite(taxaAntiga)) base.reproducion.taxaPrenezVacas = Math.min(100, Math.max(0, taxaAntiga));
  base.reproducion.taxaPrenezXovencas = Math.min(100, base.reproducion.taxaPrenezXovencas);
  base.reproducion.taxaPrenezVacas = Math.min(100, base.reproducion.taxaPrenezVacas);
  base.reproducion.marxeSeguridadePuntos = Math.min(100, base.reproducion.marxeSeguridadePuntos);
  base.reproducion.marxeVacasLeite = Math.max(0, base.reproducion.marxeVacasLeite);
  base.version = VERSION_CONFIGURACION;

  return base;
}

export function cargarConfiguracion() {
  try {
    const gardada = localStorage.getItem(CHAVE_CONFIGURACION);
    if (!gardada) {
      const base = configuracionBase();
      guardarConfiguracion(base);
      return base;
    }

    const config = normalizarConfiguracion(JSON.parse(gardada));
    guardarConfiguracion(config);
    return config;
  } catch (erro) {
    console.warn("Non se puido ler a configuración local:", erro);
    return configuracionBase();
  }
}

export function guardarConfiguracion(configuracion) {
  const normalizada = normalizarConfiguracion(configuracion);
  try {
    localStorage.setItem(CHAVE_CONFIGURACION, JSON.stringify(normalizada));
  } catch (erro) {
    console.warn("Non se puido gardar a configuración local:", erro);
  }
  return normalizada;
}

export function restaurarConfiguracionPredeterminada() {
  const base = configuracionBase();
  guardarConfiguracion(base);
  return base;
}

export const ALIAS_COLUMNAS = {
  crotal: ["crotal", "crotal/npu", "npu"],
  sexo: ["sexo", "sex"],
  raza: ["raza", "raza bovino", "breed"],
  dataNacemento: [
    "d. nacem.", "d nacem", "d.nacem.", "d.nacem", "nacemento",
    "data nacemento", "data de nacemento", "fecha nacimiento"
  ],
  dataEntrada: [
    "d. entrada", "d entrada", "d.entrada", "data entrada",
    "data de entrada", "fecha entrada", "f. entrada"
  ],
  baixa: ["baixa", "tipo baixa", "motivo baixa"],
  dataBaixa: [
    "d. baixa", "d baixa", "d.baixa", "data baixa",
    "data de baixa", "fecha baja"
  ]
};
