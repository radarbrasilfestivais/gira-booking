# Gira — Directorio de Booking Internacional

App web (PWA) em espanhol, mesma base do "Rota" — com busca e filtros sobre
2.331 agências de booking internacionais, pronto para hospedar gratuitamente
no GitHub Pages.

Este README está em português porque é você quem administra o produto —
os textos DENTRO do app (o que o cliente final vê) já estão 100% em espanhol.

## O que tem aqui

```
index.html      → estrutura da página (em espanhol)
styles.css      → visual (mesmo tema "carimbo de passaporte de turnê" do Rota)
app.js          → toda a lógica: busca, filtros, chave de acesso, PWA
data.js         → os dados das 2.331 agências, com países/nomes traduzidos pro espanhol
manifest.json   → configuração do PWA (permite "instalar" o app)
sw.js           → service worker (funcionamento offline)
icon-192.png / icon-512.png → ícones do app (marca "GIRA")
```

## Publicar no GitHub Pages

Mesmo processo do Rota — se você já publicou o Rota, é só repetir:

1. Crie um **novo** repositório no GitHub (ex: `gira-booking`) — precisa ser
   um repositório separado do Rota, já que são dois sites diferentes
2. Suba todos os arquivos desta pasta pra raiz do repositório
3. Vá em **Settings → Pages**, selecione a branch `main` e a pasta `/ (root)`
4. Salve e espere 1-2 minutos — você recebe uma URL tipo
   `https://seu-usuario.github.io/gira-booking/`

## Configurar a chave de acesso

Igual ao Rota — abra `app.js` e edite:

```js
const VALID_KEYS = [
  "GIRA-2026-MARIA01",
  "GIRA-2026-JUAN02",
  "GIRA-2026-CARLA03"
];
const BUY_LINK = "https://pay.kiwify.com.br/TU-LINK-AQUI";
```

Como você decidiu ter uma chave por comprador, o padrão sugerido é
`GIRA-2026-` + nome ou número do pedido — mesma lógica que já está rodando
no Rota, só trocando o prefixo pra não confundir os dois produtos.

**Lembre-se:** troque as chaves de exemplo e o link de compra antes de
publicar de verdade, e use o "Edit this file" do GitHub pra atualizar sempre
que fizer uma venda nova — o mesmo processo que você já usa no Rota.

## O que é diferente do Rota

- **Idioma da interface**: todo texto que o usuário vê está em espanhol
  (títulos, botões, mensagens, labels do card de detalhe)
- **Dados traduzidos**: os nomes de países (Alemanha→Alemania, Reino
  Unido→Reino Unido, etc.) aparecem em espanhol nos filtros, nos cards e
  no texto de cada agência — incluindo dentro do campo de endereço
- **Nomes de agência**: cerca de 600 agências tinham parte do nome em
  português na extração original (ex: "Empire Entertainment (escritório de
  Los Angeles)") — isso foi traduzido pro espanhol ("oficina de Los
  Ángeles"). Uma pequena margem residual (~8 casos em 2.331, bem abaixo de
  0,5%) manteve alguma palavra em português por serem nomes próprios reais
  da agência, não descrições
- **Identidade visual**: nome "GIRA" no lugar de "ROTA" (termo natural em
  espanhol pra turnê musical), mesmo ícone e paleta de cores

## O mesmo aviso de segurança do Rota se aplica aqui

Este app roda 100% no navegador, sem servidor — a chave de acesso impede
acesso casual, mas não é proteção técnica real (qualquer pessoa com
conhecimento de programação consegue ver o código-fonte e os dados). Veja o
README do Rota para a explicação completa; a mesma lógica vale aqui sem
nenhuma diferença.

## Dados

Os dados vêm da mesma extração do PDF original de 2.331 agências
(atualizada e mais precisa que a primeira versão entregue — várias
correções de qualidade foram aplicadas nos dois apps, Rota e Gira, ao mesmo
tempo). A tradução automática de nomes e países pode deixar alguma
formatação levemente diferente do que um tradutor humano nativo escreveria,
mas o conteúdo (contatos, países, gêneros) está correto e utilizável.
