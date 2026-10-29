"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, ArrowUpRight, Eye, Save, Upload } from "lucide-react";
import { useData } from "./provider";
import {
  PageHead,
  Field,
  NoticeBox,
  Empty,
  Restricted,
  Status,
  ButtonLink,
} from "./ui";
import { Instructor } from "./questions";
import { errorMessage, type Mutation } from "@/lib/validation";
import type { Course, Material, Cohort, Notice, Publish } from "@/lib/types";
import { typeLabels } from "@/lib/types";
const publishLabels = {
  draft: "임시 저장",
  published: "게시",
  private: "비공개",
};
function PublishSelect({
  value,
  onChange,
}: {
  value: Publish;
  onChange: (v: Publish) => void;
}) {
  return (
    <Field label="게시 상태">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Publish)}
      >
        {Object.entries(publishLabels).map(([k, v]) => (
          <option value={k} key={k}>
            {v}
          </option>
        ))}
      </select>
    </Field>
  );
}
function useSave() {
  const { save } = useData();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("");
  return {
    busy,
    error,
    saved,
    run: async (m: Mutation) => {
      if (busy) return;
      setBusy(true);
      setError("");
      setSaved("");
      try {
        await save(m);
        setSaved("이 브라우저에 저장했습니다.");
      } catch (e) {
        setError(errorMessage(e) || "저장 실패");
      } finally {
        setBusy(false);
      }
    },
  };
}
function Feedback({ state }: { state: ReturnType<typeof useSave> }) {
  return (
    <>
      {state.error && (
        <NoticeBox error>{state.error} 입력은 유지됩니다.</NoticeBox>
      )}
      {state.saved && <NoticeBox>{state.saved}</NoticeBox>}
    </>
  );
}
export function Admin() {
  const { data, user } = useData();
  const [tab, setTab] = useState("courses"),
    [selected, setSelected] = useState("");
  if (user?.role !== "admin")
    return (
      <div className="container">
        <Restricted title="관리자 전용 공간입니다." />
      </div>
    );
  const tabs = [
    ["courses", "수업 콘텐츠"],
    ["cohorts", "운영 회차"],
    ["materials", "교육 자료"],
    ["members", "수강 권한"],
    ["questions", "질문·답변"],
    ["settings", "공지·설정"],
  ];
  return (
    <div className="container admin">
      <PageHead
        eyebrow="CLASS STUDIO / ADMIN"
        title="배움이 이어지는 공간을 만드세요."
      >
        수업과 자료를 추가하고, 수강생의 다음 시작을 함께 준비하세요.
      </PageHead>
      <div className="admin-summary">
        <div>
          <span>수업</span>
          <strong>
            {data.courses.length}
            <small>개</small>
          </strong>
        </div>
        <div>
          <span>게시된 자료</span>
          <strong>
            {data.materials.filter((m) => m.status === "published").length}
            <small>개</small>
          </strong>
        </div>
        <div>
          <span>미답변 질문</span>
          <strong>
            {
              data.questions.filter(
                (q) => !q.draft && !q.deleted_at && !q.answer,
              ).length
            }
            <small>개</small>
          </strong>
        </div>
        <div>
          <span>승인 대기</span>
          <strong>
            {data.enrollments.filter((e) => e.status === "pending").length}
            <small>명</small>
          </strong>
        </div>
      </div>
      <div className="tabs admin-tabs">
        {tabs.map(([k, v]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => {
              setTab(k);
              setSelected("");
            }}
          >
            {v}
          </button>
        ))}
      </div>
      {["courses", "cohorts", "materials"].includes(tab) && (
        <div className="admin-split">
          <aside className="admin-list">
            <button
              className="button full-width"
              onClick={() => setSelected(`new-${crypto.randomUUID()}`)}
            >
              <Plus size={17} />
              {tab === "courses"
                ? "새 수업"
                : tab === "cohorts"
                  ? "새 운영 회차"
                  : "새 자료"}
            </button>
            {(tab === "courses"
              ? data.courses
              : tab === "cohorts"
                ? data.cohorts
                : data.materials
            ).map((item) => (
              <button
                key={item.id}
                className={`admin-item ${selected === item.id ? "active" : ""}`}
                onClick={() => setSelected(item.id)}
              >
                <span>{"title" in item ? item.title : item.name}</span>
                <Status>{publishLabels[item.status]}</Status>
              </button>
            ))}
            <p className="small muted">
              임시 저장·비공개 콘텐츠는 일반 역할에게 표시되지 않습니다.
            </p>
          </aside>
          <div>
            {!selected ? (
              <Empty title="편집할 항목을 선택해 주세요.">
                새 항목을 추가하거나 왼쪽 목록에서 선택할 수 있습니다.
              </Empty>
            ) : tab === "courses" ? (
              <CourseEditor key={selected} id={selected} />
            ) : tab === "cohorts" ? (
              <CohortEditor key={selected} id={selected} />
            ) : (
              <MaterialEditor key={selected} id={selected} />
            )}
          </div>
        </div>
      )}
      {tab === "members" && <Members />}
      {tab === "questions" && <Instructor />}
      {tab === "settings" && <Settings />}
    </div>
  );
}
function CourseEditor({ id }: { id: string }) {
  const { data } = useData();
  const old = data.courses.find((c) => c.id === id);
  const [form, setForm] = useState<Course>(
    old || {
      id: id.replace("new-", ""),
      title: "",
      summary: "",
      body: "",
      preparation: "",
      topics: [],
      status: "draft",
      order: data.courses.length + 1,
      updated_at: new Date().toISOString(),
    },
  );
  const [topicText, setTopicText] = useState(form.topics.join("\n")),
    [preview, setPreview] = useState(false);
  const state = useSave();
  const change = (key: string, v: unknown) =>
    setForm((f) => ({ ...f, [key]: v }));
  return (
    <form
      className="form-panel"
      onSubmit={(e) => {
        e.preventDefault();
        state.run({
          kind: "course",
          value: {
            ...form,
            topics: topicText
              .split("\n")
              .map((t) => t.trim())
              .filter(Boolean),
          },
        });
      }}
    >
      <div className="editor-heading">
        <h2>{old ? "수업 수정" : "새 수업 등록"}</h2>
        <button
          type="button"
          className="text-button"
          onClick={() => setPreview(!preview)}
        >
          <Eye size={15} />
          미리보기
        </button>
      </div>
      <Field label="수업 제목 *">
        <input
          required
          maxLength={200}
          value={form.title}
          onChange={(e) => change("title", e.target.value)}
          placeholder="#2. 두 번째 수업 제목"
        />
      </Field>
      <Field label="짧은 소개">
        <textarea
          maxLength={600}
          rows={2}
          value={form.summary}
          onChange={(e) => change("summary", e.target.value)}
        />
      </Field>
      <Field label="목록에 표시할 일정">
        <input
          maxLength={100}
          value={form.schedule_label || ""}
          onChange={(e) => change("schedule_label", e.target.value)}
          placeholder="예: 11/1(토) am11:00 · 비워두면 미정"
        />
      </Field>
      <Field label="수업 소개 본문">
        <textarea
          rows={6}
          maxLength={30000}
          value={form.body}
          onChange={(e) => change("body", e.target.value)}
          placeholder="실제 강의 내용을 입력해 주세요."
        />
      </Field>
      <Field
        label="목차"
        hint="한 줄에 하나의 주제를 입력해 주세요. 번호는 자동으로 표시됩니다."
      >
        <textarea
          rows={7}
          value={topicText}
          onChange={(e) => setTopicText(e.target.value)}
        />
      </Field>
      <Field label="사전 준비사항">
        <textarea
          rows={3}
          maxLength={5000}
          value={form.preparation}
          onChange={(e) => change("preparation", e.target.value)}
        />
      </Field>
      <div className="form-grid">
        <Field label="표시 순서">
          <input
            type="number"
            min={1}
            max={999}
            required
            value={form.order}
            onChange={(e) => change("order", Number(e.target.value))}
          />
        </Field>
        <PublishSelect
          value={form.status}
          onChange={(v) => change("status", v)}
        />
      </div>
      {preview && (
        <div className="preview-panel">
          <span className="eyebrow">저장 전 미리보기</span>
          <h2>{form.title || "수업 제목"}</h2>
          <p>{form.summary}</p>
          <p className="prose">{form.body}</p>
          <ol start={0}>
            {topicText
              .split("\n")
              .filter(Boolean)
              .map((t, i) => (
                <li key={i}>{t}</li>
              ))}
          </ol>
          <h3>사전 준비</h3>
          <p className="prose">
            {form.preparation || "등록된 준비사항이 없습니다."}
          </p>
        </div>
      )}
      <Feedback state={state} />
      <div className="actions">
        <button disabled={state.busy} className="button">
          <Save size={16} />
          {state.busy
            ? "저장 중…"
            : `${publishLabels[form.status]} 상태로 저장`}
        </button>
        {data.courses.some((c) => c.id === form.id) && (
          <Link className="text-link" href={`/classes/${form.id}`}>
            수업 페이지 확인 ↗
          </Link>
        )}
      </div>
    </form>
  );
}
function CohortEditor({ id }: { id: string }) {
  const { data } = useData();
  const old = data.cohorts.find((c) => c.id === id);
  const [form, setForm] = useState<Cohort>(
    old || {
      id: id.replace("new-", ""),
      course_id: data.courses[0]?.id || "",
      name: "",
      starts_at: null,
      instructor_id: null,
      status: "draft",
    },
  );
  const state = useSave();
  const change = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form
      className="form-panel"
      onSubmit={(e) => {
        e.preventDefault();
        state.run({ kind: "cohort", value: form });
      }}
    >
      <h2>운영 회차 설정</h2>
      <p className="muted">하나의 수업을 여러 기수에서 운영할 수 있습니다.</p>
      <Field label="공통 수업 콘텐츠 *">
        <select
          required
          value={form.course_id}
          onChange={(e) => change("course_id", e.target.value)}
        >
          <option value="">수업 선택</option>
          {data.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="기수 또는 운영 회차 이름 *">
        <input
          required
          maxLength={100}
          value={form.name}
          onChange={(e) => change("name", e.target.value)}
          placeholder="실제 운영 회차 이름을 입력해 주세요"
        />
      </Field>
      <Field
        label="수업 일정"
        hint="선택 항목 · 사용하는 기기의 현지 시간으로 입력합니다. 비워두면 일정 미정으로 표시됩니다."
      >
        <input
          type="datetime-local"
          defaultValue={
            old?.starts_at
              ? new Date(
                  new Date(old.starts_at).getTime() -
                    new Date(old.starts_at).getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16)
              : ""
          }
          onChange={(e) =>
            change(
              "starts_at",
              e.target.value ? new Date(e.target.value).toISOString() : null,
            )
          }
        />
      </Field>
      <Field label="담당 강사">
        <select
          value={form.instructor_id || ""}
          onChange={(e) => change("instructor_id", e.target.value || null)}
        >
          <option value="">아직 지정하지 않음</option>
          {data.profiles
            .filter((p) => p.role === "instructor" || p.role === "admin")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </Field>
      <PublishSelect
        value={form.status}
        onChange={(v) => change("status", v)}
      />
      <Feedback state={state} />
      <button className="button" disabled={state.busy}>
        {state.busy ? "저장 중…" : "운영 회차 저장"}
      </button>
    </form>
  );
}
function MaterialEditor({ id }: { id: string }) {
  const { data, upload } = useData();
  const old = data.materials.find((m) => m.id === id);
  const [form, setForm] = useState<Material>(
    old || {
      id: id.replace("new-", ""),
      course_id: data.courses[0]?.id || "",
      title: "",
      type: "note",
      body: "",
      url: "",
      file_path: "",
      file_name: "",
      visibility: "enrolled",
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  );
  const [preview, setPreview] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const state = useSave();
  const change = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <form
      className="form-panel"
      onSubmit={(e) => {
        e.preventDefault();
        state.run({ kind: "material", value: form });
      }}
    >
      <div className="editor-heading">
        <h2>교육 자료 편집</h2>
        <button
          type="button"
          className="text-button"
          onClick={() => setPreview(!preview)}
        >
          <Eye size={15} />
          미리보기
        </button>
      </div>
      <Field label="자료 제목 *">
        <input
          required
          maxLength={200}
          value={form.title}
          onChange={(e) => change("title", e.target.value)}
        />
      </Field>
      <Field label="연결된 수업 *">
        <select
          required
          value={form.course_id}
          onChange={(e) => change("course_id", e.target.value)}
        >
          <option value="">수업 선택</option>
          {data.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-grid">
        <Field label="자료 유형">
          <select
            value={form.type}
            onChange={(e) => change("type", e.target.value)}
          >
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="열람 범위">
          <select
            value={form.visibility}
            onChange={(e) => change("visibility", e.target.value)}
          >
            <option value="enrolled">해당 수업 수강생</option>
            <option value="public">누구나 · 공개 자료</option>
          </select>
        </Field>
      </div>
      <Field label="자료 본문">
        <textarea
          rows={8}
          maxLength={30000}
          value={form.body}
          onChange={(e) => change("body", e.target.value)}
        />
      </Field>
      <Field
        label="참고 또는 영상 링크"
        hint="외부 영상의 접근 권한은 원본 서비스에서 별도로 설정해야 합니다."
      >
        <input
          type="url"
          value={form.url}
          onChange={(e) => change("url", e.target.value)}
          placeholder="https://..."
        />
      </Field>
      <Field
        label="첨부파일"
        hint="데모 파일은 이 브라우저에만 저장됩니다. 파일당 최대 2MB, 전체 저장 공간은 브라우저 한도에 따릅니다."
      >
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.xlsx"
          disabled={uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            setError("");
            try {
              const result = await upload(file, form.course_id);
              setForm((f) => ({
                ...f,
                file_path: result.path,
                file_name: result.name,
              }));
            } catch (err) {
              setError(errorMessage(err) || "파일 저장 실패");
            } finally {
              setUploading(false);
            }
          }}
        />
      </Field>
      {form.file_name && (
        <p className="small">
          <Upload size={14} /> {form.file_name}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() =>
              setForm((f) => ({ ...f, file_path: "", file_name: "" }))
            }
          >
            첨부 해제
          </button>
        </p>
      )}
      {error && <NoticeBox error>{error}</NoticeBox>}
      <PublishSelect
        value={form.status}
        onChange={(v) => change("status", v)}
      />
      {preview && (
        <div className="preview-panel">
          <span className="eyebrow">
            저장 전 미리보기 · {typeLabels[form.type]}
          </span>
          <h2>{form.title || "자료 제목"}</h2>
          <p className="prose">{form.body || "본문 없음"}</p>
          {form.url && <p>{form.url}</p>}
          {form.file_name && <p>첨부 · {form.file_name}</p>}
        </div>
      )}
      <Feedback state={state} />
      <div className="actions">
        <button disabled={state.busy || uploading} className="button">
          {state.busy
            ? "저장 중…"
            : uploading
              ? "파일 저장 중…"
              : `${publishLabels[form.status]} 상태로 저장`}
        </button>
        {data.materials.some((m) => m.id === form.id) && (
          <Link className="text-link" href={`/resources/${form.id}`}>
            자료 페이지 확인 ↗
          </Link>
        )}
      </div>
    </form>
  );
}
function Members() {
  const { data, choose } = useData();
  const state = useSave();
  const [profile, setProfile] = useState(
      data.profiles.find((p) => p.role === "student")?.id || "",
    ),
    [cohort, setCohort] = useState(data.cohorts[0]?.id || ""),
    [status, setStatus] = useState<"pending" | "active" | "revoked">("active");
  return (
    <>
      <NoticeBox>
        데모 회원의 수강 권한을 관리하는 화면입니다. 실제 이메일 초대·회원가입은
        외부 인증 연결 이후 제공됩니다.
      </NoticeBox>
      <form
        className="form-panel"
        onSubmit={(e) => {
          e.preventDefault();
          state.run({
            kind: "enrollment",
            value: {
              id: crypto.randomUUID(),
              user_id: profile,
              cohort_id: cohort,
              status,
            },
          });
        }}
      >
        <h2>수강 등록 및 승인</h2>
        <div className="form-grid">
          <Field label="수강생">
            <select
              required
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
            >
              {data.profiles
                .filter((p) => p.role === "student")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="운영 회차">
            <select
              required
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
            >
              <option value="">운영 회차 선택</option>
              {data.cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="수강 권한">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="active">승인 · 수강 가능</option>
            <option value="pending">승인 대기</option>
            <option value="revoked">권한 회수</option>
          </select>
        </Field>
        <Feedback state={state} />
        <button className="button" disabled={state.busy}>
          {state.busy ? "저장 중…" : "수강 권한 저장"}
        </button>
      </form>
      <div className="table-wrap">
        <table>
          <caption>현재 수강 등록 목록</caption>
          <thead>
            <tr>
              <th>수강생</th>
              <th>운영 회차</th>
              <th>상태</th>
              <th>변경</th>
            </tr>
          </thead>
          <tbody>
            {data.enrollments.map((e) => (
              <tr key={e.id}>
                <td>{data.profiles.find((p) => p.id === e.user_id)?.name}</td>
                <td>{data.cohorts.find((c) => c.id === e.cohort_id)?.name}</td>
                <td>
                  <Status>
                    {
                      {
                        pending: "승인 대기",
                        active: "수강 가능",
                        revoked: "권한 회수",
                      }[e.status]
                    }
                  </Status>
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => {
                      setProfile(e.user_id);
                      setCohort(e.cohort_id);
                      setStatus(e.status);
                    }}
                  >
                    편집
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        관리자 역할은 회원 승인과 별개입니다. 실제 역할 부여와 인증은 후속
        버전에서 연결합니다.
      </p>
    </>
  );
}
function Settings() {
  const { data } = useData();
  const [form, setForm] = useState(data.settings),
    [selected, setSelected] = useState("");
  const state = useSave();
  return (
    <div className="admin-split">
      <div>
        <form
          className="form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            state.run({ kind: "settings", value: form });
          }}
        >
          <h2>사이트 기본 설정</h2>
          <Field label="브랜드명 *">
            <input
              required
              maxLength={60}
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
          </Field>
          <Field label="문의 버튼 이름">
            <input
              maxLength={100}
              value={form.contact_label}
              onChange={(e) =>
                setForm({ ...form, contact_label: e.target.value })
              }
            />
          </Field>
          <Field
            label="문의 채널 주소"
            hint="실제 운영하는 문의 채널이 있을 때만 입력해 주세요."
          >
            <input
              type="url"
              value={form.contact_url}
              onChange={(e) =>
                setForm({ ...form, contact_url: e.target.value })
              }
            />
          </Field>
          <Feedback state={state} />
          <button className="button" disabled={state.busy}>
            {state.busy ? "저장 중…" : "기본 설정 저장"}
          </button>
        </form>
      </div>
      <div>
        <div className="toolbar">
          <h2>공지사항</h2>
          <button
            className="button secondary"
            onClick={() => setSelected(`new-${crypto.randomUUID()}`)}
          >
            <Plus size={16} />새 공지
          </button>
        </div>
        {data.notices.map((n) => (
          <button
            className="admin-item"
            key={n.id}
            onClick={() => setSelected(n.id)}
          >
            {n.title}
            <Status>{publishLabels[n.status]}</Status>
          </button>
        ))}
        {selected ? (
          <NoticeEditor key={selected} id={selected} />
        ) : (
          <Empty title="공지를 선택하거나 추가해 주세요." />
        )}
      </div>
    </div>
  );
}
function NoticeEditor({ id }: { id: string }) {
  const { data } = useData();
  const [form, setForm] = useState<Notice>(
    data.notices.find((n) => n.id === id) || {
      id: id.replace("new-", ""),
      title: "",
      body: "",
      status: "draft",
      updated_at: new Date().toISOString(),
    },
  );
  const state = useSave();
  const [preview, setPreview] = useState(false);
  return (
    <form
      className="form-panel"
      onSubmit={(e) => {
        e.preventDefault();
        state.run({ kind: "notice", value: form });
      }}
    >
      <Field label="공지 제목">
        <input
          required
          maxLength={200}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </Field>
      <Field label="공지 내용">
        <textarea
          rows={6}
          maxLength={10000}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
      </Field>
      <PublishSelect
        value={form.status}
        onChange={(v) => setForm({ ...form, status: v })}
      />
      <button
        type="button"
        className="text-button"
        onClick={() => setPreview(!preview)}
      >
        미리보기
      </button>
      {preview && (
        <div className="preview-panel">
          <h3>{form.title}</h3>
          <p className="prose">{form.body}</p>
        </div>
      )}
      <Feedback state={state} />
      <button className="button" disabled={state.busy}>
        {state.busy ? "저장 중…" : "공지 저장"}
      </button>
    </form>
  );
}
