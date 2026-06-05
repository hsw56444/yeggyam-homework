import { useState, useMemo } from "react";
import { addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { COL } from "../firebase";
import { useCollection } from "../hooks/useCollection";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function StudentsPage() {
  const [students, loadingS] = useCollection(COL.students, "name");
  const [classes, loadingC] = useCollection(COL.classes, "name");
  const [form, setForm] = useState({ name: "", classId: "" });
  const [editingId, setEditingId] = useState(null);
  const [filterClassId, setFilterClassId] = useState("all");

  // 기본 반 자동선택 — 폼 비어있고 반이 1개 이상이면 첫 반
  const effectiveClassId =
    form.classId || (classes.length > 0 ? classes[0].id : "");

  const resetForm = () => {
    setForm({ name: "", classId: "" });
    setEditingId(null);
  };

  const submit = async () => {
    const name = form.name.trim();
    if (!name) return alert("학생 이름을 입력하세요.");
    if (!effectiveClassId) return alert("반을 선택하세요. (반이 없으면 먼저 반을 추가하세요)");
    try {
      if (editingId) {
        await updateDoc(doc(COL.students, editingId), {
          name,
          classId: effectiveClassId,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(COL.students, {
          name,
          classId: effectiveClassId,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
  };

  const startEdit = (s) => {
    setForm({ name: s.name || "", classId: s.classId || "" });
    setEditingId(s.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (s) => {
    if (!confirm(`"${s.name}" 학생을 삭제할까요?`)) return;
    try {
      await deleteDoc(doc(COL.students, s.id));
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  };

  // 반별 그룹화 + 반별 가나다 정렬
  const groups = useMemo(() => {
    const byKo = (a, b) => (a.name || "").localeCompare(b.name || "", "ko");
    const map = new Map();
    classes.forEach((c) => map.set(c.id, { cls: c, list: [] }));
    const orphans = [];
    students.forEach((s) => {
      if (s.classId && map.has(s.classId)) map.get(s.classId).list.push(s);
      else orphans.push(s);
    });
    const out = [];
    classes.forEach((c) => {
      const g = map.get(c.id);
      g.list.sort(byKo);
      out.push(g);
    });
    if (orphans.length) {
      out.push({
        cls: { id: "_none", name: "(반 미지정)", schedule: [] },
        list: orphans.sort(byKo),
        orphan: true,
      });
    }
    return out;
  }, [students, classes]);

  const dayBadgeColor = (d) =>
    d === 0
      ? "bg-red-100 text-red-700"
      : d === 6
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-700";

  // 필터 칩에 보이는 그룹 (반 + 미지정 + 전체)
  const visibleGroups = useMemo(() => {
    if (filterClassId === "all") return groups.filter((g) => g.list.length > 0);
    return groups.filter(
      (g) => g.list.length > 0 && g.cls.id === filterClassId
    );
  }, [groups, filterClassId]);

  const orphanCount =
    groups.find((g) => g.orphan)?.list.length ?? 0;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h2 className="text-base font-bold mb-3">
          👥 {editingId ? "학생 수정" : "+ 새 학생 추가"}
        </h2>
        <label className="block text-xs text-slate-500 mb-1">학생 이름</label>
        <input
          className="w-full px-3 py-2 border border-slate-300 rounded mb-3 text-sm focus:outline-none focus:border-indigo-500"
          placeholder="예: 김민지"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <label className="block text-xs text-slate-500 mb-1">반</label>
        {classes.length === 0 ? (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
            ⚠️ 먼저 <strong>반·시간표</strong> 페이지에서 반을 추가하세요.
          </div>
        ) : (
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded mb-3 text-sm bg-white focus:outline-none focus:border-indigo-500"
            value={effectiveClassId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={classes.length === 0}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded font-bold text-sm"
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
          등록된 학생 <span className="text-slate-400 font-normal">({students.length})</span>
        </h2>

        {/* 반 필터 칩 */}
        {!loadingS && !loadingC && students.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
            <FilterChip
              active={filterClassId === "all"}
              onClick={() => setFilterClassId("all")}
              label={`전체 (${students.length})`}
            />
            {classes.map((c) => {
              const count =
                groups.find((g) => g.cls.id === c.id)?.list.length ?? 0;
              return (
                <FilterChip
                  key={c.id}
                  active={filterClassId === c.id}
                  onClick={() => setFilterClassId(c.id)}
                  label={`${c.name} (${count})`}
                />
              );
            })}
            {orphanCount > 0 && (
              <FilterChip
                active={filterClassId === "_none"}
                onClick={() => setFilterClassId("_none")}
                label={`미배정 (${orphanCount})`}
              />
            )}
          </div>
        )}

        {loadingS || loadingC ? (
          <div className="text-sm text-slate-400 py-6 text-center">불러오는 중...</div>
        ) : students.length === 0 ? (
          <div className="text-sm text-slate-400 py-6 text-center">
            등록된 학생이 없습니다.
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="text-sm text-slate-400 py-6 text-center">
            해당 반에 학생이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleGroups.map((g) => (
                <div key={g.cls.id}>
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-200">
                    <strong className="text-sm text-slate-700">
                      {g.orphan ? "⚠️ " : "🏫 "}
                      {g.cls.name}
                    </strong>
                    <span className="text-xs text-slate-400">({g.list.length})</span>
                    <div className="flex gap-1 ml-auto">
                      {(g.cls.schedule || []).map((d) => (
                        <span
                          key={d}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${dayBadgeColor(d)}`}
                        >
                          {DAYS[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {g.list.map((s) => (
                      <div
                        key={s.id}
                        className="flex justify-between items-center px-3 py-2 hover:bg-slate-50 rounded"
                      >
                        <span className="text-sm">{s.name}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(s)}
                            className="text-sm px-2 py-1 hover:bg-slate-100 rounded"
                            title="수정"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => remove(s)}
                            className="text-sm px-2 py-1 hover:bg-red-100 rounded"
                            title="삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
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

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
        active
          ? "bg-indigo-600 border-indigo-600 text-white"
          : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
      }`}
    >
      {label}
    </button>
  );
}
