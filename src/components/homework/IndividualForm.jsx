import { useState, useMemo } from "react";
import ItemsEditor from "./ItemsEditor";
import { textbooksForStudent, bulkSaveHomework } from "../../lib/homework";

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export default function IndividualForm({ students, textbooks, classes }) {
  const [studentId, setStudentId] = useState("");
  const [dates, setDates] = useState([todayStr()]);
  const [items, setItems] = useState([{ textbookId: "", detail: "" }]);
  const [saving, setSaving] = useState(false);

  // 학생에 따른 교재 옵션
  const tbOpts = useMemo(() => {
    if (!studentId) return textbooks.filter((t) => t.scope !== "personal");
    return textbooksForStudent(textbooks, studentId);
  }, [textbooks, studentId]);

  const tbMap = useMemo(
    () => Object.fromEntries(textbooks.map((t) => [t.id, t])),
    [textbooks]
  );

  const updateDate = (i, v) => {
    const next = dates.slice();
    next[i] = v;
    setDates(next);
  };
  const addDate = () => setDates([...dates, todayStr()]);
  const removeDate = (i) => {
    const next = dates.slice();
    next.splice(i, 1);
    setDates(next.length ? next : [todayStr()]);
  };

  const submit = async () => {
    if (!studentId) return alert("학생을 선택하세요.");
    const cleanDates = [...new Set(dates.filter(Boolean))];
    if (cleanDates.length === 0) return alert("날짜를 1개 이상 입력하세요.");
    const cleanItems = items.filter((it) => it.textbookId);
    if (cleanItems.length === 0) return alert("교재를 1개 이상 선택하세요.");
    const itemsWithName = cleanItems.map((it) => ({
      textbookId: it.textbookId,
      textbookName: tbMap[it.textbookId]?.name || "",
      detail: it.detail,
    }));
    setSaving(true);
    try {
      await bulkSaveHomework([studentId], cleanDates, itemsWithName);
      const stuName = students.find((s) => s.id === studentId)?.name || "";
      alert(
        `✅ "${stuName}" 학생의 숙제가 ${cleanDates.length}일(${cleanItems.length}개 교재) 저장되었습니다.`
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
      <div>
        <label className="block text-xs text-slate-500 mb-1">학생</label>
        {students.length === 0 ? (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            ⚠️ 먼저 <strong>👥 학생</strong> 페이지에서 추가하세요.
          </div>
        ) : (
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-indigo-500"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">— 학생 선택 —</option>
            {students.map((s) => {
              const cls = classes.find((c) => c.id === s.classId);
              return (
                <option key={s.id} value={s.id}>
                  {s.name} {cls ? `(${cls.name})` : ""}
                </option>
              );
            })}
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">
          날짜 ({dates.length}일)
        </label>
        <div className="space-y-1.5">
          {dates.map((d, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                type="date"
                value={d}
                onChange={(e) => updateDate(i, e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-indigo-500"
              />
              {dates.length > 1 && (
                <button
                  onClick={() => removeDate(i)}
                  className="px-3 hover:bg-red-100 rounded text-red-600"
                  title="이 날짜 제거"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addDate}
            className="w-full py-1.5 border border-dashed border-slate-300 rounded text-sm text-slate-500 hover:bg-slate-50"
          >
            + 날짜 추가 (같은 숙제를 여러 날짜에 한꺼번에)
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">숙제 교재</label>
        <ItemsEditor items={items} onChange={setItems} textbookOptions={tbOpts} />
      </div>

      <button
        onClick={submit}
        disabled={saving}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded font-bold text-sm"
      >
        {saving ? "저장 중..." : "💾 저장"}
      </button>
    </div>
  );
}
