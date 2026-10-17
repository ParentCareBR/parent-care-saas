# PROMPT MESTRE PARA ANTIGRAVITY — PARENT CARE

**Gestão completa da vida da pessoa idosa — versão 2.0 — 17/10/2026**

Use este documento no repositório existente. Ele é autossuficiente e consolida o escopo atual, incluindo atividade física, aulas e organização da vida cotidiana.

## 0. DECISÃO PRIORITÁRIA: PARE A IMPLEMENTAÇÃO DE AFILIADOS

**NÃO TEREMOS IMPLEMENTAÇÃO DE AFILIADOS OU INFLUENCERS POR ENQUANTO. INTERROMPA ESSA INCLUSÃO E FOQUE NAS MELHORIAS DO PRODUTO DESCRITAS AQUI.**

Esta instrução substitui qualquer orientação anterior para implementar Tolt, Rewardful, outro gerenciador de afiliados ou um programa próprio. Não desenvolver ou ativar links remunerados, comissões, carteiras de parceiros, repasses, campanhas de influencers, níveis ou página Seja um afiliado.

Se já começou:
1. Identifique rotas, componentes, tabelas, jobs, integrações e scripts relacionados.
2. Suspenda o desenvolvimento e desative novos cadastros, tracking remunerado, novas comissões e novos repasses com configuração/feature flag reversível.
3. Retire menus, anúncios e CTAs de afiliação das experiências públicas e autenticadas.
4. Preserve código e dados existentes. Não apague tabelas nem históricos e não extinga obrigações financeiras reais.
5. Se houver transferência já enviada, preserve reconciliação e histórico e informe ao proprietário; não tente cancelá-la silenciosamente.
6. Preserve o webhook de assinaturas e a cobrança atual pelo Paddle. Não desligue pagamentos de clientes ao suspender afiliados.
7. Registre o programa apenas como adiado no backlog. Não construa arquitetura para ele nesta entrega.

**O Paddle continua para assinaturas dos clientes em USD, EUR, GBP e BRL, conforme a configuração existente.** Convites de familiares e cuidadores continuam: são colaboração, não indicação comercial.

## 1. MISSÃO E EXECUÇÃO

Atue como engenheiro responsável por evoluir o Parent Care existente. Implemente funcionalidades completas com persistência, permissões, estados de interface e testes. Não entregue apenas planejamento, mockups ou botões sem ação.

Inspecione AGENTS.md, documentação, rotas, componentes, migrations, banco, testes e integrações antes de alterar. Mapeie pronto, incompleto e ausente. Preserve dados, identidade visual e funcionalidades existentes; não recomece do zero.

Stack de referência: Next.js, TypeScript, Tailwind/componentes acessíveis, Supabase/PostgreSQL/Auth/Storage, GitHub, Vercel e Paddle. Confirme a stack real e reutilize padrões. Parent Care é a marca atual; nomes internos antigos como CuidaJunto podem permanecer por compatibilidade.

Não alterar preços reais usando propostas antigas. Consulte documentação vigente de APIs/bibliotecas durante a implementação. Não invente endpoint, produto, credencial, permissão ou contratação.

Execute por etapas com checkpoints no Git. Não faça migration destrutiva, cobrança real ou publicação de produção sem autorização específica. Falta de credencial bloqueia só a integração correspondente: avance nas partes independentes e informe precisamente o que falta. Não simule integração ativa.

## 2. PRINCÍPIOS DO PRODUTO

Organizar a vida inteira da pessoa: rotina, autonomia, saúde registrada, movimento, aprendizagem, relações, lazer, transporte, casa, documentos, finanças e apoio.

- A pessoa idosa participa das escolhas e controla compartilhamentos conforme sua autonomia e representação autorizada.
- Funcionar também para pessoas independentes; não exigir cuidador, doença ou diagnóstico.
- Respeitar preferências, objetivos e privacidade; não infantilizar nem vigiar.
- Cada pessoa tem perfil, módulos, histórico, agenda, permissões e fuso próprios.
- Ausência de registro não comprova falta de cuidado nem normalidade da saúde.
- Registrar, organizar, lembrar e comunicar. Não diagnosticar, prescrever ou substituir profissionais.
- Não prometer socorro garantido ou monitoramento contínuo de emergência.
- Integrar módulos para reduzir preenchimento, com confirmação das mudanças e rastreabilidade.

