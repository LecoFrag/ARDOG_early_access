// Hildred no compêndio estático; a batalha e a exploração usam o mesmo JSON.
export function integrarHildred(dados, propostos) {
  if (!propostos) return;
  const hildred = propostos.combatentes.find(f => f.id === 'hildred');
  if (hildred && !dados.combatentes.some(f => f.id === hildred.id)) dados.combatentes.push(hildred);
  for (const item of propostos.equipamentos ?? []) {
    if (hildred?.equipamentos.includes(item.id) && !dados.equipamentos.some(i => i.id === item.id)) dados.equipamentos.push(item);
  }
}

export function acaoDeHildred(ficha, acao, esc) {
  if (ficha.id !== 'hildred' || !acao.tipo) return undefined;
  const sab = Math.floor((ficha.atributos.sab - 10) / 2), sinal = n => n >= 0 ? `+${n}` : String(n);
  let formula = 'Sem rolagem';
  if (acao.tipo === 'ataque') formula = `Acerto ${sinal(sab + ficha.proficiencia)} · ${acao.dados}d${acao.faces} de ${acao.tipoDano}`;
  if (acao.tipo === 'resistencia') formula = `Resistência de FOR · CD ${8 + sab + ficha.proficiencia}`;
  if (acao.tipo === 'cura') formula = `Cura ${acao.curaDados[0]}d${acao.curaDados[1]}${sinal(sab)} PV`;
  if (acao.efeito === 'shillelagh') formula = `Cajado: acerto ${sinal(sab + ficha.proficiencia)} · 1d8${sinal(sab)} contundente · 5 turnos`;
  const imagem = acao.forma ? `/ARDOG_early_access/assets/personagens/${acao.forma}/idle.webp`
    : acao.efeito === 'shillelagh' ? '/ARDOG_early_access/assets/cartas/hildred-shillelagh-v2.webp' : undefined;
  const arte = imagem ? `<img src="${esc(imagem)}" alt="${esc(acao.nome)}" style="width:100%;height:160px;object-fit:contain">` : '';
  return `<section class="action-card"><h3>${esc(acao.nome)}</h3>${arte}<div class="formula"><strong>${esc(formula)}</strong></div><p>${esc(acao.custo)}<br>${esc(acao.alvo)}</p><p>${esc(acao.nota)}</p></section>`;
}
