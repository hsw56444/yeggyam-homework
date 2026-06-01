import { useState, useMemo } from "react";
import { COL, homeworkMonthCol } from "../firebase";
import { useCollection } from "../hooks/useCollection";
import { normalizeDoc, hasHomework } from "../lib/homework";
import HomeworkDayModal from "../components/calendar/HomeworkDayModal";
import HomeworkBulkModal from "../components/calendar/HomeworkBulkModal";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}
function thisMonth() {
  return todayStr().slice(0, 7);
}
function shiftMonth(yyyymm, delta) {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 상태 → 셀 배경
const STATUS_CELL_BG = {
  done: "bg-emerald-50",
  partial: "bg-amber-50",
  none: "bg-red-50",
};
const STATUS_ICON = { done: "✓", partial: "◐", none: "✕" };

export default function CalendarPage() {
  const [students] = useCollection(COL.students, "name");
  const [classes] = useCollection(COL.classes, "name");
  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(thisMonth());
  const monthColRef = useMemo(() => homeworkMonthCol(month), [month]);
  const [rawDocs] = useCollection(monthColRef);

  const student = students.find((s) => s.id === studentId);
  const cls = student ? classes.find((c) => c.id === student.classId) : null;

  // 이 학생의 doc만 + 정규화 (레거시 items 호환)
  const byDate = useMemo(() => {
    const m = new Map();
    rawDocs
      .filter((d) => d.studentId === studentId)
      .forEach((d) => m.set(d.date, normalizeDoc(d)));
    return m;
  }, [rawDocs, studentId]);

  const cells = useMemo(() => buildCalendarCells(month), [month]);

  // 모달 상태
  const [dayModalDate, setDayModalDate] = useState(null);   // 단발
  const [bulkOpen, setBulkOpen] = useState(false);          // 일괄

  const openDayModal = (date) => {
    if (!studentId) return alert("먼저 학생을 선택하세요.");
    setDayModalDate(date);
  };

  const openBulk = () => {
    if (!studentId) return alert("먼저 학생을 선택하세요.");
    if (!cls) return alert("이 학생에게 반(시간표)이 없습니다. 반·시간표를 먼저 설정하세요.");
    setBulkOpen(true);
  };

  return (
    <div className="space-y-3">
      {/* 헤더: 학생 선택 + 월 네비 + 숙제등록 */}
      <div className="bg-white rounded-lg p-3 shadow-sm space-y-2">
        {students.length === 0 ? (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠️ 학생이 없습니다. 먼저 <strong>👥 학생</strong> 페이지에서 추가하세요.
          </div>
        ) : (
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-indigo-500"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">— 학생 선택 —</option>
            {students.map((s) => {
              const c = classes.find((x) => x.id === s.classId);
              return (
                <option key={s.id} value={s.id}>
                  {s.name} {c ? `(${c.name})` : ""}
                </option>
              );
            })}
          </select>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded"
          >
            ◀
          </button>
          <div className="flex-1 text-center font-bold text-sm">
            {month.replace("-", "년 ")}월
          </div>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded"
          >
            ▶
          </button>
          <button
            onClick={() => setMonth(thisMonth())}
            className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded"
          >
            오늘
          </button>
          <button
            onClick={openBulk}
            disabled={!studentId}
            className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded font-bold"
          >
            + 숙제등록
          </button>
        </div>
        {studentId && cls && (
          <div className="text-[11px] text-slate-500">
            시간표: {(cls.schedule || []).sort((a,b)=>a-b).map((d) => DAYS[d]).join(" · ")}{" "}
            <span className="text-slate-400">— 일괄 등록 시 이 요일에 자동 적용</span>
          </div>
        )}
      </div>

      {/* 빈 상태 */}
      {!studentId ? (
        <div className="bg-white rounded-lg p-8 shadow-sm text-center text-slate-400 text-sm">
          학생을 선택하면 이번 달 숙제 일정이 표시됩니다.
        </div>
      ) : (
        <>
          {/* 달력 */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded overflow-hidden">
            {DAYS.map((d, i) => (
              <div
                key={i}
                className={`bg-white text-center text-xs font-bold py-1.5 ${
                  i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-slate-700"
                }`}
              >
                {d}
              </div>
            ))}
            {cells.map((c, i) =>
              c.blank ? (
                <div key={i} className="bg-slate-50 min-h-[90px]" />
              ) : (
                <DayCell
                  key={i}
                  cell={c}
                  doc={byDate.get(c.date)}
                  onClick={() => openDayModal(c.date)}
                />
              )
            )}
          </div>

          {/* 안내 */}
          <div className="bg-white rounded-lg p-2 shadow-sm text-center text-[11px] text-slate-500 leading-relaxed">
            💡 빈 칸 / 숙제 칸을 눌러 직접 등록·수정 · 헤더의 <strong>+ 숙제등록</strong> 으로
            시간표대로 일괄 등록
          </div>
        </>
      )}

      {/* 모달 */}
      {dayModalDate && (
        <HomeworkDayModal
          studentId={studentId}
          studentName={student?.name}
          className={cls?.name}
          date={dayModalDate}
          initialDoc={byDate.get(dayModalDate) || null}
          onClose={() => setDayModalDate(null)}
        />
      )}
      {bulkOpen && (
        <HomeworkBulkModal
          studentId={studentId}
          studentName={student?.name}
          classObj={cls}
          month={month}
          onClose={() => setBulkOpen(false)}
        />
      )}
    </div>
  );
}

function buildCalendarCells(yyyymm) {
  const [y, m] = yyyymm.split("-").map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const lastDay = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ blank: true });
  for (let d = 1; d <= lastDay; d++) {
    const date = `${yyyymm}-${String(d).padStart(2, "0")}`;
    const wd = new Date(y, m - 1, d).getDay();
    cells.push({ date, day: d, weekday: wd, isToday: date === todayStr() });
  }
  while (cells.length % 7 !== 0) cells.push({ blank: true });
  return cells;
}

function DayCell({ cell, doc, onClick }) {
  const cmName = doc?.classMaterial?.name?.trim();
  const hmName = doc?.homeworkMaterial?.name?.trim();
  const hmStatus = doc?.homeworkMaterial?.status;
  const cellBg = hmStatus && STATUS_CELL_BG[hmStatus] ? STATUS_CELL_BG[hmStatus] : "bg-white";
  const dayColor =
    cell.weekday === 0 ? "text-red-600" : cell.weekday === 6 ? "text-blue-600" : "text-slate-700";

  return (
    <button
      onClick={onClick}
      className={`${cellBg} min-h-[90px] p-1 text-left hover:bg-indigo-50 transition flex flex-col gap-0.5 ${
        cell.isToday ? "ring-2 ring-indigo-500 ring-inset" : ""
      }`}
    >
      <div className={`text-xs font-bold ${dayColor}`}>
        {cell.day}
        {cell.isToday && (
          <span className="ml-1 text-[9px] bg-indigo-600 text-white px-1 rounded">오늘</span>
        )}
      </div>
      <div className="space-y-0.5 flex-1">
        {cmName && (
          <div
            className="text-[10px] px-1 py-0.5 rounded border truncate font-medium bg-indigo-100 text-indigo-800 border-indigo-300"
            title={`수업: ${cmName}${doc.classMaterial.memo ? " — " + doc.classMaterial.memo : ""}`}
          >
            📘 {cmName}
          </div>
        )}
        {hmName && (
          <div
            className={`text-[10px] px-1 py-0.5 rounded border truncate font-medium ${
              hmStatus === "done"
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : hmStatus === "partial"
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : hmStatus === "none"
                ? "bg-red-100 text-red-800 border-red-300"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
            title={`숙제: ${hmName}${doc.homeworkMaterial.memo ? " — " + doc.homeworkMaterial.memo : ""}`}
          >
            📝 {hmName} {hmStatus && STATUS_ICON[hmStatus]}
          </div>
        )}
      </div>
    </button>
  );
}
