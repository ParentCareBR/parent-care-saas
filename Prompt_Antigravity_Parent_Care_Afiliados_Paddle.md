# PROMPT MESTRE PARA ANTIGRAVITY — PARENT CARE

Copie este documento para o Antigravity no repositório atual do Parent Care.
Data de preparação: 16/10/2026.

## 1. Missão e limites da execução

Atue como engenheiro de software responsável pela evolução do Parent Care, plataforma de coordenação da vida e do cuidado de pessoas idosas, utilizada por familiares, cuidadores e, progressivamente, organizações de cuidado. Execute as alterações no projeto existente; não entregue apenas um plano ou telas demonstrativas.

O histórico do projeto contém o nome CuidaJunto; Parent Care é o nome atual. Preserve identificadores internos antigos quando renomeá-los representar risco. Não reconstrua o projeto do zero. Leia AGENTS.md, documentação, migrations, rotas, componentes, testes e integrações existentes antes de alterar código. Faça inventário do que está pronto, incompleto e ausente. Preserve dados e personalizações.

Este prompt reúne o escopo funcional conhecido e as decisões recentes de afiliados. Recursos avançados identificados como fase futura não devem ser anunciados como disponíveis. Preços históricos são hipóteses; preserve os preços efetivamente configurados no sistema/Paddle, sem substituir por valores deste documento.

Stack de referência: Next.js, TypeScript, Tailwind, componentes acessíveis, Supabase/PostgreSQL/Auth/Storage, GitHub, Vercel, Paddle, e-mail transacional e PWA. Confirme a stack real antes de agir. Adapte ao projeto existente em vez de instalar bibliotecas redundantes.

Trabalhe em incrementos revisáveis, com checkpoints no Git e relatório de avanço. Execute autonomamente implementação e testes locais/homologação autorizados. Não execute cobranças reais, transferências reais, migrations destrutivas ou publicação de produção sem autorização específica. Falta de credencial externa não impede desenvolver e testar o restante; registre precisamente o bloqueio e não simule integração ativa.

## 2. Objetivo do produto

Facilitar a divisão do cuidado, reduzir informações perdidas e dar uma visão confiável do que foi registrado, do que está pendente e de quem é responsável. Não transformar o produto em diagnóstico, prescrição ou substituto de serviço de emergência.

Experiências:
- Central da Família: visão de hoje, colaboração, documentos e despesas.
- Modo Cuidado: execução rápida de rotinas e passagem de turno.
- Modo Simplificado: interface acessível para a pessoa acompanhada.
- Parent Care Pro: organização com múltiplos residentes, equipes, escalas e portal familiar, liberado gradualmente.

Conta única, organizações isoladas e direitos de acesso por produto. Uma pessoa pode participar de várias famílias mediante convite. Cada pessoa acompanhada tem perfil, rotinas, histórico, permissões e fuso próprios. Nunca misturar registros da mãe e do pai.

## 3. Perfil da pessoa acompanhada

Criar ou completar cadastro progressivo com nome, nome de preferência, foto opcional, nascimento, vínculo, idioma, fuso IANA, país, endereço opcional, contatos, preferências, necessidades de acessibilidade e rede de cuidado.

Dados de saúde são opcionais e restritos: alergias informadas, condições relatadas, profissionais, convênio, instruções cadastradas e documentos. Identificar fonte e data. Não exigir diagnóstico para usar a plataforma. Não traduzir automaticamente prescrições ou relatos clínicos.

Permitir adicionar várias pessoas conforme o plano. Exibir sempre o perfil ativo em todas as telas e formulários. Ao trocar o perfil, cancelar formulários não salvos mediante confirmação e atualizar consultas/caches para impedir gravações no perfil errado. Arquivamento não deve apagar histórico por acidente.

## 4. Personalização por módulos e campos

Na criação e nas configurações do perfil, oferecer checkboxes para ativar/desativar:
- medicamentos;
- alimentação e hidratação;
- consultas e exames;
- tarefas e visitas;
- humor e comportamento;
- sono;
- memória e orientação cotidiana;
- autonomia nas atividades;
- socialização e lazer;
- peso e medidas;
- sinais vitais registrados;
- quedas e incidentes;
- feridas, com consentimento e controle de imagens;
- documentos;
- despesas;
- estoque de insumos;
- passagem de turno.

