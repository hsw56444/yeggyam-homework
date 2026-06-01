// 숙제 관련 공통 헬퍼
import { homeworkMonthCol } from "../firebase";
import { setDoc, doc, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";

// 'YYYY-MM-DD' → 'YYYY-MM'
export const monthOf = (date) => date.slice(0, 7);

// 학생용 교재 옵션 = 공통 교재 + 그 학생 개인 교재
export function textbooksForStudent(textbooks, studentId) {
  return textbooks.filter((t) => t.scope !== "personal" || t.ownerId === studentId);
}

// 결정적 doc ID — 같은 학생·같은 날짜는 1개 문서로 upsert
export const dayKey = (studentId, date) => `${studentId}_${date}`;

// 학생·날짜에 숙제 저장 (upsert, items 배열 통째 덮어쓰기)
export async function saveDayHomework(studentId, date, items) {
  const colRef = homeworkMonthCol(monthOf(date));
  await setDoc(
    doc(colRef, dayKey(studentId, date)),
    {
      studentId,
      date,
      items: items.map((it) => ({
        textbookId: it.textbookId || "",
        textbookName: it.textbookName || "",
        detail: it.detail || "",
        status: it.status || null,
      })),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// 여러 학생·여러 날짜에 같은 items 복제 (fan-out)
export async function bulkSaveHomework(studentIds, dates, items) {
  const promises = [];
  studentIds.forEach((sid) => {
    dates.forEach((d) => {
      promises.push(saveDayHomework(sid, d, items));
    });
  });
  await Promise.all(promises);
}

// 반 시간표(요일 배열) × 기간 → 매핑되는 날짜 배열
export function classDatesInRange(schedule, startDate, endDate) {
  const out = [];
  const set = new Set((schedule || []).map(Number));
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const cur = new Date(start);
  while (cur <= end) {
    if (set.has(cur.getDay())) {
      const tz = cur.getTimezoneOffset() * 60000;
      out.push(new Date(cur - tz).toISOString().slice(0, 10));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// 월의 첫째 날 / 마지막 날 (YYYY-MM-DD)
export function monthRange(yyyymm) {
  const [y, m] = yyyymm.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    start: `${yyyymm}-01`,
    end: `${yyyymm}-${String(last).padStart(2, "0")}`,
  };
}

// 'YYYY-MM' 다음 달 ('2026-12' → '2027-01')
export function nextMonth(yyyymm) {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m, 1); // m은 1-based, new Date의 month는 0-based — m을 그대로 넣으면 다음 달이 됨
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 한 달의 모든 숙제 doc 가져오기
export async function fetchMonthDocs(yyyymm) {
  const snap = await getDocs(homeworkMonthCol(yyyymm));
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  return out;
}

// 한 달 → 다음 달로 모든 숙제 복사 (날짜 그대로 +1개월, 다음 달에 없는 날짜는 마지막 날로 클램프)
//  - 같은 (student, date) 가 다음 달에 이미 있으면 덮어씀 (안전 확인은 호출 측에서)
//  - status는 복사하지 않음 (새 달에선 깨끗한 상태)
export async function copyMonthToNext(yyyymm) {
  const target = nextMonth(yyyymm);
  const { end: targetLastDay } = monthRange(target);
  const targetLastDate = parseInt(targetLastDay.slice(8), 10);

  const docs = await fetchMonthDocs(yyyymm);
  let copied = 0;
  const tasks = docs.map(async (d) => {
    if (!d.date || !d.studentId) return;
    // 원본 date(YYYY-MM-DD)의 일(day)을 다음 달에 동일 일자로 (없으면 말일)
    const day = Math.min(parseInt(d.date.slice(8), 10), targetLastDate);
    const newDate = `${target}-${String(day).padStart(2, "0")}`;
    const items = (d.items || []).map((it) => ({
      textbookId: it.textbookId,
      textbookName: it.textbookName,
      detail: it.detail,
      status: null, // 새 달엔 초기화
    }));
    await saveDayHomework(d.studentId, newDate, items);
    copied++;
  });
  await Promise.all(tasks);
  return { copied, targetMonth: target };
}

// 학생·날짜 doc 삭제
export async function deleteDayHomework(studentId, date) {
  const colRef = homeworkMonthCol(monthOf(date));
  await deleteDoc(doc(colRef, dayKey(studentId, date)));
}
