import Link from "next/link";
import { ArrowUpRight, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
export function SectionTitle({
  index,
  eyebrow,
  title,
  description,
  action,
}: {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">
          {index} / {eyebrow}
        </span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">—</span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function PageHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`button ${secondary ? "secondary" : ""}`} href={href}>
      {children}
      <ArrowUpRight size={17} />
    </Link>
  );
}
export function NoticeBox({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`notice-box ${error ? "error" : ""}`}
    >
      {children}
    </div>
  );
}
export function Status({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Restricted({
  title = "수강 권한이 필요한 공간입니다.",
  children,
  href = "/login",
}: {
  title?: string;
  children?: ReactNode;
  href?: string;
}) {
  return (
    <div className="restricted">
      <Lock size={24} />
      <h2>{title}</h2>
      <p>{children || "로그인 후 해당 수업의 수강 승인을 받아 주세요."}</p>
      <ButtonLink href={href}>
        {href.startsWith("/login") ? "로그인하기" : "수업 안내 보기"}
      </ButtonLink>
    </div>
  );
}
export function Saved({ children }: { children: ReactNode }) {
  return (
    <span className="saved">
      <CheckCircle2 size={15} />
      {children}
    </span>
  );
}
export { ArrowRight, ArrowUpRight };
