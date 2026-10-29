"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  Play,
  ArrowUpRight,
  Lock,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { Provider, useData } from "./provider";
import {
  PageHead,
  ButtonLink,
  Empty,
  Status,
  NoticeBox,
  Restricted,
} from "./ui";
import { enrolled } from "@/lib/permissions";
import { typeLabels } from "@/lib/types";
import {
  QuestionEditor,
  Records,
  QuestionDetail,
  Instructor,
} from "./questions";
import { Login } from "./login";
import { Admin } from "./admin";
export default function App() {
  return (
    <Provider>
      <Shell />
    </Provider>
  );
}
function Shell() {
  const { data, user, ready, error, refresh, logout } = useData();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const parts = path.split("/").filter(Boolean);
  let page: React.ReactNode;
  if (parts.length === 0) page = <Classes />;
  else if (parts[0] === "classes")
    page = parts[1] ? <ClassDetail id={parts[1]} /> : <Classes />;
  else if (parts[0] === "resources")
    page = parts[1] ? <ResourceDetail id={parts[1]} /> : <Resources />;
  else if (parts[0] === "questions")
    page =
      parts[1] && parts[1] !== "new" ? (
        <QuestionDetail id={parts[1]} />
      ) : (
        <QuestionEditor key={path} />
      );
  else if (parts[0] === "records") page = <Records />;
  else if (parts[0] === "login") page = <Login />;
  else if (parts[0] === "admin") page = <Admin />;
  else if (parts[0] === "instructor") page = <Instructor />;
  else
    page = (
      <Empty
        title="페이지를 찾을 수 없습니다."
        action={<ButtonLink href="/">홈으로</ButtonLink>}
      />
    );
  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <header className="site-header">
        <Link
          href="/"
          className="brand"
          aria-label={`${data.settings.brand} 홈`}
        >
          <span className="brand-mark">
            <Play size={15} fill="currentColor" />
          </span>
          <span>
            {data.settings.brand}
            <small>유튜브 도전을 위한 교육 품앗이.</small>
          </span>
        </Link>
        <button
          className="menu-toggle icon-button"
          aria-label={menu ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav
          aria-label="주 메뉴"
          className={menu ? "open" : ""}
          onClick={() => setMenu(false)}
        >
          <a href="https://www.daangn.com/kr/group/ihx78drbjvyp/">
            유튜브 품앗이 모임
          </a>
          {[
            ["/resources", "교육 자료"],
            ["/questions/new", "질문·고민"],
          ].map(([href, label]) => (
            <Link
              className={
                (
                  href === "/"
                    ? path === "/" || path.startsWith("/classes")
                    : path.startsWith(href.split("/").slice(0, 2).join("/"))
                )
                  ? "active"
                  : ""
              }
              key={href}
              data-menu={href === "/questions/new" ? "questions" : undefined}
              aria-current={
                (
                  href === "/"
                    ? path === "/" || path.startsWith("/classes")
                    : path.startsWith(href.split("/").slice(0, 2).join("/"))
                )
                  ? "page"
                  : undefined
              }
              href={href}
            >
              {label}
            </Link>
          ))}
          {user && (
            <Link
              href="/records"
              className={path === "/records" ? "active" : ""}
            >
              내 기록
            </Link>
          )}
          {user && (user.role === "instructor" || user.role === "admin") && (
            <Link href={user.role === "admin" ? "/admin" : "/instructor"}>
              {user.role === "admin" ? "관리자" : "강사실"}
            </Link>
          )}
          {user ? (
            <button
              className="nav-login"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
            >
              로그아웃
            </button>
          ) : (
            <Link className="nav-login" href="/login">
              로그인 <ArrowUpRight size={13} />
            </Link>
          )}
        </nav>
      </header>
      <main id="main">
        {error ? (
          <div className="container">
            <NoticeBox error>
              {error}{" "}
              <button className="text-button" onClick={refresh}>
                다시 연결
              </button>
            </NoticeBox>
          </div>
        ) : !ready ? (
          <div className="container loading" role="status">
            공간을 준비하고 있어요…
          </div>
        ) : (
          page
        )}
      </main>
      <footer className="container footer">
        <div>
          <Link className="footer-brand" href="/">
            {data.settings.brand}
            <span>↗</span>
          </Link>
          <p>
            생각에서 첫 영상으로.
            <br />
            당신만의 속도로, 오래 이어가세요.
          </p>
        </div>
        <div>
          <p>LEARN. MAKE. KEEP GOING.</p>
          {data.settings.contact_url ? (
            <a
              className="text-link"
              href={data.settings.contact_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.settings.contact_label || "문의하기"} ↗
            </a>
          ) : (
            <a
              className="text-link"
              href="https://www.instagram.com/jane__moment/"
              target="_blank"
              rel="noopener noreferrer"
            >
              @jane__moment ↗
            </a>
          )}
        </div>
      </footer>
    </>
  );
}
function Classes() {
  const { data } = useData();
  return (
    <div className="container">
      <PageHead eyebrow="YOUTUBE CLASS" title="나만의 방향을 찾는 시간">
        알고 있는 내용을 함께 공유하고, 같이 성장해 보아요.
      </PageHead>
      <div className="class-list">
        {data.courses
          .filter((c) => c.status === "published")
          .sort((a, b) => a.order - b.order)
          .map((c, i) => (
            <Link
              className="featured-course"
              key={c.id}
              href={`/classes/${c.id}`}
            >
              <div className="course-number">
                {String(i + 1).padStart(2, "0")}
                <span>CLASS</span>
              </div>
              <div className="course-info">
                <div className="tags">
                  <Status>{c.topics.length}개의 주제</Status>
                  <span className="course-schedule" aria-label={`수업 일정: ${c.schedule_label || "미정"}`}>
                    {c.schedule_label || "미정"}
                  </span>
                </div>
                <h2>{c.title}</h2>
                <p>{c.summary}</p>
              </div>
              <span className="round-arrow">
                <ArrowUpRight />
              </span>
            </Link>
          ))}
      </div>
      {!data.courses.some((c) => c.status === "published") && (
        <Empty title="준비 중인 수업입니다." />
      )}
    </div>
  );
}
function ClassDetail({ id }: { id: string }) {
  const { data, user, save } = useData();
  const c = data.courses.find((c) => c.id === id),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false);
  if (!c)
    return (
      <div className="container">
        <Empty title="수업을 찾을 수 없습니다." />
      </div>
    );
  const cohorts = data.cohorts.filter(
    (co) => co.course_id === id && co.status === "published",
  );
  const materials = data.materials.filter(
    (m) => m.course_id === id && m.status === "published",
  );
  return (
    <div className="container">
      <Link className="back-link" href="/">
        ← 수업 안내
      </Link>
      <PageHead eyebrow="CLASS / OVERVIEW" title={c.title}>
        {c.summary}
      </PageHead>
      {c.status !== "published" && (
        <NoticeBox>
          관리자 미리보기 · 일반 수강생에게는 보이지 않습니다.
        </NoticeBox>
      )}
      <div className="detail-layout">
        <div>
          <section className="detail-section">
            <span className="eyebrow">01 / INTRODUCTION</span>
            <h2>수업 소개</h2>
            <p className="prose">
              {c.body ||
                "강의 본문은 준비 중입니다. 아래 목차에서 수업의 흐름을 먼저 확인해 주세요."}
            </p>
          </section>
          <section className="detail-section">
            <span className="eyebrow">02 / CURRICULUM</span>
            <h2>함께 살펴볼 이야기</h2>
            <div className="curriculum">
              {c.topics.map((t, i) => (
                <details key={i}>
                  <summary>
                    <span className="topic-num">
                      {String(
                        c.topics[0]?.startsWith("Preface") ? i : i + 1,
                      ).padStart(2, "0")}
                    </span>
                    <span>{t}</span>
                    <span className="plus">+</span>
                  </summary>
                  <p>이 주제의 세부 내용은 수업에서 함께 다룹니다.</p>
                </details>
              ))}
            </div>
          </section>
          <section className="detail-section">
            <span className="eyebrow">03 / GET READY</span>
            <h2>수업 전 준비</h2>
            <p className="prose">
              {c.preparation || "별도 준비사항이 아직 등록되지 않았습니다."}
            </p>
            <Link className="text-link" href={`/questions/new?course=${id}`}>
              미리 질문 남기기 <ArrowRight size={16} />
            </Link>
          </section>
          <section className="detail-section">
            <span className="eyebrow">04 / RESOURCES</span>
            <h2>관련 교육 자료</h2>
            {materials.length ? (
              materials.map((m) => <ResourceCard key={m.id} material={m} />)
            ) : (
              <Empty title="아직 열람할 수 있는 자료가 없어요.">
                게시된 자료는 수강 권한에 따라 이곳에 표시됩니다.
              </Empty>
            )}
          </section>
        </div>
        <aside className="class-aside">
          <span className="eyebrow">YOUR NEXT STEP</span>
          <h3>수업을 준비해 볼까요?</h3>
          {cohorts.map((co) => {
            const e = data.enrollments.find(
              (e) => e.user_id === user?.id && e.cohort_id === co.id,
            );
            return (
              <div className="cohort" key={co.id}>
                <strong>{co.name}</strong>
                <p>
                  {co.starts_at
                    ? new Date(co.starts_at).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })
                    : "일정 미정 · 추후 안내"}
                </p>
                {enrolled(data, user, co.id) ? (
                  <ButtonLink href={`/questions/new?cohort=${co.id}`}>
                    이 수업에 질문하기
                  </ButtonLink>
                ) : user ? (
                  <button
                    className="button secondary"
                    disabled={busy || e?.status === "pending"}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await save({
                          kind: "request-enrollment",
                          cohort_id: co.id,
                        });
                        setMsg(
                          "수강 신청을 접수했습니다. 운영자 승인 후 질문과 자료를 이용할 수 있어요.",
                        );
                      } catch (err) {
                        setMsg(
                          err instanceof Error
                            ? err.message
                            : "신청에 실패했습니다.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {e?.status === "pending"
                      ? "수강 승인 대기 중"
                      : e?.status === "revoked"
                        ? "수강 권한 재검토 요청"
                        : "수강 승인 요청"}
                  </button>
                ) : (
                  <ButtonLink
                    href={`/login?next=${encodeURIComponent(`/classes/${id}`)}`}
                  >
                    로그인하고 준비하기
                  </ButtonLink>
                )}
              </div>
            );
          })}
          {!cohorts.length && <p>운영 회차와 일정이 등록되면 안내됩니다.</p>}
          {msg && <NoticeBox>{msg}</NoticeBox>}
          <div className="privacy-note">
            <Lock size={14} />
            질문은 비공개로 전달됩니다.
          </div>
        </aside>
      </div>
    </div>
  );
}
function ResourceCard({
  material: m,
}: {
  material: import("@/lib/types").Material;
}) {
  return (
    <Link href={`/resources/${m.id}`} className="resource-card">
      <div className="resource-top">
        <FileText size={21} />
        <span className="small">{typeLabels[m.type]}</span>
        <ArrowUpRight size={18} />
      </div>
      <h3>{m.title}</h3>
      <p>{m.body ? m.body.slice(0, 65) : "수업과 함께 살펴보는 교육 자료"}</p>
      <div className="resource-meta">
        {m.visibility === "enrolled" ? (
          <>
            <Lock size={12} /> 수강생 전용
          </>
        ) : (
          "공개 자료"
        )}
        <span>{new Date(m.updated_at).toLocaleDateString("ko-KR")}</span>
      </div>
    </Link>
  );
}
function Resources() {
  const { data, user } = useData();
  const [search, setSearch] = useState(""),
    [course, setCourse] = useState(""),
    [type, setType] = useState("");
  const materials = data.materials.filter(
    (m) =>
      m.status === "published" &&
      (!course || m.course_id === course) &&
      (!type || m.type === type) &&
      m.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="container">
      <PageHead
        eyebrow="02 / RESOURCE LIBRARY"
        title="언제든, 다시 꺼내보세요."
      >
        강의 노트부터 실습지까지. 나의 속도로 배움을 이어가세요.
      </PageHead>
      <div className="filters">
        <label className="search-field">
          <span className="sr-only">자료 제목 검색</span>
          <input
            placeholder="자료 제목 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">수업별 필터</span>
          <select value={course} onChange={(e) => setCourse(e.target.value)}>
            <option value="">모든 수업</option>
            {data.courses
              .filter((c) => c.status === "published")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span className="sr-only">자료 유형 필터</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">모든 자료 유형</option>
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="small muted">열람 가능한 자료 {materials.length}개</p>
      {materials.length ? (
        <div className="card-grid">
          {materials.map((m) => (
            <ResourceCard key={m.id} material={m} />
          ))}
        </div>
      ) : (
        <Empty
          title={
            search || course || type
              ? "조건에 맞는 자료가 없어요."
              : "교육 자료를 준비하고 있어요."
          }
        >
          {search || course || type
            ? "검색어나 필터를 바꿔 다시 찾아보세요."
            : "자료가 게시되면 수강 권한에 따라 표시됩니다."}
          {!user && (
            <>
              <br />
              <Link href="/login?next=/resources" className="text-link">
                로그인하고 내 자료 확인하기 ↗
              </Link>
            </>
          )}
        </Empty>
      )}
      <div className="resource-note">
        <Lock size={16} />
        <p>
          수강생 전용 자료는 해당 수업의 수강 승인을 받은 회원만 열람할 수
          있습니다.
        </p>
      </div>
    </div>
  );
}
function ResourceDetail({ id }: { id: string }) {
  const { data, user, openFile } = useData();
  const [error, setError] = useState("");
  const m = data.materials.find((m) => m.id === id);
  if (!m)
    return (
      <div className="container">
        <Restricted
          title="자료가 없거나 열람 권한이 없습니다."
          href={user ? "/" : `/login?next=/resources/${id}`}
        />
      </div>
    );
  return (
    <div className="container narrow">
      <Link href="/resources" className="back-link">
        ← 교육 자료
      </Link>
      <PageHead eyebrow={typeLabels[m.type]} title={m.title} />
      {m.status !== "published" && (
        <NoticeBox>관리자 미리보기 · 아직 게시되지 않은 자료입니다.</NoticeBox>
      )}
      <p className="small muted">
        {data.courses.find((c) => c.id === m.course_id)?.title} ·{" "}
        {new Date(m.updated_at).toLocaleDateString("ko-KR")}
      </p>
      <div className="prose paper">
        {m.body || "첨부파일 또는 아래 링크에서 자료를 확인해 주세요."}
      </div>
      <div className="actions">
        {m.file_path && (
          <button
            className="button"
            onClick={async () => {
              try {
                await openFile(m.id);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "파일을 열지 못했습니다.",
                );
              }
            }}
          >
            첨부파일 열기 · {m.file_name} <ArrowUpRight size={16} />
          </button>
        )}
        {m.url && (
          <a
            className="button secondary"
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {m.type === "video" ? "영상 열기" : "참고 링크 열기"}
            <ArrowUpRight size={16} />
          </a>
        )}
      </div>
      {error && <NoticeBox error>{error}</NoticeBox>}
      {m.url && (
        <p className="small muted">
          외부 링크의 접근 권한은 원본 서비스 설정에 따릅니다. 이 사이트의
          로그인으로 원본 영상까지 보호되지는 않습니다.
        </p>
      )}
    </div>
  );
}