## 3. EXPERIÊNCIAS E PÚBLICOS

**Central da Família:** Hoje, semana, agenda, tarefas, registros, documentos e responsabilidades.

**Minha Vida / Modo Simplificado:** experiência acessível para a própria pessoa, com atividades, preferências, compromissos, Estou bem, Preciso de ajuda e contatos.

**Modo Cuidado:** rotina do turno, registros rápidos, pessoas autorizadas e passagem de responsabilidade.

**Parent Care Pro:** extensão para organizações de cuidadores e casas de repouso, com unidades, equipes e residentes; implementar progressivamente após o núcleo. Não prometer prontuário certificado ou folha de pagamento.

## 4. CONTA, PERFIS E PREFERÊNCIAS

Separar usuário autenticado, família/organização e pessoa acompanhada. Um usuário pode participar de várias organizações mediante convite. Perfil acompanhado pode existir sem login; vincular login próprio de forma segura quando desejado.

Cadastro progressivo: nome, nome de preferência, foto opcional, nascimento, idioma, país, fuso IANA, contatos, endereço opcional, vínculo, necessidades de acessibilidade e rede de apoio. Preferências: interesses, hábitos, alimentação, atividades favoritas, horários e objetivos pessoais.

Dados clínicos opcionais e restritos: alergias relatadas, condições informadas, profissionais, convênio, orientações e documentos, com fonte/data. Não exigir diagnóstico para ativar o app. Não traduzir automaticamente prescrições ou relatos.

Mãe e pai têm perfis independentes. Identificar perfil ativo em todas as ações. Ao trocar perfil, não transportar formulário ou cache do anterior. Avisar sobre rascunho não salvo. Arquivar preserva histórico; excluir exige fluxo explícito.

## 5. PERSONALIZAÇÃO POR CHECKBOX

O usuário seleciona os módulos usados por cada pessoa. Desmarcado significa não acompanhar aquele módulo. Não ativar todos por padrão nem obrigar preenchimento completo.

Módulos selecionáveis:
1. Rotina e autonomia.
2. Medicamentos.
3. Alimentação e hidratação.
4. Saúde, consultas e exames.
5. Atividade física.
6. Aulas e aprendizagem.
7. Reabilitação orientada.
8. Lazer, cultura e espiritualidade.
9. Socialização e visitas.
10. Humor, sono e memória cotidiana.
11. Peso, medidas e sinais vitais registrados.
12. Mobilidade e transporte.
13. Casa e segurança.
14. Compras e abastecimento.
15. Finanças e despesas.
16. Documentos e serviços.
17. Equipe e passagem de turno.
18. Incidentes, quedas e feridas.
19. Projetos pessoais e memórias.
20. Estoque de medicamentos e insumos.

Permitir escolher campos opcionais e adicionar campos simples: texto, número/unidade, seleção, data e sim/não. Validar e versionar definições para preservar registros antigos. Não executar código de campo personalizado nem criar cálculos clínicos.

Desativar módulo oculta novas rotinas e navegação, preservando histórico/exportação autorizados. Explicar e confirmar interrupção de lembretes futuros. Reativação não recria ocorrências duplicadas. Salvar preferências no backend. Ocultação visual não substitui autorização.

## 6. PAINEL HOJE, SEMANA E LINHA DO TEMPO

Hoje: perfil, última atualização, próximas atividades, responsável, pendências e ações rápidas. Estados distintos: planejado, confirmado conforme relato, não realizado, cancelado, reagendado e sem registro.

Semana: cuidados, movimento, aulas, lazer, descanso e compromissos. Avisar sobre conflitos e sobrecarga de horários sem gerar nota de saúde ou impor rotina.

