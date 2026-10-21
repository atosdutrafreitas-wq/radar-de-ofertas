const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const REPO = path.resolve(__dirname, '..', '..');
const FILA_DIR = path.join(REPO, 'fila');
const PROCESSADOS_DIR = path.join(FILA_DIR, 'processados');
const INDEX_PATH = path.join(REPO, 'index.html');
const HISTORICO_PATH = path.join(REPO, 'historico.md');
const LEGENDAS_PATH = path.join(REPO, 'legendas.md');
const BLOG_DIR = path.join(REPO, 'blog');
const BLOG_INDEX_PATH = path.join(BLOG_DIR, 'index.html');
const SITE_URL = 'https://atosdutrafreitas-wq.github.io/radar-de-ofertas';

const CAT_LABEL = { tech: 'Tech', casa: 'Casa', beleza: 'Beleza', bebe: 'Bebê' };
const CAT_PADRAO = 'casa';

// Contexto generico e honesto por categoria — pontos reais de "o que considerar antes de
// comprar", sem alegar teste pessoal ou review que nao aconteceu. Usado pra gerar o post do
// blog de cada produto novo automaticamente.
const CONTEXTO_CATEGORIA = {
  tech: 'Antes de comprar um item de tecnologia como esse, vale conferir a especificação real na descrição do anúncio (não só o título), a compatibilidade com os aparelhos que você já tem, e as avaliações de outros compradores — é o sinal mais confiável do que o produto realmente entrega.',
  casa: 'Pra itens de casa, o que mais costuma importar é a durabilidade do material e a facilidade de limpeza/manutenção no dia a dia. Vale conferir as dimensões exatas no anúncio (a foto nem sempre dá a real noção de tamanho) e as avaliações de quem já comprou.',
  beleza: 'Em produtos de beleza, confira sempre a composição/ingredientes na descrição do anúncio, principalmente se você tem pele ou cabelo sensível. Avaliações de outros compradores ajudam a confirmar se o resultado bate com o prometido.',
  bebe: 'Pra produtos infantis, segurança e conforto vêm antes de qualquer outro critério — confira se o material é apropriado pra idade da criança e a tabela de tamanho/faixa etária informada pelo vendedor, já que costuma variar bastante entre fornecedores.'
};


// Titulos vindos de marketplaces chegam com entidades quebradas ("E # 39 ; s") e espacos
// antes de pontuacao. Limpa so isso — nunca reescreve o nome que o dono informou.
function limparTexto(t) {
  return String(t || '')
    .replace(/&amp;#39;|&#39;/g, "'")
    .replace(/\s*#\s*39\s*;\s*/g, "'")
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function nomeOferta(item) {
  return item.nota && item.nota.trim() ? limparTexto(item.nota) : labelFallback(item);
}

// Aviso opcional no Telegram (gratuito). So roda se TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID
// existirem como secrets do repositorio; sem eles, nada e enviado e o resto segue normal.
async function enviarTelegram(item) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const nome = nomeOferta(item);
  const linhas = [
    `🔥 <b>${escapeHtml(nome)}</b>`,
    item.preco && String(item.preco).trim()
      ? `💰 ${escapeHtml(item.preco)}${descontoPct(item) !== null ? ` (de ${escapeHtml(item.preco_original)}, -${descontoPct(item)}%)` : ''}`
      : null,
    item.plataforma ? `🛒 ${escapeHtml(item.plataforma)}` : null,
    `👉 ${escapeHtml(item.link)}`,
    '',
    '<i>Como afiliado, posso ganhar comissão sem custo extra pra você. O preço pode mudar: confira na loja.</i>'
  ].filter(l => l !== null);
  const texto = linhas.join('\n');
  const usaFoto = item.foto_nome && /^https?:\/\//.test(item.foto_nome) && !/\.webp(\?|$)/i.test(item.foto_nome);
  const url = `https://api.telegram.org/bot${token}/${usaFoto ? 'sendPhoto' : 'sendMessage'}`;
  const corpo = usaFoto
    ? { chat_id: chat, photo: item.foto_nome, caption: texto.slice(0, 1000), parse_mode: 'HTML' }
    : { chat_id: chat, text: texto, parse_mode: 'HTML', disable_web_page_preview: false };
  try {
    let r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    if (!r.ok && usaFoto) {
      // foto recusada pelo Telegram: cai para texto simples
      r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: texto, parse_mode: 'HTML' })
      });
    }
    console.log(r.ok ? `Telegram: enviado "${nome}".` : `Telegram: falhou (${r.status}) para "${nome}".`);
  } catch (e) {
    console.log(`Telegram: erro de rede (${e.message}) — seguindo sem enviar.`);
  }
}

