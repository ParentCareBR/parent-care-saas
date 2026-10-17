'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Share2, PlusSquare, Sparkles, Smartphone, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default true until client checks
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado com escopo:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err);
        });
    }

    // 2. Check if already running in standalone mode (installed)
    const isAppStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isAppStandalone);

    if (isAppStandalone) {
      setDismissed(true);
      return;
    }

    // 3. Check dismissal in localStorage
    try {
      const lastDismissed = localStorage.getItem('parentcare_pwa_dismissed');
      if (lastDismissed) {
        const diffDays = (Date.now() - Number(lastDismissed)) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) {
          setDismissed(true);
          return;
        }
      }
    } catch {}

    setDismissed(false);

    // 4. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    if (isAppleDevice && isSafari && !isAppStandalone) {
      setIsIOS(true);
    }

    // 5. Capture beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 6. Listen for appinstalled
    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      setTimeout(() => setDismissed(true), 3500);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalledSuccess(true);
        setTimeout(() => setDismissed(true), 3000);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('parentcare_pwa_dismissed', String(Date.now()));
    } catch {}
  };

  // Do not show if already standalone, or dismissed, or nothing to show
  if (isStandalone || dismissed) return null;

  return (
    <aside
      aria-label="Instalação do Aplicativo"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-[#0B1526] text-white border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {installedSuccess ? (
          <div className="flex items-center gap-3 py-2 text-emerald-400">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Check className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-sm text-white">Aplicativo Instalado com Sucesso!</p>
              <p className="text-xs text-slate-300">Você já pode abrir o Parent Care pela tela inicial.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 pr-6">
              <div className="w-12 h-12 rounded-2xl bg-[#0F4C3A] border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-md">
                <Smartphone className="h-6 w-6 text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    App no Celular
                  </span>
                </div>
                <h2 className="text-sm font-black text-white mt-1 leading-tight">
                  Instalar Parent Care na Tela Inicial
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  Abra direto como app, sem barra de navegador e com despertador sonoro em tela cheia.
                </p>
              </div>
            </div>

            {/* Instruction for iOS Safari */}
            {isIOS ? (
              <div className="bg-[#101D2B] border border-slate-700/80 rounded-2xl p-3 text-xs text-slate-200 space-y-1.5">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Share2 className="h-4 w-4 text-emerald-400" /> Como instalar no iPhone:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>
                    Toque no botão <span className="font-bold text-white">Compartilhar</span> (ícone quadrado com seta no rodapé do Safari).
                  </li>
                  <li>
                    Role para baixo e selecione <span className="font-bold text-white">&quot;Adicionar à Tela de Início&quot;</span> <PlusSquare className="inline h-3 w-3 ml-0.5" />.
                  </li>
                </ol>
              </div>
            ) : (
              /* Button for Android / Chrome / Edge */
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={!deferredPrompt}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all gap-2"
                >
                  <Download className="h-4 w-4" />
                  {deferredPrompt ? 'Instalar Aplicativo Agora' : 'Adicionar à Tela Inicial'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDismiss}
                  className="h-11 px-3 text-xs font-semibold text-slate-400 border-slate-700 hover:bg-white/5 hover:text-white rounded-xl"
                >
                  Agora Não
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
