/**
 * EntryApp.tsx — the front door is a panel, and refusal is a first class state.
 *
 * Stax could describe every surface behind the login and nothing in front of it,
 * which left the most security sensitive screens in a product to be improvised.
 * These two shapes close that.
 *
 * ENTRY. A landing page ROUTES AND BRANDS. It never authorises. Capabilities are
 * the only gate and visibility config can only hide. So an entry is the same
 * panel component as everything else, at the registry M width: bar 44, body
 * 18/18/16, foot with exactly ONE primary. What differs between three entries is
 * the eyebrow, the copy, the sign in method and the REFUSAL SET. Nothing else
 * differs, which is the whole argument: three entrances, one product, one
 * identity, one session.
 *
 * REFUSAL. A denied element renders its empty expression, or renders nothing.
 * Never a hidden but present control. Never a greyed control whose tooltip names
 * the capability it wants. Never a masked value. Never a count that includes
 * rows the reader cannot see. Every refusal says what the person does NEXT, and
 * none of them discloses whether an account exists.
 *
 * A product is judged on its refusals, not on its success path, so each one here
 * carries what it ENFORCES, what it LEAKS, and the TRAP that makes it tempting
 * to build wrong.
 */
import { useState } from "react";

type Entry = {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  method: string;
  primary: string;
  alt: { label: string; to: string } | null;
};

const ENTRIES: Entry[] = [
  {
    id: "team",
    eyebrow: "Entry 01 · internal",
    title: "Team",
    copy: "For staff. One account, one session, every space your membership resolves to.",
    method: "Google, restricted to the company domain",
    primary: "Continue with Google",
    alt: { label: "Investor entrance", to: "investor" },
  },
  {
    id: "operator",
    eyebrow: "Entry 02 · portfolio",
    title: "Operator",
    copy: "For the people running a company. The same login before and after the closing: searching, then operating.",
    method: "Email link, any domain",
    primary: "Send me a link",
    alt: { label: "Team entrance", to: "team" },
  },
  {
    id: "investor",
    eyebrow: "Entry 03 · external",
    title: "Investor",
    copy: "For limited partners. Your statements, your capital calls, your documents.",
    method: "Email link, plus a second factor",
    primary: "Send me a link",
    alt: { label: "Team entrance", to: "team" },
  },
];

type Refusal = {
  id: string;
  stage: string;
  trigger: string;
  what: string;
  says: string;
  exit: string;
  enforced: string;
  leaks: string;
  trap: string;
  appliesTo: string;
};

const REFUSALS: Refusal[] = [
  {
    id: "r1",
    stage: "Before any session",
    trigger: "An account on another domain",
    what: "The identity provider refuses. No user is created, no session exists, and nothing downstream ever sees this person.",
    says: "This entrance is for staff and it accepts company accounts only.",
    exit: "Investor entrance",
    enforced: "A provider restriction on the sign in method, plus the server side roster match. A client side domain check is decoration.",
    leaks: "The domain rule, which is public. No address, no roster, no membership.",
    trap: "The restriction is per ENTRY, never instance wide: one identity provider also serves every investor and every portfolio company.",
    appliesTo: "Team",
  },
  {
    id: "r2",
    stage: "Session, no data",
    trigger: "A valid company address with no roster row",
    what: "Authentication succeeds. The member lookup throws NOT_PROVISIONED and creates nothing. The shell never mounts, so there is no manifest, no space, no panel, no query.",
    says: "You are signed in and this workspace has no record for you yet. Ask whoever set up your account to add you.",
    exit: "Sign out",
    enforced: "The member lookup, server side, before the shell renders.",
    leaks: "Nothing. The person already proved they own the address.",
    trap: "Auto provisioning on a first sign in is a self service account factory on a system holding other people's money.",
    appliesTo: "Team",
  },
  {
    id: "r3",
    stage: "Session, row, no access",
    trigger: "A roster row that is not active",
    what: "The member lookup throws SUSPENDED before any grant is read. A suspended person holds nothing, not a reduced set.",
    says: "This account is not active. Ask your administrator to restore it.",
    exit: "Sign out",
    enforced: "The member state, checked before grants are loaded.",
    leaks: "Nothing beyond the state of an account the person already owns.",
    trap: "A degraded read only workspace. There is no such state: suspended is not a smaller set of grants, it is none.",
    appliesTo: "Team, Operator, Investor",
  },
  {
    id: "r4",
    stage: "Session, no surface",
    trigger: "A valid account with no membership at all",
    what: "A real session, a member row possibly, and zero memberships. No manifest resolves, so the top bar has nothing to render. A surface without a membership is ABSENT, never greyed.",
    says: "You are signed in and there is nothing here for you yet. Your workspace appears the moment it is opened for you.",
    exit: "Contact us",
    enforced: "Manifest resolution. An unresolved manifest renders no space, not an empty one.",
    leaks: "Nothing. The sentence never names which membership is missing, because that answer describes what the company is doing.",
    trap: "Naming the missing org type in the copy. It reads helpful and it discloses the business.",
    appliesTo: "All three entries. The one refusal every entry shares.",
  },
  {
    id: "r5",
    stage: "Not a refusal, a choice",
    trigger: "More than one membership",
    what: "A person who is both a searcher and a board member resolves to two memberships. The entry does not choose for them and it does not merge them.",
    says: "Pick where you are working today. You can switch at any time.",
    exit: "",
    enforced: "Nothing to enforce: both memberships are legitimate.",
    leaks: "Only what this person already holds.",
    trap: "Silently picking the first membership. The reader then cannot tell which org their numbers belong to.",
    appliesTo: "All three entries",
  },
];

