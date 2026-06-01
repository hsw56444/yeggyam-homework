import { useState } from "react";
import { COL } from "../firebase";
import { useCollection } from "../hooks/useCollection";
import IndividualForm from "../components/homework/IndividualForm";
import BulkForm from "../components/homework/BulkForm";
import CopyForm from "../components/homework/CopyForm";
import MonthCopyButton from "../components/homework/MonthCopyButton";

const TABS = [
  { key: "individual", label: "👤 개별 등록" },
  { key: "bulk", label: "🏫 반 일괄" },
  { key: "copy", label: "📋 복사·붙여넣기" },
  { key: "month", label: "📆 월 복사" },
];

export default function HomeworkPage() {
  const [tab, setTab] = useState("individual");
  const [students] = useCollection(COL.students, "name");
  const [classes] = useCollection(COL.classes, "name");
  const [textbooks] = useCollection(COL.textbooks, "name");

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto bg-white rounded-lg p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-3 py-2 rounded text-sm font-bold ${
              tab === t.key
                ? "bg-indigo-600 text-white"
                : "bg-transparent text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "individual" && (
        <IndividualForm students={students} textbooks={textbooks} classes={classes} />
      )}
      {tab === "bulk" && (
        <BulkForm students={students} textbooks={textbooks} classes={classes} />
      )}
      {tab === "copy" && <CopyForm students={students} classes={classes} />}
      {tab === "month" && <MonthCopyButton />}
    </div>
  );
}