// sitemap.xml deterministico (sem datas) para so gerar diff quando algo muda de verdade.
function gerarSitemap() {
  const paginas = ['', 'sobre.html', 'servicos.html', 'anuncie.html', 'cadastro-anunciante.html',
    'contato.html', 'faq.html', 'politica-afiliados.html', 'privacidade.html', 'blog/'];
  if (fs.existsSync(BLOG_DIR)) {
    fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'index.html').sort().forEach(f => {
      const html = fs.readFileSync(path.join(BLOG_DIR, f), 'utf8');
      if (!/Rascunho — não publicado/.test(html)) paginas.push(`blog/${f}`);
    });
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paginas.map(p => `  <url><loc>${SITE_URL}/${p}</loc></url>`).join('\n') + '\n</urlset>\n';
  const alvo = path.join(REPO, 'sitemap.xml');
  if (!fs.existsSync(alvo) || fs.readFileSync(alvo, 'utf8') !== xml) fs.writeFileSync(alvo, xml);
}

// Ofertas expiradas (48h) ficam no site como "publicadas recentemente" e so saem depois disto.
const ARQUIVO_DIAS = 30;


// "R$ 1.234,56" -> 1234.56 (null se nao der pra ler)
function numPreco(txt) {
  const limpo = String(txt || '').replace(/[^\d,.]/g, '');
  if (!limpo) return null;
  const n = parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Desconto so existe se o dono informou os DOIS valores e o original e maior que o atual.
function descontoPct(item) {
  const atual = numPreco(item.preco);
  const original = numPreco(item.preco_original);
  if (atual === null || original === null || original <= atual) return null;
  const pct = Math.round((1 - atual / original) * 100);
  return pct >= 1 ? pct : null;
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

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

function slugify(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function montarCardHtml(item, expiraISO) {
  const categoria = CAT_LABEL[item.categoria] ? item.categoria : CAT_PADRAO;
  const nome = nomeOferta(item);
  const fotoTag = item.foto_nome
    ? `<img class="photo" src="${item.foto_nome}" alt="${escapeHtml(nome)}" loading="lazy">`
    : `<div class="no-photo">sem foto</div>`;
  const pct = descontoPct(item);
  const riscado = pct !== null ? `\n        <span class="was">${escapeHtml(item.preco_original)}</span>` : '';
  const seloDesconto = pct !== null ? `\n      <span class="tag">-${pct}%</span>` : '';
  const precoBloco = item.preco && String(item.preco).trim()
    ? `\n      <div class="price-row">\n        <span class="price">${escapeHtml(item.preco)}</span>${riscado}\n      </div>`
    : '';
  const altaAttr = item.alta ? ' data-alta="1"' : '';

  return `    <div class="card" data-cat="${categoria}"${altaAttr} data-link="${item.link}" data-expira="${expiraISO}" data-criado="${item.criado_em}">
      <span class="eyebrow">${CAT_LABEL[categoria]}</span>${seloDesconto}
      ${fotoTag}
      <h3>${escapeHtml(nome)}</h3>${precoBloco}
      <span class="source">${escapeHtml(item.plataforma || '')}</span>
      <a class="cta" href="${item.link}" target="_blank" rel="noopener sponsored">Ver oferta <span aria-hidden="true">&rarr;</span></a>
    </div>\n`;
}

function montarPostBlogHtml({ titulo, descricao, urlPost, contexto, item }) {
  const fotoTag = item.foto_nome
    ? `<img src="${item.foto_nome}" alt="${escapeHtml(item.nota || '')}" loading="lazy" style="width:100%; max-width:360px; aspect-ratio:4/3; object-fit:cover; border:1px solid var(--rule); margin-bottom:14px;">`
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  :root{ --paper:#0B0E13; --paper-raised:#12161E; --ink:#E9EEF3; --ink-soft:#8D98A8; --rule:#232B36; --tag-red:#FF2E7A; --tag-red-ink:#1A0410; --gold:#22E6C8; --savings:#39FF88; --focus:#5B8CFF; --font-mono:'JetBrains Mono','Cascadia Code','Consolas','SFMono-Regular',Menlo,monospace; }
  *{box-sizing:border-box;}
  body{ margin:0; background:var(--paper); color:var(--ink); font-family:var(--font-body); -webkit-font-smoothing:antialiased; }
  .display{ font-family:var(--font-display); letter-spacing:0.01em; }
  a{ color:inherit; }
  :focus-visible{ outline:3px solid var(--focus); outline-offset:2px; }
  .wrap{ max-width:960px; margin:0 auto; padding:28px 20px 60px; }
  .masthead{ position:relative; display:flex; justify-content:space-between; align-items:flex-end; border-bottom:4px solid var(--ink); padding:22px 26px 14px; margin-bottom:6px; gap:16px; flex-wrap:wrap; }
  .masthead h1.display{ font-size:clamp(2.4rem,7vw,4.2rem); margin:0; text-transform:uppercase; text-wrap:balance; line-height:0.9; }
  .masthead .kicker{ font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.1em; font-size:0.72rem; color:var(--gold); margin-bottom:8px; }
  .masthead .issue{ text-align:right; font-size:0.85rem; color:var(--ink-soft); font-family:var(--font-display); text-transform:uppercase; letter-spacing:0.08em; }
  .frame{ position:absolute; width:16px; height:16px; border:2px solid var(--gold); opacity:0.6; }
  .frame.tl{ top:6px; left:6px; border-right:none; border-bottom:none; }
  .frame.tr{ top:6px; right:6px; border-left:none; border-bottom:none; }
  .rule-row{ display:flex; justify-content:space-between; font-size:0.78rem; color:var(--ink-soft); padding:8px 0 20px; border-bottom:1px dashed var(--rule); margin-bottom:22px; }
  .page{ background:var(--paper-raised); border:1px solid var(--rule); padding:24px 26px; max-width:680px; }
  .page h1{ font-family:var(--font-display); font-size:clamp(1.5rem,4vw,2.1rem); line-height:1.15; margin:0 0 14px; }
  .page p{ line-height:1.6; margin:0 0 14px; color:var(--ink); }
  .page .lede{ color:var(--ink-soft); font-style:italic; }
  .preco-box{ display:flex; align-items:center; gap:14px; margin:18px 0; flex-wrap:wrap; }
  .preco-box .preco{ font-family:var(--font-display); font-weight:700; font-size:1.4rem; }
  .cta{ display:inline-flex; justify-content:space-between; align-items:center; gap:10px; background:var(--gold); color:var(--paper); font-family:var(--font-display); text-transform:uppercase; letter-spacing:0.05em; font-size:0.85rem; padding:11px 18px; text-decoration:none; transition:transform 180ms ease, box-shadow 180ms ease; }
  .cta:hover, .cta:focus-visible{ box-shadow:0 0 16px rgba(34,230,200,0.5); transform:translateY(-2px); }
  footer{ margin-top:44px; padding-top:18px; border-top:1px dashed var(--rule); display:flex; flex-direction:column; gap:14px; font-size:0.78rem; color:var(--ink-soft); }
  footer .site-nav{ display:flex; flex-wrap:wrap; align-items:center; gap:16px; }
  footer .site-nav a{ text-decoration:none; border-bottom:1px solid var(--rule); }
  footer .site-nav a.cta-pill{ display:inline-flex; align-items:center; border:1.5px solid var(--tag-red); color:var(--tag-red); padding:5px 14px; border-radius:999px; text-transform:uppercase; letter-spacing:0.05em; font-size:0.72rem; font-family:var(--font-display); }
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
    <p>${escapeHtml(contexto)}</p>
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

function gerarPostBlog(item) {
  const categoria = CAT_LABEL[item.categoria] ? item.categoria : CAT_PADRAO;
  const nome = nomeOferta(item);
  const titulo = `${nome} — o que considerar antes de comprar`;
  const descricao = `${nome}: critérios reais de compra pra essa categoria, com a oferta atual.`;
  const slugBase = slugify(nome) || slugify(item.plataforma) || 'oferta';
  const sufixo = Buffer.from(item.link).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toLowerCase();
  const slug = `${slugBase}-${sufixo}`;
  const urlPost = `${SITE_URL}/blog/${slug}.html`;
  const contexto = CONTEXTO_CATEGORIA[categoria];

  fs.mkdirSync(BLOG_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(BLOG_DIR, `${slug}.html`),
    montarPostBlogHtml({ titulo, descricao, urlPost, contexto, item })
  );

  return `
    <div class="card">
      <span class="eyebrow">${CAT_LABEL[categoria]} &middot; Guia rápido</span>
      <h3>${escapeHtml(titulo)}</h3>
      <p class="note-line">${escapeHtml(descricao)}</p>
      <a class="cta" href="${slug}.html">Ler <span aria-hidden="true">&rarr;</span></a>
    </div>`;
}

function lerItensPendentesArquivo() {
  if (!fs.existsSync(FILA_DIR)) return [];
  return fs.readdirSync(FILA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const full = path.join(FILA_DIR, f);
      try {
        const dados = JSON.parse(fs.readFileSync(full, 'utf8'));
        return { origem: 'arquivo', arquivo: f, caminho: full, dados };
      } catch (e) {
        console.log(`Aviso: ${f} nao e um JSON valido, ignorando (${e.message}).`);
        return null;
      }
    })
    .filter(Boolean);
}

async function lerItensPendentesFirestore() {
  const chave = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!chave) {
    console.log('FIREBASE_SERVICE_ACCOUNT nao configurado — pulando fila do painel (fila_pendente).');
    return { itens: [], db: null };
  }
  const admin = require('firebase-admin');
  const credencial = JSON.parse(chave);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(credencial) });
  }
  const db = admin.firestore();
  const snap = await db.collection('fila_pendente').get();
  const itens = snap.docs.map(d => {
    const dados = d.data();
    const criado = dados.criado_em && dados.criado_em.toDate ? dados.criado_em.toDate().toISOString() : new Date().toISOString();
    return { origem: 'firestore', docId: d.id, dados: { ...dados, criado_em: criado } };
  });
  return { itens, db };
}

