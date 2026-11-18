import { describe, it, expect } from "vitest";
import { describeDraft, type NoteDraftInput } from "../index";

const saved = { body: "Types erase at runtime.", updatedAt: "2026-11-01" };

function input(overrides: Partial<NoteDraftInput>): NoteDraftInput {
  return {
    draft: "",
    saved: null,
    isSaving: false,
    error: undefined,
    maxLength: 20,
    ...overrides,
  };
}

describe("describeDraft", () => {
  it("is empty and cannot save before the Student writes anything", () => {
    expect(describeDraft(input({}))).toEqual({
      status: { kind: "empty" },
      canSave: false,
      length: 0,
    });
  });

  it("treats whitespace alone as empty", () => {
    const draft = describeDraft(input({ draft: "   \n" }));
    expect(draft.status).toEqual({ kind: "empty" });
    expect(draft.canSave).toBe(false);
    expect(draft.length).toBe(4);
  });

  it("can save a new draft", () => {
    const draft = describeDraft(input({ draft: "Hello" }));
    expect(draft.status).toEqual({ kind: "unsaved" });
    expect(draft.canSave).toBe(true);
  });

  it("is saved, with its edit time, when the draft matches the saved Note", () => {
    const draft = describeDraft(
      input({ draft: saved.body, saved, maxLength: 100 })
    );
    expect(draft.status).toEqual({ kind: "saved", updatedAt: "2026-11-01" });
    expect(draft.canSave).toBe(false);
  });

  it("has unsaved changes once the draft differs from the saved Note", () => {
    const draft = describeDraft(
      input({ draft: `${saved.body}!`, saved, maxLength: 100 })
    );
    expect(draft.status).toEqual({ kind: "unsaved" });
    expect(draft.canSave).toBe(true);
  });

  it("reports how far over the limit a long draft is, and cannot save it", () => {
    const draft = describeDraft(input({ draft: "x".repeat(23) }));
    expect(draft.status).toEqual({ kind: "too-long", over: 3 });
    expect(draft.canSave).toBe(false);
  });

  it("can save a draft exactly at the limit", () => {
    const draft = describeDraft(input({ draft: "x".repeat(20) }));
    expect(draft.status).toEqual({ kind: "unsaved" });
    expect(draft.canSave).toBe(true);
  });

  it("shows saving, and cannot save again, while a save is in flight", () => {
    const draft = describeDraft(
      input({ draft: "Hello", isSaving: true, error: "old" })
    );
    expect(draft.status).toEqual({ kind: "saving" });
    expect(draft.canSave).toBe(false);
  });

  it("shows the server's error", () => {
    const draft = describeDraft(input({ draft: "Hello", error: "Nope" }));
    expect(draft.status).toEqual({ kind: "error", message: "Nope" });
    expect(draft.canSave).toBe(true);
  });

  it("prefers the length warning over a stale error", () => {
    const draft = describeDraft(
      input({ draft: "x".repeat(21), error: "Nope" })
    );
    expect(draft.status).toEqual({ kind: "too-long", over: 1 });
  });

  it("cannot resubmit an empty draft after an error", () => {
    const draft = describeDraft(
      input({ draft: " ", error: "Write something" })
    );
    expect(draft.canSave).toBe(false);
  });
});
