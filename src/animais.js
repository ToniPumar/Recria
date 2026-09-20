export function calcularIdadeEnDias(dataNacemento, dataFin) {
  if (!(dataNacemento instanceof Date) || !(dataFin instanceof Date)) return null;
  const milisegundosDia = 1000 * 60 * 60 * 24;
  return Math.floor((dataFin - dataNacemento) / milisegundosDia);
}

export function normalizarSexo(valor) {
  const sexo = String(valor ?? "").trim().toUpperCase();
  if (["F", "FEMIA", "FEMINA", "HEMBRA"].includes(sexo)) return "F";
  if (["M", "MACHO", "MALE"].includes(sexo)) return "M";
  return "DESCOÑECIDO";
}

export function clasificarBaixa(valor) {
  const baixa = String(valor ?? "").trim().toLowerCase();
  if (!baixa) return null;
  if (baixa.includes("morte") || baixa.includes("muerte")) return "MORTE";
  if (baixa.includes("saida") || baixa.includes("saída") || baixa.includes("salida")) return "SAIDA";
  return "OUTRA";
}
