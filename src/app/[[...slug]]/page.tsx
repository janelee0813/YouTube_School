import { Suspense } from "react";
import App from "@/components/app";
export default function Page() {
  return (
    <Suspense fallback={<p>공간을 준비하고 있어요…</p>}>
      <App />
    </Suspense>
  );
}
