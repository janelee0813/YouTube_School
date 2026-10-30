import test from "node:test";
import assert from "node:assert/strict";
import { seed, ids, previousTopics } from "../src/lib/seed";
import { mutateDemo, loadDemo, persistDemo, DEMO_KEY } from "../src/lib/demo";
import { visibleSnapshot, readsMaterial } from "../src/lib/permissions";
import {
  questionSchema,
  materialSchema,
  safeNext,
} from "../src/lib/validation";
import type { Snapshot, Material } from "../src/lib/types";
const student = () => seed().profiles.find((p) => p.id === ids.student)!;
const teacher = () => seed().profiles.find((p) => p.id === ids.teacher)!;
const admin = () => seed().profiles.find((p) => p.id === ids.admin)!;
const value = () => ({
  id: crypto.randomUUID(),
  cohort_id: ids.cohort,
  title: "퇴근 후 제작 시간을 어떻게 정할까요?",
  detail: "주말에 먼저 시도했습니다.",
  stage: "아직 시작 전" as const,
  url: "",
  topic: "",
  draft: false,
  revision: 0,
});
function submitted() {
  const v = value();
  const s = mutateDemo(seed(), student(), { kind: "question", value: v });
  return { s, v, q: s.questions[0] };
}
const material = (overrides: Partial<Material> = {}): Material => ({
  id: crypto.randomUUID(),
  course_id: ids.course,
  title: "검증용 자료",
  type: "note",
  body: "테스트용 본문",
  url: "",
  file_path: "",
  file_name: "",
  visibility: "enrolled",
  status: "published",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});
test("provided first-class topics seeded exactly; no invented schedules, files or contacts", () => {
  const s = seed();
  assert.equal(s.courses[0].topics.length, 8);
  assert.equal(
    s.courses[0].topics[0],
    "Preface — 유튜브를 시작하는 목적 점검하기 (유튜브, 얼마 벌 수 있을까?)",
  );
  assert.equal(
    s.courses[0].topics[1],
    "뜬금없는 이야기. 해상도란 무엇인가?",
  );
  assert.equal(s.cohorts[0].starts_at, null);
  assert.equal(s.materials.length, 0);
  assert.equal(s.settings.contact_url, "");
  assert.equal(s.courses[0].body, "");
});
test("submitted question belongs to active demo student", () => {
  const { q } = submitted();
  assert.equal(q.user_id, ids.student);
  assert.equal(q.status, "received");
  assert.equal(q.revision, 1);
});
test("idempotent duplicate submit uses same UUID and produces one record", () => {
  const { s, v } = submitted();
  const next = mutateDemo(s, student(), { kind: "question", value: v });
  assert.equal(next.questions.length, 1);
  assert.equal(next.questions[0].revision, 1);
});
test("drafts appear only to their author in demo snapshots", () => {
  const v = { ...value(), draft: true },
    s = mutateDemo(seed(), student(), { kind: "question", value: v });
  assert.equal(visibleSnapshot(s, teacher()).questions.length, 0);
  assert.equal(visibleSnapshot(s, admin()).questions.length, 0);
  assert.equal(visibleSnapshot(s, student()).questions.length, 1);
});
test("other student cannot read or edit question through demo domain layer", () => {
  const { s, v, q } = submitted();
  const other = s.profiles.find((p) => p.id === ids.other)!;
  assert.equal(visibleSnapshot(s, other).questions.length, 0);
  assert.throws(() =>
    mutateDemo(s, other, {
      kind: "question",
      value: { ...v, revision: q.revision, title: "다른 사람의 질문 변경" },
    }),
  );
});
test("guest cannot mutate", () =>
  assert.throws(() =>
    mutateDemo(seed(), null, { kind: "question", value: value() }),
  ));
