// Firebase 초기화 — yeggyam-attendance 프로젝트 공유, hw_* 컬렉션으로 격리
import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";

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

export const COL = {
  classes: collection(db, "hw_classes"),
  students: collection(db, "hw_students"),
};

// 월별 동적 컬렉션
export function homeworkMonthCol(yyyymm) {
  return collection(db, "hw_homework", yyyymm, "items");
}
