import { describeDraft as describe } from "./lib/draft";
import type { NoteDraft, NoteDraftInput } from "./lib/draft";

export type { NoteDraft, NoteDraftInput, NoteDraftStatus } from "./lib/draft";

/**
 * What the Note editor should say about the Student's draft, and whether the
 * Save button does anything.
 */
export function describeDraft(input: NoteDraftInput): NoteDraft {
  return describe(input);
}
