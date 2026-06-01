import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import CalendarPage from "./pages/CalendarPage";
import StudentsPage from "./pages/StudentsPage";
import ClassesPage from "./pages/ClassesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CalendarPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="classes" element={<ClassesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
