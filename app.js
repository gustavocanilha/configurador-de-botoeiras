'use strict';

const N = window.Nucleo;

const ABAS = [
  ['configurar', 'Configurar'],
  ['cadastros', 'Cadastros'],
  ['opcoes', 'Opções'],
  ['compatibilidade', 'Compatibilidade'],
  ['template', 'Template'],
];

const estado = {
  dados: null,
  valores: {},
  aba: 'configurar',
  busca: '',
  aviso: '',
};

iniciar();

async function iniciar() {
  const conteudo = document.getElementById('conteudo');
  document.getElementById('abas').addEventListener('click', aoClicarAba);
  conteudo.addEventListener('click', aoClicar);
  conteudo.addEventListener('change', aoMudar);
  conteudo.addEventListener('submit', aoEnviar);
  conteudo.addEventListener('input', aoDigitar);
  await carregar();
}

// ---------- utilidades ----------

function esc(valor) {
  return String(valor == null ? '' : valor).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

let relogioStatus;
function status(texto) {
  const el = document.getElementById('status');
  el.textContent = texto;
  el.classList.add('visivel');
  clearTimeout(relogioStatus);
  relogioStatus = setTimeout(() => el.classList.remove('visivel'), 3500);
}

function dataBr(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch (e) {
    return '';
  }
}

function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- dados ----------

async function carregar() {
  try {
    const resposta = await fetch('/api/dados', { cache: 'no-store' });
    if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
    estado.dados = await resposta.json();
    normalizar();
    render();
  } catch (erro) {
    document.getElementById('abas').innerHTML = '';
    document.getElementById('conteudo').innerHTML = `
      <section class="falha">
        <h2>Servidor não encontrado</h2>
        <p>Abra a pasta do projeto e execute <code>iniciar.bat</code>.</p>
        <p class="detalhe">${esc(erro.message)}</p>
      </section>`;
  }
}

function normalizar() {
  const d = estado.dados;
  d.campos = Array.isArray(d.campos) ? d.campos : [];
  d.compatibilidade = Array.isArray(d.compatibilidade) ? d.compatibilidade : [];
  d.cadastros = Array.isArray(d.cadastros) ? d.cadastros : [];
  d.contadores = d.contadores && typeof d.contadores === 'object' ? d.contadores : {};
  d.prefixos = d.prefixos && typeof d.prefixos === 'object' ? d.prefixos : {};
  d.template = typeof d.template === 'string' ? d.template : '';
}

async function salvar() {
  try {
    const resposta = await fetch('/api/dados', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estado.dados, null, 2),
    });
    if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
    return true;
  } catch (erro) {
    status('Erro ao salvar: ' + erro.message);
    return false;
  }
}

// ---------- navegação ----------

function render() {
  document.getElementById('abas').innerHTML = ABAS.map(([id, rotulo]) => `
    <button type="button" role="tab" aria-selected="${estado.aba === id}" data-aba="${id}">${esc(rotulo)}</button>
  `).join('');

  const alvo = document.getElementById('conteudo');
  if (estado.aba === 'configurar') renderConfigurar(alvo);
  else if (estado.aba === 'cadastros') renderCadastros(alvo);
  else if (estado.aba === 'opcoes') renderOpcoes(alvo);
  else if (estado.aba === 'compatibilidade') renderCompatibilidade(alvo);
  else renderTemplate(alvo);
}

function aoClicarAba(ev) {
  const botao = ev.target.closest('[data-aba]');
  if (!botao) return;
  estado.aba = botao.dataset.aba;
  estado.aviso = '';
  render();
}

// ---------- configurar ----------

function renderConfigurar(alvo) {
  const d = estado.dados;
  alvo.innerHTML = `
    <form id="form" novalidate>
      <div class="grade">
        ${d.campos.map((campo) => `
          <label class="campo" for="f_${esc(campo.id)}">
            <span>${esc(campo.rotulo)}</span>
            <select id="f_${esc(campo.id)}" data-campo="${esc(campo.id)}">
              <option value="">—</option>
              ${campo.opcoes.map((opcao) => `<option value="${esc(opcao)}">${esc(opcao)}</option>`).join('')}
            </select>
          </label>`).join('')}
      </div>
      <p id="aviso" class="aviso" role="alert" hidden></p>
      <section class="previa">
        <h2>Descrição</h2>
        <p id="previa" class="texto"></p>
      </section>
      <div class="acoes">
        <button type="submit" class="primario">Cadastrar botoeira</button>
        <button type="button" class="secundario" id="limpar">Limpar campos</button>
      </div>
    </form>`;
  aplicar();
}

