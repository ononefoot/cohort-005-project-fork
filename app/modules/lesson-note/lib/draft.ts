export type NoteDraftStatus =
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "too-long"; over: number }
  | { kind: "empty" }
  | { kind: "unsaved" }
  | { kind: "saved"; updatedAt: string };

export type SavedNote = { body: string; updatedAt: string };

export type NoteDraftInput = {
  draft: string;
  saved: SavedNote | null;
  isSaving: boolean;
  error: string | undefined;
  maxLength: number;
};

export type NoteDraft = {
  status: NoteDraftStatus;
  canSave: boolean;
  length: number;
};

/**
 * The text the action stores for this draft. The browser submits a
 * textarea's line breaks as CRLF and the action trims and stores LF, so a
 * draft compared or counted as typed would never match its saved Note.
 */
function asStored(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function statusOf(input: NoteDraftInput, body: string): NoteDraftStatus {
  const { saved, isSaving, error, maxLength } = input;
  if (isSaving) return { kind: "saving" };
  if (body.length > maxLength) {
    return { kind: "too-long", over: body.length - maxLength };
  }
  if (error) return { kind: "error", message: error };
  if (saved && body === asStored(saved.body)) {
    return { kind: "saved", updatedAt: saved.updatedAt };
  }
  if (body.length === 0) return { kind: "empty" };
  return { kind: "unsaved" };
}

function canSave(input: NoteDraftInput, body: string): boolean {
  const { saved, isSaving, maxLength } = input;
  return (
    !isSaving &&
    body.length > 0 &&
    body.length <= maxLength &&
    (saved === null || body !== asStored(saved.body))
  );
}

export function describeDraft(input: NoteDraftInput): NoteDraft {
  const body = asStored(input.draft);
  return {
    status: statusOf(input, body),
    canSave: canSave(input, body),
    length: body.length,
  };
}
