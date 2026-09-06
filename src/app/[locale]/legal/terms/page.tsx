import { setRequestLocale } from 'next-intl/server';

export default function TermsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 prose prose-emerald text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Termos de Uso</h1>
      <p className="mb-4">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">1. Aceitação dos Termos</h2>
      <p className="mb-4">
        Ao acessar e utilizar o sistema <strong>Parent Care</strong>, você concorda em cumprir e ser 
        vinculado por estes Termos de Uso. Se você não concorda com qualquer parte destes termos, 
        não deve usar nossos serviços.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">2. Descrição do Serviço</h2>
      <p className="mb-4">
        O Parent Care é uma plataforma SaaS (Software as a Service) voltada ao acompanhamento, 
        gestão e coordenação de cuidados de saúde. A plataforma é fornecida &quot;como está&quot; e tem como 
        objetivo auxiliar profissionais, clínicas e responsáveis no registro e acompanhamento de dados, 
        não substituindo aconselhamento médico, diagnóstico ou tratamento profissional.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">3. Responsabilidades do Usuário</h2>
      <p className="mb-4">
        Como usuário, você é responsável por:
      </p>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>Manter a confidencialidade de suas credenciais de acesso.</li>
        <li>Garantir a precisão e a veracidade dos dados inseridos, especialmente os de natureza médica.</li>
        <li>Obter os consentimentos necessários (como o de responsáveis legais) antes de registrar dados de terceiros na plataforma.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">4. Propriedade Intelectual</h2>
      <p className="mb-4">
        Todo o conteúdo, software, design, texto e gráficos presentes no Parent Care são de propriedade 
        exclusiva da nossa empresa. É proibida a reprodução, modificação, distribuição ou uso comercial 
        sem autorização prévia.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">5. Limitação de Responsabilidade</h2>
      <p className="mb-4">
        O Parent Care não se responsabiliza por decisões médicas tomadas com base nas informações armazenadas 
        no sistema. O uso da plataforma é de sua inteira responsabilidade. Em nenhuma hipótese seremos 
        responsáveis por danos indiretos, incidentais ou consequentes resultantes do uso do serviço.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">6. Modificações dos Termos</h2>
      <p className="mb-4">
        Reservamo-nos o direito de modificar estes Termos a qualquer momento. O uso contínuo da 
        plataforma após tais alterações constitui sua aceitação dos novos Termos.
      </p>
    </div>
  );
}
