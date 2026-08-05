import "server-only";

import {
  getCurrentWorkspace,
} from "./workspace";

import {
  getEffectiveHoldings,
} from "./holding-storage";

import {
  readWorkspaceHoldings,
  writeWorkspaceHoldings,
} from "./workspace-data-storage";

import type {
  Holding,
} from "./holdings";

/**
 * Levert de holdings van de momenteel actieve workspace.
 *
 * Bestaande workspaces zonder eigen holdingsbestand worden
 * automatisch geïnitialiseerd met een kopie van Live.
 */
export async function getWorkspaceHoldings(): Promise<
  Holding[]
> {
  const currentWorkspace =
    await getCurrentWorkspace();

  const currentHoldings =
    await readWorkspaceHoldings(
      currentWorkspace.id,
    );

  if (currentHoldings.length > 0) {
    return currentHoldings;
  }

  /**
   * Wanneer Live nog geen opgeslagen holdings heeft,
   * migreren we automatisch de oorspronkelijke portefeuille.
   */
  if (currentWorkspace.id === "live") {
    const effectiveHoldings =
      await getEffectiveHoldings();

    await writeWorkspaceHoldings(
      "live",
      effectiveHoldings,
    );

    return effectiveHoldings;
  }

  /**
   * Een nieuwe simulatie of nieuw scenario begint als
   * volledige kopie van de Live-portefeuille.
   */
  let liveHoldings =
    await readWorkspaceHoldings("live");

  if (liveHoldings.length === 0) {
    liveHoldings =
      await getEffectiveHoldings();

    await writeWorkspaceHoldings(
      "live",
      liveHoldings,
    );
  }

  const workspaceHoldings =
    liveHoldings.map((holding) => ({
      ...holding,
    }));

  await writeWorkspaceHoldings(
    currentWorkspace.id,
    workspaceHoldings,
  );

  return workspaceHoldings;
}