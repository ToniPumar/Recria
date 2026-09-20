# Recría · v0.6.4

Modo automático do planificador activado.

- Carga CSV/XLSX do robot cunha data de informe igual á Data situación.
- Enlace polo 9 últimos díxitos do Nº de vida co Libro de explotación.
- Todo animal do robot debe existir no Libro; animais novos do Libro poden non aparecer no robot.
- Vacas en lactación e secas cóntanse automaticamente.
- Xovencas preñadas usan os días reais de xestación para estimar a súa entrada; o resto segue co modelo probabilístico.
- Impórtanse e consérvanse lactación, DEL, ordeños, células, graxa, proteína, tempo no cubículo, produción 24 h e 305 días para o futuro módulo de puntuación/descarte.
- A necesidade chámase “novas vacas necesarias”, non “femias a primeiro parto”.


## Formato do informe automático do robot (v0.6.1)

A data do informe debe coincidir exactamente coa Data situación do planificador. O programa recoñece estas cabeceiras do Excel: Número de vaca; Número de vida; Nº lactación.; Días lactación; Estado de reproducción; Media de ordeños; Indicación de células; Tiempo en cubículo; Media grasa %; Días de gestación; Días hasta secado; Fecha de parto esperada; Producción; Media proteina %; Producción prevista (305 días); Media de producción ultimas 24h.

Obrigatorias nesta versión: Número de vaca, Número de vida, Nº lactación., Días lactación, Estado de reproducción, Días de gestación, Días hasta secado, Producción, Producción prevista (305 días) e Media de producción ultimas 24h.

O enlace co Libro faise cos 9 últimos díxitos do Número de vida. Todos os animais do informe do robot deben existir no Libro, pero animais do Libro poden non aparecer no robot (por exemplo, tenreiras moi novas).


## v0.6.3
- O enlace Robot → Libro é obrigatorio; Libro → Robot non o é.
- Se un Nº de vida existe no Libro pero non está presente na data do informe, o erro indica a causa (baixa ou nacemento posterior) e a data correspondente.
- Os erros de enlace mostran Nº de vida, Nº de vaca e os 9 díxitos usados na comparación.
- Normalízanse tamén estados reprodutivos en inglés como `pregnant`, `inseminated`, `never inseminated` e a variante `never insaminated`.


## Cambios v0.6.3
- O modo automático só se activa tras validar completamente o informe do robot.
- En automático, vacas en leite e secas calcúlanse desde `Producción` e quedan bloqueadas.
- Os erros de carga non bloquean o panel e permiten volver seleccionar o mesmo ficheiro.
- Un ficheiro incorrecto non substitúe o último informe válido.
- Cambiar a Data situación invalida o informe automático anterior.
- Resumo de importación: enlazados, leite, secas e ganado joven.
- A Axuda explica o fluxo manual/automático e as incidencias.


## v0.7.1
- Baseada de novo na v0.6.4 para preservar exactamente a análise histórica.
- O enlace Robot → Libro usa 9 últimos díxitos e agrupa só para o enlace as filas do mesmo crotal completo; non modifica o histórico.
- A vista Rebaño mostra Nº robot, Producción e Estado reprodutivo cando o informe corresponde á data seleccionada.
- Permite marcar Sexado nas preñadas/inseminadas: 90 % femia fronte a 50 % convencional.
- As preñadas forman o bloque «O que xa tes»; as inseminadas pendentes ponderanse coa taxa de preñez.
- O plan mensual separa partos xa comprometidos de partos/preñeces por conseguir e marca como «Xa condicionado» o que xa non se pode corrixir cunha nova preñez.

