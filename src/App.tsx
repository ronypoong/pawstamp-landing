import { Route, Routes } from "react-router-dom";
import { Layout } from "./layouts/Layout";
import { HomePage } from "./pages/HomePage";
import { TermsDocumentPage } from "./pages/TermsDocumentPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { AnnouncementDetailPage } from "./pages/AnnouncementDetailPage";
import { InvitePage } from "./pages/InvitePage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        {/* 약관 페이지는 모두 BE의 공개 약관 API에서 본문을 받아 렌더한다. 콘솔에서 발행본을 갱신하면 즉시 반영. */}
        <Route path="/terms" element={<TermsDocumentPage type="TERMS" />} />
        <Route path="/privacy" element={<TermsDocumentPage type="PRIVACY_POLICY" />} />
        <Route path="/privacy-consent" element={<TermsDocumentPage type="PRIVACY" />} />
        <Route path="/location" element={<TermsDocumentPage type="LOCATION" />} />
        <Route path="/marketing" element={<TermsDocumentPage type="MARKETING" />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        {/* 공지사항: 콘솔에서 작성한 발행 공지를 공개 API로 받아 렌더. */}
        <Route path="/notice" element={<AnnouncementsPage />} />
        <Route path="/notice/:announcementId" element={<AnnouncementDetailPage />} />
        {/* 공동보호자 초대 링크. 앱 설치 시 OS 가 앱을 바로 열고, 미설치면 이 페이지로 설치 유도. */}
        <Route path="/i/:code" element={<InvitePage />} />
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  );
}
