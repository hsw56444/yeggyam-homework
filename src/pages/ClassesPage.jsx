import { useState } from "react";
import { addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { COL } from "../firebase";
import { useCollection } from "../hooks/useCollection";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"]; // index = Date.getDay()

export default function ClassesPage() {
  const [classes, loading] = useCollection(COL.classes, "name");
  const [form, setForm] = useState({ name: "", schedule: [] });
  const [editingId, setEditingId] = useState(null);

  const toggleDay = (d) => {
    setForm((f) => ({
      ...f,
      schedule: f.schedule.includes(d)
        ? f.schedule.filter((x) => x !== d)
        : [...f.schedule, d].sort((a, b) => a - b),
    }));
  };

  const resetForm = () => {
    setForm({ name: "", schedule: [] });
    setEditingId(null);
  };

  const submit = async () => {
    const name = form.name.trim();
    if (!name) return alert("반 이름을 입력하세요.");
    if (form.schedule.length === 0) return alert("요일을 1개 이상 선택하세요.");
    try {
      if (editingId) {
        await updateDoc(doc(COL.classes, editingId), {
          name,
          schedule: form.schedule,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(COL.classes, {
          name,
          schedule: form.schedule,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
  };

  const startEdit = (c) => {
    setForm({ name: c.name || "", schedule: c.schedule || [] });
    setEditingId(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (c) => {
    if (!confirm(`"${c.name}" 반을 삭제할까요?\n(소속 학생은 반 미지정으로 표시됩니다)`)) return;
    try {
      await deleteDoc(doc(COL.classes, c.id));
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  };

  const dayColorClass = (d, selected) => {
    const base = selected
      ? "bg-indigo-600 text-white border-indigo-600"
      : "bg-white border-slate-300";
    if (selected) return base;
    if (d === 0) return base + " text-red-600";
    if (d === 6) return base + " text-blue-600";
    return base + " text-slate-700";
  };

  const dayBadgeColor = (d) =>
    d === 0
      ? "bg-red-100 text-red-700"
      : d === 6
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-700";

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h2 className="text-base font-bold mb-3">
          🏫 {editingId ? "반 수정" : "+ 새 반 추가"}
        </h2>
        <label className="block text-xs text-slate-500 mb-1">반 이름</label>
        <input
          className="w-full px-3 py-2 border border-slate-300 rounded mb-3 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="예: 월수금 A반, 일요일 심화반"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <label className="block text-xs text-slate-500 mb-1">수업 요일 (복수 선택)</label>
        <div className="flex gap-1 flex-wrap mb-3">
          {DAYS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={`w-10 h-10 rounded-full text-sm font-bold border ${dayColorClass(
                i,
                form.schedule.includes(i)
              )}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={submit}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded font-bold text-sm"
          >
            {editingId ? "💾 저장" : "+ 추가"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="px-5 bg-slate-200 hover:bg-slate-300 rounded text-sm"
            >
              취소
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h2 className="text-base font-bold mb-3">
          등록된 반 <span className="text-slate-400 font-normal">({classes.length})</span>
        </h2>
        {loading ? (
          <div className="text-sm text-slate-400 py-6 text-center">불러오는 중...</div>
        ) : classes.length === 0 ? (
          <div className="text-sm text-slate-400 py-6 text-center">
            등록된 반이 없습니다. 위에서 추가하세요.
          </div>
        ) : (
          <div className="space-y-2">
            {classes.map((c) => (
              <div
                key={c.id}
                className="border border-slate-200 rounded-lg p-3 flex justify-between items-start gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 truncate">{c.name}</div>
                  <div className="flex gap-1 flex-wrap mt-1.5">
                    {(c.schedule || [])
                      .slice()
                      .sort((a, b) => a - b)
                      .map((d) => (
                        <span
                          key={d}
                          className={`text-xs px-2 py-0.5 rounded font-bold ${dayBadgeColor(d)}`}
                        >
                          {DAYS[d]}
                        </span>
                      ))}
                    {(!c.schedule || c.schedule.length === 0) && (
                      <span className="text-xs text-slate-400">요일 미지정</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-sm px-2 py-1 hover:bg-slate-100 rounded"
                    title="수정"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => remove(c)}
                    className="text-sm px-2 py-1 hover:bg-red-100 rounded"
                    title="삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
