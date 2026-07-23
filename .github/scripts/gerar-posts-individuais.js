const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const REPO = path.resolve(__dirname, '..', '..');
const PROCESSADOS_DIR = path.join(REPO, 'fila', 'processados');
const BLOG_DIR = path.join(REPO, 'blog');
const BLOG_INDEX_PATH = path.join(BLOG_DIR, 'index.html');

const CAT_LABEL = { tech: 'Tech', casa: 'Casa', beleza: 'Beleza', bebe: 'Bebê' };

// Contexto real e genérico por produto — nada de review fabricado, so pontos objetivos de
// o que considerar naquele tipo de item.
const ITENS = [
  {
    arquivo: '2026-07-23T11-56-37-711Z-kit-carregador-tipo-c.json',
    slug: 'kit-carregador-tipo-c-vale-a-pena',
    eyebrow: 'Vale a pena?',
    titulo: 'Carregador Tipo C avulso vale a pena, ou é melhor o original?',
    contexto: `<p>Carregador Tipo C avulso costuma sair bem mais barato que o original de fábrica, mas a diferença de preço geralmente reflete a potência real de carga — nem todo cabo/fonte "Tipo C" entrega carregamento rápido de verdade, mesmo anunciando compatibilidade.</p>
    <p>O que olhar antes de comprar: se a fonte informa a potência em watts (quanto maior, mais rápido carrega, respeitando o limite do seu aparelho), se o cabo tem reforço nas pontas (é onde a maioria dos cabos baratos quebra primeiro) e se o anúncio menciona compatibilidade com o modelo específico do seu celular.</p>`
  },
  {
    arquivo: '2026-07-23T11-56-37-711Z-sandalia-babuche-infantil.json',
    slug: 'sandalia-infantil-o-que-observar',
    eyebrow: 'Guia rápido',
    titulo: 'Sandália infantil: conforto e segurança antes do preço',
    contexto: `<p>Em calçado infantil, o que mais importa não é só o visual — é a sola antiderrapante (essencial pra criança que corre e brinca) e o material respirável, que evita assadura em dias quentes.</p>
    <p>Vale conferir a tabela de tamanhos do vendedor antes de comprar (calçado infantil varia bastante entre marcas) e, se possível, escolher modelos com fechamento ajustável, já que pé de criança muda de largura rápido.</p>`
  },
  {
    arquivo: '2026-07-23T11-56-37-711Z-meias-infantil-meninos.json',
    slug: 'meias-infantil-kit-vale-a-pena',
    eyebrow: 'Vale a pena?',
    titulo: 'Kit de meias infantis: comprar em quantidade vale a pena?',
    contexto: `<p>Meia infantil tem alto giro — criança suja, perde e desgasta rápido — então comprar em kit costuma sair mais barato por unidade do que comprar avulso.</p>
    <p>O ponto de atenção é o material: prefira composição com maior percentual de algodão (mais respirável e menos propenso a causar alergia) e confira se o kit informa a faixa etária/tamanho de forma clara, já que "tamanho único" costuma ser impreciso nessa categoria.</p>`
  },
  {
    arquivo: '2026-07-23T11-56-37-711Z-kit-roupa-infantil-menina.json',
    slug: 'kit-roupa-infantil-menina-verao',
    eyebrow: 'Guia rápido',
    titulo: 'Kit de roupa infantil pra verão: o que conferir antes de comprar',
    contexto: `<p>Kits de roupa infantil geralmente saem mais em conta que comprar as peças separadas, mas o risco é o tamanho não bater — roupa infantil varia bastante de numeração entre fornecedores diferentes.</p>
    <p>Antes de comprar, confira a tabela de medidas (não só a idade indicada, já que crianças da mesma idade têm tamanhos bem diferentes) e prefira tecidos leves e que respiram bem pra clima quente.</p>`
  },
  {
    arquivo: '2026-07-23T11-56-37-711Z-sueter-infantil-menino.json',
    slug: 'sueter-infantil-menino-guia',
    eyebrow: 'Guia rápido',
    titulo: 'Suéter infantil: o que olhar além do preço',
    contexto: `<p>Pra dias mais frios, o suéter de tricô é uma peça de camada — funciona melhor combinado com uma roupa por baixo do que sozinho em frio intenso.</p>
    <p>Vale prestar atenção na textura do tricô (fios mais grossos tendem a coçar menos a pele sensível de criança) e conferir a tabela de tamanhos, já que criança cresce rápido e um suéter justo hoje pode não servir daqui a poucos meses.</p>`
  },
  {
    arquivo: '2026-07-23T11-56-37-711Z-organizador-mesa-4em1.json',
    slug: 'organizador-mesa-home-office-vale-a-pena',
    eyebrow: 'Vale a pena?',
    titulo: 'Organizador de mesa multifuncional: vale a pena pro home office?',
    contexto: `<p>Organizadores "tudo em um" (suporte de celular + fone + canetas) resolvem bem mesa pequena, mas o ganho real depende do que você de fato usa todo dia — um organizador cheio de compartimento pra coisa que você não tem vira só mais objeto ocupando espaço.</p>
    <p>Antes de comprar, pense no que realmente precisa organizar na sua mesa (celular em pé pra vídeo-chamada é o uso mais comum) e confira as dimensões do produto — "organizador de mesa" varia bastante de tamanho entre anúncios.</p>`
  },
  {
    arquivo: '2026-07-23T11-56-37-711Z-suporte-celular-mesa.json',
    slug: 'suporte-celular-mesa-o-que-considerar',
    eyebrow: 'Guia rápido',
    titulo: 'Suporte de celular de mesa: o que considerar antes de comprar',
    contexto: `<p>Pra quem faz vídeo-chamada, assiste conteúdo ou usa o celular como segunda tela durante o trabalho, um suporte de mesa evita segurar o aparelho por horas.</p>
    <p>O ponto mais importante costuma ser a base antiderrapante (sem isso, o suporte desliza com qualquer toque) e o ângulo de ajuste — verifique se o produto permite regular a inclinação, já que ângulo fixo nem sempre serve pra sua altura de mesa.</p>`
  },
  {
    arquivo: '2026-07-23T13-20-22-026Z-firestore-rsIUvOUEV7nF4niWb3Dt.json',
    slug: 'tapete-cozinha-antiderrapante-guia',
    eyebrow: 'Guia rápido',
    titulo: 'Tapete de cozinha: por que o antiderrapante importa mais que o design',
    contexto: `<p>Cozinha é um dos ambientes com mais risco de escorregão em casa — respingo de água e óleo tornam o piso liso, e é aí que o tapete de cozinha certo faz diferença real de segurança, não só estética.</p>
    <p>Antes de comprar, confirme se o produto é descrito como antiderrapante (não todo tapete decorativo é) e se o material é fácil de limpar/resistente a óleo — tapete que absorve mancha de gordura permanentemente perde a graça rápido.</p>`
  }
];

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function montarPostHtml({ titulo, descricao, urlPost, contexto, item }) {
  const fotoTag = item.foto_nome
    ? `<img src="${item.foto_nome}" alt="${escapeHtml(item.nota)}" loading="lazy" style="width:100%; max-width:360px; aspect-ratio:4/3; object-fit:cover; border:1px solid var(--rule); margin-bottom:14px;">`
    : '';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(titulo)} — Radar de Ofertas</title>
