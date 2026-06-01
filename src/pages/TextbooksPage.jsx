import { useState, useMemo } from "react";
import { addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { COL } from "../firebase";
import { useCollection } from "../hooks/useCollection";

export default function TextbooksPage() {
  const [textbooks, loadingT] = useCollection(COL.textbooks, "name");
  const [students, loadingS] = useCollection(COL.students, "name");
  const [classes] = useCollection(COL.classes, "name");

  const [form, setForm] = useState({
    name: "",
    scope: "common",      // 'common' | 'personal'
    ownerId: "",          // personal일 때 학생 ID
    description: "",
  });
  const [editingId, setEditingId] = useState(null);

  const studentMap = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students]);

  const resetForm = () => {
    setForm({ name: "", scope: "common", ownerId: "", description: "" });
    setEditingId(null);
  };

  const submit = async () => {
    const name = form.name.trim();
    if (!name) return alert("교재명을 입력하세요.");
    if (form.scope === "personal" && !form.ownerId) {
      return alert("개인별 교재는 소유 학생을 선택하세요.");
    }
    const payload = {
      name,
      scope: form.scope,
      description: form.description.trim(),
      ownerId: form.scope === "personal" ? form.ownerId : "",
      updatedAt: serverTimestamp(),
    };
    try {
      if (editingId) {
        await updateDoc(doc(COL.textbooks, editingId), payload);
      } else {
        await addDoc(COL.textbooks, { ...payload, createdAt: serverTimestamp() });
      }
      resetForm();
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
  };

  const startEdit = (t) => {
    setForm({
      name: t.name || "",
      scope: t.scope || "common",
      ownerId: t.ownerId || "",
      description: t.description || "",
    });
    setEditingId(t.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (t) => {
    if (!confirm(`"${t.name}" 교재를 삭제할까요?`)) return;
    try {
      await deleteDoc(doc(COL.textbooks, t.id));
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  };

  // 공통/개인별로 분리 + 가나다 정렬
  const { commons, personalGroups } = useMemo(() => {
    const byKo = (a, b) => (a.name || "").localeCompare(b.name || "", "ko");
    const commons = textbooks.filter((t) => t.scope !== "personal").slice().sort(byKo);
    // personal은 학생별 그룹화
    const map = new Map();
    students.forEach((s) => map.set(s.id, { student: s, list: [] }));
    const orphans = [];
    textbooks
      .filter((t) => t.scope === "personal")
      .forEach((t) => {
        if (t.ownerId && map.has(t.ownerId)) map.get(t.ownerId).list.push(t);
        else orphans.push(t);
      });
    const personalGroups = [];
    students.forEach((s) => {
      const g = map.get(s.id);
      if (g.list.length > 0) {
        g.list.sort(byKo);
        personalGroups.push(g);
      }
    });
    if (orphans.length) {
      personalGroups.push({
        student: { id: "_none", name: "(소유 학생 없음)" },
        list: orphans.sort(byKo),
        orphan: true,
      });
    }
    return { commons, personalGroups };
  }, [textbooks, students]);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h2 className="text-base font-bold mb-3">
          📚 {editingId ? "교재 수정" : "+ 새 교재 추가"}
        </h2>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, scope: "common", ownerId: "" }))}
            className={`py-2.5 rounded font-bold text-sm border-2 ${
              form.scope === "common"
                ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                : "bg-white border-slate-200 text-slate-500"
            }`}
          >
            👥 공통 교재
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, scope: "personal" }))}
            className={`py-2.5 rounded font-bold text-sm border-2 ${
              form.scope === "personal"
                ? "bg-amber-50 border-amber-500 text-amber-700"
                : "bg-white border-slate-200 text-slate-500"
            }`}
          >
            👤 개인별 교재
          </button>
        </div>

        {form.scope === "personal" && (
          <>
            <label className="block text-xs text-slate-500 mb-1">소유 학생</label>
            {students.length === 0 ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                ⚠️ 학생이 없습니다. 먼저 <strong>👥 학생</strong> 페이지에서 추가하세요.
              </div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded mb-3 text-sm bg-white focus:outline-none focus:border-indigo-500"
                value={form.ownerId}
                onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}
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
          </>
        )}

        <label className="block text-xs text-slate-500 mb-1">교재명</label>
        <input
          className="w-full px-3 py-2 border border-slate-300 rounded mb-3 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="예: 개념원리 수학(상), 워크북 1권"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />

        <label className="block text-xs text-slate-500 mb-1">설명 (선택)</label>
        <input
          className="w-full px-3 py-2 border border-slate-300 rounded mb-3 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="예: 매주 1단원씩 진행"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />

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
          👥 공통 교재 <span className="text-slate-400 font-normal">({commons.length})</span>
        </h2>
        {loadingT ? (
          <div className="text-sm text-slate-400 py-4 text-center">불러오는 중...</div>
        ) : commons.length === 0 ? (
          <div className="text-sm text-slate-400 py-4 text-center">
            공통 교재가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {commons.map((t) => (
              <TextbookCard key={t.id} t={t} onEdit={startEdit} onDelete={remove} />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h2 className="text-base font-bold mb-3">
          👤 개인별 교재{" "}
          <span className="text-slate-400 font-normal">
            ({personalGroups.reduce((s, g) => s + g.list.length, 0)})
          </span>
        </h2>
        {loadingT || loadingS ? (
          <div className="text-sm text-slate-400 py-4 text-center">불러오는 중...</div>
        ) : personalGroups.length === 0 ? (
          <div className="text-sm text-slate-400 py-4 text-center">
            개인별 교재가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {personalGroups.map((g) => (
              <div key={g.student.id}>
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200">
                  <strong className="text-sm text-slate-700">
                    {g.orphan ? "⚠️ " : "👤 "}
                    {g.student.name}
                  </strong>
                  <span className="text-xs text-slate-400">({g.list.length})</span>
                </div>
                <div className="space-y-1.5">
                  {g.list.map((t) => (
                    <TextbookCard
                      key={t.id}
                      t={t}
                      onEdit={startEdit}
                      onDelete={remove}
                      compact
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TextbookCard({ t, onEdit, onDelete, compact }) {
  const isCommon = t.scope !== "personal";
  return (
    <div
      className={`flex justify-between items-start gap-2 ${
        compact ? "px-3 py-2 hover:bg-slate-50 rounded" : "border border-slate-200 rounded-lg p-3"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {!compact && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                isCommon ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {isCommon ? "공통" : "개인"}
            </span>
          )}
          <strong className="text-sm text-slate-800 truncate">{t.name}</strong>
        </div>
        {t.description && (
          <div className="text-xs text-slate-500 mt-1">{t.description}</div>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(t)}
          className="text-sm px-2 py-1 hover:bg-slate-100 rounded"
          title="수정"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(t)}
          className="text-sm px-2 py-1 hover:bg-red-100 rounded"
          title="삭제"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
