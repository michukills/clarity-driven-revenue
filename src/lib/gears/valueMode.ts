/**
 * P13.2.H — Value-facing translation helpers.
 *
 * Pure presentation layer: callers pick which label set to render.
 * Internal data, table names, statuses, and admin language are NEVER renamed.
 * The toggle preference is persisted per browser via localStorage so admins
 * can demo the client-facing language without navigating away.
 */
import { useEffect, useState } from "react";
import { VALUE_LANGUAGE } from "./targetGear";

export type LanguageMode = "admin" | "value";

const STORAGE_KEY = "rgs.valueLanguageMode";

/** Read once on mount; updates if another tab toggles it. */
export function useValueMode(): [LanguageMode, (m: LanguageMode) => void] {
  const [mode, setMode] = useState<LanguageMode>(() => {
    if (typeof window === "undefined") return "admin";
    return (window.localStorage.getItem(STORAGE_KEY) as LanguageMode) || "admin";
  });
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "admin" || e.newValue === "value")) {
        setMode(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const set = (m: LanguageMode) => {
    setMode(m);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, m);
  };
  return [mode, set];
}

/**
 * Return the appropriate label for the current language mode.
 * Admin keeps the existing internal label; value mode uses the
 * canonical RGS Stability translation from VALUE_LANGUAGE.
 */
export function label(
  mode: LanguageMode,
  adminLabel: string,
  key: keyof typeof VALUE_LANGUAGE,
): string {
  return mode === "value" ? VALUE_LANGUAGE[key] : adminLabel;
}