## Cambios v0.9.9
- Nova táboa compacta “O que xa tes”: mes, partos confirmados, secados, descartes por reposición, vacas en leite resultantes, femias/machos esperados e estado fronte ao obxectivo.
- Os descartes úsanse só cando hai excedente por riba do obxectivo + marxe de seguridade e van consumindo a reposición acumulada.
- Nova táboa “O que debes facer” para meses non cubertos polos datos confirmados.
- As xovencas pasan a ser candidatas ao alcanzar a idade de primeira inseminación; as vacas, ao alcanzar os DEL configurados.
- O plan estima cantas xovencas e cantas vacas deben entrar no programa reprodutivo segundo as taxas de preñez e indica se é viable.
- As inseminadas pendentes ponderanse pola taxa de preñez e descóntanse dos primeiros obxectivos futuros.
- Sexado: 90 % femia; convencional: 50 % femia.
- A análise histórica non foi modificada.


## Novidades 0.8.1
- Carga do Libro e do robot por ficheiro local ou URL pública, con resolución de enlaces habituais de Dropbox/Google Drive e historial local das 10 últimas URLs.
- Marxe absoluta de vacas en leite (2 por defecto) separada da marxe porcentual/puntos aplicada á recría e taxas.
- Descartes por excedente: ao superar obxectivo + marxe, propón volver ao obxectivo e compara o acumulado coa reposición histórica.
- Horizonte rápido de 12/18/24/36 meses.
- Referencia histórica seleccionable: ano, media simple, media ponderada ou período completo.
- Columna opcional Sexado no informe do robot; S/N e variantes recoñécense automaticamente.
- Sistema explicable de puntuación de candidatas a descarte con datos do robot.
- Táboa de accións máis directa: preñeces a conseguir e animais que deben entrar no programa reprodutivo cada mes.


## v0.9.9
- Cargas local/URL reordenadas para non solaparse.
- Descartes estables: comproba os meses confirmados seguintes antes de retirar excedentes.
- As vacas suxeridas para descarte aparecen no propio mes do plan e non se reutilizan despois.
- Obxectivos futuros simplificados a preñeces/femias necesarias segundo idade, DEL, ciclo e taxas.
- Horizonte afastado marcado como orientativo/limitado, sen tratar déficits remotos como feitos certos.


## v0.9.9
- Carga do robot por ficheiro/URL colocada en bloques separados.
- Proxección confirmada por animal: ao descartar unha vaca elimínanse tamén os seus eventos futuros.
- O descarte só se acepta se o mes seguinte confirmado segue no obxectivo.
- Candidatas de descarte revisables con checkbox e botón de recálculo.
- Leite FPCM normalizado a 4,0 % graxa e 3,3 % proteína; úsase no ranking cando hai sólidos.
- Columna opcional Descarte S/N no robot e checkbox manual “Non inseminar máis” en Rebaño.
- Rebaño mostra produción 24h, sólidos, leite normalizado e puntuación de descarte.


## v0.9.9
- Configuración completa do ranking de descarte.
- Primíparas e vacas 2+ teñen DEL mínimo independente.
- Exclusión configurable antes do secado e antes do parto.
- Medias produtivas separadas: 1ª lactación e 2ª+.
- Pesos configurables: leite normalizado, 305 d, células e tempo no robot (100 %).
- Penalización configurable por desviación forte baixo a media do grupo.
- “Non inseminar máis” segue sendo puntuable; só sae do programa reprodutivo.


## v0.9.9
- Proxección confirmada por quincenas (1–15 / 16–fin).
- Descartes validados contra unha xanela futura de 45 días.
- Inicio e final de vacas en leite visibles en cada quincena.
- Obxectivos reprodutivos tamén por quincenas.
- Resumo “IA/seme a poñer este mes” para partos aprox. 283 días despois.
- Eliminados limiar e bonus de desviación forte; a distancia á media entra de forma continua no peso de produción.
- Medias de produción seguen separadas entre primíparas e 2ª+ lactación.


## v0.9.9
- Mantense a evolución do rabaño e descartes por quincenas.
- Os obxectivos reprodutivos volven a ser mensuais.
- Lista real de candidatas a inseminar por mes.
- Sexado preferente en xovencas.
- As mellores vacas só reciben recomendación de sexado cando fan falta máis femias de recría.
- Configuración: só xovencas / xovencas + mellores vacas se fan falta / todo candidato apto.
- Resumo mensual de seme: xovencas sexado, vacas sexado e vacas convencional.


