import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { submitPublicFeedback, type FeedbackCategory } from "../lib/feedbackApi";

const MAX_IMAGES = 3;
const MAX_CONTENT = 2000;

const CATEGORIES: { value: FeedbackCategory; label: string; description: string }[] = [
  { value: "bug", label: "버그 신고", description: "동작이 이상하거나 오류가 났어요" },
  { value: "suggestion", label: "기능 제안", description: "이런 기능이 있으면 좋겠어요" },
  { value: "etc", label: "기타", description: "응원·후기·문의" },
];

export function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;
    const selected = Array.from(files).slice(0, remaining);
    setImages((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      const removed = prev[idx];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const canSubmit =
    !isSubmitting && content.trim().length > 0 && /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(email.trim());

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setStatus("idle");
    setErrorMessage(null);
    try {
      await submitPublicFeedback({
        category,
        content: content.trim(),
        contactEmail: email.trim(),
        images,
      });
      setStatus("success");
      setContent("");
      previews.forEach((url) => URL.revokeObjectURL(url));
      setImages([]);
      setPreviews([]);
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "피드백 전송에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container feedback-page">
      <header className="feedback-header">
        <h1>의견 보내기</h1>
        <p>발도장을 더 좋게 만드는 데 도움이 되는 모든 의견을 환영합니다. 가입 없이도 보낼 수 있어요.</p>
      </header>

      {status === "success" && (
        <div className="feedback-notice feedback-notice--success">
          의견을 보내주셔서 감사합니다! 운영팀에서 확인 후 적어주신 이메일로 회신드릴게요.
        </div>
      )}
      {status === "error" && (
        <div className="feedback-notice feedback-notice--error">{errorMessage}</div>
      )}

      <form className="feedback-form" onSubmit={onSubmit}>
        <section className="feedback-field">
          <label>카테고리</label>
          <div className="feedback-categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={category === cat.value ? "feedback-category active" : "feedback-category"}
              >
                <strong>{cat.label}</strong>
                <span>{cat.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="feedback-field">
          <label htmlFor="feedback-email">이메일 (답신용)</label>
          <input
            id="feedback-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </section>

        <section className="feedback-field">
          <label htmlFor="feedback-content">내용</label>
          <textarea
            id="feedback-content"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
            placeholder="어떤 부분이 불편했는지, 어떤 기능을 원하는지 자유롭게 적어주세요. 개인정보는 적지 않으셔도 됩니다."
            rows={8}
            required
          />
          <p className="feedback-counter">
            {content.length}/{MAX_CONTENT}
          </p>
        </section>

        <section className="feedback-field">
          <div className="feedback-image-header">
            <label>이미지 첨부 (선택, 최대 {MAX_IMAGES}장)</label>
            <button
              type="button"
              className="feedback-image-add"
              disabled={images.length >= MAX_IMAGES}
              onClick={() => fileInputRef.current?.click()}
            >
              추가
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onPickImages}
            />
          </div>
          {previews.length > 0 && (
            <div className="feedback-image-list">
              {previews.map((url, idx) => (
                <div key={url} className="feedback-image-item">
                  <img src={url} alt={`첨부 ${idx + 1}`} />
                  <button type="button" onClick={() => removeImage(idx)} aria-label="이미지 제거">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <button type="submit" className="feedback-submit" disabled={!canSubmit}>
          {isSubmitting ? "보내는 중…" : "의견 보내기"}
        </button>
      </form>
    </main>
  );
}
