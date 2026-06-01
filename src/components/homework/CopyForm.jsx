import { useState, useEffect, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { homeworkMonthCol } from "../../firebase";
import { dayKey, monthOf, bulkSaveHomework } from "../../lib/homework";

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export default function CopyForm({ students, classes }) {
  const [srcStudentId, setSrcStudentId] = useState("");
  const [srcDate, setSrcDate] = useState(todayStr());
  const [srcDoc, setSrcDoc] = useState(null);
  const [loading, setLoading] = useState(false);

  const [tgtStudentIds, setTgtStudentIds] = useState(new Set());
  const [tgtDates, setTgtDates] = useState([todayStr()]);
  const [saving, setSaving] = useState(false);

  // 소스 doc 로드
  useEffect(() => {
    if (!srcStudentId || !srcDate) {
      setSrcDoc(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const ref = doc(homeworkMonthCol(monthOf(srcDate)), dayKey(srcStudentId, srcDate));
        const snap = await getDoc(ref);
        if (!cancelled) setSrcDoc(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setSrcDoc(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [srcStudentId, srcDate]);

  const toggleTgtStudent = (id) => {
    const next = new Set(tgtStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTgtStudentIds(next);
  };

  const updateTgtDate = (i, v) => {
    const next = tgtDates.slice();
    next[i] = v;
    setTgtDates(next);
  };
  const addTgtDate = () => setTgtDates([...tgtDates, todayStr()]);
  const removeTgtDate = (i) => {
    const next = tgtDates.slice();
    next.splice(i, 1);
    setTgtDates(next.length ? next : [todayStr()]);
  };

  // 학생을 반별로 그룹화
  const studentGroups = useMemo(() => {
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
      if (g.list.length) {
        g.list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
        out.push(g);
      }
    });
    if (orphans.length) {
      orphans.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
      out.push({ cls: { id: "_none", name: "(반 미지정)" }, list: orphans });
    }
    return out;
  }, [students, classes]);

  const submit = async () => {
    if (!srcDoc) return alert("복사할 원본 숙제가 없습니다.");
    if (tgtStudentIds.size === 0) return alert("붙여넣을 학생을 1명 이상 선택하세요.");
    const cleanDates = [...new Set(tgtDates.filter(Boolean))];
    if (cleanDates.length === 0) return alert("붙여넣을 날짜를 1개 이상 입력하세요.");
    if (
      !confirm(
        `학생 ${tgtStudentIds.size}명 × ${cleanDates.length}일 = ${
          tgtStudentIds.size * cleanDates.length
        }건에 같은 숙제를 붙여넣습니다. 계속할까요?`
      )
    )
      return;
    const items = (srcDoc.items || []).map((it) => ({
      textbookId: it.textbookId,
      textbookName: it.textbookName,
      detail: it.detail,
    }));
    setSaving(true);
    try {
      await bulkSaveHomework([...tgtStudentIds], cleanDates, items);
      alert(`✅ 붙여넣기 완료`);
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-5">
      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2 leading-relaxed">
        💡 한 학생·한 날짜의 숙제를 다른 학생들·다른 날짜들로 복사. 교재 ID 그대로 복사되니
        개인 교재가 다른 학생에게 가도 표시는 정상.
      </div>

      <section>
        <div className="text-sm font-bold text-slate-700 mb-2">① 원본 (어디서 복사할지)</div>
        <div className="grid grid-cols-1 gap-2">
          <select
            className="px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-indigo-500"
            value={srcStudentId}
            onChange={(e) => setSrcStudentId(e.target.value)}
          >
            <option value="">— 원본 학생 —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={srcDate}
            onChange={(e) => setSrcDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="mt-2 min-h-[60px]">
          {loading ? (
            <div className="text-sm text-slate-400 py-2">불러오는 중...</div>
          ) : !srcStudentId ? (
            <div className="text-sm text-slate-400 py-2">원본 학생·날짜를 선택하세요.</div>
          ) : !srcDoc ? (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              ⚠️ 이 날짜에 저장된 숙제가 없습니다.
            </div>
          ) : (
            <div className="bg-indigo-50 border border-indigo-200 rounded p-2 space-y-1">
              {(srcDoc.items || []).map((it, i) => (
                <div key={i} className="text-sm">
                  <strong>{it.textbookName || "(교재 미상)"}</strong>
                  {it.detail && <span className="text-slate-600"> — {it.detail}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="text-sm font-bold text-slate-700 mb-2">
          ② 대상 학생 ({tgtStudentIds.size}명 선택됨)
        </div>
        <div className="border border-slate-200 rounded p-2 max-h-60 overflow-y-auto space-y-3">
          {studentGroups.length === 0 ? (
            <div className="text-sm text-slate-400">학생이 없습니다.</div>
          ) : (
            studentGroups.map((g) => (
              <div key={g.cls.id}>
                <div className="text-xs font-bold text-slate-500 mb-1">{g.cls.name}</div>
                <div className="flex flex-wrap gap-1">
                  {g.list.map((s) => {
                    const sel = tgtStudentIds.has(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleTgtStudent(s.id)}
                        className={`text-xs px-2 py-1 rounded border ${
                          sel
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-300"
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="text-sm font-bold text-slate-700 mb-2">
          ③ 대상 날짜 ({tgtDates.length}일)
        </div>
        <div className="space-y-1.5">
          {tgtDates.map((d, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                type="date"
                value={d}
                onChange={(e) => updateTgtDate(i, e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-indigo-500"
              />
              {tgtDates.length > 1 && (
                <button
                  onClick={() => removeTgtDate(i)}
                  className="px-3 hover:bg-red-100 rounded text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addTgtDate}
            className="w-full py-1.5 border border-dashed border-slate-300 rounded text-sm text-slate-500 hover:bg-slate-50"
          >
            + 날짜 추가
          </button>
        </div>
      </section>

      <button
        onClick={submit}
        disabled={saving || !srcDoc || tgtStudentIds.size === 0}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded font-bold text-sm"
      >
        {saving ? "복사 중..." : "📋 붙여넣기"}
      </button>
    </div>
  );
}
