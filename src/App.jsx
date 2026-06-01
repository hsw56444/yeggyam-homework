import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import CalendarPage from "./pages/CalendarPage";
import HomeworkPage from "./pages/HomeworkPage";
import StudentsPage from "./pages/StudentsPage";
import ClassesPage from "./pages/ClassesPage";
import TextbooksPage from "./pages/TextbooksPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CalendarPage />} />
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="textbooks" element={<TextbooksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