## v0.9.9
- Táboa de vacas en leite reorganizada como fluxo: Inicio → +Partos → −Secados → Antes descarte → −Descartes → Final.
- Obxectivo, marxe, zona desexada e protección de 45 días visibles sobre a táboa.
- Separadores visuais por mes, cabeceira fixa e estados simplificados.
- Eliminada da táboa principal a información de femias esperadas, que pertence á reprodución/recría.
- Obxectivos reprodutivos: separadas preñeces necesarias, preñeces esperadas das inseminadas actuais, falta esperada e animais reais a inseminar.
- Axuda reescrita e ampliada con explicación paso a paso de cabeceiras, fórmulas, descartes, ranking, reprodución, sexado, histórico, horizonte, ficheiros e configuración.


## v0.9.9
- Tiempo en cubículo interpretado como min:seg e convertido a segundos para a puntuación.
- Eliminado o filtro redundante de días ata secado; protección por parto a 90 días.
- Adultas priorizadas sempre nos descartes. Primíparas só se suxiren se están ≥25 % baixo a media do seu grupo (configurable).
- Pesos de puntuación aclarados como porcentaxes de importancia que suman 100.
- Eliminada da interface a lista de candidatas concretas a inseminar; o plan céntrase en cantos sexados e convencionais fan falta.
- Axuda actualizada coas fórmulas e novas regras.


## v0.9.9
- Plan reprodutivo mensual separado en confirmado → probable → por facer.
- Preñadas confirmadas conservan os seus partos e secados futuros reais aínda que estean a varios meses.
- Inseminadas sen confirmar ponderadas pola taxa de preñez; os seus partos/secados son probabilísticos.
- Preñeces novas = necesidade de partos menos confirmados menos probables.
- Recomendación simple de X sexados + Y convencionais, sen animais concretos.
- Sexado limitado á recría realmente necesaria e corrixido pola mortalidade de tenreiras/xovencas.


## v0.9.9
- Obxectivos reprodutivos simplificados: Mes, partos, xa cuberto, falta, IA recomendadas e cabaña mínima.
- A acción principal pasa a ser número de inseminacións: X sexados + Y convencionais.
- Cabaña mínima = leite + secas + recría estrutural mínima.
- A recría mínima depende da reposición seleccionada, supervivencia e idade esperada ao primeiro parto; recalcula ao cambiar a referencia histórica.
- Todos os parámetros válidos de Configuración gárdanse automaticamente en localStorage.
- Detalles confirmados/probables/secados/mortalidade quedan nun despregable.


## v0.9.9
- Novos valores predeterminados segundo a configuración acordada.
- Corrixida a validación: sexadoPreferencia xa non se intenta validar como número.
- Corrixida a normalización de localStorage para conservar campos de texto.
- Gardado automático activado realmente ao inicializar Configuración.
- Despois de gardar, reléese localStorage e úsase a configuración normalizada como fonte de verdade antes de recalcular.


## v0.9.9
- Nova táboa principal mensual única de equilibrio da cabaña.
- Integra leite, secas, partos, secados, saídas de vacas, recría, IA e cabaña total.
- Recría prevista corrixida por supervivencia e entradas a primeiro parto.
- Recría mínima recalculada coa taxa de reposición, mortalidade e idade esperada ao primeiro parto.
- Saldo de recría e posibles saídas; só se propoñen se o excedente permanece durante ~12 meses.
- Os antigos detalles quincenais/reprodutivos quedan en despregables secundarios.


## v0.9.9
- Planificador reducido a unha única táboa mensual.
- Engade cabaña estimada mensual (leite + secas + recría).
- Novos DEL medios de saída definitiva para lactacións 1, 2, 3 e 4+.
- Co robot, lactación e DEL actuais úsanse para anticipar saídas futuras; sen robot mantense o cálculo estatístico.
- A mesma fila mostra femias que faltan, IA sexadas e IA restantes.
- Cambiar persistencia/DEL, reposición ou mortalidade recalcula cabaña, recría e necesidades futuras.


