import { grupoNaData, animalPresenteNaData } from "./estatisticas.js";

const MS_DIA = 86400000;
const DIAS_MES = 30.4375;
const DIAS_ANO = 365.25;

function dia(data) { if (!(data instanceof Date) || Number.isNaN(data.getTime())) return null; return new Date(data.getFullYear(), data.getMonth(), data.getDate()); }
function sumarDias(data, dias) { const r = dia(data); r.setDate(r.getDate() + dias); return r; }
function sumarMesesDecimais(data, meses) { return sumarDias(data, Math.round(meses * DIAS_MES)); }
function clampTaxa(v) { return Math.max(0, Math.min(100, Number(v) || 0)); }
function taxaEfectiva(base, marxe) { return Math.min(100, clampTaxa(base) + Math.max(0, Number(marxe) || 0)); }
function claveMes(data) { return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,"0")}`; }
function etiquetaMes(clave) { const [a,m]=clave.split("-").map(Number); return new Intl.DateTimeFormat("gl-ES",{month:"short",year:"numeric"}).format(new Date(a,m-1,1)).replace(".",""); }
function ciclosEntre(desde, ata, cicloDias) { if (!desde || !ata || desde>ata || cicloDias<=0) return []; const r=[]; for(let d=dia(desde);d<=ata;d=sumarDias(d,cicloDias)) r.push(d); return r; }
function mesesEntre(inicio, fin) { const r=[]; let d=new Date(inicio.getFullYear(),inicio.getMonth(),1); const ultimo=new Date(fin.getFullYear(),fin.getMonth(),1); while(d<=ultimo){r.push(new Date(d)); d=new Date(d.getFullYear(),d.getMonth()+1,1);} return r; }
function diasNoMes(data){ return new Date(data.getFullYear(),data.getMonth()+1,0).getDate(); }
function diasActivosNoMes(mes,inicio,fin){
  const a=new Date(mes.getFullYear(),mes.getMonth(),1), b=new Date(mes.getFullYear(),mes.getMonth()+1,0);
  const desde=inicio>a?inicio:a, ata=fin<b?fin:b;
  return ata<desde?0:Math.floor((ata-desde)/MS_DIA)+1;
}

function sumarMeses(data, meses) {
  const d = new Date(data);
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + Number(meses || 0));
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimo));
  return d;
}

function distribucionPartosAnimal(animal, dataSituacion, dataObxectivo, parametros, supervivencia) {
  const nacemento=dia(animal.dataNacemento); if(!nacemento) return [];
  const inicioIA=sumarMesesDecimais(nacemento,parametros.idadePrimeiraInseminacionMeses);
  const xestacion=Math.max(1,parametros.duracionXestacionDias), ciclo=Math.max(1,parametros.duracionCicloDias);
  const pr=clampTaxa(parametros.taxaPrenezXovencas)/100; if(pr<=0) return [];
  const concepcionMaisAntigaCompatible=sumarDias(dataSituacion,-xestacion+1);
  const primeiraConcepcion=inicioIA>concepcionMaisAntigaCompatible?inicioIA:concepcionMaisAntigaCompatible;
  const ultimaConcepcion=sumarDias(dataObxectivo,-xestacion);
  const ciclos=ciclosEntre(primeiraConcepcion,ultimaConcepcion,ciclo);
  let segueBaleira=1; const partos=[];
  for(const concepcion of ciclos){ const p=segueBaleira*pr; segueBaleira*=1-pr; const parto=sumarDias(concepcion,xestacion); if(parto>dataSituacion&&parto<=dataObxectivo) partos.push({data:parto,valor:p*supervivencia}); }
  return partos;
}

function distribucionPartosDesdeAgora(dataSituacion, dataObxectivo, parametros, supervivencia, taxaPrenez) {
  const xestacion=Math.max(1,parametros.duracionXestacionDias), ciclo=Math.max(1,parametros.duracionCicloDias);
  const pr=clampTaxa(taxaPrenez)/100; if(pr<=0) return [];
  const ultimaConcepcion=sumarDias(dataObxectivo,-xestacion);
  const ciclos=ciclosEntre(dataSituacion,ultimaConcepcion,ciclo);
  let segueBaleira=1; const partos=[];
  for(const concepcion of ciclos){
    const p=segueBaleira*pr; segueBaleira*=1-pr;
    const parto=sumarDias(concepcion,xestacion);
    if(parto>dataSituacion&&parto<=dataObxectivo) partos.push({data:parto,valor:p*supervivencia});
  }
  return partos;
}

function dataPartoPreñada(robot, inicio, reproducion) {
  if (robot?.dataPartoEsperada instanceof Date && !Number.isNaN(robot.dataPartoEsperada.getTime())) return dia(robot.dataPartoEsperada);
  if (Number.isFinite(robot?.diasXestacion) && robot.diasXestacion >= 0) {
    return sumarDias(inicio, Math.max(0, reproducion.duracionXestacionDias - robot.diasXestacion));
  }
  return null;
}

function crearPipelineRobot(presentes, inicio, fin, reproducion, datosRobot) {
  if(!(datosRobot instanceof Map)) throw new Error("O informe do robot é obrigatorio para calcular a planificación.");

  const calendario=new Map();
  const xestacion=Math.max(1,Number(reproducion.duracionXestacionDias)||283);
  const secado=Math.max(0,Number(reproducion.duracionSecadoDias)||50);
  const ciclo=Math.max(1,Number(reproducion.duracionCicloDias)||21);
  const delIAAdultas=Math.max(0,Number(reproducion.diasLeitePrimeiraInseminacionVacas)||0);
  const delIAPrimiparas=Math.max(0,Number(reproducion.diasLeitePrimeiraInseminacionPrimiparas ?? reproducion.diasLeitePrimeiraInseminacionVacas)||0);
  const idadeIAX=Math.max(0,Number(reproducion.idadePrimeiraInseminacionMeses)||15);
  const lactMedia=Math.max(1,Number(reproducion.lactacionsMediasPorVaca)||3);
  const duracionTerminal=Math.max(1,Number(reproducion.duracionLactacionDescarteDias)||420);
  const prX=clampTaxa(reproducion.taxaPrenezXovencas)/100;
  const prV=clampTaxa(reproducion.taxaPrenezVacas)/100;
  const MIN_PESO=0.015;

  let prenadas=0, inseminadas=0, senInseminar=0, sexadas=0, carne=0;
  let prenecesProbablesInseminadas=0, femiasEsperadasPreñadas=0, femiasEsperadasInseminadas=0;
  const candidatosSaida=new Map();

  const getMes=(data)=>{
    const k=claveMes(data);
    if(!calendario.has(k)) calendario.set(k,{
      mes:k,etiqueta:etiquetaMes(k),
      partosConfirmados:0,partosProbables:0,partosEstimados:0,
      primeirosPartosConfirmados:0,primeirosPartosProbables:0,primeirosPartosEstimados:0,
      secadosConfirmados:0,secadosProbables:0,secadosEstimados:0,
      femiasConfirmadas:0,femiasProbables:0,
      inseminadasPendentes:0,inseminadasSexadas:0,inseminadasConvencionais:0,inseminadasCarne:0,
      iaObligatoriasXovencas:0,iaObligatoriasVacas:0,
      iaRepeticionsXovencas:0,iaRepeticionsVacas:0,
      candidatasSaidaTerminal:0,
      eventos:[]
    });
    return calendario.get(k);
  };
  const probFemia=(tipo)=>tipo==="S"?.90:(tipo==="N"?.50:0);
  const numeroSeguro=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toFixed(d):"0";
  const idAnimal=(animal,robot)=>String(robot?.numeroVaca||animal?.crotal||"Sen identificación");
  const engadirEvento=(data,tipo,animal,robot,peso=1,detalle="")=>{
    if(!(data instanceof Date)||data<inicio||data>fin||peso<MIN_PESO)return;
    getMes(data).eventos.push({
      data:new Date(data),tipo,identificacion:idAnimal(animal,robot),
      crotal:animal?.crotal||"",peso,detalle
    });
  };

  // A media pode ser decimal. Ex.: 3,2 significa que estatisticamente o 20 %
  // das vacas que están na 3ª lactación continúan a unha 4ª.
  function pesoContinuacion(lactacion){
    const l=Math.max(1,Number(lactacion)||1);
    const base=Math.floor(lactMedia);
    const frac=lactMedia-base;
    if(l<base) return 1;
    if(l>base) return 0;
    return frac>0?frac:0;
  }

  function marcarSaidaTerminal(data,peso,animal=null,robot=null){
    if(!(data instanceof Date)||peso<MIN_PESO||data>fin)return;
    const m=getMes(data);
    m.candidatasSaidaTerminal+=peso;
    const k=claveMes(data);
    candidatosSaida.set(k,(candidatosSaida.get(k)||0)+peso);
    engadirEvento(data,"CANDIDATA_DESCARTE",animal,robot,peso,`Chega ao DEL terminal configurado (${duracionTerminal})`);
  }

  function programarCicloVaca(dataParto,peso,lactacionNova,prof=0,animal=null,robot=null){
    if(!(dataParto instanceof Date)||peso<MIN_PESO||prof>8) return;
    const continuar=pesoContinuacion(lactacionNova);
    const pesoContinua=peso*continuar;
    const pesoTerminal=peso-pesoContinua;

    // A parte que xa acadou a súa vida media non recibe outra IA.
    // Mantense produtiva ata a duración terminal de lactación e alí pasa a candidata de saída.
    if(pesoTerminal>=MIN_PESO){
      marcarSaidaTerminal(sumarDias(dataParto,duracionTerminal),pesoTerminal,animal,robot);
    }
    if(pesoContinua<MIN_PESO) return;

    const delCorrespondente=Number(lactacionNova)===1?delIAPrimiparas:delIAAdultas;
    const primeiraIA=sumarDias(dataParto,delCorrespondente);
    if(primeiraIA>fin) return;
    programarIntentos({dataPrimeira:primeiraIA,peso:pesoContinua,pr:prV,tipoAnimal:"VACA",primeiroParto:false,lactacionActual:lactacionNova,prof,animal,robot});
  }

  function programarIntentos({dataPrimeira,peso,pr,tipoAnimal,primeiroParto=false,lactacionActual=0,prof=0,animal=null,robot=null}){
    if(!(dataPrimeira instanceof Date)||peso<MIN_PESO||pr<=0) return;
    let baleira=peso;
    let intento=0;
    for(let dataIA=dia(dataPrimeira); dataIA<=fin && baleira>=MIN_PESO && intento<20; dataIA=sumarDias(dataIA,ciclo),intento++){
      const mIA=getMes(dataIA);
      engadirEvento(dataIA,intento===0?"IA_PLANIFICADA":"REPETICION_IA",animal,robot,baleira,`${tipoAnimal==="XOVENCA"?"Xovenca · chega á idade de IA":(Number(lactacionActual)===1?`Primípara · limiar ${delIAPrimiparas} DEL`:`Vaca ${Math.max(2,Number(lactacionActual)||2)}ª lact. · limiar ${delIAAdultas} DEL`)} · prob. preñez ${numeroSeguro(pr*100,1)} %`);
      if(tipoAnimal==="XOVENCA"){
        mIA.iaObligatoriasXovencas+=baleira;
        if(intento>0)mIA.iaRepeticionsXovencas+=baleira;
      }else{
        mIA.iaObligatoriasVacas+=baleira;
        if(intento>0)mIA.iaRepeticionsVacas+=baleira;
      }

      const concepcion=baleira*pr;
      baleira*=1-pr;
      const parto=sumarDias(dataIA,xestacion);
      if(parto>fin||concepcion<MIN_PESO) continue;

      const mp=getMes(parto);
      mp.partosEstimados+=concepcion;
      engadirEvento(parto,primeiroParto?"PRIMEIRO_PARTO":"PARTO_ESTIMADO",animal,robot,concepcion,`Parto estatístico · lactación ${primeiroParto?1:(Number(lactacionActual)||1)+1}`);
      if(primeiroParto)mp.primeirosPartosEstimados+=concepcion;

      if(tipoAnimal==="VACA"){
        const ds=sumarDias(parto,-secado);
        if(ds>inicio&&ds<=fin){getMes(ds).secadosEstimados+=concepcion; engadirEvento(ds,"SECADO_ESTIMADO",animal,robot,concepcion,`Secado ${secado} días antes do parto`);}
      }

      const novaLactacion=primeiroParto?1:(Math.max(1,Number(lactacionActual)||1)+1);
      programarCicloVaca(parto,concepcion,novaLactacion,prof+1,animal,robot);
    }
  }

  function programarRestoTrasIAActual({eVaca,pesoResto,lactacionActual}){
    if(pesoResto<MIN_PESO) return;
    // Un animal xa inseminado ten dereito a resolver esa IA actual aínda que
    // estea por riba da media de lactacións. Só se falla decidimos se pode seguir repetindo.
    if(eVaca){
      const continuar=pesoContinuacion(lactacionActual);
      const repite=pesoResto*continuar;
      const terminal=pesoResto-repite;
      if(terminal>=MIN_PESO){
        const delActual=0; // a data exacta de parto previo non está no informe; usamos DEL actual fóra desta función.
        marcarSaidaTerminal(sumarDias(inicio,duracionTerminal-delActual),terminal);
      }
      if(repite>=MIN_PESO){
        programarIntentos({dataPrimeira:sumarDias(inicio,ciclo),peso:repite,pr:prV,tipoAnimal:"VACA",primeiroParto:false,lactacionActual});
      }
    }else{
      programarIntentos({dataPrimeira:sumarDias(inicio,ciclo),peso:pesoResto,pr:prX,tipoAnimal:"XOVENCA",primeiroParto:true});
    }
  }

  for(const animal of presentes){
    if(animal.sexo!=="F") continue;
    const robot=datosRobot.get(animal.crotal);
    const grupo=grupoNaData(animal,inicio);
    // REGRA AUTORITATIVA DO ROBOT:
    // se existe Nº lactación, o animal xa pariu e é vaca; se está baleiro, segue sendo xovenca.
    // A idade só se usa como respaldo cando o animal aínda non aparece no robot.
    const eVaca=robot ? Number.isFinite(robot.lactacion) : grupo==="VACA";

    // A recría nova pode estar correctamente no Libro e non existir aínda no robot.
    // Nese caso si entra no calendario pola idade. Unha femia adulta sen robot non se
    // simula porque non coñecemos DEL, lactación nin estado reprodutivo.
    if(!robot){
      if(!eVaca){
        let dataIA=sumarMesesDecimais(animal.dataNacemento,idadeIAX);
        if(dataIA<inicio)dataIA=inicio;
        programarIntentos({dataPrimeira:dataIA,peso:1,pr:prX,tipoAnimal:"XOVENCA",primeiroParto:true,animal,robot:null});
      }
      continue;
    }
    const lactacion=Math.max(1,Number(robot.lactacion)||1);
    const tipo=["S","N","C"].includes(robot.tipoSeme)?robot.tipoSeme:"N";
    const pF=probFemia(tipo);
    if(tipo==="S")sexadas++;
    if(tipo==="C")carne++;

    if(robot.estado==="PRENADA"){
      prenadas++;
      femiasEsperadasPreñadas+=pF;
      const parto=dataPartoPreñada(robot,inicio,reproducion);
      if(parto&&parto>inicio&&parto<=fin){
        const m=getMes(parto);
        m.partosConfirmados+=1;
        m.femiasConfirmadas+=pF;
        engadirEvento(parto,!eVaca?"PRIMEIRO_PARTO":"PARTO_CONFIRMADO",animal,robot,1,"Parto confirmado polo robot");
        if(!eVaca)m.primeirosPartosConfirmados+=1;
        if(eVaca&&robot.producion==="LACTACION"){
          const ds=Number.isFinite(robot.diasSecado)&&robot.diasSecado>=0?sumarDias(inicio,robot.diasSecado):sumarDias(parto,-secado);
          if(ds>inicio&&ds<=fin){getMes(ds).secadosConfirmados+=1; engadirEvento(ds,"SECADO_CONFIRMADO",animal,robot,1,"Secado confirmado/derivado do parto");}
        }
        // IMPORTANTE: unha vaca que xa está preñada completa esta preñez sempre,
        // aínda que a súa lactación actual supere a media. O corte aplícase DESPOIS do parto.
        if(!robot.descarte){
          const novaLactacion=eVaca?lactacion+1:1;
          programarCicloVaca(parto,1,novaLactacion,0,animal,robot);
        }
      }
      continue;
    }

    if(robot.descarte){
      if(eVaca&&robot.producion==="LACTACION"){
        const faltan=Math.max(0,duracionTerminal-(Number(robot.diasLactacion)||0));
        marcarSaidaTerminal(sumarDias(inicio,faltan),1,animal,robot);
      }
      continue;
    }

    if(robot.estado==="INSEMINADA"){
      inseminadas++;
      engadirEvento(inicio,"IA_PENDENTE",animal,robot,1,`IA xa realizada · seme ${tipo}`);
      const pr=eVaca?prV:prX;
      prenecesProbablesInseminadas+=pr;
      femiasEsperadasInseminadas+=pr*pF;
      const parto=sumarDias(inicio,xestacion);
      if(parto<=fin){
        const m=getMes(parto);
        m.partosProbables+=pr;
        m.femiasProbables+=pr*pF;
        engadirEvento(parto,!eVaca?"PRIMEIRO_PARTO":"PARTO_PROBABLE",animal,robot,pr,"Parto probable da IA pendente");
        m.inseminadasPendentes+=1;
        if(tipo==="S")m.inseminadasSexadas+=1;
        else if(tipo==="C")m.inseminadasCarne+=1;
        else m.inseminadasConvencionais+=1;
        if(!eVaca)m.primeirosPartosProbables+=pr;
        if(eVaca&&robot.producion==="LACTACION"){
          const ds=sumarDias(parto,-secado);
          if(ds>inicio&&ds<=fin){getMes(ds).secadosProbables+=pr; engadirEvento(ds,"SECADO_PROBABLE",animal,robot,pr,"Secado probable");}
        }
        // A IA que xa existe respéctase aínda por riba da media.
        const novaLactacion=eVaca?lactacion+1:1;
        programarCicloVaca(parto,pr,novaLactacion,0,animal,robot);
      }

      const resto=1-pr;
      if(eVaca){
        const continuar=pesoContinuacion(lactacion);
        const repite=resto*continuar;
        const terminal=resto-repite;
        if(repite>=MIN_PESO){
          programarIntentos({dataPrimeira:sumarDias(inicio,ciclo),peso:repite,pr:prV,tipoAnimal:"VACA",primeiroParto:false,lactacionActual:lactacion,animal,robot});
        }
        if(terminal>=MIN_PESO&&robot.producion==="LACTACION"){
          const faltan=Math.max(0,duracionTerminal-(Number(robot.diasLactacion)||0));
          marcarSaidaTerminal(sumarDias(inicio,faltan),terminal,animal,robot);
        }
      }else{
        programarIntentos({dataPrimeira:sumarDias(inicio,ciclo),peso:resto,pr:prX,tipoAnimal:"XOVENCA",primeiroParto:true,animal,robot});
      }
      continue;
    }

    senInseminar++;

    if(!eVaca){
      let dataIA=sumarMesesDecimais(animal.dataNacemento,idadeIAX);
      if(dataIA<inicio)dataIA=inicio;
      programarIntentos({dataPrimeira:dataIA,peso:1,pr:prX,tipoAnimal:"XOVENCA",primeiroParto:true,animal,robot});
      continue;
    }

    if(robot.producion==="LACTACION"){
      const continuar=pesoContinuacion(lactacion);
      const terminal=1-continuar;
      const delActual=Number(robot.diasLactacion)||0;

      // Exemplo solicitado: media=3, vaca en 3ª sen inseminar -> NON nova IA.
      if(terminal>=MIN_PESO){
        const faltan=Math.max(0,duracionTerminal-delActual);
        marcarSaidaTerminal(sumarDias(inicio,faltan),terminal,animal,robot);
      }
      if(continuar>=MIN_PESO){
        const delCorrespondente=lactacion===1?delIAPrimiparas:delIAAdultas;
        const faltanIA=Math.max(0,delCorrespondente-delActual);
        let dataIA;
        if(delActual>delCorrespondente){
          // Xa superou os DEL de IA e segue baleira: seguinte oportunidade = un ciclo.
          dataIA=sumarDias(inicio,ciclo);
        }else{
          dataIA=sumarDias(inicio,faltanIA);
        }
        programarIntentos({dataPrimeira:dataIA,peso:continuar,pr:prV,tipoAnimal:"VACA",primeiroParto:false,lactacionActual:lactacion,animal,robot});
      }
    }
  }

  return {
    activo:true,prenadas,inseminadas,senInseminar,sexadas,carne,
    prenecesProbablesInseminadas,femiasEsperadasPreñadas,femiasEsperadasInseminadas,
    femiasEsperadas:femiasEsperadasPreñadas+femiasEsperadasInseminadas,
    lactacionsMediasPorVaca:lactMedia,duracionLactacionDescarteDias:duracionTerminal,
    candidatosSaida:[...candidatosSaida.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([mes,valor])=>({mes,valor})),
    calendario:[...calendario.values()].sort((a,b)=>a.mes.localeCompare(b.mes))
  };
}

function finMes(data) { return new Date(data.getFullYear(), data.getMonth() + 1, 0); }

function inicioQuincena(data){ return new Date(data.getFullYear(),data.getMonth(),data.getDate()<=15?1:16); }
function finQuincena(data){ return data.getDate()<=15?new Date(data.getFullYear(),data.getMonth(),15):finMes(data); }
function claveQuincena(data){ return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,"0")}-${data.getDate()<=15?"Q1":"Q2"}`; }
function etiquetaQuincena(data){ const mes=new Intl.DateTimeFormat("gl-ES",{month:"short",year:"numeric"}).format(data).replace(".",""); return `${data.getDate()<=15?"1–15":"16–fin"} ${mes}`; }
function quincenasEntre(inicio,fin){
  const r=[]; let d=sumarDias(dia(inicio),1);
  if(d>fin) return r;
  d=inicioQuincena(d);
  while(d<=fin){ const a=d<sumarDias(inicio,1)?sumarDias(inicio,1):d; const b=finQuincena(d)>fin?fin:finQuincena(d); if(a<=b) r.push({inicio:a,fin:b,clave:claveQuincena(d),etiqueta:etiquetaQuincena(d)}); d=sumarDias(finQuincena(d),1); }
  return r;
}
function diasEntreIncl(a,b){ return b<a?0:Math.floor((b-a)/MS_DIA)+1; }


