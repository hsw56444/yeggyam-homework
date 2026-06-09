import { useState, useEffect, useMemo } from "react";
import {
  fetchDayHomework,
  saveDayHomework,
  hasClass,
  hasHomework,
} from "../../lib/homework";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const STATUS_LABEL = { done: "끝남 ✓", partial: "진행중 ◐", none: "안 함 ✕" };

// props:
//   students, classes
//   currentStudentId, currentStudentName
//   currentDate                  (YYYY-MM-DD)
//   currentCm, currentHm         (현재 폼 state — 보내기 미리보기·전송용)
//   onImport(cm, hm)             (불러오기 적용 콜백 — 폼 채우기)
//   onAfterSend()                (보내기 완료 콜백)
//   onClose
export default function HomeworkDayShareModal({
  students, classes,
  currentStudentId, currentStudentName,
  currentDate,
  currentCm, currentHm,
  onImport, onAfterSend, onClose,
}) {
  const [tab, setTab] = useState("import"); // 'import' | 'send'

  // ── 불러오기 state ──
  const [srcStudentId, setSrcStudentId] = useState("");
  const [srcDate, setSrcDate] = useState(currentDate);
  const [srcDoc, setSrcDoc] = useState(null);
  const [loadingSrc, setLoadingSrc] = useState(false);

  // ── 보내기 state ──
  const [dstStudentIds, setDstStudentIds] = useState([]);
  const [dstDate, setDstDate] = useState(currentDate);
  const [sending, setSending] = useState(false);

  // 학생을 반별로 그룹화 + 가나다 정렬
  const studentsByClass = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      const c = classes.find((x) => x.id === s.classId);
      const key = c?.name || "(반 없음)";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    map.forEach((list) =>
      list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"))
    );
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "ko"));
  }, [students, classes]);

  // 소스 학생·날짜 변경 시 fetch
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!srcStudentId || !srcDate) {
        setSrcDoc(null);
        return;
      }
      setLoadingSrc(true);
      try {
        const d = await fetchDayHomework(srcStudentId, srcDate);
        if (!cancelled) setSrcDoc(d);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setSrcDoc(null);
        }
      } finally {
        if (!cancelled) setLoadingSrc(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [srcStudentId, srcDate]);

  const toggleDst = (id) => {
    setDstStudentIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  };

  // ── 불러오기 적용 ──
  const applyImport = () => {
    if (!srcDoc) return;
    onImport(srcDoc.classMaterial || null, srcDoc.homeworkMaterial || null);
    onClose();
  };

  // ── 보내기 ──
  const hasCurrent = hasClass({ classMaterial: currentCm }) || hasHomework({ homeworkMaterial: currentHm });

  const send = async () => {
    if (!hasCurrent) {
      return alert("보낼 내용이 없습니다.\n현재 폼에 수업교재 또는 숙제교재를 입력하세요.");
    }
    if (dstStudentIds.length === 0) {
      return alert("받을 학생을 1명 이상 선택하세요.");
    }
    const dstNames = dstStudentIds
      .map((id) => students.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    const msg =
      `[${currentStudentName || "현재 학생"} / ${currentDate}] 의 현재 폼 내용을\n` +
      `[${dstNames} / ${dstDate}] 에게 저장합니다.\n` +
      `기존 숙제가 있으면 덮어쓰여집니다.\n계속할까요?`;
    if (!confirm(msg)) return;

    setSending(true);
    try {
      await Promise.all(
        dstStudentIds.map((dstId) =>
          saveDayHomework(dstId, dstDate, currentCm, currentHm)
        )
      );
      alert(`✅ ${dstStudentIds.length}명에게 보냈습니다.`);
      onAfterSend && onAfterSend();
      onClose();
    } catch (e) {
      alert("보내기 실패: " + e.message);
    } finally {
      setSending(false);
    }
  };

  const wdOf = (date) => DAYS[new Date(date + "T00:00:00").getDay()];

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="text-base font-bold">📋 다른 학생과 공유</div>
            <div className="text-xs text-slate-500">
              {currentStudentName || "(학생)"} · {currentDate} ({wdOf(currentDate)})
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-slate-400 hover:text-slate-600 leading-none"
          >
            ×
          </button>
        </div>

        {/* 탭 */}
        <div className="px-4 pt-3">
          <div className="flex gap-1.5 text-xs">
            <button
              onClick={() => setTab("import")}
              className={`flex-1 py-2 rounded font-bold border-2 transition ${
                tab === "import"
                  ? "bg-indigo-600 text-white border-transparent"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              ↙ 불러오기
            </button>
            <button
              onClick={() => setTab("send")}
              className={`flex-1 py-2 rounded font-bold border-2 transition ${
                tab === "send"
                  ? "bg-indigo-600 text-white border-transparent"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              ↗ 보내기
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {tab === "import" ? (
            <ImportTab
              students={students}
              classes={classes}
              currentStudentId={currentStudentId}
              srcStudentId={srcStudentId}
              setSrcStudentId={setSrcStudentId}
              srcDate={srcDate}
              setSrcDate={setSrcDate}
              srcDoc={srcDoc}
              loadingSrc={loadingSrc}
            />
          ) : (
            <SendTab
              currentStudentId={currentStudentId}
              currentCm={currentCm}
              currentHm={currentHm}
              dstDate={dstDate}
              setDstDate={setDstDate}
              dstStudentIds={dstStudentIds}
              toggleDst={toggleDst}
              setDstStudentIds={setDstStudentIds}
              studentsByClass={studentsByClass}
              hasCurrent={hasCurrent}
            />
          )}
        </div>

        {/* 액션 */}
        <div className="px-4 py-3 border-t border-slate-200">
          {tab === "import" ? (
            <button
              onClick={applyImport}
              disabled={!srcDoc}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded font-bold text-sm"
            >
              {srcDoc ? "↙ 이 폼에 채우기" : loadingSrc ? "불러오는 중..." : "출발 학생·날짜를 선택하세요"}
            </button>
          ) : (
            <button
              onClick={send}
              disabled={sending || !hasCurrent || dstStudentIds.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-2.5 rounded font-bold text-sm"
            >
              {sending
                ? "보내는 중..."
                : `↗ ${dstStudentIds.length}명에게 보내기`}
            </button>
          )}
          {tab === "import" && (
            <div className="mt-2 text-[10px] text-slate-400 text-center">
              💡 채워진 내용은 자동 저장되지 않습니다. 필요하면 수정 후 저장 버튼을 누르세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 불러오기 탭 ──
function ImportTab({
  students, classes,
  currentStudentId,
  srcStudentId, setSrcStudentId,
  srcDate, setSrcDate,
  srcDoc, loadingSrc,
}) {
  return (
    <>
      <section className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
        <div className="text-xs font-bold text-slate-700">
          📤 어떤 학생의 어떤 날짜를 가져올까요?
        </div>
        <select
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-indigo-500"
          value={srcStudentId}
          onChange={(e) => setSrcStudentId(e.target.value)}
        >
          <option value="">— 출발 학생 선택 —</option>
          {students
            .filter((s) => s.id !== currentStudentId)
            .map((s) => {
              const c = classes.find((x) => x.id === s.classId);
              return (
                <option key={s.id} value={s.id}>
                  {s.name}{c ? ` (${c.name})` : ""}
                </option>
              );
            })}
        </select>
        <input
          type="date"
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:border-indigo-500"
          value={srcDate}
          onChange={(e) => setSrcDate(e.target.value)}
        />
      </section>

      <section className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/40">
        <div className="text-xs font-bold text-indigo-700 mb-2">
          미리보기
        </div>
        {!srcStudentId ? (
          <div className="text-xs text-slate-400 text-center py-4">
            출발 학생을 선택하세요.
          </div>
        ) : loadingSrc ? (
          <div className="text-xs text-slate-400 text-center py-4">
            불러오는 중...
          </div>
        ) : !srcDoc ? (
          <div className="text-xs text-slate-400 text-center py-4">
            이 학생·날짜에 입력된 숙제가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            <MaterialPreview kind="class" mat={srcDoc.classMaterial} />
            <MaterialPreview kind="homework" mat={srcDoc.homeworkMaterial} />
          </div>
        )}
      </section>
    </>
  );
}

// ── 보내기 탭 ──
function SendTab({
  currentStudentId,
  currentCm, currentHm,
  dstDate, setDstDate,
  dstStudentIds, toggleDst, setDstStudentIds,
  studentsByClass,
  hasCurrent,
}) {
  return (
    <>
      <section className="border border-slate-200 rounded-lg p-3 bg-slate-50">
        <div className="text-xs font-bold text-slate-700 mb-2">
          📦 보낼 내용 (현재 폼)
        </div>
        {!hasCurrent ? (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            ⚠️ 현재 폼에 내용이 없습니다. 수업교재나 숙제교재를 먼저 입력하세요.
          </div>
        ) : (
          <div className="space-y-2">
            <MaterialPreview kind="class" mat={currentCm} />
            <MaterialPreview kind="homework" mat={currentHm} />
          </div>
        )}
      </section>

      <section className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/40">
        <div className="text-xs font-bold text-indigo-700 mb-2">
          📥 누구에게 / 언제 보낼까요?
        </div>
        <input
          type="date"
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-2 focus:outline-none focus:border-indigo-500"
          value={dstDate}
          onChange={(e) => setDstDate(e.target.value)}
        />

        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-slate-600">
            받을 학생 ({dstStudentIds.length}명 선택)
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() =>
                setDstStudentIds(
                  studentsByClass
                    .flatMap(([, list]) => list)
                    .filter((s) => s.id !== currentStudentId)
                    .map((s) => s.id)
                )
              }
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
                  const isSelf = s.id === currentStudentId;
                  const checked = dstStudentIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2 px-2 py-1.5 border-b border-slate-100 last:border-b-0 ${
                        isSelf
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-indigo-50 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isSelf}
                        onChange={() => toggleDst(s.id)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <span className="text-sm">
                        {s.name}
                        {isSelf && (
                          <span className="ml-1 text-[10px] text-slate-400">(자기 자신)</span>
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
    </>
  );
}

// 수업교재/숙제교재 한 칸 미리보기 (간단)
function MaterialPreview({ kind, mat }) {
  const isClass = kind === "class";
  const icon = isClass ? "📘" : "📝";
  const label = isClass ? "수업교재" : "숙제교재";
  const borderCls = isClass ? "border-indigo-200" : "border-amber-200";
  const titleCls = isClass ? "text-indigo-700" : "text-amber-700";

  const hasIt = !!(mat?.name && mat.name.trim());
  if (!hasIt) {
    return (
      <div className="text-[11px] text-slate-400 px-2 py-1.5 bg-white border border-dashed border-slate-300 rounded">
        {icon} {label} — (없음)
      </div>
    );
  }
  return (
    <div className={`p-2 bg-white border ${borderCls} rounded`}>
      <div className={`text-[10px] font-bold ${titleCls} mb-0.5`}>
        {icon} {label}
      </div>
      <div className="text-sm font-medium text-slate-800 truncate">{mat.name}</div>
      {mat.memo && (
        <div className="text-[11px] text-slate-500 truncate">{mat.memo}</div>
      )}
      {mat.status && (
        <div className="mt-1 text-[10px] inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
          상태: {STATUS_LABEL[mat.status]}
        </div>
      )}
    </div>
  );
}
