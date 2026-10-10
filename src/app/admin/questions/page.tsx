import AdminQuestionManager from "./question-manager";

export const metadata = {
  title: "Question Manager — MARKS",
  robots: { index: false, follow: false },
};

export default function AdminQuestionsPage() {
  return <AdminQuestionManager />;
}