function seleccionarDescartes(ranking, cantidade, xaDescartadas) {
  const candidatas=[];
  for (const x of ranking || []) {
    if (xaDescartadas.has(x.crotal)) continue;
    candidatas.push(x);
    if (candidatas.length>=cantidade) break;
  }
  // Un checkbox desmarcado protexe esa candidata: non se substitúe automaticamente
  // por outra, para que a decisión do usuario cambie realmente o tamaño do descarte.
  return candidatas.map(x=>({...x,seleccionado:x.permitirDescarte!==false}));
}

function crearProxeccionConfirmada({presentes,inicio,fin,leiteInicial,adultasActuais,obxectivoLeite,reposicionEfectiva,marxeVacasLeite,reproducion,datosRobot,rankingDescartes=[]}) {
  if (!(datosRobot instanceof Map)) return { activo:false, filas:[], ultimoPeriodo:null, descartesAcumulados:0 };
  const eventos=[];
  const secadoDias=Math.max(0,Number(reproducion.duracionSecadoDias)||0);
  for(const animal of presentes){
    if(animal.sexo!=="F") continue;
    const robot=datosRobot.get(animal.crotal);
    if(!robot||robot.estado!=="PRENADA") continue;
    const parto=dataPartoPreñada(robot,inicio,reproducion);
    if(!parto||parto<=inicio||parto>fin) continue;
    const grupo=grupoNaData(animal,inicio);
    let entrada=(grupo!=="VACA"||robot.producion==="SECADO")?1:0;
    if(grupo==="VACA"&&robot.producion==="LACTACION"){
      const dataSecado=Number.isFinite(robot.diasSecado)&&robot.diasSecado>=0?sumarDias(inicio,robot.diasSecado):sumarDias(parto,-secadoDias);
      if(dataSecado&&dataSecado>inicio&&dataSecado<=parto&&dataSecado<=fin){ eventos.push({data:dataSecado,tipo:"SECADO",crotal:animal.crotal}); entrada=1; }
    }
    eventos.push({data:parto,tipo:"PARTO",crotal:animal.crotal,entradaLeite:entrada,femia:robot.sexado?0.90:0.50});
  }
  eventos.sort((a,b)=>a.data-b.data);
  if(!eventos.length) return {activo:true,filas:[],ultimoPeriodo:null,descartesAcumulados:0,crotalesDescartados:[]};
  const ultimoEvento=eventos.at(-1).data;
  const periodos=quincenasEntre(inicio,ultimoEvento);
  const limite=obxectivoLeite+Math.max(0,Number(marxeVacasLeite)||0);
  let leite=leiteInicial,reposicionAcumuladaObx=0,descartesAcumulados=0;
  const descartadas=new Set(),filas=[];

  function animalEnLeite(crotal,data,descSet){
    if(descSet.has(crotal)) return false;
    const r=datosRobot.get(crotal); if(!r||r.producion!=="LACTACION") return false;
    let estado=true;
    for(const ev of eventos){ if(ev.crotal!==crotal||ev.data>data) continue; if(ev.tipo==="SECADO") estado=false; if(ev.tipo==="PARTO"&&(ev.entradaLeite||0)>0) estado=true; }
    return estado;
  }
  function aplicarEventos(desde,ata,leiteBase,descSet){
    let l=leiteBase,partos=0,secados=0,femias=0;
    for(const ev of eventos){ if(ev.data<desde||ev.data>ata||descSet.has(ev.crotal)) continue; if(ev.tipo==="SECADO"){l=Math.max(0,l-1);secados++;} else {partos++;femias+=ev.femia||0;l+=ev.entradaLeite||0;} }
    return {leite:l,partos,secados,femias};
  }
  function minimo45Dias(desde,leiteBase,descSet){
    const ata=sumarDias(desde,45); let l=leiteBase,min=l;
    for(const ev of eventos){ if(ev.data<=desde||ev.data>ata||descSet.has(ev.crotal)) continue; if(ev.tipo==="SECADO") l=Math.max(0,l-1); else l+=ev.entradaLeite||0; min=Math.min(min,l); }
    return min;
  }

  for(const per of periodos){
    const leiteInicio=leite;
    const aplicado=aplicarEventos(per.inicio,per.fin,leite,descartadas); leite=aplicado.leite;
    reposicionAcumuladaObx+=adultasActuais*(reposicionEfectiva/100)*(diasEntreIncl(per.inicio,per.fin)/DIAS_ANO);
    const leiteAntesDescartes=leite;
    const propostaBase=leite>limite+1e-9?Math.max(0,Math.floor(leite-obxectivoLeite+1e-9)):0;
    const propostas=[]; const simuladas=new Set(descartadas);
    for(const cand of rankingDescartes){
      if(propostas.length>=propostaBase) break;
      if(simuladas.has(cand.crotal)||!animalEnLeite(cand.crotal,per.fin,simuladas)) continue;
      const teste=new Set(simuladas); teste.add(cand.crotal);
      const leiteTras=leite-propostas.filter(x=>x.seleccionado).length-1;
      if(minimo45Dias(per.fin,leiteTras,teste)>=obxectivoLeite){
        const x={...cand,seleccionado:cand.permitirDescarte!==false}; propostas.push(x); if(x.seleccionado) simuladas.add(x.crotal);
      }
    }
    const seleccionadas=propostas.filter(x=>x.seleccionado);
    for(const x of seleccionadas) descartadas.add(x.crotal);
    const descartes=seleccionadas.length; leite=Math.max(0,leite-descartes); descartesAcumulados+=descartes;
    filas.push({periodo:per.clave,etiqueta:per.etiqueta,dataInicio:per.inicio,dataFin:per.fin,vacasInicio:leiteInicio,partosConfirmados:aplicado.partos,secados:aplicado.secados,
      leiteAntesDescartes,descartes,propostaBase,descartesSuxeridos:propostas,vacasLeite:leite,femiasEsperadas:aplicado.femias,machosEsperados:Math.max(0,aplicado.partos-aplicado.femias),
      estado:leite>=obxectivoLeite?"CUBERTO":"DEFICIT",diferenza:leite-obxectivoLeite,reposicionAcumuladaObx,descartesAcumulados,desviacionReposicion:descartesAcumulados-reposicionAcumuladaObx});
  }
  return {activo:true,filas,ultimoPeriodo:periodos.at(-1)?.clave||null,ultimoEvento,descartesAcumulados,crotalesDescartados:[...descartadas]};
}

