import * as XLSX from "xlsx";
import { ALIAS_COLUMNAS } from "./configuracion.js";
import { normalizarSexo, clasificarBaixa, calcularIdadeEnDias } from "./animais.js";

export function normalizarTexto(texto = "") {
  return String(texto)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function detectarColumnas(cabeceiras) {
  const normalizadas = cabeceiras.map((nome, indice) => ({
    nome,
    indice,
    normalizado: normalizarTexto(nome)
  }));

  const resultado = {};

  for (const [campo, alias] of Object.entries(ALIAS_COLUMNAS)) {
    const aliasNormalizados = alias.map(normalizarTexto);
    const atopada = normalizadas.find(columna =>
      aliasNormalizados.includes(columna.normalizado)
    );

    resultado[campo] = atopada ?? null;
  }

  return resultado;
}

export function validarColumnas(columnas) {
  const obrigatorias = ["crotal", "sexo", "raza", "dataNacemento", "baixa", "dataBaixa"];
  const faltan = obrigatorias.filter(campo => !columnas[campo]);

  return {
    valido: faltan.length === 0,
    faltan
  };
}

function converterData(valor) {
  if (!valor) return null;

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor;
  }

  if (typeof valor === "number") {
    const dataExcel = XLSX.SSF.parse_date_code(valor);
    if (!dataExcel) return null;

    return new Date(
      dataExcel.y,
      dataExcel.m - 1,
      dataExcel.d,
      dataExcel.H ?? 0,
      dataExcel.M ?? 0,
      Math.floor(dataExcel.S ?? 0)
    );
  }

  const texto = String(valor).trim();
  if (!texto) return null;

  const partes = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (partes) {
    const dia = Number(partes[1]);
    const mes = Number(partes[2]) - 1;
    let ano = Number(partes[3]);
    if (ano < 100) ano += 2000;

    const data = new Date(ano, mes, dia);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

function normalizarRaza(valor) {
  const n=normalizarTexto(valor);
  if(n.includes("frisona") || n.includes("holstein")) return {grupo:"FRISONA", nome:"Frisona"};
  if(n.includes("conxunto mestizo") || n.includes("conjunto mestizo") || n.includes("mestizo") || n.includes("mestiza")) return {grupo:"CARNE", nome:"Conxunto Mestizo"};
  return {grupo:"OUTRA", nome:String(valor??"").trim()||"Outra"};
}

export function importarAnimais(filas, columnas) {
  const animais = [];
  const avisos = [];

  for (let i = 1; i < filas.length; i += 1) {
    const fila = filas[i];
    if (!fila || fila.every(valor => valor == null || String(valor).trim() === "")) continue;

    const crotal = String(fila[columnas.crotal.indice] ?? "").trim();
    if (!crotal) {
      avisos.push(`Fila ${i + 1}: sen crotal, ignorada.`);
      continue;
    }

    const sexo = normalizarSexo(fila[columnas.sexo.indice]);
    const raza = normalizarRaza(fila[columnas.raza.indice]);
    const dataNacemento = converterData(fila[columnas.dataNacemento.indice]);
    const dataEntrada = columnas.dataEntrada ? converterData(fila[columnas.dataEntrada.indice]) : null;
    const tipoBaixa = clasificarBaixa(fila[columnas.baixa.indice]);
    const dataBaixa = converterData(fila[columnas.dataBaixa.indice]);

    if (!dataNacemento) {
      avisos.push(`Fila ${i + 1} (${crotal}): data de nacemento non válida.`);
    }

    if (tipoBaixa && !dataBaixa) {
      avisos.push(`Fila ${i + 1} (${crotal}): ten baixa pero non unha data de baixa válida.`);
    }

    animais.push({
      crotal,
      sexo,
      raza: raza.nome,
      razaGrupo: raza.grupo,
      dataNacemento,
      dataEntrada,
      baixa: tipoBaixa
        ? {
            tipo: tipoBaixa,
            data: dataBaixa,
            valorOrixinal: fila[columnas.baixa.indice] ?? null
          }
        : null,
      idadeBaixaDias:
        dataNacemento && dataBaixa
          ? calcularIdadeEnDias(dataNacemento, dataBaixa)
          : null
    });
  }

  return { animais, avisos };
}

export async function lerExcel(arquivo) {
  const buffer = await arquivo.arrayBuffer();
  const libro = XLSX.read(buffer, { type: "array", cellDates: true });

  if (!libro.SheetNames.length) {
    throw new Error("O arquivo Excel non contén ningunha folla.");
  }

  const nomeFolla = libro.SheetNames[0];
  const folla = libro.Sheets[nomeFolla];
  const filas = XLSX.utils.sheet_to_json(folla, {
    header: 1,
    defval: null,
    raw: true
  });

  if (!filas.length) {
    throw new Error("A primeira folla do Excel está baleira.");
  }

  return { libro, nomeFolla, folla, filas };
}
