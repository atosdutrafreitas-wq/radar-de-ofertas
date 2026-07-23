# Histórico

- 2026-07-23: publicados 9 itens reais da Shopee de uma vez (primeira leva de conteúdo desde o lançamento): "Fone de Ouvido Bluetooth Sem Fio J760 - Cancelamento de Ruído Conforto+" (Tech, R$ 39,36), "{ORIGINAL} Kit Carregador Cabo e Fonte Tipo C - XR, 11, 12, 13, 14" (Tech, R$ 56,95), "Fone de Ouvido SPOETRY com Cancelamento de Ruído - Estudo, Home Office e Trabalho" (Tech, R$ 65,00), "Sandália Babuche Infantil Menina - Leve e Macia" (Bebê, R$ 22,90), "Kit Meias Infantil Meninos Cano Médio Algodão" (Bebê, R$ 11,88), "Kit Premium 6 Peças Roupa Infantil Menina Verão (2 a 12 Anos)" (Bebê, R$ 49,90), "Kit Suéter Infantil Tricô Menino (1 a 8 Anos)" (Bebê, R$ 53,10), "Kit Organizador de Mesa 4 em 1 Premium - Suporte Headset, Celular e Porta Canetas" (Casa, R$ 41,00), "Suporte Celular de Mesa Universal Ergonômico - Base Antiderrapante" (Casa, R$ 24,90). Todos com foto, nome e preço reais fornecidos manualmente (o link da Shopee não expõe dados sem JS, scraping automático não é viável). Expiram em 48h (2026-07-25T11:56:37.711Z).

- 2026-07-23: fila vazia, nenhum item novo pendente.

- 2026-07-22: fila `fila/` vazia, nenhum item novo pendente. Nenhum card no `index.html` com `data-expira` vencido nesta execução.

- 2026-07-21: fila `fila/` vazia, nenhum item novo pendente. Nenhum card no `index.html` com `data-expira` vencido nesta execução.

- 2026-07-20: fila `fila/` vazia, nenhum item novo pendente. Nenhum card no `index.html` com `data-expira` vencido nesta execução.

- 2026-07-16: fila `fila/` vazia (nenhum item novo pendente). Removido o card expirado "Mercado Livre — /p/MLB64186498" (categoria casa, `data-expira="2026-07-15T15:53:18.840Z"`, vencido antes desta execução).

- 2026-07-13: item da fila `2026-07-13T15-53-18-837Z.json` (Mercado Livre) não foi publicado — o envio veio sem nome/nota do produto, e o link (`https://www.mercadolivre.com.br/p/MLB64186498?...`) não pôde ser acessado para identificar o produto: a política de rede deste ambiente bloqueou o acesso a mercadolivre.com.br e api.mercadolibre.com (403 no proxy de saída). Arquivo mantido em `fila/` — adicione uma "nota" com o nome do produto para que ele seja publicado na próxima execução, ou aguarde nova tentativa.
- 2026-07-13: publicado o item da fila `2026-07-13T15-53-18-837Z.json` (Mercado Livre, sem nome/nota) usando rótulo de fallback "Mercado Livre — /p/MLB64186498" (plataforma + início do caminho do link), categoria casa (padrão, sem contexto para classificar), sem foto (placeholder "sem foto") e sem preço (não informado). Expira em 2026-07-15T15:53:18.840Z (criado_em + 48h). Removidos os 6 cards fictícios de exemplo (Fone Bluetooth, Air Fryer, Organizador de Gaveta, Escova Secadora, Garrafa Térmica, Kit Mordedores) por ser a primeira publicação real. index.html reestruturado para documento HTML completo (doctype/html/head/body + meta tags Open Graph). Arquivo movido para `fila/processados/`.