<meta property="og:title" content="${escapeHtml(titulo)}">
<meta property="og:description" content="${escapeHtml(descricao)}">
<meta property="og:url" content="${urlPost}">
<link rel="manifest" href="../manifest.json">
<meta name="theme-color" content="#0B0E13">
<link rel="apple-touch-icon" href="../icons/apple-touch-icon.png">
<style>
  :root{ --paper:#0B0E13; --paper-raised:#12161E; --ink:#E9EEF3; --ink-soft:#8D98A8; --rule:#232B36; --tag-red:#FF2E7A; --tag-red-ink:#1A0410; --gold:#22E6C8; --savings:#39FF88; --focus:#5B8CFF; --font-mono:'Cascadia Code','Consolas','SFMono-Regular',Menlo,monospace; }
  *{box-sizing:border-box;}
  body{ margin:0; background:var(--paper); color:var(--ink); font-family:'Calibri','Segoe UI',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
  .display{ font-family:'Bahnschrift','Arial Narrow',sans-serif; font-variation-settings:'wght' 700, 'wdth' 85; letter-spacing:0.01em; }
  a{ color:inherit; }
  :focus-visible{ outline:3px solid var(--focus); outline-offset:2px; }
  .wrap{ max-width:960px; margin:0 auto; padding:28px 20px 60px; }
  .masthead{ position:relative; display:flex; justify-content:space-between; align-items:flex-end; border-bottom:4px solid var(--ink); padding:22px 26px 14px; margin-bottom:6px; gap:16px; flex-wrap:wrap; }
  .masthead h1.display{ font-size:clamp(2.4rem,7vw,4.2rem); margin:0; text-transform:uppercase; text-wrap:balance; line-height:0.9; }
  .masthead .kicker{ font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.1em; font-size:0.72rem; color:var(--gold); margin-bottom:8px; }
  .masthead .issue{ text-align:right; font-size:0.85rem; color:var(--ink-soft); font-family:'Bahnschrift',sans-serif; text-transform:uppercase; letter-spacing:0.08em; }
  .frame{ position:absolute; width:16px; height:16px; border:2px solid var(--gold); opacity:0.6; }
  .frame.tl{ top:6px; left:6px; border-right:none; border-bottom:none; }
  .frame.tr{ top:6px; right:6px; border-left:none; border-bottom:none; }
  .rule-row{ display:flex; justify-content:space-between; font-size:0.78rem; color:var(--ink-soft); padding:8px 0 20px; border-bottom:1px dashed var(--rule); margin-bottom:22px; }
  .page{ background:var(--paper-raised); border:1px solid var(--rule); padding:24px 26px; max-width:680px; }
  .page h1{ font-family:'Bahnschrift','Arial Narrow',sans-serif; font-variation-settings:'wght' 700, 'wdth' 85; font-size:clamp(1.5rem,4vw,2.1rem); line-height:1.15; margin:0 0 14px; }
  .page p{ line-height:1.6; margin:0 0 14px; color:var(--ink); }
  .page .lede{ color:var(--ink-soft); font-style:italic; }
  .preco-box{ display:flex; align-items:center; gap:14px; margin:18px 0; flex-wrap:wrap; }
  .preco-box .preco{ font-family:'Bahnschrift',sans-serif; font-weight:700; font-size:1.4rem; }
  .cta{ display:inline-flex; justify-content:space-between; align-items:center; gap:10px; background:var(--gold); color:var(--paper); font-family:'Bahnschrift',sans-serif; text-transform:uppercase; letter-spacing:0.05em; font-size:0.85rem; padding:11px 18px; text-decoration:none; transition:transform 180ms ease, box-shadow 180ms ease; }
  .cta:hover, .cta:focus-visible{ box-shadow:0 0 16px rgba(34,230,200,0.5); transform:translateY(-2px); }
  footer{ margin-top:44px; padding-top:18px; border-top:1px dashed var(--rule); display:flex; flex-direction:column; gap:14px; font-size:0.78rem; color:var(--ink-soft); }
  footer .site-nav{ display:flex; flex-wrap:wrap; align-items:center; gap:16px; }
  footer .site-nav a{ text-decoration:none; border-bottom:1px solid var(--rule); }
  footer .site-nav a.cta-pill{ display:inline-flex; align-items:center; border:1.5px solid var(--tag-red); color:var(--tag-red); padding:5px 14px; border-radius:999px; text-transform:uppercase; letter-spacing:0.05em; font-size:0.72rem; font-family:'Bahnschrift',sans-serif; }
  .disclosure{ max-width:640px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="masthead">
    <div class="frame tl"></div>
    <div class="frame tr"></div>
    <div>
      <div class="kicker">// curadoria de ofertas &middot; guia rápido</div>
      <h1 class="display">RADAR DE OFERTAS</h1>
    </div>
    <div style="text-align:right;"><div class="issue">por Atos Freitas</div></div>
  </div>
  <div class="rule-row">
    <span><a href="index.html">Blog</a></span>
    <span>Guia rápido</span>
  </div>

  <article class="page">
    <h1>${escapeHtml(titulo)}</h1>
    ${fotoTag}
    ${contexto}
    <div class="preco-box">
      <span class="preco">${escapeHtml(item.preco || '')}</span>
      <a class="cta" href="${item.link}" target="_blank" rel="noopener sponsored">Ver oferta <span aria-hidden="true">&rarr;</span></a>
    </div>
  </article>

  <footer>
    <nav class="site-nav">
      <a href="../index.html">Ofertas</a>
      <a href="index.html">Blog</a>
      <a href="../servicos.html">Serviços</a>
      <a href="../sobre.html">Sobre</a>
      <a href="../contato.html">Contato</a>
      <a href="../politica-afiliados.html">Política de Afiliados</a>
      <a href="../privacidade.html">Privacidade</a>
      <a href="../faq.html">FAQ</a>
      <a href="../anuncie.html" class="cta-pill">Anuncie Aqui</a>
    </nav>
    <div class="bottom-row">
      <div class="disclosure">Como afiliado, ganho comissão sobre compras qualificadas feitas através dos meus links, sem custo adicional para você.</div>
    </div>
  </footer>
</div>
<script type="module" src="../admin-bar.js"></script>
</body>
</html>
`;
}

function main() {
  const $ = cheerio.load(fs.readFileSync(BLOG_INDEX_PATH, 'utf8'), { decodeEntities: false });
  const cardsHtml = [];

  ITENS.forEach(({ arquivo, slug, eyebrow, titulo, contexto }) => {
    const caminho = path.join(PROCESSADOS_DIR, arquivo);
    if (!fs.existsSync(caminho)) {
      console.log(`Aviso: ${arquivo} não encontrado, pulando.`);
      return;
    }
    const item = JSON.parse(fs.readFileSync(caminho, 'utf8'));
    const urlPost = `https://atosdutrafreitas-wq.github.io/radar-de-ofertas/blog/${slug}.html`;
    const descricao = `${titulo} — critérios reais pra decidir, com a oferta atual.`;

    fs.writeFileSync(
      path.join(BLOG_DIR, `${slug}.html`),
      montarPostHtml({ titulo, descricao, urlPost, contexto, item })
    );

    cardsHtml.push(`
    <div class="card">
      <span class="eyebrow">${escapeHtml(eyebrow)}</span>
      <h3>${escapeHtml(titulo)}</h3>
      <p class="note-line">${escapeHtml(descricao)}</p>
      <a class="cta" href="${slug}.html">Ler <span aria-hidden="true">&rarr;</span></a>
    </div>`);

    console.log(`Gerado: ${slug}.html`);
  });

  $('#grid').prepend(cardsHtml.join(''));
  fs.writeFileSync(BLOG_INDEX_PATH, $.html());
}

main();