Linha do tempo com filtros por perfil, módulo, período e autor. Mostrar horário previsto, ocorrido e registrado, origem e correções auditadas. Não exibir Tudo em dia por ausência de dados.

Visão consolidada de várias pessoas deve identificar cada perfil e respeitar permissões. Resumos diário/semanal usam dados reais e indicam lacunas.

## 7. ROTINA DIÁRIA E AUTONOMIA

Higiene, vestuário, cuidados pessoais, organização e tarefas escolhidas. Indicar, conforme relato: faz sozinho, deseja companhia, precisa de ajuda parcial ou completa. Sem classificação clínica automática.

Cada rotina tem preferência de horário, recorrência, apoio necessário, responsável e instruções informadas. Mudanças são observações para acompanhamento, não diagnóstico de dependência. Não criar ranking moral dos familiares.

## 8. SAÚDE, CONSULTAS E EXAMES

Agenda com profissional, especialidade, local/modalidade, horário, contato, acompanhante, transporte e documentos. Preparos de exames são transcritos da fonte, com data; nunca inventar jejum, suspensão de remédio ou orientação.

Pré-consulta: dúvidas, documentos selecionados e registros do período. Pós-consulta: orientações recebidas, tarefas e próximos passos confirmados. Relatório descritivo sem diagnóstico automatizado.

Calendário permite recorrência, edição de ocorrência/série e conflitos. Reagendamento oferece atualizar transporte e acompanhante relacionados, sem mudanças silenciosas.

## 9. MEDICAMENTOS E ESTOQUE

Medicamento: nome informado, apresentação, quantidade/unidade, instrução, horários, início/fim, responsável e prescrição opcional. Não recomendar dose, interações ou tratamento.

Ocorrências únicas: pendente, confirmado conforme relato, recusado, não realizado ou outro motivo. Distinguir executor de registrador. Confirmação manual não comprova ingestão. Duas confirmações simultâneas não duplicam evento nem baixa.

Usar fuso da pessoa e tratar horário de verão. Alteração de agenda afeta futuro, preserva passado. Alerta deve dizer sem confirmação, não afirmar esquecimento.

Estoque: entradas, saídas, ajustes, unidade, validade e mínimo. Correções geram compensação auditada. Estimativa de duração claramente rotulada. Estoque baixo oferece incluir item em compras, sem compra externa automática nem alteração de dose.

## 10. ALIMENTAÇÃO E HIDRATAÇÃO

Refeições planejadas/registradas, aceitação relatada, preferências, restrições informadas e responsável. Plano alimentar pode ser cadastrado de orientação profissional; não prescrever dieta.

Hidratação com volume, unidade, horário e observação. Meta somente informada, com origem; não aplicar meta universal. Integrar compras e preparo após confirmação. Não inferir desidratação ou desnutrição dos registros.

## 11. ATIVIDADE FÍSICA — MÓDULO COMPLETO

Cadastrar caminhada, dança, hidroginástica, musculação, alongamento e outras atividades escolhidas, sem recomendar adequação individual pela idade.

Cada atividade inclui:
- nome, categoria e objetivo pessoal;
- interesse e escolha da pessoa;
- frequência, recorrência, duração e horário;
- endereço, acessibilidade e modalidade;
- profissional/instrutor e contato;
- acompanhante e transporte de ida/volta;
- custo, periodicidade e pagador;
- materiais e preparação;
- orientações/restrições informadas, fonte e data;
- participação: planejada, participou, faltou, cancelou ou reagendou;
- percepção voluntária: gostou, dificuldade relatada, quer continuar/mudar;
- observações e próximos passos.

Telas: lista, cadastro, detalhe, calendário e histórico de participação. Motivo de ausência opcional, sem culpa ou punição. Metas escolhidas podem acompanhar presença, não prescrever carga/intensidade. Não emitir liberação médica ou adaptar exercícios clinicamente por IA.

## 12. AULAS, CURSOS E APRENDIZAGEM

