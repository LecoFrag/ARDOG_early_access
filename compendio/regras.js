// Regras independentes da batalha atual. Cadastro compartilhável numa integração futura.
export const modificador = valor => Math.floor((valor - 10) / 2);
export function bonusAtaque(ficha, acao) {
  return modificador(ficha.atributos[acao.atributo]) + (acao.proficiente ? ficha.proficiencia : 0);
}
export function classeArmadura(ficha, itens) {
  const armadura = itens.find(i => i.id === ficha.armadura);
  const destreza = modificador(ficha.atributos.des);
  const base = armadura ? armadura.caBase + (armadura.somaDes ? Math.min(destreza, armadura.limiteDes ?? Infinity) : 0) : 10 + destreza;
  return base + (ficha.escudo ? (itens.find(i => i.id === ficha.escudo)?.bonusCA ?? 0) : 0);
}
export function danoAcao(ficha, acao, itens) {
  const item = itens.find(i => i.id === acao.item);
  return { dados: acao.dados ?? item?.dados ?? 0, faces: acao.faces ?? item?.faces ?? 0,
    bonus: acao.somaAtributo ? modificador(ficha.atributos[acao.atributo]) : 0,
    tipo: acao.tipoDano ?? item?.tipoDano ?? '' };
}
export const sinal = valor => valor >= 0 ? `+${valor}` : `−${Math.abs(valor)}`;
export const expressaoDano = dano => `${dano.dados}d${dano.faces}${dano.bonus ? ` ${sinal(dano.bonus)}` : ''}`;
export const chanceAcerto = (bonus, ca) => Math.min(.95, Math.max(.05, (21 + bonus - ca) / 20));
export function danoEsperado(bonus, ca, dano) {
  // Um 20 natural acrescenta os dados de crítico; bônus fixos não dobram.
  const mediaDados = dano.dados * (dano.faces + 1) / 2;
  return chanceAcerto(bonus, ca) * (mediaDados + dano.bonus) + .05 * mediaDados;
}
export function validarSugestoes(arquivo, ids) {
  if (!arquivo || arquivo.formato !== 'compendio-sugestoes' || arquivo.versao !== 1 || !Array.isArray(arquivo.sugestoes) || arquivo.sugestoes.length > 1000) throw new Error('Use um arquivo de sugestões exportado pelo compêndio (versão 1).');
  const unicos = new Set();
  return arquivo.sugestoes.map(s => {
    if (!s || typeof s.id !== 'string' || !s.id || s.id.length > 100 || unicos.has(s.id) || !ids.includes(s.ficha) || typeof s.campo !== 'string' || !s.campo || s.campo.length > 120 || typeof s.proposta !== 'string' || !s.proposta.trim() || s.proposta.length > 4000 || typeof s.motivo !== 'string' || s.motivo.length > 4000 || typeof s.data !== 'string' || Number.isNaN(Date.parse(s.data))) throw new Error('O arquivo contém uma sugestão inválida ou repetida. Nada foi importado.');
    unicos.add(s.id);
    return { id:s.id, ficha:s.ficha, campo:s.campo, proposta:s.proposta, motivo:s.motivo, data:s.data };
  });
}
