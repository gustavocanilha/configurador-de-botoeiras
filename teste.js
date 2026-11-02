const assert = require('assert');
const N = require('./nucleo.js');

// formatação do código
assert.strictEqual(N.formatarCodigo('K2', 1), 'K2.0001');
assert.strictEqual(N.formatarCodigo('K3', 42), 'K3.0042');
assert.strictEqual(N.formatarCodigo('K2', 10000), 'K2.10000');

// descrição
const tpl = 'Bot. {local} {fornecedor} - {material}';
assert.strictEqual(
  N.gerarDescricao(tpl, { local: 'Cabina', fornecedor: 'Elevcom', material: 'Vidro Preto' }),
  'Bot. Cabina Elevcom - Vidro Preto'
);
assert.strictEqual(N.gerarDescricao(tpl, { local: 'Cabina' }), 'Bot. Cabina {fornecedor} - {material}');

// placeholders
assert.deepStrictEqual(N.placeholders(tpl), ['local', 'fornecedor', 'material']);

// identidade independe da ordem, muda com o valor
assert.strictEqual(N.chaveDe({ a: '1', b: '2' }), N.chaveDe({ b: '2', a: '1' }));
assert.notStrictEqual(N.chaveDe({ a: '1', b: '2' }), N.chaveDe({ a: '1', b: '3' }));

// compatibilidade
const dados = {
  campos: [
    { id: 'fornecedor', rotulo: 'Fornecedor' },
    { id: 'modelo_botao', rotulo: 'Modelo do botão' },
    { id: 'material', rotulo: 'Material' },
  ],
  compatibilidade: [
    { quando: { campo: 'fornecedor', valor: 'Elevcom' }, bloqueia: { campo: 'modelo_botao', valor: 'Achille' } },
    { quando: { campo: 'modelo_botao', valor: 'Touch' }, bloqueia: { campo: 'material', valor: 'Vidro Preto' } },
  ],
};

assert.deepStrictEqual(N.bloqueados(dados, { fornecedor: 'Elevcom' }), { modelo_botao: ['Achille'] });
assert.deepStrictEqual(N.bloqueados(dados, { fornecedor: 'Vega' }), {});

const selecao = { fornecedor: 'Elevcom', modelo_botao: 'Achille', material: 'Vidro Preto' };
const removidos = N.limparInvalidos(dados, selecao);
assert.deepStrictEqual(removidos, [{ campo: 'modelo_botao', rotulo: 'Modelo do botão', valor: 'Achille' }]);
assert.deepStrictEqual(selecao, { fornecedor: 'Elevcom', material: 'Vidro Preto' });

// regra de segundo nível também limpa
const cascata = { fornecedor: 'Elevcom', modelo_botao: 'Touch', material: 'Vidro Preto' };
N.limparInvalidos(dados, cascata);
assert.deepStrictEqual(cascata, { fornecedor: 'Elevcom', modelo_botao: 'Touch' });

// contador avança e pula código já usado
const cadastros = [{ codigo: 'K2.0002' }];
assert.deepStrictEqual(N.proximoCodigo(cadastros, { K2: 2 }, 'K2'), { codigo: 'K2.0003', proximo: 4 });
assert.deepStrictEqual(N.proximoCodigo([], { K3: 7 }, 'K3'), { codigo: 'K3.0007', proximo: 8 });
assert.deepStrictEqual(N.proximoCodigo([], {}, 'K3'), { codigo: 'K3.0001', proximo: 2 });

console.log('nucleo: todos os testes passaram');
