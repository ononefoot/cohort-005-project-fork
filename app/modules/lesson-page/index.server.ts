import { loadLessonPage as load } from "./lib/load.server";
import { runLessonAction as run } from "./lib/action.server";

type RouteArgs = {
  params: { slug: string; lessonId: string };
  request: Request;
};

/**
 * Everything the lesson page shows. Throws a 404 for a lesson the course
 * doesn't have; returns a "locked" view to someone who can't view it.
 */
export function loadLessonPage(args: RouteArgs) {
  return load(args);
}

export type LessonPageData = Awaited<ReturnType<typeof loadLessonPage>>;

/** Runs one of the lesson page's form intents, checking its capability. */
export function runLessonAction(args: RouteArgs) {
  return run(args);
}
