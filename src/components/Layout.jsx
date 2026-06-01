import { NavLink, Outlet } from "react-router-dom";
import { useViewMode } from "../hooks/useViewMode";

const navItems = [
  { to: "/", label: "📅 달력 (숙제등록)", end: true },
  { to: "/students", label: "👥 학생" },
  { to: "/classes", label: "🏫 반·시간표" },
];

export default function Layout() {
  const [mode, setMode] = useViewMode();

  return (
    <div id="app-root" className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-slate-800 text-white px-4 py-3 flex items-center justify-between shadow">
        <h1 className="text-base font-bold">📒 예그얌 숙제관리</h1>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setMode("mobile")}
            className={`px-2 py-1 rounded ${mode === "mobile" ? "bg-white text-slate-800 font-bold" : "bg-slate-700 hover:bg-slate-600"}`}
            title="모바일 뷰로 강제"
          >📱</button>
          <button
            onClick={() => setMode("pc")}
            className={`px-2 py-1 rounded ${mode === "pc" ? "bg-white text-slate-800 font-bold" : "bg-slate-700 hover:bg-slate-600"}`}
            title="PC 뷰로 강제"
          >💻</button>
          <button
            onClick={() => setMode("auto")}
            className={`px-2 py-1 rounded ${mode === "auto" ? "bg-white text-slate-800 font-bold" : "bg-slate-700 hover:bg-slate-600"}`}
            title="화면 크기에 맞춰 자동"
          >Auto</button>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 px-2 py-2 flex gap-1 overflow-x-auto sticky top-[52px] z-10">
        {navItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `whitespace-nowrap px-3 py-1.5 rounded-full text-sm border ${
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`
            }
          >{it.label}</NavLink>
        ))}
      </nav>

      <main className="p-3">
        <Outlet />
      </main>
    </div>
  );
}
