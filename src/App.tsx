import { Route, Routes } from "react-router-dom";
import { Layout } from "./layouts/Layout";
import { HomePage } from "./pages/HomePage";
import { TermsDocumentPage } from "./pages/TermsDocumentPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { AnnouncementDetailPage } from "./pages/AnnouncementDetailPage";
import { InvitePage } from "./pages/InvitePage";
import { PersonaTeaserPage } from "./pages/PersonaTeaserPage";
import { QuizLandingPage } from "./pages/QuizLandingPage";
import { VaccinePassPage } from "./pages/VaccinePassPage";
import { CheckinInstallPage } from "./pages/CheckinInstallPage";
import { PartnerIntroPage } from "./pages/partner/PartnerIntroPage";
import { PartnerLoginPage } from "./pages/partner/PartnerLoginPage";
import { PartnerLayout } from "./pages/partner/PartnerLayout";
import { PartnerDashboardPage } from "./pages/partner/PartnerDashboardPage";
import { PartnerVenueNewPage } from "./pages/partner/PartnerVenueNewPage";
import { PartnerPosterPage } from "./pages/partner/PartnerPosterPage";
import { PartnerMePage } from "./pages/partner/PartnerMePage";
import { PartnerProfilePage } from "./pages/partner/PartnerProfilePage";
import { PartnerVerifyPage } from "./pages/partner/PartnerVerifyPage";
import { PartnerLocationPage } from "./pages/partner/PartnerLocationPage";
import { PartnerDeletePage } from "./pages/partner/PartnerDeletePage";

export default function App() {
  return (
    <Routes>
      {/* 광고 랜딩: 헤더/푸터 없는 집중형 퍼널이라 Layout 밖에 둔다. */}
      <Route path="/quiz" element={<QuizLandingPage />} />
      {/* 접종 확인 QR: 매장 직원이 웹으로 여는 단독 페이지. 반드시 /i/:code 보다 먼저 매칭되도록 Layout 밖·위에 둔다. */}
      <Route path="/i/pass/:token" element={<VaccinePassPage />} />
      {/* 업체(사장님) 포털: 로그인 후 화면은 사이트 헤더/푸터 없이 파트너 전용 껍데기로. */}
      <Route path="/partner/login" element={<PartnerLoginPage />} />
      <Route element={<PartnerLayout />}>
        <Route path="/partner/dashboard" element={<PartnerDashboardPage />} />
        <Route path="/partner/venues/new" element={<PartnerVenueNewPage />} />
        <Route path="/partner/verify" element={<PartnerVerifyPage />} />
        <Route path="/partner/location" element={<PartnerLocationPage />} />
        <Route path="/partner/delete" element={<PartnerDeletePage />} />
        <Route path="/partner/profile" element={<PartnerProfilePage />} />
        <Route path="/partner/poster" element={<PartnerPosterPage />} />
        <Route path="/partner/me" element={<PartnerMePage />} />
      </Route>
      <Route element={<Layout />}>
        <Route path="/partner" element={<PartnerIntroPage />} />
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
        <Route path="/i/type/:typeCode" element={<PersonaTeaserPage />} />
        {/* 매장 체크인 QR. 앱 설치 시 유니버설 링크로 앱이 열리고, 미설치면 매장명 + 설치 안내. */}
        <Route path="/i/checkin/:code" element={<CheckinInstallPage />} />
        <Route path="/i/:code" element={<InvitePage />} />
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  );
}
