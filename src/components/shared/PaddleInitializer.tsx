'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    Paddle?: any;
  }
}

export default function PaddleInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || 'live_8b221e28dc09462a981f134d24f';
    if (!token) return;

    const initPaddle = () => {
      if (window.Paddle) {
        try {
          const isSandbox = token.startsWith('test_') || process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox';
          if (isSandbox) {
            window.Paddle.Environment?.set('sandbox');
          }
          window.Paddle.Setup?.({ token });
        } catch (e) {
          console.warn('[Paddle] Setup error:', e);
        }
      }
    };

    const loadScript = () => {
      if (window.Paddle) {
        initPaddle();
        return;
      }
      if (document.querySelector('script[src*="paddle.js"]')) {
        const check = setInterval(() => {
          if (window.Paddle) {
            clearInterval(check);
            initPaddle();
          }
        }, 100);
        setTimeout(() => clearInterval(check), 5000);
        return;
      }

      const s = document.createElement('script');
      s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      s.async = true;
      s.onload = () => initPaddle();
      document.head.appendChild(s);
    };

    // If _ptxn is in URL, load immediately so checkout opens
    const search = window.location.search;
    if (search && search.includes('_ptxn=')) {
      loadScript();
    } else if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => loadScript());
    } else {
      setTimeout(loadScript, 1500);
    }
  }, []);

  return null;
}