Não ativar todos por padrão. Usar onboarding curto com escolhas iniciais editáveis. Preferências pertencem ao perfil acompanhado, não ao navegador. Desativar um módulo remove entradas novas, agenda futura desse módulo e lembretes conforme confirmação, mas preserva histórico autorizado e exportação. Reativar não recria eventos duplicados. Ocultar módulo não substitui autorização no backend.

## 5. Painel Hoje e linha do tempo

Exibir por perfil: próximas atividades, registros pendentes, responsável, última atualização e pendências que exigem ação. Diferenciar não registrado de não realizado. Não exibir 'tudo bem' ou 'rotina em dia' com base em ausência de dados. Mostrar 'sem registros recentes' quando necessário.

Linha do tempo com filtros por data, módulo, autor e tipo de evento. Registros exibem horário previsto, horário efetivo, horário de registro, autor e histórico de correções. Não permitir apagar silenciosamente uma confirmação relevante.

Adicionar ações rápidas: registrar cuidado, criar tarefa, agendar compromisso, registrar despesa e convidar membro. Visão consolidada de vários perfis deve identificar claramente cada pessoa e respeitar permissões individuais.

## 6. Modo Simplificado e pedido de ajuda

Interface com poucos botões, alto contraste, letras ajustáveis, áreas de toque amplas, foco visível e linguagem simples. Fluxos principais: Estou bem; Preciso de ajuda; Próximo compromisso; Contatar pessoa de confiança.

Estou bem registra manifestação voluntária com horário, sem afirmar verificação de saúde. Preciso de ajuda cria pedido, tenta notificar contatos autorizados e mostra estados distintos: registrado, envio pendente, enviado, falhou e reconhecido por alguém. Pedido não atendido pode escalar conforme regra e contatos configurados. Não apresentar notificações como garantia de socorro.

Botão de ligação deve usar número configurado para o país e permitir contatos pessoais. Não inventar um número global. Mostrar alternativa de contato quando offline. Cartão de emergência privado, exportável, com dados selecionados pela família; qualquer compartilhamento público requer seleção explícita, validade e revogação.

## 7. Medicamentos, agenda e estoque

Registrar medicamento, apresentação, instrução transcrita, quantidade/unidade, horários, datas de início/fim e responsável. Não sugerir dose, interação ou alteração de tratamento. Anexo de prescrição permanece privado.

Cada ocorrência deve ter identidade única e estados: pendente, confirmado conforme relato, recusado, não realizado e outro motivo documentado. Distinguir quem administrou de quem registrou. Duas pessoas tentando confirmar a mesma ocorrência não podem duplicá-la nem baixar estoque duas vezes. Correções precisam de auditoria.

Lembretes usam o fuso da pessoa acompanhada, inclusive mudanças de horário de verão. Alteração de agenda afeta ocorrências futuras, mantendo passadas. Alertas de falta de confirmação não devem afirmar que a dose foi esquecida.

Estoque com entrada, saída, ajuste, unidade, quantidade mínima e validade opcional. Baixa ocorre somente com evento aplicável; correção gera movimento compensatório. Estimativa de duração deve ser rotulada e não interpretada como recomendação de compra ou dose.

Agenda inclui consultas, exames, transportes, visitas e atividades, com acompanhante, local, documentos necessários e instruções informadas. Recorrência, edição de ocorrência ou série, conflitos de agenda e filtros. Pré-consulta reúne documentos escolhidos, dúvidas e histórico do período, sem interpretação clínica automática.

## 8. Rotina, bem-estar e autonomia

Alimentação: refeições, aceitação, observações e preferências. Hidratação: volume e unidade; metas apenas cadastradas por usuário/profissional, nunca recomendadas automaticamente pelo sistema.

Humor/comportamento: opções simples e observação livre, sem classificação diagnóstica. Sono: horários e percepção relatada. Memória/orientação: relatos cotidianos, sem testes clínicos ou rótulos de doença. Autonomia: ajuda necessária para atividades conforme relato. Socialização: visitas, ligações, tempo acompanhado e atividades.

Peso e sinais vitais: valor, unidade, origem manual/dispositivo, horário e responsável. Gráficos descritivos, sem diagnóstico. Regras de atenção podem ser configuradas por responsável habilitado e mostrar origem; não adotar limites clínicos genéricos sem validação.

