import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { UserRole } from "~/db/schema";
import {
  MAX_NOTE_LENGTH,
  getOwnNote,
  isBookmarked,
  listSavedBookmarks,
  listSavedNotes,
  saveNote,
  toggleBookmark,
} from "./saved.server";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);
const LATER = new Date(2026, 9, 7, 9, 30, 0);

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonIds = [1, 2].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
});

function addStudent(name: string) {
  return db
    .insert(schema.users)
    .values({
      name,
      email: `${name.toLowerCase()}@example.com`,
      role: UserRole.Student,
    })
    .returning()
    .get();
}

describe("toggling a Bookmark", () => {
  it("bookmarks a Lesson with no Bookmark, and un-bookmarks it on the next press", () => {
    expect(toggleBookmark(db, base.user.id, lessonIds[0], NOW)).toBe(true);
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(true);

    expect(toggleBookmark(db, base.user.id, lessonIds[0], LATER)).toBe(false);
    expect(isBookmarked(db, base.user.id, lessonIds[0])).toBe(false);
  });

  it("never leaves two Bookmarks on the same Lesson", () => {
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    expect(() =>
      db
        .insert(schema.bookmarks)
        .values({ userId: base.user.id, lessonId: lessonIds[0] })
        .run()
    ).toThrow();
    expect(listSavedBookmarks(db, base.user.id)).toHaveLength(1);
  });
});

describe("saving a Note", () => {
  it("creates the Note, trimmed, on a Lesson with none", () => {
    const result = saveNote(db, base.user.id, lessonIds[0], "  # not *markdown*  ", NOW);

    expect(result).toEqual({
      ok: true,
      note: { body: "# not *markdown*", updatedAt: NOW.toISOString() },
    });
    expect(getOwnNote(db, base.user.id, lessonIds[0])).toEqual({
      body: "# not *markdown*",
      updatedAt: NOW.toISOString(),
    });
  });

  it("replaces the body and moves the last edited time on when saved again", () => {
    saveNote(db, base.user.id, lessonIds[0], "First draft", NOW);
    saveNote(db, base.user.id, lessonIds[0], "Second draft", LATER);

    expect(getOwnNote(db, base.user.id, lessonIds[0])).toEqual({
      body: "Second draft",
      updatedAt: LATER.toISOString(),
    });
    const rows = listSavedNotes(db, base.user.id);
    expect(rows).toHaveLength(1);
  });

  it("keeps the original creation time when saved again", () => {
    saveNote(db, base.user.id, lessonIds[0], "First draft", NOW);
    saveNote(db, base.user.id, lessonIds[0], "Second draft", LATER);

    const row = db.select().from(schema.notes).get();
    expect(row?.createdAt).toBe(NOW.toISOString());
  });

  it("accepts a Note of exactly 2,000 characters", () => {
    const body = "a".repeat(MAX_NOTE_LENGTH);
    expect(saveNote(db, base.user.id, lessonIds[0], body, NOW).ok).toBe(true);
    expect(getOwnNote(db, base.user.id, lessonIds[0])?.body).toBe(body);
  });

  it("refuses a Note over 2,000 characters with a message, and stores nothing", () => {
    const result = saveNote(
      db,
      base.user.id,
      lessonIds[0],
      "a".repeat(MAX_NOTE_LENGTH + 1),
      NOW
    );

    expect(result).toEqual({
      ok: false,
      error: "A note must be 2,000 characters or fewer.",
    });
    expect(getOwnNote(db, base.user.id, lessonIds[0])).toBeNull();
  });

  it("refuses an empty Note", () => {
    expect(saveNote(db, base.user.id, lessonIds[0], "   ", NOW).ok).toBe(false);
    expect(getOwnNote(db, base.user.id, lessonIds[0])).toBeNull();
  });
});

describe("the Saved lists", () => {
  it("contain only the Student's own rows, newest first, with their Lesson and Course", () => {
    const other = addStudent("Olivia");
    toggleBookmark(db, base.user.id, lessonIds[0], NOW);
    toggleBookmark(db, base.user.id, lessonIds[1], LATER);
    toggleBookmark(db, other.id, lessonIds[0], NOW);
    saveNote(db, base.user.id, lessonIds[1], "Older", NOW);
    saveNote(db, base.user.id, lessonIds[0], "Newer", LATER);
    saveNote(db, other.id, lessonIds[0], "Someone else's", LATER);

    expect(listSavedBookmarks(db, base.user.id)).toMatchObject([
      { lessonId: lessonIds[1], lessonTitle: "Lesson 2", courseTitle: "Test Course", courseSlug: "test-course" },
      { lessonId: lessonIds[0], lessonTitle: "Lesson 1", courseTitle: "Test Course", courseSlug: "test-course" },
    ]);
    expect(listSavedNotes(db, base.user.id)).toMatchObject([
      { body: "Newer", lessonId: lessonIds[0], courseTitle: "Test Course" },
      { body: "Older", lessonId: lessonIds[1], courseTitle: "Test Course" },
    ]);
  });

  it("orders Notes by when they were last edited, not created", () => {
    saveNote(db, base.user.id, lessonIds[0], "Written first", NOW);
    saveNote(db, base.user.id, lessonIds[1], "Written second", LATER);
    saveNote(db, base.user.id, lessonIds[0], "Written first, edited last", new Date(2026, 9, 8));

    expect(listSavedNotes(db, base.user.id).map((note) => note.body)).toEqual([
      "Written first, edited last",
      "Written second",
    ]);
  });
});
