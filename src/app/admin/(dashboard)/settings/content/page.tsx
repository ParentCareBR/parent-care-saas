'use client';
import { Globe, Mail, Bell, FileText, Languages, Settings2 } from 'lucide-react';

const sections = [
  { icon: Globe, title: 'Países Ativos', description: 'Configure quais países o sistema suporta e suas configurações regionais.', status: 'Em breve' },
  { icon: Languages, title: 'Idiomas & Traduções', description: 'Gerencie os idiomas disponíveis e edite as traduções da interface.', status: 'Em breve' },
  { icon: Mail, title: 'Templates de E-mail', description: 'Edite os e-mails de boas-vindas, convites, alertas e faturas enviados aos clientes.', status: 'Em breve' },
  { icon: Bell, title: 'Notificações do Sistema', description: 'Configure notificações push e alertas automáticos para usuários e administradores.', status: 'Em breve' },
  { icon: Settings2, title: 'Mensagens da Interface', description: 'Textos de onboarding, tooltips, mensagens de erro e confirmação.', status: 'Em breve' },
  { icon: FileText, title: 'Termos & Políticas', description: 'Termos de uso, política de privacidade, cookies e contratos.', status: 'Em breve' },
];

export default function ContentSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestão de Conteúdo</h1>
      <p className="text-gray-500 text-sm mb-6">Configure textos, e-mails, traduções e documentos institucionais do Parent Care.</p>
      <div className="grid grid-cols-2 gap-4">
        {sections.map(s => (
          <div key={s.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <s.icon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{s.status}</span>
                </div>
                <p className="text-gray-500 text-sm mt-1">{s.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
