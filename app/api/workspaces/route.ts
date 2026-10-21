import { readJsonObject, ApiInputError } from "../../../lib/api-input";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createWorkspace,
   deleteWorkspace,
    getCurrentWorkspace,
  getWorkspaces,
    renameWorkspace,
  setCurrentWorkspace,
} from "../../../data/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      currentWorkspace,
      workspaces,
    ] = await Promise.all([
      getCurrentWorkspace(),
      getWorkspaces(),
    ]);

    return NextResponse.json({
      success: true,
      activeWorkspaceId:
        currentWorkspace.id,
      workspaces,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      {
        status: error instanceof ApiInputError ? error.status : 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const body = (await readJsonObject(request)) as {
      workspaceId?: string;
      name?: string;
    };

    if (typeof body.workspaceId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(body.workspaceId) || (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim() || body.name.length > 80))) {
      return NextResponse.json(
        {
          success: false,
          error:
            "workspaceId ontbreekt.",
        },
        {
          status: 400,
        },
      );
    }

    if (body.name !== undefined) {
      if ((await getWorkspaces()).find(w=>w.id===body.workspaceId)?.isReadOnly) return NextResponse.json({success:false,error:"Workspace is alleen-lezen."},{status:403});
      const workspace =
        await renameWorkspace({
          workspaceId:
            body.workspaceId,
          name:
            body.name,
        });

      return NextResponse.json({
        success: true,
        workspace,
      });
    }

    await setCurrentWorkspace(
      body.workspaceId,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      {
        status: error instanceof ApiInputError ? error.status : 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body = (await readJsonObject(request)) as {
      name?: string;
     type?:
  | "portfolio"
  | "simulation"
  | "scenario";
    };

    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 80 || !["portfolio", "simulation", "scenario"].includes(body.type ?? "")) {
      return NextResponse.json(
        {
          success: false,
          error: "Naam en type zijn verplicht.",
        },
        {
          status: 400,
        },
      );
    }

    const workspace =
      await createWorkspace({
        name: body.name,
        type: body.type as "portfolio" | "simulation" | "scenario",
      });

    return NextResponse.json({
      success: true,
      workspace,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      {
        status: error instanceof ApiInputError ? error.status : 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
) {
  try {
    const body: unknown =
      await readJsonObject(request);

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

    const workspaceId =
      Reflect.get(body, "workspaceId");

    if (
      typeof workspaceId !== "string" ||
      workspaceId.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Een geldig workspaceId is verplicht.",
        },
        {
          status: 400,
        },
      );
    }

    if ((await getWorkspaces()).find(w=>w.id===workspaceId)?.isReadOnly) return NextResponse.json({success:false,error:"Workspace is alleen-lezen."},{status:403});
    await deleteWorkspace(
      workspaceId,
    );

    return NextResponse.json({
      success: true,
      deletedWorkspaceId:
        workspaceId,
      activeWorkspaceId:
        workspaceId === "live"
          ? "live"
          : (
              await getCurrentWorkspace()
            ).id,
    });
  } catch (error) {
    console.error(
      "Workspace verwijderen mislukt:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Onbekende fout bij het verwijderen van de workspace.";

    const isProtectedWorkspace =
      message.includes("Live Portfolio");

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: error instanceof ApiInputError ? error.status : isProtectedWorkspace ? 403 : 500,
      },
    );
  }
}
