# Beauty Hub — recuperação do deploy de produção

Este repositório foi reconstruído em 11/10/2026 a partir do deploy público da Beauty Hub ainda disponível na Vercel.

## Origem recuperada

- Projeto Vercel: `beautyhuboficial`
- Deploy de produção: `dpl_DkciFmA3mvWZ2KkSzk9C4hRMu7dT`
- Repositório de origem registrado pelo deploy: `F1227TG/Beauty-Hub-Oficial`
- Branch registrada: `main`
- Commit original registrado pela Vercel: `35382b17c24b729a1e0671cc45c4e75d3e26ff9e`
- Mensagem do commit: `Beauty Hub - Plataforma de Agendamento e Gestão para Profissionais de Beleza versão 1.0.0`

O histórico Git original não pôde ser restaurado porque o repositório havia sido recriado vazio. Os arquivos públicos de produção, porém, foram recuperados diretamente do deploy.

## Arquivos binários

Os arquivos HTML, CSS, JavaScript e SVG públicos foram restaurados diretamente.

As imagens WebP são binárias e não podem ser gravadas de forma segura pelo mecanismo textual usado na recuperação. Foi adicionada a action:

`.github/workflows/recover-assets.yml`

Ela baixa os arquivos ainda disponíveis no deploy de produção e os adiciona ao repositório.

Imagens esperadas:

- `assets/images/beauty-hero-desktop.webp`
- `assets/images/category-hair.webp`
- `assets/images/category-nails.webp`
- `assets/images/category-brows.webp`
- `assets/images/category-makeup.webp`
- `assets/images/beauty-salon-cover.webp`
- `assets/images/beauty-auth-panel.webp`

No GitHub, abra **Actions > Recover Beauty Hub production assets > Run workflow** enquanto o deploy antigo continuar disponível.

## Limitações

Esta recuperação representa o que estava publicado. Arquivos que existiam apenas localmente, segredos, `.env`, documentação não publicada, branches e histórico antigo não podem ser reconstruídos a partir de um deploy estático.
