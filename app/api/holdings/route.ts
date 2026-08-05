import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  readHoldingOverrides,
  removeHoldingOverride,
  updateHoldingQuantity,
} from "../../../data/holding-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const overrides =
      await readHoldingOverrides();

    return NextResponse.json({
      success: true,
      overrides,
    });
  } catch (error) {
    console.error(
      "Holding-overrides ophalen mislukt:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het ophalen van holdings.",
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

    const override =
      await updateHoldingQuantity({
        holdingId,
        quantity,
      });

    return NextResponse.json({
      success: true,
      holdingId,
      override,
    });
  } catch (error) {
    console.error(
      "Holding aanpassen mislukt:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het aanpassen van de holding.",
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
    const holdingId =
      request.nextUrl.searchParams.get(
        "holdingId",
      );

    if (!holdingId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een holdingId is verplicht.",
        },
        {
          status: 400,
        },
      );
    }

    await removeHoldingOverride(
      holdingId,
    );

    return NextResponse.json({
      success: true,
      holdingId,
    });
  } catch (error) {
    console.error(
      "Holding-herstel mislukt:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het herstellen van de holding.",
      },
      {
        status: 500,
      },
    );
  }
}