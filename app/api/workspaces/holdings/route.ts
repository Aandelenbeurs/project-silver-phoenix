import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentWorkspace,
} from "../../../../data/workspace";

import {
  readWorkspaceHoldings,
  writeWorkspaceHoldings,
} from "../../../../data/workspace-data-storage";

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

    const workspace =
      await getCurrentWorkspace();

    const holdings =
      await readWorkspaceHoldings(
        workspace.id,
      );

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