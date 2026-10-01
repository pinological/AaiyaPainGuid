'use client';

import { useEffect, useRef, useState } from 'react';
import { clearCardCache, setLanguage } from '@/lib/actions';
import { LANGS, isLang } from '@/lib/i18n';
import { useStore, type Profile } from '@/lib/store';
import type { Gender } from '@/lib/types';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '@/lib/units';
import { tNow, useT } from '@/lib/useT';

const KEY = 'mirror.profile';
const SKIPPED = 'mirror.profile.skipped';

type Unit = 'kg' | 'lb';
type Field = 'age' | 'weight' | 'height' | 'gender';

function readSaved(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Profile | null;
    return p && p.age && p.weight_kg && p.height_cm && p.gender ? p : null;
  } catch {
    return null;
  }
}

/** Loads the saved language and profile, or opens the dialog on the first visit. Renders nothing itself. */
export function useProfileBoot() {
  const set = useStore((s) => s.set);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mirror.lang');
      if (isLang(saved)) set({ lang: saved }); // default stays English when nothing was chosen
    } catch {}
    const profile = readSaved();
    if (profile) return set({ profile });
    let skipped = false;
    try {
      skipped = localStorage.getItem(SKIPPED) === '1';
    } catch {}
    if (!skipped) set({ profileOpen: true });
  }, [set]);
}

export function ProfileDialog() {
  const open = useStore((s) => s.profileOpen);
  const profile = useStore((s) => s.profile);
  const set = useStore((s) => s.set);
  const ready = useStore((s) => s.ready); // the welcome dialog waits for the splash screen to lift
  if (!open || !ready) return null;
  return <Form key={profile ? 'edit' : 'new'} profile={profile} onClose={() => set({ profileOpen: false })} />;
}

