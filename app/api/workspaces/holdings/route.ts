import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentWorkspace,
} from "../../../../data/workspace";

import {
  readWorkspaceHoldings,
  readWorkspaceTransactions,
  writeWorkspaceHoldings,
  writeWorkspaceTransactions,
} from "../../../../data/workspace-data-storage";

import {
  companies,
} from "../../../../data/companies";

import {
  getYahooMarketSnapshot,
} from "../../../../services/yahoo";

import {
  convertPriceToEur,
} from "../../../../data/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workspace =
      await getCurrentWorkspace();

    const holdings =
      await readWorkspaceHoldings(
        workspace.id,
      );

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      holdings,
    });
  } catch (error) {
    console.error(
      "Workspace-holdings ophalen mislukt:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body: unknown =
      await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige aanvraag.",
        },
        {
          status: 400,
        },
      );
    }

    const companyId =
      Reflect.get(body, "companyId");

    const quantity =
      Reflect.get(body, "quantity");

    if (
      typeof companyId !== "string" ||
      companyId.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een geldig companyId is verplicht.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      typeof quantity !== "number" ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Het aantal moet groter zijn dan 0.",
        },
        {
          status: 400,
        },
      );
    }

    const companyData =
  companies.find(
    (item) =>
      item.id === companyId,
  );

if (!companyData) {
  return NextResponse.json(
    {
      success: false,
      error:
        `Geen bedrijfsgegevens gevonden voor '${companyId}'.`,
    },
    {
      status: 404,
    },
  );
}

    const workspace =
      await getCurrentWorkspace();

    const holdings =
      await readWorkspaceHoldings(
        workspace.id,
      );

    const existingHolding =
      holdings.find(
        (holding) =>
          holding.companyId ===
          companyId,
      );

    if (existingHolding) {
      return NextResponse.json(
        {
          success: false,
          error:
            `${companyId} staat al in deze portfolio.`,
        },
        {
          status: 409,
        },
      );
    }

    const holding = {
      id:
        `holding-${companyId}`,

      companyId,

       name:
    companyData.name,

  ticker:
    companyData.ticker,

      quantity,

      type:
        "equity" as const,

      unit:
        "shares" as const,
    };

    await writeWorkspaceHoldings(
      workspace.id,
      [
        ...holdings,
        holding,
      ],
    );

    return NextResponse.json({
      success: true,
      workspaceId:
        workspace.id,
      holding,
    });
  } catch (error) {
    console.error(
      "Workspace-holding toevoegen mislukt:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const body: unknown =
      await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige aanvraag.",
        },
        {
          status: 400,
        },
      );
    }

    const holdingId =
      Reflect.get(body, "holdingId");

    const quantity =
      Reflect.get(body, "quantity");

      const purchasePriceRaw =
  Reflect.get(body, "purchasePrice");
  const purchaseCurrency =
  Reflect.get(
    body,
    "purchaseCurrency",
  );

const purchasePrice =
  purchasePriceRaw === null ||
  purchasePriceRaw === undefined ||
  purchasePriceRaw === ""
    ? null
    : Number(
        String(purchasePriceRaw)
          .trim()
          .replace(",", "."),
      );

    if (
      typeof holdingId !== "string" ||
      holdingId.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een geldig holdingId is verplicht.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      typeof quantity !== "number" ||
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Het aantal moet een geldig getal van 0 of hoger zijn.",
        },
        {
          status: 400,
        },
      );
    }

if (
  purchasePrice !== null &&
  (
    !Number.isFinite(purchasePrice) ||
    purchasePrice <= 0
  )
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "De aankoopprijs moet een geldig getal groter dan 0 zijn.",
    },
    {
      status: 400,
    },
  );
}