Quedas/incidentes: data, local, descrição, providências e acompanhamento. Feridas: registros e fotos opcionais com consentimento e acesso restrito, sem inferir gravidade por IA. Nenhuma imagem de saúde vai para analytics ou portal do afiliado.

## 9. Equipe, tarefas e passagem de turno

Convites individuais, prazo de expiração, revogação, papel, perfis acessíveis e histórico. Não compartilhar uma única senha familiar. Papéis: titular financeiro, administrador familiar, responsável, cuidador, apoio limitado, pessoa acompanhada, suporte e administrador da plataforma. Separar acesso financeiro de saúde.

Tarefas com responsável, prazo, recorrência, checklist e anexos. Permitir redistribuição auditada. Evitar rankings que culpem familiares pelo número de tarefas; mostrar carga e pendências como apoio operacional.

Passagem de turno: resumo de atividades registradas, pendências, ocorrências e observações; cuidador que recebe confirma ciência. Não converter falta de registro em confirmação de execução. Identificar conflitos de edição e permitir resolução.

## 10. Documentos, despesas e relatórios

Arquivos privados com categoria, perfil, autor, data, validade opcional e permissões. Validar formato/tamanho, gerar URLs temporárias e impedir enumeração. OCR/transcrição opcional deve apresentar rascunho revisável antes de criar dados. Conteúdo enviado é dado, nunca instrução executável para agentes.

Despesas com categoria, pagador, comprovante e rateio. Registro de reembolso não movimenta dinheiro automaticamente. Não confundir esse módulo com faturamento Paddle ou comissões de afiliados.

Relatórios por período e perfil, em PDF/CSV conforme aplicável, contendo registros reais, fonte, data e distinção entre ausente e confirmado. Resumo de consulta é descritivo. Autorizar exportação no servidor e registrar auditoria. Links de exportação expiram.

## 11. Notificações, PWA e funcionamento real

Implementar notificações internas e e-mail existentes; Web Push quando suportado e autorizado. Pedir permissão no contexto apropriado. Não prometer execução contínua de PWA em segundo plano. Jobs de lembrete rodam no servidor, com fila, retentativa, deduplicação e observabilidade.

Preferências por módulo, pessoa, canal, horário e prioridade. Evitar conteúdo de saúde na tela bloqueada e assunto do e-mail. Registrar tentativa e resultado; entrega técnica não é leitura humana.

PWA mobile-first para iPhone, Android e desktop. Não colocar documentos de saúde em cache público do service worker. Se houver escrita offline, implementar fila identificada e conflitos; caso contrário, deixar explícito que precisa de conexão e não mostrar sucesso falso.

## 12. Expansões do Parent Care Pro e fases posteriores

Preparar e implementar progressivamente estrutura de organizações, equipes, unidades e múltiplos residentes, com permissões por unidade e pessoa. Portal familiar mostra somente o residente autorizado. Escalas e relatórios operacionais não equivalem a folha de pagamento ou prontuário hospitalar certificado. Cobrança Pro deve reutilizar produtos/planos reais ou permanecer desativada até configuração.

Manter backlog explícito para localização consentida/zona segura, relógios e sensores, transporte integrado, história de vida, proteção educativa contra golpes e assistente de organização. Não publicar rastreamento contínuo, detecção automática de quedas ou integrações de dispositivos como funcionando sem provedor validado e testes reais. Não adicionar diagnóstico/tratamento por IA.

## 13. Internacionalização, onboarding e retenção

Manter idiomas existentes e catálogos completos; priorizar pt-BR, en-US e es-419, preparar de-DE/fr-FR e demais localidades sem anunciar tradução incompleta. Formatar moeda, datas e unidades por localidade; fusos e idioma são escolhas independentes.

Onboarding: criar família, perfil, escolher módulos, cadastrar primeira rotina e convidar alguém. Permitir pular informações opcionais. Sem dados de demonstração em contas reais. Tour demonstrativo isolado e identificado.

Resumos diário/semanal configuráveis, visão de pendências, ajuda contextual e feedback. Campanhas comerciais somente com preferências apropriadas. Cancelamento simples, exportação e comunicação respeitosa em situações de falecimento ou mudança do cuidado. Não usar medo para impedir cancelamento.

