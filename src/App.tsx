import { Route, Routes } from "react-router-dom";
import { Layout } from "./layouts/Layout";
import { HomePage } from "./pages/HomePage";
import { TermsDocumentPage } from "./pages/TermsDocumentPage";

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
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  );
}
