import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createWorkspace,
    getCurrentWorkspace,
  getWorkspaces,
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
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const body = (await request.json()) as {
      workspaceId?: string;
    };

    if (!body.workspaceId) {
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
        status: 500,
      },
    );
  }
}
export async function POST(
  request: NextRequest,
) {
  try {
    const body = (await request.json()) as {
      name?: string;
      type?: "simulation" | "scenario";
    };

    if (!body.name || !body.type) {
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
        type: body.type,
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
        status: 500,
      },
    );
  }
}