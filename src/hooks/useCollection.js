// Firestore 컬렉션 라이브 구독 훅
import { useEffect, useState } from "react";
import { onSnapshot, orderBy, query } from "firebase/firestore";

export function useCollection(colRef, orderByField = null) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!colRef) return;
    setLoading(true);
    const q = orderByField ? query(colRef, orderBy(orderByField)) : colRef;
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        setItems(data);
        setLoading(false);
      },
      (err) => {
        console.error("useCollection error", err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [colRef, orderByField]);

  return [items, loading, error];
}
