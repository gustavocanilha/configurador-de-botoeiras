'use strict';

// Servidor local do Configurador de Botoeiras. Sem dependências: só Node.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORTA = Number(process.env.PORTA) || 8787;
const RAIZ = __dirname;
const DADOS = path.join(RAIZ, 'dados.json');
const LIMITE_CORPO = 5 * 1024 * 1024;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function responder(res, codigo, corpo, tipo) {
  const cabecalhos = tipo ? { 'Content-Type': tipo, 'Cache-Control': 'no-store' } : {};
  res.writeHead(codigo, cabecalhos);
  res.end(corpo);
}

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let total = 0;
    const partes = [];
    req.on('data', (pedaco) => {
      total += pedaco.length;
      if (total > LIMITE_CORPO) {
        falha(new Error('Corpo grande demais'));
        req.destroy();
        return;
      }
      partes.push(pedaco);
    });
    req.on('end', () => ok(Buffer.concat(partes).toString('utf8')));
    req.on('error', falha);
  });
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/api/dados') {
      if (req.method === 'GET') {
        return responder(res, 200, fs.readFileSync(DADOS), TIPOS['.json']);
      }
      if (req.method === 'PUT') {
        const corpo = await lerCorpo(req);
        try {
          JSON.parse(corpo); // não grava JSON inválido
        } catch (erro) {
          return responder(res, 400, 'JSON inválido: ' + erro.message);
        }
        const temporario = DADOS + '.tmp';
        fs.writeFileSync(temporario, corpo);
        fs.renameSync(temporario, DADOS);
        return responder(res, 204, '');
      }
      res.setHeader('Allow', 'GET, PUT');
      return responder(res, 405, 'Método não permitido');
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return responder(res, 405, 'Método não permitido');
    }

    const pedido = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const arquivo = path.resolve(RAIZ, pedido);
    if (arquivo !== RAIZ && !arquivo.startsWith(RAIZ + path.sep)) {
      return responder(res, 403, 'Fora da pasta do projeto');
    }
    if (!fs.existsSync(arquivo) || !fs.statSync(arquivo).isFile()) {
      return responder(res, 404, 'Arquivo não encontrado');
    }
    const tipo = TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
    return responder(res, 200, fs.readFileSync(arquivo), tipo);
  } catch (erro) {
    console.error(erro.message);
    return responder(res, 500, 'Erro: ' + erro.message);
  }
});

servidor.on('error', (erro) => {
  if (erro.code === 'EADDRINUSE') {
    console.error('A porta ' + PORTA + ' já está em uso. Feche o outro Configurador e tente de novo.');
  } else {
    console.error(erro);
  }
  process.exit(1);
});

servidor.listen(PORTA, '127.0.0.1', () => {
  const endereco = 'http://localhost:' + PORTA;
  console.log('Configurador de Botoeiras em ' + endereco);
  console.log('Feche esta janela para encerrar.');
  if (process.env.SEM_ABRIR) return;
  const abrir = process.platform === 'win32' ? 'start "" "' + endereco + '"'
    : process.platform === 'darwin' ? 'open "' + endereco + '"'
    : 'xdg-open "' + endereco + '"';
  exec(abrir);
});
