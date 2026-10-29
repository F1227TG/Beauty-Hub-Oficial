# Beauty Hub 1.2.0

Plataforma com contas e operações persistidas no Supabase próprio. Site: https://beautyhuboficial.vercel.app.

Clientes podem buscar negócios, favoritar, solicitar e aceitar orçamentos, agendar, remarcar, cancelar e avaliar atendimentos concluídos. Profissionais podem cadastrar negócios, serviços com preço fixo ou orçamento, equipe, disponibilidade e bloqueios; acompanhar agenda, clientes e recebimentos manuais.

Atendimento no espaço, em domicílio ou ambos, com cobertura e deslocamento. O banco valida preços, permissões, horários e transições de estado. As páginas operacionais não apresentam dados demonstrativos como dados reais.

## Arquitetura

As áreas operacionais usam `css/operations-experience.css` e `js/operations-experience.js` para cabeçalhos, cartões, entrada suave ao rolar, busca instantânea e navegação mobile. Animações podem ser pausadas; a preferência fica salva e a redução de movimento do dispositivo tem prioridade. O conteúdo continua acessível sem animação.

HTML/CSS e módulos JavaScript. `js/operations.js` e `js/operations-api.js` conectam a interface ao Supabase Auth, Data API, RLS e funções transacionais PostgreSQL. A API e as contas são independentes do Barber Hub. `api/public-config.js` expõe somente configuração pública do CAPTCHA.

`supabase/migrations/` contém o histórico real; o bootstrap antigo está arquivado e não deve ser aplicado. `scripts/build.cjs` publica apenas HTML e recursos públicos.

## Verificação

```sh
npm ci
npx playwright install chromium
npm run check:database
npm run check:google
npm run check:captcha
npm run check:operations
npm run build
```

Use `vercel dev` para desenvolvimento com o endpoint de configuração. Servidor estático isolado não atende `/api/public-config`. Testes usam fixtures de navegador e PostgreSQL/PGlite; não comprovam entrega de e-mail ou consentimento Google em produção.

## Configuração e limites

Consulte [operação e ativação](docs/OPERACAO-2026-10-28.md). Google e Cloudflare precisam de configuração externa. Confirmação de e-mail está habilitada, mas entrega real ainda precisa de homologação.

Não há processamento de cartão, repasses, chat ou convites de equipe com contas individuais. Equipe representa profissionais agendáveis; registrar membro não concede acesso administrativo. Recebimentos são manuais. Listagens têm limites e ainda não têm paginação. Há controles de texto, contraste, teclado, foco e movimento reduzido; isso não equivale a certificação de acessibilidade.
