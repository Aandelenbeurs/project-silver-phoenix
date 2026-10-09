
import type { Evidence } from "./advantage-energy-valuation-input";

import {
  advantageSources,
  findAdvantageSource,
  type AdvantageSource,
} from "./advantage-energy-sources";

export interface EvidenceValidation {
  valid: boolean;
  errors: string[];
}

const isDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

export function validateAdvantageEvidence(
  evidence: Evidence<number> | undefined,
  options: {
    positive?: boolean;
    nonnegative?: boolean;
    actualOnly?: boolean;
    afterDate?: string;
    registry?: readonly AdvantageSource[];
  } = {}
): EvidenceValidation {
  const errors: string[] = [];

  if (!evidence) {
    return {
      valid: false,
      errors: ["Evidence is missing"],
    };
  }

  if (
    typeof evidence.value !== "number" ||
    !Number.isFinite(evidence.value)
  ) {
    errors.push("Value must be finite");
  }

  if (options.positive && evidence.value <= 0) {
    errors.push("Value must be positive");
  }

  if (options.nonnegative && evidence.value < 0) {
    errors.push("Value cannot be negative");
  }

  if (!isDate(evidence.asOf)) {
    errors.push("Invalid evidence date");
  }

  if (
    options.afterDate &&
    evidence.asOf < options.afterDate
  ) {
    errors.push("Evidence predates required period");
  }

  if (
    options.actualOnly &&
    evidence.kind !== "reported"
  ) {
    errors.push("Reported actual required");
  }

  const registry = options.registry ?? advantageSources;

  const source = findAdvantageSource(
    evidence.sourceId,
    registry
  );

  if (!source) {
    errors.push("Unknown source ID");
  } else {

    if (!isDate(source.publishedAt)) {
  errors.push("Invalid source publication date");
}

if (
  source.coversActualsThrough &&
  !isDate(source.coversActualsThrough)
) {
  errors.push("Invalid source reporting period");
}

if (
  evidence.kind === "reported" &&
  source.coversActualsThrough &&
  source.publishedAt < source.coversActualsThrough
) {
  errors.push(
    "Source publication predates its reporting period"
  );
}

    if (
      evidence.kind === "guidance" &&
      !source.guidanceAllowed
    ) {
      errors.push("Source not registered for guidance");
    }

    if (
      evidence.kind === "reported" &&
      source.coversActualsThrough &&
      evidence.asOf > source.coversActualsThrough
    ) {
      errors.push(
        "Reported date exceeds source's actuals period"
      );
    }

    if (
      evidence.kind === "reported" &&
      !source.coversActualsThrough &&
      options.actualOnly
    ) {
      errors.push(
        "Source has no registered financial actuals period"
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
