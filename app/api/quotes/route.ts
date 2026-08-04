import {
  getYahooMarketSnapshot,
} from "../../../services/yahoo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot =
      await getYahooMarketSnapshot();

    return Response.json({
      success: true,

      requestedSymbols:
        snapshot.requestedSymbols,

      successfulSymbols:
        snapshot.successfulSymbols,

      failedSymbols:
        snapshot.failedSymbols,

      exchangeRates:
        snapshot.exchangeRates,

      fetchedAt:
        snapshot.fetchedAt,

      expiresAt:
        snapshot.expiresAt,

      errors:
        snapshot.errors,

      instruments:
        snapshot.instruments,
    });
  } catch (error) {
    console.error(
      "Yahoo Finance ophalen mislukt:",
      error,
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het ophalen van marktdata.",
      },
      {
        status: 500,
      },
    );
  }
}