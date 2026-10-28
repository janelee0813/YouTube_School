"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { Snapshot, Profile } from "@/lib/types";
import { seed } from "@/lib/seed";
import { loadDemo, persistDemo } from "@/lib/demo";
import { visibleSnapshot } from "@/lib/permissions";
import type { Mutation } from "@/lib/validation";
import { errorMessage } from "@/lib/validation";
type Context = {
  data: Snapshot;
  user: Profile | null;
  ready: boolean;
  error: string;
  demo: true;
  refresh: () => Promise<void>;
  choose: (id: string) => void;
  logout: () => Promise<void>;
  save: (m: Mutation) => Promise<void>;
  upload: (
    file: File,
    courseId: string,
  ) => Promise<{ path: string; name: string }>;
  openFile: (id: string) => Promise<void>;
  failNext: () => void;
};
const C = createContext<Context>(null!);
export const useData = () => useContext(C);
export function Provider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot>(seed()),
    [user, setUser] = useState<Profile | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const fail = useRef(false);
  async function refresh() {
    try {
      const full = loadDemo();
      const selected =
        full.profiles.find(
          (p) => p.id === localStorage.getItem("yc-demo-role"),
        ) || null;
      setUser(selected);
      setData(visibleSnapshot(full, selected));
      setError("");
    } catch (e) {
      setError(errorMessage(e) || "브라우저 저장소를 읽지 못했습니다.");
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    refresh();
    const storage = () => {
      refresh();
    };
    window.addEventListener("storage", storage);
    return () => window.removeEventListener("storage", storage);
  }, []);
  function choose(id: string) {
    try {
      localStorage.setItem("yc-demo-role", id);
      refresh();
    } catch {
      setError(
        "브라우저 저장소 사용이 차단되어 있습니다. 저장소를 허용해 주세요.",
      );
    }
  }
  async function logout() {
    localStorage.removeItem("yc-demo-role");
    await refresh();
  }
  async function save(m: Mutation) {
    if (fail.current) {
      fail.current = false;
      throw new Error(
        "저장 실패 테스트입니다. 입력 내용은 유지됩니다. 다시 저장해 주세요.",
      );
    }
    const write = () => {
      persistDemo(localStorage, localStorage.getItem("yc-demo-role"), m);
    };
    if (navigator.locks) await navigator.locks.request("yc-demo-write", write);
    else write();
    await refresh();
  }
  async function upload(file: File, courseId: string) {
    if (user?.role !== "admin")
      throw new Error("관리자 역할에서 이용해 주세요.");
    if (file.size > 2 * 1024 * 1024)
      throw new Error("브라우저 데모 파일은 2MB 이하로 올려 주세요.");
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (
      !ext ||
      !["pdf", "png", "jpg", "jpeg", "webp", "txt", "docx", "xlsx"].includes(
        ext,
      )
    )
      throw new Error("지원하지 않는 파일 형식입니다.");
    const path = `${courseId}/${crypto.randomUUID()}.${ext}`;
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    localStorage.setItem(`yc-file-${path}`, raw);
    return { path, name: file.name };
  }
  async function openFile(id: string) {
    const material = data.materials.find((m) => m.id === id);
    if (!material?.file_path)
      throw new Error("파일이 없거나 현재 역할로 열람할 수 없습니다.");
    const url = localStorage.getItem(`yc-file-${material.file_path}`);
    if (!url) throw new Error("이 브라우저에 파일이 없습니다.");
    const a = document.createElement("a");
    a.href = url;
    a.download = material.file_name;
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
  }
  return (
    <C.Provider
      value={{
        data,
        user,
        ready,
        error,
        demo: true,
        refresh,
        choose,
        logout,
        save,
        upload,
        openFile,
        failNext: () => {
          fail.current = true;
        },
      }}
    >
      {children}
    </C.Provider>
  );
}
