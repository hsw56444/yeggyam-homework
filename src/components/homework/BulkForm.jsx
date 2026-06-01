import { useState, useMemo, useEffect } from "react";
import ItemsEditor from "./ItemsEditor";
import {
  bulkSaveHomework,
  classDatesInRange,
  monthRange,
} from "../../lib/homework";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}
function thisMonth() {
  return todayStr().slice(0, 7);
}

export default function BulkForm({ students, textbooks, classes }) {
  const [classId, setClassId] = useState("");
  const [month, setMonth] = useState(thisMonth());
  const [items, setItems] = useState([{ textbookId: "", detail: "" }]);
  const [excludedDates, setExcludedDates] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const selectedClass = classes.find((c) => c.id === classId);

  // 반의 학생 목록
  const classStudents = useMemo(
    () => students.filter((s) => s.classId === classId),
    [students, classId]
  );

  // 반 시간표 × 선택된 월 → 후보 날짜들
  const candidateDates = useMemo(() => {
    if (!selectedClass) return [];
    const { start, end } = monthRange(month);
    return classDatesInRange(selectedClass.schedule || [], start, end);
  }, [selectedClass, month]);

  // 적용 대상 날짜 (제외 차감)
  const targetDates = useMemo(
    () => candidateDates.filter((d) => !excludedDates.has(d)),
    [candidateDates, excludedDates]
  );

  // 반/월 바뀌면 제외목록 초기화
  useEffect(() => {
    setExcludedDates(new Set());
  }, [classId, month]);

  // 공통 교재만 옵션으로 (반 일괄이므로 학생별 개인교재는 제외 — 학생마다 다르니까)
  const tbOpts = useMemo(() => textbooks.filter((t) => t.scope !== "personal"), [textbooks]);
  const tbMap = useMemo(
    () => Object.fromEntries(textbooks.map((t) => [t.id, t])),
    [textbooks]
  );

  const toggleDate = (d) => {
    const next = new Set(excludedDates);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setExcludedDates(next);
  };

  const submit = async () => {
    if (!classId) return alert("반을 선택하세요.");
    if (classStudents.length === 0) return alert("이 반에 학생이 없습니다.");
    if (targetDates.length === 0) return alert("대상 날짜가 없습니다.");
    const cleanItems = items.filter((it) => it.textbookId);
    if (cleanItems.length === 0) return alert("교재를 1개 이상 선택하세요.");
    const itemsWithName = cleanItems.map((it) => ({
      textbookId: it.textbookId,
      textbookName: tbMap[it.textbookId]?.name || "",
      detail: it.detail,
    }));
    if (
      !confirm(
        `"${selectedClass.name}" 학생 ${classStudents.length}명 × ${targetDates.length}일 = ${
          classStudents.length * targetDates.length
        }건 저장합니다. 계속할까요?`
      )
    )
      return;
    setSaving(true);
    try {
      await bulkSaveHomework(
        classStudents.map((s) => s.id),
        targetDates,
        itemsWithName
      );
      alert(
        `✅ 저장 완료 (${classStudents.length}명 × ${targetDates.length}일 = ${
          classStudents.length * targetDates.length
        }건)`
      );
      setItems([{ textbookId: "", detail: "" }]);
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2 leading-relaxed">
        💡 반 시간표에 맞춰 해당 월의 수업 날짜를 자동 추출 → 반 전원에게 일괄 저장.
        <br />
        ※ 개인 교재는 학생마다 다르므로 일괄 입력에서는 공통 교재만 선택 가능.
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">반</label>
        <select
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-indigo-500"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">— 반 선택 —</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({(c.schedule || []).sort((a,b)=>a-b).map((d) => DAYS[d]).join("·")})
            </option>
          ))}
        </select>
        {selectedClass && (
          <div className="text-xs text-slate-500 mt-1">
            소속 학생: <strong>{classStudents.length}</strong>명
            {classStudents.length === 0 && " (먼저 학생을 이 반에 추가하세요)"}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">대상 월</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      {selectedClass && (
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            적용 날짜 ({targetDates.length}일 / 후보 {candidateDates.length}일) — 클릭으로 제외/포함
          </label>
          <div className="flex flex-wrap gap-1">
            {candidateDates.length === 0 ? (
              <div className="text-sm text-slate-400 py-2">이 월에 수업일이 없습니다.</div>
            ) : (
              candidateDates.map((d) => {
                const excluded = excludedDates.has(d);
                const day = new Date(d + "T00:00:00").getDay();
                const label = `${parseInt(d.slice(8), 10)}(${DAYS[day]})`;
                return (
                  <button
                    key={d}
                    onClick={() => toggleDate(d)}
                    className={`text-xs px-2 py-1 rounded border ${
                      excluded
                        ? "bg-slate-100 text-slate-400 border-slate-200 line-through"
                        : day === 0
                        ? "bg-red-50 text-red-700 border-red-200"
                        : day === 6
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-slate-500 mb-1">숙제 교재 (공통)</label>
        <ItemsEditor items={items} onChange={setItems} textbookOptions={tbOpts} />
      </div>

      <button
        onClick={submit}
        disabled={saving || !classId || classStudents.length === 0 || targetDates.length === 0}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded font-bold text-sm"
      >
        {saving
          ? "저장 중..."
          : `💾 일괄 저장 ${
              selectedClass ? `(${classStudents.length}명 × ${targetDates.length}일)` : ""
            }`}
      </button>
    </div>
  );
}
