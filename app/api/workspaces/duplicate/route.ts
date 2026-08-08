import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  duplicateWorkspace,
  getCurrentWorkspace,
} from "../../../../data/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const name =
      Reflect.get(body, "name");

    if (
      typeof name !== "string" ||
      name.trim().length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "De naam moet minimaal 2 tekens bevatten.",
        },
        {
          status: 400,
        },
      );
    }

    const currentWorkspace =
      await getCurrentWorkspace();

    const workspace =
      await duplicateWorkspace({
        sourceWorkspaceId:
          currentWorkspace.id,
        name,
      });

    return NextResponse.json({
      success: true,
      sourceWorkspaceId:
        currentWorkspace.id,
      workspace,
    });
  } catch (error) {
    console.error(
      "Workspace dupliceren mislukt:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het dupliceren.",
      },
      {
        status: 500,
      },
    );
  }
}