test("revoked enrollment prevents new questions", () => {
  const s = seed();
  s.enrollments[0].status = "revoked";
  assert.throws(() =>
    mutateDemo(s, student(), { kind: "question", value: value() }),
  );
});
test("teacher answer and internal notes stay separated", () => {
  const { s, q } = submitted();
  const next = mutateDemo(s, teacher(), {
    kind: "answer",
    id: q.id,
    revision: q.revision,
    answer: "다음 수업에서 일정부터 함께 정리해 보겠습니다.",
    note: "수업 중 별도 확인",
    status: "answered",
  });
  const own = visibleSnapshot(next, student());
  assert.equal(own.questions[0].status, "answered");
  assert.match(own.questions[0].answer, /다음 수업/);
  assert.equal(own.notes.length, 0);
  assert.equal(visibleSnapshot(next, teacher()).notes.length, 1);
});
test("editing an answered question flags it for instructor", () => {
  const { s, v, q } = submitted();
  let next = mutateDemo(s, teacher(), {
    kind: "answer",
    id: q.id,
    revision: 1,
    answer: "확인했습니다.",
    note: "",
    status: "answered",
  });
  next = mutateDemo(next, student(), {
    kind: "question",
    value: { ...v, revision: 2, detail: "추가 상황입니다." },
  });
  assert.equal(next.questions[0].changed_after_answer, true);
  assert.equal(next.questions[0].answer, "확인했습니다.");
});
test("stale revision rejected and input snapshot remains unchanged", () => {
  const { s, v } = submitted();
  const before = JSON.stringify(s);
  assert.throws(() =>
    mutateDemo(s, student(), {
      kind: "question",
      value: { ...v, title: "변경된 질문", revision: 0 },
    }),
  );
  assert.equal(JSON.stringify(s), before);
});
test("soft deletion and restore preserve content", () => {
  const { s, q } = submitted();
  const next = mutateDemo(s, student(), {
    kind: "delete-question",
    id: q.id,
    revision: 1,
  });
  assert.ok(next.questions[0].deleted_at);
  assert.equal(next.questions[0].title, q.title);
  const restored = mutateDemo(next, student(), {
    kind: "restore-question",
    id: q.id,
    revision: 2,
  });
  assert.equal(restored.questions[0].deleted_at, null);
});
test("question limits and unsafe URLs validated", () => {
  assert.equal(
    questionSchema.safeParse({ ...value(), title: "x".repeat(201) }).success,
    false,
  );
  assert.equal(
    questionSchema.safeParse({ ...value(), detail: "x".repeat(2001) }).success,
    false,
  );
  assert.equal(
    questionSchema.safeParse({ ...value(), url: "javascript:alert(1)" })
      .success,
    false,
  );
});
test("material requires real content to publish", () =>
  assert.equal(
    materialSchema.safeParse({ ...material(), body: "" }).success,
    false,
  ));
