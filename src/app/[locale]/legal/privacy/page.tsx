import React from 'react';
import { setRequestLocale } from 'next-intl/server';

export default function PrivacyPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      <div className="max-w-4xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold mb-2 text-stone-900 dark:text-white">Política de Privacidade</h1>
        <p className="mb-8 text-stone-500 dark:text-stone-400 text-sm">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">1. Introdução</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              Bem-vindo ao <strong className="text-stone-900 dark:text-white">Parent Care</strong>. Nós respeitamos a sua privacidade e estamos
              comprometidos em proteger os seus dados pessoais e dados sensíveis de saúde. Esta
              política descreve como coletamos, usamos, compartilhamos e protegemos suas informações
              de acordo com a Lei Geral de Proteção de Dados Pessoais (LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">2. Dados que Coletamos</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed mb-3">
              Coletamos as seguintes categorias de informações:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-700 dark:text-stone-300">
              <li><strong className="text-stone-900 dark:text-white">Dados Cadastrais:</strong> Nome, e-mail, telefone e informações de login.</li>
              <li><strong className="text-stone-900 dark:text-white">Dados de Saúde:</strong> Informações sobre pacientes, condições, terapias e acompanhamentos (considerados dados sensíveis).</li>
              <li><strong className="text-stone-900 dark:text-white">Dados de Navegação:</strong> Endereços IP, cookies e informações de uso do sistema.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">3. Finalidade do Tratamento</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed mb-3">
              Seus dados são tratados estritamente para as seguintes finalidades:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-700 dark:text-stone-300">
              <li>Fornecer, operar e manter os serviços do Parent Care.</li>
              <li>Gerenciar o acompanhamento de saúde do paciente conforme instruído pelos usuários.</li>
              <li>Melhorar e personalizar sua experiência na plataforma.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">4. Segurança dos Dados</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais
              contra acesso não autorizado, alteração, divulgação ou destruição. Devido à natureza dos
              dados de saúde, aplicamos criptografia e controles rigorosos de acesso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">5. Direitos do Titular</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed mb-3">
              Sob a LGPD, você tem o direito de:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-700 dark:text-stone-300">
              <li>Confirmar a existência de tratamento.</li>
              <li>Acessar seus dados.</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade.</li>
              <li>Revogar o consentimento a qualquer momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">6. Contato</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato através
              do nosso canal de suporte ao cliente no próprio sistema.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
