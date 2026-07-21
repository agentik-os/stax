/**
 * Profile — the account identity, editable from the avatar menu as a real
 * panel (sys:profile). One tiny shared store: the sidebar account block, the
 * avatar initials/picture and the profile panel all read the same truth,
 * persisted in localStorage.
 */
import { useRef, useSyncExternalStore } from "react";

export interface Profile {
  name: string;
  email: string;
  title: string;
  company: string;
  pronouns: string;
  location: string;
  link: string;
  bio: string;
  /** data-URL of the uploaded picture, or null for initials */
  avatar: string | null;
}

const DEFAULT: Profile = {
  name: "Gareth Agentik",
  email: "gareth@agentik-os.com",
  title: "Founder",
  company: "Agentik OS",
  pronouns: "",
  location: "",
  link: "agentik-os.com",
  bio: "",
  avatar: null,
};

function load(): Profile {
  try {
    const raw = JSON.parse(localStorage.getItem("frameword-profile") ?? "null");
    if (raw?.name) return { ...DEFAULT, ...raw };
  } catch { /* default */ }
  return DEFAULT;
}

let state: Profile = load();
const subs = new Set<() => void>();
export const profile = {
  get: () => state,
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  set: (patch: Partial<Profile>) => {
    state = { ...state, ...patch };
    localStorage.setItem("frameword-profile", JSON.stringify(state));
    subs.forEach((f) => f());
  },
  reset: () => profile.set(DEFAULT),
};
export const useProfile = () => useSyncExternalStore(profile.subscribe, profile.get);

export const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

/** The avatar bubble — picture if uploaded, initials otherwise. */
export function AvatarBubble({ size = 28 }: { size?: number }) {
  const p = useProfile();
  return p.avatar
    ? <img className="avatar" src={p.avatar} alt={p.name} style={{ width: size, height: size, objectFit: "cover" }} />
    : <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.39 }}>{initialsOf(p.name)}</span>;
}

function Row({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="pop-sub">{label}</div>
      <input className="d-input" style={{ width: "100%" }} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** The profile panel body. */
export function ProfileBody() {
  const p = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = (f: File) => {
    const r = new FileReader();
    r.onload = () => profile.set({ avatar: String(r.result) });
    r.readAsDataURL(f);
  };
  return (
    <>
      <div className="fs-head">
        <input className="fs-title" placeholder="Your name" aria-label="Full name" value={p.name}
          onChange={(e) => profile.set({ name: e.target.value })} />
        <input className="fs-sub" placeholder="Your role / title…" aria-label="Role / title" value={p.title}
          onChange={(e) => profile.set({ title: e.target.value })} />
      </div>
      <div className="section">
        <div className="lab">Picture</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
          <AvatarBubble size={56} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button className="d-btn outline sm" onClick={() => fileRef.current?.click()}>Upload photo…</button>
            {p.avatar && <button className="d-btn ghost sm" onClick={() => profile.set({ avatar: null })}>Use initials</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </div>
        <p style={{ fontSize: "calc(var(--fz-body, 13.5px) - 1.5px)", color: "var(--muted-foreground)", marginTop: 10 }}>
          Stored locally — the sidebar and every avatar in the app follow instantly.
        </p>
      </div>

      <div className="section">
        <div className="lab">Identity</div>
        <div style={{ marginTop: 2 }}>
          <Row label="Email" value={p.email} onChange={(v) => profile.set({ email: v })} />
          <Row label="Pronouns" value={p.pronouns} placeholder="e.g. they/them" onChange={(v) => profile.set({ pronouns: v })} />
        </div>
      </div>

      <div className="section">
        <div className="lab">About</div>
        <div style={{ marginTop: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Row label="Company" value={p.company} onChange={(v) => profile.set({ company: v })} />
            <Row label="Location" value={p.location} placeholder="e.g. Paris, FR" onChange={(v) => profile.set({ location: v })} />
          </div>
          <Row label="Website" value={p.link} placeholder="yoursite.com" onChange={(v) => profile.set({ link: v })} />
          <div className="pop-sub">Bio</div>
          <textarea className="d-input" style={{ width: "100%", height: 92, resize: "vertical" }}
            value={p.bio} placeholder="A few lines about you — shown on hover cards and in presence."
            onChange={(e) => profile.set({ bio: e.target.value })} />
        </div>
      </div>

      <button onClick={() => profile.reset()}
        style={{ textAlign: "center", padding: 8, fontSize: "calc(var(--fz-body, 13.5px) - 2px)", color: "var(--muted-foreground)", textDecoration: "underline", textUnderlineOffset: 2, width: "100%" }}>
        Reset profile to defaults
      </button>
    </>
  );
}
