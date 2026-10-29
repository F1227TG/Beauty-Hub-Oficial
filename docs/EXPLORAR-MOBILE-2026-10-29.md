# Explorar e experiência mobile — 1.2.1

Busca por serviço, profissional e cidade, filtros de categoria, modalidade, tipo de preço, faixa de preço e avaliação. Ordenação por nome, avaliação ou menor preço fixo. Favoritos persistidos pelo fluxo existente. Fotos públicas dos negócios com monograma de reserva; imagens editoriais WebP são ilustrativas.

O catálogo carrega 24 negócios por lote, com botão para continuar. Busca e filtros consideram os lotes já carregados, com aviso visível quando há mais dados. Serviços sob orçamento não passam por filtros de preço fixo.

Celular e tablet têm barra de navegação inferior, áreas próprias de cliente/profissional, controles de toque e filtros em diálogo nativo. A barra respeita áreas seguras e se oculta com o teclado virtual. As 24 páginas compartilham `css/mobile-app.css` e `js/mobile-app.js`; não se trata de aplicativo nativo nem de cache offline de dados privados.

Validação: `npm run check:operations`, `npm run check:pricing`, `npm run build`. A suíte operacional verifica 28 interações e 192 combinações de página/largura/tema. Banco e autenticação não recebem migrações nesta entrega. A ativação externa de Google e CAPTCHA continua pendente.
