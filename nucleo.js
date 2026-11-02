// Regras puras do configurador. Sem DOM, para poderem ser testadas no Node.
(function (raiz) {
  'use strict';

  function formatarCodigo(prefixo, numero) {
    return prefixo + '.' + String(numero).padStart(4, '0');
  }

  // Identidade de uma configuração: os campos escolhidos, independentes da ordem.
  function chaveDe(valores) {
    return JSON.stringify(Object.keys(valores).sort().map(function (k) {
      return [k, valores[k]];
    }));
  }

  // Mapa campo -> valores bloqueados pela seleção atual.
  function bloqueados(dados, valores) {
    var mapa = {};
    (dados.compatibilidade || []).forEach(function (regra) {
      if (valores[regra.quando.campo] === regra.quando.valor) {
        var lista = mapa[regra.bloqueia.campo] || (mapa[regra.bloqueia.campo] = []);
        if (lista.indexOf(regra.bloqueia.valor) === -1) lista.push(regra.bloqueia.valor);
      }
    });
    return mapa;
  }

  // Apaga seleções que ficaram incompatíveis. Devolve o que foi removido.
  function limparInvalidos(dados, valores) {
    var removidos = [];
    for (var volta = 0; volta < 10; volta++) {
      var mapa = bloqueados(dados, valores);
      var mudou = false;
      dados.campos.forEach(function (campo) {
        var valor = valores[campo.id];
        if (valor && mapa[campo.id] && mapa[campo.id].indexOf(valor) !== -1) {
          delete valores[campo.id];
          removidos.push({ campo: campo.id, rotulo: campo.rotulo, valor: valor });
          mudou = true;
        }
      });
      if (!mudou) break;
    }
    return removidos;
  }

  function gerarDescricao(template, valores) {
    return String(template).replace(/\{([a-z0-9_]+)\}/gi, function (bruto, id) {
      return Object.prototype.hasOwnProperty.call(valores, id) && valores[id] !== ''
        ? valores[id]
        : bruto;
    });
  }

  function placeholders(template) {
    var achados = [];
    String(template).replace(/\{([a-z0-9_]+)\}/gi, function (bruto, id) {
      if (achados.indexOf(id) === -1) achados.push(id);
      return bruto;
    });
    return achados;
  }

  // Próximo código livre, mesmo que o contador esteja atrasado ou adiantado.
  function proximoCodigo(cadastros, contadores, prefixo) {
    var usados = {};
    (cadastros || []).forEach(function (c) { usados[c.codigo] = true; });
    var numero = contadores[prefixo] || 1;
    while (usados[formatarCodigo(prefixo, numero)]) numero++;
    return { codigo: formatarCodigo(prefixo, numero), proximo: numero + 1 };
  }

  var api = {
    formatarCodigo: formatarCodigo,
    chaveDe: chaveDe,
    bloqueados: bloqueados,
    limparInvalidos: limparInvalidos,
    gerarDescricao: gerarDescricao,
    placeholders: placeholders,
    proximoCodigo: proximoCodigo,
  };

  raiz.Nucleo = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
