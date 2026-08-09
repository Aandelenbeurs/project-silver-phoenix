import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCurrentWorkspace,
} from "../../../../data/workspace";

import {
  readWorkspaceSettings,
  writeWorkspaceSettings,
} from "../../../../data/workspace-data-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workspace =
      await getCurrentWorkspace();

    const settings =
      await readWorkspaceSettings(
        workspace.id,
      );

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      settings,
    });
  } catch (error) {
    console.error(
      "Workspace-settings ophalen mislukt:",
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

    const silverPriceUsd =
      Reflect.get(
        body,
        "silverPriceUsd",
      );

    if (
        silverPriceUsd !== undefined &&
        silverPriceUsd !== null &&
      (
        typeof silverPriceUsd !== "number" ||
        !Number.isFinite(silverPriceUsd) ||
        silverPriceUsd <= 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "silverPriceUsd moet null of een positief getal zijn.",
        },
        {
          status: 400,
        },
      );
    }

    const goldPriceUsd =
  Reflect.get(
    body,
    "goldPriceUsd",
  );

if (
  goldPriceUsd !== undefined &&
  goldPriceUsd !== null &&
  (
    typeof goldPriceUsd !== "number" ||
    !Number.isFinite(goldPriceUsd) ||
    goldPriceUsd <= 0
  )
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "goldPriceUsd moet null of een positief getal zijn.",
    },
    {
      status: 400,
    },
  );
}

    const workspace =
      await getCurrentWorkspace();

    const currentSettings =
      await readWorkspaceSettings(
        workspace.id,
      );

    const updatedSettings = {
  ...currentSettings,

  silverPriceUsd:
    silverPriceUsd !== undefined
      ? silverPriceUsd
      : currentSettings.silverPriceUsd,

  goldPriceUsd:
    goldPriceUsd !== undefined
      ? goldPriceUsd
      : currentSettings.goldPriceUsd,
};

    await writeWorkspaceSettings(
      workspace.id,
      updatedSettings,
    );

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error(
      "Workspace-settings aanpassen mislukt:",
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