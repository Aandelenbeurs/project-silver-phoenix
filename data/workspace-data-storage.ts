import "server-only";

import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import type {
  Workspace,
  WorkspaceType,
} from "./workspace";

import type {
  Holding,
} from "./holdings";

export type WorkspaceSettings = {
  silverPriceUsd: number | null;
  goldPriceUsd: number | null;
  exchangeRateOverrides: Record<
    string,
    number
  >;
};

export type WorkspaceTransaction = {
  id: string;
  holdingId: string;
  type: "buy" | "sell";
  quantity: number;
  price: number | null;
  currency: string | null;
  date: string;
  costs: number | null;
  note?: string;
};

export type WorkspaceData = {
  workspace: Workspace;
  holdings: Holding[];
  settings: WorkspaceSettings;
  transactions: WorkspaceTransaction[];
};

const workspacesDirectory = path.join(
  process.cwd(),
  "data",
  "workspaces",
);

function getWorkspaceDirectory(
  workspaceId: string,
): string {
  return path.join(
    workspacesDirectory,
    workspaceId,
  );
}

function getWorkspaceFilePath(
  workspaceId: string,
  fileName: string,
): string {
  return path.join(
    getWorkspaceDirectory(workspaceId),
    fileName,
  );
}

async function readJsonFile<T>({
  workspaceId,
  fileName,
  fallback,
}: {
  workspaceId: string;
  fileName: string;
  fallback: T;
}): Promise<T> {
  try {
    const file = await readFile(
      getWorkspaceFilePath(
        workspaceId,
        fileName,
      ),
      "utf-8",
    );

    return JSON.parse(file) as T;
  } catch (error) {
    const nodeError =
      error as NodeJS.ErrnoException;

    if (nodeError.code !== "ENOENT") {
      console.error(
        `Lezen van ${fileName} voor workspace '${workspaceId}' mislukt:`,
        error,
      );
    }

    return fallback;
  }
}

async function writeJsonFile<T>({
  workspaceId,
  fileName,
  data,
}: {
  workspaceId: string;
  fileName: string;
  data: T;
}): Promise<void> {
  await mkdir(
    getWorkspaceDirectory(workspaceId),
    {
      recursive: true,
    },
  );

  await writeFile(
    getWorkspaceFilePath(
      workspaceId,
      fileName,
    ),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf-8",
  );
}

export async function readWorkspaceMetadata(
  workspaceId: string,
): Promise<Workspace | null> {
  return readJsonFile<Workspace | null>({
    workspaceId,
    fileName: "workspace.json",
    fallback: null,
  });
}

export async function writeWorkspaceMetadata(
  workspace: Workspace,
): Promise<void> {
  await writeJsonFile({
    workspaceId: workspace.id,
    fileName: "workspace.json",
    data: workspace,
  });
}

export async function readWorkspaceHoldings(
  workspaceId: string,
): Promise<Holding[]> {
  const rawHoldings =
    await readJsonFile<unknown>({
      workspaceId,
      fileName: "holdings.json",
      fallback: [],
    });

  if (Array.isArray(rawHoldings)) {
    return rawHoldings as Holding[];
  }

  return [];
}

export async function writeWorkspaceHoldings(
  workspaceId: string,
  workspaceHoldings: Holding[],
): Promise<void> {
  await writeJsonFile({
    workspaceId,
    fileName: "holdings.json",
    data: workspaceHoldings,
  });
}

export async function readWorkspaceSettings(
  workspaceId: string,
): Promise<WorkspaceSettings> {
  return readJsonFile<WorkspaceSettings>({
    workspaceId,
    fileName: "settings.json",
    fallback: {
      silverPriceUsd: null,
      goldPriceUsd: null,
      exchangeRateOverrides: {},
    },
  });
}

export async function writeWorkspaceSettings(
  workspaceId: string,
  settings: WorkspaceSettings,
): Promise<void> {
  await writeJsonFile({
    workspaceId,
    fileName: "settings.json",
    data: settings,
  });
}