function crearObxectivosReprodutivos({presentes,inicio,fin,reproducion,datosRobot,planRebano,pipelineRobot,obxectivoLeite,femiasAdicionaisACriar=0,taxas={},adultasObxectivo=0,idadePrimeiroPartoMeses=24}) {
  const prX=clampTaxa(reproducion.taxaPrenezXovencas)/100;
  const prV=clampTaxa(reproducion.taxaPrenezVacas)/100;
  const supervivencia=Math.max(0.01,(1-clampTaxa(taxas.mortalidadeFemiasUsada||0)/100)*(1-clampTaxa(taxas.mortalidadeXovencasUsada||0)/100));
  const mapaPipe=new Map((pipelineRobot?.calendario||[]).map(x=>[x.mes,x]));
  const filas=[];

  // A necesidade chega expresada como futuras vacas. Pasámola a nacementos femia,
  // porque é o que realmente decide canto sexado necesitamos producir.
  let femiasNacementoPendentes=Math.max(0,Number(femiasAdicionaisACriar)||0);
  const meses=[...mapaPipe.keys()].sort();

  for(const mesIA of meses){
    const pipe=mapaPipe.get(mesIA)||{};
    const iaX=Math.max(0,Number(pipe.iaObligatoriasXovencas)||0);
    const iaV=Math.max(0,Number(pipe.iaObligatoriasVacas)||0);
    if(iaX+iaV<0.01) continue;

    // Primeiro sexado en xovencas; só sexamos vacas se coas xovencas non chega.
    const maxX=Math.max(0,Math.round(iaX));
    const maxV=Math.max(0,Math.round(iaV));
    // Regra económica/xenética: toda xovenca existente que chega á IA vai con sexado.
    // Non reducimos estas IA aínda que a reposición xa estea cuberta.
    let sexadosXovencas=maxX,sexadosVacas=0;
    femiasNacementoPendentes=Math.max(0,femiasNacementoPendentes-sexadosXovencas*prX*.90);

    if(femiasNacementoPendentes>0 && prV>0){
      sexadosVacas=Math.min(maxV,Math.ceil(femiasNacementoPendentes/(prV*.90)-1e-9));
      femiasNacementoPendentes=Math.max(0,femiasNacementoPendentes-sexadosVacas*prV*.90);
    }

    const carnesX=0;
    const carnesV=Math.max(0,maxV-sexadosVacas);
    const carnes=carnesX+carnesV;
    const totalIA=maxX+maxV;
    const prenecesEsperadasNovas=sexadosXovencas*prX+sexadosVacas*prV+carnesX*prX+carnesV*prV;
    const femiasEsperadasNovas=(sexadosXovencas*prX+sexadosVacas*prV)*.90;
    const paraPartos=etiquetaMes(claveMes(sumarDias(new Date(Number(mesIA.slice(0,4)),Number(mesIA.slice(5,7))-1,15),Math.max(1,Number(reproducion.duracionXestacionDias)||283))));
    const motivoSexado=(sexadosXovencas+sexadosVacas)===0
      ? `Non hai xovencas para IA sexada este mes. Coa recría cuberta, as ${carnes} IA de vacas recoméndanse a carne.`
      : `${sexadosXovencas} IA sexadas en xovencas por criterio de mellora xenética${sexadosVacas?`; ademais fan falta ${sexadosVacas} IA sexadas en vacas para completar a necesidade futura de recría`:""}. As outras ${carnes} IA obrigatorias de vacas van a carne para non criar xovencas de máis.`;

    filas.push({
      mes:mesIA,etiqueta:etiquetaMes(mesIA),paraPartos,
      iaObligatoriasXovencas:maxX,iaObligatoriasVacas:maxV,totalIA,
      sexadosXovencas,sexadosVacas,sexados:sexadosXovencas+sexadosVacas,
      carnes,carnesXovencas:carnesX,carnesVacas:carnesV,convencionais:0,
      prenecesEsperadasNovas,femiasEsperadasNovas,
      femiasNecesarias:femiasNacementoPendentes,
      femiasXa:Number(pipe.femiasConfirmadas||0)+Number(pipe.femiasProbables||0),
      motivoSexado,insuficienciaFemias:femiasNacementoPendentes>0,
      inseminadasPendentes:Number(pipe.inseminadasPendentes||0),
      inseminadasSexadas:Number(pipe.inseminadasSexadas||0),
      inseminadasConvencionais:Number(pipe.inseminadasConvencionais||0),
      inseminadasCarne:Number(pipe.inseminadasCarne||0),
      taxaPrenezXovencas:prX*100,taxaPrenezVacas:prV*100,supervivenciaRecria:supervivencia,
      confirmadas:Number(pipe.partosConfirmados||0),
      probables:Number(pipe.partosProbables||0),
      partosNecesarios:Number(pipe.partosConfirmados||0)+Number(pipe.partosProbables||0)+Number(pipe.partosEstimados||0),
      novasPreneces:prenecesEsperadasNovas,
      fiabilidade:"CALENDARIO"
    });
  }
  return {filas,semeMesActual:filas.find(x=>x.mes===claveMes(inicio))||filas[0]||null,femiasPendentesFinal:femiasNacementoPendentes};
}


