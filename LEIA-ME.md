# Configurador de Botoeiras

Ferramenta local para montar a descrição da botoeira e cadastrar o código dela sem repetição.

## Como abrir

Duplo clique em `iniciar.bat`. Ele sobe o servidor local e abre o navegador em `http://localhost:8787`.
Feche a janela preta (ou Ctrl+C nela) para encerrar.

Precisa de Node.js instalado (a máquina já tem). Se a porta 8787 estiver ocupada, feche o outro configurador.

## Onde ficam os dados

Tudo em `dados.json`, na própria pasta: template, listas de opções, regras de compatibilidade, contadores e cadastros. Leia e grave pelo app; editar o arquivo à mão funciona, mas o app valida menos.

Backup = copiar `dados.json`.

## Regras

- **Código**: `K2.0001`, `K2.0002`… para `Local = Cabina`; `K3.0001`… para `Local = Pavimento`. Gerado automático, nunca reaproveitado. O prefixo de cada local fica em `prefixos` no `dados.json`.
- **Duplicidade**: código repetido é impossível; a mesma combinação de campos escolhidos é bloqueada com o aviso do código existente.
- **Obrigatórios**: todos os campos precisam de valor antes de cadastrar.
- **Compatibilidade**: aba própria. A regra é "se campo X = valor V, bloqueia campo Y = valor W". Escolha incompatível fica apagada e não selecionável; se uma escolha anterior virar inválida, ela é removida com aviso.
- **Listas**: aba Opções, adicionar e remover valores por campo. Remover um valor apaga as regras que o usavam.
- **Template**: aba Template, com `{id_do_campo}`. O `Concatenador.txt` original já está embutido.

## Testes

`node teste.js` roda os testes das regras puras (código, chave de duplicidade, compatibilidade, template).

## Limitações conhecidas

- Uma pessoa por vez, sem login; o servidor só escuta em `127.0.0.1`.
- Os cadastros guardam os valores do momento; mudar as listas depois não altera registros antigos.
- O `.xlsx` serviu só de semente; o app não lê mais a planilha.
