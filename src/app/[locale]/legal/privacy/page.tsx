import React from 'react';
import { setRequestLocale } from 'next-intl/server';

export default function PrivacyPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  
  // If next-intl is configured, we can use it, but for now we'll write standard boilerplate in Portuguese.
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 prose prose-emerald text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
      <p className="mb-4">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      
      <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introdução</h2>
      <p className="mb-4">
        Bem-vindo ao <strong>Parent Care</strong>. Nós respeitamos a sua privacidade e estamos 
        comprometidos em proteger os seus dados pessoais e dados sensíveis de saúde. Esta 
        política descreve como coletamos, usamos, compartilhamos e protegemos suas informações 
        de acordo com a Lei Geral de Proteção de Dados Pessoais (LGPD).
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">2. Dados que Coletamos</h2>
      <p className="mb-4">
        Coletamos as seguintes categorias de informações:
      </p>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li><strong>Dados Cadastrais:</strong> Nome, e-mail, telefone e informações de login.</li>
        <li><strong>Dados de Saúde:</strong> Informações sobre pacientes, condições, terapias e acompanhamentos (considerados dados sensíveis).</li>
        <li><strong>Dados de Navegação:</strong> Endereços IP, cookies e informações de uso do sistema.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">3. Finalidade do Tratamento</h2>
      <p className="mb-4">
        Seus dados são tratados estritamente para as seguintes finalidades:
      </p>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>Fornecer, operar e manter os serviços do Parent Care.</li>
        <li>Gerenciar o acompanhamento de saúde do paciente conforme instruído pelos usuários.</li>
        <li>Melhorar e personalizar sua experiência na plataforma.</li>
        <li>Cumprir obrigações legais e regulatórias.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">4. Segurança dos Dados</h2>
      <p className="mb-4">
        Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais 
        contra acesso não autorizado, alteração, divulgação ou destruição. Devido à natureza dos 
        dados de saúde, aplicamos criptografia e controles rigorosos de acesso.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">5. Direitos do Titular</h2>
      <p className="mb-4">
        Sob a LGPD, você tem o direito de:
      </p>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>Confirmar a existência de tratamento.</li>
        <li>Acessar seus dados.</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
        <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade.</li>
        <li>Revogar o consentimento a qualquer momento.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">6. Contato</h2>
      <p className="mb-4">
        Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato através 
        do nosso canal de suporte ao cliente no próprio sistema.
      </p>
    </div>
  );
}
