> Registro histórico: o estado atual está em [OPERACAO-2026-10-28.md](OPERACAO-2026-10-28.md).

# Preparação funcional da Beauty Hub

Diagnóstico local em 27/10/2026, a partir do commit `11bd15d` de `F1227TG/Beauty-Hub-Oficial`. Objetivo solicitado: tornar a plataforma apresentável com funções operacionais, aproximando a experiência do Barber Hub sem misturar contas ou dados entre produtos.

## Estado observado no código

| Jornada | Estado | Trabalho necessário |
| --- | --- | --- |
| Cadastro, acesso e recuperação | Formulários chamam a API Supabase; não homologados com contas reais | Validar sessão, confirmação, recuperação, perfis e retorno à tarefa original |
| Descoberta de espaços | Filtros sobre cartões fixos no HTML | Consultar catálogo persistente, implementar carregamento, vazio e erro |
| Perfil e serviços | Conteúdo ilustrativo e seleção local | Carregar espaço, serviços ativos, equipe e disponibilidade do mesmo registro |
| Agendamento | Botão final informa que falta conexão ao login | Reserva completa, resumo, autenticação contextual, confirmação e proteção contra conflitos |
| Conta e favoritos | Demonstração, alterações transitórias na tela | Persistência por usuário, desfazer remoção e estados de erro |
| Cancelamento e remarcação | Diálogos demonstrativos | Atualizar reserva e disponibilidade de forma consistente |
| Painel profissional | Indicadores e ações ilustrativos | Dados do negócio autenticado e atalhos para operações reais |
| Serviços e equipe | Ações exibem mensagens; formulários não persistem entidades | Criar, editar, ativar/desativar e validar vínculos com o negócio |
| Configuração do negócio | Parte dos campos fica em localStorage | Persistência do perfil público, horários e preferências |
| Segurança de acesso | Guard de produção; bypass de prévia em localhost | Separar demonstração explícita de autenticação operacional; validar autorização no backend |

Existe uma camada `js/api.js` com contratos para perfis, papéis, catálogo, disponibilidade, reservas, favoritos, avaliações, portfólio e notificações. A existência desses métodos não comprova que o esquema, as políticas e as funções do banco estejam implantados corretamente. O repositório atual não contém migrações de banco que permitam reconstruir e auditar esses contratos.

## Sequência de implementação

1. Definir se a apresentação terá contas e dados reais ou dados demonstrativos persistidos localmente. Essa escolha muda autenticação, armazenamento, testes e responsabilidade dos fluxos.
2. Estabelecer uma fonte única de dados e estados de carregamento/erro, sem mensagens de sucesso antes da confirmação da operação.
3. Completar cadastro do negócio, serviços, equipe e horários.
4. Completar busca → perfil → seleção → disponibilidade → confirmação → meus agendamentos.
5. Completar agenda profissional e atualização de status, cancelamento e remarcação.
6. Conectar favoritos, conta e indicadores aos mesmos dados.
7. Testar os percursos de ponta a ponta em celular e desktop, além das verificações visuais existentes.

## Critérios de aceite

- Um serviço cadastrado pelo profissional aparece no perfil público do espaço correto.
- Uma reserva confirmada aparece tanto para o cliente quanto para o profissional responsável.
- Horários indisponíveis não podem ser confirmados; reservas concorrentes são tratadas no armazenamento de produção, quando aplicável.
- Cancelamentos e remarcações atualizam as duas visões sem duplicar atendimentos.
- Mudanças persistem após recarregar a página, conforme o modo definido.
- Erros não geram confirmação falsa nem apagam os dados já preenchidos.
- Um usuário não acessa ou altera dados privados de outro negócio.
- Dados fictícios permanecem identificados e separados de dados reais.

Não foram alterados dados remotos, políticas, credenciais ou infraestrutura durante este diagnóstico. A cópia de trabalho está em `.tools/beauty-hub-functional`; a cópia anterior foi preservada porque seu Git apresenta configuração inválida.

