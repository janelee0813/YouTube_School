import { z } from "zod";
const id = z.string().uuid();
const text = (n: number) => z.string().max(n);
const url = z
  .string()
  .max(2000)
  .refine(
    (v) => !v || /^https?:\/\//i.test(v),
    "http 또는 https 주소를 입력해 주세요.",
  )
  .refine((v) => {
    try {
      return !v || !!new URL(v).hostname;
    } catch {
      return false;
    }
  }, "올바른 주소를 입력해 주세요.");
const publish = z.enum(["draft", "published", "private"]);
export const questionSchema = z.object({
  id,
  cohort_id: id,
  title: text(200).trim().min(1, "질문을 입력해 주세요."),
  stage: z.enum([
    "",
    "아직 시작 전",
    "채널만 개설",
    "영상 업로드 중",
    "쉬었다가 재시작",
  ]),
  detail: text(2000),
  url,
  topic: text(300),
  draft: z.boolean(),
  revision: z.number().int().nonnegative().default(0),
});
export const courseSchema = z.object({
  id,
  title: text(200).trim().min(1),
  summary: text(600),
  body: text(30000),
  preparation: text(5000),
  topics: z.array(text(300).min(1)).max(30),
  status: publish,
  order: z.number().int().min(1).max(999),
});
export const materialSchema = z
  .object({
    id,
    course_id: id,
    title: text(200).trim().min(1),
    type: z.enum(["note", "pdf", "worksheet", "link", "video"]),
    body: text(30000),
    url,
    file_path: text(600).refine(
      (v) => !v || /^[a-f0-9-]{36}\/[a-f0-9-]{36}\.[a-z0-9]+$/.test(v),
      "잘못된 파일 경로입니다.",
    ),
    file_name: text(255),
    visibility: z.enum(["enrolled", "public"]),
    status: publish,
  })
  .refine(
    (v) =>
      v.status !== "published" || !!(v.body.trim() || v.url || v.file_path),
    "게시하려면 본문, 링크 또는 실제 파일이 필요합니다.",
  );
export const cohortSchema = z.object({
  id,
  course_id: id,
  name: text(100).trim().min(1),
  starts_at: z.union([z.string().datetime({ offset: true }), z.null()]),
  instructor_id: z.union([id, z.null()]),
  status: publish,
});
export const mutationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("question"), value: questionSchema }),
  z.object({
    kind: z.literal("delete-question"),
    id,
    revision: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("restore-question"),
    id,
    revision: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("answer"),
    id,
    revision: z.number().int().nonnegative(),
    answer: text(10000),
    status: z.enum(["received", "reviewed", "answered", "in_class"]),
    note: text(10000),
  }),
  z.object({ kind: z.literal("course"), value: courseSchema }),
  z.object({ kind: z.literal("cohort"), value: cohortSchema }),
  z.object({ kind: z.literal("material"), value: materialSchema }),
  z.object({
    kind: z.literal("enrollment"),
    value: z.object({
      id,
      user_id: id,
      cohort_id: id,
      status: z.enum(["pending", "active", "revoked"]),
    }),
  }),
  z.object({ kind: z.literal("request-enrollment"), cohort_id: id }),
  z.object({
    kind: z.literal("notice"),
    value: z.object({
      id,
      title: text(200).trim().min(1),
      body: text(10000),
      status: publish,
    }),
  }),
  z.object({
    kind: z.literal("settings"),
    value: z.object({
      id: z.literal(1),
      brand: text(60).trim().min(1),
      contact_label: text(100),
      contact_url: url,
    }),
  }),
]);
export type Mutation = z.infer<typeof mutationSchema>;
export function safeNext(s: string | null) {
  return s && s.startsWith("/") && !s.startsWith("//") && !s.includes("\\")
    ? s
    : "/records";
}
export function errorMessage(e: unknown) {
  return e instanceof z.ZodError
    ? e.issues[0]?.message
    : e instanceof Error
      ? e.message
      : "저장하지 못했습니다. 입력은 유지됩니다. 다시 시도해 주세요.";
}
