# Walkthrough — Personalização do Acompanhamento por Pessoa Cuidada

O sistema completo de **Personalização do Acompanhamento** foi implementado, testado e validado no Parent Care. Cada pai, mãe ou familiar acompanhado possui agora sua própria configuração independente de monitoramento, sem compartilhamento indevido de regras, sem dados mockados e com total preservação do histórico clínico/organizacional.

---

## 1. Arquitetura do Banco de Dados (Supabase Migration 08)

Foram criadas 6 tabelas normalizadas e índices de alto desempenho em `supabase/migrations/08_monitoring_personalization.sql`:

1. **`monitoring_categories`**:
   - 12 categorias oficiais (A até L).
2. **`monitoring_definitions`**:
   - Mais de 60 itens de acompanhamento detalhados com tipo de dado (`boolean`, `number`, `time`, `text`, `scale`, `select`).
   - Suporte a dependências funcionais (`dependency_code`).
   - Flag de identificação para botões da tela simplificada (`is_checkin_button`).
3. **`cared_person_monitoring_settings`**:
   - Tabela central de associação com chave única `UNIQUE(cared_person_id, monitoring_definition_id)`.
   - Garante **independência estrita**: alterar as configurações de Maria não altera em nada as escolhas de José.
   - Preservação temporal: `enabled`, `enabled_at`, `disabled_at`, `configured_by`, `settings_json`.
4. **`custom_monitoring_fields`**:
   - Permite que a família crie campos personalizados específicos (ex: *"Regou as plantas?"*, *"Fez palavras cruzadas?"*).
   - Bloqueio ativo contra diagnósticos clínicos ou termos patológicos.
5. **`monitoring_records`**:
   - Tabela unificada para persistência histórica de medições, textos, escalas e valores numéricos.
6. **`monitoring_configuration_audit`**:
   - Registro permanente de todas as ativações, desativações e cópias de configurações entre perfis.

Todas as tabelas contam com políticas de Row Level Security (RLS) que isolam os dados estritamente dentro da organização do usuário autenticado.

---

## 2. Catálogo Oficial e Categorias Implementadas

O catálogo oficial (`src/lib/monitoring/catalog.ts`) cobre as 12 áreas requeridas:

| Letra | Código | Nome da Categoria | Exemplos de Itens |
| :---: | :--- | :--- | :--- |
| **A** | `daily_routine` | Rotina diária | Refeições, Hidratação, Banho, Higiene, Fraldas, Sono, Atividades |
| **B** | `medications` | Medicamentos | Remédios programados, Confirmação de tomada, Motivo de recusa, Estoque |
| **C** | `observed_wellbeing` | Bem-estar observado | Humor percebido, Disposição física, Dor declarada |
| **D** | `memory_routine` | Memória e rotina | Orientação no tempo/espaço, Esquecimentos incomuns |
| **E** | `autonomy` | Autonomia e independência | Autonomia para comer, vestir-se, caminhar e transferir-se |
| **F** | `socialization` | Socialização e convivência | Participação em conversas, Interação com visitas, Isolamento |
| **G** | `safety_incidents` | Segurança física e ocorrências | Quedas, Quase quedas, Fugas, Chamados de ajuda |
| **H** | `prosthetics_devices` | Próteses e apoios | Óculos, Aparelho auditivo, Bengala, Andador, Cadeira de rodas |
| **I** | `care_inventory` | Itens e insumos do idoso | Fraldas, Pomadas, Luvas, Lenços, Alertas de reposição |
| **J** | `schedule_logistics` | Compromissos e logística | Consultas médicas, Fisioterapia, Transporte agendado |
| **K** | `caregivers_shifts` | Cuidadores e plantão | Check-in/out de cuidador, Checklist de tarefas, Passagem de turno |
| **L** | `cared_person_checkins` | Botões da tela simplificada | "Estou bem", "Tomei remédio", "Bebi água", "Já comi", "Acordei", "Vou dormir", "Emergência" |

---

## 3. Telas e Interfaces Construídas