function aplicar() {
  const removidos = N.limparInvalidos(estado.dados, estado.valores);
  if (removidos.length) {
    estado.aviso = 'Removido por incompatibilidade: ' +
      removidos.map((r) => r.rotulo + ' = ' + r.valor).join('; ') + '.';
  }

  const mapa = N.bloqueados(estado.dados, estado.valores);
  estado.dados.campos.forEach((campo) => {
    const select = document.getElementById('f_' + campo.id);
    if (!select) return;
    const bloqueados = mapa[campo.id] || [];
    Array.from(select.options).forEach((opcao) => {
      if (opcao.value !== '') opcao.disabled = bloqueados.indexOf(opcao.value) !== -1;
    });
    select.value = estado.valores[campo.id] || '';
  });

  const aviso = document.getElementById('aviso');
  if (aviso) {
    aviso.hidden = !estado.aviso;
    aviso.textContent = estado.aviso;
  }
  const previa = document.getElementById('previa');
  if (previa) previa.textContent = N.gerarDescricao(estado.dados.template, estado.valores);
}

function mostrarAviso(texto) {
  estado.aviso = texto;
  aplicar();
}

async function cadastrar(ev) {
  ev.preventDefault();
  const d = estado.dados;

  const faltando = d.campos.filter((campo) => !estado.valores[campo.id]);
  if (faltando.length) {
    mostrarAviso('Preencha: ' + faltando.map((c) => c.rotulo).join(', ') + '.');
    return;
  }

  const chave = N.chaveDe(estado.valores);
  const igual = d.cadastros.find((c) => c.chave === chave);
  if (igual) {
    mostrarAviso('Configuração já cadastrada como ' + igual.codigo + '.');
    return;
  }

  const prefixo = d.prefixos[estado.valores.local];
  if (!prefixo) {
    mostrarAviso('O local "' + estado.valores.local + '" não tem prefixo configurado em dados.json.');
    return;
  }

  const anterior = d.contadores[prefixo];
  const proximo = N.proximoCodigo(d.cadastros, d.contadores, prefixo);
  d.cadastros.push({
    codigo: proximo.codigo,
    chave,
    valores: Object.assign({}, estado.valores),
    descricao: N.gerarDescricao(d.template, estado.valores),
    criadoEm: new Date().toISOString(),
  });
  d.contadores[prefixo] = proximo.proximo;

  if (!(await salvar())) {
    d.cadastros.pop();
    if (anterior === undefined) delete d.contadores[prefixo];
    else d.contadores[prefixo] = anterior;
    return;
  }

  estado.valores = {};
  estado.aviso = '';
  render();
  status('Cadastrado: ' + proximo.codigo);
}

function podarSelecao() {
  estado.dados.campos.forEach((campo) => {
    const valor = estado.valores[campo.id];
    if (valor !== undefined && campo.opcoes.indexOf(valor) === -1) delete estado.valores[campo.id];
  });
}

// ---------- cadastros ----------

function renderCadastros(alvo) {
  const d = estado.dados;
  const lista = d.cadastros.slice().sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));

  alvo.innerHTML = `
    <div class="barra">
      <input type="text" id="busca" placeholder="Buscar por código ou descrição"
             aria-label="Buscar cadastros" value="${esc(estado.busca)}">
      <button type="button" class="secundario" id="exportar" ${d.cadastros.length ? '' : 'disabled'}>Exportar CSV</button>
    </div>
    <p class="contagem" id="contagem"></p>
    <div class="lista">
      ${lista.length ? lista.map((c) => `
        <article class="item" data-texto="${esc((c.codigo + ' ' + c.descricao).toLowerCase())}">
          <div class="item-topo">
            <strong>${esc(c.codigo)}</strong>
            <span class="data">${esc(dataBr(c.criadoEm))}</span>
          </div>
          <p class="texto">${esc(c.descricao)}</p>
          <div class="item-acoes">
            <button type="button" class="secundario mini" data-copiar-descricao="${esc(c.codigo)}">Copiar descrição</button>
            <button type="button" class="secundario mini" data-copiar-codigo="${esc(c.codigo)}">Copiar código</button>
            <button type="button" class="secundario mini" data-excluir="${esc(c.codigo)}">Excluir</button>
          </div>
        </article>`).join('') : '<p class="vazio">Nenhum cadastro ainda.</p>'}
    </div>`;
  filtrarLista();
}