Informática, idiomas, música, artesanato, leitura, fotografia e outros interesses. Registrar instituição/professor, contato, modalidade, link validado, matrícula, início/fim, recorrência, materiais, custo, transporte e acompanhante.

Suportar gratuitos e pagos. Presença, conteúdos vistos, tarefas opcionais, satisfação e desejo de continuar. Certificados privados. Avisos de renovação da matrícula e mensalidade configuráveis.

Usuário cadastra oferta local/online manualmente; não exigir marketplace. Não inventar vagas, preço ou disponibilidade. Pesquisa externa futura depende de fontes reais e atualizadas.

## 13. REABILITAÇÃO E EXERCÍCIOS ORIENTADOS

Organizar fisioterapia, terapia ocupacional, fonoaudiologia e exercícios fornecidos pelo profissional. Fonte, instrução original, frequência informada, datas, anexos, responsável e sessões.

Atividade domiciliar segue orientação cadastrada. Não gerar séries, repetições ou mudanças por IA. Registrar execução relatada e dúvidas para o profissional. Imagens opcionais privadas. Frequência de uso não comprova recuperação clínica.

## 14. LAZER, CULTURA E ESPIRITUALIDADE

Passeios, cinema, teatro, museus, jogos, jardinagem, hobbies, eventos e práticas religiosas de preferência da pessoa. Companhia, ingresso, custo, acessibilidade, transporte e materiais.

Lista Quero fazer, com planejamento gradual. Espiritualidade opcional, sem presumir crença ou exigir compartilhamento. Depois do evento: memórias e avaliação voluntária. Não transformar lazer em obrigação médica.

## 15. VIDA SOCIAL E RELACIONAMENTOS

Contatos de confiança, aniversários, visitas, ligações, amigos e encontros em comunidade. Planejar convites e registrar contatos ocorridos manualmente. Não monitorar chamadas privadas ou mensagens.

Objetivos escolhidos e lembretes gentis. Não diagnosticar solidão, abandono ou depressão por contagem de eventos. Ausência de registros pode ser sinalizada como tal. Comentários vinculados a atividades podem atender comunicação operacional sem criar outro mensageiro completo.

## 16. HUMOR, SONO, MEMÓRIA, MEDIDAS E SINAIS VITAIS

Humor voluntário com opções simples e observações. Sono com horários e percepção. Memória/orientação com relatos cotidianos, autoria/contexto, sem testes ou rótulos diagnósticos.

Peso e sinais vitais: valor, unidade, horário, origem e responsável. Validar formato e unidades; confirmar provável erro de digitação sem diagnóstico. Gráficos descritivos, ausência de dados identificada.

Mudança de padrão, quando exibida, precisa informar janela e dados utilizados e limitar-se a descrição. Não criar pontuação de risco clínico. Metas/parâmetros específicos apenas informados com fonte apropriada, sem limites universais inventados.

## 17. MOBILIDADE E TRANSPORTE

Ida e volta separadas para consulta, aula ou passeio: responsável, horário, local, contato, meio de transporte, custo e acessibilidade informada.

Estados: a combinar, confirmado, saída registrada, chegada registrada e cancelado. São registros manuais, não GPS. Responsável pela ida não assume automaticamente a volta.

Avisar conflito entre deslocamentos e compromissos. Não prometer reservar transporte externo sem integração. Cancelar evento oferece cancelar o deslocamento interno vinculado, sem afirmar cancelamento do serviço externo.

## 18. CASA, SEGURANÇA E SERVIÇOS

Limpeza, lavanderia, roupa de cama, manutenção, iluminação, obstáculos e adaptações identificadas pela família/profissional. Registro com local, foto opcional, tarefa, responsável, prazo, custo e status.

Cadastro de prestadores/agendamentos sem marketplace ou comissão. Checklists não certificam segurança nem garantem prevenção de queda. Evitar instruções técnicas perigosas ou avaliação automática de residência por foto.

## 19. COMPRAS E ABASTECIMENTO