async function main() {
  gerarSitemap();
  const pendentesArquivo = lerItensPendentesArquivo();
  const { itens: pendentesFirestore, db } = await lerItensPendentesFirestore();
  const pendentes = [...pendentesArquivo, ...pendentesFirestore];

  const $ = cheerio.load(fs.readFileSync(INDEX_PATH, 'utf8'), { decodeEntities: false });
  const $grid = $('#grid');

  // 1) Remove cards expirados
  let removidos = [];
  $grid.find('.card[data-expira]').each((_, el) => {
    const base = $(el).attr('data-criado') || $(el).attr('data-expira');
    const limite = new Date(base).getTime() + ARQUIVO_DIAS * 24 * 3600 * 1000;
    if (base && limite < Date.now()) {
      const titulo = $(el).find('h3').first().text();
      removidos.push(titulo);
      $(el).remove();
    }
  });

  // 2) Publica itens novos da fila (arquivos em fila/ + docs em fila_pendente no Firestore)
  let publicados = [];
  const novosPostsBlogHtml = [];
  const itensParaTelegram = [];
  if (pendentes.length) {
    fs.mkdirSync(PROCESSADOS_DIR, { recursive: true });
    const novosCardsHtml = [];
    const novasLegendas = [];

    for (const pendente of pendentes) {
      const dados = pendente.dados;
      if (!dados.link) {
        console.log(`Aviso: item sem campo "link" (origem: ${pendente.origem}), ignorando.`);
        continue;
      }
      const criado = dados.criado_em || new Date().toISOString();
      const expira = new Date(new Date(criado).getTime() + 48 * 3600 * 1000).toISOString();
      const item = { ...dados, criado_em: criado };

      novosCardsHtml.push(montarCardHtml(item, expira));
      itensParaTelegram.push(item);
      novosPostsBlogHtml.push(gerarPostBlog(item));

      const nomeFinal = nomeOferta(item);
      publicados.push(`"${nomeFinal}"${item.preco ? ` (${item.preco})` : ''}`);

      if (item.nota && item.preco) {
        novasLegendas.push(
          `\n## ${hoje()} — ${item.nota}\n🚨 Achei isso: ${item.nota}\nPor apenas ${item.preco} — link na bio pra conferir 👆\n#achados #ofertas #promocao #achadinhos\n`
        );
      }

      if (pendente.origem === 'arquivo') {
        fs.renameSync(pendente.caminho, path.join(PROCESSADOS_DIR, pendente.arquivo));
      } else {
        // Item veio do formulario do painel (Firestore) — grava o mesmo registro de
        // auditoria que um item vindo de fila/ teria, e apaga o pendente do Firestore.
        const nomeArquivo = `${criado.replace(/[:.]/g, '-')}-firestore-${pendente.docId}.json`;
        fs.writeFileSync(path.join(PROCESSADOS_DIR, nomeArquivo), JSON.stringify(item, null, 2) + '\n');
        await db.collection('fila_pendente').doc(pendente.docId).delete();
      }
    }

    if (novosCardsHtml.length) {
      // .after() em nó de comentário nao funciona de forma confiavel no cheerio — insere
      // sempre no topo do grid (elemento), o que garante novos itens primeiro e nao depende
      // de onde o comentario de documentacao esta.
      $grid.prepend(novosCardsHtml.join(''));
    }

    if (novasLegendas.length) {
      fs.appendFileSync(LEGENDAS_PATH, novasLegendas.join(''));
    }
  }

  if (!publicados.length && !removidos.length) {
    // Roda a cada 15min agora (antes era 1x/dia) — nao registra "fila vazia" a cada tick,
    // senao historico.md vira spam. So loga quando ha novidade de verdade.
    console.log('Nada a fazer: fila vazia e nenhum card expirado.');
    return;
  }

  fs.writeFileSync(INDEX_PATH, $.html());
  for (const it of itensParaTelegram) await enviarTelegram(it);

  if (novosPostsBlogHtml.length && fs.existsSync(BLOG_INDEX_PATH)) {
    const $blog = cheerio.load(fs.readFileSync(BLOG_INDEX_PATH, 'utf8'), { decodeEntities: false });
    $blog('#vazio-blog').remove();
    $blog('#grid').prepend(novosPostsBlogHtml.join(''));
    fs.writeFileSync(BLOG_INDEX_PATH, $blog.html());
  }

  const partes = [];
  if (publicados.length) partes.push(`publicados ${publicados.length} item(ns): ${publicados.join(', ')}`);
  if (removidos.length) partes.push(`removidos ${removidos.length} card(s) com mais de ${ARQUIVO_DIAS} dias: ${removidos.join(', ')}`);
  if (novosPostsBlogHtml.length) partes.push(`gerados ${novosPostsBlogHtml.length} post(s) no blog`);
  logHistorico(partes.join('. ') + '.');
}

function logHistorico(msg) {
  const atual = fs.readFileSync(HISTORICO_PATH, 'utf8');
  const entrada = `\n- ${hoje()}: ${msg}\n`;
  const atualizado = atual.replace(/# Histórico\r?\n/, m => m + entrada);
  fs.writeFileSync(HISTORICO_PATH, atualizado);
}

main().catch(e => {
  console.error('Falha ao processar a fila:', e);
  process.exit(1);
});
