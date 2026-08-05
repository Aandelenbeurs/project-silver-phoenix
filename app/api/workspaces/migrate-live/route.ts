import {
  NextResponse,
} from "next/server";

import {
  getEffectiveHoldings,
} from "../../../../data/holding-storage";

import {
  writeWorkspaceHoldings,
} from "../../../../data/workspace-data-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const liveHoldings =
      await getEffectiveHoldings();

    await writeWorkspaceHoldings(
      "live",
      liveHoldings,
    );

    return NextResponse.json({
      success: true,
      workspaceId: "live",
      migratedHoldings:
        liveHoldings.length,
    });
  } catch (error) {
    console.error(
      "Migratie van live holdings mislukt:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout tijdens de migratie.",
      },
      {
        status: 500,
      },
    );
  }
}