## 14. Paddle e direitos de acesso

Preservar Paddle como cobrança global. Detectar se a conta/integração usa Paddle Billing ou Classic; os eventos deste documento se referem a Billing. Não misturar versões e não migrar conta automaticamente. Implementar adaptador BillingProvider isolado do restante do produto.

Mapear produtos, preços, periodicidade, moeda, assentos e direitos por organização. Preservar planos reais. Checkout server-side deve validar preço permitido e titular, sem confiar em valor ou entitlement enviado pelo navegador. Nunca coletar cartão no nosso banco.

Webhook validado com assinatura e corpo bruto; persistência durável; processamento assíncrono quando necessário; idempotência por event_id e transaction_id; eventos fora de ordem tratados por versão/data e reconciliação pela API. Evento duplicado não libera acesso ou comissão duas vezes.

transaction.completed é o sinal principal para contabilizar pagamento finalizado. Estados da assinatura controlam acesso separadamente. Cancelamento ao fim do período mantém acesso até a data paga. Falha de pagamento, pausa e tolerância seguem política configurada. Regularização e exportação continuam acessíveis conforme política, sem exclusão instantânea de dados.

Processar eventos pertinentes de assinatura, transação e ajustes conforme documentação atual. Reconciliar periodicamente transações, reembolsos e assinaturas. Checkout de sucesso no navegador não é comprovação financeira. Persistir totais, impostos, descontos, taxas, moeda, linhas e referências externas necessárias.

## 15. Programa de afiliados e influencers — decisão comercial obrigatória

REGRA APROVADA: 40% na primeira cobrança efetivamente paga de um novo cliente indicado e 15% nos pagamentos recorrentes elegíveis seguintes, enquanto ele continuar pagando, sem limite de meses. Nunca somar 40% e 15% na primeira cobrança.

Escopo inicial: Parent Care, uma indicação por conta pagante. Convites internos de familiares não são novas vendas. Histórico do cliente existe independentemente de subscription_id, e-mail alterado ou reativação. Cliente já pagante não ganha um novo bônus inicial ao trocar de assinatura ou usar outro link. Outros produtos futuros terão regras separadas; não ampliar automaticamente a elegibilidade.

Base: valor elegível da assinatura após descontos, excluindo impostos sobre a venda destacados e valores estornados. Não descontar taxa Paddle da base de comissão sem alterar explicitamente os termos; ela é custo da plataforma. Calcular por linhas elegíveis, não sobre extras não autorizados.

Mensal: 40% da primeira mensalidade e 15% das seguintes. Anual: 40% da primeira anuidade paga e 15% das renovações anuais, sem gerar doze comissões sobre a mesma venda. Trial gratuito e cobranças zeradas não consomem o benefício de primeira cobrança. Falhas não geram comissão.

Upgrade/downgrade: aplicar 15% ao valor incremental elegível efetivamente cobrado após a primeira cobrança; créditos não são nova receita. Reativação retoma 15%, preserva afiliado e não repete 40%. Se o primeiro pagamento for estornado, reverter sua comissão e manter histórico; não reabrir automaticamente bônus de aquisição.

Reembolso parcial reverte proporcionalmente a comissão correspondente às linhas reembolsadas usando a taxa original. Reembolso total/disputa exige ajuste rastreável. Comissão já paga gera compensação transparente, não exclusão de histórico nem débito bancário oculto.

Propostas operacionais configuráveis, ainda distintas da regra comercial aprovada: janela de atribuição de 60 dias, retenção mínima de 30 dias antes de disponibilização, ciclo mensal e mínimo de R$50 para BRL. Para outras moedas, exigir limiar explícito por moeda; não assumir que 50 USD equivale a 50 BRL.

Dinheiro em unidades mínimas inteiras com código ISO, respeitando moedas sem centavos. Taxas em basis points: 4000 e 1500. Arredondamento determinístico documentado. Exemplos BRL: base 9990 → 3996 na primeira; recorrência → 1499 com arredondamento comercial. Nunca somar saldos de moedas diferentes sem conversão explícita.

## 16. Atribuição, portal e campanhas

