// Banner minimo de consentimento de cookies (LGPD). So injeta o Google Analytics
// depois de "Aceitar" — nunca antes. Preencha GA_MEASUREMENT_ID quando o GA4 estiver
// vinculado ao projeto Firebase (ver painel v2); ate la, so registra a preferencia.
(function () {
  var GA_MEASUREMENT_ID = ''; // ex: 'G-XXXXXXXXXX'
  var CHAVE = 'radar-consent';

  function carregarAnalytics() {
    if (!GA_MEASUREMENT_ID) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  var escolha = localStorage.getItem(CHAVE);
  if (escolha === 'aceito') { carregarAnalytics(); return; }
  if (escolha === 'recusado') return;

  document.addEventListener('DOMContentLoaded', function () {
    var banner = document.createElement('div');
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;' +
      'background:#12161E;border-top:1.5px solid #232B36;color:#E9EEF3;' +
      'padding:16px 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;' +
      'font-family:Calibri,"Segoe UI",system-ui,sans-serif;font-size:0.85rem;';
    banner.innerHTML =
      '<span style="max-width:520px;color:#8D98A8;">Usamos cookies pra entender, de forma agregada e anônima, como o site é usado. Você pode aceitar ou recusar — ' +
      '<a href="privacidade.html" style="color:#22E6C8;">saiba mais</a>.</span>' +
      '<span style="display:flex;gap:8px;flex-shrink:0;">' +
      '<button id="cookie-recusar" style="background:transparent;border:1.5px solid #8D98A8;color:#8D98A8;padding:8px 14px;border-radius:2px;cursor:pointer;font-family:inherit;">Recusar</button>' +
      '<button id="cookie-aceitar" style="background:#22E6C8;border:none;color:#0B0E13;padding:8px 14px;border-radius:2px;cursor:pointer;font-family:inherit;font-weight:bold;">Aceitar</button>' +
      '</span>';
    document.body.appendChild(banner);

    document.getElementById('cookie-aceitar').addEventListener('click', function () {
      localStorage.setItem(CHAVE, 'aceito');
      carregarAnalytics();
      banner.remove();
    });
    document.getElementById('cookie-recusar').addEventListener('click', function () {
      localStorage.setItem(CHAVE, 'recusado');
      banner.remove();
    });
  });
})();