function engadirXeracionVirtual({pipelineRobot,obxectivosReprodutivos,inicio,fin,reproducion,taxas={}}){
  const calendario=(pipelineRobot?.calendario||[]).map(m=>({...m,eventos:(m.eventos||[]).map(e=>({...e}))}));
  const mapa=new Map(calendario.map(m=>[m.mes,m]));
  const xestacion=Math.max(1,Number(reproducion.duracionXestacionDias)||283);
  const ciclo=Math.max(1,Number(reproducion.duracionCicloDias)||21);
  const idadeIA=Math.max(0,Number(reproducion.idadePrimeiraInseminacionMeses)||15);
  const pr=Math.max(0,Math.min(1,clampTaxa(reproducion.taxaPrenezXovencas)/100));
  const supervivencia=Math.max(0,(1-clampTaxa(taxas.mortalidadeFemiasUsada||0)/100)*(1-clampTaxa(taxas.mortalidadeXovencasUsada||0)/100));
  const MIN=0.015;
  const getMes=(data)=>{
    const k=claveMes(data);
    if(!mapa.has(k)) mapa.set(k,{mes:k,etiqueta:etiquetaMes(k),partosConfirmados:0,partosProbables:0,partosEstimados:0,primeirosPartosConfirmados:0,primeirosPartosProbables:0,primeirosPartosEstimados:0,secadosConfirmados:0,secadosProbables:0,secadosEstimados:0,femiasConfirmadas:0,femiasProbables:0,femiasEstimadas:0,inseminadasPendentes:0,inseminadasSexadas:0,inseminadasConvencionais:0,inseminadasCarne:0,iaObligatoriasXovencas:0,iaObligatoriasVacas:0,iaRepeticionsXovencas:0,iaRepeticionsVacas:0,iaXeracionVirtual:0,candidatasSaidaTerminal:0,eventos:[]});
    return mapa.get(k);
  };

  // Unha soa xeración virtual. Repartimos as femias esperadas de cada mes entre os
  // partos dos animais que existen hoxe para poder identificalas como "Filla de X".
  const cohortes=[];
  for(const m of calendario){
    const femias=Math.max(0,Number(m.femiasConfirmadas||0)+Number(m.femiasProbables||0)+Number(m.femiasEstimadas||0));
    if(femias<=MIN) continue;
    const partos=(m.eventos||[]).filter(e=>["PARTO_CONFIRMADO","PARTO_PROBABLE","PARTO_ESTIMADO","PRIMEIRO_PARTO"].includes(e.tipo) && e.identificacion);
    const pesoPartos=partos.reduce((a,e)=>a+Math.max(0,Number(e.peso)||0),0);
    if(partos.length && pesoPartos>MIN){
      for(const ev of partos){
        const parte=femias*(Math.max(0,Number(ev.peso)||0)/pesoPartos);
        if(parte<=MIN) continue;
        const nai=String(ev.identificacion||ev.crotal||"animal");
        const id=`VIRTUAL:${String(ev.crotal||nai)}:${m.mes}`;
        cohortes.push({id,nai,mesNacemento:m.mes,femias:parte});
      }
    }else{
      cohortes.push({id:`VIRTUAL:COHORTE:${m.mes}`,nai:`cohorte ${m.mes}`,mesNacemento:m.mes,femias});
    }
  }

  for(const c of cohortes){
    const [a,m]=c.mesNacemento.split("-").map(Number);
    const nacemento=new Date(a,m-1,15);
    let baleiras=c.femias*supervivencia;
    let dataIA=sumarMesesDecimais(nacemento,idadeIA);
    let intento=0;
    const nome=`Filla de ${c.nai}`;
    for(;dataIA<=fin && baleiras>=MIN && intento<20;dataIA=sumarDias(dataIA,ciclo),intento++){
      const mi=getMes(dataIA);
      mi.iaXeracionVirtual=(Number(mi.iaXeracionVirtual)||0)+baleiras;
      mi.eventos.push({data:new Date(dataIA),tipo:intento===0?"IA_XERACION_VIRTUAL":"REPETICION_IA_XERACION_VIRTUAL",
        identificacion:nome,crotal:"",regulacionId:c.id,nacementoVirtual:new Date(nacemento),peso:baleiras,
        detalle:"1ª xeración virtual · non xera unha 2ª xeración"});
      const preneces=baleiras*pr;
      baleiras*=1-pr;
      const parto=sumarDias(dataIA,xestacion);
      if(parto>fin || preneces<MIN) continue;
      const mp=getMes(parto);
      mp.partosEstimados=(Number(mp.partosEstimados)||0)+preneces;
      mp.primeirosPartosEstimados=(Number(mp.primeirosPartosEstimados)||0)+preneces;
      mp.eventos.push({data:new Date(parto),tipo:"PRIMEIRO_PARTO_VIRTUAL",identificacion:nome,crotal:"",
        regulacionId:c.id,nacementoVirtual:new Date(nacemento),peso:preneces,
        detalle:"Primeiro parto da 1ª xeración virtual · a cría deste parto NON se incorpora á simulación"});
    }
  }
  return {...pipelineRobot,calendario:[...mapa.values()].sort((a,b)=>a.mes.localeCompare(b.mes)),xeracionVirtualActiva:true};
}

