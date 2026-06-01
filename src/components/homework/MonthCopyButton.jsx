import { useState } from "react";
import { copyMonthToNext, nextMonth } from "../../lib/homework";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthCopyButton() {
  const [month, setMonth] = useState(thisMonth());
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const target = nextMonth(month);
    if (
      !confirm(
        `${month} 의 모든 숙제를 ${target} 로 복사할까요?\n\n` +
          `- 날짜는 동일 일자로 매핑 (예: ${month}-05 → ${target}-05)\n` +
          `- 같은 (학생·날짜) 가 이미 ${target} 에 있으면 덮어씁니다.\n` +
          `- 끝남/진행중/안 함 상태는 새 달에서 초기화됩니다.`
      )
    )
      return;
    setBusy(true);
    try {
      const { copied, targetMonth } = await copyMonthToNext(month);
      alert(`✅ ${copied}건을 ${targetMonth} 로 복사했습니다.`);
    } catch (e) {
      alert("복사 실패: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="text-sm font-bold mb-2">📆 다음 달로 일괄 복사</div>
      <div className="text-xs text-slate-500 mb-3 leading-relaxed">
        선택한 월의 숙제 전체를 다음 달로 복사. 매월 같은 패턴이면 시간 절약.
        <br />복사 후 다음 달에서 부분 수정·삭제 가능.
      </div>
      <div className="flex gap-2 items-stretch">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={submit}
          disabled={busy}
          className="px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded text-sm font-bold whitespace-nowrap"
        >
          {busy ? "복사 중..." : `→ ${nextMonth(month)} 로`}
        </button>
      </div>
    </div>
  );
}
