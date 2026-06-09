// 숙제 관련 공통 헬퍼
// 데이터 모델:
//   hw_homework/{YYYY-MM}/items/{studentId}_{YYYY-MM-DD} {
//     studentId, date,
//     classMaterial:    { name, memo, status }   // 수업교재 (+ 상태)
//     homeworkMaterial: { name, memo, status }   // 숙제교재 (+ 상태)
//   }
//   status: 'done' | 'partial' | 'none' | null
import { homeworkMonthCol } from "../firebase";
import { setDoc, doc, getDoc, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";

// 'YYYY-MM-DD' → 'YYYY-MM'
export const monthOf = (date) => date.slice(0, 7);

// 결정적 doc ID — 같은 학생·같은 날짜는 1개 문서로 upsert
export const dayKey = (studentId, date) => `${studentId}_${date}`;

// 기본 이름 (사용자 입력 비어있을 때)
export const DEFAULT_CLASS_NAME = "수업교재";
export const DEFAULT_HOMEWORK_NAME = "숙제교재";

// classMaterial/homeworkMaterial 이 의미있는지 (이름이 있어야 의미 있음)
export const hasClass = (doc) => !!(doc?.classMaterial?.name && doc.classMaterial.name.trim());
export const hasHomework = (doc) =>
  !!(doc?.homeworkMaterial?.name && doc.homeworkMaterial.name.trim());

// material 정규화: name 비어도 memo/status 있으면 기본 이름 적용. 셋 다 비면 null.
function materializeMaterial(mat, defaultName) {
  const name = (mat?.name || "").trim();
  const memo = (mat?.memo || "").trim();
  const status = mat?.status || null;
  if (!name && !memo && !status) return null;
  return {
    name: name || defaultName,
    memo,
    status,
  };
}

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
      ? {
          name: items[0].textbookName || "",
          memo: items[0].detail || "",
          status: items[0].status || null,
        }
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
  const cm = materializeMaterial(classMaterial, DEFAULT_CLASS_NAME);
  const hm = materializeMaterial(homeworkMaterial, DEFAULT_HOMEWORK_NAME);
  // 둘 다 비어있으면 doc 삭제
  if (!cm && !hm) {
    try { await deleteDoc(ref); } catch (_) { /* 없어도 OK */ }
    return;
  }
  await setDoc(
    ref,
    {
      studentId,
      date,
      classMaterial: cm,
      homeworkMaterial: hm,
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

// 여러 날짜 일괄 삭제 (한 학생)
export async function bulkDeleteDayHomework(studentId, dates) {
  await Promise.all(dates.map((d) => deleteDayHomework(studentId, d)));
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

// 한 학생·한 날짜 doc 1개 fetch (단발 복사·불러오기용)
//   → normalizeDoc 적용, 의미있는 데이터 없으면 null
export async function fetchDayHomework(studentId, date) {
  const colRef = homeworkMonthCol(monthOf(date));
  const snap = await getDoc(doc(colRef, dayKey(studentId, date)));
  if (!snap.exists()) return null;
  const n = normalizeDoc({ id: snap.id, ...snap.data() });
  if (!hasClass(n) && !hasHomework(n)) return null;
  return n;
}

// 한 학생의 한 달치 숙제 fetch (복사용)
//   → [{ date, classMaterial, homeworkMaterial }] (normalizeDoc 적용)
export async function fetchStudentMonth(studentId, yyyymm) {
  const colRef = homeworkMonthCol(yyyymm);
  const snap = await getDocs(colRef);
  const out = [];
  snap.forEach((d) => {
    const data = { id: d.id, ...d.data() };
    if (data.studentId !== studentId) return;
    const n = normalizeDoc(data);
    if (!hasClass(n) && !hasHomework(n)) return;
    out.push(n);
  });
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

// 학생 간 월 단위 복사
//   - srcMonth 의 srcStudentId 숙제 전체 → dstStudentIds 각각에게 dstMonth 같은 일자로 복사
//   - 타겟 월에 해당 일자가 없으면 (예: 2월 30일) skip
//   - 기존 doc 은 덮어쓰여짐 (saveDayHomework merge 동작)
// returns { copied: 학생당 복사된 doc 수, skipped: 일자 없음 skip 수 }
export async function copyHomeworkBetweenStudents({
  srcStudentId,
  srcMonth,
  dstStudentIds,
  dstMonth,
}) {
  const srcDocs = await fetchStudentMonth(srcStudentId, srcMonth);
  if (srcDocs.length === 0) return { copied: 0, skipped: 0 };

  // 타겟 월의 마지막 일자
  const [dy, dm] = dstMonth.split("-").map(Number);
  const dstLastDay = new Date(dy, dm, 0).getDate();

  let copied = 0;
  let skipped = 0;
  const tasks = [];

  for (const src of srcDocs) {
    const day = parseInt(src.date.slice(8, 10), 10);
    if (day > dstLastDay) {
      skipped += dstStudentIds.length;
      continue;
    }
    const newDate = `${dstMonth}-${String(day).padStart(2, "0")}`;
    for (const dstStudentId of dstStudentIds) {
      tasks.push(
        saveDayHomework(dstStudentId, newDate, src.classMaterial, src.homeworkMaterial)
      );
      copied++;
    }
  }
  await Promise.all(tasks);
  return { copied, skipped };
}