function crearPlanMensual({inicio,fin,adultasActuais,adultasObxectivo,obxectivoLeite,leiteInicial,secasInicial,reposicionEfectiva,marxe,reproducion,calendarioRecria,pipelineRobot}){
  const meses=mesesEntre(inicio,fin);
  const ciclo=Math.max(1,reproducion.duracionCicloDias);
  const prVacas=clampTaxa(reproducion.taxaPrenezVacas)/100;
  const xestacion=Math.max(1,reproducion.duracionXestacionDias);
  const secado=Math.max(0,reproducion.duracionSecadoDias);
  const delIA=Math.max(0,reproducion.diasLeitePrimeiraInseminacionVacas);
  const esperaMedia=prVacas>0?(1/prVacas-1)*ciclo:0;
  const intervaloPartos=Math.max(1,delIA+esperaMedia+xestacion);
  const partosAnoEstables=adultasObxectivo*DIAS_ANO/intervaloPartos;
  const mapaRecria=new Map(calendarioRecria.map(x=>[x.mes,x.entradas]));
  const mapaComprometidos=new Map((pipelineRobot?.calendario||[]).map(x=>[x.mes,x]));
  const mesInicio=claveMes(inicio);
  const filas=[];
  // Os cálculos seguen con decimais, pero as accións do plan repártense como animais enteiros.
  // O resto acumulado pasa ao mes seguinte para non perder animais por redondear cada mes illadamente.
  const restos = { partos: 0, secados: 0, saidas: 0 };
  function enteiroAcumulado(valor, campo) {
    const total = Math.max(0, valor) + restos[campo];
    const enteiro = Math.floor(total + 1e-9);
    restos[campo] = total - enteiro;
    return enteiro;
  }
  let adultas=adultasActuais;
  let leite=leiteInicial;
  let secas=secasInicial;

  for(const mes of meses){
    const clave=claveMes(mes), dias=diasNoMes(mes);
    const fraccionAno=dias/DIAS_ANO;
    const saídas=adultas*(reposicionEfectiva/100)*fraccionAno;
    const entradasXovencas=mapaRecria.get(clave)||0;
    // Partos necesarios para soster o fluxo adulto e achegarse ao obxectivo, repartindo o déficit restante.
    const mesesRestantes=Math.max(1,meses.length-filas.length);
    const deficitAdultas=Math.max(0,adultasObxectivo-adultas);
    const crecementoMes=deficitAdultas/mesesRestantes;
    const partosMantemento=partosAnoEstables*fraccionAno;
    const partosObxectivo=Math.max(partosMantemento,saídas+crecementoMes);
    const secadosObxectivo=partosObxectivo*(secado/Math.max(1,intervaloPartos-secado));
    const partosVacas=Math.max(0,partosObxectivo-entradasXovencas);
    const adultasFinal=Math.max(0,adultas-saídas+entradasXovencas+Math.max(0,partosVacas-partosMantemento)*0); // partos de vacas non crean adultas novas
    adultas=adultasFinal;

    // Fluxo leite/seco de planificación, non reconstrución individual: usamos o obxectivo e o período seco.
    const proporcionSecaPlan=Math.min(0.5,secado/intervaloPartos);
    const secasPlan=adultas*proporcionSecaPlan;
    const leitePlan=Math.max(0,adultas-secasPlan);
    leite=leitePlan; secas=secasPlan;

    // O robot permítenos separar o que xa está comprometido do que aínda hai que conseguir.
    const comprometido=mapaComprometidos.get(clave);
    const partosConfirmados=comprometido?.partosConfirmados||0;
    const partosProbables=comprometido?.partosProbables||0;
    const partosEstimados=comprometido?.partosEstimados||0;
    const partosComprometidos=partosConfirmados+partosProbables+partosEstimados;
    const partosPorCubrir=Math.max(0,partosObxectivo-partosComprometidos);
    // Para que os partos ocorran neste mes, as novas preñeces deben conseguirse xestación días antes.
    const dataConcepcion=sumarDias(new Date(mes.getFullYear(),mes.getMonth(),15),-xestacion);
    const mesConcepcion=claveMes(dataConcepcion);
    const accionable=dataConcepcion>=inicio;
    const preñecesBase=partosPorCubrir;
    const preñecesConMarxe=preñecesBase*(1+marxe/100);
    const preñecesEncaminadas=accionable && mesConcepcion===mesInicio ? (pipelineRobot?.prenecesProbablesInseminadas||0) : 0;
    const pendentesPreñez=Math.max(0,preñecesConMarxe-preñecesEncaminadas);
    const probMes=prVacas>0?1-Math.pow(1-prVacas,dias/ciclo):0;
    const vacasEnPrograma=accionable && probMes>0?pendentesPreñez/probMes:null;

    const partosPlan = enteiroAcumulado(partosObxectivo, "partos");
    const secadosPlan = enteiroAcumulado(secadosObxectivo, "secados");
    const saidasPlan = enteiroAcumulado(saídas, "saidas");
    const prenecesPlan = accionable ? Math.ceil(pendentesPreñez - 1e-9) : null;

    filas.push({
      mes:clave, etiqueta:etiquetaMes(clave), partos:partosPlan, partosCalculados:partosObxectivo, partosVacas, entradasXovencas,
      partosConfirmados,partosProbables,partosComprometidos,partosPorCubrir,
      secados:secadosPlan, secadosCalculados:secadosObxectivo, saidas:saidasPlan, saidasCalculadas:saídas, vacasLeite:leite, vacasSecas:secas, adultas,
      dataConcepcion, mesConcepcion, accionable, preñecesEncaminadas, preñecesObxectivo:prenecesPlan, preñecesCalculadas:preñecesConMarxe, vacasEnPrograma,
      desviacionLeite:leite-obxectivoLeite
    });
  }
  return {filas, intervaloPartosDias:intervaloPartos, partosAnoEstables};
}



function crearBalanceMensual({presentes,inicio,fin,planRebano,obxectivosReprodutivos,pipelineRobot,reproducion,taxas,recriaFemiaActual=0,datosRobot=null,obxectivoLeite=0,leiteInicial=0,secasInicial=0,marxeVacasLeite=0}) {
  const filasPlan=planRebano?.filas||[];
  const pipe=new Map((pipelineRobot?.calendario||[]).map(x=>[x.mes,x]));
  const reproPorIA=new Map((obxectivosReprodutivos?.filas||[]).map(r=>[r.mes,r]));
  const reproPorParto=new Map();
  for(const r of (obxectivosReprodutivos?.filas||[])){
    const ia=(r.mes||"").split("-");
    if(ia.length!==2) continue;
    const d=sumarDias(new Date(Number(ia[0]),Number(ia[1])-1,15),Math.max(1,Number(reproducion.duracionXestacionDias)||283));
    reproPorParto.set(claveMes(d),r);
  }

  const mortT=clampTaxa(taxas?.mortalidadeFemiasUsada||0)/100;
  const mortX=clampTaxa(taxas?.mortalidadeXovencasUsada||0)/100;
  const supervivencia=Math.max(.01,(1-mortT)*(1-mortX));
  const repo=clampTaxa(taxas?.reposicionUsada||0)/100;
  const idadePP=Math.max(12,Number(reproducion.idadePrimeiroPartoEsperadaMeses||24));
  const adultasRef=Math.max(1,Number(planRebano?.adultasObxectivo)||Number(leiteInicial)+Number(secasInicial));
  const recriaNecesaria=(adultasRef*repo*(idadePP/12))/supervivencia;

  // PRIMEIRA PASADA: fluxo sen descartes, para saber se o excedente actual fará falta nos meses seguintes.
  let leite=Math.max(0,Math.round(Number(leiteInicial)||0));
  let secas=Math.max(0,Math.round(Number(secasInicial)||0));
  let recria=Math.max(0,Number(recriaFemiaActual)||0);
  let reposicionPendente=0;
  const raw=[];
  const descarteVencidoPorMes=new Map();
  for(const x of (pipelineRobot?.candidatosSaida||[])){
    descarteVencidoPorMes.set(x.mes,(descarteVencidoPorMes.get(x.mes)||0)+Number(x.valor||0));
  }
  let descartesVencidosAcum=0;

  for(const f of filasPlan){
    const leiteInicio=leite, secasInicio=secas;
    const p=pipe.get(f.mes)||{};
    const reproParto=reproPorParto.get(f.mes)||null;
    const reproIA=reproPorIA.get(f.mes)||null;
    const accionable=Boolean(f.accionable);

    const confPartos=Math.max(0,Number(p.partosConfirmados)||0);
    const probPartos=Math.max(0,Number(p.partosProbables)||0);
    const estPartos=Math.max(0,Number(p.partosEstimados)||0);
    const confSecados=Math.max(0,Number(p.secadosConfirmados)||0);
    const probSecados=Math.max(0,Number(p.secadosProbables)||0);
    const estSecados=Math.max(0,Number(p.secadosEstimados)||0);

    let partosEsperados=confPartos+probPartos+estPartos;
    let secadosEsperados=confSecados+probSecados+estSecados;
    if(accionable){
      partosEsperados=Math.max(partosEsperados,Math.max(0,Number(f.partosCalculados)||0));
      secadosEsperados=Math.max(secadosEsperados,Math.max(0,Number(f.secadosCalculados)||0));
    }
    const partos=Math.max(0,Math.round(partosEsperados));
    const secadosMes=Math.max(0,Math.round(secadosEsperados));
    const primeirosPartos=Math.max(0,Math.round(
      Number(p.primeirosPartosConfirmados||0)+Number(p.primeirosPartosProbables||0)+Number(p.primeirosPartosEstimados||0)
    ));
    const partosVacas=Math.max(0,partos-primeirosPartos);

    const secadosAplicados=Math.min(leite,secadosMes);
    leite-=secadosAplicados; secas+=secadosAplicados;
    const vacasQueVolven=Math.min(secas,partosVacas);
    secas-=vacasQueVolven; leite+=vacasQueVolven+primeirosPartos;

    const femiasPipe=Math.max(0,Number(p.femiasConfirmadas||0)+Number(p.femiasProbables||0)+Number(p.femiasEstimadas||0));
    const femiasPlan=Math.max(0,Number(reproParto?.femiasEsperadasNovas)||0);
    const femiasNacen=accionable?Math.max(femiasPipe,femiasPlan):femiasPipe;
    const saidasRecriaRegulacion=Math.max(0,Number(p.saidasRecriaRegulacion)||0);
    recria=Math.max(0,recria-primeirosPartos+femiasNacen*supervivencia-saidasRecriaRegulacion);

    reposicionPendente+=Math.max(0,Number(f.saidasCalculadas)||0);
    descartesVencidosAcum+=descarteVencidoPorMes.get(f.mes)||0;

    raw.push({
      mes:f.mes,etiqueta:f.etiqueta,leiteInicioBase:leiteInicio,leiteFinalBase:leite,
      secasInicio,secasFinal:secas,partos,secados:secadosAplicados,primeirosPartos,
      saidasRecriaRegulacion, recriaPrevista:recria,
      femiasAProducir:Math.max(0,Math.ceil(Number(reproIA?.femiasNecesarias)||0)),
      iaSexado:Math.max(0,Math.round(Number(reproIA?.sexados)||0)),
      iaResto:Math.max(0,Math.round(Number(reproIA?.convencionais)||0)),
      iaCarne:Math.max(0,Math.round(Number(reproIA?.carnes)||0)),
      detalleIA:reproIA?{
        paraPartos:reproIA.paraPartos,
        iaObligatoriasXovencas:reproIA.iaObligatoriasXovencas,
        iaObligatoriasVacas:reproIA.iaObligatoriasVacas,
        partosNecesarios:reproIA.partosNecesarios,
        confirmadas:reproIA.confirmadas,
        probables:reproIA.probables,
        inseminadasPendentes:reproIA.inseminadasPendentes,
        inseminadasSexadas:reproIA.inseminadasSexadas,
        inseminadasConvencionais:reproIA.inseminadasConvencionais,
        inseminadasCarne:reproIA.inseminadasCarne,
        sexadosXovencas:reproIA.sexadosXovencas,sexadosVacas:reproIA.sexadosVacas,carnes:reproIA.carnes,
        femiasXa:reproIA.femiasXa,
        femiasNecesarias:reproIA.femiasNecesarias,
        femiasEsperadasNovas:reproIA.femiasEsperadasNovas,
        prenecesEsperadasNovas:reproIA.prenecesEsperadasNovas,
        taxaPrenezXovencas:reproIA.taxaPrenezXovencas,
        taxaPrenezVacas:reproIA.taxaPrenezVacas,
        supervivenciaRecria:reproIA.supervivenciaRecria,
        motivoSexado:reproIA.motivoSexado,
        insuficienciaFemias:reproIA.insuficienciaFemias
      }:null,
      descartesVencidosAcum,
      reposicionPendenteBase:reposicionPendente
    });
  }

  // SEGUNDA PASADA: regular o lote cara obxectivo + marxe.
  // Se hai excedente persistente, recomendamos saídas aínda que as candidatas non chegasen
  // ao DEL terminal: primeiro as vencidas; se non abondan, as de maior DEL/ranking.
  let descartesAcum=0, descartesExecutadosAcum=0;
  const filas=[];
  const teito=Math.max(0,Number(obxectivoLeite)||0)+Math.max(0,Number(marxeVacasLeite)||0);
  for(let i=0;i<raw.length;i++){
    const x=raw[i];
    const debidasRepo=Math.max(0,Math.floor(x.reposicionPendenteBase-descartesExecutadosAcum+1e-9));
    const debidasTerminal=Math.max(0,Math.floor((x.descartesVencidosAcum||0)-descartesExecutadosAcum));
    const finXanela=Math.min(raw.length-1,i+3);
    let marxeMinima=Infinity;
    for(let j=i;j<=finXanela;j++){
      const leiteFuturo=raw[j].leiteFinalBase-descartesAcum;
      marxeMinima=Math.min(marxeMinima,leiteFuturo-Math.max(0,Number(obxectivoLeite)||0));
    }
    const leiteAntes=x.leiteFinalBase-descartesAcum;
    const excesoSobreTeito=Math.max(0,Math.floor(leiteAntes-teito+1e-9));
    const candidatasNecesarias=Math.max(debidasRepo,debidasTerminal,excesoSobreTeito);
    const maxSeguro=Math.max(0,Math.floor(marxeMinima+1e-9));
    const descartes=Math.min(candidatasNecesarias,maxSeguro);
    descartesAcum+=descartes;
    descartesExecutadosAcum+=descartes;

    const leiteInicio=Math.max(0,x.leiteInicioBase-(descartesAcum-descartes));
    const leiteFinal=Math.max(0,x.leiteFinalBase-descartesAcum);
    const deficitLeite=Math.max(0,Number(obxectivoLeite||0)-leiteFinal);
    const excesoLeite=Math.max(0,leiteFinal-teito);
    const deficitRecria=Math.max(0,recriaNecesaria-x.recriaPrevista);
    const excesoRecria=Math.max(0,x.recriaPrevista-recriaNecesaria);
    const cabana=Math.round(leiteFinal+x.secasFinal+x.recriaPrevista);

    let estado="✓ Dentro do umbral";
    if(deficitLeite>=1) estado=`Faltan ${Math.ceil(deficitLeite)} vacas en leite`;
    else if(descartes>0) estado=`Suxerir ${descartes} descarte${descartes===1?"":"s"} para regular o lote`;
    else if(candidatasNecesarias>0 && maxSeguro<1) estado="Preservar vacas: farán falta nos próximos meses";
    else if(x.femiasAProducir>0) estado=`Producir ${x.femiasAProducir} femia${x.femiasAProducir===1?"":"s"} futura${x.femiasAProducir===1?"":"s"}`;

    filas.push({...x,leiteInicio,leiteFinal,descartes,recriaNecesaria,deficitRecria,excesoRecria,
      cabanaTotal:cabana,deficitLeite,excesoLeite,estado,teitoLeite:teito,
      descartePorExceso:Math.min(descartes,excesoSobreTeito)});
  }
  return {filas,recriaNecesaria};
}