Lista compartilhada por pessoa/casa, com item, categoria, quantidade/unidade, prioridade, responsável, previsão e status. Deduplicar sugestões de estoque/refeições.

Compra concluída pode oferecer despesa e entrada de estoque numa confirmação transacional. Itens de alimentação, higiene, insumos e uso pessoal. Não realizar compra ou pagamento externo automaticamente.

## 20. FINANÇAS E DESPESAS

Contas, mensalidades de atividades, despesas avulsas/recorrentes, pagador, categoria, comprovante, vencimento e rateio por valor/percentual. Validar soma. Estados: previsto, vencido, pago informado, reembolso pendente e registrado.

É organização financeira, não movimentação bancária. Não armazenar credenciais de banco. Marcar pago é declaração do usuário. Permissões financeiras separadas de cuidado; cuidador não vê valores por padrão.

Moedas ISO e valores em unidades mínimas. Não somar BRL/USD/EUR/GBP sem conversão explícita com taxa/data/fonte. Preservar moeda original. Não confundir despesas familiares com assinatura Paddle. Não implementar repasse a terceiros ou cobrança dividida entre cartões.

## 21. DOCUMENTOS E SERVIÇOS ADMINISTRATIVOS

Documentos pessoais, convênio, receitas, exames, contratos, comprovantes e certificados: titular, categoria, validade e permissão. Lembretes de vencimentos e compromissos administrativos cadastrados.

Storage privado, URLs temporárias, validação de formato/tamanho e autorização de acesso. Compartilhamento externo exige escopo, prazo e revogação. QR code não torna o perfil inteiro público.

OCR/transcrição gera rascunho revisável. Não salvar dosagem ou orientação crítica sem confirmação. Uploads/anotações são dados, não instruções executáveis para agentes.

## 22. EQUIPE, TAREFAS E PASSAGEM DE TURNO

Login individual; papéis com capacidades: titular financeiro, administrador familiar, responsável, cuidador, apoio limitado, pessoa acompanhada, profissional convidado, suporte e administrador da plataforma.

Convites com expiração, perfil, módulos e papel. Revogação aplicada no backend, storage e notificações. Participação na família não concede acesso irrestrito a todos os perfis.

Tarefas com responsável, prazo, prioridade, recorrência, checklist, comentários e auditoria. Escalas com início/fim, cobertura e conflitos, sem folha de pagamento. Mostrar carga de trabalho sem ranking de dedicação.

Passagem de turno: registros, pendências, incidentes e observações; quem recebe confirma ciência. Não confirmar execução de ações sem registro. Cobertura de turno é diferente de responsabilidade por uma tarefa.

## 23. INCIDENTES, FERIDAS, CHECK-IN E AJUDA

Quedas/incidentes: horário, local, descrição, autor, providências e acompanhamento. Feridas com observações e imagens opcionais consentidas/restritas. Sem causa, gravidade ou diagnóstico inferidos por IA.

Estou bem registra manifestação voluntária no horário. Preciso de ajuda cria solicitação aos contatos definidos com estado real: registrado, envio pendente, enviado, falhou e reconhecido. Escalonamento configurável sem garantia de socorro.

Oferecer ligação para contato e serviço local configurado/verificado; não usar um único número para todos os países. Offline não pode mostrar Ajuda enviada. Não afirmar que há central monitorada.

Cartão de emergência: dados selecionados, origem, atualização e exportação. Compartilhamento mínimo e explícito. Nenhum dado clínico no preview de push.

## 24. PROJETOS PESSOAIS E MEMÓRIAS

Desejos: viajar, aprender instrumento, cultivar horta, reencontrar alguém, organizar fotos e contar histórias. Pequenos passos, apoiadores, previsão de custo e datas opcionais.

Memórias com texto, áudio/foto, autoria, consentimento e público escolhido. Preservar relato original e permitir correção. IA opcional não inventa fatos. Sem publicação automática nem uso em publicidade.

## 25. INTEGRAÇÃO ENTRE MÓDULOS

