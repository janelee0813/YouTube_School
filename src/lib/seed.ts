import type { Snapshot } from "./types";
export const ids = {
  course: "10000000-0000-4000-8000-000000000001",
  cohort: "20000000-0000-4000-8000-000000000001",
  student: "30000000-0000-4000-8000-000000000001",
  other: "30000000-0000-4000-8000-000000000002",
  teacher: "30000000-0000-4000-8000-000000000003",
  admin: "30000000-0000-4000-8000-000000000004",
};
export const topics = [
  "Preface — 뜬금없는 이야기. 해상도란 무엇인가?",
  "나는 유튜브 하기에 잘 맞는 사람일까? (진단하기)",
  "유튜브를 지속할 수 있는 유일한 방법 (feat. 유튜브를 중단하게 되는 이유)",
  "유튜브 콘텐츠 주제를 잡는 4가지 원칙 (선택과 집중)",
  "시청지속률? 노출클릭률? 무엇이 중요할까?",
  "핵심키워드를 잡는 가장 쉬운 방법",
  "검색노출 SEO 최적화하기 쉬운 방법",
];
export function seed(): Snapshot {
  const now = new Date().toISOString();
  return {
    profiles: [
      {
        id: ids.student,
        name: "데모 수강생",
        email: "student@example.test",
        role: "student",
      },
      {
        id: ids.other,
        name: "다른 데모 수강생",
        email: "other@example.test",
        role: "student",
      },
      {
        id: ids.teacher,
        name: "데모 강사",
        email: "teacher@example.test",
        role: "instructor",
      },
      {
        id: ids.admin,
        name: "데모 관리자",
        email: "admin@example.test",
        role: "admin",
      },
    ],
    courses: [
      {
        id: ids.course,
        title: "#1. 유튜브 콘텐츠 기획에 앞서 갖출 내용",
        summary:
          "채널의 첫 방향을 정하기 전, 나에게 맞는 시작을 준비하는 수업입니다.",
        body: "",
        preparation: "",
        topics,
        status: "published",
        order: 1,
        updated_at: now,
      },
    ],
    cohorts: [
      {
        id: ids.cohort,
        course_id: ids.course,
        name: "첫 수업 · 데모 운영 회차",
        starts_at: null,
        instructor_id: ids.teacher,
        status: "published",
      },
    ],
    enrollments: [
      {
        id: "40000000-0000-4000-8000-000000000001",
        user_id: ids.student,
        cohort_id: ids.cohort,
        status: "active",
      },
      {
        id: "40000000-0000-4000-8000-000000000002",
        user_id: ids.other,
        cohort_id: ids.cohort,
        status: "active",
      },
    ],
    materials: [],
    questions: [],
    notes: [],
    notices: [],
    settings: {
      id: 1,
      brand: "YOUTUBE CLASS",
      contact_label: "",
      contact_url: "",
    },
  };
}
