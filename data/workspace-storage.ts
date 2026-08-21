import "server-only";

import {
  readFile,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import {
  type Workspace,
  type WorkspaceType,
} from "./workspace";

export type WorkspaceFile = {
  activeWorkspaceId: string;
  workspaces: Workspace[];
};

const workspaceFilePath = path.join(
  process.cwd(),
  "data",
  "workspaces.json",
);

function isWorkspaceType(
  value: unknown,
): value is WorkspaceType {
  return (
    value === "live" ||
    value === "portfolio" ||
    value === "simulation" ||
    value === "scenario"
  );
}

function isValidWorkspace(
  value: unknown,
): value is Workspace {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const id = Reflect.get(value, "id");
  const name = Reflect.get(value, "name");
  const type = Reflect.get(value, "type");
  const isReadOnly = Reflect.get(
    value,
    "isReadOnly",
  );

  return (
    typeof id === "string" &&
    id.trim().length > 0 &&
    typeof name === "string" &&
    name.trim().length > 0 &&
    isWorkspaceType(type) &&
    typeof isReadOnly === "boolean"
  );
}

export async function readWorkspaceFile(): Promise<WorkspaceFile> {
  try {
    const file = await readFile(
      workspaceFilePath,
      "utf-8",
    );

    const parsed: unknown =
      JSON.parse(file);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "workspaces.json bevat geen geldig object.",
      );
    }

    const activeWorkspaceId =
      Reflect.get(
        parsed,
        "activeWorkspaceId",
      );

    const rawWorkspaces =
      Reflect.get(
        parsed,
        "workspaces",
      );

    if (
      typeof activeWorkspaceId !==
        "string" ||
      !Array.isArray(rawWorkspaces)
    ) {
      throw new Error(
        "workspaces.json heeft een ongeldige structuur.",
      );
    }

    const workspaces =
      rawWorkspaces.filter(
        isValidWorkspace,
      );

    if (workspaces.length === 0) {
      throw new Error(
        "Er zijn geen geldige workspaces gevonden.",
      );
    }

    const activeWorkspaceExists =
      workspaces.some(
        (workspace) =>
          workspace.id ===
          activeWorkspaceId,
      );

    return {
      activeWorkspaceId:
        activeWorkspaceExists
          ? activeWorkspaceId
          : workspaces[0].id,

      workspaces,
    };
  } catch (error) {
    console.error(
      "Workspaces lezen mislukt:",
      error,
    );

    return {
      activeWorkspaceId: "live",
      workspaces: [
        {
          id: "live",
          name: "Live Portfolio",
          type: "live",
          isReadOnly: false,
        },
      ],
    };
  }
}

export async function writeWorkspaceFile(
  data: WorkspaceFile,
): Promise<void> {
  await writeFile(
    workspaceFilePath,
    `${JSON.stringify(
      data,
      null,
      2,
    )}\n`,
    "utf-8",
  );
}