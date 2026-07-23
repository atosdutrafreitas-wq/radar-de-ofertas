const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const REPO = path.resolve(__dirname, '..', '..');
const FILA_DIR = path.join(REPO, 'fila');
const PROCESSADOS_DIR = path.join(FILA_DIR, 'processados');
const INDEX_PATH = path.join(REPO, 'index.html');
const HISTORICO_PATH = path.join(REPO, 'historico.md');
const LEGENDAS_PATH = path.join(REPO, 'legendas.md');

const CAT_LABEL = { tech: 'Tech', casa: 'Casa', beleza: 'Beleza', bebe: 'Bebê' };
const CAT_PADRAO = 'casa';

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

function montarCardHtml(item, expiraISO) {
  const categoria = CAT_LABEL[item.categoria] ? item.categoria : CAT_PADRAO;
  const nome = item.nota && item.nota.trim() ? item.nota.trim() : labelFallback(item);
  const fotoTag = item.foto_nome
    ? `<img class="photo" src="${item.foto_nome}" alt="${escapeHtml(nome)}" loading="lazy">`
    : `<div class="no-photo">sem foto</div>`;
  const precoBloco = item.preco && String(item.preco).trim()
    ? `\n      <div class="price-row">\n        <span class="price">${escapeHtml(item.preco)}</span>\n      </div>`
    : '';

  return `    <div class="card" data-cat="${categoria}" data-link="${item.link}" data-expira="${expiraISO}" data-criado="${item.criado_em}">
      <span class="eyebrow">${CAT_LABEL[categoria]}</span>
      ${fotoTag}
      <h3>${escapeHtml(nome)}</h3>${precoBloco}
      <span class="source">${escapeHtml(item.plataforma || '')}</span>
      <a class="cta" href="${item.link}" target="_blank" rel="noopener sponsored">Ver oferta <span aria-hidden="true">&rarr;</span></a>
    </div>\n`;
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
  const pendentesArquivo = lerItensPendentesArquivo();
  const { itens: pendentesFirestore, db } = await lerItensPendentesFirestore();
  const pendentes = [...pendentesArquivo, ...pendentesFirestore];

  const $ = cheerio.load(fs.readFileSync(INDEX_PATH, 'utf8'), { decodeEntities: false });
  const $grid = $('#grid');

  // 1) Remove cards expirados
  let removidos = [];
  $grid.find('.card[data-expira]').each((_, el) => {
    const exp = $(el).attr('data-expira');
    if (exp && new Date(exp).getTime() < Date.now()) {
      const titulo = $(el).find('h3').first().text();
      removidos.push(titulo);
      $(el).remove();
    }
  });

  // 2) Publica itens novos da fila (arquivos em fila/ + docs em fila_pendente no Firestore)
  let publicados = [];
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

      const nomeFinal = item.nota && item.nota.trim() ? item.nota.trim() : labelFallback(item);
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

  const partes = [];
  if (publicados.length) partes.push(`publicados ${publicados.length} item(ns): ${publicados.join(', ')}`);
  if (removidos.length) partes.push(`removidos ${removidos.length} card(s) expirado(s): ${removidos.join(', ')}`);
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