export function crearEscenarioRegulacionRecria(resultado, opcoes={}){
  const baseFilas=resultado?.balanceMensual?.filas||[];
  const pipelineBase=resultado?.pipelineRobot||{calendario:[]};
  const calendarioBase=pipelineBase.calendario||[];
  const teito=Math.max(0,Number(resultado?.obxectivoLeite)||0)+Math.max(0,Number(resultado?.marxeVacasLeite)||0);
  const seleccionados=new Set((opcoes?.ids||opcoes?.crotales||[]).map(String));
  const dataSaida=opcoes?.dataSaida instanceof Date&&!Number.isNaN(opcoes.dataSaida.getTime())?dia(opcoes.dataSaida):dia(resultado.dataSituacion);

  const recomendacions=[];
  for(const x of baseFilas){
    const primeiros=Math.max(0,Number(x.primeirosPartos)||0);
    const preDescarte=Math.max(0,Number(x.leiteFinal)||0)+Math.max(0,Number(x.descartes)||0);
    const exceso=Math.max(0,Math.floor(preDescarte-teito+1e-9));
    const cantidade=Math.max(0,Math.min(Math.round(primeiros),exceso,Math.max(0,Number(x.descartes)||0)));
    if(cantidade>0) recomendacions.push({mesParto:x.mes,etiquetaParto:x.etiqueta,cantidade,
      explicacion:`Prevese un pico de ${primeiros} primeiros partos. Recoméndase valorar a saída de ${cantidade} animal${cantidade===1?"":"es"} de recría antes desa incorporación.`});
  }

  const infoRecria=new Map((resultado?.recriaActual||[]).map(x=>[String(x.crotal),x]));
  const mapa=new Map();
  const asegurar=(id,nome,virtual=false)=>{
    if(!mapa.has(id)) mapa.set(id,{id,identificacion:nome,virtual,ias:[],partos:[]});
    return mapa.get(id);
  };

  // Só recría real actual: animais que aínda NON pariron.
  // Nunca incluímos vacas de 1ª lactación nin adultas neste selector:
  // esas xa se valoran no módulo de descarte de vacas.
  const idsRecriaReal=new Set();
  for(const x of (resultado?.recriaActual||[])){
    if(Number.isFinite(x.lactacion) || x.eRecria===false) continue;
    const id=String(x.crotal), nome=String(x.identificacion||x.crotal||"");
    idsRecriaReal.add(id);
    Object.assign(asegurar(id,nome,false),x);
  }

  // Engadimos datas probables só ás xovencas reais anteriores e á 1ª xeración virtual.
  // Un PRIMEIRO_PARTO futuro serve para calcular a súa incorporación, pero non converte
  // unha vaca xa parida nunha candidata de recría.
  for(const m of calendarioBase){
    for(const ev of (m.eventos||[])){
      const virtual=Boolean(ev.regulacionId)||String(ev.tipo||"").includes("XERACION_VIRTUAL")||ev.tipo==="PRIMEIRO_PARTO_VIRTUAL";
      const id=virtual?String(ev.regulacionId||`VIRTUAL:${ev.identificacion}`):String(ev.crotal||"");
      if(!id) continue;
      if(!virtual && !idsRecriaReal.has(id)) continue;
      const c=asegurar(id,String(ev.identificacion||id),virtual);
      if(ev.nacementoVirtual instanceof Date)c.dataNacemento=ev.nacementoVirtual;
      if(["IA_PLANIFICADA","REPETICION_IA","IA_XERACION_VIRTUAL","REPETICION_IA_XERACION_VIRTUAL"].includes(ev.tipo))
        c.ias.push({data:new Date(ev.data),peso:Number(ev.peso)||0});
      if(["PRIMEIRO_PARTO","PRIMEIRO_PARTO_VIRTUAL"].includes(ev.tipo))
        c.partos.push({data:new Date(ev.data),peso:Number(ev.peso)||0,mes:m.mes});
    }
  }

  const mesesRec=new Set(recomendacions.map(r=>r.mesParto));
  const candidatas=[...mapa.values()].map(c=>{
    c.ias.sort((a,b)=>a.data-b.data); c.partos.sort((a,b)=>a.data-b.data);
    const iaPrincipal=[...c.ias].sort((a,b)=>b.peso-a.peso)[0]||c.ias[0]||null;
    const partoPrincipal=[...c.partos].sort((a,b)=>b.peso-a.peso)[0]||c.partos[0]||null;
    const partosPico=c.partos.filter(x=>mesesRec.has(x.mes));
    const pesoMesRecomendado=partosPico.reduce((a,b)=>a+b.peso,0);
    const mesesPico=[...new Set(partosPico.map(x=>x.mes))];
    const idadeMeses=c.dataNacemento instanceof Date
      ? Math.max(0,(resultado.dataSituacion-c.dataNacemento)/(MS_DIA*DIAS_MES))
      : null;
    return {...c,iaPrincipal,partoPrincipal,pesoMesRecomendado,mesesPico,idadeMeses};
  }).sort((a,b)=>(b.pesoMesRecomendado-a.pesoMesRecomendado)||String(a.identificacion).localeCompare(String(b.identificacion)));

  if(!seleccionados.size){
    const pico=baseFilas.reduce((m,x)=>Math.max(m,Number(x.leiteFinal)||0),0);
    const descartes=baseFilas.reduce((a,x)=>a+(Number(x.descartes)||0),0);
    const ia=baseFilas.reduce((a,x)=>a+(Number(x.detalleIA?.sexadosXovencas)||0),0);
    return {filas:baseFilas.map(x=>({...x})),calendario:calendarioBase.map(m=>({...m,eventos:(m.eventos||[]).map(e=>({...e}))})),
      recomendacions,candidatas,decisions:[],totalRegulado:0,descartesAdultosEvitados:0,
      comparativa:{picoBase:pico,picoRegulado:pico,descartesBase:descartes,descartesReg:descartes,iaSexadasBase:ia,iaSexadasReg:ia}};
  }

  const decisions=candidatas.filter(c=>seleccionados.has(String(c.id))).map(c=>({id:c.id,identificacion:c.identificacion,virtual:c.virtual,dataSaida}));
  let calendario=calendarioBase.map(m=>({...m,eventos:(m.eventos||[]).map(e=>({...e}))}));
  const campos=["partosConfirmados","partosProbables","partosEstimados","primeirosPartosConfirmados","primeirosPartosProbables","primeirosPartosEstimados","secadosConfirmados","secadosProbables","secadosEstimados","iaObligatoriasXovencas","iaRepeticionsXovencas","candidatasSaidaTerminal"];
  for(const m of calendario){for(const f of campos)m[f]=Math.max(0,Number(m[f])||0);m.saidasRecriaRegulacion=0;}

  function idEvento(ev){return ev.regulacionId?String(ev.regulacionId):String(ev.crotal||"");}
  function restar(m,ev){
    const w=Math.max(0,Number(ev.peso)||0),d=String(ev.detalle||"").toLowerCase();
    if(ev.tipo==="IA_PLANIFICADA")m.iaObligatoriasXovencas=Math.max(0,m.iaObligatoriasXovencas-w);
    if(ev.tipo==="REPETICION_IA"){m.iaObligatoriasXovencas=Math.max(0,m.iaObligatoriasXovencas-w);m.iaRepeticionsXovencas=Math.max(0,m.iaRepeticionsXovencas-w);}
    if(ev.tipo==="PRIMEIRO_PARTO"){if(d.includes("confirmado")){m.partosConfirmados-=w;m.primeirosPartosConfirmados-=w;}else if(d.includes("probable")){m.partosProbables-=w;m.primeirosPartosProbables-=w;}else{m.partosEstimados-=w;m.primeirosPartosEstimados-=w;}}
    if(ev.tipo==="PRIMEIRO_PARTO_VIRTUAL"){m.partosEstimados=Math.max(0,m.partosEstimados-w);m.primeirosPartosEstimados=Math.max(0,m.primeirosPartosEstimados-w);}
    if(ev.tipo==="PARTO_CONFIRMADO")m.partosConfirmados=Math.max(0,m.partosConfirmados-w);
    if(ev.tipo==="PARTO_PROBABLE")m.partosProbables=Math.max(0,m.partosProbables-w);
    if(ev.tipo==="PARTO_ESTIMADO")m.partosEstimados=Math.max(0,m.partosEstimados-w);
    if(ev.tipo==="SECADO_CONFIRMADO")m.secadosConfirmados=Math.max(0,m.secadosConfirmados-w);
    if(ev.tipo==="SECADO_PROBABLE")m.secadosProbables=Math.max(0,m.secadosProbables-w);
    if(ev.tipo==="SECADO_ESTIMADO")m.secadosEstimados=Math.max(0,m.secadosEstimados-w);
  }
  for(const m of calendario){
    m.eventos=(m.eventos||[]).filter(ev=>{
      if(!seleccionados.has(idEvento(ev))||new Date(ev.data)<dataSaida)return true;
      restar(m,ev); return false;
    });
  }
  const k=claveMes(dataSaida);
  let sm=calendario.find(m=>m.mes===k);
  if(!sm){sm={mes:k,etiqueta:etiquetaMes(k),eventos:[],saidasRecriaRegulacion:0};calendario.push(sm);calendario.sort((a,b)=>a.mes.localeCompare(b.mes));}
  sm.saidasRecriaRegulacion=(Number(sm.saidasRecriaRegulacion)||0)+decisions.length;
  for(const d of decisions)sm.eventos.push({data:new Date(dataSaida),tipo:"SAIDA_RECRIA",identificacion:d.identificacion,crotal:d.virtual?"":d.id,regulacionId:d.virtual?d.id:null,peso:1,detalle:"Saída manual aplicada no escenario de regulación"});

  const pipeline={...pipelineBase,calendario};
  const obx=crearObxectivosReprodutivos({presentes:[],inicio:resultado.dataSituacion,fin:resultado.dataObxectivo,reproducion:resultado.reproducion,datosRobot:null,planRebano:resultado.planRebano,pipelineRobot:pipeline,obxectivoLeite:resultado.obxectivoLeite,femiasAdicionaisACriar:resultado.dispoñibilidade?.femiasAdicionaisACriar||0,taxas:resultado.taxas,adultasObxectivo:resultado.adultasObxectivo,idadePrimeiroPartoMeses:resultado.reproducion?.idadePrimeiroPartoEsperadaMeses||24});
  const planRegulado={...resultado.planRebano,filas:(resultado.planRebano?.filas||[]).map(f=>({...f,accionable:false}))};
  const balance=crearBalanceMensual({presentes:[],inicio:resultado.dataSituacion,fin:resultado.dataObxectivo,planRebano:planRegulado,obxectivosReprodutivos:obx,pipelineRobot:pipeline,reproducion:resultado.reproducion,taxas:resultado.taxas,recriaFemiaActual:resultado.recriaFemiaActual,datosRobot:null,obxectivoLeite:resultado.obxectivoLeite,leiteInicial:resultado.vacasLeite,secasInicial:resultado.vacasSecas,marxeVacasLeite:resultado.marxeVacasLeite});
  const filas=balance.filas.map(x=>({...x,regulacionRecria:Number((calendario.find(m=>m.mes===x.mes)||{}).saidasRecriaRegulacion)||0}));
  const pico=xs=>xs.reduce((m,x)=>Math.max(m,Number(x.leiteFinal)||0),0);
  const descartesBase=baseFilas.reduce((a,x)=>a+(Number(x.descartes)||0),0),descartesReg=filas.reduce((a,x)=>a+(Number(x.descartes)||0),0);
  const iaSexadasBase=baseFilas.reduce((a,x)=>a+(Number(x.detalleIA?.sexadosXovencas)||0),0),iaSexadasReg=filas.reduce((a,x)=>a+(Number(x.detalleIA?.sexadosXovencas)||0),0);
  return {filas,calendario,recomendacions,candidatas,decisions,totalRegulado:decisions.length,descartesAdultosEvitados:Math.max(0,descartesBase-descartesReg),comparativa:{picoBase:pico(baseFilas),picoRegulado:pico(filas),descartesBase,descartesReg,iaSexadasBase,iaSexadasReg}};
}

