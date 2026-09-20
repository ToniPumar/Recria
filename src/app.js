import { lerExcel, detectarColumnas, validarColumnas, importarAnimais } from "./excel.js";
import { calcularEstatisticas, obterRebanoNaData } from "./estatisticas.js";
import { calcularPlanificacion, crearRankingDescartes } from "./planificacion.js";
import { cargarConfiguracion } from "./configuracion.js";
import { lerInformeRobot, enlazarRobotRebano } from "./robot.js";
import {
  actualizarResolucion,
  inicializarSelectorArquivo,
  bloquearImportacion,
  desbloquearImportacion,
  mostrarErroImportacion,
  mostrarResultadoImportacion,
  obterPeriodoSeleccionado,
  inicializarConfiguracion,
  prepararVistaRebano,
  mostrarRebano,
  mostrarRebanoSenLibro,
  prepararVistaPlanificacion,
  mostrarPlanificacionSenLibro,
  obterDatosPlanificacion,
  mostrarResultadoPlanificacion,
  mostrarErroPlanificacion,
  reiniciarModoAutomaticoPlanificacion
} from "./interface.js";

const NOMES_CAMPOS = { crotal: "Crotal", sexo: "Sexo", dataNacemento: "Data de nacemento", baixa: "Baixa", dataBaixa: "Data de baixa" };
let ultimoLibro = null;
let ultimoPeriodo = null;
let ultimasEstatisticas = null;
let ultimoRobot = null;

async function procesarArquivo(arquivo) {
  const periodo = obterPeriodoSeleccionado();
  if (!periodo.valido) return mostrarErroImportacion(periodo.erro);
  bloquearImportacion();
  await new Promise(resolve => requestAnimationFrame(resolve));

  try {
    const { filas } = await lerExcel(arquivo);
    const columnas = detectarColumnas(filas[0] ?? []);
    const validacion = validarColumnas(columnas);
    if (!validacion.valido) {
      const nomes = validacion.faltan.map(campo => NOMES_CAMPOS[campo] ?? campo);
      throw new Error(`Faltan as seguintes columnas obrigatorias: ${nomes.join(", ")}.`);
    }
    const { animais, avisos } = importarAnimais(filas, columnas);
    if (!animais.length) throw new Error("Non se atoparon animais válidos no Libro de explotación.");
    // Un Libro novo invalida calquera informe automático enlazado co Libro anterior.
    ultimoRobot = null;
    reiniciarModoAutomaticoPlanificacion();
    ultimoLibro = { nomeArquivo: arquivo.name, animais, avisos };
    recalcularUltimoLibro();
    return true;
  } catch (erro) {
    console.error(erro);
    mostrarErroImportacion(erro instanceof Error ? erro.message : "Produciuse un erro descoñecido ao procesar o Excel.");
    return false;
  } finally {
    desbloquearImportacion();
  }
}

function recalcularUltimoLibro() {
  if (!ultimoLibro) return false;

  const periodo = obterPeriodoSeleccionado();
  if (!periodo.valido) {
    mostrarErroImportacion(periodo.erro);
    return false;
  }

  // O histórico depende da configuración GARDADA, non do estado momentáneo
  // dos inputs da vista Configuración. Así nunca deixa de calcular porque un
  // campo da interface estea baleiro ou a medio editar.
  const config = cargarConfiguracion();
  const parametrosHistoricos = { ...(config?.economia||{}), ...(config?.historico||{}) };

  try {
    const estatisticas = calcularEstatisticas(
      ultimoLibro.animais,
      periodo.dataInicio,
      periodo.dataFin,
      parametrosHistoricos
    );

    ultimoPeriodo = periodo;
    ultimasEstatisticas = estatisticas;

    // PRIMEIRO pintamos e deixamos consolidado o Resumo. A partir de aquí,
    // ningún erro doutra vista debe borrar a análise histórica.
    mostrarResultadoImportacion({
      nomeArquivo: ultimoLibro.nomeArquivo,
      estatisticas,
      avisos: ultimoLibro.avisos
    });
  } catch (erro) {
    console.error("Erro na análise histórica:", erro);
    mostrarErroImportacion(
      erro instanceof Error
        ? `Non se puido calcular a análise histórica: ${erro.message}`
        : "Non se puido calcular a análise histórica."
    );
    return false;
  }

  // Rebaño e Planificación son vistas secundarias. Se unha delas falla,
  // rexistramos o erro pero NON convertimos iso nun erro do Libro nin
  // eliminamos o histórico xa calculado.
  try {
    prepararVistaRebano(periodo.dataInicio, periodo.dataFin, mostrarRebanoNaData);
  } catch (erro) {
    console.error("Erro ao preparar a vista Rebaño:", erro);
  }

  try {
    prepararVistaPlanificacion(
      periodo.dataInicio,
      periodo.dataFin,
      ultimasEstatisticas,
      calcularEscenarioPlanificacion,
      obterResumoSituacionPlanificacion,
      cargarInformeRobot,
      invalidarInformeRobot
    );
  } catch (erro) {
    console.error("Erro ao preparar a vista Planificación:", erro);
    mostrarErroPlanificacion(
      erro instanceof Error
        ? `O histórico calculouse correctamente, pero Planificación non se puido preparar: ${erro.message}`
        : "O histórico calculouse correctamente, pero Planificación non se puido preparar."
    );
  }

  return true;
}



