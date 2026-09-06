import { NextRequest, NextResponse } from 'next/server';
import { getPaddleClient, getPaddleEnvironment, isValidPaddleApiKey } from '@/lib/billing/paddle-client';
import { PADDLE_TIERS, MAX_STANDARD_SEATS } from '@/lib/billing/paddle-catalog';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const countryCode = (searchParams.get('countryCode') || 'BR').toUpperCase();
    const currency = searchParams.get('currency') || (countryCode === 'BR' ? 'BRL' : 'USD');
    const env = getPaddleEnvironment();

    const tiers = Object.values(PADDLE_TIERS).map((tier) => {
      const priceId = env === 'production' ? tier.livePriceId : tier.sandboxPriceId;
      return {
        seats: tier.seats,
        priceId,
        unitPriceBrl: tier.unitPriceBrl,
        totalMonthlyBrl: tier.totalMonthlyBrl,
        savingsPercentage: tier.savingsPercentage,
        caredPeopleLimit: tier.caredPeopleLimit,
        formattedUnitPrice: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tier.unitPriceBrl),
        formattedTotal: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tier.totalMonthlyBrl),
      };
    });

    // If a valid Paddle API key is configured, optionally query Paddle preview
    const apiKey = process.env.PADDLE_API_KEY;
    let livePreviewItems: any[] = [];

    if (isValidPaddleApiKey(apiKey)) {
      try {
        const paddle = getPaddleClient();
        const items = tiers.map((t) => ({ priceId: t.priceId, quantity: 1 }));
        const preview = await paddle.pricingPreview.preview({
          items,
          address: { countryCode: countryCode as 'BR' | 'US' | 'GB' | 'DE' | 'FR' | 'ES' },
        });

        if (preview?.details?.lineItems) {
          livePreviewItems = preview.details.lineItems as unknown[];
        }
      } catch (paddleErr: unknown) {
        const errMsg = paddleErr instanceof Error ? paddleErr.message : String(paddleErr);
        console.warn('[Paddle Price Preview] Live preview notice:', errMsg);
      }
    }

    return NextResponse.json({
      success: true,
      countryCode,
      currency,
      maxSeats: MAX_STANDARD_SEATS,
      tiers,
      livePreviewItems,
    });
  } catch (error: any) {
    console.error('[Paddle Price Preview Error]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch price preview' }, { status: 500 });
  }
}
