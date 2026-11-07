import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { UnsupportedImageError, isAcceptedImage, resizeImage } from "../../lib/imageResize";
import {
  PHOTO_LIMIT,
  PartnerApiError,
  deleteVenuePhoto,
  fetchPartnerTags,
  fetchVenueProfile,
  reorderVenuePhotos,
  saveVenueProfile,
  uploadVenuePhoto,
  type HoursDay,
  type HoursEntry,
  type TagDef,
  type Venue,
  type VenuePhoto,
  type VenueProfile,
  type VenueProfileInput,
} from "../../lib/partnerApi";
import { usePartner } from "./PartnerLayout";
import { AppPreview } from "./ProfilePreview";
import { VenueLocationCard } from "./VenueLocationCard";
import { VenueTitle } from "./VenueTitle";
import { UnlistedBanner } from "./UnlistedBanner";

const TAGLINE_MAX = 40;
const DESCRIPTION_MAX = 1000;
const HOURS_NOTE_MAX = 100;
const CUSTOM_TAG_MAX = 3;
const FILE_MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
const CUSTOM_TAG_RE = /^[가-힣a-zA-Z0-9]{2,10}$/;
/** 최소 금칙어(서버에서도 거른다). */
const BANNED = ["시발", "씨발", "개새", "병신", "섹스", "fuck", "shit"];

export const DAYS: { day: HoursDay; label: string }[] = [
  { day: "MON", label: "월" },
  { day: "TUE", label: "화" },
  { day: "WED", label: "수" },
  { day: "THU", label: "목" },
  { day: "FRI", label: "금" },
  { day: "SAT", label: "토" },
  { day: "SUN", label: "일" },
  { day: "HOLIDAY", label: "공휴일" },
];

type Slot =
  | { key: string; kind: "photo"; photo: VenuePhoto }
  | { key: string; kind: "upload"; preview: string | null; name: string; progress: number; file: File; error: string | null };

function toDraft(p: VenueProfile): VenueProfileInput {
  const hours = p.hours.length
    ? DAYS.map(({ day }) => p.hours.find((h) => h.day === day) ?? { day, open: "10:00", close: "21:00", closed: true })
    : [];
  return {
    tagline: p.tagline ?? "",
    description: p.description ?? "",
    hours,
    hoursNote: p.hoursNote ?? "",
    phone: p.phone ?? "",
    instagramUrl: p.instagramUrl ?? "",
    websiteUrl: p.websiteUrl ?? "",
    tags: { preset: [...p.tags.preset], custom: [...p.tags.custom] },
  };
}

/** "@handle" · "instagram.com/handle" · 전체 URL → https://instagram.com/handle. 형식이 아니면 null. */
export function normalizeInstagram(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "";
  const handle = v.startsWith("@") ? v.slice(1) : null;
  if (handle && /^[A-Za-z0-9._]{1,30}$/.test(handle)) return `https://instagram.com/${handle}`;
  const m = v.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:\?.*)?$/i);
  if (m) return `https://instagram.com/${m[1]}`;
  if (/^[A-Za-z0-9._]{1,30}$/.test(v)) return `https://instagram.com/${v}`;
  return null;
}

function normalizeWebsite(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "";
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(url);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

function errText(e: unknown, fallback: string): string {
  return e instanceof PartnerApiError ? e.message : fallback;
}

type LoadState = { kind: "loading" } | { kind: "ready"; profile: VenueProfile; tags: TagDef[] } | { kind: "error" };

export function PartnerProfilePage() {
  const { venue, handleAuthError } = usePartner();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    document.title = "매장 꾸미기 — 발도장 파트너";
  }, []);

  useEffect(() => {
    if (!venue) return;
    let alive = true;
    setState({ kind: "loading" });
    Promise.all([fetchVenueProfile(venue.id), fetchPartnerTags()])
      .then(([profile, tags]) => alive && setState({ kind: "ready", profile, tags }))
      .catch((e) => {
        if (!alive || handleAuthError(e)) return;
        setState({ kind: "error" });
      });
    return () => {
      alive = false;
    };
  }, [venue, reload, handleAuthError]);

  if (!venue) return null;
  if (state.kind === "loading") {
    return (
      <div className="p-skeleton-stack" aria-busy="true" aria-label="불러오는 중">
        <div className="pass-skeleton p-skeleton-lg" />
        <div className="pass-skeleton p-skeleton-md" />
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="p-card p-empty">
        <p className="p-empty-title">매장 정보를 불러오지 못했어요</p>
        <button type="button" className="p-btn p-btn--ghost p-btn--sm" onClick={() => setReload((r) => r + 1)}>
          다시 시도
        </button>
      </div>
    );
  }
  return <ProfileEditor key={venue.id} venue={venue} initial={state.profile} tagDefs={state.tags} />;
}

