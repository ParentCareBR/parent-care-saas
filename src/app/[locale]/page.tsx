import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Heart, Activity, CheckCircle2, Shield, Calendar, Users, Smartphone, CreditCard, ChevronRight, PlayCircle } from 'lucide-react';
import Image from 'next/image';

export default function Home({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = useTranslations('LandingPage');
  const n = useTranslations('Navigation');

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Heart className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-bold text-gray-900">Parent Care</span>
            </div>
            <div className="flex gap-4">
              <Link href={`/${locale}/auth/login`} className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2">
                {n('login')}
              </Link>
              <Link href={`/${locale}/auth/register`} className="bg-emerald-600 text-white hover:bg-emerald-700 px-5 py-2 rounded-full font-medium transition-colors">
                {n('register')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">

          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-6">
            {t('hero_title')} <span className="text-emerald-600">{t('hero_subtitle')}</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('hero_description')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href={`/${locale}/auth/register`} className="bg-emerald-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
              {t('cta_primary')} <ChevronRight className="h-5 w-5" />
            </Link>
            <Link href="#demo" className="bg-white text-gray-700 border-2 border-gray-200 px-8 py-4 rounded-full font-bold text-lg hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
              <PlayCircle className="h-5 w-5" /> {t('cta_secondary')}
            </Link>
          </div>
        </div>
        
        <div className="mt-16 max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl relative aspect-[16/9] border-4 border-white">
          <Image 
            src="/images/family-planning.jpg" 
            alt="Família planejando o cuidado juntos" 
            fill
            className="object-cover"
            priority
          />
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">{t('problem_title')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="h-12 w-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Activity className="h-6 w-6" />
              </div>
              <p className="text-gray-600 font-medium">{t('problem_desc_1')}</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-gray-600 font-medium">{t('problem_desc_2')}</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <CreditCard className="h-6 w-6" />
              </div>
              <p className="text-gray-600 font-medium">{t('problem_desc_3')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24" id="demo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('solution_title')}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
                <Users className="h-4 w-4" /> Visão Administrativa
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('solution_family')}</h3>
              <p className="text-gray-600 mb-6 text-lg">{t('solution_family_desc')}</p>
              <ul className="space-y-4">
                {['Gerencie o estoque de medicamentos', 'Adicione lembretes e alarmes', 'Acompanhe quem pagou o quê', 'Convide todos os irmãos'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex items-center justify-center bg-gray-50">
              <Image 
                src="/images/dashboard.png" 
                alt="Dashboard Administrativo" 
                width={800} 
                height={600}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center mt-24 flex-col-reverse md:flex-row-reverse">
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-gray-100 mx-auto w-full max-w-md aspect-[3/4] flex items-center justify-center">
              <Image 
                src="/images/elderly-care.jpg" 
                alt="Visão Simplificada para Idosos" 
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium mb-4">
                <Smartphone className="h-4 w-4" /> Visão Simplificada
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('solution_elderly')}</h3>
              <p className="text-gray-600 mb-6 text-lg">{t('solution_elderly_desc')}</p>
              <ul className="space-y-4">
                {['Botões gigantes e claros', 'Cores fortes de contraste', 'Apenas 1 tarefa por vez na tela', 'Não precisa de e-mail ou senha'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">{t('features_title')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <Activity className="h-8 w-8 text-emerald-600 mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-2">{t('feature_meds')}</h4>
              <p className="text-gray-600">{t('feature_meds_desc')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <CreditCard className="h-8 w-8 text-emerald-600 mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-2">{t('feature_finance')}</h4>
              <p className="text-gray-600">{t('feature_finance_desc')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <Calendar className="h-8 w-8 text-emerald-600 mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-2">{t('feature_routine')}</h4>
              <p className="text-gray-600">{t('feature_routine_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-6 w-6 text-emerald-500" />
              <span className="text-lg font-bold text-white">Parent Care</span>
            </div>
            <p className="text-sm">© {new Date().getFullYear()} Parent Care. {t('footer_rights')}</p>
          </div>
          <div>
            <h5 className="text-white font-medium mb-4">Legal</h5>
            <ul className="space-y-2 text-sm">
              <li><Link href={`/${locale}/legal/privacy`} className="hover:text-white transition-colors">{t('footer_privacy')}</Link></li>
              <li><Link href={`/${locale}/legal/terms`} className="hover:text-white transition-colors">{t('footer_terms')}</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
