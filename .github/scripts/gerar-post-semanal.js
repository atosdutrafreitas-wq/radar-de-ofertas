const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const REPO = path.resolve(__dirname, '..', '..');
const PROCESSADOS_DIR = path.join(REPO, 'fila', 'processados');
const BLOG_DIR = path.join(REPO, 'blog');
const BLOG_INDEX_PATH = path.join(BLOG_DIR, 'index.html');

const CAT_LABEL = { tech: 'Tech', casa: 'Casa', beleza: 'Beleza', bebe: 'Bebê' };
const DIAS_JANELA = 7;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelFallback(item) {
  try {
    const u = new URL(item.link);
    return `${item.plataforma || 'Loja'} — ${u.pathname.split('/').filter(Boolean).slice(0, 2).join('/')}`;
  } catch {
    return item.plataforma || 'Oferta';
  }
}

function lerItensDaSemana() {
  if (!fs.existsSync(PROCESSADOS_DIR)) return [];
  const limite = Date.now() - DIAS_JANELA * 24 * 3600 * 1000;
  return fs.readdirSync(PROCESSADOS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(PROCESSADOS_DIR, f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter(item => item.criado_em && new Date(item.criado_em).getTime() >= limite && item.link);
}

function formatDataBR(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function montarItemHtml(item) {
  const nome = item.nota && item.nota.trim() ? item.nota.trim() : labelFallback(item);
  const fotoTag = item.foto_nome
    ? `<img src="${item.foto_nome}" alt="${escapeHtml(nome)}" loading="lazy" style="width:100%; aspect-ratio:4/3; object-fit:cover; border:1px solid var(--rule); margin-bottom:8px;">`
    : '';
  const precoTxt = item.preco ? `<div style="font-family:'Bahnschrift',sans-serif; font-weight:700; margin-bottom:6px;">${escapeHtml(item.preco)}</div>` : '';
  return `
        <div style="border:1px solid var(--rule); background:var(--paper); padding:14px;">
          ${fotoTag}
          <h3 style="margin:0 0 6px; font-size:0.98rem; line-height:1.3;">${escapeHtml(nome)}</h3>
          ${precoTxt}
          <a class="cta" href="${item.link}" target="_blank" rel="noopener sponsored" style="width:100%;">Ver oferta <span aria-hidden="true">&rarr;</span></a>
        </div>`;
}

function montarPostHtml({ titulo, descricao, urlPost, corpoHtml }) {
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
  :root{
    --paper:#0B0E13; --paper-raised:#12161E; --ink:#E9EEF3; --ink-soft:#8D98A8;
    --rule:#232B36; --tag-red:#FF2E7A; --tag-red-ink:#1A0410; --gold:#22E6C8; --savings:#39FF88;
    --focus:#5B8CFF; --font-mono:'Cascadia Code','Consolas','SFMono-Regular',Menlo,monospace;
  }
  *{box-sizing:border-box;}
  body{ margin:0; background:var(--paper); color:var(--ink); font-family:'Calibri','Segoe UI',system-ui,sans-serif; -webkit-font-smoothing:antialiased; }
  .display{ font-family:'Bahnschrift','Arial Narrow',sans-serif; font-variation-settings:'wght' 700, 'wdth' 85; letter-spacing:0.01em; }
  a{ color:inherit; }
  :focus-visible{ outline:3px solid var(--focus); outline-offset:2px; }
  .wrap{ max-width:960px; margin:0 auto; padding:28px 20px 60px; }
  .masthead{ position:relative; display:flex; justify-content:space-between; align-items:flex-end; border-bottom:4px solid var(--ink); padding:22px 26px 14px; margin-bottom:6px; gap:16px; flex-wrap:wrap; }
  .masthead h1{ font-size:clamp(2.4rem,7vw,4.2rem); margin:0; text-transform:uppercase; text-wrap:balance; line-height:0.9; }
  .masthead .kicker{ font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.1em; font-size:0.72rem; color:var(--gold); margin-bottom:8px; }
  .masthead .issue{ text-align:right; font-size:0.85rem; color:var(--ink-soft); font-family:'Bahnschrift',sans-serif; text-transform:uppercase; letter-spacing:0.08em; }
  .frame{ position:absolute; width:16px; height:16px; border:2px solid var(--gold); opacity:0.6; }
  .frame.tl{ top:6px; left:6px; border-right:none; border-bottom:none; }
  .frame.tr{ top:6px; right:6px; border-left:none; border-bottom:none; }
  .rule-row{ display:flex; justify-content:space-between; font-size:0.78rem; color:var(--ink-soft); padding:8px 0 20px; border-bottom:1px dashed var(--rule); margin-bottom:22px; }
  .page{ background:var(--paper-raised); border:1px solid var(--rule); padding:24px 26px; max-width:760px; }
  .page h1{ font-family:'Bahnschrift','Arial Narrow',sans-serif; font-variation-settings:'wght' 700, 'wdth' 85; font-size:clamp(1.5rem,4vw,2.1rem); line-height:1.15; margin:0 0 14px; }
  .page h2{ font-family:'Bahnschrift',sans-serif; text-transform:uppercase; letter-spacing:0.06em; font-size:1.1rem; margin:28px 0 14px; color:var(--gold); }
  .page p{ line-height:1.6; margin:0 0 14px; color:var(--ink); }
  .page .lede{ color:var(--ink-soft); font-style:italic; }
  .grid-itens{ display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px; margin-bottom:8px; }
  .cta{ margin-top:8px; display:inline-flex; justify-content:space-between; align-items:center; background:var(--gold); color:var(--paper); font-family:'Bahnschrift',sans-serif; text-transform:uppercase; letter-spacing:0.05em; font-size:0.8rem; padding:9px 12px; text-decoration:none; transition:transform 180ms ease, box-shadow 180ms ease; }
  .cta:hover, .cta:focus-visible{ box-shadow:0 0 16px rgba(34,230,200,0.5); transform:translateY(-2px); }
  footer{ margin-top:44px; padding-top:18px; border-top:1px dashed var(--rule); display:flex; flex-direction:column; gap:14px; font-size:0.78rem; color:var(--ink-soft); }
  footer .site-nav{ display:flex; flex-wrap:wrap; align-items:center; gap:16px; }
  footer .site-nav a{ text-decoration:none; border-bottom:1px solid var(--rule); }
  footer .site-nav a.cta-pill{ display:inline-flex; align-items:center; border:1.5px solid var(--tag-red); color:var(--tag-red); padding:5px 14px; border-radius:999px; text-transform:uppercase; letter-spacing:0.05em; font-size:0.72rem; font-family:'Bahnschrift',sans-serif; }
  footer .bottom-row{ display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; }
  .disclosure{ max-width:640px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="masthead">
    <div class="frame tl"></div>
    <div class="frame tr"></div>
    <div>
      <div class="kicker">// curadoria de ofertas &middot; achados da semana</div>
      <h1 class="display">RADAR DE OFERTAS</h1>
    </div>
    <div style="text-align:right;">
      <div class="issue">por Atos Freitas</div>
    </div>
  </div>
  <div class="rule-row">
    <span><a href="index.html">Blog</a></span>
    <span>Resumo semanal</span>
  </div>

  <article class="page">
    <h1>${escapeHtml(titulo)}</h1>
    <p class="lede">${escapeHtml(descricao)}</p>
    ${corpoHtml}
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
</body>
</html>
`;
}

function main() {
  const itens = lerItensDaSemana();
  if (!itens.length) {
    console.log('Sem itens publicados nos últimos 7 dias — não há resumo semanal pra gerar.');
    return;
  }

  const porCategoria = {};
  itens.forEach(item => {
    const cat = CAT_LABEL[item.categoria] ? item.categoria : 'casa';
    (porCategoria[cat] = porCategoria[cat] || []).push(item);
  });

  const hoje = new Date();
  const inicioJanela = new Date(hoje.getTime() - DIAS_JANELA * 24 * 3600 * 1000);
  const titulo = `Achados da Semana — ${formatDataBR(inicioJanela)} a ${formatDataBR(hoje)}`;
  const categorias = Object.keys(porCategoria);
  const descricao = `Essa semana separamos ${itens.length} ofertas em ${categorias.length} categoria(s): ${categorias.map(c => CAT_LABEL[c]).join(', ')}. Preços e links conferidos no momento da publicação.`;

  const corpoHtml = categorias.map(cat => `
    <h2>${CAT_LABEL[cat]}</h2>
    <div class="grid-itens">${porCategoria[cat].map(montarItemHtml).join('')}
    </div>`).join('\n');

  const slug = `achados-semana-${hoje.toISOString().slice(0, 10)}.html`;
  const urlPost = `https://atosdutrafreitas-wq.github.io/radar-de-ofertas/blog/${slug}`;

  fs.writeFileSync(path.join(BLOG_DIR, slug), montarPostHtml({ titulo, descricao, urlPost, corpoHtml }));

  // Atualiza blog/index.html: adiciona o card do novo post e some com o estado "vazio"
  const $ = cheerio.load(fs.readFileSync(BLOG_INDEX_PATH, 'utf8'), { decodeEntities: false });
  $('#vazio-blog').remove();
  const cardHtml = `
    <div class="card">
      <span class="eyebrow">Achados da Semana &middot; ${formatDataBR(hoje)}</span>
      <h3>${escapeHtml(titulo)}</h3>
      <p class="note-line">${escapeHtml(descricao)}</p>
      <a class="cta" href="${slug}">Ler <span aria-hidden="true">&rarr;</span></a>
    </div>`;
  $('#grid').prepend(cardHtml);
  fs.writeFileSync(BLOG_INDEX_PATH, $.html());

  console.log(`Post semanal gerado: ${slug} (${itens.length} itens, ${categorias.length} categorias).`);
}

main();