Página pública Seja um parceiro com proposta, funcionamento, perguntas frequentes e termos. Afiliado e influencer são tipos de parceiro com a mesma regra padrão. Sem níveis, bônus ou promessas de renda inventados.

Inscrição com identidade, país, contato, canais, aceite versionado e dados mínimos. Portal mostra aprovação, link exclusivo, QR code, campanhas, cliques estimados, conversões, pagantes ativos, comissões pendentes/disponíveis/processando/pagas/ajustadas e histórico exportável.

Criar links por campanha com UTMs e destino interno validado, sem open redirect. Cookie first-party sujeito às preferências aplicáveis, com expiração. No cadastro, persistir indicação no servidor. Regra inicial: último afiliado válido antes do cadastro, com vínculo congelado após atribuição elegível. Não reatribuir cliente já vinculado por clique posterior. Documentar limitações entre dispositivos e uso opcional de código manual validado para recuperar atribuição, sem gerar desconto automaticamente.

Afiliado recebe somente dados comerciais mínimos e identificadores pseudonimizados. Não expor nomes/saúde de idosos, documentos, lista da família ou contatos dos clientes. Scripts de marketing/afiliados ficam nas páginas públicas e checkout necessários, nunca nas telas de cuidado com dados sensíveis.

Cupons exigem autorização administrativa, período e regra de não acúmulo. Autorreferência, duplicação deliberada, spam e alegações falsas são bloqueados pelos termos e revisão; IP compartilhado sozinho não comprova fraude. Avisos claros para divulgação de parceria remunerada.

## 17. Arquitetura de afiliados e pagamento automático

Implementar separação entre cobrança (Paddle), cálculo/atribuição (AffiliateProvider) e repasse (PayoutProvider). Não criar split nativo Paddle fictício. Não usar Stripe Connect como dependência oculta nem trocar o Paddle.

Primeira opção a validar: Tolt com Paddle Billing, flows de comissão e Auto Payouts. Verificar plano comercial, elegibilidade da empresa brasileira, países/moedas dos beneficiários, métodos, taxas, financiamento e suporte à regra exata. Rewardful não deve ser assumido compatível com Paddle Billing: a documentação consultada declara suporte a Classic.

Escolher UM motor autoritativo de comissão por ambiente. Modo Tolt: Tolt calcula e paga; banco local replica resultados para auditoria/visualização, sem emitir pagamentos paralelos. Uma calculadora local pode conferir divergências sem criar segunda obrigação. Modo próprio, somente se necessário: ledger local calcula e um provedor de repasse comprovadamente compatível executa. Não inserir os mesmos pagamentos pela integração nativa e API ao mesmo tempo.

No Tolt, configurar dois flows mutuamente exclusivos por New Payment: primeiro pagamento elegível 40%; seguintes 15% sem prazo final. Confirmar em homologação se Number of transactions inclui a transação atual e como lida com zero, falhas, reembolsos, prorrata e outros produtos. Não substituir primeiro pagamento por primeiro mês, nem configurar 40% eterno. Se o contador nativo não reproduzir as regras, documentar incompatibilidade e implementar alternativa suportada antes de ativar produção.

Na integração Paddle/Tolt, seguir documentação atual e propagar o referral ID suportado em customData preservando os demais campos. Validar vínculo pelo backend; não aceitar affiliate_id arbitrário do navegador como autoridade financeira. Criar destino de webhook separado para Tolt sem apagar o webhook do Parent Care. Segredo de cada destino é independente.

Payouts são financiados pela empresa separadamente. O dinheiro recebido no Paddle não é automaticamente um saldo disponível no Tolt. Auto Payouts depende do pagamento da fatura de repasses e habilitação da conta/plano. Registrar estados de fatura, beneficiário e transferência. Proibir marcar pago apenas por criar lote ou aceitar requisição.

Criar modo simulação sem movimentação financeira, teto por lote, limite por parceiro, chave de idempotência, lock de execução, checagem de saldo, fila de falhas e botão de pausa. Antes de tentar novamente um timeout, consultar o status externo para não transferir duas vezes. Usar confirmação final por webhook/API e reconciliação periódica. Mudança de beneficiário pede reautenticação e auditoria.

