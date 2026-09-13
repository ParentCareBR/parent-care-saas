import { setRequestLocale } from 'next-intl/server';

export default function TermsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  return (
    <div className="min-h-screen bg-white dark:bg-stone-950">
      <div className="max-w-4xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold mb-2 text-stone-900 dark:text-white">Termos de Uso</h1>
        <p className="mb-8 text-stone-500 dark:text-stone-400 text-sm">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">1. Aceitação dos Termos</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              Ao acessar e utilizar o sistema <strong className="text-stone-900 dark:text-white">Parent Care</strong>, você concorda em cumprir e ser
              vinculado por estes Termos de Uso. Se você não concorda com qualquer parte destes termos,
              não deve usar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">2. Descrição do Serviço</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              O Parent Care é uma plataforma SaaS (Software as a Service) voltada ao acompanhamento,
              gestão e coordenação de cuidados de saúde. A plataforma é fornecida &quot;como está&quot; e tem como
              objetivo auxiliar profissionais, clínicas e responsáveis no registro e acompanhamento de dados,
              não substituindo aconselhamento médico, diagnóstico ou tratamento profissional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">3. Responsabilidades do Usuário</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed mb-3">Como usuário, você é responsável por:</p>
            <ul className="list-disc pl-6 space-y-2 text-stone-700 dark:text-stone-300">
              <li>Manter a confidencialidade de suas credenciais de acesso.</li>
              <li>Garantir a precisão e a veracidade dos dados inseridos, especialmente os de natureza médica.</li>
              <li>Obter os consentimentos necessários (como o de responsáveis legais) antes de registrar dados de terceiros na plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">4. Propriedade Intelectual</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              Todo o conteúdo, software, design, texto e gráficos presentes no Parent Care são de propriedade
              exclusiva da nossa empresa. É proibida a reprodução, modificação, distribuição ou uso comercial
              sem autorização prévia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">5. Limitação de Responsabilidade</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              O Parent Care não se responsabiliza por decisões médicas tomadas com base nas informações armazenadas
              no sistema. O uso da plataforma é de sua inteira responsabilidade. Em nenhuma hipótese seremos
              responsáveis por danos indiretos, incidentais ou consequentes resultantes do uso do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-stone-800 dark:text-stone-100">6. Modificações dos Termos</h2>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. O uso contínuo da
              plataforma após tais alterações constitui sua aceitação dos novos Termos.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
