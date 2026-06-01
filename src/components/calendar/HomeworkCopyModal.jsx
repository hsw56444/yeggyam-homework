import { useState, useEffect, useMemo } from "react";
import { copyHomeworkBetweenStudents, fetchStudentMonth } from "../../lib/homework";

// props:
//   students: 전체 학생 목록 [{id, name, classId}]
//   classes: 전체 반 목록 [{id, name}]
//   defaultStudentId: 현재 선택 학생 (기본 소스 또는 타겟 — direction 으로 결정)
//   defaultMonth: 현재 보고 있는 월 (YYYY-MM)
//   onClose, onAfterCopy
//
// 동작:
//   - direction = 'incoming' → 다른 학생 → 현재 학생 (불러오기)
//   - direction = 'outgoing' → 현재 학생 → 다른 학생들 (붙여넣기)
//   - 사용자가 모달 안에서 토글 가능

function shiftMonth(yyyymm, delta) {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function HomeworkCopyModal({
  students, classes,
  defaultStudentId, defaultMonth,
  onClose, onAfterCopy,
}) {
  const [direction, setDirection] = useState("outgoing"); // 'outgoing' | 'incoming'

  // 소스
  const [srcStudentId, setSrcStudentId] = useState(defaultStudentId || "");
  const [srcMonth, setSrcMonth] = useState(defaultMonth);

  // 타겟 (다중)
  const [dstStudentIds, setDstStudentIds] = useState(
    direction === "incoming" && defaultStudentId ? [defaultStudentId] : []
  );
  const [dstMonth, setDstMonth] = useState(defaultMonth);

  const [previewDocs, setPreviewDocs] = useState([]); // 소스 월의 데이터
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // direction 토글 시 소스/타겟 스왑
  const flipDirection = () => {
    setDirection((d) => {
      const next = d === "outgoing" ? "incoming" : "outgoing";
      if (next === "incoming") {
        // 다른 학생 → 현재 학생
        setSrcStudentId("");
        setDstStudentIds(defaultStudentId ? [defaultStudentId] : []);
      } else {
        // 현재 학생 → 다른 학생들
        setSrcStudentId(defaultStudentId || "");
        setDstStudentIds([]);
      }
      return next;
    });
  };

  // 소스 변경 시 프리뷰 fetch
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!srcStudentId || !srcMonth) {
        setPreviewDocs([]);
        return;
      }
      setLoadingPreview(true);
      try {
        const docs = await fetchStudentMonth(srcStudentId, srcMonth);
        if (!cancelled) setPreviewDocs(docs);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setPreviewDocs([]);
        }
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [srcStudentId, srcMonth]);

  const toggleDst = (id) => {
    setDstStudentIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  };

  // 학생 목록 (반별 그룹)
  const studentsByClass = useMemo(() => {
    const m = new Map();
    students.forEach((s) => {
      const c = classes.find((x) => x.id === s.classId);
      const key = c?.name || "(반 없음)";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(s);
    });
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [students, classes]);

  const srcStudent = students.find((s) => s.id === srcStudentId);

  // 타겟에서 자기 자신(소스 학생)은 제외하는 것이 자연스러움
  const eligibleDstStudents = useMemo(
    () => students.filter((s) => s.id !== srcStudentId),
    [students, srcStudentId]
  );

  // 같은 월일 때만 자기 자신 제외, 다른 월이면 자기 자신 허용 (월 이동 복사)
  const dstStudentList = srcMonth === dstMonth ? eligibleDstStudents : students;

  const canSubmit =
    !!srcStudentId && previewDocs.length > 0 && dstStudentIds.length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    const srcName = srcStudent?.name || "(학생)";
    const dstNames = dstStudentIds
      .map((id) => students.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    const msg =
      `[${srcName} / ${srcMonth}] 의 숙제 ${previewDocs.length}일분을\n` +
      `[${dstNames} / ${dstMonth}] 에게 복사합니다.\n` +
      `같은 날짜에 기존 숙제가 있으면 덮어쓰여집니다.\n계속할까요?`;
    if (!confirm(msg)) return;

    setSaving(true);
    try {
      const { copied, skipped } = await copyHomeworkBetweenStudents({
        srcStudentId,
        srcMonth,
        dstStudentIds,
        dstMonth,
      });
      let resultMsg = `✅ 복사 완료: ${copied} 건`;
      if (skipped > 0) resultMsg += `\n(타겟 월에 없는 날짜 ${skipped}건 제외)`;
      alert(resultMsg);
      onAfterCopy && onAfterCopy();
      onClose();
    } catch (e) {
      alert("복사 실패: " + e.message);
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
            <div className="text-base font-bold">📋 숙제 복사</div>
            <div className="text-xs text-slate-500">
              한 학생의 한 달치 숙제를 다른 학생(들)에게 복사
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
          {/* 방향 토글 */}
          <div className="flex items-center justify-center gap-1.5 text-xs">
            <button
              onClick={direction === "incoming" ? flipDirection : undefined}
              className={`flex-1 py-2 rounded font-bold border-2 transition ${
                direction === "outgoing"
                  ? "bg-indigo-600 text-white border-transparent"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              ↗ 보내기 (이 학생 → 다른 학생)
            </button>
            <button
              onClick={direction === "outgoing" ? flipDirection : undefined}
              className={`flex-1 py-2 rounded font-bold border-2 transition ${
                direction === "incoming"
                  ? "bg-indigo-600 text-white border-transparent"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              ↙ 불러오기 (다른 학생 → 이 학생)
            </button>
          </div>

          {/* 출발 (소스) */}
          <section className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <div className="text-xs font-bold text-slate-700 mb-2">
              📤 출발 — 어떤 학생의 어떤 월
            </div>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-2 focus:outline-none focus:border-indigo-500"
              value={srcStudentId}
              onChange={(e) => setSrcStudentId(e.target.value)}
            >
              <option value="">— 출발 학생 선택 —</option>
              {students.map((s) => {
                const c = classes.find((x) => x.id === s.classId);
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} {c ? `(${c.name})` : ""}
                  </option>
                );
              })}
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSrcMonth(shiftMonth(srcMonth, -1))}
                className="px-2 py-1 text-xs bg-white hover:bg-slate-100 border border-slate-300 rounded"
              >
                ◀
              </button>
              <div className="flex-1 text-center text-sm font-bold">
                {srcMonth.replace("-", "년 ")}월
              </div>
              <button
                onClick={() => setSrcMonth(shiftMonth(srcMonth, 1))}
                className="px-2 py-1 text-xs bg-white hover:bg-slate-100 border border-slate-300 rounded"
              >
                ▶
              </button>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {loadingPreview
                ? "불러오는 중..."
                : srcStudentId
                ? previewDocs.length === 0
                  ? "이 학생·월에 숙제가 없습니다."
                  : `숙제 ${previewDocs.length}일 발견 — 모두 복사됩니다.`
                : "출발 학생을 선택하세요."}
            </div>
            {previewDocs.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {previewDocs.map((d) => (
                  <span
                    key={d.date}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-600"
                  >
                    {parseInt(d.date.slice(8), 10)}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 도착 (타겟) */}
          <section className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/40">
            <div className="text-xs font-bold text-indigo-700 mb-2">
              📥 도착 — 어떤 학생(들), 어떤 월
            </div>
            <div className="flex items-center gap-1 mb-2">
              <button
                onClick={() => setDstMonth(shiftMonth(dstMonth, -1))}
                className="px-2 py-1 text-xs bg-white hover:bg-slate-100 border border-slate-300 rounded"
              >
                ◀
              </button>
              <div className="flex-1 text-center text-sm font-bold">
                {dstMonth.replace("-", "년 ")}월
              </div>
              <button
                onClick={() => setDstMonth(shiftMonth(dstMonth, 1))}
                className="px-2 py-1 text-xs bg-white hover:bg-slate-100 border border-slate-300 rounded"
              >
                ▶
              </button>
            </div>

            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] text-slate-600">
                도착 학생 ({dstStudentIds.length}명 선택)
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setDstStudentIds(dstStudentList.map((s) => s.id))}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  전체
                </button>
                <span className="text-slate-300 text-[11px]">|</span>
                <button
                  onClick={() => setDstStudentIds([])}
                  className="text-[11px] text-slate-500 hover:underline"
                >
                  해제
                </button>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto bg-white rounded border border-slate-200">
              {studentsByClass.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">
                  학생이 없습니다.
                </div>
              ) : (
                studentsByClass.map(([clsName, list]) => (
                  <div key={clsName}>
                    <div className="px-2 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 border-b border-slate-200">
                      {clsName}
                    </div>
                    {list.map((s) => {
                      const checked = dstStudentIds.includes(s.id);
                      const isSelf = s.id === srcStudentId;
                      const disabled = isSelf && srcMonth === dstMonth;
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2 px-2 py-1.5 border-b border-slate-100 last:border-b-0 ${
                            disabled
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-indigo-50 cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleDst(s.id)}
                            className="w-4 h-4 accent-indigo-600"
                          />
                          <span className="text-sm">
                            {s.name}
                            {disabled && (
                              <span className="ml-1 text-[10px] text-slate-400">
                                (출발과 동일 — 같은 월 복사 불가)
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </section>

          {srcMonth !== dstMonth && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              ℹ️ 출발 월과 도착 월이 다릅니다. 같은 일자(예: 3일 → 3일)로 복사됩니다.
              타겟 월에 없는 날짜(예: 2월 30일)는 건너뜁니다.
            </div>
          )}
        </div>

        {/* 액션 */}
        <div className="px-4 py-3 border-t border-slate-200">
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded font-bold text-sm"
          >
            {saving
              ? "복사 중..."
              : `📋 복사 (${previewDocs.length}일 × ${dstStudentIds.length}명)`}
          </button>
        </div>
      </div>
    </div>
  );
}