Não armazenar cartão ou credenciais bancárias no banco da aplicação. Preferir onboarding hospedado do provedor. Não anunciar Pix, Wise, PayPal ou cobertura mundial de repasses antes de verificar a disponibilidade para empresa e destinatários. Um país sem suporte deve ser identificado antes de aceitar participação remunerada.

Conversão cambial: manter origem, valor, moeda de liquidação, taxa, data, tarifas e líquido. Nunca converter retroativamente com câmbio de hoje. Separar painel de receita, comissão devida e caixa disponível. As taxas de infraestrutura/repasse não mudam silenciosamente os 40%/15% prometidos.

## 18. Dados e segurança

Adaptar nomes existentes. Entidades funcionais: organizações, memberships, perfis acompanhados, módulos ativos, schedules, occurrences, confirmações, tarefas, consultas, logs de cuidado, despesas/rateios, documentos, notificações/tentativas, estoque/movimentos, turnos, consentimentos, assinaturas, entitlements e auditoria.

Entidades financeiras adicionais: affiliate_accounts, affiliate_program_versions, referral_links, referral_attributions, billing_transactions, billing_line_items, commission_entries, commission_adjustments, payout_batches, payout_items, provider_events e reconciliation_runs. Evitar tabelas duplicadas se equivalentes já existirem.

Constraints: event_id externo único; commission source única por linha/transação/regra; uma aquisição bonificada por conta/produto; uma transferência externa por obrigação; valores não negativos em movimentos de crédito; ajustes com sinal e referência; tenant e profile associados com integridade referencial. Ledger imutável com lançamentos compensatórios, não saldo editável como fonte única.

RLS no banco e autorização server-side em todas as mutações. Cuidador sem acesso financeiro não consulta despesas nem assinatura. Afiliado não consulta outras comissões ou famílias. Superadmin protegido por MFA; suporte com mínimo acesso e acesso excepcional auditado. service_role nunca no client bundle. URLs assinadas, rate limits, proteção CSRF quando aplicável e validação de arquivos/inputs.

Não enviar dados de saúde para Paddle custom_data, Tolt, pixels, analytics, logs ou ferramentas de erro. Limitar IDs pseudonimizados ao necessário. Documentar consentimento, exportação e exclusão, operadores, retenção e backups. Não declarar conformidade jurídica absoluta apenas por implementar componentes técnicos.

## 19. Administração, CRM e BI

Admin: contas, planos, entitlements, tickets, funil, ativação, uso agregado, receita recebida, MRR/ARR, churn, impostos, taxas Paddle, custos de IA/notificações e comissões. MRR normaliza anualidade; recebimento anual não vira MRR integral no mês. Moedas distintas separadas ou convertidas com metodologia explícita.

Afiliados: aprovar/suspender, links, conversões, taxas versionadas, pendências, ajustes, faturas de repasse e reconciliação. Suspensão por suspeita não apaga automaticamente direitos adquiridos. Mudanças futuras de programa não alteram retroativamente as indicações existentes sem regra explícita.

Exibir contribuição após custos conhecidos, não 'lucro líquido' se faltar contabilidade. Indicadores reais, sem gráficos e depoimentos inventados. Manter visão comercial sem revelar informações clínicas.

## 20. Testes obrigatórios e critérios de aceite

Testes funcionais: dois perfis independentes; módulos diferentes; desativação preserva histórico e cessa lembretes; isolamento entre famílias; revogação de convite/acesso; concorrência na confirmação de medicamento; estoque sem baixa duplicada; exportação autorizada; fuso e horário de verão; offline sem sucesso falso.