function obterResumoSituacionPlanificacion(data) {
  if (!ultimoLibro || !ultimoPeriodo || !data) return null;
  if (data < ultimoPeriodo.dataInicio || data > ultimoPeriodo.dataFin) return null;
  const rebano = obterRebanoNaData(ultimoLibro.animais, data);
  return {
    total: rebano.length,
    femias: rebano.filter(a => a.sexo === "F").length,
    vacasClasificadas: rebano.filter(a => a.grupo === "VACA").length,
    xovencas: rebano.filter(a => a.grupo === "XOVENCA").length,
    tenreiros: rebano.filter(a => a.grupo === "TENREIRO").length
  };
}

function calcularEscenarioPlanificacion() {
  if (!ultimoLibro || !ultimoPeriodo || !ultimasEstatisticas) {
    return mostrarPlanificacionSenLibro();
  }

  const datosBase = obterDatosPlanificacion();
  if (!datosBase.valido) return mostrarErroPlanificacion(datosBase.erro);

  const totalPresentes = obterRebanoNaData(ultimoLibro.animais, datosBase.dataSituacion).length;
  const datos = obterDatosPlanificacion(totalPresentes);
  if (!datos.valido) return mostrarErroPlanificacion(datos.erro);

  if (datos.dataSituacion < ultimoPeriodo.dataInicio || datos.dataSituacion > ultimoPeriodo.dataFin) {
    return mostrarErroPlanificacion("A data de situación debe estar dentro do período cuberto polo Libro cargado.");
  }

  try {
    if(!ultimoRobot || ultimoRobot.data.getTime() !== datos.dataSituacion.getTime()) {
      return mostrarErroPlanificacion("Para calcular a planificación é obrigatorio cargar o informe do robot correspondente exactamente á Data situación.");
    }
    const config = cargarConfiguracion();
    const resultado = calcularPlanificacion({
      animais: ultimoLibro.animais,
      dataSituacion: datos.dataSituacion,
      dataObxectivo: datos.dataObxectivo,
      vacasLeite: datos.vacasLeite,
      vacasSecas: datos.vacasSecas,
      obxectivoLeite: datos.obxectivoLeite,
      mortalidadeFemias: datos.mortalidadeFemias,
      mortalidadeXovencas: datos.mortalidadeXovencas,
      reposicion: datos.reposicion,
      marxeSeguridade: datos.marxeSeguridade,
      reproducion: config.reproducion,
      descarteConfig: config.descarte,
      datosRobot: ultimoRobot.enlaces
    });
    mostrarResultadoPlanificacion(resultado, actualizarSeleccionDescarte, calcularEscenarioPlanificacion);
  } catch (erro) {
    console.error(erro);
    mostrarErroPlanificacion(erro instanceof Error ? erro.message : "Non se puido completar a planificación.");
  }
}

