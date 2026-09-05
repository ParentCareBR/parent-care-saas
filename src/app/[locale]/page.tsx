'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, ShieldCheck, Clock, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-brand-green fill-brand-green" />
            <span className="text-xl font-bold text-brand-green">Parent Care</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-stone-600 hover:text-brand-green transition-colors">
              Entrar
            </Link>
            <Button asChild className="bg-brand-green hover:bg-emerald-800">
              <Link href="/auth/signup">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-32 px-4 text-center bg-brand-soft">
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl md:text-6xl font-extrabold text-stone-900 tracking-tight">
              Cuidar de quem sempre <span className="text-brand-green">cuidou de você</span>
            </h1>
            <p className="text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
              Uma plataforma global para famílias organizarem o cuidado de pais idosos. Acompanhe medicamentos, tarefas e a saúde de quem você ama, de qualquer lugar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-brand-green hover:bg-emerald-800">
                <Link href="/auth/signup">Criar conta da família</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-stone-900">Tudo que sua família precisa</h2>
              <p className="mt-4 text-lg text-stone-600">Centralize as informações e divida as responsabilidades.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                <div className="w-12 h-12 bg-green-100 text-green-700 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Rotina e Remédios</h3>
                <p className="text-stone-600">Controle rigoroso de horários, medicamentos e confirmações com alertas em tempo real.</p>
              </div>

              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center mb-4">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Tela Simplificada</h3>
                <p className="text-stone-600">Um ambiente seguro, com botões grandes e interface acessível feita especialmente para a pessoa idosa.</p>
              </div>

              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Trabalho em Equipe</h3>
                <p className="text-stone-600">Convide irmãos, cuidadores profissionais e divida as tarefas do dia a dia facilmente.</p>
              </div>

              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                <div className="w-12 h-12 bg-red-100 text-red-700 rounded-xl flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Botão de Emergência</h3>
                <p className="text-stone-600">Alerta instantâneo para todos os responsáveis cadastrados em caso de necessidade urgente.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-stone-900 text-stone-400 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-brand-green fill-brand-green" />
            <span className="text-lg font-bold text-white">Parent Care</span>
          </div>
          <p>© 2026 Parent Care. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
