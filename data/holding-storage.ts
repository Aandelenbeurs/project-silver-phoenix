import "server-only";

import {
  readFile,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import {
  holdings,
  type Holding,
} from "./holdings";

export type HoldingOverride = {
  quantity: number;
  updatedAt: string;
};

export type HoldingOverrides = Record<
  string,
  HoldingOverride
>;

const overridesFilePath = path.join(
  process.cwd(),
  "data",
  "holding-overrides.json",
);

function isValidQuantity(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

/**
 * Leest alle lokaal opgeslagen aanpassingen.
 */
export async function readHoldingOverrides(): Promise<HoldingOverrides> {
  try {
    const file = await readFile(
      overridesFilePath,
      "utf-8",
    );

    const parsed: unknown = JSON.parse(file);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    const validOverrides: HoldingOverrides = {};

    for (const [holdingId, value] of Object.entries(parsed)) {
      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
      ) {
        continue;
      }

      const quantity = Reflect.get(
        value,
        "quantity",
      );

      const updatedAt = Reflect.get(
        value,
        "updatedAt",
      );

      if (!isValidQuantity(quantity)) {
        continue;
      }

      validOverrides[holdingId] = {
        quantity,
        updatedAt:
          typeof updatedAt === "string"
            ? updatedAt
            : new Date(0).toISOString(),
      };
    }

    return validOverrides;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return {};
    }

    console.error(
      "Holding-overrides lezen mislukt:",
      error,
    );

    return {};
  }
}

/**
 * Schrijft alle aanpassingen naar het JSON-bestand.
 */
export async function writeHoldingOverrides(
  overrides: HoldingOverrides,
): Promise<void> {
  await writeFile(
    overridesFilePath,
    `${JSON.stringify(overrides, null, 2)}\n`,
    "utf-8",
  );
}

/**
 * Slaat één aangepast aantal op.
 *
 * quantity = 0 betekent dat de positie volledig
 * is verkocht, maar nog wel in de historie blijft staan.
 */
export async function updateHoldingQuantity({
  holdingId,
  quantity,
}: {
  holdingId: string;
  quantity: number;
}): Promise<HoldingOverride> {
  if (!isValidQuantity(quantity)) {
    throw new Error(
      "Het aantal moet een geldig getal van 0 of hoger zijn.",
    );
  }

  const holdingExists = holdings.some(
    (holding) => holding.id === holdingId,
  );

  if (!holdingExists) {
    throw new Error(
      `Onbekende holding: ${holdingId}`,
    );
  }

  const overrides =
    await readHoldingOverrides();

  const override: HoldingOverride = {
    quantity,
    updatedAt: new Date().toISOString(),
  };

  overrides[holdingId] = override;

  await writeHoldingOverrides(overrides);

  return override;
}

/**
 * Verwijdert één aanpassing en herstelt daarmee
 * het oorspronkelijke aantal uit holdings.ts.
 */
export async function removeHoldingOverride(
  holdingId: string,
): Promise<void> {
  const overrides =
    await readHoldingOverrides();

  if (!(holdingId in overrides)) {
    return;
  }

  delete overrides[holdingId];

  await writeHoldingOverrides(overrides);
}

/**
 * Combineert holdings.ts met de lokaal opgeslagen
 * hoeveelheden uit holding-overrides.json.
 */
export async function getEffectiveHoldings(): Promise<Holding[]> {
  const overrides =
    await readHoldingOverrides();

  return holdings.map((holding) => {
    const override =
      overrides[holding.id];

    if (!override) {
      return holding;
    }

    return {
      ...holding,
      quantity: override.quantity,
    };
  });
}

/**
 * Geeft terug of een holding handmatig is aangepast.
 */
export async function hasHoldingOverride(
  holdingId: string,
): Promise<boolean> {
  const overrides =
    await readHoldingOverrides();

  return holdingId in overrides;
}