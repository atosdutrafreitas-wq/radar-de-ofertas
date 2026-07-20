// Barra de admin: so aparece se o navegador ja estiver autenticado (via login no
// painel.html) com a conta admin. Visitantes e parceiros nunca fazem login,
// entao nunca veem isso — nao e so estetica escondida, e checagem real de sessao.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const ADMIN_EMAIL = "atosdutrafreitas@gmail.com";
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== ADMIN_EMAIL) return;
  const barra = document.createElement('div');
  barra.style.cssText = 'position:sticky;top:0;left:0;right:0;z-index:9998;'
    + 'background:#12161E;border-bottom:1px solid #232B36;padding:9px 16px;'
    + 'display:flex;flex-wrap:wrap;align-items:center;gap:16px;'
    + "font-family:'Cascadia Code','Consolas','SFMono-Regular',Menlo,monospace;font-size:0.72rem;";
  barra.innerHTML = `
    <span style="color:#22E6C8; text-transform:uppercase; letter-spacing:0.06em;">Admin</span>
    <a href="/achados/painel.html" style="color:#E9EEF3; text-decoration:none; border-bottom:1px solid #232B36;">Painel de análise</a>
    <a href="https://github.com/atosdutrafreitas-wq/achados/upload/main/fila" target="_blank" rel="noopener" style="color:#E9EEF3; text-decoration:none; border-bottom:1px solid #232B36;">Enviar publicações</a>
  `;
  document.body.prepend(barra);
});