function Form({ profile, onClose }: { profile: Profile | null; onClose: () => void }) {
  const { t, lang } = useT();
  const set = useStore((s) => s.set);
  const addMessage = useStore((s) => s.addMessage);
  const editing = !!profile;
  const initialFt = profile ? cmToFtIn(profile.height_cm) : null;

  const [age, setAge] = useState(profile ? String(profile.age) : '');
  const [unit, setUnit] = useState<Unit>('kg');
  const [weight, setWeight] = useState(profile ? String(profile.weight_kg) : '');
  const [ft, setFt] = useState(initialFt ? String(initialFt.ft) : '');
  const [inch, setInch] = useState(initialFt ? String(initialFt.inch) : '');
  const [gender, setGender] = useState<Gender | ''>(profile?.gender ?? '');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});

  const dialogRef = useRef<HTMLDivElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const ftRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  const genders: { value: Gender; label: string }[] = [
    { value: 'female', label: t('genderFemale') },
    { value: 'male', label: t('genderMale') },
    { value: 'other', label: t('genderOther') },
  ];

  // Validation: cause + how to fix, shown under the field after the user leaves it.
  const validate = (): Partial<Record<Field, string>> => {
    const e: Partial<Record<Field, string>> = {};
    const a = Number(age);
    if (!age.trim() || !Number.isInteger(a) || a < 12 || a > 110) e.age = t('errAge');
    const w = Number(weight);
    const [lo, hi] = unit === 'kg' ? [25, 300] : [55, 660];
    if (!weight.trim() || !(w >= lo && w <= hi)) e.weight = t('errWeight', { unit, lo, hi });
    const f = Number(ft);
    const i = inch.trim() === '' ? 0 : Number(inch);
    if (!ft.trim() || !Number.isInteger(f) || f < 3 || f > 8 || !Number.isInteger(i) || i < 0 || i > 11) e.height = t('errHeight');
    if (!gender) e.gender = t('errGender');
    return e;
  };

  // A field only starts complaining once it holds something (or after a submit attempt): tapping away from an empty,
  // auto-focused field (for example to change the language) must not flash an error.
  const hasValue = (f: Field) => (f === 'age' ? !!age.trim() : f === 'weight' ? !!weight.trim() : f === 'height' ? !!(ft.trim() || inch.trim()) : !!gender);
  const blur = (f: Field) => hasValue(f) && setTouched((x) => ({ ...x, [f]: true }));

  // Errors stay current as values (or the language) change, shown only for fields the user has already left.
  useEffect(() => {
    setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [age, weight, unit, ft, inch, gender, lang]);

  const changeUnit = (next: Unit) => {
    if (next === unit) return;
    const w = Number(weight);
    if (weight.trim() && w > 0) setWeight(String(next === 'lb' ? kgToLb(w) : lbToKg(w))); // keep the same weight
    setUnit(next);
  };

  const finish = (saved: boolean) => {
    if (!saved) {
      try {
        if (!editing) localStorage.setItem(SKIPPED, '1');
      } catch {}
    }
    onClose();
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setTouched({ age: true, weight: true, height: true, gender: true });
    const first = (['age', 'weight', 'height', 'gender'] as Field[]).find((f) => e[f]);
    if (first) {
      // move focus to the first invalid field
      (first === 'age' ? ageRef : first === 'weight' ? weightRef : first === 'height' ? ftRef : genderRef).current?.focus();
      return;
    }
    const w = Number(weight);
    const next: Profile = {
      age: Number(age),
      weight_kg: Math.round((unit === 'kg' ? w : lbToKg(w)) * 10) / 10,
      height_cm: ftInToCm(Number(ft), inch.trim() === '' ? 0 : Number(inch)),
      gender: gender as Gender,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      localStorage.removeItem(SKIPPED);
    } catch {}
    clearCardCache(); // answers are tailored to the profile
    set({ profile: next });
    addMessage({ role: 'ai', text: editing ? tNow('profileUpdated') : tNow('thanks') });
    finish(true);
  };

  // Focus handling: focus the first field, trap Tab inside, Escape closes, and focus returns to what opened it.
  useEffect(() => {
    opener.current = document.activeElement;
    ageRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === 'Escape') return finish(false);
    if (ev.key !== 'Tab') return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]');
    if (!nodes?.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  };

  const err = (f: Field) => (touched[f] ? errors[f] : undefined);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && finish(false)}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pf-title" aria-describedby="pf-help" ref={dialogRef} onKeyDown={onKeyDown}>
        <header>
          <h2 id="pf-title">{editing ? t('pfTitleEdit') : t('pfTitleNew')}</h2>
          <button type="button" className="icon-btn" onClick={() => finish(false)} aria-label={editing ? t('pfClose') : t('pfSkipNow')}>
            <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        {/* Language first: the rest of the dialog, and every answer, follows it. */}
        <div className="field lang-field">
          <span className="field-label" id="pf-lang-label">{t('pfLanguage')}</span>
          <div className="seg wide" role="radiogroup" aria-labelledby="pf-lang-label">
            {LANGS.map((l) => (
              <button type="button" key={l.code} role="radio" aria-checked={lang === l.code} lang={l.code} className={lang === l.code ? 'on' : ''} onClick={() => setLanguage(l.code)}>
                {l.native}
              </button>
            ))}
          </div>
        </div>

        <p id="pf-help" className="help">
          {t('pfHelp')}
        </p>

        <form onSubmit={submit} noValidate>
          <div className={`field${err('age') ? ' bad' : ''}`}>
            <label htmlFor="pf-age">{t('pfAge')}</label>
            <div className="input-wrap">
              <input id="pf-age" ref={ageRef} type="number" inputMode="numeric" autoComplete="off" min={12} max={110} value={age} onChange={(e) => setAge(e.target.value)} onBlur={() => blur('age')} aria-invalid={!!err('age')} aria-describedby={err('age') ? 'pf-age-err' : undefined} required />
              <span className="suffix">{t('pfYears')}</span>
            </div>
            {err('age') && <p className="error" id="pf-age-err" role="alert">{err('age')}</p>}
          </div>

          <div className={`field${err('weight') ? ' bad' : ''}`}>
            <label htmlFor="pf-weight">{t('pfWeight')}</label>
            <div className="row">
              <div className="input-wrap grow">
                <input id="pf-weight" ref={weightRef} type="number" inputMode="decimal" autoComplete="off" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} onBlur={() => blur('weight')} aria-invalid={!!err('weight')} aria-describedby={err('weight') ? 'pf-weight-err' : undefined} required />
              </div>
              <div className="seg" role="radiogroup" aria-label={t('pfWeightUnit')}>
                {(['kg', 'lb'] as Unit[]).map((u) => (
                  <button type="button" key={u} role="radio" aria-checked={unit === u} className={unit === u ? 'on' : ''} onClick={() => changeUnit(u)}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            {err('weight') && <p className="error" id="pf-weight-err" role="alert">{err('weight')}</p>}
          </div>

          <fieldset className={`field${err('height') ? ' bad' : ''}`}>
            <legend>{t('pfHeight')}</legend>
            <div className="row">
              <div className="input-wrap grow">
                <input ref={ftRef} id="pf-ft" type="number" inputMode="numeric" autoComplete="off" min={3} max={8} value={ft} onChange={(e) => setFt(e.target.value)} onBlur={() => blur('height')} aria-label={t('pfFeet')} aria-invalid={!!err('height')} aria-describedby={err('height') ? 'pf-height-err' : undefined} required />
                <span className="suffix">{t('pfFt')}</span>
              </div>
              <div className="input-wrap grow">
                <input id="pf-in" type="number" inputMode="numeric" autoComplete="off" min={0} max={11} value={inch} onChange={(e) => setInch(e.target.value)} onBlur={() => blur('height')} aria-label={t('pfInches')} aria-invalid={!!err('height')} aria-describedby={err('height') ? 'pf-height-err' : undefined} />
                <span className="suffix">{t('pfIn')}</span>
              </div>
            </div>
            {err('height') && <p className="error" id="pf-height-err" role="alert">{err('height')}</p>}
          </fieldset>

          <fieldset className={`field${err('gender') ? ' bad' : ''}`}>
            <legend>{t('pfGender')}</legend>
            <div className="choices" role="radiogroup" aria-label={t('pfGender')} ref={genderRef} tabIndex={-1}>
              {genders.map((g) => (
                <label key={g.value} className={gender === g.value ? 'on' : ''}>
                  <input type="radio" name="pf-gender" value={g.value} checked={gender === g.value} onChange={() => setGender(g.value)} onBlur={() => blur('gender')} />
                  {g.label}
                </label>
              ))}
            </div>
            {err('gender') && <p className="error" role="alert">{err('gender')}</p>}
          </fieldset>

          <div className="actions">
            <button type="submit" className="primary">
              {editing ? t('pfSave') : t('pfStart')}
            </button>
            <button type="button" className="ghost" onClick={() => finish(false)}>
              {editing ? t('pfCancel') : t('pfSkip')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
