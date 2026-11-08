#!/usr/bin/env node
/* ============================================================================
   gerar-imagens.cjs — cria tudo o que esta em assets/img/ a partir das
   imagens originais guardadas em fotos-origem/.

   Quando rodar: sempre que trocar uma foto de origem (por exemplo, quando o
   cliente mandar as fotos reais da oficina).

     npm i --no-save sharp
     npm run imagens

   O que ele gera:
     - logo com fundo transparente (o arquivo original tem fundo preto)
     - favicons e icone do iPhone
     - cada foto em WebP e AVIF, em varias larguras (o navegador baixa so a que
       couber na tela)
     - a imagem de compartilhamento (og-terto.jpg, 1200x630)

   Para TROCAR uma foto: salve a nova em fotos-origem/ com o mesmo nome e rode o
   script. Ele corta sozinho no formato certo (nao precisa a foto ja vir
   cortada). Se o assunto da foto nova estiver muito em cima ou muito embaixo,
   ajuste o "foco" dela na lista FOTOS abaixo.

   De onde veio cada imagem: veja fotos-origem/CREDITOS.txt
   ============================================================================ */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RAIZ = path.resolve(__dirname, '..');
const ORIGEM = path.join(RAIZ, 'fotos-origem');
const DESTINO = path.join(RAIZ, 'assets/img');
const LOGO = path.join(ORIGEM, 'logo-terto.png');
const CATALOGO = path.join(ORIGEM, 'catalogo-selos.webp');

const NAVY = '#0b131c';
const QUALIDADE = { webp: 80, avif: 52 };

/* Cada foto: de qual arquivo sai, em que proporcao (largura / altura) e em
   quais larguras. "foco" e a parte da foto que fica no centro do corte
   ('center', 'top', 'bottom', 'north', 'south'...). */
const FOTOS = {
  // 2,25 e a proporcao da area da hero no computador (62% da largura x a altura
  // da hero). Cortar ja nessa proporcao evita o navegador cortar de novo por cima.
  'hero-usinagem':   { de: 'hero-usinagem.jpg',        proporcao: 2.25,  larguras: [640, 900, 1200, 1500, 1900], foco: 0.6 },
  'card-tornos':     { de: 'card-tornos.jpg',          proporcao: 1.65,  larguras: [420, 640, 900] },
  'card-fresamento': { de: 'card-fresamento.jpg',      proporcao: 1.65,  larguras: [420, 640, 900] },
  'card-cnc':        { de: 'card-cnc.jpg',             proporcao: 1.65,  larguras: [420, 640, 900] },
  'faixa-oficina':   { de: 'faixa-oficina.jpg',        proporcao: 2.2,   larguras: [1100, 1700, 2200] },
  'projeto-torneamento': { de: 'projeto-torneamento.jpg', proporcao: 4 / 3, larguras: [420, 640, 840] },
  'projeto-fresamento':  { de: 'projeto-fresamento.jpg',  proporcao: 4 / 3, larguras: [420, 640, 840] },
  'projeto-solda':       { de: 'projeto-solda.jpg',       proporcao: 4 / 3, larguras: [420, 640, 840] },
};

/* Do catalogo do cliente saem duas imagens: a foto larga da secao de selos e o
   quadro da galeria. Aqui o recorte e em pixels, porque a arte tem titulo em
   cima e faixa embaixo, que precisam ficar de fora. */
const DO_CATALOGO = {
  'selos-mecanicos': { area: [18, 556, 988, 452], proporcao: 2.19, larguras: [560, 900, 1200] },
  'projeto-selos':   { area: [120, 580, 600, 450], proporcao: 4 / 3, larguras: [420, 640, 840] },
};

fs.mkdirSync(DESTINO, { recursive: true });
const gerados = [];

async function salvarVariantes(nome, entrada, proporcao, larguras, foco) {
  // foco numerico (0 = topo, 0,5 = meio, 1 = base): corta na altura exata antes de
  // redimensionar. Util quando o assunto da foto nao esta no centro.
  if (typeof foco === 'number') {
    const m = await sharp(entrada).metadata();
    let w = m.width, h = Math.round(w / proporcao);
    if (h > m.height) { h = m.height; w = Math.round(h * proporcao); }
    const left = Math.round((m.width - w) / 2);
    const top = Math.max(0, Math.min(m.height - h, Math.round(m.height * foco - h / 2)));
    entrada = await sharp(entrada).extract({ left, top, width: w, height: h }).png().toBuffer();
    foco = 'centre';
  }
  for (const w of larguras) {
    const h = Math.round(w / proporcao);
    const buf = await sharp(entrada)
      .resize({ width: w, height: h, fit: 'cover', position: foco || 'centre', kernel: 'lanczos3' })
      .png().toBuffer();
    for (const [fmt, quality] of Object.entries(QUALIDADE)) {
      const arq = path.join(DESTINO, `${nome}-${w}.${fmt}`);
      await sharp(buf)[fmt]({ quality }).toFile(arq);
      gerados.push(arq);
    }
  }
}