Criar modelo compartilhado de atividade com vínculos para ocorrências, responsáveis, transporte, materiais, documentos e despesas. Não duplicar informações em calendários independentes.

Exemplo central: aula de dança semanal. Após o cadastro, apresentar prévia opcional de compromissos recorrentes, transporte de ida/volta, lembretes de materiais e mensalidade. Confirmar antes de criar. Mensalidade mensal gera uma despesa mensal, não uma por aula.

Reagendamento/cancelamento mostra itens afetados e permite escolher atualizações. Preservar ocorrências passadas e despesas já pagas. Retentativas não duplicam: chave única por origem/ocorrência/efeito e transação de banco.

Outras integrações:
- Consulta → acompanhante, transporte e documentos.
- Estoque baixo → sugestão de compra.
- Compra concluída → estoque e despesa após confirmação.
- Curso → calendário, materiais, custo e presença.
- Incidente → tarefa de acompanhamento.
- Projeto pessoal → passos, agenda e orçamento opcional.

Automação reduz preenchimento, mas não efetua compra, transferência externa ou alteração sensível silenciosa. Oferecer desfazer quando aplicável e manter auditoria.

## 26. INTERFACE, ACESSIBILIDADE E ONBOARDING

Mobile-first, desktop e PWA. Agrupar navegação em Hoje, Agenda, Minha vida/Atividades, Cuidados, Organização, Equipe e Configurações, adaptando ao design existente. Não despejar vinte módulos no menu.

Modo simplificado com poucos botões, texto ajustável, contraste, áreas de toque amplas, rótulos junto a ícones, teclado, foco e leitores de tela. Não depender só de cor nem infantilizar.

Estados de loading, vazio, erro, offline, sem permissão e confirmação. Operações críticas não podem parecer concluídas se o servidor falhou. Onboarding: criar perfil, escolher módulos, cadastrar primeira ação e convidar apoio opcional. Pessoa independente pode usar sem convidar ninguém.

Dados demonstrativos só em ambiente separado e identificado. Nunca preencher conta real com exemplo fictício. Ajuda contextual e formulário de suporte.

## 27. NOTIFICAÇÕES, PWA E OFFLINE

Notificações internas/e-mail existentes e Web Push quando suportado/autorizado. Preferências por perfil, canal, módulo, prioridade e horário. Jobs de servidor com fila durável, retentativa, deduplicação e monitoramento.

PWA não garante execução contínua em segundo plano. Enviado não significa lido. Respeitar fusos e mudanças de horário de verão. Recalcular apenas lembretes futuros após edição de série.

Não usar cache público para documentos/saúde. Escrita offline, se implementada, requer fila identificada, armazenamento protegido, idempotência e conflitos visíveis. Se indisponível, indicar conexão necessária. Nunca duplicar confirmação de medicamento ao sincronizar.

## 28. IDIOMAS E LOCALIDADES

Preservar idiomas ativos. Catálogos para pt-BR, en-US, es-419 e preparação de de-DE/fr-FR conforme base existente. Publicar somente traduções completas/revisadas. Não traduzir automaticamente prescrições, medicamentos ou relatos livres.

Idioma, país, moeda, unidade e fuso são escolhas distintas. Datas/telefones/endereços locais; fuso IANA da pessoa para rotinas. Suportar familiar em outro país. Textos, erros, relatórios e notificações também traduzidos.

## 29. PADDLE E DIREITOS DE ACESSO

Preservar integração atual, produtos, preços e moedas USD/EUR/GBP/BRL. Detectar Billing ou Classic e usar versão real; não migrar automaticamente. Respeitar planos e limites de pessoas/usuários já configurados.

Checkout valida titular/preço no servidor. Nenhum cartão no banco do app. Webhooks com assinatura validada, evento idempotente, processamento durável e reconciliação. Não conceder acesso só por sucesso visual no checkout.

Tratar pagamento, falha, trial, mudança de plano, pausa, cancelamento e estorno. Eventos fora de ordem não sobrescrevem estado válido com antigo. Cancelamento respeita período pago; tolerância, exportação e retenção explícitas. Não apagar dados por cancelamento.

