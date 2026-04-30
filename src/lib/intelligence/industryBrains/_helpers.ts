// P20.3 — Shared helpers for industry brains.
import type { Leak } from "@/lib/leakEngine/leakObject";
import type { BrainInput } from "../types";

export function makeLeak(
  input: BrainInput,
  partial: Omit<Leak, "industry_context" | "source_ref" | "client_or_job"> &
    Partial<Pick<Leak, "industry_context" | "source_ref" | "client_or_job">>,
): Leak {
  return {
    source_ref: null,
    client_or_job: null,
    industry_context: input.industry,
    ...partial,
  };
}