## v0.9.9
- Corrixido o gardado/carga dos catro DEL medios: faltaban na normalización da configuración e por iso quedaban en branco.
- Valor inicial dos DEL: 371 días como referencia neutra de duración media de lactación Frisona; editable e persistente.
- Límite xeracional: a previsión remata cando a femia máis nova existente hoxe podería chegar ao primeiro parto.
- Non se proxectan fillas das futuras fillas: o modelo non inventa unha segunda xeración.


## v0.9.9
- Corrixido `sumarMeses is not defined`.
- Eliminado o uso incorrecto dos DEL para predicir a saída definitiva dunha vaca.
- Os DEL/días ata IA quedan ligados á reprodución e ao estado de lactación.
- Engadido cálculo histórico de idade á saída usando baixas reais do Libro, excluíndo motivos identificados como morte.
- Campos de saída pasan a 0=automático por defecto.
- Mantense o límite xeracional: non se crean descendentes de animais futuros.


## v0.9.9
- Corrixido `Assignment to constant variable`: o horizonte `fin` agora é mutable antes de aplicar o límite xeracional.
- Eliminados os catro campos artificiais de idade/DEL de saída por lactación.
- Nova idade media de saída calculada directamente do Libro: data baixa - data nacemento.
- Exclúense mortes cando o motivo de baixa está dispoñible.
- Un único campo editable permite sobrescribir a media para simulacións; 0 = usar Libro.
- Non se inventa a lactación histórica dunha vaca dada de baixa se o Libro non a proporciona.


## v0.9.9
- Táboa mensual parte exactamente do estado do robot/Data situación; non reconstrúe agosto cunha proporción teórica.
- Leite, secas, partos, secados, saídas, IA e cabaña móstranse sen decimais.
- Fluxo mensual encadeado: o final dun mes é o inicio do seguinte.
- Secados moven leite→secas; partos de vacas secas moven secas→leite; primeiros partos engaden novas vacas.
- Saídas voluntarias só se aplican cando existe excedente de leite, aínda que haxa reposición acumulada pendente.
- Configuración limpa: un único campo “Idade media de saída” en días; 0 = usar media calculada do Libro.
- Corrixida a persistencia do novo campo no esquema de configuración.


## v0.9.9
- Táboa mensual única reorganizada como fluxo: Leite inicio → Partos → Secados → Descartes → Leite final.
- Engadida columna Secas final para comprobar o equilibrio leite/seco cada mes.
- “Femias a producir” deixa claro que é necesidade futura, non déficit de recría presente.
- IA sexado e IA resto móstranse na mesma fila do mes no que hai que actuar.
- Só femias entran no cálculo de recría; machos excluídos.
- Descartes só se executan se despois dos movementos mensuais queda leite por riba do obxectivo.


## v0.9.9
- Engadida columna opcional D. Entrada ao lector do Libro.
- Duración media: só femias, Baixa=Saída, idade á baixa ≥24 meses; media de D. Entrada a D. Baixa.
- Mortes e Saídas <24 meses quedan excluídas.
- Descartes con previsión: antes de sacar unha vaca, compróbanse tamén os 3 meses seguintes.
- Se os secados futuros provocarían déficit, o programa preserva as vacas excedentarias do mes actual.


## v0.9.9
- Corrixido `saidasAdultas is not defined`.
- Horizonte configurável de 12, 24 ou 36 meses; segue limitado pola femia máis nova existente para non inventar segunda xeración.
- Primeira columna “Detalle” na táboa mensual co razoamento completo das IA.
- O detalle mostra preñadas confirmadas, IA pendentes, preñeces esperadas, femias esperadas, mortalidade e taxas usadas.
- Sexado recoméndase só en xovencas e calcúlase como o mínimo necesario para producir a recría futura.
- Pode explicar explicitamente “0 sexados” cando as IA normais/pipeline xa cobren estatisticamente as femias necesarias.


