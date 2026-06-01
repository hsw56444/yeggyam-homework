// 화면 모드 (auto/mobile/pc) — URL ?view=mobile|pc 파라미터 또는 헤더 토글로 강제
import { useEffect, useState, useCallback } from "react";

function readModeFromUrl() {
  const p = new URLSearchParams(window.location.search).get("view");
  if (p === "mobile" || p === "pc") return p;
  return "auto";
}

export function useViewMode() {
  const [mode, setMode] = useState(readModeFromUrl);

  // body 클래스 동기화 → CSS에서 강제 폭 적용
  useEffect(() => {
    document.body.classList.remove("force-mobile", "force-pc");
    if (mode === "mobile") document.body.classList.add("force-mobile");
    else if (mode === "pc") document.body.classList.add("force-pc");
  }, [mode]);

  // popstate (브라우저 뒤로/앞으로) 시 URL 재반영
  useEffect(() => {
    const handler = () => setMode(readModeFromUrl());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const setModeAndUrl = useCallback((next) => {
    const url = new URL(window.location.href);
    if (next === "auto") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.replaceState({}, "", url);
    setMode(next);
  }, []);

  return [mode, setModeAndUrl];
}