export async function readWorkspaceTransactions(
  workspaceId: string,
): Promise<WorkspaceTransaction[]> {
  const transactions =
    await readJsonFile<unknown>({
      workspaceId,
      fileName: "transactions.json",
      fallback: [],
    });

  return Array.isArray(transactions)
    ? (transactions as WorkspaceTransaction[])
    : [];
}

export async function writeWorkspaceTransactions(
  workspaceId: string,
  transactions: WorkspaceTransaction[],
): Promise<void> {
  await writeJsonFile({
    workspaceId,
    fileName: "transactions.json",
    data: transactions,
  });
}

export async function readWorkspaceData(
  workspaceId: string,
): Promise<WorkspaceData | null> {
  const workspace =
    await readWorkspaceMetadata(
      workspaceId,
    );

  if (!workspace) {
    return null;
  }

  const [
    workspaceHoldings,
    settings,
    transactions,
  ] = await Promise.all([
    readWorkspaceHoldings(
      workspaceId,
    ),
    readWorkspaceSettings(
      workspaceId,
    ),
    readWorkspaceTransactions(
      workspaceId,
    ),
  ]);

  return {
    workspace,
    holdings: workspaceHoldings,
    settings,
    transactions,
  };
}

export async function initializeWorkspaceData({
  workspace,
  holdings,
}: {
  workspace: Workspace;
  holdings: Holding[];
}): Promise<void> {
  await mkdir(
    getWorkspaceDirectory(
      workspace.id,
    ),
    {
      recursive: true,
    },
  );

  await Promise.all([
    writeWorkspaceMetadata(
      workspace,
    ),

    writeWorkspaceHoldings(
      workspace.id,
      holdings,
    ),

    writeWorkspaceSettings(
      workspace.id,
      {
        silverPriceUsd: null,
        goldPriceUsd: null,
        exchangeRateOverrides: {},
      },
    ),

    writeWorkspaceTransactions(
      workspace.id,
      [],
    ),
  ]);
}

export async function duplicateWorkspaceData({
  sourceWorkspaceId,
  targetWorkspace,
}: {
  sourceWorkspaceId: string;
  targetWorkspace: Workspace;
}): Promise<void> {
  const sourceData =
    await readWorkspaceData(
      sourceWorkspaceId,
    );

  if (!sourceData) {
    throw new Error(
      `Bron-workspace '${sourceWorkspaceId}' bestaat niet.`,
    );
  }

  await mkdir(
    getWorkspaceDirectory(
      targetWorkspace.id,
    ),
    {
      recursive: true,
    },
  );

  await Promise.all([
    writeWorkspaceMetadata(
      targetWorkspace,
    ),

    writeWorkspaceHoldings(
      targetWorkspace.id,
      sourceData.holdings.map(
        (holding) => ({
          ...holding,
        }),
      ),
    ),

    writeWorkspaceSettings(
      targetWorkspace.id,
      {
        ...sourceData.settings,
        exchangeRateOverrides: {
          ...sourceData.settings
            .exchangeRateOverrides,
        },
      },
    ),

    writeWorkspaceTransactions(
      targetWorkspace.id,
      sourceData.transactions.map(
        (transaction) => ({
          ...transaction,
        }),
      ),
    ),
  ]);
}

export async function deleteWorkspaceData(
  workspaceId: string,
): Promise<void> {
  if (workspaceId === "live") {
    throw new Error(
      "De Live Portfolio workspace kan niet worden verwijderd.",
    );
  }

  await rm(
    getWorkspaceDirectory(workspaceId),
    {
      recursive: true,
      force: true,
    },
  );
}

export function isWorkspaceType(
  value: unknown,
): value is WorkspaceType {
  return (
    value === "live" ||
    value === "portfolio" ||
    value === "simulation" ||
    value === "scenario"
  );
}