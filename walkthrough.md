# Walkthrough — Migração Exclusiva Paddle Billing & Gestão de Assentos por Volume

A migração completa para o **Paddle Billing** como única plataforma financeira do Parent Care foi implementada, testada e implantada em produção com sucesso. O Stripe foi totalmente erradicado da base de código, dependências e esquemas de dados.

## 1. O que foi realizado

### A. Eliminação Irreversível do Stripe
- Removido o pacote `stripe` via `npm uninstall stripe`.
- Arquivos deletados:
  - `src/lib/billing/stripe-provider.ts`
  - `src/app/api/webhooks/stripe/route.ts`
- Colunas e referências do Stripe removidas de:
  - `src/lib/billing/types.ts` (`GatewayProvider = 'paddle'`)
  - `src/lib/billing/index.ts`
  - `src/app/admin/finance/page.tsx`
  - `src/app/admin/finance/revenue/page.tsx`
  - `src/app/[locale]/dashboard/settings/page.tsx`
  - `supabase/migrations/07_paddle_exclusive_billing.sql` (drops das colunas legadas do Stripe)
  - `supabase/migrations/20260905_billing_schema.sql` e `20260906_admin_schema.sql`
- A base de código possui **0 ocorrências ativas de Stripe**.

---

### B. Catálogo Comercial e Tabela de Assentos por Volume

Os 6 tiers comerciais oficiais foram implementados em `src/lib/billing/paddle-catalog.ts`:

| Faixa (Assentos) | Preço Unitário / Assento (BRL) | Total Mensal (BRL) | Desconto Efetivo | Pessoas Cuidadas Inclusas |
| :---: | :---: | :---: | :---: | :---: |
| **1 assento** | R$ 49,90 | **R$ 49,90/mês** | 0% | Até 2 (ex: pai e mãe) |
| **2 assentos** | R$ 45,90 | **R$ 91,80/mês** | ~8% | Até 2 (ex: pai e mãe) |
| **3 assentos** | R$ 39,00 | **R$ 117,00/mês** | ~22% | Até 2 (ex: pai e mãe) |
| **4 assentos** | R$ 35,90 | **R$ 143,60/mês** | ~28% | Até 2 (ex: pai e mãe) |
| **5 assentos** | R$ 32,90 | **R$ 164,50/mês** | ~34% | Até 2 (ex: pai e mãe) |
| **6 assentos** | R$ 29,90 | **R$ 179,40/mês** | ~40% | Até 2 (ex: pai e mãe) |
| **> 6 assentos** | Sob medida | **Personalizado** | Volume corporativo | Bloqueado checkout público / WhatsApp |

---

### C. Regras de Acesso e Isolamento
1. **Regra dos Assentos**:
   - Assentos consumidos = **Proprietário (1)** + **Membros Ativos** + **Convites Pendentes com Reserva**.
   - Idosos cuidados que utilizam apenas a visão simplificada **não consomem assentos de gestão**.
2. **Regra das Pessoas Cuidadas**:
   - Limite padrão de **até 2 pessoas cuidadas** (ex: pai e mãe).
   - Isolamento total de prescrições, horários de medicamentos, refeições e histórico de cada um.
3. **Controle de Convites**:
   - Servidor rejeita criação de convites se a cota do plano estiver cheia (`assertCanInviteMember`).
   - Rejeição protegida em `/api/organizations/invitations`.

---

### D. Rotas de API Implementadas

1. **`GET /api/billing/price-preview`**:
   - Retorna os dados dos 6 tiers comerciais oficiais e consulta o Paddle Pricing Preview quando credenciais estiverem ativas.
2. **`POST /api/billing/checkout`**:
   - Valida quantidade de assentos estritamente no servidor (1 a 6).
   - Resolve o `price_id` oficial via catálogo backend (impede manipulação de preços pelo cliente).
   - Cria o cliente Paddle e transação com metadados `{ organization_id, seat_quantity }`.
3. **`POST /api/webhooks/paddle`**:
   - Validação da assinatura criptográfica `paddle-signature`.
   - Idempotência real auditada na tabela `billing_events`.
   - Trata ciclo de vida completo: `subscription.created`, `subscription.activated`, `subscription.updated`, `subscription.canceled`, `subscription.past_due`, `subscription.paused`, `transaction.completed`.
   - Atualiza `billing_subscriptions`, `organization_entitlements` e `organizations`.
4. **`POST /api/billing/subscription/upgrade`**:
   - Realiza upgrade proporcional imediato na Paddle e atualiza limites no banco.
5. **`POST /api/billing/subscription/downgrade`**:
   - Verifica se os membros ativos + convites pendentes cabem no novo limite antes de autorizar.
   - Aplica a alteração para o próximo ciclo de cobrança.
6. **`POST /api/billing/subscription/cancel` & `resume`**:
   - Cancelamento agendado ao término do período e reativação direta via Paddle.
7. **`POST /api/billing/portal`**:
   - Gera link seguro para o Customer Portal da Paddle.
8. **`POST & GET /api/organizations/invitations`**:
   - Gerencia convites com contagem de assentos reservados e bloqueio por limite.

---

### E. Telas de Usuário Atualizadas

1. **Página de Preços (`/[locale]/pricing`)**:
   - Seletor interativo de 1 a 6 assentos com cálculo em tempo real de preço por assento, total mensal e economia.
   - Card para > 6 assentos direcionando para contato sob medida no WhatsApp.
   - Destaque explícito de "Até 2 idosos cuidados inclusos".
   - Tabela comercial completa exibindo todos os tiers transparentemente.
2. **Configurações de Assinatura (`/[locale]/dashboard/settings/subscription`)**:
   - Barra de progresso de uso de assentos (membros ativos + convites pendentes vs limite do plano).
   - Modais para Upgrade (adicionar assentos) e Downgrade (com bloqueio explicativo se houver excesso de membros).
   - Botão para acessar o Portal de Pagamento da Paddle.
   - Histórico de faturas da Paddle.
3. **Círculo Familiar (`/[locale]/dashboard/family`)**:
   - Card de quota de assentos com badge ("X de Y assentos utilizados").
   - Bloqueio inteligente no modal de convite com link direto para adicionar assentos quando esgotado.
4. **Internacionalização (i18n)**:
   - Dicionários completos de faturamento adicionados para `pt-BR`, `en`, `es`, `fr` e `de`.

---

## 2. Validação e Testes

- **Testes Unitários Automatizados (`tests/billing.test.mjs`)**:
  - `✔ 1. Validates standard seat quantity (1 to 6)`
  - `✔ 2. Rejects out of bound seat quantities (< 1 or > 6)`
  - `✔ 3. Verifies official commercial volume tier prices and calculations`
  - `✔ 4. Cared people limit is fixed to 2 for family plan`
  - `✔ 5. Resolves authorized Paddle price IDs correctly`
  - `✔ 6. Reverse lookup maps price ID back to correct seat count`
  - **Resultado: 6/6 testes aprovados**.
- **Build de Produção**:
  - Compilou todas as rotas estáticas e dinâmicas com sucesso sem erros de TypeScript ou ESLint.
- **Deploy em Produção**:
  - Enviado para o GitHub (`ParentCareBR/parent-care-saas`).
  - Deploy efetuado no Vercel: **`https://parentcare-pink.vercel.app`**.