/* ── ENTRY: three doors, one component ───────────────────────────────── */

export function EntryBody() {
  const [at, setAt] = useState("team");
  const e = ENTRIES.find((x) => x.id === at)!;
  return (
    <>
      <div className="pf-toolbar">
        <div className="pf-seg">
          {ENTRIES.map((x) => (
            <button key={x.id} className={"aseg" + (at === x.id ? " on" : "")} onClick={() => setAt(x.id)}>
              {x.title}
            </button>
          ))}
        </div>
        <span className="foot-note" style={{ marginLeft: "auto" }}>M 480 · one component</span>
      </div>

      <div className="section">
        <div className="lab">THE DOOR, AT ITS REAL WIDTH</div>
        <div className="en-frame">
          <div className="en-door">
            <div className="en-bar"><span className="en-mark" aria-hidden="true" />Sign in</div>
            <div className="en-body">
              <div className="en-eyebrow">{e.eyebrow}</div>
              <div className="en-title">{e.title}</div>
              <p className="en-copy">{e.copy}</p>
              <div className="en-method">{e.method}</div>
            </div>
            <div className="en-foot">
              <button className="foot-cta">{e.primary}</button>
              {e.alt && (
                <button className="en-alt" onClick={() => setAt(e.alt!.to)}>{e.alt.label} →</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="lab">WHAT ACTUALLY DIFFERS</div>
        <div className="anat-row"><span className="a-lab">Between the three</span><span className="a-val">the eyebrow, the copy, the sign in method, the refusal set</span></div>
        <div className="anat-row"><span className="a-lab">Between the three</span><span className="a-val">nothing else, which is the point</span></div>
        <div className="anat-row"><span className="a-lab">A landing page</span><span className="a-val">routes and brands. It never authorises.</span></div>
        <div className="anat-row"><span className="a-lab">The only gate</span><span className="a-val">capabilities. Visibility config can only hide.</span></div>
      </div>
    </>
  );
}

/* ── REFUSAL: the state a product is actually judged on ──────────────── */

export function RefusalBody() {
  const [open, setOpen] = useState<string | null>("r1");
  return (
    <>
      <div className="mb-verdict hold">
        <span className="w">The law</span>
        <span className="r">A denied element renders its empty expression, or nothing. Never greyed with a tooltip naming the capability, never masked, never a count including rows the reader cannot see.</span>
      </div>

      <div className="section">
        <div className="lab">THE REFUSAL SET</div>
        {REFUSALS.map((r) => {
          const on = open === r.id;
          return (
            <div key={r.id} className={"en-ref" + (on ? " on" : "")}>
              <button className="hd" onClick={() => setOpen(on ? null : r.id)} aria-expanded={on}>
                <span className="st">{r.stage}</span>
                <span className="tg">{r.trigger}</span>
                <span className="ch" aria-hidden="true">{on ? "⌄" : "›"}</span>
              </button>
              {on && (
                <div className="bd">
                  <p className="what">{r.what}</p>
                  <div className="says">
                    <span className="q">{r.says}</span>
                    {r.exit && <span className="ex">{r.exit} →</span>}
                  </div>
                  <div className="anat-row"><span className="a-lab">Enforced by</span><span className="a-val">{r.enforced}</span></div>
                  <div className="anat-row"><span className="a-lab">Leaks</span><span className="a-val">{r.leaks}</span></div>
                  <div className="anat-row"><span className="a-lab">The trap</span><span className="a-val">{r.trap}</span></div>
                  <div className="anat-row"><span className="a-lab">Applies to</span><span className="a-val">{r.appliesTo}</span></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function EntryFoot({ kind }: { kind: string }) {
  if (kind === "enentry")
    return (
      <>
        <button className="foot-cta">Open the shell</button>
        <span className="foot-note">{ENTRIES.length} entries · one identity · one session</span>
      </>
    );
  // the refusal panel is a reference surface: it has nothing to submit
  return <span className="foot-note">{REFUSALS.length} refusals · a product is judged here, not on the success path</span>;
}

export function EntryPanelBody({ kind }: { kind: string }) {
  return kind === "enentry" ? <EntryBody /> : <RefusalBody />;
}
