import { useState, useMemo } from "react";
import { COL, homeworkMonthCol } from "../firebase";
import { useCollection } from "../hooks/useCollection";
import { normalizeDoc, bulkDeleteDayHomework } from "../lib/homework";
import HomeworkDayModal from "../components/calendar/HomeworkDayModal";
import HomeworkBulkModal from "../components/calendar/HomeworkBulkModal";
import HomeworkCopyModal from "../components/calendar/HomeworkCopyModal";

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
  const [bulkOpen, setBulkOpen] = useState(false);          // 일괄 등록
  const [copyOpen, setCopyOpen] = useState(false);          // 복사

  // 선택 모드 (다중 삭제)
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const openDayModal = (date) => {
    if (!studentId) return alert("먼저 학생을 선택하세요.");
    setDayModalDate(date);
  };

  const openBulk = () => {
    if (!studentId) return alert("먼저 학생을 선택하세요.");
    if (!cls) return alert("이 학생에게 반(시간표)이 없습니다. 반·시간표를 먼저 설정하세요.");
    setBulkOpen(true);
  };

  const openCopy = () => {
    if (students.length < 2) return alert("학생이 최소 2명 이상 있어야 복사할 수 있습니다.");
    setCopyOpen(true);
  };

  const enterSelectMode = () => {
    if (!studentId) return alert("먼저 학생을 선택하세요.");
    setSelectMode(true);
    setSelected(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (date) => {
    if (!byDate.has(date)) return; // 숙제 없는 칸은 선택 불가
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const selectAllInMonth = () => {
    const allDates = Array.from(byDate.keys());
    setSelected(new Set(allDates));
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}일의 숙제를 삭제할까요?\n(되돌릴 수 없습니다)`)) return;
    setDeleting(true);
    try {
      await bulkDeleteDayHomework(studentId, Array.from(selected));
      alert(`✅ ${selected.size}일 삭제 완료`);
      exitSelectMode();
    } catch (e) {
      alert("삭제 실패: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  // 셀 클릭 핸들러 — 선택 모드 / 일반 모드 분기
  const onCellClick = (date) => {
    if (selectMode) toggleSelect(date);
    else openDayModal(date);
  };

  return (
    <div className="space-y-3 pb-20">
      {/* 헤더: 학생 선택 + 월 네비 + 액션 */}
      <div className="bg-white rounded-lg p-3 shadow-sm space-y-2">
        {students.length === 0 ? (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠️ 학생이 없습니다. 먼저 <strong>👥 학생</strong> 페이지에서 추가하세요.
          </div>
        ) : (
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-indigo-500"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              exitSelectMode();
            }}
            disabled={selectMode}
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
        </div>

        {/* 액션 줄: 등록 / 복사 / 선택삭제 */}
        <div className="flex items-center gap-1">
          <button
            onClick={openBulk}
            disabled={!studentId || selectMode}
            className="flex-1 px-2 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded font-bold"
          >
            + 숙제등록
          </button>
          <button
            onClick={openCopy}
            disabled={selectMode || students.length < 2}
            className="flex-1 px-2 py-1.5 text-xs bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 text-indigo-700 border border-indigo-200 rounded font-bold"
          >
            📋 복사
          </button>
          {selectMode ? (
            <button
              onClick={exitSelectMode}
              className="flex-1 px-2 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold"
            >
              ✕ 선택해제
            </button>
          ) : (
            <button
              onClick={enterSelectMode}
              disabled={!studentId}
              className="flex-1 px-2 py-1.5 text-xs bg-white hover:bg-red-50 disabled:bg-slate-100 disabled:text-slate-400 text-red-700 border border-red-200 rounded font-bold"
            >
              🗑 선택삭제
            </button>
          )}
        </div>

        {studentId && cls && !selectMode && (
          <div className="text-[11px] text-slate-500">
            시간표: {(cls.schedule || []).sort((a,b)=>a-b).map((d) => DAYS[d]).join(" · ")}{" "}
            <span className="text-slate-400">— 일괄 등록 시 이 요일에 자동 적용</span>
          </div>
        )}
        {selectMode && (
          <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5 flex items-center justify-between gap-2">
            <span>🗑 삭제 모드 — 숙제 있는 칸을 눌러 선택</span>
            <button
              onClick={selectAllInMonth}
              className="text-[11px] text-indigo-600 hover:underline"
            >
              전체선택
            </button>
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
                  onClick={() => onCellClick(c.date)}
                  selectMode={selectMode}
                  selected={selected.has(c.date)}
                />
              )
            )}
          </div>

          {/* 안내 */}
          {!selectMode && (
            <div className="bg-white rounded-lg p-2 shadow-sm text-center text-[11px] text-slate-500 leading-relaxed">
              💡 빈 칸 / 숙제 칸을 눌러 직접 등록·수정 · <strong>+ 숙제등록</strong> 으로 일괄
              · <strong>📋 복사</strong> 로 학생 간 복사 · <strong>🗑 선택삭제</strong> 로 여러개 삭제
            </div>
          )}
        </>
      )}

      {/* 선택삭제 하단 액션바 */}
      {selectMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg p-3 z-40">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <div className="flex-1 text-sm font-bold text-slate-700">
              {selected.size === 0 ? "선택 없음" : `${selected.size}일 선택됨`}
            </div>
            <button
              onClick={exitSelectMode}
              className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded font-bold"
            >
              취소
            </button>
            <button
              onClick={deleteSelected}
              disabled={selected.size === 0 || deleting}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded font-bold"
            >
              {deleting ? "삭제 중..." : `🗑 ${selected.size}일 삭제`}
            </button>
          </div>
        </div>
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
      {copyOpen && (
        <HomeworkCopyModal
          students={students}
          classes={classes}
          defaultStudentId={studentId}
          defaultMonth={month}
          onClose={() => setCopyOpen(false)}
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

// 상태별 칩 색상
const STATUS_CHIP = {
  done: "bg-emerald-100 text-emerald-800 border-emerald-300",
  partial: "bg-amber-100 text-amber-800 border-amber-300",
  none: "bg-red-100 text-red-800 border-red-300",
};
// 상태 없을 때 기본 색상 (종류별)
const KIND_DEFAULT_CHIP = {
  class: "bg-indigo-100 text-indigo-800 border-indigo-300",
  homework: "bg-amber-50 text-amber-700 border-amber-200",
};

function aggregateCellBg(statuses) {
  const arr = statuses.filter(Boolean);
  if (arr.length === 0) return "bg-white";
  if (arr.every((s) => s === "done")) return "bg-emerald-50";
  if (arr.includes("none")) return "bg-red-50";
  if (arr.includes("partial")) return "bg-amber-50";
  return "bg-white";
}

function DayCell({ cell, doc, onClick, selectMode, selected }) {
  const cm = doc?.classMaterial;
  const hm = doc?.homeworkMaterial;
  const cmName = cm?.name?.trim();
  const hmName = hm?.name?.trim();
  const cmStatus = cm?.status;
  const hmStatus = hm?.status;
  const hasAny = !!(cmName || hmName);
  const cellBg = aggregateCellBg([cmStatus, hmStatus]);
  const dayColor =
    cell.weekday === 0 ? "text-red-600" : cell.weekday === 6 ? "text-blue-600" : "text-slate-700";

  const chipClass = (status, kind) =>
    (status && STATUS_CHIP[status]) || KIND_DEFAULT_CHIP[kind];

  // 선택 모드 + 숙제 없는 칸 → disabled 회색
  const disabled = selectMode && !hasAny;
  const baseHover = selectMode ? "" : "hover:bg-indigo-50";
  const ringClass = selected
    ? "ring-2 ring-red-500 ring-inset bg-red-50"
    : cell.isToday
    ? "ring-2 ring-indigo-500 ring-inset"
    : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${selected ? "bg-red-50" : cellBg} min-h-[90px] p-1 text-left transition flex flex-col gap-0.5 ${ringClass} ${baseHover} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`text-xs font-bold ${dayColor}`}>
          {cell.day}
          {cell.isToday && (
            <span className="ml-1 text-[9px] bg-indigo-600 text-white px-1 rounded">오늘</span>
          )}
        </div>
        {selectMode && hasAny && (
          <span
            className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] leading-none ${
              selected
                ? "bg-red-600 border-red-600 text-white"
                : "bg-white border-slate-300"
            }`}
          >
            {selected ? "✓" : ""}
          </span>
        )}
      </div>
      <div className="space-y-0.5 flex-1">
        {cmName && (
          <div
            className={`text-[10px] px-1 py-0.5 rounded border truncate font-medium ${chipClass(cmStatus, "class")}`}
            title={`수업: ${cmName}${cm.memo ? " — " + cm.memo : ""}`}
          >
            📘 {cmName} {cmStatus && STATUS_ICON[cmStatus]}
          </div>
        )}
        {hmName && (
          <div
            className={`text-[10px] px-1 py-0.5 rounded border truncate font-medium ${chipClass(hmStatus, "homework")}`}
            title={`숙제: ${hmName}${hm.memo ? " — " + hm.memo : ""}`}
          >
            📝 {hmName} {hmStatus && STATUS_ICON[hmStatus]}
          </div>
        )}
      </div>
    </button>
  );
}
