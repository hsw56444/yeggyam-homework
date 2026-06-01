// 숙제 교재 행 입력 (개별/일괄 폼에서 공용)
// props:
//   items: [{ textbookId, detail }]
//   onChange: (newItems) => void
//   textbookOptions: [{id, name, scope, ownerId}]  — 미리 필터링된 옵션
export default function ItemsEditor({ items, onChange, textbookOptions }) {
  const update = (i, patch) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...items, { textbookId: "", detail: "" }]);
  const remove = (i) => {
    const next = items.slice();
    next.splice(i, 1);
    onChange(next.length ? next : [{ textbookId: "", detail: "" }]);
  };

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="border border-slate-200 rounded p-2 bg-slate-50/60">
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-xs font-bold text-slate-500">교재 {i + 1}</span>
            {items.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="ml-auto text-xs px-2 py-0.5 hover:bg-red-100 rounded text-red-600"
                title="이 행 삭제"
              >
                ✕
              </button>
            )}
          </div>
          <select
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white mb-1.5 focus:outline-none focus:border-indigo-500"
            value={it.textbookId}
            onChange={(e) => update(i, { textbookId: e.target.value })}
          >
            <option value="">— 교재 선택 —</option>
            {textbookOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.scope === "personal" ? "👤 " : "👥 "}
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:border-indigo-500"
            placeholder="세부내용 (예: 28~35쪽, 단원평가)"
            value={it.detail}
            onChange={(e) => update(i, { detail: e.target.value })}
          />
        </div>
      ))}
      <button
        onClick={add}
        className="w-full py-1.5 border border-dashed border-slate-300 rounded text-sm text-slate-500 hover:bg-slate-50"
      >
        + 교재 추가
      </button>
    </div>
  );
}
