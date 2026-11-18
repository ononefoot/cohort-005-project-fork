export type NoteDraftStatus =
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "too-long"; over: number }
  | { kind: "empty" }
  | { kind: "unsaved" }
  | { kind: "saved"; updatedAt: string };

export type NoteDraftInput = {
  draft: string;
  saved: { body: string; updatedAt: string } | null;
  isSaving: boolean;
  error: string | undefined;
  maxLength: number;
};

export type NoteDraft = {
  status: NoteDraftStatus;
  canSave: boolean;
  length: number;
};

function statusOf(input: NoteDraftInput): NoteDraftStatus {
  const { draft, saved, isSaving, error, maxLength } = input;
  if (isSaving) return { kind: "saving" };
  if (draft.length > maxLength) {
    return { kind: "too-long", over: draft.length - maxLength };
  }
  if (error) return { kind: "error", message: error };
  if (saved && draft === saved.body) {
    return { kind: "saved", updatedAt: saved.updatedAt };
  }
  // The action trims before saving, so whitespace alone is nothing to save.
  if (draft.trim().length === 0) return { kind: "empty" };
  return { kind: "unsaved" };
}

function canSave(input: NoteDraftInput): boolean {
  const { draft, saved, isSaving, maxLength } = input;
  return (
    !isSaving &&
    draft.length <= maxLength &&
    draft.trim().length > 0 &&
    draft !== saved?.body
  );
}

export function describeDraft(input: NoteDraftInput): NoteDraft {
  return {
    status: statusOf(input),
    canSave: canSave(input),
    length: input.draft.length,
  };
}