/* ---------------------------------------------------------------- logo ---- */
async function fazerLogo() {
  const { data, info } = await sharp(LOGO).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  // caixa do desenho: tudo o que nao e preto
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] > 28) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const area = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  // o fundo preto vira transparencia: o desenho fica branco e o "brilho" de cada
  // pixel do original passa a ser a opacidade (as bordas continuam suaves)
  const alfa = await sharp(LOGO).removeAlpha().greyscale().extract(area).raw().toBuffer();
  const png = await sharp({ create: { width: area.width, height: area.height, channels: 3, background: '#ffffff' } })
    .joinChannel(alfa, { raw: { width: area.width, height: area.height, channels: 1 } })
    .png().toBuffer();

  for (const w of [200, 320, 460]) {
    const arq = path.join(DESTINO, `logo-terto-${w}.webp`);
    await sharp(png).resize({ width: w }).webp({ quality: 92, alphaQuality: 100 }).toFile(arq);
    gerados.push(arq);
  }
  const cheio = path.join(DESTINO, 'logo-terto.webp');
  await sharp(png).webp({ quality: 95, alphaQuality: 100 }).toFile(cheio);
  gerados.push(cheio);

  // favicons: logo branco sobre quadrado azul-marinho (le bem em aba clara e escura)
  for (const [arquivo, lado] of [['favicon-32.png', 32], ['favicon-64.png', 64], ['apple-touch-icon.png', 180]]) {
    const margem = Math.round(lado * 0.12);
    const marca = await sharp(png).resize({ width: lado - margem * 2, height: lado - margem * 2, fit: 'inside' }).toBuffer();
    const m = await sharp(marca).metadata();
    await sharp({ create: { width: lado, height: lado, channels: 4, background: NAVY } })
      .composite([{ input: marca, left: Math.round((lado - m.width) / 2), top: Math.round((lado - m.height) / 2) }])
      .png().toFile(path.join(DESTINO, arquivo));
    gerados.push(path.join(DESTINO, arquivo));
  }
  return png;
}

/* ------------------------------------------------- imagem de compartilhar -- */
async function fazerOg(logoPng) {
  const W = 1200, H = 630;
  const foto = await sharp(path.join(ORIGEM, FOTOS['hero-usinagem'].de))
    .resize({ width: W, height: H, fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .toBuffer();
  const veu = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
         <stop offset="0" stop-color="${NAVY}" stop-opacity="0.97"/>
         <stop offset="0.52" stop-color="${NAVY}" stop-opacity="0.9"/>
         <stop offset="1" stop-color="${NAVY}" stop-opacity="0.5"/>
       </linearGradient></defs>
       <rect width="${W}" height="${H}" fill="url(#g)"/>
       <rect x="72" y="250" width="64" height="5" fill="#0a7cf5"/>
     </svg>`);
  const texto = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <style>
         .t{font-family:Arial,Helvetica,sans-serif;font-weight:800;fill:#ffffff}
         .b{font-family:Arial,Helvetica,sans-serif;font-weight:800;fill:#0a7cf5}
         .s{font-family:Arial,Helvetica,sans-serif;font-weight:600;fill:#cfd6de}
         .k{font-family:Arial,Helvetica,sans-serif;font-weight:700;fill:#9fb3c8;letter-spacing:4px}
       </style>
       <text class="k" x="152" y="262" font-size="21">USINAGEM EM GERAL — CAMPINAS/SP</text>
       <text class="t" x="72" y="352" font-size="62">Precisão que move</text>
       <text class="b" x="72" y="424" font-size="62">a indústria.</text>
       <text class="s" x="72" y="486" font-size="27">Soluções em usinagem com qualidade e confiança.</text>
     </svg>`);
  const marca = await sharp(logoPng).resize({ width: 300 }).toBuffer();
  const arq = path.join(DESTINO, 'og-terto.jpg');
  await sharp(foto)
    .composite([{ input: veu }, { input: marca, left: 72, top: 70 }, { input: texto }])
    .jpeg({ quality: 86, mozjpeg: true }).toFile(arq);
  gerados.push(arq);
}

(async () => {
  for (const f of [LOGO, CATALOGO, ...Object.values(FOTOS).map((x) => path.join(ORIGEM, x.de))]) {
    if (!fs.existsSync(f)) throw new Error('falta a imagem de origem: ' + f);
  }
  const logoPng = await fazerLogo();

  for (const [nome, cfg] of Object.entries(FOTOS)) {
    await salvarVariantes(nome, path.join(ORIGEM, cfg.de), cfg.proporcao, cfg.larguras, cfg.foco);
  }
  for (const [nome, cfg] of Object.entries(DO_CATALOGO)) {
    const recorte = await sharp(CATALOGO)
      .extract({ left: cfg.area[0], top: cfg.area[1], width: cfg.area[2], height: cfg.area[3] })
      .png().toBuffer();
    await salvarVariantes(nome, recorte, cfg.proporcao, cfg.larguras);
  }
  await fazerOg(logoPng);

  let total = 0;
  for (const g of gerados) total += fs.statSync(g).size;
  console.log(gerados.length + ' arquivos gerados em assets/img/  (' + (total / 1024).toFixed(0) + ' kB no total)');
})();
