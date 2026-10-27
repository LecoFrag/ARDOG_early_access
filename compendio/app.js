import { modificador, bonusAtaque, classeArmadura, danoAcao, sinal, expressaoDano, chanceAcerto, danoEsperado, validarSugestoes } from './regras.js';
import { integrarHildred, acaoDeHildred } from './hildred.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numero = (n, casas = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits:casas, minimumFractionDigits:casas });
const chave = 'juramento-compendio-sugestoes-v1';
let dados, combate, sugestoes = [], secao = '', atual, storageOk = true, toastTimer;
const secoes = [['herois','Heróis'],['monstros','Bestiário'],['equipamentos','Equipamentos'],['habilidades','Habilidades'],['combate','Regras de combate'],['regras','Primeiro combate'],['arte','Nova arte de Rheagon'],['aventura','Aventura']];
const idsValidos = () => [...dados.combatentes, ...dados.equipamentos, ...dados.habilidades].map(x => x.id).concat('regras','combate','arte-rheagon','aventura');
const todasFichas = () => [...dados.combatentes, ...dados.equipamentos, ...dados.habilidades];
const nomeFicha = id => todasFichas().find(x => x.id === id)?.nome ?? ({regras:'Primeiro combate',combate:'Regras de combate','arte-rheagon':'Nova arte de Rheagon',aventura:'Aventura'}[id] ?? id);
const ORIGENS = {dnd:'D&D 2024',adaptacao:'Adaptação',local:'Local'};
const ALCANCES = {'corpo-a-corpo':'Corpo a corpo',haste:'Haste · qualquer linha',distancia:'Distância · qualquer linha'};
const MAESTRIAS = {enfraquecer:'Sap',importunar:'Vex',derrubar:'Topple'};
// Traits, defences and XP of a creature or hero (combat v1, COMBATE-V1.md).
function blocoCombate(f) {
  const defesas = f.defesas ? [['vul','Vulnerável',f.defesas.vulneravel],['res','Resiste',f.defesas.resistente],['imm','Imune',f.defesas.imune]].flatMap(([c,r,l])=>(l??[]).map(t=>`<span class="def ${c}"><i>${r}</i>${esc(t)}</span>`)).join('') : '';
  return `${f.tracos?.length?`<h3 class="section-label">Habilidades em combate</h3><div class="traits">${f.tracos.map(t=>`<section class="trait"><h4>${esc(t.nome)}</h4><p>${esc(t.texto)}</p></section>`).join('')}</div>`:''}
    ${f.defesas?`<h3 class="section-label">Defesas</h3><div class="defs">${defesas||'<span class="def none">Nenhuma vulnerabilidade, resistência ou imunidade.</span>'}</div>`:''}`;
}
const pacote = lista => ({formato:'compendio-sugestoes',versao:1,compendio:dados.versao,exportadoEm:new Date().toISOString(),sugestoes:lista});
const toast = texto => { $('toast').textContent=texto; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),5000); };
function persistir() {
  try { localStorage.setItem(chave, JSON.stringify(pacote(sugestoes))); storageOk=true; }
  catch { storageOk=false; }
  atualizarSugestoes();
  return storageOk;
}
function carregarSugestoes() {
  try { const salvo=localStorage.getItem(chave); if(salvo) sugestoes=validarSugestoes(JSON.parse(salvo),idsValidos()); }
  catch { storageOk=false; $('storage-status').textContent='Não foi possível recuperar as anotações deste navegador. Exporte as novas sugestões antes de fechar. Nenhum dado foi apagado.'; }
}
function atualizarSugestoes() {
  $('notes-count').textContent=sugestoes.length ? `${sugestoes.length} ${sugestoes.length===1?'sugestão registrada':'sugestões registradas'} neste navegador.` : 'Nenhuma sugestão registrada.';
  $('storage-status').textContent=storageOk ? 'Salvamento local. As sugestões não são enviadas automaticamente e não alteram as fichas. Exporte para compartilhar ou guardar uma cópia.' : 'O navegador não confirmou o salvamento. As novas sugestões estão apenas nesta aba: exporte antes de fechar.';
  $('notes-list').innerHTML=sugestoes.length ? [...sugestoes].reverse().map(s=>`<article class="saved-note"><button class="button secondary" data-remove="${esc(s.id)}">Remover</button><h3>${esc(nomeFicha(s.ficha))} · ${esc(s.campo)}</h3><small>${esc(new Date(s.data).toLocaleString('pt-BR'))} · sugestão pendente de revisão</small><p><strong>Proposta:</strong> ${esc(s.proposta)}</p>${s.motivo?`<p><strong>Motivo:</strong> ${esc(s.motivo)}</p>`:''}</article>`).join('') : '<p class="empty">Use “Sugerir uma alteração” em qualquer ficha para começar.</p>';
  $('share-output').value=sugestoes.length ? sugestoes.map(s=>`${nomeFicha(s.ficha)} — ${s.campo}\nProposta: ${s.proposta}${s.motivo?'\nMotivo: '+s.motivo:''}`).join('\n\n') : 'Ainda não há sugestões registradas.';
}
function formulario(id) {
  const opcoes=dados.combatentes.some(f=>f.id===id)?['PV máximos','Classe de armadura','Atributos','Equipamento','Habilidade / dano','Imagem / aparência','Outro']:['Regra / descrição','Dano / cura','Equipamento','Imagem / aparência','Outro'];
  return `<form class="feedback-form" data-ficha="${esc(id)}"><h3>Sugerir uma alteração</h3><p>Descreva o ajuste que você quer experimentar. A ficha permanece como referência até revisarmos sua sugestão.</p><div class="form-grid"><label>O que mudar?<select name="campo">${opcoes.map(o=>`<option>${esc(o)}</option>`).join('')}</select></label><label>Como você gostaria que ficasse?<input name="proposta" required maxlength="4000" placeholder="Ex.: testar 24 PV em vez de 28"></label></div><label>Motivo ou observação <span class="muted">(opcional)</span><textarea name="motivo" maxlength="4000" placeholder="O que você quer melhorar nesse teste?"></textarea></label><button type="submit" class="button">Salvar sugestão neste navegador</button></form>`;
}
function imagem(src, nome, classe='') { return `<button class="art-button ${classe}" data-art="${esc(src)}" data-caption="${esc(nome)}" aria-label="Ampliar: ${esc(nome)}"><img src="${esc(src)}" alt="${esc(nome)}" loading="lazy"></button>`; }
function acaoCard(ficha, acao) {
  const hildred = acaoDeHildred(ficha, acao, esc);
  if (hildred) return hildred;
  if(acao.cura) return `<section class="action-card"><h3>${esc(acao.nome)}</h3><div class="formula heal"><span>CURA MÁXIMA</span><strong>${acao.cura} PV</strong></div><p>${esc(acao.custo)}<br>${esc(acao.alvo)}</p><p>${esc(acao.nota)}</p><span class="badge">ADAPTAÇÃO LOCAL</span></section>`;
  const dano=danoAcao(ficha,acao,dados.equipamentos), bonus=bonusAtaque(ficha,acao);
  const alvo=dados.combatentes.find(f=>f.grupo!==ficha.grupo);
  const ca=classeArmadura(alvo,dados.equipamentos);
  return `<section class="action-card"><h3>${esc(acao.nome)}</h3><div class="formula"><span>ACERTO</span><strong>1d20 ${sinal(bonus)}</strong></div><div class="formula"><span>DANO · ${esc(dano.tipo.toUpperCase())}</span><strong>${expressaoDano(dano)}</strong></div><p>${esc(acao.custo)}<br>${esc(acao.alvo)}</p><p>Acerto = ${sinal(modificador(ficha.atributos[acao.atributo]))} de ${dados.atributos[acao.atributo]} ${acao.proficiente?`+ ${ficha.proficiencia} de proficiência`:''}. ${acao.somaAtributo?'O modificador do atributo também entra no dano.':'O atributo não é somado ao dano.'}</p><p>${esc(acao.nota)}</p><button class="button secondary" data-roll="${ficha.id}/${acao.id}/${alvo.id}">Rolar contra ${esc(alvo.nome)}</button><div class="roll-result" role="status" id="roll-${acao.id}">Alvo: CA ${ca} · ${Math.round(chanceAcerto(bonus,ca)*100)}% de acerto</div></section>`;
}
function renderCombatente(f) {
  const ca=classeArmadura(f,dados.equipamentos);
  $('detail').innerHTML=`<div class="sheet"><header class="sheet-head"><div><p class="eyebrow">${f.grupo==='herois'?'FICHA DO HERÓI · NÍVEL 1':'FICHA DA CRIATURA · TESTE INICIAL'}</p><h2>${esc(f.nome)}</h2><p class="subtitle">${esc(f.subtitulo)}${f.xp?` · ${f.xp} XP`:''}</p></div><span class="badge">PROVISÓRIO</span></header><div class="identity"><div class="portrait">${imagem(f.imagem,f.nome+' · arte em estudo')}<small>${f.id==='rheagon'?'Nova arte · cota de malha e equipamentos comuns':'Arte existente preservada'}<br>Clique para ampliar</small></div><div class="identity-info"><p class="summary">${esc(f.resumo)}</p><div class="vitals"><div class="vital"><b>${f.pv}</b><span>PV MÁXIMOS</span></div><div class="vital"><b>${ca}</b><span>ARMADURA</span></div><div class="vital"><b>+${f.proficiencia}</b><span>PROFICIÊNCIA</span></div></div><div class="attributes">${Object.entries(f.atributos).map(([id,valor])=>`<div class="attribute"><span>${dados.atributos[id]}</span><strong>${valor}</strong><em>${sinal(modificador(valor))}</em></div>`).join('')}</div></div></div><div class="sheet-body">${blocoCombate(f)}<h3 class="section-label">Ações disponíveis</h3><div class="actions-grid">${f.acoes.map(a=>acaoCard(f,a)).join('')}</div><h3 class="section-label">Equipamentos</h3><div class="equipment-list">${f.equipamentos.map(id=>`<a class="chip" href="#equipamentos/${id}">${esc(nomeFicha(id))} ↗</a>`).join('')}</div><h3 class="section-label">O que ainda estamos decidindo</h3><div class="notes"><ul>${(f.notas??[]).map(n=>`<li>${esc(n)}</li>`).join('')}${f.grupo==='monstros'&&!f.xp?'<li>Recompensa de XP: pendente. Criaturas não recebem automaticamente nível de personagem.</li>':''}${f.grupo==='monstros'&&!f.notas?'<li>Ficha do bestiário para o combate v1 (monstros-bestiario.json). Valores provisórios.</li>':''}</ul></div>${f.id==='rheagon'?'<p><a class="chip" href="#arte">Ver todas as novas poses de Rheagon ↗</a></p>':''}${formulario(f.id)}</div></div>`;
}
function renderItem(f) {
  const usuarios=dados.combatentes.filter(c=>c.equipamentos.includes(f.id));
  $('detail').innerHTML=`<div class="sheet"><header class="sheet-head"><div><p class="eyebrow">CATÁLOGO DE EQUIPAMENTOS</p><h2>${esc(f.nome)}</h2><p class="subtitle">${esc(f.categoria)}</p></div><span class="badge">PROPOSTA INICIAL</span></header><div class="sheet-body"><div class="item-detail"><div>${f.imagem?imagem(f.imagem,f.nome):'<div class="pending-art">Ilustração individual<br>pendente</div>'}</div><div><p class="summary">${esc(f.resumo)}</p>${f.dados?`<div class="formula"><span>DANO DA ARMA</span><strong>${f.dados}d${f.faces}</strong></div><p class="summary">${esc(f.tipoDano)} · ${esc(f.atributo)}</p><p class="summary">${esc(f.propriedades)}</p>${f.alcance?`<div class="formula"><span>ALCANCE</span><strong>${ALCANCES[f.alcance]??esc(f.alcance)}</strong></div>`:''}${f.maestria?`<div class="formula"><span>MAESTRIA</span><strong>${MAESTRIAS[f.maestria]??esc(f.maestria)}</strong></div>`:''}`:f.caBase?`<div class="formula"><span>CLASSE DE ARMADURA</span><strong>${f.caBase}${f.somaDes?' + Destreza':''}</strong></div>`:f.bonusCA?`<div class="formula"><span>BÔNUS DE ARMADURA</span><strong>+${f.bonusCA}</strong></div>`:'<p class="summary">Sem bônus de armadura.</p>'}<div class="notes">${esc(f.nota)}</div></div></div><h3 class="section-label">Quem utiliza</h3><div class="equipment-list">${usuarios.map(u=>`<a class="chip" href="#${u.grupo}/${u.id}">${esc(u.nome)}${f.dados?` · ${expressaoDano(danoAcao(u,u.acoes.find(a=>a.item===f.id),dados.equipamentos))}`:''} ↗</a>`).join('')}</div>${formulario(f.id)}</div></div>`;
}
function renderHabilidade(f) {
  $('detail').innerHTML=`<div class="sheet"><header class="sheet-head"><div><p class="eyebrow">MAGIAS & HABILIDADES</p><h2>${esc(f.nome)}</h2><p class="subtitle">${esc(f.categoria)}</p></div><span class="badge">NÍVEL 1 · EM TESTE</span></header><div class="sheet-body"><p class="summary" style="margin-top:24px">${esc(f.resumo)}</p><div class="action-card"><h3>${esc(f.origem)}</h3><p>${esc(f.formula)}</p><p>${esc(f.custo)}</p></div><h3 class="section-label">Referência e adaptação</h3><div class="notes">${esc(f.nota)}</div><p><a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">Consultar a regra de referência ↗</a></p>${formulario(f.id)}</div></div>`;
}
function renderRegras() {
  const herois=dados.combatentes.filter(f=>['rheagon','genesis'].includes(f.id)), goblins=dados.combatentes.filter(f=>f.grupo==='monstros');
  const ca=classeArmadura(goblins[0],dados.equipamentos);
  const ataques=[herois[0].acoes[0],herois[1].acoes[1]];
  const media=herois.reduce((s,f,i)=>s+danoEsperado(bonusAtaque(f,ataques[i]),ca,danoAcao(f,ataques[i],dados.equipamentos)),0);
  const pv=goblins.reduce((s,f)=>s+f.pv,0);
  $('special').innerHTML=`<section class="special-panel"><p class="eyebrow">HIPÓTESE DE BALANCEAMENTO</p><h2>Uma primeira batalha de quatro rodadas.</h2><p>Rheagon e Gênesis enfrentam um Goblin Warrior e um arqueiro. A meta é ter tempo para escolher alvos e experimentar a cura. Os números abaixo são uma aproximação, não uma batalha simulada nem uma garantia de duração.</p><div class="rule-grid"><section class="rule-card"><h3>Resistência dos inimigos</h3><p class="big">${pv} PV</p><p>18 do saqueador + 16 do arqueiro. Ambos têm CA ${ca}. Valores próprios do estudo.</p></section><section class="rule-card"><h3>Pressão dos heróis</h3><p class="big">${numero(media)} / rodada</p><p>Dano médio esperado com uma espadada e um Fire Bolt contra CA ${ca}, incluindo falhas e críticos. Dividindo ${pv} PV por ${numero(media,2)}, obtemos cerca de ${numero(pv/media)} rodadas.</p></section><section class="rule-card"><h3>Como acertar</h3><p>Role 1d20 + atributo + proficiência. Igualar ou superar a CA acerta. Rheagon e o Fire Bolt têm +5: contra CA 13, precisam de 8 ou mais, com 65% de acerto.</p><p>1 natural sempre erra. 20 natural acerta e dobra os dados de dano; não dobra o bônus fixo.</p></section><section class="rule-card"><h3>Recorte do turno</h3><p>Proposta: iniciativa 1d20 + Destreza, rolada uma vez no início; empates entre participantes ordenados por Destreza e depois por identificador estável. Cada combatente vivo realiza uma ação por turno.</p><p>Em zero PV, fica incapacitado. O grupo perde se ambos os heróis caírem. Regras de morte e recuperação posterior permanecem pendentes.</p></section></div><h3 class="section-label">Regras locais provisórias</h3><div class="notes"><ul><li>Rheagon tem 28 PV; Gênesis, 20. A vida inicial foi aumentada por decisão de design, sem definir progressão até o nível 20.</li><li>Lay on Hands cura até 8 PV em um aliado vivo, uma vez por batalha, e consome a ação. Sem ações bônus ou reações neste recorte.</li><li>Atualização: o combate v1 já usa linhas e alcance, vantagem e desvantagem, condições, maestrias, Protection, Nimble Escape, defesas, experiência e espólios. Veja a aba <a href="#combate">Regras de combate</a>.</li><li>Ainda fora: movimento, multiataque, testes de morte e consumo de munição.</li><li>A estimativa ignora dano excedente, foco dos inimigos, incapacitações e ações gastas em cura. Esses fatores podem alterar bastante a duração real.</li><li>A batalha normal (/) mantém suas regras antigas. O combate v1 (/?combate=v1) usa este cadastro.</li></ul></div><div class="source-links"><a href="https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game" target="_blank" rel="noopener noreferrer">Acerto e dano ↗</a><a href="https://www.dndbeyond.com/sources/dnd/br-2024/equipment" target="_blank" rel="noopener noreferrer">Armas e armaduras ↗</a></div>${formulario('regras')}</section>`;
}
function renderArte() {
  $('special').innerHTML=`<section class="special-panel"><p class="eyebrow">PROPOSTA VISUAL · AGUARDANDO SUA REVISÃO</p><h2>Rheagon, no começo da jornada.</h2><p>O mesmo draconato dourado, agora com cota de malha, couro, espada de aço e escudo de madeira reforçado. Todas as imagens anteriores continuam preservadas. As poses abaixo são estáticas e ainda precisam de aprovação e calibração antes de qualquer integração.</p><div class="gallery">${dados.poses.map(p=>`<figure class="pose">${imagem('/ARDOG_early_access/assets/personagens/rheagon-nivel-1/'+p.arquivo,'Rheagon · '+p.nome)}<figcaption><strong>${esc(p.nome)}</strong><small>${esc(p.nota)}</small></figcaption></figure>`).join('')}<figure class="pose">${imagem('/ARDOG_early_access/assets/rheagon-idle.webp','Rheagon · arte anterior preservada')}<figcaption><strong>Arte anterior</strong><small>Referência para comparar · permanece em uso no jogo</small></figcaption></figure></div>${formulario('arte-rheagon')}</section>`;
}
function renderAventura() {
  $('special').innerHTML=`<section class="special-panel"><p class="eyebrow">PREPARAÇÃO PARA A CAMPANHA</p><h2>A memória da aventura.</h2><p>Ainda não há uma campanha salva nem batalhas registradas. Esta área reserva a estrutura para acompanhar a evolução dos personagens; as sugestões já podem ser registradas abaixo.</p><div class="rule-grid"><section class="rule-card"><h3>Estado atual</h3><p>Começo proposto: nível 1 e XP 0 para os dois heróis. Equipamentos iniciais estão nas fichas. PV atuais e recursos entre batalhas ainda não são controlados pelo compêndio.</p></section><section class="rule-card"><h3>Histórico futuro</h3><p>Cada batalha deve ter um identificador, data, participantes, resultado, XP e saque. Recompensas precisam ser aplicadas uma única vez. Ganho de nível ficará manual até definirmos sua progressão.</p></section></div><div class="notes">Pendentes: XP dos monstros, divisão da recompensa, descanso, recuperação de PV, saque e persistência da campanha em arquivo. A exportação disponível agora contém somente suas sugestões.</div>${formulario('aventura')}</section>`;
}
function renderCombate() {
  if(!combate){$('special').innerHTML='<section class="special-panel"><div class="notes">Não foi possível carregar regras-combate.json.</div></section>';return;}
  const tabela=t=>`<div class="table-wrap"><table><thead><tr>${t.cabecalho.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.linhas.map(l=>`<tr>${l.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  $('special').innerHTML=`<section class="special-panel combat-rules"><p class="eyebrow">COMBATE V1 · ${esc(combate.versao.toUpperCase())}</p><h2>${esc(combate.titulo)}</h2><p>${esc(combate.intro)}</p>
    <div class="origins">${Object.entries(combate.origens).map(([k,t])=>`<span class="origin ${k}" title="${esc(t)}">${ORIGENS[k]}</span><small>${esc(t.split(': ')[1]??'')}</small>`).join('')}</div>
    <nav class="toc">${combate.secoes.map(sec=>`<button class="chip" data-goto="regra-${sec.id}">${esc(sec.titulo)}</button>`).join('')}</nav>
    ${combate.secoes.map(sec=>`<h3 class="section-label" id="regra-${sec.id}">${esc(sec.titulo)}</h3><div class="rule-grid">${sec.itens.map(it=>`<section class="rule-card"><header><h3>${esc(it.nome)}</h3><span class="origin ${it.origem}">${ORIGENS[it.origem]}</span></header>${it.texto.map(t=>`<p>${esc(t)}</p>`).join('')}${it.tabela?tabela(it.tabela):''}</section>`).join('')}</div>`).join('')}
    ${formulario('combate')}</section>`;
}
function colecao(chap) { return chap==='herois'||chap==='monstros'?dados.combatentes.filter(f=>f.grupo===chap):dados[chap]??[]; }
function renderLista() {
  const busca=$('search').value.trim().toLocaleLowerCase('pt-BR');
  const lista=colecao(secao).filter(f=>JSON.stringify(f).toLocaleLowerCase('pt-BR').includes(busca));
  $('count').textContent=`${lista.length} registro${lista.length===1?'':'s'}`;
  $('list').innerHTML=lista.length?lista.map(f=>`<a class="entry ${f.id===atual?.id?'active':''}" href="#${secao}/${f.id}" ${f.id===atual?.id?'aria-current="page"':''}>${f.imagem?`<img src="${f.imagem}" alt="" loading="lazy">`:'<span class="mini-placeholder" aria-hidden="true">◇</span>'}<span><b>${esc(f.nome)}</b><small>${esc(f.subtitulo??f.categoria)}${f.pv?` · ${f.pv} PV`:''}</small></span></a>`).join(''):'<p class="empty">Nenhum resultado. Tente outro nome.</p>';
}
function navegar() {
  const [pedido,id]=location.hash.slice(1).split('/');
  const proxima=secoes.some(s=>s[0]===pedido)?pedido:'herois';
  if(proxima!==secao) $('search').value='';
  secao=proxima;
  const especial=['regras','combate','arte','aventura'].includes(secao);
  $('workspace').hidden=especial; $('special').hidden=!especial;
  $('tabs').innerHTML=secoes.map(([key,label])=>`<a class="tab ${key===secao?'active':''}" href="#${key}" ${key===secao?'aria-current="page"':''}>${label}${colecao(key).length?`<span>${colecao(key).length}</span>`:''}</a>`).join('');
  if(especial) { ({regras:renderRegras,combate:renderCombate,arte:renderArte,aventura:renderAventura}[secao])(); }
  else { atual=colecao(secao).find(f=>f.id===id)??colecao(secao)[0]; renderLista(); if(secao==='equipamentos')renderItem(atual);else if(secao==='habilidades')renderHabilidade(atual);else renderCombatente(atual); }
  document.title=`${secoes.find(s=>s[0]===secao)[1]} · Compêndio da cripta`;
}
document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement){const fallback=document.createElement('span');fallback.className='pending-art';fallback.textContent='Arte indisponível no momento';e.target.replaceWith(fallback);}},true);
document.addEventListener('submit',e=>{
  const form=e.target.closest('.feedback-form'); if(!form)return; e.preventDefault();
  const f=new FormData(form), proposta=String(f.get('proposta')).trim();
  if(!proposta) { toast('Descreva a alteração desejada.');return; }
  if(sugestoes.length>=1000){toast('Limite de 1.000 sugestões atingido. Exporte uma cópia antes de organizar as anotações.');return;}
  sugestoes.push({id:crypto.randomUUID(),ficha:form.dataset.ficha,campo:String(f.get('campo')),proposta,motivo:String(f.get('motivo')).trim(),data:new Date().toISOString()});
  const salvo=persistir(); form.reset(); toast(salvo?'Sugestão salva neste navegador. Exporte para compartilhar.':'Sugestão nesta aba. Exporte agora para não perdê-la.');
});
document.addEventListener('click',e=>{
  const remove=e.target.closest('[data-remove]');
  if(remove){sugestoes=sugestoes.filter(s=>s.id!==remove.dataset.remove);persistir();toast('Sugestão removida deste navegador.');}
  const goto=e.target.closest('[data-goto]');
  if(goto)document.getElementById(goto.dataset.goto)?.scrollIntoView({behavior:'smooth',block:'start'});
  const art=e.target.closest('[data-art]');
  if(art){$('large-art').src=art.dataset.art;$('large-art').alt=art.dataset.caption;$('art-caption').textContent=art.dataset.caption;$('art-dialog').showModal();}
  const roll=e.target.closest('[data-roll]');
  if(roll){
    const [fid,aid,tid]=roll.dataset.roll.split('/'),f=dados.combatentes.find(x=>x.id===fid),a=f.acoes.find(x=>x.id===aid),alvo=dados.combatentes.find(x=>x.id===tid);
    const dado=faces=>Math.floor(Math.random()*faces)+1,d20=dado(20),bonus=bonusAtaque(f,a),ca=classeArmadura(alvo,dados.equipamentos),acertou=d20===20||(d20!==1&&d20+bonus>=ca),dano=danoAcao(f,a,dados.equipamentos);
    let texto=`d20: ${d20} ${sinal(bonus)} = ${d20+bonus} contra CA ${ca}. `;
    if(acertou){const rolagens=Array.from({length:dano.dados*(d20===20?2:1)},()=>dado(dano.faces));texto+=`${d20===20?'Crítico! ':''}${rolagens.join(' + ')}${dano.bonus?' '+sinal(dano.bonus):''} = ${Math.max(0,rolagens.reduce((s,n)=>s+n,0)+dano.bonus)} de dano.`;}else texto+='Errou.';
    $('roll-'+aid).textContent=texto+' Exemplo avulso; não altera PV nem histórico.';
  }
});
$('search').addEventListener('input',renderLista);
$('close-art').addEventListener('click',()=>$('art-dialog').close());
$('show-notes').addEventListener('click',()=>{const abrir=$('notes-list').hidden;$('notes-list').hidden=!abrir;$('show-notes').textContent=abrir?'Ocultar sugestões':'Ver sugestões';});
$('share-text').addEventListener('click',()=>{$('share-label').hidden=!$('share-label').hidden;if(!$('share-label').hidden){$('share-output').focus();$('share-output').select();}});
$('export').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(pacote(sugestoes),null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`compendio-sugestoes-${new Date().toLocaleDateString('sv-SE')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Arquivo de sugestões preparado para download.');
});
$('import').addEventListener('change',async e=>{
  const arquivo=e.target.files[0];if(!arquivo)return;
  try{if(arquivo.size>1024*1024)throw new Error('Arquivo muito grande. O limite é 1 MB.');const novas=validarSugestoes(JSON.parse(await arquivo.text()),idsValidos());const existentes=new Set(sugestoes.map(s=>s.id));const adicionais=novas.filter(s=>!existentes.has(s.id));if(sugestoes.length+adicionais.length>1000)throw new Error('A importação ultrapassaria o limite de 1.000 sugestões.');sugestoes=[...sugestoes,...adicionais];const salvo=persistir();toast(`${adicionais.length} sugestão(ões) importada(s).${salvo?'':' Exporte: o salvamento local falhou.'}`);}
  catch(err){toast(err instanceof Error?err.message:'Não foi possível importar o arquivo.');}
  finally{e.target.value='';}
});
window.addEventListener('hashchange',navegar);
window.addEventListener('storage',e=>{if(dados&&e.key===chave){carregarSugestoes();atualizarSugestoes();}});
try{
  const resposta=await fetch('./dados.json');if(!resposta.ok)throw new Error('Cadastro não encontrado.');dados=await resposta.json();
  // Bestiary sheets and the combat rules (combat v1). Optional: the compendium still opens without them.
  const extra=async arquivo=>{try{const r=await fetch(arquivo);return r.ok?await r.json():undefined;}catch{return undefined;}};
  const bestiario=await extra('./monstros-bestiario.json');combate=await extra('./regras-combate.json');
  if(bestiario){dados.combatentes.push(...bestiario.combatentes);dados.equipamentos.push(...bestiario.equipamentos);}
  integrarHildred(dados, await extra('./herois-propostos.json'));
  carregarSugestoes();atualizarSugestoes();navegar();
}catch(err){$('workspace').innerHTML='<div class="notes">Não foi possível carregar o compêndio. Abra pelo atalho “Abrir Compêndio.cmd”, com o servidor local em execução, e recarregue a página.</div>';console.error(err);}