### A. Cadastro com Wizard de Personalização (`/dashboard/cared-people/new`)
- **Passo 1**: Nome completo, data de nascimento, gênero, tipo sanguíneo, alergias e observações.
- **Passo 2**: *"O que você deseja acompanhar para esta pessoa?"*
  - Cards organizados pelas 12 categorias.
  - Switches claros para ativação/desativação.
  - Busca rápida de itens e filtros ("Marcar todos", "Desmarcar todos", "Padrão essencial").
  - Painel de resumo lateral com total de módulos ativos.
  - Gravação atômica direta no Supabase.

### B. Gestão e Configuração Posterior (`/dashboard/settings/monitoring`)
- Seleção direta da pessoa cuidada.
- Lista completa dos módulos organizados por categoria.
- **Aviso de segurança ao desativar**: Mensagem explícita informando que o histórico já registrado **permanecerá seguro e preservado**, podendo ser restaurado a qualquer instante com a reativação.
- **Modal de Cópia Rápida**: Permite copiar as preferências de uma pessoa para outra com um clique, mantendo os registros históricos intactos.
- **Campos Personalizados da Família**: Criação de perguntas customizadas (tipo Sim/Não, Número, Texto, Escala 1 a 5).
- **Aba de Auditoria**: Histórico de quem ativou ou desativou cada acompanhamento com data e hora.

### C. Tela Simplificada do Idoso (`/care/[id]`)
- Renderização estritamente dinâmica dos botões configurados na Categoria L.
- Não exibe botões desativados.
- Se o botão de Emergência estiver desativado para aquele perfil, a barra fixa inferior não é renderizada, eliminando espaços vazios.
- Cards diários (Próximo Remédio e Próxima Consulta) só aparecem se os respectivos módulos estiverem ativos.

### D. Dashboard Familiar (`/dashboard`)
- Reorganização dinâmica do grid em cascata.
- Não deixa buracos no layout quando um módulo está desligado.
- **Zero dados fictícios**: Removidos todos os mocks de fallback (nada de "Losartana 50mg" ou "Dr. Roberto"). Quando um módulo ativo não tem lançamentos, exibe estado vazio honesto com ação direta para registrar.

### E. Relatórios & Mudanças Observadas (`/dashboard/reports`)
- Relatório diário e semanal cobrindo apenas os módulos ativos.
- Diferenciação clara entre:
  - **Módulo não ativado**: Não aparece no relatório.
  - **Módulo ativado sem registros**: Mostra status "Sem registros no período".
- **Mudanças Observadas (Comparativo 7 Dias)**:
  - Algoritmo 100% determinístico (`src/lib/monitoring/pattern-detector.ts`).
  - Compara a janela dos últimos 7 dias com os 7 dias anteriores.
  - Detecta variações de hidratação, refeições e chamados de ajuda.
  - **Regra Não-Diagnóstica**: Exibe banner legal explícito informando que se trata de contagem numérica descritiva e organizacional da própria família, sem emissão de diagnósticos clínicos.

---

## 4. Testes Automatizados Executados

Executado com sucesso via `tests/monitoring.test.mjs`:

```bash
cmd /c "npx tsx tests/monitoring.test.mjs"
```

**Resultado:**
- `✔ 1. Catalog Completeness: exactly 12 standard categories (A through L)`
- `✔ 2. Independence: Maria (Mother) and José (Father) have isolated configurations`
- `✔ 3. Dependency Validator: rejects items without prerequisites and accepts valid ones`
- `✔ 4. Non-Medical Rule & Deterministic Comparison: statistical comparison without medical diagnosis`
- **Total:** 4 testes aprovados em 9.9ms com 0 falhas.

---

## 5. Build de Produção e Deploy

- `npm run build` compilou com sucesso todas as 24 rotas estáticas e dinâmicas sem erros de tipagem ou de sintaxe.
- Commit `c97c9a7` realizado e enviado para o GitHub (`git push origin master`).
- Integração CI/CD conectada com o Vercel em produção.
