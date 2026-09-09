'use client';

import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    Paddle?: any;
  }
}

let _scriptLoaded = false;
let _initialized = false;

/**
 * Loads Paddle.js once and initializes with the client token.
 * Works with Paddle Billing (v2).
 */
export function usePaddle() {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current || typeof window === 'undefined') return;
    initRef.current = true;

    if (_scriptLoaded && window.Paddle) {
      ensureInit();
      return;
    }

    // Avoid double-loading
    if (document.querySelector('script[src*="paddle.js"]')) {
      const poll = setInterval(() => {
        if (window.Paddle) {
          clearInterval(poll);
          ensureInit();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      _scriptLoaded = true;
      ensureInit();
    };
    script.onerror = () => {
      console.error('[Paddle] Failed to load paddle.js');
    };
    document.head.appendChild(script);
  }, []);

  function ensureInit() {
    if (!window.Paddle || _initialized) return;

    try {
      const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || 'live_8b221e28dc09462a981f134d24f';
      if (!token) {
        console.warn('[Paddle] NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set.');
        return;
      }

      const isSandbox = token.startsWith('test_') || process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox';
      if (isSandbox) {
        window.Paddle.Environment.set('sandbox');
      }

      window.Paddle.Setup({
        token,
        eventCallback: (event: any) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Paddle Event]', event?.name, event?.data);
          }
        },
      });
      _initialized = true;
    } catch (err) {
      console.error('[Paddle] Initialization error:', err);
    }
  }

  /**
   * Wait until Paddle is available (max 5s).
   */
  async function waitForPaddle(): Promise<boolean> {
    if (window.Paddle) return true;

    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (window.Paddle) {
        ensureInit();
        return true;
      }
    }
    return false;
  }

  /**
   * Open Paddle checkout overlay using a server-generated transactionId.
   * This keeps price-ID validation server-side (secure) while using
   * the seamless overlay UX.
   */
  const openCheckoutOverlay = useCallback(
    async (options: {
      transactionId: string;
      locale?: string;
      onSuccess?: () => void;
      onClose?: () => void;
    }): Promise<boolean> => {
      const ready = await waitForPaddle();
      if (!ready || !window.Paddle) {
        console.error('[Paddle] Not available for overlay');
        return false;
      }

      try {
        const localeMap: Record<string, string> = {
          'pt-BR': 'pt',
          en: 'en',
          es: 'es',
          fr: 'fr',
          de: 'de',
        };

        window.Paddle.Checkout.open({
          transactionId: options.transactionId,
          settings: {
            displayMode: 'overlay',
            theme: 'light',
            locale: localeMap[options.locale || 'pt-BR'] || 'pt',
            frameTarget: 'self',
            frameInitialHeight: 450,
            frameStyle: 'width: 100%; background-color: transparent; border: none;',
          },
        });

        // Listen for completion event
        if (options.onSuccess || options.onClose) {
          const handler = (event: any) => {
            if (event.name === 'checkout.completed' && options.onSuccess) {
              options.onSuccess();
              window.removeEventListener('message', handler);
            } else if (event.name === 'checkout.closed' && options.onClose) {
              options.onClose();
              window.removeEventListener('message', handler);
            }
          };
          // Use Paddle's own eventCallback set during Setup instead
        }

        return true;
      } catch (err) {
        console.error('[Paddle] openCheckoutOverlay error:', err);
        return false;
      }
    },
    []
  );

  return { openCheckoutOverlay };
}