## v0.10.18 · motor baseado no calendario do robot
- O planificador xa non calcula sen un informe do robot válido para a Data situación.
- `Sexado` e `Descarte` son columnas obrigatorias do informe.
- `Sexado`: S/Si = sexado, N/No = normal, C = carne.
- `Descarte`: S/Si ou N/No.
- Eliminada a idade/duración media histórica de saída. Nova configuración: duración media da lactación dunha vaca marcada Descarte=S.
- Calendario interno: preñadas = feitos; inseminadas = probabilidade de preñez × tipo de seme; animais sen IA = data futura segundo idade/DEL.
- Xovencas sen IA: sexado por defecto. Vacas sen IA: carne por defecto; o optimizador pode recomendar sexado en vacas se as xovencas non cobren a reposición.
- C/carne non xera recría leiteira no modelo, aínda que o parto si conta no fluxo da vaca.
- O obxectivo é manter o lote de ordeño e minimizar a recría: primeiro cubrir a reposición mínima e despois priorizar carne.
- Vacas Descarte=S pasan a candidatas ao chegar aos DEL configurados, pero consérvanse se fan falta para evitar déficit nos meses seguintes.
- A táboa mensual separa IA sexadas en xovencas, sexadas en vacas e IA de carne, con detalle do razoamento.


## v0.10.18
- Histórico por D. Baixa: a morte conta no ano da morte e a categoría usa a idade exacta ese día.
- Raza pasa a ser columna obrigatoria do Libro; distingue Frisona e Conxunto Mestizo (carne).
- Tenreiros: desglose de mortalidade/perdas por raza e sexo. Despois do límite de tenreiro, mortalidade/recría só de femias Frisona.
- Saída non é mortalidade; só Saída de femia Frisona adulta entra na reposición.
- Límites de idade (días de tenreiro e meses de vaca adulta) configurables e persistentes.
- Valores de perda configurables: Frisona F/M e Carne F/M.
- Robot: Sexado/Descarte seguen sendo columnas obrigatorias, pero baleiro= N; Sexado só se valida en preñadas/inseminadas e non distingue maiúsculas/minúsculas.
- URLs de Google Sheets /edit convértense automaticamente a export XLSX; Drive /file/d/ a descarga directa.
- Gardar configuración relé localStorage e recalcula co valor realmente gardado.


## v0.10.18
- Novo calendario reprodutivo baseado nos animais existentes.
- Xovencas: IA obrigatoria ao chegar á idade configurada; se non preñan, repítense ciclos segundo a taxa de preñez.
- Tras o primeiro parto, a mesma xovenca pasa a vaca e entra no ciclo DEL → IA → preñez → secado → parto.
- Vacas non descarte: IA obrigatoria ao chegar aos DEL configurados e repeticións probabilísticas.
- Preñadas e inseminadas actuais conservan o tipo de seme real do robot.
- As IA futuras xa non dependen da necesidade de recría: o calendario decide cantas IA hai; o optimizador decide sexado vs carne.
- Sexado primeiro en xovencas, despois vacas só se fai falta; o resto vai a carne para reducir custo de oportunidade.
- A táboa engade IA totais e o detalle explica idade/DEL, repeticións e asignación de seme.
- Non se simula a reprodución das futuras fillas; só dos animais que existen actualmente.


## v0.10.18
- Novo parámetro persistente: Lactacións medias por vaca (admite decimais).
- O calendario deixa de iniciar novas IA cando a vaca alcanza o límite medio de lactacións.
- Exemplo media=3: vaca en 3ª lactación sen inseminar -> non nova IA; mantense ata o DEL terminal e pasa a candidata de descarte.
- Se unha vaca xa está inseminada ou preñada por riba do límite, esa preñez respéctase completamente; o corte aplícase despois do seguinte parto.
- Medias decimais: 3,2 interpreta unha continuidade estatística do 20 % desde 3ª cara 4ª lactación.
- As candidatas terminais intégranse no motor de descartes e só se sacan se o lote de leite segue por riba do obxectivo tamén nos meses seguintes.
- Xovencas e vacas continúan xerando IA por idade/DEL e repeticións por ciclo/taxa de preñez.
- Axuda actualizada co corte de lactacións, casos xa inseminados/preñados e descartes.


