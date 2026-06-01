import { useState, useEffect } from "react";
import {
  saveDayHomework,
  deleteDayHomework,
  DEFAULT_CLASS_NAME,
  DEFAULT_HOMEWORK_NAME,
} from "../../lib/homework";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const STATUS = {
  done:    { label: "끝남",   icon: "✓", btn: "bg-emerald-600" },
  partial: { label: "진행중", icon: "◐", btn: "bg-amber-500" },
  none:    { label: "안 함",  icon: "✕", btn: "bg-red-600" },
};

// props:
//   studentId, studentName, className, date, initialDoc, onClose, onAfterSave
export default function HomeworkDayModal({
  studentId, studentName, className,
  date, initialDoc, onClose, onAfterSave,
}) {
  // 체크박스 — 기본 OFF. 수정 모드(initialDoc)에서 해당 섹션이 있으면 ON.
  const [cmEnabled, setCmEnabled] = useState(!!initialDoc?.classMaterial);
  const [cmName, setCmName] = useState(initialDoc?.classMaterial?.name || DEFAULT_CLASS_NAME);
  const [cmMemo, setCmMemo] = useState(initialDoc?.classMaterial?.memo || "");
  const [cmStatus, setCmStatus] = useState(initialDoc?.classMaterial?.status || null);

  const [hmEnabled, setHmEnabled] = useState(!!initialDoc?.homeworkMaterial);
  const [hmName, setHmName] = useState(initialDoc?.homeworkMaterial?.name || DEFAULT_HOMEWORK_NAME);
  const [hmMemo, setHmMemo] = useState(initialDoc?.homeworkMaterial?.memo || "");
  const [hmStatus, setHmStatus] = useState(initialDoc?.homeworkMaterial?.status || null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCmEnabled(!!initialDoc?.classMaterial);
    setCmName(initialDoc?.classMaterial?.name || DEFAULT_CLASS_NAME);
    setCmMemo(initialDoc?.classMaterial?.memo || "");
    setCmStatus(initialDoc?.classMaterial?.status || null);
    setHmEnabled(!!initialDoc?.homeworkMaterial);
    setHmName(initialDoc?.homeworkMaterial?.name || DEFAULT_HOMEWORK_NAME);
    setHmMemo(initialDoc?.homeworkMaterial?.memo || "");
    setHmStatus(initialDoc?.homeworkMaterial?.status || null);
  }, [initialDoc]);

  // 입력 시 자동 체크 ON
  const touchCm = () => setCmEnabled(true);
  const touchHm = () => setHmEnabled(true);

  const wd = new Date(date + "T00:00:00").getDay();
  const isEditing = !!initialDoc;

  const submit = async () => {
    if (!cmEnabled && !hmEnabled) {
      return alert("포함할 항목을 1개 이상 체크하세요.\n(수업교재 또는 숙제교재)");
    }
    setSaving(true);
    try {
      await saveDayHomework(
        studentId,
        date,
        cmEnabled ? { name: cmName, memo: cmMemo, status: cmStatus } : null,
        hmEnabled ? { name: hmName, memo: hmMemo, status: hmStatus } : null,
      );
      onAfterSave && onAfterSave();
      onClose();
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`${date} 의 숙제를 삭제할까요?`)) return;
    setSaving(true);
    try {
      await deleteDayHomework(studentId, date);
      onClose();
    } catch (e) {
      alert("삭제 실패: " + e.message);
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
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="text-base font-bold truncate">
              {studentName || "(학생)"}{" "}
              {className && (
                <span className="text-xs font-normal text-slate-500">/ {className}</span>
              )}
            </div>
            <div className="text-sm text-slate-600">
              {date} ({DAYS[wd]}){" "}
              <span className="text-xs text-slate-400">
                — {isEditing ? "숙제 수정" : "숙제 등록"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-600 leading-none">
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1">
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
            namePlaceholder="교재 이름"
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
            namePlaceholder="교재 이름"
          />

          <div className="text-[11px] text-slate-500 text-center leading-relaxed">
            💡 체크된 항목만 등록됩니다. 입력칸을 수정하거나 상태를 누르면 자동으로 체크됩니다.
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="px-4 py-3 border-t border-slate-200 flex gap-2">
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded font-bold text-sm"
          >
            {saving ? "저장 중..." : isEditing ? "💾 저장" : "+ 등록"}
          </button>
          {isEditing && (
            <button
              onClick={remove}
              disabled={saving}
              className="px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded text-sm font-bold"
            >
              🗑 삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 수업교재/숙제교재 공용 섹션
function MaterialSection({
  kind, enabled, onToggle,
  name, onNameChange,
  memo, onMemoChange,
  status, onStatusChange,
  namePlaceholder,
}) {
  const isClass = kind === "class";
  const accent = isClass ? "indigo" : "amber";
  const icon = isClass ? "📘" : "📝";
  const label = isClass ? "수업교재" : "숙제교재";

  // 톤: 체크 ON 이면 컬러풀, OFF 면 회색 + 흐림
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
      {/* 헤더: 체크박스 + 라벨 */}
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
          {enabled ? "— 등록됨" : "— 미포함 (체크하거나 입력 시 포함)"}
        </span>
      </label>

      <div className={innerCls}>
        <input
          type="text"
          className={`w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-2 focus:outline-none ${focusBorder}`}
          placeholder={namePlaceholder}
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
        <div className="text-[11px] text-slate-500 mb-1.5">완료 상태</div>
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
        {status && (
          <button
            onClick={() => onStatusChange(null)}
            className="w-full mt-1.5 py-1 text-[11px] text-slate-400 hover:text-slate-600"
          >
            상태 지우기
          </button>
        )}
      </div>
    </section>
  );
}
