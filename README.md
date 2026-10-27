# Beauty Hub — apresentação e experiência responsiva

Entrega local: 26/10/2026. Base: `Beauty-Hub-Oficial-main.zip` fornecido pelo usuário. O ZIP original foi preservado.

## O que mudou

- Nova composição da home: abertura editorial, categorias fotográficas, narrativa de cuidado, seleção interativa de inspirações, apresentação profissional e conexão com o ecossistema VIZU.
- Identidade própria em marfim, ameixa e rosa suave; temas claro e escuro; Montserrat local com licença OFL e títulos serifados.
- Camada compartilhada aplicada às 22 páginas: catálogo, perfil do espaço, autenticação, conta, agenda, serviços, equipe, clientes, configurações e páginas institucionais.
- Navegação mobile, foco visível, link para pular ao conteúdo, controles por teclado, movimentos reduzidos e pausa das animações.
- Layouts internos adaptados a celulares. Tabelas e agenda semanal mantêm rolagem horizontal dentro de regiões identificadas, sem alargar a página.
- Perfis, horários e indicadores de demonstração identificados nas páginas correspondentes. A home deixou de usar números de avaliações e disponibilidade inventados como prova comercial.

## Como abrir

Na pasta do projeto, com Python instalado:

```sh
python -m http.server 8080 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8080/`. Use servidor HTTP para que os módulos JavaScript funcionem; abrir o HTML diretamente por `file://` não reproduz todos os fluxos.

## Onde editar

- `index.html`: apresentação principal.
- `para-profissionais.html`: apresentação para negócios.
- `css/beauty-experience.css`: nova camada visual e adaptações responsivas, carregada depois das folhas originais.
- `js/beauty-experience.js`: menus, animações, seletor de inspirações e regiões de dados roláveis.
- `assets/fonts/`: Montserrat e sua licença.
- `tests/`: testes de navegação, interação e geometria responsiva.

As folhas anteriores continuam necessárias. Os 10 scripts JavaScript originais foram preservados byte a byte; as regras de autenticação, dados e operações não foram substituídas pelo redesign.

## Validação

```sh
npm install
npx playwright install chromium
npm run check:visual
npm run check:interactions
```

Os testes interceptam arquivos locais e bloqueiam serviços externos. Não usam credenciais nem gravam no backend.

- 22 páginas × 4 larguras (320, 390, 768, 1440) × 2 temas: **176 verificações sem overflow horizontal**, referências locais ausentes ou erros JavaScript observados.
- **12 verificações de interação**: menu/teclado, troca de inspirações, tema persistente, filtros, busca/limpeza, seleção de serviços, menu profissional, pausa de movimentos, modais profissional/cliente, visibilidade de senha e preferência de movimento reduzido.
- HTML/CSS: referências locais verificadas sem arquivos ausentes.
- Capturas desktop/mobile da home revisadas; outros exemplos de catálogo, perfil, login e painel inspecionados durante a implementação.

A suíte `check:visual` verifica geometria e recursos; não é uma comparação pixel a pixel com snapshots aprovados. Tabelas internas podem rolar horizontalmente de forma intencional. O relatório da execução fica em `test-results/`, ignorado pelo Git.

## Limites e publicação

Esta versão registra o redesign no repositório Beauty-Hub-Oficial, a partir do ZIP fornecido pelo usuário. Fluxos com dados demonstrativos ou ações de protótipo preexistentes continuam nessa condição. Autenticação remota, persistência, permissões, disponibilidade real, envio de mensagens e agendamento de produção não foram homologados por estes testes.

A automação de recuperação de imagens em `.github/workflows/recover-assets.yml` é exclusivamente manual (`workflow_dispatch`), para não substituir os assets desta versão durante um push. Este registro de código não comprova um deploy ou a homologação de produção.

O projeto original permite prévia de páginas privadas em localhost (`js/session-guard.js`). Isso foi preservado e não é evidência de autorização em produção. Antes de publicar, revisar as integrações no ambiente do Beauty Hub e os caminhos de demonstração.

O link institucional para `https://www.barberhuboficial.com.br/vizu` depende da publicação da página VIZU, ainda local no projeto Barber Hub. Os produtos mantêm contas e projetos separados.

As imagens desta entrega são as fornecidas no ZIP Beauty Hub, preservadas sem recompressão. Não foram criadas provas sociais, depoimentos ou métricas novos. O arquivo `RECOVERY.md` permanece como histórico da recuperação anterior, não como relatório deste redesign.