test("restricted material visibility respects enrollment in demo projection", () => {
  const s = seed(),
    m = material();
  s.materials.push(m);
  assert.equal(readsMaterial(s, null, m), false);
  assert.equal(readsMaterial(s, student(), m), true);
  s.enrollments[0].status = "revoked";
  assert.equal(readsMaterial(s, student(), m), false);
});
test("draft material and courses hidden from student and guest", () => {
  const s = seed();
  s.materials.push(material({ status: "draft" }));
  s.courses[0].status = "draft";
  assert.equal(visibleSnapshot(s, student()).materials.length, 0);
  for (const user of [null, student()]) {
    const visible = visibleSnapshot(s, user).courses;
    assert.equal(visible.some((c) => c.id === ids.course), false);
    assert.equal(visible.some((c) => c.id === ids.secondCourse), true);
  }
});
test("admin can publish an additional course and material without code edits", () => {
  const s = seed(),
    course = {
      ...s.courses[0],
      id: crypto.randomUUID(),
      title: "추가 테스트 수업",
      order: s.courses.length + 1,
    };
  let next = mutateDemo(s, admin(), { kind: "course", value: course });
  next = mutateDemo(next, admin(), {
    kind: "material",
    value: material({ course_id: course.id, visibility: "public" }),
  });
  assert.equal(visibleSnapshot(next, null).courses.length, s.courses.length + 1);
  assert.equal(visibleSnapshot(next, null).courses.some((c) => c.id === course.id), true);
  assert.equal(visibleSnapshot(next, null).materials.length, 1);
});
test("student cannot publish content or approve their own membership", () => {
  const s = seed();
  assert.throws(() =>
    mutateDemo(s, student(), { kind: "course", value: s.courses[0] }),
  );
  assert.throws(() =>
    mutateDemo(s, student(), { kind: "enrollment", value: s.enrollments[0] }),
  );
});
test("admin can approve a request without duplicate enrollment pairs", () => {
  const s = seed();
  let next = mutateDemo(s, admin(), {
    kind: "enrollment",
    value: { ...s.enrollments[0], id: crypto.randomUUID(), status: "revoked" },
  });
  assert.equal(next.enrollments.length, 2);
  assert.equal(next.enrollments[0].status, "revoked");
});
test("serialized snapshot survives reload and role changes", () => {
  const { s } = submitted();
  const memory = new Map([[DEMO_KEY, JSON.stringify(s)]]);
  Object.defineProperty(globalThis, "localStorage", {
    value: { getItem: (key: string) => memory.get(key) || null },
    configurable: true,
  });
  const reloaded = loadDemo();
  assert.equal(visibleSnapshot(reloaded, student()).questions.length, 1);
  assert.equal(
    visibleSnapshot(
      reloaded,
      reloaded.profiles.find((p) => p.id === ids.other)!,
    ).questions.length,
    0,
  );
  assert.equal(visibleSnapshot(loadDemo(), student()).questions.length, 1);
});
test("storage failure does not erase submitted data or mutate input object", () => {
  const { s, v } = submitted();
  const disk = JSON.stringify(s);
  const storage = {
    getItem() {
      return disk;
    },
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };
  assert.throws(() =>
    persistDemo(storage, ids.student, {
      kind: "question",
      value: { ...v, revision: 1, title: "새 내용" },
    }),
  );
  assert.equal(storage.getItem(), disk);
  assert.equal(JSON.stringify(s), disk);
});
test("return URLs stay on the current site", () => {
  assert.equal(safeNext("https://evil.test"), "/records");
  assert.equal(safeNext("//evil.test"), "/records");
  assert.equal(safeNext("/\\evil.test"), "/records");
  assert.equal(safeNext("/classes/1"), "/classes/1");
});

test("existing demo outline gains the preface once while preserving records", () => {
  const { s } = submitted();
  s.courses[0].topics = [...previousTopics];
  const storage = { getItem: () => JSON.stringify(s) };
  const upgraded = loadDemo(storage);
  assert.deepEqual(upgraded.courses[0].topics, seed().courses[0].topics);
  assert.deepEqual(upgraded.questions, s.questions);
  const reloaded = loadDemo({ getItem: () => JSON.stringify(upgraded) });
  assert.deepEqual(reloaded, upgraded);
});

test("outline upgrade preserves administrator-edited topics", () => {
  const s = seed();
  s.courses[0].topics = ["직접 작성한 수업 목차"];
  assert.deepEqual(loadDemo({ getItem: () => JSON.stringify(s) }), s);
});

test("existing browsers receive class two once without losing saved content", () => {
  const { s } = submitted();
  s.courses = s.courses.filter((c) => c.id !== ids.secondCourse);
  s.courses[0].summary = "관리자가 수정한 소개";
  const upgraded = loadDemo({ getItem: () => JSON.stringify(s) });
  assert.deepEqual(upgraded.courses[0], s.courses[0]);
  assert.deepEqual(upgraded.questions, s.questions);
  assert.deepEqual(upgraded.enrollments, s.enrollments);
  const second = upgraded.courses.find((c) => c.id === ids.secondCourse)!;
  assert.equal(second.status, "published");
  assert.equal(second.topics.length, 6);
  const reloaded = loadDemo({ getItem: () => JSON.stringify(upgraded) });
  assert.deepEqual(reloaded, upgraded);
});

test("class two upgrade preserves administrator edits and publication status", () => {
  const s = seed();
  const second = s.courses.find((c) => c.id === ids.secondCourse)!;
  second.title = "관리자가 수정한 두 번째 수업";
  second.status = "private";
  assert.deepEqual(loadDemo({ getItem: () => JSON.stringify(s) }), s);
});
