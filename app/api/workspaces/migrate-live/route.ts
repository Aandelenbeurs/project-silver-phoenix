import { readJsonObject, ApiInputError } from "../../../../lib/api-input";
import type { NextRequest } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const body=await readJsonObject(request);
    if(body.confirm!=="MIGRATE_LIVE_HOLDINGS") return NextResponse.json({success:false,error:"Expliciete migratiebevestiging ontbreekt."},{status:400});
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
        status: error instanceof ApiInputError ? error.status : 500,
      },
    );
  }
}