function filtrarLista() {
  const busca = estado.busca.trim().toLowerCase();
  const itens = Array.from(document.querySelectorAll('.lista .item'));
  let visiveis = 0;
  itens.forEach((item) => {
    const bate = !busca || item.dataset.texto.indexOf(busca) !== -1;
    item.hidden = !bate;
    if (bate) visiveis++;
  });
  const contagem = document.getElementById('contagem');
  if (contagem) {
    contagem.textContent = itens.length
      ? visiveis + ' de ' + estado.dados.cadastros.length + ' cadastro(s)'
      : '';
  }
}

async function copiar(texto, mensagem) {
  try {
    await navigator.clipboard.writeText(texto);
    status(mensagem);
  } catch (erro) {
    status('Erro ao copiar: use Ctrl+C manualmente.');
  }
}

async function excluir(codigo) {
  if (!confirm('Excluir ' + codigo + '? O código não será reaproveitado.')) return;
  const indice = estado.dados.cadastros.findIndex((c) => c.codigo === codigo);
  if (indice === -1) return;
  const removido = estado.dados.cadastros.splice(indice, 1)[0];
  if (!(await salvar())) {
    estado.dados.cadastros.splice(indice, 0, removido);
    return;
  }
  render();
  status(codigo + ' excluído.');
}

