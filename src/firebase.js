// Firebase 초기화 — yeggyam-attendance 프로젝트 공유, hw_* 컬렉션으로 격리
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDMK-Ezh0ak2DbsLoaCxceMAiGXCX7aEdo",
  authDomain: "yeggyam-attendance.firebaseapp.com",
  projectId: "yeggyam-attendance",
  storageBucket: "yeggyam-attendance.firebasestorage.app",
  messagingSenderId: "135565622021",
  appId: "1:135565622021:web:bddb19d9bfc7446c22d56c",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 컬렉션 헬퍼 — 출석앱과 충돌 방지를 위해 hw_ prefix 사용
export const COL = {
  classes: () => collection(db, "hw_classes"),
  students: () => collection(db, "hw_students"),
  textbooks: () => collection(db, "hw_textbooks"),
  // 월별 숙제: hw_homework/{YYYY-MM}/items/{hwId}
  homeworkMonth: (yyyymm) => collection(db, "hw_homework", yyyymm, "items"),
  homeworkMonthDoc: (yyyymm) => doc(db, "hw_homework", yyyymm),
};