function ProfileEditor({ venue, initial, tagDefs }: { venue: Venue; initial: VenueProfile; tagDefs: TagDef[] }) {
  const { handleAuthError, setDirty } = usePartner();
  const [baseline, setBaseline] = useState<VenueProfileInput>(() => toDraft(initial));
  const [draft, setDraft] = useState<VenueProfileInput>(() => toDraft(initial));
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErr, setFieldErr] = useState<{ instagram?: string; website?: string }>({});

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);
  const instaRef = useRef<HTMLInputElement>(null);
  const webRef = useRef<HTMLInputElement>(null);

  // 저장 성공 문구는 잠깐 보여주고 저장 바를 내린다.
  useEffect(() => {
    if (!saveMsg?.ok) return;
    const t = window.setTimeout(() => setSaveMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [saveMsg]);

  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  const patch = (p: Partial<VenueProfileInput>) => {
    setDraft((d) => ({ ...d, ...p }));
    setSaveMsg(null);
  };

  // ── 사진 ──
  const photos = usePhotoSlots(venue.id, initial.photos, handleAuthError);

  async function save() {
    const insta = normalizeInstagram(draft.instagramUrl ?? "");
    const web = normalizeWebsite(draft.websiteUrl ?? "");
    const errs: typeof fieldErr = {};
    if (insta === null) errs.instagram = "인스타그램 주소(instagram.com/계정) 또는 @계정으로 입력해 주세요.";
    if (web === null) errs.website = "웹사이트 주소를 다시 확인해 주세요.";
    setFieldErr(errs);
    if (errs.instagram || errs.website) {
      const target = errs.instagram ? instaRef.current : webRef.current;
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      target?.focus({ preventScroll: true });
      setSaveMsg({ ok: false, text: errs.instagram ? "인스타그램 주소를 확인해 주세요." : "웹사이트 주소를 확인해 주세요." });
      return;
    }
    const blank = (v: string | null) => (v && v.trim() ? v.trim() : null);
    const input: VenueProfileInput = {
      tagline: blank(draft.tagline),
      description: blank(draft.description),
      hours: draft.hours,
      hoursNote: blank(draft.hoursNote),
      phone: blank(draft.phone),
      instagramUrl: blank(insta),
      websiteUrl: blank(web),
      tags: draft.tags,
    };
    setSaving(true);
    setSaveMsg(null);
    try {
      const saved = await saveVenueProfile(venue.id, input);
      const next = toDraft({ ...saved, photos: [] });
      setBaseline(next);
      setDraft(next);
      setSaveMsg({ ok: true, text: "저장했어요. 발도장 앱에 바로 반영돼요." });
    } catch (e) {
      if (handleAuthError(e)) return;
      setSaveMsg({ ok: false, text: errText(e, "저장하지 못했어요. 잠시 후 다시 시도해 주세요.") });
    } finally {
      setSaving(false);
    }
  }

  const visiblePhotos = photos.slots.flatMap((s) => (s.kind === "photo" && !s.photo.hidden ? [s.photo] : []));
  const barVisible = dirty || !!saveMsg;
  const completeness = [
    { label: "대표 사진", done: visiblePhotos.length > 0 },
    { label: "한 줄 소개", done: !!draft.tagline?.trim() },
    { label: "영업시간", done: draft.hours.length > 0 },
    { label: "태그", done: draft.tags.preset.length + draft.tags.custom.length > 0 },
  ];
  const preview = (
    <AppPreview venue={venue} draft={draft} photos={visiblePhotos} tagDefs={tagDefs} hidden={initial.hiddenByAdmin} />
  );

  return (
    <div className={`pf${barVisible ? " has-bar" : ""}`}>
      {initial.hiddenByAdmin && (
        <div className="p-banner p-banner--warn pf-hidden" role="alert">
          <div>
            <b>지금 발도장 앱에서 매장 소개가 숨겨져 있어요.</b>
            {initial.hiddenReason && <div>사유: {initial.hiddenReason}</div>}
            <div className="pf-hidden-sub">
              내용을 고친 뒤 <a href="mailto:pawstamp@rubi-on.com">pawstamp@rubi-on.com</a> 으로 알려 주시면 다시 확인해 드려요.
            </div>
          </div>
        </div>
      )}

      <div className="pf-layout">
        <div className="pf-form">
          <VenueTitle suffix="꾸미기" sub="사진과 소개를 채우면 발도장 앱 나들이 장소에 우리 매장이 더 잘 보여요." />
          <UnlistedBanner />
          <p className="pf-progress">
              {completeness.map((c, i) => (
                <span key={c.label} className={c.done ? "is-done" : undefined}>
                  {i > 0 && " · "}
                  {c.label}
                  {c.done && " ✓"}
                </span>
              ))}{" "}
              ({completeness.filter((c) => c.done).length}/{completeness.length})
          </p>

          <section className="p-card pf-location">
            <VenueLocationCard venue={venue} compact />
          </section>

          <details className="p-card pf-preview-m">
            <summary>앱에서 어떻게 보이는지 보기</summary>
            {preview}
          </details>

          <PhotoSection photos={photos} />

          <section className="p-card">
            <h2 className="p-card-title">소개</h2>
            <label className="p-field pf-first-field">
              <span className="p-label pf-label-row">
                <span>
                  한 줄 소개 <span className="p-optional">(목록에 보여요)</span>
                </span>
                <Counter n={draft.tagline?.length ?? 0} max={TAGLINE_MAX} />
              </span>
              <input
                className="p-input"
                maxLength={TAGLINE_MAX}
                placeholder="예) 대형견도 마음껏 뛰노는 루프탑 애견카페"
                value={draft.tagline ?? ""}
                onChange={(e) => patch({ tagline: e.target.value })}
              />
            </label>
            <label className="p-field">
              <span className="p-label pf-label-row">
                상세 소개
                <Counter n={draft.description?.length ?? 0} max={DESCRIPTION_MAX} />
              </span>
              <textarea
                className="p-input pf-textarea"
                maxLength={DESCRIPTION_MAX}
                rows={6}
                placeholder="공간 크기, 이용 규칙, 메뉴, 주차 안내처럼 손님이 궁금해할 내용을 적어 주세요."
                value={draft.description ?? ""}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </label>
          </section>

          <HoursSection draft={draft} patch={patch} />

          <TagsSection draft={draft} patch={patch} tagDefs={tagDefs} />

          <section className="p-card">
            <h2 className="p-card-title">연락처</h2>
            <label className="p-field pf-first-field">
              <span className="p-label">전화번호</span>
              <input className="p-input" type="tel" inputMode="tel" placeholder="02-123-4567" value={draft.phone ?? ""} onChange={(e) => patch({ phone: e.target.value })} />
            </label>
            <label className="p-field">
              <span className="p-label">인스타그램</span>
              <input
                ref={instaRef}
                className="p-input"
                inputMode="url"
                autoCapitalize="off"
                placeholder="@계정 또는 instagram.com/계정"
                value={draft.instagramUrl ?? ""}
                onChange={(e) => patch({ instagramUrl: e.target.value })}
                aria-invalid={!!fieldErr.instagram}
              />
              {fieldErr.instagram && <span className="p-error pf-field-err">{fieldErr.instagram}</span>}
            </label>
            <label className="p-field">
              <span className="p-label">
                웹사이트 <span className="p-optional">(선택)</span>
              </span>
              <input
                ref={webRef}
                className="p-input"
                inputMode="url"
                autoCapitalize="off"
                placeholder="예) mungmung.co.kr"
                value={draft.websiteUrl ?? ""}
                onChange={(e) => patch({ websiteUrl: e.target.value })}
                aria-invalid={!!fieldErr.website}
              />
              {fieldErr.website && <span className="p-error pf-field-err">{fieldErr.website}</span>}
            </label>
          </section>

          <p className="p-legal pf-responsibility">
            올린 사진과 소개는 발도장 앱에 공개되며, 내용에 대한 책임은 매장에 있어요. 사실과 다르거나 부적절한 내용은 운영 정책에 따라
            숨겨질 수 있어요.
          </p>
        </div>

        <aside className="pf-preview" aria-label="앱 미리보기">
          {preview}
        </aside>
      </div>

      <div className={`pf-savebar${barVisible ? " is-visible" : ""}`} aria-hidden={!barVisible}>
        <div className="pf-savebar-row">
          <span className={`pf-savebar-msg${saveMsg && !saveMsg.ok ? " is-error" : ""}`} role="status" aria-live="polite">
            {saveMsg ? saveMsg.text : dirty ? "저장하지 않은 변경이 있어요" : ""}
          </span>
          {dirty && (
            <button
              type="button"
              className="p-btn p-btn--text p-btn--sm"
              disabled={saving}
              onClick={() => {
                if (window.confirm("저장하지 않은 변경을 되돌릴까요?")) {
                  setDraft(baseline);
                  setFieldErr({});
                  setSaveMsg(null);
                }
              }}
            >
              되돌리기
            </button>
          )}
          {dirty && (
            <button type="button" className="p-btn p-btn--primary" disabled={saving} onClick={() => void save()}>
              {saving ? "저장 중…" : "저장"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Counter({ n, max }: { n: number; max: number }) {
  return (
    <span className={`pf-counter${n >= max ? " is-max" : ""}`} aria-live="off">
      {n}/{max}
    </span>
  );
}

// ─── 사진 ────────────────────────────────────
type PhotoSlots = ReturnType<typeof usePhotoSlots>;

function usePhotoSlots(venueId: number, initial: VenuePhoto[], handleAuthError: (e: unknown) => boolean) {
  const [slots, setSlots] = useState<Slot[]>(() => initial.map((p) => ({ key: `p${p.id}`, kind: "photo", photo: p })));
  const [notice, setNotice] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const seq = useRef(0);

  // 미리보기 objectURL 정리
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const update = (key: string, fn: (s: Slot) => Slot) => setSlots((list) => list.map((s) => (s.key === key ? fn(s) : s)));

  const runUpload = useCallback(
    (key: string, file: File) => {
      queue.current = queue.current.then(async () => {
        try {
          const { blob, name } = await resizeImage(file);
          if (blob.size > FILE_MAX_BYTES) throw new PartnerApiError(413, "10MB 이하 사진만 올릴 수 있어요.");
          const photo = await uploadVenuePhoto(venueId, blob, name, (r) =>
            update(key, (s) => (s.kind === "upload" ? { ...s, progress: r } : s)),
          );
          update(key, () => ({ key, kind: "photo", photo }));
        } catch (e) {
          if (handleAuthError(e)) return;
          // 변환 불가 형식(크롬의 HEIC 등)은 다시 시도해도 안 되므로 타일을 빼고 안내만.
          if (e instanceof UnsupportedImageError) {
            setSlots((list) => list.filter((s) => s.key !== key));
            setNotice(e.message);
            return;
          }
          const msg = e instanceof PartnerApiError ? e.message : "올리지 못했어요";
          update(key, (s) => (s.kind === "upload" ? { ...s, error: msg, progress: 0 } : s));
        }
      });
    },
    [venueId, handleAuthError],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      setNotice(null);
      const images = files.filter(isAcceptedImage);
      if (images.length < files.length) setNotice("JPG·PNG·WEBP 사진만 올릴 수 있어요.");
      setSlots((list) => {
        const room = PHOTO_LIMIT - list.length;
        if (room <= 0) {
          setNotice(`사진은 최대 ${PHOTO_LIMIT}장까지 올릴 수 있어요.`);
          return list;
        }
        if (images.length > room) setNotice(`최대 ${PHOTO_LIMIT}장이라 앞의 ${room}장만 올릴게요.`);
        const added: Slot[] = images.slice(0, room).map((file) => {
          const key = `u${++seq.current}`;
          let preview: string | null = null;
          try {
            preview = URL.createObjectURL(file);
            urls.current.push(preview);
          } catch {
            preview = null;
          }
          return { key, kind: "upload", preview, name: file.name, progress: 0, file, error: null };
        });
        // setState 안에서 바로 업로드를 걸면 StrictMode 이중 호출로 두 번 올라갈 수 있어 다음 틱으로 넘긴다.
        window.setTimeout(() => added.forEach((s) => s.kind === "upload" && runUpload(s.key, s.file)), 0);
        return [...list, ...added];
      });
    },
    [runUpload],
  );

  const retry = (key: string) => {
    const slot = slots.find((s) => s.key === key);
    if (slot?.kind !== "upload") return;
    update(key, (s) => (s.kind === "upload" ? { ...s, error: null, progress: 0 } : s));
    runUpload(key, slot.file);
  };

  const discard = (key: string) => setSlots((list) => list.filter((s) => s.key !== key));

  const remove = async (photo: VenuePhoto, index: number) => {
    const msg = index === 0 ? "대표 사진을 삭제할까요? 다음 사진이 대표가 돼요." : "이 사진을 삭제할까요?";
    if (!window.confirm(msg)) return;
    try {
      await deleteVenuePhoto(venueId, photo.id);
      setSlots((list) => list.filter((s) => !(s.kind === "photo" && s.photo.id === photo.id)));
    } catch (e) {
      if (!handleAuthError(e)) setNotice(errText(e, "삭제하지 못했어요."));
    }
  };

  /** 완료된 사진만 순서 저장. 실패하면 원래 순서로 되돌린다. */
  const move = async (from: number, to: number) => {
    if (from === to || to < 0 || to >= slots.length) return;
    const prev = slots;
    const next = [...slots];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setSlots(next);
    const ids = next.flatMap((s) => (s.kind === "photo" ? [s.photo.id] : []));
    try {
      await reorderVenuePhotos(venueId, ids);
    } catch (e) {
      if (handleAuthError(e)) return;
      setSlots(prev);
      setNotice(errText(e, "순서를 바꾸지 못했어요."));
    }
  };

  return { slots, notice, addFiles, retry, discard, remove, move };
}

function PhotoSection({ photos }: { photos: PhotoSlots }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const { slots } = photos;
  const busy = slots.some((s) => s.kind === "upload" && !s.error);
  const full = slots.length >= PHOTO_LIMIT;

  const onGridDrop = (e: DragEvent) => {
    if (e.dataTransfer.files?.length) {
      e.preventDefault();
      setFileOver(false);
      photos.addFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <section className="p-card">
      <div className="pf-section-head">
        <h2 className="p-card-title">
          사진 <span className="pf-counter">{slots.length}/{PHOTO_LIMIT}</span>
        </h2>
        <button type="button" className="p-btn p-btn--ghost p-btn--sm" disabled={full} onClick={() => inputRef.current?.click()}>
          사진 추가
        </button>
      </div>
      <p className="p-hint pf-hint">
        첫 번째 사진이 앱 목록에 보이는 대표 사진이에요. '대표로'를 누르거나 끌어서 순서를 바꿀 수 있어요. <b>사진은 올리는 즉시 앱에 반영돼요.</b>
        <br />
        직접 찍었거나 사용 권한이 있는 사진만 올려 주세요.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          photos.addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <ul
        className={`pf-photos${fileOver ? " is-file-over" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setFileOver(true);
          }
        }}
        onDragLeave={() => setFileOver(false)}
        onDrop={onGridDrop}
      >
        {slots.map((s, i) => {
          const isPhoto = s.kind === "photo";
          return (
            <li
              key={s.key}
              className={`pf-photo${dragOver === i && dragFrom !== null && dragFrom !== i ? " is-drop" : ""}${dragFrom === i ? " is-dragging" : ""}`}
              draggable={isPhoto}
              onDragStart={(e) => {
                setDragFrom(i);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
              }}
              onDragOver={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                setDragOver(i);
              }}
              onDrop={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                e.stopPropagation();
                void photos.move(dragFrom, i);
                setDragFrom(null);
                setDragOver(null);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
            >
              {isPhoto ? (
                <img
                  src={s.photo.thumbnailUrl || s.photo.url}
                  alt={`매장 사진 ${i + 1}`}
                  draggable={false}
                  className={s.photo.hidden ? "is-hidden" : undefined}
                />
              ) : s.preview ? (
                <img src={s.preview} alt="" className="pf-photo-pending" draggable={false} />
              ) : (
                <span className="pf-photo-noprev">{s.name}</span>
              )}

              {i === 0 && isPhoto && <span className="pf-photo-badge">대표</span>}
              {isPhoto && s.photo.hidden && <span className={`pf-photo-badge pf-photo-badge--hidden${i === 0 ? " is-second" : ""}`}>운영자가 숨김</span>}

              {s.kind === "upload" && !s.error && (
                <span className="pf-photo-progress" aria-label="올리는 중">
                  <span style={{ width: `${Math.max(6, Math.round(s.progress * 100))}%` }} />
                </span>
              )}
              {s.kind === "upload" && s.error && (
                <span className="pf-photo-fail" role="alert">
                  <span>{s.error}</span>
                  <span className="pf-photo-fail-actions">
                    <button type="button" onClick={() => photos.retry(s.key)}>
                      다시 시도
                    </button>
                    <button type="button" onClick={() => photos.discard(s.key)}>
                      빼기
                    </button>
                  </span>
                </span>
              )}

              {isPhoto && (
                <>
                  <button type="button" aria-label={`${i + 1}번째 사진 삭제`} className="pf-photo-del" onClick={() => void photos.remove(s.photo, i)}>
                    ×
                  </button>
                  <span className="pf-photo-actions">
                    {i > 0 && (
                      <button type="button" className="pf-photo-cover" onClick={() => void photos.move(i, 0)}>
                        대표로
                      </button>
                    )}
                    <span className="pf-photo-arrows">
                      <button type="button" aria-label="앞으로" disabled={i === 0} onClick={() => void photos.move(i, i - 1)}>
                        ‹
                      </button>
                      <button type="button" aria-label="뒤로" disabled={i === slots.length - 1} onClick={() => void photos.move(i, i + 1)}>
                        ›
                      </button>
                    </span>
                  </span>
                </>
              )}
            </li>
          );
        })}
        {!full && (
          <li className="pf-photo pf-photo-add">
            <button type="button" onClick={() => inputRef.current?.click()}>
              <span aria-hidden>＋</span>
              {slots.length === 0 ? "사진 올리기" : "추가"}
            </button>
          </li>
        )}
      </ul>
      {busy && <p className="p-hint">사진을 올리는 중이에요. 창을 닫지 말아 주세요.</p>}
      {photos.notice && <p className="p-error">{photos.notice}</p>}
    </section>
  );
}

// ─── 영업시간 ────────────────────────────────
function HoursSection({ draft, patch }: { draft: VenueProfileInput; patch: (p: Partial<VenueProfileInput>) => void }) {
  const [bulk, setBulk] = useState({ open: "10:00", close: "21:00" });
  const hours = draft.hours;
  const set = (day: HoursDay, p: Partial<HoursEntry>) => patch({ hours: hours.map((h) => (h.day === day ? { ...h, ...p } : h)) });

  if (hours.length === 0) {
    return (
      <section className="p-card">
        <h2 className="p-card-title">영업시간</h2>
        <p className="p-hint">영업시간을 넣으면 앱에서 '오늘 영업 중'을 바로 보여줄 수 있어요.</p>
        <button
          type="button"
          className="p-btn p-btn--ghost p-btn--block"
          onClick={() => patch({ hours: DAYS.map(({ day }) => ({ day, open: "10:00", close: "21:00", closed: day === "HOLIDAY" })) })}
        >
          영업시간 입력하기
        </button>
      </section>
    );
  }

  return (
    <section className="p-card">
      <div className="pf-section-head">
        <h2 className="p-card-title">영업시간</h2>
        <button
          type="button"
          className="p-btn p-btn--text p-btn--sm"
          onClick={() => {
            if (window.confirm("영업시간을 모두 지울까요?")) patch({ hours: [], hoursNote: "" });
          }}
        >
          모두 지우기
        </button>
      </div>
      <div className="pf-bulk">
        <span className="pf-bulk-label">영업일 시간 한 번에 바꾸기</span>
        <input type="time" className="p-input pf-time" value={bulk.open} onChange={(e) => setBulk({ ...bulk, open: e.target.value })} aria-label="일괄 여는 시간" />
        <span aria-hidden>~</span>
        <input type="time" className="p-input pf-time" value={bulk.close} onChange={(e) => setBulk({ ...bulk, close: e.target.value })} aria-label="일괄 닫는 시간" />
        <button
          type="button"
          className="p-btn p-btn--ghost p-btn--sm"
          onClick={() => patch({ hours: hours.map((h) => (h.closed ? h : { ...h, open: bulk.open, close: bulk.close })) })}
        >
          적용
        </button>
      </div>
      <p className="p-hint">쉬는 요일은 스위치를 꺼 주세요. 한 번에 바꾸기는 영업하는 날에만 적용돼요.</p>
      <ul className="pf-hours">
        {DAYS.map(({ day, label }) => {
          const h = hours.find((x) => x.day === day)!;
          return (
            <li key={day} className={h.closed ? "is-closed" : undefined}>
              <span className="pf-day">{label}</span>
              <label className="pf-switch">
                <input type="checkbox" checked={!h.closed} onChange={(e) => set(day, { closed: !e.target.checked })} />
                <span className="pf-switch-track" aria-hidden />
                <span className="pf-switch-text">{h.closed ? "휴무" : "영업"}</span>
              </label>
              {h.closed ? (
                <span className="pf-closed-text">쉬는 날</span>
              ) : (
                <span className="pf-times">
                  <input type="time" className="p-input pf-time" value={h.open} onChange={(e) => set(day, { open: e.target.value })} aria-label={`${label} 여는 시간`} />
                  <span aria-hidden>~</span>
                  <input type="time" className="p-input pf-time" value={h.close} onChange={(e) => set(day, { close: e.target.value })} aria-label={`${label} 닫는 시간`} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <label className="p-field">
        <span className="p-label pf-label-row">
          영업시간 메모 <Counter n={draft.hoursNote?.length ?? 0} max={HOURS_NOTE_MAX} />
        </span>
        <input
          className="p-input"
          maxLength={HOURS_NOTE_MAX}
          placeholder="예) 라스트오더 20:30, 브레이크타임 15~16시"
          value={draft.hoursNote ?? ""}
          onChange={(e) => patch({ hoursNote: e.target.value })}
        />
      </label>
    </section>
  );
}

// ─── 태그 ────────────────────────────────────
function TagsSection({ draft, patch, tagDefs }: { draft: VenueProfileInput; patch: (p: Partial<VenueProfileInput>) => void; tagDefs: TagDef[] }) {
  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const { preset, custom } = draft.tags;

  const toggle = (code: string) =>
    patch({ tags: { custom, preset: preset.includes(code) ? preset.filter((c) => c !== code) : [...preset, code] } });

  const add = () => {
    const v = input.trim().replace(/^#/, "");
    if (!v) return;
    if (custom.length >= CUSTOM_TAG_MAX) return setErr(`직접 태그는 ${CUSTOM_TAG_MAX}개까지예요.`);
    if (!CUSTOM_TAG_RE.test(v)) return setErr("2~10자 한글·영문·숫자로 입력해 주세요(띄어쓰기·기호 제외).");
    if (BANNED.some((b) => v.toLowerCase().includes(b))) return setErr("사용할 수 없는 단어가 있어요.");
    if (custom.includes(v) || tagDefs.some((t) => t.label.replace(/\s/g, "") === v)) return setErr("이미 있는 태그예요.");
    patch({ tags: { preset, custom: [...custom, v] } });
    setInput("");
    setErr(null);
  };

  return (
    <section className="p-card">
      <h2 className="p-card-title">태그</h2>
      <p className="p-hint">손님이 앱에서 조건으로 찾을 때 쓰여요. 해당하는 걸 모두 골라 주세요.</p>
      <div className="pf-chips" role="group" aria-label="태그 선택">
        {tagDefs.map((t) => {
          const on = preset.includes(t.code);
          return (
            <button key={t.code} type="button" className={`pf-chip${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => toggle(t.code)}>
              {on && <span aria-hidden>✓</span>}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-field pf-custom">
        <span className="p-label pf-label-row">
          직접 태그 <span className="pf-counter">{custom.length}/{CUSTOM_TAG_MAX}</span>
        </span>
        {custom.length > 0 && (
          <div className="pf-chips pf-chips--custom">
            {custom.map((c) => (
              <span key={c} className="pf-chip is-on pf-chip--custom">
                #{c}
                <button
                  type="button"
                  aria-label={`${c} 태그 삭제`}
                  onClick={() => patch({ tags: { preset, custom: custom.filter((x) => x !== c) } })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {custom.length < CUSTOM_TAG_MAX && (
          <div className="pf-custom-row">
            <input
              className="p-input"
              placeholder="예) 생일파티"
              maxLength={11}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setErr(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <button type="button" className="p-btn p-btn--ghost" onClick={add}>
              추가
            </button>
          </div>
        )}
        {err && <p className="p-error">{err}</p>}
      </div>
    </section>
  );
}
