import type { CourseRef } from "~/modules/permissions/course-permissions.server";

/** What the lesson route hands the loader and the action. */
export type LessonRouteArgs = {
  params: { slug: string; lessonId: string };
  request: Request;
};

/**
 * The course named by this route's slug, through this lesson, for
 * `coursePermissions` to resolve.
 */
export function lessonRef(params: LessonRouteArgs["params"]): CourseRef {
  return { slug: params.slug, lessonId: params.lessonId };
}
