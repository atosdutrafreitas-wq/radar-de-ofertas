// Instrumenta cliques em anuncios de parceiro. Uso: em qualquer link de anuncio (produto colado
// a mao ou servico renderizado ao vivo), adicione data-anuncio-id="..." e data-parceiro-id="..."
// (alem de target="_blank" rel="noopener sponsored", pra abertura em nova aba dar tempo do
// registro assincrono chegar no Firestore antes da aba original navegar/fechar).
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

function mesAnoAtual() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export function instrumentarCliques(raiz = document) {
  raiz.querySelectorAll('[data-anuncio-id][data-parceiro-id]').forEach(link => {
    if (link.dataset.cliqueInstrumentado) return;
    link.dataset.cliqueInstrumentado = '1';
    link.addEventListener('click', () => {
      addDoc(collection(db, 'cliques'), {
        anuncioId: link.dataset.anuncioId,
        parceiroId: link.dataset.parceiroId,
        ts: serverTimestamp(),
        mesAno: mesAnoAtual()
      }).catch(() => { /* clique nao registrado, mas nunca bloqueia a navegacao do usuario */ });
    });
  });
}

instrumentarCliques();
