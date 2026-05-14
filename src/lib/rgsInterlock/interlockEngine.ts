import { RGS_TOOL_INTERLOCK_REGISTRY } from "./toolInterlockRegistry";
import type { InterlockValidationResult, RgsSignalKey, RgsToolInterlockContract } from "./types";

export function listToolInterlocks(): RgsToolInterlockContract[] {
  return RGS_TOOL_INTERLOCK_REGISTRY;
}

export function getToolInterlock(toolKey: string): RgsToolInterlockContract | null {
  return RGS_TOOL_INTERLOCK_REGISTRY.find((tool) => tool.toolKey === toolKey) ?? null;
}

export function getDownstreamTools(toolKey: string): RgsToolInterlockContract[] {
  const tool = getToolInterlock(toolKey);
  if (!tool) return [];
  const downstream = new Set(tool.downstreamTools);
  return RGS_TOOL_INTERLOCK_REGISTRY.filter((candidate) => downstream.has(candidate.toolKey));
}

export function getUpstreamTools(toolKey: string): RgsToolInterlockContract[] {
  const tool = getToolInterlock(toolKey);
  if (!tool) return [];
  const upstream = new Set(tool.upstreamTools);
  return RGS_TOOL_INTERLOCK_REGISTRY.filter((candidate) => upstream.has(candidate.toolKey));
}

export function toolsProducingSignal(signal: RgsSignalKey): RgsToolInterlockContract[] {
  return RGS_TOOL_INTERLOCK_REGISTRY.filter((tool) => tool.producesSignals.includes(signal));
}

export function toolsConsumingSignal(signal: RgsSignalKey): RgsToolInterlockContract[] {
  return RGS_TOOL_INTERLOCK_REGISTRY.filter((tool) => tool.consumesSignals.includes(signal));
}

export function missingRequiredInputsForTool(
  toolKey: string,
  availableSignals: ReadonlyArray<RgsSignalKey>,
): RgsSignalKey[] {
  const tool = getToolInterlock(toolKey);
  if (!tool) return [];
  const available = new Set(availableSignals);
  return tool.requiredInputs.filter((input) => !available.has(input));
}

export function validateToolInterlocks(): InterlockValidationResult {
  const issues: string[] = [];
  const keys = new Set<string>();

  for (const tool of RGS_TOOL_INTERLOCK_REGISTRY) {
    if (keys.has(tool.toolKey)) issues.push(`Duplicate tool key: ${tool.toolKey}`);
    keys.add(tool.toolKey);

    for (const field of tool.clientVisibleFields) {
      if (/admin|internal|rationale|secret|service[-_ ]?role/i.test(field)) {
        issues.push(`${tool.toolKey} exposes unsafe client-visible field: ${field}`);
      }
    }

    if (tool.adminOnlyFields.length === 0 && tool.approvalRequired) {
      issues.push(`${tool.toolKey} requires approval but has no admin-only review fields`);
    }

    for (const downstream of tool.downstreamTools) {
      if (!RGS_TOOL_INTERLOCK_REGISTRY.some((candidate) => candidate.toolKey === downstream)) {
        issues.push(`${tool.toolKey} references missing downstream tool: ${downstream}`);
      }
    }

    for (const upstream of tool.upstreamTools) {
      if (!RGS_TOOL_INTERLOCK_REGISTRY.some((candidate) => candidate.toolKey === upstream)) {
        issues.push(`${tool.toolKey} references missing upstream tool: ${upstream}`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
