// 숙제 관련 공통 헬퍼
// 데이터 모델:
//   hw_homework/{YYYY-MM}/items/{studentId}_{YYYY-MM-DD} {
//     studentId, date,
//     classMaterial:    { name, memo }           // 수업교재 (이름/메모)
//     homeworkMaterial: { name, memo, status }   // 숙제교재 (+ 상태)
//   }
import { homeworkMonthCol } from "../firebase";
import { setDoc, doc, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";

// 'YYYY-MM-DD' → 'YYYY-MM'
export const monthOf = (date) => date.slice(0, 7);

// 결정적 doc ID — 같은 학생·같은 날짜는 1개 문서로 upsert
export const dayKey = (studentId, date) => `${studentId}_${date}`;

// classMaterial/homeworkMaterial 이 의미있는지 (이름이 있어야 의미 있음)
export const hasClass = (doc) => !!(doc?.classMaterial?.name && doc.classMaterial.name.trim());
export const hasHomework = (doc) =>
  !!(doc?.homeworkMaterial?.name && doc.homeworkMaterial.name.trim());

// 레거시(items 배열) 데이터 → 새 포맷으로 읽기용 정규화
//   - items[0] → classMaterial
//   - items[1] → homeworkMaterial
export function normalizeDoc(d) {
  if (!d) return d;
  if (d.classMaterial || d.homeworkMaterial) return d;
  const items = d.items || [];
  return {
    ...d,
    classMaterial: items[0]
      ? { name: items[0].textbookName || "", memo: items[0].detail || "" }
      : null,
    homeworkMaterial: items[1]
      ? {
          name: items[1].textbookName || "",
          memo: items[1].detail || "",
          status: items[1].status || null,
        }
      : null,
    _legacy: true,
  };
}

// 한 학생·한 날짜 저장 (둘 다 비어있으면 doc 삭제)
export async function saveDayHomework(studentId, date, classMaterial, homeworkMaterial) {
  const colRef = homeworkMonthCol(monthOf(date));
  const ref = doc(colRef, dayKey(studentId, date));
  const cmName = (classMaterial?.name || "").trim();
  const hmName = (homeworkMaterial?.name || "").trim();
  // 둘 다 비어있으면 doc 삭제
  if (!cmName && !hmName) {
    try { await deleteDoc(ref); } catch (_) { /* 없어도 OK */ }
    return;
  }
  await setDoc(
    ref,
    {
      studentId,
      date,
      classMaterial: cmName
        ? { name: cmName, memo: (classMaterial?.memo || "").trim() }
        : null,
      homeworkMaterial: hmName
        ? {
            name: hmName,
            memo: (homeworkMaterial?.memo || "").trim(),
            status: homeworkMaterial?.status || null,
          }
        : null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// 여러 날짜에 동일 입력 fan-out
export async function bulkSaveDayHomework(studentId, dates, classMaterial, homeworkMaterial) {
  await Promise.all(
    dates.map((d) => saveDayHomework(studentId, d, classMaterial, homeworkMaterial))
  );
}

// 학생·날짜 doc 삭제
export async function deleteDayHomework(studentId, date) {
  const colRef = homeworkMonthCol(monthOf(date));
  try { await deleteDoc(doc(colRef, dayKey(studentId, date))); } catch (_) { /* 없어도 OK */ }
}

// 상태만 업데이트 (달력에서 상태 토글 시)
export async function updateHomeworkStatus(studentId, date, status) {
  const colRef = homeworkMonthCol(monthOf(date));
  const ref = doc(colRef, dayKey(studentId, date));
  await setDoc(
    ref,
    {
      homeworkMaterial: { status: status || null },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
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
