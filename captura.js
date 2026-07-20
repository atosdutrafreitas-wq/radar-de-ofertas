// Captura de contato de visitantes (index.html). Escreve em captura_visitantes, usa a mesma
// app do Firebase ja inicializada nos outros modulos (cliques.js, busca-log.js).
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById('captura-form');
const feedback = document.getElementById('captura-feedback');

if (form) {
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const contatoInput = document.getElementById('captura-contato');
    const nomeInput = document.getElementById('captura-nome');
    const contato = contatoInput.value.trim();
    const nome = nomeInput.value.trim();

    if (!contato) {
      feedback.textContent = 'Informe um e-mail ou WhatsApp.';
      feedback.className = 'captura-feedback erro';
      return;
    }

    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    feedback.textContent = '';
    feedback.className = 'captura-feedback';

    try {
      await addDoc(collection(db, 'captura_visitantes'), {
        contato,
        nome: nome || null,
        criado_em: serverTimestamp()
      });
      feedback.textContent = 'Prontinho! Você vai receber os melhores achados.';
      feedback.className = 'captura-feedback sucesso';
      form.reset();
    } catch (e) {
      feedback.textContent = 'Não deu pra registrar agora — tenta de novo em instantes.';
      feedback.className = 'captura-feedback erro';
    } finally {
      botao.disabled = false;
    }
  });
}