if (
  purchaseCurrency !== null &&
  purchaseCurrency !== undefined &&
  ![
    "EUR",
    "CAD",
    "USD",
    "AUD",
    "GBP",
    "HKD",
  ].includes(
    String(purchaseCurrency),
  )
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Ongeldige valuta voor de aankoopprijs.",
    },
    {
      status: 400,
    },
  );
}

    const workspace =
      await getCurrentWorkspace();

   const [
  holdings,
  transactions,
  marketSnapshot,
] = await Promise.all([
  readWorkspaceHoldings(
    workspace.id,
  ),

  readWorkspaceTransactions(
    workspace.id,
  ),

  getYahooMarketSnapshot(),
]);

    const index =
      holdings.findIndex(
        (holding) =>
          holding.id === holdingId,
      );

    if (index === -1) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Holding '${holdingId}' bestaat niet in workspace '${workspace.id}'.`,
        },
        {
          status: 404,
        },
      );
    }

    const existingHolding =
  holdings[index];

const quantityDifference =
  quantity -
  existingHolding.quantity;

const isBuy =
  quantityDifference > 0;

const isSell =
  quantityDifference < 0;

if (
  (isBuy || isSell) &&
  purchasePrice === null
) {
  return NextResponse.json(
    {
      success: false,
      error:
        isBuy
          ? "Bij een aankoop is de aankoopprijs per aandeel verplicht."
          : "Bij een verkoop is de verkoopprijs per aandeel verplicht.",
    },
    {
      status: 400,
    },
  );
}

    const updatedHolding = {
      ...holdings[index],
      quantity,
    };

    const updatedHoldings =
      holdings.map(
        (holding, holdingIndex) =>
          holdingIndex === index
            ? updatedHolding
            : holding,
      );

    await writeWorkspaceHoldings(
      workspace.id,
      updatedHoldings,
    );

    if (isBuy || isSell) {
  const transaction = {
    id:
      `transaction-${Date.now()}`,

    holdingId,

    type:
      isBuy
        ? "buy" as const
        : "sell" as const,

    quantity:
      Math.abs(
        quantityDifference,
      ),

    price:
  purchasePrice,

currency:
  purchasePrice !== null
    ? String(
        purchaseCurrency ??
        "EUR",
      )
    : null,

transactionValueEur:
  purchasePrice !== null
    ? Math.abs(
        quantityDifference,
      ) *
      convertPriceToEur(
        purchasePrice,
        String(
          purchaseCurrency ??
          "EUR",
        ) as
          | "EUR"
          | "CAD"
          | "USD"
          | "AUD"
          | "GBP"
          | "HKD",
        marketSnapshot.exchangeRates,
      )
    : null,

    date:
      new Date().toISOString(),

    costs:
      null,
  };

  await writeWorkspaceTransactions(
    workspace.id,
    [
      ...transactions,
      transaction,
    ],
  );
}

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      holding: updatedHolding,
    });
  } catch (error) {
    console.error(
      "Workspace-holding aanpassen mislukt:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    const body: unknown =
      await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ongeldige aanvraag.",
        },
        {
          status: 400,
        },
      );
    }

    const holdingId =
      Reflect.get(body, "holdingId");

    if (
      typeof holdingId !== "string" ||
      holdingId.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een geldig holdingId is verplicht.",
        },
        {
          status: 400,
        },
      );
    }

    const workspace =
      await getCurrentWorkspace();

    const holdings =
      await readWorkspaceHoldings(
        workspace.id,
      );

    const existingHolding =
      holdings.find(
        (holding) =>
          holding.id === holdingId,
      );

    if (!existingHolding) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Holding '${holdingId}' bestaat niet in workspace '${workspace.id}'.`,
        },
        {
          status: 404,
        },
      );
    }

    const updatedHoldings =
      holdings.filter(
        (holding) =>
          holding.id !== holdingId,
      );

    await writeWorkspaceHoldings(
      workspace.id,
      updatedHoldings,
    );

    return NextResponse.json({
      success: true,
      workspaceId:
        workspace.id,
      deletedHoldingId:
        holdingId,
    });
  } catch (error) {
    console.error(
      "Workspace-holding verwijderen mislukt:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      {
        status: 500,
      },
    );
  }
}