# Parent Care — Status de Implementação v2.0
> Documento de Acompanhamento da Evolução — Atualizado em 17/10/2026
> Base: `Parent_Care_Gestao_Completa_Sem_Afiliados_Antigravity.md`

---

## 0. Decisão Prioritária: Suspensão de Afiliados e Influencers

- **Status**: ✅ **SUSPENSO COM SUCESSO**
- **Ações Realizadas**:
  1. Nenhuma tabela de afiliados foi criada no banco de dados.
  2. Nenhuma rota de afiliados ou scripts de tracking (Tolt/Rewardful) foram introduzidos nas experiências do cliente.
  3. A integração de assinaturas com o **Paddle Billing** foi preservada intacta (USD, EUR, GBP, BRL) para clientes da plataforma.
  4. Convites de familiares e cuidadores continuam normalmente como colaboração interna.
  5. Registro de afiliados mantido como **adiado no backlog**.

---

## 1. Matriz de Módulos (20 Módulos de Vida e Cuidado)

| # | Módulo | Estado no Repositório | Detalhes & Arquivos |
|---|--------|-----------------------|---------------------|
| 1 | **Rotina e Autonomia** | 🟡 Parcial / Validado | Refeições, hidratação, sono e catálogo com apoio relatado. |
| 2 | **Medicamentos** | ✅ Existente Validado | Confirmações registradas e integração com estoque de insumos. |
| 3 | **Alimentação e Hidratação** | ✅ Existente Validado | Registro de refeições e copos d'água no Painel Hoje. |
| 4 | **Saúde, Consultas e Exames** | ✅ Existente Validado | Compromissos médicos, médicos, locais e horários. |
| 5 | **Atividade Física** | 🟢 **Implementado** | Página `/dashboard/activities` + tabela `life_activities` (caminhada, hidro, musculação, presença voluntária, transporte ida/volta). |
| 6 | **Aulas e Aprendizagem** | 🟢 **Implementado** | Página `/dashboard/activities` + tabela `life_activities` (cursos, línguas, informática, matrículas, custos). |
| 7 | **Reabilitação Orientada** | 🟢 **Implementado** | Página `/dashboard/activities` + tabela `life_activities` (fisioterapia, fono, TO, orientações do profissional). |
| 8 | **Lazer, Cultura e Espiritualidade** | 🟢 **Implementado** | Página `/dashboard/activities` + tabela `life_activities` (passeios, cinema, eventos sociais, percepção sem culpa). |
| 9 | **Vida Social e Relacionamentos** | 🟡 Parcial / Validado | Contatos de emergência e apoio familiar integrado. |
| 10 | **Humor, Sono e Memória Cotidiana** | ✅ Existente Validado | Relatos cotidianos sem rótulo clínico e check-in voluntário. |
| 11 | **Peso, Medidas e Sinais Vitais** | ✅ Existente Validado | Pressão, glicemia, saturação, temperatura com indicação de ausência de dados. |
| 12 | **Mobilidade e Transporte** | 🟢 **Implementado** | Tabela `activity_transports` com percursos de ida e volta independentes para compromissos. |
| 13 | **Casa, Segurança e Serviços** | 🟢 **Implementado** | Página `/dashboard/home-safety` + tabela `home_safety_items` (manutenção, adaptações por cômodo, prestadores e checklists sem falsas garantias). |
| 14 | **Compras e Abastecimento** | 🟢 **Implementado** | Página `/dashboard/shopping` + tabela `shopping_items` (lista compartilhada + sugestão automática por estoque baixo). |
| 15 | **Finanças e Despesas** | 🟡 Parcial / Validado | Controle financeiro familiar independente de cobrança SaaS. |
| 16 | **Documentos e Serviços** | 🟡 Parcial / Validado | Arquivos e certidões com armazenamento privado. |
| 17 | **Equipe e Passagem de Turno** | 🟢 **Implementado** | Página `/dashboard/handovers` + tabela `shift_handovers` (resumo de período, pendências, intercorrências e carimbo de ciência com 1 clique). |
| 18 | **Incidentes, Quedas e Feridas** | 🟡 Parcial / Validado | Eventos de emergência, SOS e chamados no Painel Hoje. |
| 19 | **Projetos Pessoais e Memórias** | 🟢 **Implementado** | Página `/dashboard/memories` + tabela `life_projects_memories` (desejos "Quero Fazer" + histórias e patrimônio afetivo da família). |
| 20 | **Estoque de Insumos e Remédios** | 🟢 **Implementado** | Página `/dashboard/shopping` (aba Estoque) + tabelas `care_inventory_items` e `care_inventory_logs` (alertas de estoque baixo e movimentação auditada). |

---

## 2. Etapas de Execução do Roadmap

- [x] **Etapa 0**: Suspender afiliados, preservar Paddle, auditar repositório e criar matriz de status.
- [x] **Etapa 1**: Navegação agrupada em 3 grandes hubs (Hoje & Atividades, Vida & Organização, Equipe & Cuidado), Painel Hoje exibindo atividades e ausência de dados como "Sem registros recentes" (sem falso "Tudo em dia").
- [x] **Etapa 2 & 3**: Modelo Integrado de Atividades da Vida (`life_activities`, `activity_occurrences`, `activity_transports`):
  - Atividade física, aulas/cursos, reabilitação, lazer e cultura.
  - Vínculos com transporte (ida/volta independentes), materiais, responsáveis e presença voluntária.
  - Telas de listagem, cadastro integrado e check-in.
- [x] **Etapa 4**: Passagem de turno estruturada (`shift_handovers`) e estoque de insumos/medicamentos (`care_inventory_items`).
- [x] **Etapa 5**: Compras compartilhadas (`shopping_items`), casa/segurança/adaptações (`home_safety_items`), memórias e projetos pessoais (`life_projects_memories`).
- [ ] **Etapa 6**: Notificações duráveis, suporte e revisão contínua das assinaturas Paddle (USD, EUR, GBP, BRL).
- [ ] **Etapa 7**: QA integrado, acessibilidade (WCAG), consistência de fuso horário e testes de integridade.
- [ ] **Etapa 8**: Extensão Pro (múltiplos residentes/unidades) via feature flags.

---

## 3. Legenda de Estados
- **Existente Validado**: funcionalidade existente no código testada e alinhada ao documento.
- **Implementado**: recém-construído nesta rodada.
- **Testado**: verificado com compilação e validação local.
- **Pendente de Configuração**: aguardando credencial de serviço externo.
- **Bloqueado**: impedimento técnico externo registrado.
- **Futuro**: planejado para etapas posteriores.