Portal de assinatura acessível ao titular. Separar sandbox/live. Não incluir dados de saúde em custom_data. **Nenhum evento Paddle deve gerar comissão de afiliado nesta fase.** Suspender integração de afiliados não pode quebrar a assinatura.

## 30. DADOS, PERMISSÕES E SEGURANÇA

Reutilizar entidades existentes. Entidades lógicas necessárias:
- usuários, organizações, unidades, membros, convites e permissões por perfil;
- perfis, preferências, módulos e campos versionados;
- atividades, recorrências, ocorrências, participação, locais e profissionais;
- vínculos de transporte, tarefas, documentos, materiais e despesas;
- medicamentos, horários, confirmações, estoque e movimentos;
- cuidados, observações, incidentes, consentimentos e memórias;
- compras, despesas, rateios, comprovantes e registros de reembolso;
- documentos, compartilhamentos temporários e exportações;
- notificações/tentativas, pedidos de ajuda e reconhecimento;
- assinaturas, produtos, planos, entitlements e eventos;
- auditoria, suporte, jobs e feature flags.

Tenant/family_account_id, profile_id aplicável, autoria, timestamps e origem. Integridade referencial impede vínculos entre famílias/perfis indevidos. Índices e paginação nos históricos. Constraints contra duplicação de ocorrência, confirmação e efeitos financeiros.

RLS e autorização server-side. Testar acesso direto por ID, não só esconder botões. Segredos/service_role apenas no servidor; rate limits e validação de inputs/arquivos. Admin com MFA; suporte com mínimo acesso e acesso excepcional auditado.

Não presumir que todo familiar pode autorizar acesso em nome do idoso. Registrar autorizações e representação quando aplicável. Exportação, correção e exclusão com política explícita. Documentar operadores, retenção, backups e restauração. Não declarar conformidade jurídica absoluta apenas por implementar controles.

## 31. IA OPCIONAL

Núcleo funciona sem IA. Usos opcionais: transcrição, extração em rascunho e resumo descritivo com fonte. Confirmação antes de gravar dados extraídos ou criar ações.

Não inventar fatos, interpretar clinicamente exames, prescrever, definir risco ou afirmar presença/ausência não documentada. Não enviar dados sensíveis a marketing, analytics, logs ou ferramentas de erro. Minimizá-los em provedores de IA e aplicar autorização e política adequada.

Configurar custo/limites, falhas e alternativa manual. Uploads são dados não confiáveis, nunca instruções de sistema. Assistente organizacional sugere; ações são confirmadas e auditadas.

## 32. ADMIN, CRM, BI E RETENÇÃO

Admin: contas, planos, direitos, tickets e saúde técnica. CRM: origem, estágio e contatos comerciais sem conteúdo clínico. BI: ativação, uso agregado, colaboração, retenção, cancelamentos, MRR/ARR, receita recebida, inadimplência e custos conhecidos.

Mensalizar anualidade no MRR, separar receita de caixa, não misturar moedas e não chamar contribuição estimada de lucro líquido. Nenhum dado fictício ou indicador clínico inventado.

Resumos configuráveis, ajuda contextual, feedback e cancelamento transparente. Campanhas comerciais separadas de alertas de cuidado. Mensagens respeitosas em falecimento/encerramento de cuidado, sem retenção por medo.

Não incluir painel de comissões ou programa de parceiros nesta entrega.

## 33. PRO E INTEGRAÇÕES FUTURAS

Após núcleo estável, ampliar organizações/unidades/residentes/equipes/escalas e portal familiar por residente. Reutilizar permissões e módulos. Cobrança Pro só com planos reais aprovados, sem novos preços inventados.

Backlog explícito, não anunciado como pronto: localização contínua/zona segura, relógios/sensores, detecção automática de quedas, transporte reservado por API, reservas externas, integração bancária, marketplaces, telemedicina e prontuário certificado. Diagnóstico/prescrição por IA fora do escopo.