function exportarCsv() {
  const d = estado.dados;
  const cabecalho = ['codigo'].concat(d.campos.map((c) => c.rotulo)).concat(['descricao']);
  const linhas = d.cadastros.map((c) => [c.codigo]
    .concat(d.campos.map((campo) => c.valores[campo.id] || ''))
    .concat([c.descricao]));

  const csv = '\ufeff' + [cabecalho].concat(linhas)
    .map((linha) => linha.map((valor) => '"' + String(valor).replace(/"/g, '""') + '"').join(';'))
    .join('\r\n');

  baixar('botoeiras.csv', csv, 'text/csv;charset=utf-8');
  status('CSV exportado.');
}

// ---------- opções ----------

function renderOpcoes(alvo) {
  alvo.innerHTML = `<p class="dica">Adicione ou remova valores de cada campo. Os cadastros já feitos não mudam.</p>` +
    estado.dados.campos.map((campo) => `
      <section class="cartao" data-campo="${esc(campo.id)}">
        <h2>${esc(campo.rotulo)} <span class="chave">{${esc(campo.id)}}</span></h2>
        <div class="valores">
          ${campo.opcoes.length ? campo.opcoes.map((valor) => `
            <span class="valor">${esc(valor)}
              <button type="button" class="remover" title="Remover ${esc(valor)}"
                      data-remover-valor="${esc(valor)}" data-campo-alvo="${esc(campo.id)}">×</button>
            </span>`).join('') : '<span class="vazio">sem valores</span>'}
        </div>
        <form class="adicionar" data-campo-alvo="${esc(campo.id)}">
          <input type="text" placeholder="Novo valor" aria-label="Novo valor para ${esc(campo.rotulo)}">
          <button type="submit" class="secundario mini">Adicionar</button>
        </form>
      </section>`).join('');
}

async function adicionarOpcao(form) {
  const campo = estado.dados.campos.find((c) => c.id === form.dataset.campoAlvo);
  if (!campo) return;
  const entrada = form.querySelector('input');
  const texto = entrada.value.trim();
  if (!texto) return;
  if (campo.opcoes.indexOf(texto) !== -1) {
    status('Erro: o valor "' + texto + '" já existe.');
    return;
  }
  campo.opcoes.push(texto);
  if (await salvar()) {
    render();
    status('Valor adicionado.');
  } else {
    campo.opcoes.pop();
  }
}

async function removerOpcao(campoId, valor) {
  const campo = estado.dados.campos.find((c) => c.id === campoId);
  if (!campo) return;
  if (!confirm('Remover "' + valor + '" de ' + campo.rotulo + '?')) return;

  const opcoesAntes = campo.opcoes.slice();
  const regrasAntes = estado.dados.compatibilidade.slice();

  campo.opcoes = campo.opcoes.filter((v) => v !== valor);
  estado.dados.compatibilidade = estado.dados.compatibilidade.filter((regra) =>
    !(regra.quando.campo === campoId && regra.quando.valor === valor) &&
    !(regra.bloqueia.campo === campoId && regra.bloqueia.valor === valor));
  podarSelecao();

  if (await salvar()) {
    render();
    status('Valor removido.');
  } else {
    campo.opcoes = opcoesAntes;
    estado.dados.compatibilidade = regrasAntes;
  }
}

// ---------- compatibilidade ----------

function opcoesCampos() {
  return estado.dados.campos
    .map((campo) => `<option value="${esc(campo.id)}">${esc(campo.rotulo)}</option>`)
    .join('');
}

function preencherValores(idCampo, idValor) {
  const campo = estado.dados.campos.find((c) => c.id === document.getElementById(idCampo).value);
  const select = document.getElementById(idValor);
  select.innerHTML = campo
    ? campo.opcoes.map((valor) => `<option value="${esc(valor)}">${esc(valor)}</option>`).join('')
    : '';
}

function renderCompatibilidade(alvo) {
  const d = estado.dados;
  const rotulo = (id) => {
    const campo = d.campos.find((c) => c.id === id);
    return campo ? campo.rotulo : id;
  };

  alvo.innerHTML = `
    <form id="form-compat" class="cartao">
      <h2>Nova regra</h2>
      <div class="linha-regra">
        <label class="campo"><span>Se</span><select id="c-quando-campo">${opcoesCampos()}</select></label>
        <label class="campo"><span>for igual a</span><select id="c-quando-valor"></select></label>
        <span class="seta">→</span>
        <label class="campo"><span>Bloquear</span><select id="c-bloqueia-campo">${opcoesCampos()}</select></label>
        <label class="campo"><span>valor</span><select id="c-bloqueia-valor"></select></label>
        <button type="submit" class="primario">Adicionar</button>
      </div>
    </form>

    <section class="cartao">
      <h2>Regras ativas</h2>
      ${d.compatibilidade.length ? d.compatibilidade.map((regra, indice) => `
        <div class="regra">
          <span>Se <strong>${esc(rotulo(regra.quando.campo))}</strong> = ${esc(regra.quando.valor)}
            → bloqueia <strong>${esc(rotulo(regra.bloqueia.campo))}</strong> = ${esc(regra.bloqueia.valor)}</span>
          <button type="button" class="secundario mini" data-remover-regra="${indice}">Remover</button>
        </div>`).join('') : '<p class="vazio">Nenhuma regra.</p>'}
    </section>`;

  preencherValores('c-quando-campo', 'c-quando-valor');
  preencherValores('c-bloqueia-campo', 'c-bloqueia-valor');
}

async function adicionarRegra(ev) {
  ev.preventDefault();
  const quando = {
    campo: document.getElementById('c-quando-campo').value,
    valor: document.getElementById('c-quando-valor').value,
  };
  const bloqueia = {
    campo: document.getElementById('c-bloqueia-campo').value,
    valor: document.getElementById('c-bloqueia-valor').value,
  };
  if (!quando.campo || !quando.valor || !bloqueia.campo || !bloqueia.valor) {
    status('Erro: escolha os quatro campos.');
    return;
  }
  const existe = estado.dados.compatibilidade.some((regra) =>
    regra.quando.campo === quando.campo && regra.quando.valor === quando.valor &&
    regra.bloqueia.campo === bloqueia.campo && regra.bloqueia.valor === bloqueia.valor);
  if (existe) {
    status('Erro: essa regra já existe.');
    return;
  }
  estado.dados.compatibilidade.push({ quando, bloqueia });
  if (await salvar()) {
    render();
    status('Regra adicionada.');
  } else {
    estado.dados.compatibilidade.pop();
  }
}

async function removerRegra(indice) {
  const regrasAntes = estado.dados.compatibilidade.slice();
  const removida = estado.dados.compatibilidade.splice(indice, 1)[0];
  if (!removida) return;
  if (await salvar()) {
    render();
    status('Regra removida.');
  } else {
    estado.dados.compatibilidade = regrasAntes;
  }
}

// ---------- template ----------

function renderTemplate(alvo) {
  const d = estado.dados;
  const ids = d.campos.map((c) => c.id);
  const usados = N.placeholders(d.template);
  const desconhecidos = usados.filter((p) => ids.indexOf(p) === -1);
  const semUso = ids.filter((id) => usados.indexOf(id) === -1);

  alvo.innerHTML = `
    <form id="form-template" class="cartao">
      <h2>Template da descrição</h2>
      <p class="dica">Use <code>{campo}</code> para inserir o valor escolhido.</p>
      <textarea id="template" rows="6" aria-label="Template da descrição">${esc(d.template)}</textarea>
      <div class="acoes"><button type="submit" class="primario">Salvar template</button></div>
      ${desconhecidos.length ? `<p class="aviso">Placeholders sem campo: ${desconhecidos.map((p) => '{' + esc(p) + '}').join(', ')}</p>` : ''}
      ${semUso.length ? `<p class="dica">Campos fora do template: ${semUso.map(esc).join(', ')}</p>` : ''}
    </form>

    <section class="cartao">
      <h2>Campos disponíveis</h2>
      <div class="valores">
        ${d.campos.map((campo) => `<span class="valor">{${esc(campo.id)}}</span>`).join('')}
      </div>
    </section>`;
}

async function salvarTemplate(ev) {
  ev.preventDefault();
  const antes = estado.dados.template;
  estado.dados.template = document.getElementById('template').value.trim();
  if (!estado.dados.template) {
    status('Erro: o template não pode ficar vazio.');
    estado.dados.template = antes;
    return;
  }
  if (await salvar()) {
    render();
    status('Template salvo.');
  } else {
    estado.dados.template = antes;
  }
}

// ---------- eventos ----------

function aoMudar(ev) {
  const alvo = ev.target;

  if (alvo.matches('select[data-campo]')) {
    const campo = alvo.dataset.campo;
    if (alvo.value) estado.valores[campo] = alvo.value;
    else delete estado.valores[campo];
    estado.aviso = '';
    aplicar();
    return;
  }

  if (alvo.id === 'c-quando-campo') preencherValores('c-quando-campo', 'c-quando-valor');
  if (alvo.id === 'c-bloqueia-campo') preencherValores('c-bloqueia-campo', 'c-bloqueia-valor');
}

function aoDigitar(ev) {
  if (ev.target.id !== 'busca') return;
  estado.busca = ev.target.value;
  filtrarLista();
}

function aoEnviar(ev) {
  const form = ev.target;
  if (form.id === 'form') return cadastrar(ev);
  if (form.id === 'form-compat') return adicionarRegra(ev);
  if (form.id === 'form-template') return salvarTemplate(ev);
  if (form.classList.contains('adicionar')) {
    ev.preventDefault();
    return adicionarOpcao(form);
  }
}

function aoClicar(ev) {
  const botao = ev.target.closest('button');
  if (!botao) return;
  const d = botao.dataset;

  if (botao.id === 'limpar') {
    estado.valores = {};
    estado.aviso = '';
    aplicar();
    return;
  }
  if (botao.id === 'exportar') return exportarCsv();

  if (d.copiarDescricao) {
    const cadastro = estado.dados.cadastros.find((c) => c.codigo === d.copiarDescricao);
    if (cadastro) copiar(cadastro.descricao, 'Descrição copiada.');
    return;
  }
  if (d.copiarCodigo) return copiar(d.copiarCodigo, 'Código copiado.');
  if (d.excluir) return excluir(d.excluir);

  if (d.removerValor !== undefined) return removerOpcao(d.campoAlvo, d.removerValor);
  if (d.removerRegra !== undefined) return removerRegra(Number(d.removerRegra));
}
