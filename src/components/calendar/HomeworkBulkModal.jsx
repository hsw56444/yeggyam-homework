import { useState, useEffect, useMemo } from "react";
import {
  bulkSaveDayHomework,
  classDatesInRange,
  monthRange,
  DEFAULT_CLASS_NAME,
  DEFAULT_HOMEWORK_NAME,
} from "../../lib/homework";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const STATUS = {
  done:    { label: "끝남",   icon: "✓", btn: "bg-emerald-600" },
  partial: { label: "진행중", icon: "◐", btn: "bg-amber-500" },
  none:    { label: "안 함",  icon: "✕", btn: "bg-red-600" },
};

// props: studentId, studentName, classObj (반 정보 — schedule 포함), month (YYYY-MM), onClose, onAfterSave
export default function HomeworkBulkModal({
  studentId, studentName, classObj, month, onClose, onAfterSave,
}) {
  const [cmEnabled, setCmEnabled] = useState(false);
  const [cmName, setCmName] = useState(DEFAULT_CLASS_NAME);
  const [cmMemo, setCmMemo] = useState("");
  const [cmStatus, setCmStatus] = useState(null);

  const [hmEnabled, setHmEnabled] = useState(false);
  const [hmName, setHmName] = useState(DEFAULT_HOMEWORK_NAME);
  const [hmMemo, setHmMemo] = useState("");
  const [hmStatus, setHmStatus] = useState(null);

  const [excluded, setExcluded] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const touchCm = () => setCmEnabled(true);
  const touchHm = () => setHmEnabled(true);

  // 학생의 반 시간표 × 선택된 월 → 후보 날짜
  const candidateDates = useMemo(() => {
    if (!classObj?.schedule) return [];
    const { start, end } = monthRange(month);
    return classDatesInRange(classObj.schedule, start, end);
  }, [classObj, month]);

  useEffect(() => {
    setExcluded(new Set());
  }, [classObj, month]);

  const targetDates = useMemo(
    () => candidateDates.filter((d) => !excluded.has(d)),
    [candidateDates, excluded]
  );

  const toggleDate = (d) => {
    const next = new Set(excluded);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setExcluded(next);
  };

  const submit = async () => {
    if (!cmEnabled && !hmEnabled) {
      return alert("포함할 항목을 1개 이상 체크하세요.\n(수업교재 또는 숙제교재)");
    }
    if (targetDates.length === 0) {
      return alert("적용 날짜가 없습니다.");
    }
    if (!confirm(`"${studentName}" 학생의 ${month} 시간표 중 ${targetDates.length}일에 동일한 숙제를 등록합니다.\n같은 날짜에 기존 숙제가 있으면 덮어쓰여집니다.\n계속할까요?`)) {
      return;
    }
    setSaving(true);
    try {
      await bulkSaveDayHomework(
        studentId,
        targetDates,
        cmEnabled ? { name: cmName, memo: cmMemo, status: cmStatus } : null,
        hmEnabled ? { name: hmName, memo: hmMemo, status: hmStatus } : null,
      );
      alert(`✅ ${targetDates.length}일에 저장 완료`);
      onAfterSave && onAfterSave();
      onClose();
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="text-base font-bold truncate">
              + 숙제 일괄 등록 — {studentName}
            </div>
            <div className="text-sm text-slate-600">
              {month} / {classObj?.name || "(반 없음)"}
              {classObj?.schedule && (
                <span className="text-xs text-slate-400 ml-1">
                  · {classObj.schedule.sort((a,b)=>a-b).map(d => DAYS[d]).join("·")}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-600 leading-none">
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {/* 시간표 자동 매핑 후보 */}
          <section>
            <div className="text-xs font-bold text-slate-700 mb-1.5">
              📅 적용 날짜 ({targetDates.length}일 / 후보 {candidateDates.length}일)
            </div>
            <div className="text-[11px] text-slate-500 mb-2 leading-relaxed">
              이 학생의 반 시간표에 맞춰 자동 추출. 칩 클릭으로 개별 제외/포함.
            </div>
            <div className="flex flex-wrap gap-1">
              {candidateDates.length === 0 ? (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 w-full">
                  ⚠️ 이 학생의 반 시간표가 없거나 이 월에 수업일이 없습니다.
                </div>
              ) : (
                candidateDates.map((d) => {
                  const ex = excluded.has(d);
                  const wd = new Date(d + "T00:00:00").getDay();
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDate(d)}
                      className={`text-xs px-2 py-1 rounded border ${
                        ex
                          ? "bg-slate-100 text-slate-400 border-slate-200 line-through"
                          : wd === 0
                          ? "bg-red-50 text-red-700 border-red-200"
                          : wd === 6
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      }`}
                    >
                      {parseInt(d.slice(8), 10)}({DAYS[wd]})
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* 수업교재 */}
          <MaterialSection
            kind="class"
            enabled={cmEnabled}
            onToggle={setCmEnabled}
            name={cmName}
            onNameChange={(v) => { setCmName(v); touchCm(); }}
            memo={cmMemo}
            onMemoChange={(v) => { setCmMemo(v); touchCm(); }}
            status={cmStatus}
            onStatusChange={(v) => { setCmStatus(v); if (v) touchCm(); }}
          />

          {/* 숙제교재 */}
          <MaterialSection
            kind="homework"
            enabled={hmEnabled}
            onToggle={setHmEnabled}
            name={hmName}
            onNameChange={(v) => { setHmName(v); touchHm(); }}
            memo={hmMemo}
            onMemoChange={(v) => { setHmMemo(v); touchHm(); }}
            status={hmStatus}
            onStatusChange={(v) => { setHmStatus(v); if (v) touchHm(); }}
          />

          <div className="text-[11px] text-slate-500 text-center leading-relaxed">
            💡 체크된 항목만 등록됩니다. 입력칸을 수정하거나 상태를 누르면 자동으로 체크됩니다.
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200">
          <button
            onClick={submit}
            disabled={saving || targetDates.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded font-bold text-sm"
          >
            {saving ? "저장 중..." : `💾 일괄 저장 (${targetDates.length}일)`}
          </button>
        </div>
      </div>
    </div>
  );
}

// 수업교재/숙제교재 공용 섹션 (DayModal 과 동일 패턴, '초기 상태' 라벨)
function MaterialSection({
  kind, enabled, onToggle,
  name, onNameChange,
  memo, onMemoChange,
  status, onStatusChange,
}) {
  const isClass = kind === "class";
  const icon = isClass ? "📘" : "📝";
  const label = isClass ? "수업교재" : "숙제교재";

  const sectionCls = enabled
    ? (isClass
        ? "border-indigo-300 bg-indigo-50/60"
        : "border-amber-300 bg-amber-50/60")
    : "border-slate-200 bg-slate-50";
  const titleCls = enabled
    ? (isClass ? "text-indigo-700" : "text-amber-700")
    : "text-slate-400";
  const innerCls = enabled ? "" : "opacity-60";
  const focusBorder = isClass
    ? "focus:border-indigo-500"
    : "focus:border-amber-500";

  return (
    <section className={`border rounded-lg p-3 transition-colors ${sectionCls}`}>
      <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className={`w-4 h-4 ${isClass ? "accent-indigo-600" : "accent-amber-600"}`}
        />
        <span className={`text-xs font-bold ${titleCls}`}>
          {icon} {label}
        </span>
        <span className="text-[10px] text-slate-400">
          {enabled ? "— 일괄 등록됨" : "— 미포함 (체크하거나 입력 시 포함)"}
        </span>
      </label>

      <div className={innerCls}>
        <input
          type="text"
          className={`w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-2 focus:outline-none ${focusBorder}`}
          placeholder="교재 이름"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <input
          type="text"
          className={`w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-3 focus:outline-none ${focusBorder}`}
          placeholder="간단한 메모 (선택)"
          value={memo}
          onChange={(e) => onMemoChange(e.target.value)}
        />
        <div className="text-[11px] text-slate-500 mb-1.5">초기 상태 (선택)</div>
        <div className="grid grid-cols-3 gap-1.5">
          {["done", "partial", "none"].map((st) => {
            const s = STATUS[st];
            const active = status === st;
            return (
              <button
                key={st}
                onClick={() => onStatusChange(active ? null : st)}
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
      </div>
    </section>
  );
}