## v0.10.18
- Rebaño: Seme queda baleiro se o animal non está PRENADA/INSEMINADA.
- Planificación: calendario mensual navegable con eventos diarios e identificación animal.
- Impresión/PDF do informe desde o navegador e exportación compatible con Excel.
- Xovencas existentes: todas as IA futuras recomendadas con sexado por criterio xenético.
- Vacas: carne por defecto cando a recría está cuberta; sexado só se fan falta máis femias.
- Regulación activa do lote cara obxectivo + marxe: se hai exceso persistente, recomenda descartes sen esperar necesariamente ao DEL terminal, protexendo o obxectivo nos meses seguintes.
- As femias futuras súmanse como recría virtual, pero nunca xeran calendario reprodutivo nin descendencia.

## v0.10.18
- Corrixido erro de execución `femiaMaisNova is not defined` introducido ao retirar o antigo límite xeracional.
- Revisado que non quede ningunha referencia ao identificador eliminado e comprobada sintaxe de todos os módulos JS.


## v0.10.18
- Novo DEL independente para primeira IA de primíparas; vacas de 2ª+ conservan o DEL adulto.
- O calendario reprodutivo aplica o DEL segundo o número de lactación e os eventos diarios indican o motivo/limiar.
- Axuda reestruturada: cabeceiras dos dous ficheiros, análise histórica, calendario, configuración, descartes, PDF e Excel.
- Informe PDF limpo nunha xanela independente, A4 horizontal: período, histórico global/ponderado/anual, parámetros e planificación mensual.
- Exportación Excel agora crea un .xlsx real con follas Planificación e Parámetros.

## v0.10.18
- Escenario opcional Regular recría sobre o calendario base.
- Comparativa base/regulado e avisos no calendario.
- Unha única xeración virtual de fillas futuras.
- PDF sen popup, mediante iframe interno.

## v0.10.18
- Corrixido erro de runtime: a interface importa agora crearEscenarioRegulacionRecria desde planificacion.js.

## v0.10.18
- Regulación de recría manual sobre o calendario base intacto.
- O algoritmo recomenda cantidade; o usuario selecciona animais concretos.
- Saída temperá por defecto, cun mes elixible, ou venda preñada aos 7 meses.
- Recalcula o escenario ao marcar/desmarcar xovencas.
- PDF inclúe comparativa e decisións aplicadas, sen popup.
- A recría femia do Libro que aínda non está no robot entra no calendario por idade; adultas sen robot non se inventan.

## v0.10.18
- Corrixido o botón Regular recría: agora amosa o panel de selección manual.
- Saída temperá por defecto ou venda preñada aos 7 meses; selección individual e recálculo visual.
- Activada unha 1ª xeración virtual real: as fillas dos animais actuais poden chegar á IA e ao primeiro parto, pero non xeran unha segunda xeración.
- Corrixido o aviso de horizonte: xa non fala dun falso límite xeracional; só informa do horizonte configurado cando este recorta a data solicitada.
- O escenario regulado usa o calendario modificado para non reintroducir incorporacións retiradas mediante o plan agregado base.

## v0.10.18
- Regulación por un único mes de saída; elimínanse os modos temperá/preñada.
- Lista manual de toda a recría con estado, IA probable e parto probable.
- Recría real sen número de robot identificada polo crotal ES.
- Primeira xeración virtual identificada como Filla de X e seleccionable no escenario.
- Recalculo desde o mes de saída mantendo intacto todo o anterior e o plan base.

## v0.10.18
- A lista de regulación mostra idade actual en meses.
- Estado reprodutivo claro: sen inseminar, inseminada, preñada ou futura virtual.
- Preñadas: días de xestación e parto probable.
- Inseminadas: parto probable.
- Sen inseminar: IA probable e parto probable.
- As candidatas ligadas directamente aos picos de primeiros partos quedan destacadas e indican a que pico afectan.