export function crearRankingDescartes(presentes, datosRobot, dataSituacion, cfg={}) {
  if (!(datosRobot instanceof Map)) return [];
  const C={delMinPrimiparas:60,delMinAdultas:30,diasAntesParto:90,desfasePrimiparaPct:25,pesoLeite:40,peso305:20,pesoCelulas:20,pesoTempo:20,...cfg};
  const candidatas=[];
  for(const animal of presentes){
    if(animal.sexo!=="F") continue;
    const r=datosRobot.get(animal.crotal);
    // Para o descarte de vacas tamén manda Nº lactación: se existe, xa pariu.
    if(!r||!Number.isFinite(r.lactacion)||r.producion!=="LACTACION") continue;
    const lact=Math.max(1,Number(r.lactacion)||1), del=Number(r.diasLactacion);
    const minDel=lact===1?C.delMinPrimiparas:C.delMinAdultas;
    if(Number.isFinite(del)&&del<minDel) continue;
    const diasParto=Number.isFinite(r.diasXestacion)?Math.max(0,283-r.diasXestacion):null;
    if(r.estado==="PRENADA"&&Number.isFinite(diasParto)&&diasParto<=C.diasAntesParto) continue;
    candidatas.push({animal,r,grupo:lact===1?"PRIMIPARA":"ADULTA"});
  }
  const media=(arr)=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
  const porGrupo={};
  for(const g of ["PRIMIPARA","ADULTA"]){
    const xs=candidatas.filter(x=>x.grupo===g);
    porGrupo[g]={
      leite:media(xs.map(x=>Number.isFinite(x.r.leiteNormalizado)?x.r.leiteNormalizado:x.r.producion24).filter(Number.isFinite)),
      p305:media(xs.map(x=>x.r.producion305).filter(Number.isFinite)),
      cel:media(xs.map(x=>x.r.celulas).filter(Number.isFinite)),
      tempo:media(xs.map(x=>x.r.tempoCubiculo).filter(Number.isFinite))
    };
  }
  const ratioMalo=(v,m,inverter=false)=>{
    if(!Number.isFinite(v)||!Number.isFinite(m)||m<=0) return 0.5;
    const rel=v/m;
    return Math.max(0,Math.min(1,inverter?rel-0.5:1.5-rel));
  };
  return candidatas.map(({animal,r,grupo})=>{
    const ref=porGrupo[grupo], motivos=[];
    const leite=Number.isFinite(r.leiteNormalizado)?r.leiteNormalizado:r.producion24;
    let score=0;
    score+=ratioMalo(leite,ref.leite,false)*C.pesoLeite;
    score+=ratioMalo(r.producion305,ref.p305,false)*C.peso305;
    score+=ratioMalo(r.celulas,ref.cel,true)*C.pesoCelulas;
    // Máis tempo no robot = peor; menos tempo = mellor.
    score+=ratioMalo(r.tempoCubiculo,ref.tempo,true)*C.pesoTempo;
    const desv=Number.isFinite(leite)&&Number.isFinite(ref.leite)&&ref.leite>0?(leite-ref.leite)/ref.leite*100:null;
    if(Number.isFinite(desv)) motivos.push(`${desv>=0?"+":""}${desv.toFixed(0)} % leite vs media ${grupo==="PRIMIPARA"?"1ª lact.":"2ª+"}`);
    if(Number.isFinite(r.leiteNormalizado)) motivos.push(`${r.leiteNormalizado.toFixed(1)} kg leite norm.`);
    else if(Number.isFinite(r.producion24)) motivos.push(`${r.producion24.toFixed(1)} kg/24h`);
    if(Number.isFinite(r.celulas)) motivos.push(`células ${r.celulas}`);
    if(Number.isFinite(r.tempoCubiculo)){
      const ts=Math.max(0,Math.round(r.tempoCubiculo));
      motivos.push(`tempo robot ${Math.floor(ts/60)}:${String(ts%60).padStart(2,"0")}`);
    }
    if(r.descarte) motivos.push("non inseminar máis");
    const primiparaMoiBaixa=grupo!=="PRIMIPARA" || (Number.isFinite(desv) && desv<=-Math.abs(C.desfasePrimiparaPct));
    if(grupo==="PRIMIPARA"&&!primiparaMoiBaixa) motivos.push(`primípara protexida: non baixa ${C.desfasePrimiparaPct}% da media`);
    if(grupo==="PRIMIPARA"&&primiparaMoiBaixa) motivos.push(`primípara excepcional: ≥${C.desfasePrimiparaPct}% baixo a media`);
    return {crotal:animal.crotal,numeroVaca:r.numeroVaca,score:Math.max(0,score),grupo,lactacion:r.lactacion,diasLactacion:r.diasLactacion,
      producion24:r.producion24,leiteNormalizado:r.leiteNormalizado,graxa:r.graxa,proteina:r.proteina,producion305:r.producion305,
      celulas:r.celulas,tempoCubiculo:r.tempoCubiculo,estado:r.estado,descarte:r.descarte,
      permitirDescarte:r.permitirDescarte!==false&&primiparaMoiBaixa,motivos};
  }).sort((a,b)=>{
    const ap=a.grupo==="PRIMIPARA"?1:0, bp=b.grupo==="PRIMIPARA"?1:0;
    if(ap!==bp) return ap-bp; // adultas sempre primeiro
    return b.score-a.score;
  });
}

