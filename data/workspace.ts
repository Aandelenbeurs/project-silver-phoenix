import {
  readWorkspaceFile,
  writeWorkspaceFile,
} from "./workspace-storage";

import {
  deleteWorkspaceData,
  duplicateWorkspaceData,
} from "./workspace-data-storage";

export type WorkspaceType =
  | "live"
  | "simulation"
  | "scenario";

export type Workspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  isReadOnly: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function getWorkspaces(): Promise<
  Workspace[]
> {
  const data =
    await readWorkspaceFile();

  return data.workspaces;
}

export async function getCurrentWorkspace(): Promise<
  Workspace
> {
  const data =
    await readWorkspaceFile();

  const currentWorkspace =
    data.workspaces.find(
      (workspace) =>
        workspace.id ===
        data.activeWorkspaceId,
    );

  if (currentWorkspace) {
    return currentWorkspace;
  }

  const fallbackWorkspace =
    data.workspaces[0];

  if (!fallbackWorkspace) {
    throw new Error(
      "Er is geen geldige workspace beschikbaar.",
    );
  }

  return fallbackWorkspace;
}

export async function setCurrentWorkspace(
  workspaceId: string,
): Promise<void> {
  const data =
    await readWorkspaceFile();

  const exists =
    data.workspaces.some(
      (workspace) =>
        workspace.id === workspaceId,
    );

  if (!exists) {
    throw new Error(
      `Workspace '${workspaceId}' bestaat niet.`,
    );
  }

  await writeWorkspaceFile({
    ...data,
    activeWorkspaceId:
      workspaceId,
  });
}
function createWorkspaceId(name: string): string {
  const baseId = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return baseId || `workspace-${Date.now()}`;
}

export async function createWorkspace({
  name,
  type,
}: {
  name: string;
  type: Exclude<WorkspaceType, "live">;
}): Promise<Workspace> {
  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    throw new Error(
      "De naam van de workspace moet minimaal 2 tekens bevatten.",
    );
  }

  const data = await readWorkspaceFile();

  const baseId = createWorkspaceId(trimmedName);

  let workspaceId = baseId;
  let suffix = 2;

  while (
    data.workspaces.some(
      (workspace) => workspace.id === workspaceId,
    )
  ) {
    workspaceId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const now = new Date().toISOString();

  const workspace: Workspace = {
    id: workspaceId,
    name: trimmedName,
    type,
    isReadOnly: false,
    createdAt: now,
    updatedAt: now,
  };

  await writeWorkspaceFile({
    activeWorkspaceId: workspace.id,
    workspaces: [
      ...data.workspaces,
      workspace,
    ],
  });

  return workspace;
}

export async function duplicateWorkspace({
  sourceWorkspaceId,
  name,
}: {
  sourceWorkspaceId: string;
  name: string;
}): Promise<Workspace> {
  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    throw new Error(
      "De naam van de workspace moet minimaal 2 tekens bevatten.",
    );
  }

  const data =
    await readWorkspaceFile();

  const sourceWorkspace =
    data.workspaces.find(
      (workspace) =>
        workspace.id ===
        sourceWorkspaceId,
    );

  if (!sourceWorkspace) {
    throw new Error(
      `Bron-workspace '${sourceWorkspaceId}' bestaat niet.`,
    );
  }

  const baseId =
    createWorkspaceId(trimmedName);

  let workspaceId = baseId;
  let suffix = 2;

  while (
    data.workspaces.some(
      (workspace) =>
        workspace.id ===
        workspaceId,
    )
  ) {
    workspaceId =
      `${baseId}-${suffix}`;

    suffix += 1;
  }

  const now =
    new Date().toISOString();

  const workspace: Workspace = {
    id: workspaceId,
    name: trimmedName,

    type:
      sourceWorkspace.type === "live"
        ? "simulation"
        : sourceWorkspace.type,

    isReadOnly: false,

    createdAt: now,
    updatedAt: now,
  };

  await duplicateWorkspaceData({
    sourceWorkspaceId,
    targetWorkspace: workspace,
  });

  await writeWorkspaceFile({
    activeWorkspaceId:
      workspace.id,

    workspaces: [
      ...data.workspaces,
      workspace,
    ],
  });

  return workspace;
}
export async function deleteWorkspace(
  workspaceId: string,
): Promise<void> {
  if (workspaceId === "live") {
    throw new Error(
      "De Live Portfolio workspace kan niet worden verwijderd.",
    );
  }

  const data =
    await readWorkspaceFile();

  const workspace =
    data.workspaces.find(
      (item) =>
        item.id === workspaceId,
    );

  if (!workspace) {
    throw new Error(
      `Workspace '${workspaceId}' bestaat niet.`,
    );
  }

  if (workspace.type === "live") {
    throw new Error(
      "Een Live Portfolio workspace kan niet worden verwijderd.",
    );
  }

  const remainingWorkspaces =
    data.workspaces.filter(
      (item) =>
        item.id !== workspaceId,
    );

  const liveWorkspace =
    remainingWorkspaces.find(
      (item) =>
        item.id === "live",
    );

  if (!liveWorkspace) {
    throw new Error(
      "Live Portfolio ontbreekt. Verwijderen is gestopt om gegevensverlies te voorkomen.",
    );
  }

  await deleteWorkspaceData(
    workspaceId,
  );

  await writeWorkspaceFile({
    activeWorkspaceId:
      data.activeWorkspaceId === workspaceId
        ? "live"
        : data.activeWorkspaceId,

    workspaces:
      remainingWorkspaces,
  });
}