import { useState } from "react";
import { useFetcher } from "react-router";
import { Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import { cn, formatRelativeTime } from "~/lib/utils";
import { describeDraft, type NoteDraftStatus } from "~/modules/lesson-note";

export function LessonNote({
  note,
}: {
  note: { body: string; updatedAt: string } | null;
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [draft, setDraft] = useState(note?.body ?? "");
  const { status, canSave, length } = describeDraft({
    draft,
    saved: note,
    isSaving: fetcher.state !== "idle",
    error: fetcher.data?.error,
    maxLength: MAX_NOTE_LENGTH,
  });

  return (
    <Card className="mb-8 py-0">
      <CardContent className="p-6">
        <NoteHeader />

        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={5}
            placeholder="Jot down what you want to remember from this lesson..."
            aria-label="Your notes"
            className="resize-y"
          />
          <NoteFooter status={status} canSave={canSave} length={length} />
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function NoteHeader() {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-5 text-primary" />
        <h2 className="text-xl font-semibold">Your notes</h2>
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Only you can see these
      </span>
    </div>
  );
}

function NoteFooter({
  status,
  canSave,
  length,
}: {
  status: NoteDraftStatus;
  canSave: boolean;
  length: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" size="sm" disabled={!canSave}>
        {status.kind === "saving" ? "Saving..." : "Save note"}
      </Button>
      <DraftStatus status={status} />
      <span
        className={cn(
          "ml-auto text-xs",
          status.kind === "too-long"
            ? "text-destructive"
            : "text-muted-foreground"
        )}
      >
        {length} / {MAX_NOTE_LENGTH}
      </span>
    </div>
  );
}

function DraftStatus({ status }: { status: NoteDraftStatus }) {
  switch (status.kind) {
    case "error":
      return <span className="text-sm text-destructive">{status.message}</span>;
    case "too-long":
      return (
        <span className="text-sm text-destructive">
          {status.over} characters over the limit
        </span>
      );
    case "unsaved":
      return (
        <span className="text-xs text-muted-foreground">Unsaved changes</span>
      );
    case "saved":
      return (
        <span
          suppressHydrationWarning
          className="text-xs text-muted-foreground"
        >
          Saved · edited {formatRelativeTime(status.updatedAt)}
        </span>
      );
    case "saving":
    case "empty":
      return null;
  }
}