## v0.10.18
- Corrixido un erro de execución no panel de Regular recría.
- A etiqueta dos meses dos picos agora se formatea dentro da interface sen depender dunha función privada de planificacion.js.
- Este erro impedía renderizar a lista de recría cando había candidatas que afectaban a un pico recomendado.

## v0.10.18
- O selector de Regular recría filtra estritamente a recría: só xovencas que aínda non pariron e a 1ª xeración virtual.
- Xa non aparecen vacas de 1ª lactación nin adultas.
- Mantéñense meses de idade, estado reprodutivo, IA probable, días de xestación e parto probable.
- O descarte de vacas segue sendo unha valoración independente do descarte de recría.

## v0.10.18
- Corrixida a regra de recría: o Nº de lactación do robot manda sobre a idade.
- Calquera animal con Nº lactación 1, 2, 3… xa pariu e queda fóra do selector de recría.
- Os animais co Nº lactación baleiro son xovencas; se non están no robot úsase Libro/idade como respaldo.
- O ranking de descarte de vacas tamén recoñece como parida calquera femia con Nº lactación.
- O selector mostra meses de idade e o estado reprodutivo actual (sen inseminar / inseminada / preñada), xunto coa IA e/ou parto probable.

## v0.10.18
- Corrixida a presentación da lista de recría: o estado reprodutivo quedaba fóra da zona visible pola grella demasiado ancha.
- ESTADO ACTUAL queda agora sempre visible xunto aos meses de idade.
- IA probable e parto probable colócanse nun bloque compacto sen desprazamento horizontal.
- A cor amarela significa unicamente que a xovenca afecta a un pico de primeiros partos recomendado; branco significa que non afecta directamente a eses picos.

## v0.10.18
- IA probable e PARTO PROBABLE quedan sempre dentro da ficha visible de cada xovenca.
- Corrixida a referencia histórica anual/global de reposición: agora usa exactamente `vacas.reposicion.taxa`, igual ca no resumo histórico.
- Ao cambiar Media ponderada / Media simple / Período completo / ano concreto actualízanse os campos usados pola planificación e dispárase a mesma actualización ca nun cambio manual.

## v0.10.18
- Fichas de recría compactas: sempre visibles identificación, idade e parto probable.
- Ao pasar o rato por calquera ficha aparece un tooltip con idade, nacemento, estado actual, detalle reprodutivo, IA probable, parto probable e pico afectado.
- Mantense o destacado amarelo para animais ligados aos picos.
- Corrixida definitivamente a referencia histórica: media ponderada, media simple, período completo e anos concretos len a mesma propiedade `.taxa` que o resumo histórico, incluída a reposición.


## v0.10.19 · reorganización visual da regulación
- Xerarquía nova: cabeceira → impacto da regulación → picos/decisión → selector de recría → decisións → fluxo mensual.
- Selector de recría convertido nunha táboa compacta, con estado, IA, parto e impacto visibles; tooltip conserva o detalle completo.
- Resumo comparativo convertido en KPIs.
- A saída no mes da Data situación nunca se aplica antes da propia Data situación.
- Texto das IA sexadas en xovencas corrixido: son por criterio de mellora xenética; o sexado en vacas cobre a necesidade restante de recría.


## v0.10.20 · tooltip só por hover
- Base exacta v0.10.19.
- A táboa de recría queda sen cambios.
- O tooltip permanece oculto por defecto e só aparece mentres o punteiro está sobre a fila.
- O foco do checkbox xa non mantén o tooltip aberto.

## v0.10.21 — produción local + servidor

A compilación usa rutas relativas e un bundle JS clásico para que a carpeta `dist` poida empregarse de dúas formas:

- dobre clic en `dist/index.html` (`file://`),
- servidor HTTP (`npm run preview`, Nginx, Caddy, etc.).

Para xerar produción:

    npm install
    npm run build

A saída final queda en `dist/`.