export function calcularPlanificacion({animais,dataSituacion,dataObxectivo,vacasLeite,vacasSecas,obxectivoLeite,mortalidadeFemias,mortalidadeXovencas,reposicion,marxeSeguridade,reproducion,descarteConfig={},datosRobot=null}) {
  const finUsuario=dia(dataObxectivo);
  if(!(datosRobot instanceof Map) || datosRobot.size===0) throw new Error("O informe do robot é obrigatorio para calcular a planificación.");
  const inicio=dia(dataSituacion); let fin=dia(dataObxectivo); if(!inicio||!fin||fin<=inicio) throw new Error("A data obxectivo debe ser posterior á data de situación.");
  const leite=Math.max(0,Number(vacasLeite)||0), secas=Math.max(0,Number(vacasSecas)||0), obxectivo=Math.max(0,Number(obxectivoLeite)||0), adultasActuais=leite+secas;
  if(adultasActuais<=0) throw new Error("Indica polo menos unha vaca en leite ou seca.");
  const marxe=Math.max(0,Number(marxeSeguridade)||0);
  const mortFemEfectiva=taxaEfectiva(mortalidadeFemias,marxe), mortXovEfectiva=taxaEfectiva(mortalidadeXovencas,marxe), reposicionEfectiva=taxaEfectiva(reposicion,marxe);
  const supervivenciaTenreira=1-mortFemEfectiva/100, supervivenciaXovenca=1-mortXovEfectiva/100;
  const presentes=animais.filter(a=>animalPresenteNaData(a,inicio));
  if(adultasActuais>presentes.length) throw new Error(`As vacas en leite + secas (${adultasActuais}) non poden superar os ${presentes.length} animais presentes na data de situación.`);
  const recriaFemia=presentes.filter(a=>{
    if(a.sexo!=="F") return false;
    const r=datosRobot?.get?.(a.crotal);
    // Se ten Nº lactación xa pariu: nunca é recría, aínda que pola idade fose nova.
    if(r) return !Number.isFinite(r.lactacion);
    // Se aínda non está no robot, usamos a idade/Libro como respaldo.
    return grupoNaData(a,inicio)!=="VACA";
  });
  const calendario=new Map(); let entradasPrevistas=0;
  for(const animal of recriaFemia){
    const grupo=grupoNaData(animal,inicio); const supervivencia=grupo==="TENREIRO"?supervivenciaTenreira*supervivenciaXovenca:supervivenciaXovenca;
    const robot=datosRobot?.get?.(animal.crotal);
    if(robot?.descarte && robot?.estado!=="PRENADA") continue;
    if(robot?.estado==="PRENADA"){
      const parto=dataPartoPreñada(robot,inicio,reproducion);
      if(parto&&parto>inicio&&parto<=fin){entradasPrevistas+=supervivencia;const k=claveMes(parto);calendario.set(k,(calendario.get(k)||0)+supervivencia);} continue;
    }
    const distribucion=robot?.estado==="INSEMINADA"
      ? distribucionPartosDesdeAgora(inicio,fin,reproducion,supervivencia,reproducion.taxaPrenezXovencas)
      : distribucionPartosAnimal(animal,inicio,fin,reproducion,supervivencia);
    for(const parto of distribucion){ entradasPrevistas+=parto.valor; const k=claveMes(parto.data); calendario.set(k,(calendario.get(k)||0)+parto.valor); }
  }
  const diasHorizonte=(fin-inicio)/MS_DIA, anosHorizonte=diasHorizonte/DIAS_ANO;
  const proporcionSecasActual=adultasActuais?secas/adultasActuais:0;
  const prVacasObx=Math.max(0.0001,clampTaxa(reproducion.taxaPrenezVacas)/100);
  const esperaVacas=(1/prVacasObx-1)*Math.max(1,reproducion.duracionCicloDias);
  const intervaloPartosObx=Math.max(1,Math.max(0,reproducion.diasLeitePrimeiraInseminacionVacas)+esperaVacas+Math.max(1,reproducion.duracionXestacionDias));
  const proporcionSecas=Math.min(0.5,Math.max(0,reproducion.duracionSecadoDias)/intervaloPartosObx);
  const adultasObxectivo=proporcionSecas<0.95?obxectivo/(1-proporcionSecas):obxectivo;
  const crecementoNecesario=Math.max(0,adultasObxectivo-adultasActuais), mediaAdultas=(adultasActuais+adultasObxectivo)/2;
  const reposicionNecesaria=mediaAdultas*(reposicionEfectiva/100)*anosHorizonte, entradasNecesarias=crecementoNecesario+reposicionNecesaria;
  const deficit=Math.max(0,entradasNecesarias-entradasPrevistas), excedente=Math.max(0,entradasPrevistas-entradasNecesarias), cobertura=entradasNecesarias>0?entradasPrevistas/entradasNecesarias*100:100;
  const supervivenciaNacementoParto=supervivenciaTenreira*supervivenciaXovenca;
  const femiasAdicionaisACriar=supervivenciaNacementoParto>0?deficit/supervivenciaNacementoParto:null;
  const pr=Math.max(.0001,clampTaxa(reproducion.taxaPrenezXovencas)/100), intentosMedios=1/pr, esperaMediaDias=Math.max(0,intentosMedios-1)*Math.max(1,reproducion.duracionCicloDias);
  const idadePrimeiroPartoMeses=(reproducion.idadePrimeiraInseminacionMeses*DIAS_MES+esperaMediaDias+reproducion.duracionXestacionDias)/DIAS_MES;


  // Horizonte solicitado na Configuración: 12 / 24 / 36 meses.
  const horizonteMeses=Math.max(1,Number(reproducion.horizontePlanMeses)||24);
  const limiteConfig=sumarMeses(inicio,horizonteMeses);
  if(limiteConfig<fin) fin=new Date(limiteConfig);

  // Mantemos todo o horizonte solicitado/configurado. As fillas futuras só se contabilizan
  // como recría virtual; nunca se lles crea calendario reprodutivo, polo que non hai 2ª xeración inventada.
  const finSolicitado=finUsuario||fin;
  const calendarioOrdenado=[...calendario.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([mes,entradas])=>({mes,etiqueta:etiquetaMes(mes),entradas}));
  const pipelineRobot=crearPipelineRobot(presentes,inicio,fin,reproducion,datosRobot);
  const planRebano=crearPlanMensual({inicio,fin,adultasActuais,adultasObxectivo,obxectivoLeite:obxectivo,leiteInicial:leite,secasInicial:secas,reposicionEfectiva,marxe,reproducion,calendarioRecria:calendarioOrdenado,pipelineRobot});
  const rankingDescartes=crearRankingDescartes(presentes,datosRobot,inicio,descarteConfig);
  const proxeccionConfirmada=crearProxeccionConfirmada({presentes,inicio,fin,leiteInicial:leite,adultasActuais,obxectivoLeite:obxectivo,reposicionEfectiva,marxeVacasLeite:reproducion.marxeVacasLeite,reproducion,datosRobot,rankingDescartes});
  const taxasPlan={mortalidadeFemiasUsada:mortFemEfectiva,mortalidadeXovencasUsada:mortXovEfectiva,reposicionUsada:reposicionEfectiva};
  const obxectivosBase=crearObxectivosReprodutivos({presentes,inicio,fin,reproducion,datosRobot,planRebano,pipelineRobot,obxectivoLeite:obxectivo,femiasAdicionaisACriar,taxas:taxasPlan,adultasObxectivo,idadePrimeiroPartoMeses});
  const pipelineRobotConXeracion=engadirXeracionVirtual({pipelineRobot,obxectivosReprodutivos:obxectivosBase,inicio,fin,reproducion,taxas:taxasPlan});
  const obxectivosReprodutivos=crearObxectivosReprodutivos({presentes,inicio,fin,reproducion,datosRobot,planRebano,pipelineRobot:pipelineRobotConXeracion,obxectivoLeite:obxectivo,femiasAdicionaisACriar,taxas:taxasPlan,adultasObxectivo,idadePrimeiroPartoMeses});
  planRebano.adultasObxectivo=adultasObxectivo;
  const balanceMensual=crearBalanceMensual({presentes,inicio,fin,planRebano,obxectivosReprodutivos,pipelineRobot:pipelineRobotConXeracion,reproducion:{...reproducion,idadePrimeiroPartoEsperadaMeses:idadePrimeiroPartoMeses},taxas:taxasPlan,recriaFemiaActual:recriaFemia.length,datosRobot,obxectivoLeite:obxectivo,leiteInicial:leite,secasInicial:secas,marxeVacasLeite:reproducion.marxeVacasLeite});
  const recriaActual=recriaFemia.map(a=>{const r=datosRobot?.get?.(a.crotal);return {
    crotal:a.crotal,
    identificacion:String(r?.numeroVaca||a.crotal||""),
    dataNacemento:a.dataNacemento,
    estado:r?.estado||"FORA_ROBOT",
    lactacion:Number.isFinite(r?.lactacion)?r.lactacion:null,
    diasXestacion:Number.isFinite(r?.diasXestacion)?r.diasXestacion:null,
    dataPartoEsperada:r?.dataPartoEsperada instanceof Date?r.dataPartoEsperada:null,
    producion:r?.producion||null,
    eRecria:!Number.isFinite(r?.lactacion)
  };});
  return {dataSituacion:inicio,dataObxectivo:fin,adultasActuais,totalAnimaisPresentes:presentes.length,vacasLeite:leite,vacasSecas:secas,proporcionSecas,obxectivoLeite:obxectivo,adultasObxectivo,recriaFemiaActual:recriaFemia.length,recriaActual,anosHorizonte,
    taxas:{mortalidadeFemiasBase:clampTaxa(mortalidadeFemias),mortalidadeFemiasUsada:mortFemEfectiva,mortalidadeXovencasBase:clampTaxa(mortalidadeXovencas),mortalidadeXovencasUsada:mortXovEfectiva,reposicionBase:clampTaxa(reposicion),reposicionUsada:reposicionEfectiva,marxe},
    reproducion:{...reproducion,idadePrimeiroPartoEsperadaMeses:idadePrimeiroPartoMeses}, necesidade:{reposicion:reposicionNecesaria,crecemento:crecementoNecesario,entradasTotais:entradasNecesarias}, dispoñibilidade:{entradasPrevistas,cobertura,deficit,excedente,femiasAdicionaisACriar}, calendario:calendarioOrdenado, pipelineRobot:pipelineRobotConXeracion, planRebano, proxeccionConfirmada, obxectivosReprodutivos, balanceMensual, rankingDescartes,
    horizonte:{finSolicitado,finCalculado:fin,limitado:fin<finSolicitado,motivoLimite:fin<finSolicitado?`Horizonte configurado: ${horizonteMeses} meses`:null,xeracionVirtual:true},
    duracionLactacionDescarteDias:Number(reproducion.duracionLactacionDescarteDias)||420, marxeVacasLeite:Math.max(0,Number(reproducion.marxeVacasLeite)||0), modoAutomatico:Boolean(datosRobot), animaisRobot:datosRobot?.size||0};
}
