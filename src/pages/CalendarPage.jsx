import { useState, useMemo } from "react";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { COL, homeworkMonthCol } from "../firebase";
import { useCollection } from "../hooks/useCollection";
import { dayKey } from "../lib/homework";

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

// 상태별 색상 / 라벨
const STATUS = {
  done:    { label: "끝남",     icon: "✓",  cellBg: "bg-emerald-50", chip: "bg-emerald-100 text-emerald-800 border-emerald-300", btn: "bg-emerald-600" },
  partial: { label: "진행중",   icon: "◐",  cellBg: "bg-amber-50",   chip: "bg-amber-100 text-amber-800 border-amber-300",       btn: "bg-amber-500" },
  none:    { label: "안 함",    icon: "✕",  cellBg: "bg-red-50",     chip: "bg-red-100 text-red-800 border-red-300",             btn: "bg-red-600" },
  pending: { label: "미입력",   icon: "·",  cellBg: "bg-white",      chip: "bg-slate-100 text-slate-600 border-slate-300",       btn: "bg-slate-500" },
};

export default function CalendarPage() {
  const [students, loadingS] = useCollection(COL.students, "name");
  const [classes] = useCollection(COL.classes, "name");
  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(thisMonth());

  // 월별 컬렉션 ref — useMemo로 안정화
  const monthColRef = useMemo(() => homeworkMonthCol(month), [month]);
  const [docs] = useCollection(monthColRef);

  // 이 학생의 숙제만
  const byDate = useMemo(() => {
    const m = new Map();
    docs
      .filter((d) => d.studentId === studentId)
      .forEach((d) => m.set(d.date, d));
    return m;
  }, [docs, studentId]);

  // 달력 셀 (7열 × N행)
  const cells = useMemo(() => buildCalendarCells(month), [month]);

  const [modalDate, setModalDate] = useState(null);
  const modalDoc = modalDate ? byDate.get(modalDate) : null;

  const setItemStatus = async (date, itemIndex, status) => {
    const dayDoc = byDate.get(date);
    if (!dayDoc) return;
    const newItems = dayDoc.items.map((it, i) =>
      i === itemIndex ? { ...it, status: status } : it
    );
    const ref = doc(monthColRef, dayKey(studentId, date));
    try {
      await updateDoc(ref, { items: newItems, updatedAt: serverTimestamp() });
    } catch (e) {
      alert("상태 저장 실패: " + e.message);
    }
  };

  const deleteDay = async (date) => {
    if (!confirm(`${date} 의 숙제 전체를 삭제할까요?`)) return;
    try {
      await deleteDoc(doc(monthColRef, dayKey(studentId, date)));
      setModalDate(null);
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  };

  const student = students.find((s) => s.id === studentId);
  const cls = student ? classes.find((c) => c.id === student.classId) : null;

  return (
    <div className="space-y-3">
      {/* 학생 선택 + 월 네비 */}
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
            className="px-3 py-1.5 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-bold"
          >
            오늘
          </button>
        </div>
      </div>

      {/* 학생 없이 빈 상태 */}
      {!studentId ? (
        <div className="bg-white rounded-lg p-8 shadow-sm text-center text-slate-400 text-sm">
          학생을 선택하면 이번 달 숙제 일정이 표시됩니다.
        </div>
      ) : (
        <>
          {/* 요일 헤더 */}
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
                <div key={i} className="bg-slate-50 min-h-[88px]" />
              ) : (
                <DayCell
                  key={i}
                  cell={c}
                  doc={byDate.get(c.date)}
                  onClick={() => setModalDate(c.date)}
                />
              )
            )}
          </div>

          {/* 상태 범례 */}
          <div className="bg-white rounded-lg p-2 shadow-sm flex flex-wrap gap-3 justify-center text-xs">
            {["done", "partial", "none", "pending"].map((k) => {
              const s = STATUS[k];
              return (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded border ${s.chip}`} />
                  <span className="text-slate-600">
                    {s.icon} {s.label}
                  </span>
                </span>
              );
            })}
          </div>
        </>
      )}

      {/* 일자 모달 — 상태 입력 */}
      {modalDate && (
        <DayModal
          date={modalDate}
          doc={modalDoc}
          studentName={student?.name}
          className={cls?.name}
          onClose={() => setModalDate(null)}
          onSetStatus={(idx, st) => setItemStatus(modalDate, idx, st)}
          onDeleteDay={() => deleteDay(modalDate)}
        />
      )}
    </div>
  );
}

/* ===== 달력 셀 빌더: 월의 첫째날 요일에 따라 앞을 빈 칸으로 채움 ===== */
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
  // 마지막 줄 빈 칸 채움 (7의 배수)
  while (cells.length % 7 !== 0) cells.push({ blank: true });
  return cells;
}

/* ===== 일자 셀 ===== */
function DayCell({ cell, doc, onClick }) {
  const items = doc?.items || [];
  // 셀 전체 상태: 모두 done → emerald 배경, 모두 none → red, 혼합 → white
  const cellBg = (() => {
    if (items.length === 0) return "bg-white";
    const sts = items.map((i) => i.status);
    if (sts.every((s) => s === "done")) return STATUS.done.cellBg;
    if (sts.every((s) => s === "none")) return STATUS.none.cellBg;
    if (sts.some((s) => s === "partial")) return STATUS.partial.cellBg;
    return "bg-white";
  })();
  const dayColor =
    cell.weekday === 0 ? "text-red-600" : cell.weekday === 6 ? "text-blue-600" : "text-slate-700";

  return (
    <button
      onClick={onClick}
      className={`${cellBg} min-h-[88px] p-1 text-left hover:bg-indigo-50 transition flex flex-col gap-0.5 ${
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
        {items.slice(0, 2).map((it, i) => {
          const s = STATUS[it.status || "pending"];
          return (
            <div
              key={i}
              className={`text-[10px] px-1 py-0.5 rounded border truncate font-medium ${s.chip}`}
              title={`${it.textbookName || ""} ${it.detail || ""}`}
            >
              {s.icon} {it.textbookName || "(교재)"}
            </div>
          );
        })}
        {items.length > 2 && (
          <div className="text-[9px] text-slate-500 pl-1">+{items.length - 2}</div>
        )}
      </div>
    </button>
  );
}

/* ===== 일자 모달 ===== */
function DayModal({ date, doc, studentName, className, onClose, onSetStatus, onDeleteDay }) {
  const items = doc?.items || [];
  const wd = new Date(date + "T00:00:00").getDay();
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="text-base font-bold truncate">
              {studentName || "(학생)"} {className && <span className="text-xs font-normal text-slate-500">/ {className}</span>}
            </div>
            <div className="text-sm text-slate-600">
              {date} ({DAYS[wd]})
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-slate-600 leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {items.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              이 날 등록된 숙제가 없습니다.
            </div>
          ) : (
            items.map((it, i) => {
              const cur = it.status || "pending";
              return (
                <div key={i} className="border border-slate-200 rounded-lg p-3">
                  <div className="font-bold text-sm text-slate-800">
                    {it.textbookName || "(교재 미상)"}
                  </div>
                  {it.detail && (
                    <div className="text-xs text-slate-500 mt-0.5">{it.detail}</div>
                  )}
                  <div className="grid grid-cols-3 gap-1.5 mt-3">
                    {["done", "partial", "none"].map((st) => {
                      const s = STATUS[st];
                      const active = cur === st;
                      return (
                        <button
                          key={st}
                          onClick={() => onSetStatus(i, active ? null : st)}
                          className={`py-2 rounded text-xs font-bold border-2 transition ${
                            active
                              ? `${s.btn} text-white border-transparent`
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          {s.icon} {s.label}
                        </button>
                      );
                    })}
                  </div>
                  {cur !== "pending" && (
                    <button
                      onClick={() => onSetStatus(i, null)}
                      className="w-full mt-1.5 py-1 text-[11px] text-slate-400 hover:text-slate-600"
                    >
                      상태 지우기
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-200">
            <button
              onClick={onDeleteDay}
              className="w-full py-2 text-xs text-red-600 hover:bg-red-50 rounded"
            >
              🗑 이 날 숙제 전체 삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
