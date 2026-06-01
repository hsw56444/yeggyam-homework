import { useState, useEffect } from "react";
import { saveDayHomework, deleteDayHomework } from "../../lib/homework";

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
  const [cmName, setCmName] = useState(initialDoc?.classMaterial?.name || "");
  const [cmMemo, setCmMemo] = useState(initialDoc?.classMaterial?.memo || "");
  const [cmStatus, setCmStatus] = useState(initialDoc?.classMaterial?.status || null);
  const [hmName, setHmName] = useState(initialDoc?.homeworkMaterial?.name || "");
  const [hmMemo, setHmMemo] = useState(initialDoc?.homeworkMaterial?.memo || "");
  const [hmStatus, setHmStatus] = useState(initialDoc?.homeworkMaterial?.status || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCmName(initialDoc?.classMaterial?.name || "");
    setCmMemo(initialDoc?.classMaterial?.memo || "");
    setCmStatus(initialDoc?.classMaterial?.status || null);
    setHmName(initialDoc?.homeworkMaterial?.name || "");
    setHmMemo(initialDoc?.homeworkMaterial?.memo || "");
    setHmStatus(initialDoc?.homeworkMaterial?.status || null);
  }, [initialDoc]);

  const wd = new Date(date + "T00:00:00").getDay();
  const isEditing = !!initialDoc;

  const cmHasAny = !!(cmName.trim() || cmMemo.trim() || cmStatus);
  const hmHasAny = !!(hmName.trim() || hmMemo.trim() || hmStatus);

  const submit = async () => {
    if (!cmHasAny && !hmHasAny) {
      return alert("수업교재 또는 숙제교재 중 1개 이상 정보를 입력하세요.\n(이름·메모·상태 중 하나만 있어도 OK)");
    }
    setSaving(true);
    try {
      await saveDayHomework(
        studentId,
        date,
        { name: cmName, memo: cmMemo, status: cmStatus },
        { name: hmName, memo: hmMemo, status: hmStatus }
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
          <section className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-3">
            <div className="text-xs font-bold text-indigo-700 mb-2">📘 수업교재</div>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-2 focus:outline-none focus:border-indigo-500"
              placeholder="교재 이름 (비우면 '수업교재' 로 표시)"
              value={cmName}
              onChange={(e) => setCmName(e.target.value)}
            />
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-3 focus:outline-none focus:border-indigo-500"
              placeholder="간단한 메모 (예: 28~35쪽 진행)"
              value={cmMemo}
              onChange={(e) => setCmMemo(e.target.value)}
            />
            <div className="text-[11px] text-slate-500 mb-1.5">완료 상태</div>
            <div className="grid grid-cols-3 gap-1.5">
              {["done", "partial", "none"].map((st) => {
                const s = STATUS[st];
                const active = cmStatus === st;
                return (
                  <button
                    key={st}
                    onClick={() => setCmStatus(active ? null : st)}
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
            {cmStatus && (
              <button
                onClick={() => setCmStatus(null)}
                className="w-full mt-1.5 py-1 text-[11px] text-slate-400 hover:text-slate-600"
              >
                상태 지우기
              </button>
            )}
          </section>

          {/* 숙제교재 */}
          <section className="border border-amber-200 bg-amber-50/50 rounded-lg p-3">
            <div className="text-xs font-bold text-amber-700 mb-2">📝 숙제교재</div>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-2 focus:outline-none focus:border-amber-500"
              placeholder="교재 이름 (비우면 '숙제교재' 로 표시)"
              value={hmName}
              onChange={(e) => setHmName(e.target.value)}
            />
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-3 focus:outline-none focus:border-amber-500"
              placeholder="간단한 메모 (예: 단원평가 / 30분 분량)"
              value={hmMemo}
              onChange={(e) => setHmMemo(e.target.value)}
            />
            <div className="text-[11px] text-slate-500 mb-1.5">완료 상태</div>
            <div className="grid grid-cols-3 gap-1.5">
              {["done", "partial", "none"].map((st) => {
                const s = STATUS[st];
                const active = hmStatus === st;
                return (
                  <button
                    key={st}
                    onClick={() => setHmStatus(active ? null : st)}
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
            {hmStatus && (
              <button
                onClick={() => setHmStatus(null)}
                className="w-full mt-1.5 py-1 text-[11px] text-slate-400 hover:text-slate-600"
              >
                상태 지우기
              </button>
            )}
          </section>
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
