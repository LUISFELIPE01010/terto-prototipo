# Site da Terto Usinagem

Site institucional de uma página só (Campinas/SP). É um site **estático**: HTML, CSS e JavaScript
escritos à mão, sem framework e sem banco de dados. O `build` só monta a pasta `dist/`, que é o
que vai para o ar.

Mesma base do site da TAE: a estrutura de pastas, o `build.js` e o `serve.js` são os mesmos,
com o conteúdo, as cores e a hero trocados para a Terto.

## Rodar no seu computador

```bash
npm run dev       # abre em http://localhost:4177 (arquivos como estão, bom para editar)
npm run preview   # gera a dist/ e abre em http://localhost:4178 (igual ao que vai para o ar)
```

Não precisa instalar nada para isso: só o Node.

## Publicar na Vercel

O `vercel.json` já está pronto. Na Vercel:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `SITE_URL` = o domínio real, por exemplo `https://www.tertousinagem.com.br`

O `SITE_URL` troca o domínio em todo lugar que ele aparece (canonical, Open Graph, dados
estruturados, `sitemap.xml`, `robots.txt` e `llms.txt`). Sem ele, o site usa
`https://www.tertousinagem.com.br` como padrão.

Depois de publicar, cadastre o site no **Google Search Console** e envie o
`https://SEUDOMINIO/sitemap.xml`. É o que faz o Google indexar mais rápido.

## Estrutura

```
index.html                 a página inteira (conteúdo, textos e dados estruturados)
404.html                   página de endereço não encontrado
robots.txt                 libera buscadores e robôs de IA
sitemap.xml                mapa do site
llms.txt                   resumo do site em texto, para ChatGPT, Gemini, Perplexity e Claude
vercel.json                cache, segurança e redirecionamentos de endereços antigos
build.js                   gera a dist/ (ver abaixo)
serve.js                   servidor local
assets/css/styles.css      todo o estilo, em seções numeradas
assets/js/main.js          menu, animações e o formulário que abre o WhatsApp
assets/fonts/              Inter (textos) e Poppins (títulos), hospedadas aqui
assets/img/                todas as imagens, geradas pelo script (não edite à mão)
fotos-origem/              as imagens originais + CREDITOS.txt (de onde veio cada uma)
scripts/gerar-imagens.cjs  gera assets/img/ a partir de fotos-origem/
```

## O que o `build.js` faz

1. **CSS crítico**: separa as seções do `styles.css` que aparecem na primeira tela (1 a 7 e 19),
   minifica e coloca dentro do HTML. O resto vira `assets/css/rest.css` e carrega depois, sem
   travar a primeira pintura da página.
2. **Nome com hash**: cada arquivo de `assets/` ganha um código do próprio conteúdo no nome
   (`hero-usinagem-1200.a1b2c3d4e5.avif`). Por isso a Vercel pode guardar tudo por um ano: se a
   foto mudar, o nome muda junto e o navegador baixa a nova.
3. Copia `robots.txt`, `sitemap.xml`, `llms.txt` e `404.html`, trocando o domínio.
4. Confere os dados estruturados e avisa se o FAQ do schema não bater com o FAQ que aparece na
   página. **Se aparecer "AVISO" no fim do build, leia: alguma coisa saiu do lugar.**

## Trocar as fotos

As fotos de hoje são **ilustrativas**, de banco de imagens (Pexels, licença livre para uso
comercial, sem precisar dar crédito). Elas mostram o tipo de serviço, não as peças da Terto —
e a própria seção Projetos avisa isso. O ideal é trocar por fotos reais da oficina.

A foto dos selos mecânicos e o logotipo vieram do material do próprio cliente.
De onde veio cada imagem: [`fotos-origem/CREDITOS.txt`](fotos-origem/CREDITOS.txt).

1. Salve a foto nova em `fotos-origem/`, com o mesmo nome do arquivo que você quer substituir.
   Pode ser do tamanho que for: o script corta sozinho.
2. Rode:

```bash
npm i --no-save sharp
npm run imagens
```

O script corta no formato certo, redimensiona e salva tudo em `assets/img/`, em WebP e AVIF, em
várias larguras (o navegador baixa só a que couber na tela). Ele também gera o logo com fundo
transparente, os favicons e a imagem de compartilhamento (`og-terto.jpg`).

Depois de trocar uma foto, **confira o texto `alt` dela no `index.html`**: ele descreve o que
aparece na imagem, para quem usa leitor de tela e para o Google.

Se o assunto da foto nova ficar cortado (muito em cima ou muito embaixo), ajuste o `foco` dela na
lista `FOTOS`, no começo do `scripts/gerar-imagens.cjs`: um número de `0` (corta pelo topo) a `1`
(corta pela base), sendo `0.5` o meio. A hero, por exemplo, usa `foco: 0.6`.

## Mudar textos e contatos

Tudo está no `index.html`, em português e com comentários marcando cada seção.

Se mudar o número do WhatsApp, troque em **três** lugares:

- `assets/js/main.js`, na linha `var WHATSAPP = "5519982498169";`
- todos os links `https://wa.me/5519982498169...` do `index.html`
- o telefone nos dados estruturados (o bloco `application/ld+json` no topo do `index.html`)

Ao mexer no FAQ, mude o texto **nos dois lugares**: no `<details>` visível e no bloco
`FAQPage` dos dados estruturados. O `build.js` avisa se os dois ficarem diferentes.

## O que ainda falta (informação que o cliente precisa mandar)

- **Endereço completo** da oficina — hoje o site diz só "Campinas - SP", e os dados estruturados
  não têm rua nem CEP. Com o endereço dá para colocar o mapa e melhorar a busca local.
- **Horário de atendimento** — não está no site nem no schema.
- **E-mail** e **Instagram** — não estão em lugar nenhum do site.
- **Confirmar qual dos dois números é o WhatsApp.** Hoje o site usa o (19) 98249-8169.
- **Fotos reais** das peças e da oficina, para trocar as fotos ilustrativas de banco de imagens.
