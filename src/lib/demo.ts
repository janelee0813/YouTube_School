// Deliberately NOT a security boundary. All demo data lives in this browser.
import { seed, ids, topics } from "./seed";
import type { Snapshot, Profile, Question } from "./types";
import { enrolled, manages } from "./permissions";
import { mutationSchema, type Mutation } from "./validation";
export const DEMO_KEY = "youtube-class-demo-v1";
export function mutateDemo(
  state: Snapshot,
  user: Profile | null,
  input: Mutation,
): Snapshot {
  const m = mutationSchema.parse(input),
    s = structuredClone(state),
    now = new Date().toISOString();
  if (!user) throw new Error("먼저 데모 역할을 선택해 주세요.");
  const admin = user.role === "admin";
  const upsert = <T extends { id: string }>(list: T[], v: T) => {
    const i = list.findIndex((x) => x.id === v.id);
    if (i < 0) list.push(v);
    else list[i] = v;
  };
  const ensure = (ok: boolean, msg = "접근 권한이 없습니다.") => {
    if (!ok) throw new Error(msg);
  };
  if (m.kind === "question") {
    const old = s.questions.find((q) => q.id === m.value.id);
    ensure(enrolled(s, user, m.value.cohort_id));
    ensure(
      s.cohorts.some(
        (c) =>
          c.id === m.value.cohort_id &&
          c.status === "published" &&
          s.courses.some(
            (co) => co.id === c.course_id && co.status === "published",
          ),
      ),
    );
    if (old) {
      ensure(
        old.user_id === user.id &&
          old.cohort_id === m.value.cohort_id &&
          !old.deleted_at,
      );
      if (old.revision !== m.value.revision) {
        if (
          old.title === m.value.title &&
          old.detail === m.value.detail &&
          old.draft === m.value.draft &&
          old.stage === m.value.stage &&
          old.url === m.value.url &&
          old.topic === m.value.topic
        )
          return s;
        throw new Error(
          "다른 화면에서 변경되었습니다. 새로고침 후 다시 확인해 주세요.",
        );
      }
    }
    ensure(
      !old || old.draft || !m.value.draft,
      "제출한 질문은 임시 저장으로 되돌릴 수 없습니다.",
    );
    upsert(s.questions, {
      ...old,
      ...m.value,
      user_id: user.id,
      status: old?.status || "received",
      answer: old?.answer || "",
      answered_at: old?.answered_at || null,
      changed_after_answer:
        (!!old?.answered_at &&
          (old.title !== m.value.title ||
            old.detail !== m.value.detail ||
            old.url !== m.value.url ||
            old.stage !== m.value.stage ||
            old.topic !== m.value.topic)) ||
        !!old?.changed_after_answer,
      deleted_at: null,
      created_at: old?.created_at || now,
      updated_at: now,
      revision: (old?.revision || 0) + 1,
    } as Question);
  } else if (m.kind === "delete-question" || m.kind === "restore-question") {
    const q = s.questions.find((q) => q.id === m.id);
    ensure(!!q && q.user_id === user.id);
    ensure(
      q!.revision === m.revision,
      "다른 화면에서 변경되었습니다. 새로고침해 주세요.",
    );
    q!.deleted_at = m.kind === "delete-question" ? now : null;
    q!.revision++;
  } else if (m.kind === "answer") {
    const q = s.questions.find((q) => q.id === m.id);
    ensure(!!q && !q.draft && !q.deleted_at && manages(s, user, q.cohort_id));
    ensure(
      q!.revision === m.revision,
      "질문이 변경되었습니다. 새로고침 후 답변해 주세요.",
    );
    ensure(
      m.status !== "answered" || !!m.answer.trim(),
      "답변 완료 상태에는 답변을 입력해 주세요.",
    );
    Object.assign(q!, {
      answer: m.answer,
      status: m.status,
      answered_at: m.answer ? now : null,
      changed_after_answer: false,
      updated_at: now,
      revision: q!.revision + 1,
    });
    const n = s.notes.find((x) => x.question_id === m.id);
    if (n) n.body = m.note;
    else s.notes.push({ question_id: m.id, body: m.note });
  } else if (m.kind === "request-enrollment") {
    ensure(
      s.cohorts.some((c) => c.id === m.cohort_id && c.status === "published"),
    );
    const old = s.enrollments.find(
      (e) => e.user_id === user.id && e.cohort_id === m.cohort_id,
    );
    if (old?.status === "revoked") old.status = "pending";
    if (!old)
      s.enrollments.push({
        id: crypto.randomUUID(),
        user_id: user.id,
        cohort_id: m.cohort_id,
        status: "pending",
      });
  } else {
    ensure(admin);
    switch (m.kind) {
      case "course":
        upsert(s.courses, { ...m.value, updated_at: now });
        break;
      case "cohort":
        upsert(s.cohorts, m.value);
        break;
      case "material":
        upsert(s.materials, {
          ...m.value,
          created_at:
            s.materials.find((x) => x.id === m.value.id)?.created_at || now,
          updated_at: now,
        });
        break;
      case "enrollment": {
        const old = s.enrollments.find(
          (e) =>
            e.cohort_id === m.value.cohort_id && e.user_id === m.value.user_id,
        );
        upsert(s.enrollments, { ...m.value, id: old?.id || m.value.id });
        break;
      }
      case "notice":
        upsert(s.notices, { ...m.value, updated_at: now });
        break;
      case "settings":
        s.settings = m.value;
    }
  }
  return s;
}
export function loadDemo(
  storage: Pick<Storage, "getItem"> = localStorage,
): Snapshot {
  const raw = storage.getItem(DEMO_KEY);
  if (!raw) return seed();
  const snapshot: Snapshot = JSON.parse(raw);
  for (const initial of seed().courses) {
    const saved = snapshot.courses.find((c) => c.id === initial.id);
    if (saved && saved.schedule_label === undefined) {
      saved.schedule_label = initial.schedule_label;
    }
  }
  // Add the new class to existing browsers without replacing administrator edits.
  if (!snapshot.courses.some((c) => c.id === ids.secondCourse)) {
    snapshot.courses.push(seed().courses.find((c) => c.id === ids.secondCourse)!);
  }
  const course = snapshot.courses.find((c) => c.id === ids.course);
  const previousTopics = topics.slice(1);
  // Upgrade the untouched initial outline without replacing saved user content.
  if (
    course &&
    course.topics.length === previousTopics.length &&
    course.topics.every((topic, index) => topic === previousTopics[index])
  ) {
    course.topics = [...topics];
  }
  return snapshot;
}
export function persistDemo(
  storage: Pick<Storage, "getItem" | "setItem">,
  roleId: string | null,
  input: Mutation,
): Snapshot {
  const full = loadDemo(storage);
  const user = full.profiles.find((p) => p.id === roleId) || null;
  const next = mutateDemo(full, user, input);
  storage.setItem(DEMO_KEY, JSON.stringify(next));
  return next;
}
