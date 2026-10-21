# Radar de Ofertas

Site de curadoria de ofertas (Mercado Livre, Shopee, Amazon): https://atosdutrafreitas-wq.github.io/radar-de-ofertas/

Hospedagem no GitHub Pages, banco no Firebase (Firestore) e automações no GitHub Actions. Tudo no plano gratuito.

## Como uma oferta entra no site

1. No `painel.html` (login do dono) você preenche link, preço, foto, nome, loja e categoria e clica em **Adicionar à fila**. Se souber o **preço original**, preencha também: o site mostra o preço riscado e o desconto (ex.: -30%). O desconto só aparece quando os dois preços são informados. A caixa "Em Alta" coloca a oferta no filtro Em Alta.
2. A Action `Processar fila de ofertas` roda a cada 15 minutos, publica o card no `index.html`, gera o guia no blog e, se configurado, avisa no Telegram.
3. A oferta fica em destaque por **48 horas**. Depois passa para a seção **Publicadas recentemente** (com aviso de que o preço pode ter mudado) e sai do site após **30 dias**.

## Canais públicos (`site-config.js`)

Preencha só com dados reais. Campo vazio = o botão/link não aparece.

- `telegram`: link do canal, ex.: `https://t.me/seu_canal`
- `whatsapp`: link `https://wa.me/55DDDNUMERO`
- `email`: endereço de contato (aparece na página Contato)

## Alertas no Telegram (opcional, gratuito)

1. No Telegram, fale com o `@BotFather`, crie um bot e copie o token.
2. Crie um canal, adicione o bot como administrador e anote o `@nome_do_canal` (ou o id numérico).
3. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   - `TELEGRAM_BOT_TOKEN` = token do bot
   - `TELEGRAM_CHAT_ID` = `@nome_do_canal`
4. Pronto: cada oferta nova publicada é enviada ao canal. Sem os secrets, nada é enviado e o resto segue normal.

## SEO

- `sitemap.xml` é regenerado pela própria Action. Envie `https://atosdutrafreitas-wq.github.io/radar-de-ofertas/sitemap.xml` no Google Search Console.
- `painel.html` tem `noindex`.
