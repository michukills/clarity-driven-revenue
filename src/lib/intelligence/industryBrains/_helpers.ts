// P20.3 — Shared helpers for industry brains.
import type { Leak } from "@/lib/leakEngine/leakObject";
import type { BrainInput } from "../types";

export function leak(
  input: BrainInput,
  partial: Omit<Leak, "industry_context"> & { industry_context?: Leak["industry_context"] },
): Leak {
  return {
    industry_context: input.industry,
    source_ref: null,
    client_or_job: null,
    ...partial,
    industry_context: partial.industry_context ?? input.industry,
  } as Leak;
}