Testes de cobrança/afiliados:
1. Novo cliente paga base BRL 100,00: comissão 40,00.
2. Renova base BRL 100,00: comissão 15,00.
3. Trial e cobrança zero: nenhuma comissão, bônus preservado.
4. Evento duplicado/reentrega: nenhuma duplicação financeira.
5. Eventos fora de ordem: primeiro pagamento classificado pela transação real; reconciliação corrige sem pagar duas vezes.
6. Cancela, reativa ou muda subscription_id: não repete 40%.
7. Anual de base 1.000,00: 400,00 na aquisição, 150,00 na renovação; sem lançamentos mensais artificiais.
8. Base após desconto 80,00 e imposto 16,00: primeira comissão 32,00, não 38,40.
9. Reembolso de metade da base inicial 100,00: ajuste -20,00.
10. Reembolso após payout: saldo compensatório visível, sem perda de histórico.
11. Upgrade com cobrança incremental elegível 20,00: comissão 3,00 após aquisição.
12. Troca de e-mail e nova conta de cobrança vinculada: não reinicia aquisição.
13. Cookie expirado, parceiro suspenso, autoindicação e código inválido: tratamento consistente e registrado.
14. Falha de fatura de repasse: nenhum falso status pago.
15. Timeout seguido de confirmação tardia: apenas uma transferência.
16. BRL/USD/JPY e conversão: precisão, não mistura de saldos e regras de arredondamento.
17. Afiliado tentando acessar dados de cuidado: acesso negado.
18. Checkout sem webhook válido: não conceder comissão por evento de navegador.
19. Cancelamento sem estorno não elimina comissão já adquirida de pagamento válido.
20. Dois flows nunca somam 55% na aquisição.

Usar sandbox/mocks nos testes automatizados e contratos reais dos provedores. Se Tolt não oferecer sandbox equivalente, documentar o método autorizado de homologação sem disparar payout real. Validar journeys em celular/desktop e acessibilidade dos fluxos críticos.

## 21. Ordem de entrega

Fase A: inventário, arquitetura, permissões, migrações compatíveis e plano de execução.
Fase B: perfis independentes, módulos, onboarding, Painel Hoje e Modo Simplificado.
Fase C: rotinas, medicamentos, alimentação, agenda, tarefas, alertas e equipe.
Fase D: documentos, estoque, despesas, relatórios e passagem de turno.
Fase E: fortalecer Paddle existente, ledger e programa de afiliados/influencers.
Fase F: Tolt/adaptador, portal, reconciliação, simulação e preparação dos repasses automáticos.
Fase G: CRM/BI, internacionalização completa dos fluxos e QA integrado.
Fase H: extensões Pro por feature flag e backlog das integrações externas futuras.

Não encerrar após o inventário: avance nas fases executáveis. Se o contexto acabar, mantenha checkpoint com progresso, decisões, testes, migrations e próximos passos para continuar sem reiniciar.

## 22. Entregáveis no repositório

- Código funcional, migrations e políticas RLS.
- Testes de isolamento, cobrança, comissões e repasses.
- .env.example apenas com placeholders e indicação público/privado.
- docs/implementation-status.md com pronto, pendente e bloqueado.
- docs/paddle-setup.md com sandbox/live, eventos, secrets e reconciliação.
- docs/affiliate-rules.md com regras comerciais, base, anualidade, arredondamento e estornos.
- docs/affiliate-payouts-setup.md com provedor, custos confirmados, países, funding, agenda e critérios de ativação.
- docs/privacy-and-permissions.md com matriz de acesso e tratamento dos dados.
- docs/release-checklist.md com rollback, backup, variáveis e testes executados.

Use nomes de variáveis coerentes com SDKs reais. Nunca invente endpoint externo, resposta de API, ID de produto, contrato assinado ou autorização de payout. Quando faltar configuração, indique onde obtê-la e quais recursos permanecem desativados. O resultado final deve distinguir implementado, testado em sandbox e efetivamente habilitado em produção.

## 23. Referências para verificar antes da integração

Documentação consultada em 16/10/2026; confirmar versões vigentes antes de implementar:
- Paddle webhooks: https://developer.paddle.com/webhooks/
- Evento completed: https://developer.paddle.com/webhooks/transactions/transaction-completed/
- Tolt/Paddle Billing: https://help.tolt.com/en/articles/8455444-how-to-set-up-paddle-billing-with-tolt
- Tolt flows: https://help.tolt.com/en/articles/10044884-what-are-flows
- Condições de flows: https://help.tolt.com/en/articles/9942457-commission-flow-conditions-explained
- Ativação Auto Payouts: https://help.tolt.com/en/articles/10001783-enable-or-disable-auto-payouts
- Financiamento dos repasses: https://help.tolt.com/en/articles/10001811-how-to-set-up-the-auto-payouts-invoice-paying-method
- Limitação Rewardful/Paddle: https://help.rewardful.com/en/articles/6664900-how-does-rewardful-use-my-paddle-account

Comece agora pelo inventário do repositório, registre o plano e implemente incrementalmente o escopo, preservando a operação atual.