async function cargarInformeRobot(arquivo, dataInforme) {
  if (!ultimoLibro) throw new Error("Primeiro carga o Libro de explotación.");
  const situacion = obterDatosPlanificacion().dataSituacion;
  if (!dataInforme || !situacion || dataInforme.getTime() !== situacion.getTime()) throw new Error("A data do informe do robot debe ser exactamente a mesma ca Data situación.");
  const datos = await lerInformeRobot(arquivo);
  const enlazado = enlazarRobotRebano(datos, ultimoLibro.animais, dataInforme);
  if (enlazado.erros.length) throw new Error(`Hai animais do informe que non se poden enlazar co Libro: ${enlazado.erros.slice(0,8).join("; ")}${enlazado.erros.length>8?"…":""}`);
  const resumo = {
    leite: datos.filter(x => x.producion === "LACTACION").length,
    secas: datos.filter(x => x.producion === "SECADO").length,
    ganadoXoven: datos.filter(x => x.producion === "GANADO_XOVEN").length
  };
  // Só substituímos o último informe válido despois de completar TODA a validación.
  ultimoRobot = { nome: arquivo.name, data: dataInforme, datos, enlaces: enlazado.enlaces, resumo };
  const dataRebanoValor = document.getElementById("data-rebano")?.value;
  if (dataRebanoValor) {
    const [a,m,d] = dataRebanoValor.split("-").map(Number);
    const dataRebano = new Date(a,m-1,d);
    if (dataRebano.getTime() === dataInforme.getTime()) mostrarRebanoNaData(dataRebano);
  }
  return { nome: arquivo.name, ...enlazado, datos, resumo, avisos: enlazado.avisos || [] };
}

function invalidarInformeRobot() {
  ultimoRobot = null;
}

function actualizarSexado(crotal, tipo) {
  const robot = ultimoRobot?.enlaces?.get?.(crotal);
  if (!robot) return;
  robot.tipoSeme=["S","N","C"].includes(tipo)?tipo:"N";
  robot.sexado=robot.tipoSeme==="S";
  robot.carne=robot.tipoSeme==="C";
  const dataRebano = document.getElementById("data-rebano")?.value;
  if (dataRebano) {
    const [a,m,d] = dataRebano.split("-").map(Number);
    mostrarRebanoNaData(new Date(a,m-1,d));
  }
}

function actualizarDescarte(crotal, marcado) {
  const robot=ultimoRobot?.enlaces?.get?.(crotal); if(!robot) return;
  robot.descarte=Boolean(marcado);
  mostrarRebanoNaData(ultimoRobot.data);
}

function actualizarSeleccionDescarte(crotal, marcado) {
  const robot=ultimoRobot?.enlaces?.get?.(crotal); if(!robot) return;
  robot.permitirDescarte=Boolean(marcado);
}

function mostrarRebanoNaData(data) {
  if (!ultimoLibro || !ultimoPeriodo || !data) return mostrarRebanoSenLibro();
  if (data < ultimoPeriodo.dataInicio || data > ultimoPeriodo.dataFin) return;
  const datosRobot = ultimoRobot?.data?.getTime?.() === data.getTime() ? ultimoRobot.enlaces : null;
  const rebano=obterRebanoNaData(ultimoLibro.animais,data);
  const ranking=datosRobot?crearRankingDescartes(rebano,datosRobot,data,cargarConfiguracion().descarte):[];
  mostrarRebano(rebano, data, datosRobot, actualizarSexado, actualizarDescarte, ranking);
}

actualizarResolucion();
window.addEventListener("resize", actualizarResolucion);
inicializarConfiguracion(recalcularUltimoLibro);
inicializarSelectorArquivo(procesarArquivo);

// Se xa hai un Libro cargado, modificar o período debe recalcular o Resumo
// e a media ponderada inmediatamente, sen obrigar a volver seleccionar o Excel.
for (const id of ["data-inicio-libro", "data-fin-libro"]) {
  document.getElementById(id)?.addEventListener("change", () => {
    if (!ultimoLibro) return;
    // O informe do robot pertence a unha fotografía/período concreto;
    // ao cambiar o período reconstruímos as vistas e evitamos datos cruzados.
    ultimoRobot = null;
    reiniciarModoAutomaticoPlanificacion();
    recalcularUltimoLibro();
  });
}

mostrarRebanoSenLibro();
mostrarPlanificacionSenLibro();