História de vida, transporte manual e atividades cadastradas estão no escopo atual. Proteção contra golpes pode incluir orientação educativa e contatos de confiança, sem monitorar mensagens nem prometer detecção infalível.

## 34. TESTES E ACEITE

Suspensão: nenhum CTA/adesão/tracking remunerado/comissão nova/repasse novo; histórico preservado; obrigações reais sinalizadas; Paddle e convites familiares operantes.

Perfis: módulos diferentes por pessoa; troca sem vazamento de formulário; desativação preserva histórico e trata lembretes; revogação bloqueia API/storage/notificações; família A não acessa B; cuidador sem acesso financeiro não vê despesas.

Atividades: curso semanal cria ocorrências corretas; mensalidade não duplica por aula; ida/volta independentes; reagendar mostra impactos; cancelar ocorrência não cancela série; presença/satisfação não geram diagnóstico; retentativa não duplica efeitos.

Cuidados: confirmação concorrente de medicamento não duplica baixa; correção auditada; sem registro exibido corretamente; estoque sugere compra sem executá-la; ajuda distingue falha/envio/reconhecimento; relatório respeita perfil/período/permissão.

Cobrança: pagamento válido concede acesso uma vez; duplicidade e ordem de webhooks tratadas; cancelamento respeita período; BRL/USD/EUR/GBP preservados. Nenhuma regressão de cobrança causada pela suspensão de afiliados.

Qualidade: fusos e horário de verão; offline sem falso sucesso; mobile/desktop; teclado/acessibilidade dos fluxos críticos; build/tipos/lint/testes relevantes. Documentar testes não executados e dependências reais.

## 35. ETAPAS DE EXECUÇÃO

0. Suspender afiliados com segurança, preservar Paddle, inventariar projeto e criar matriz de requisitos.
1. Perfis, permissões, módulos, onboarding, Hoje, semana e modo simplificado.
2. Modelo integrado de atividades, recorrências, agenda, responsáveis e vínculos.
3. Atividade física, aulas, reabilitação cadastrada, lazer, socialização, transporte e objetivos pessoais. São centrais nesta atualização, não extras esquecidos.
4. Completar medicamentos, estoque, alimentação, hidratação, rotina, autonomia, observações, incidentes e turnos.
5. Casa, compras, despesas, documentos, memórias, relatórios e integrações internas.
6. Notificações, PWA, idiomas, suporte, CRM/BI e revisão da assinatura existente.
7. QA integrado, segurança, acessibilidade, migração compatível e preparação de entrega.
8. Extensão Pro gradual com flags; dependências externas ficam explicitadas.

Cada etapa entrega objetivo, telas, tabelas/políticas, implementação, estados de erro e testes. Não parar no plano. Em bloqueio real, avançar partes independentes. Manter checkpoint para continuar sem reiniciar quando acabar o contexto.

## 36. ENTREGÁVEIS NO REPOSITÓRIO

- Código funcional, migrations compatíveis e políticas.
- Matriz requisito → tela/API/tabela/permissão/teste/status.
- Documentação dos módulos e vínculos entre atividades, transporte, materiais e despesas.
- Matriz de permissões e regras de compartilhamento.
- Relatório da suspensão dos afiliados, preservando histórico.
- .env.example com placeholders, sem credenciais.
- Guia de notificações, jobs, sandbox/live e Paddle existente.
- Testes críticos e resultados; guia de backup, deploy e rollback.
- Backlog separado de integrações futuras.

Atualizar docs/parent-care-implementation-status.md por etapa. Estados: existente validado, implementado, testado, pendente de configuração, bloqueado e futuro. Não marcar pronto só por existir tela.

Relatório final: o que mudou, evidências dos testes, pendências de credenciais e limitações reais. Sem alegar publicação ou integrações ativas não realizadas.

**COMECE AGORA: interrompa afiliados/influencers, preserve o Paddle, inspecione o repositório e implemente incrementalmente a gestão completa da vida da pessoa idosa.**
