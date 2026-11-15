import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onSave: (age: number) => Promise<void>;
  onSignOut?: () => void;
}

const MIN_AGE = 13; // Google accounts require 13+, and the backend rejects anything younger
const MAX_AGE = 120;

/** Asked once after sign-in; every reading is sent with the person's age. */
export const AgeGate: React.FC<Props> = ({ onSave, onSignOut }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const age = Number(value);
    if (!Number.isInteger(age) || value.trim() === '') {
      setError('Please enter your age in whole years.');
      return;
    }
    if (age < MIN_AGE) {
      setError(`Unspoken Lines is for people ${MIN_AGE} and older.`);
      return;
    }
    if (age > MAX_AGE) {
      setError('Please check the number you entered.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(age);
    } catch {
      setError("Couldn't save that just now. Check your connection and try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-espressoInk/25 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-title"
        aria-describedby="age-hint"
        onSubmit={submit}
        noValidate // our messages explain the limits; the browser's generic ones would cover them
        className="w-full max-w-sm rounded-3xl border border-borderHairline bg-canvasPaper p-6 sm:p-8 text-left shadow-sm"
      >
        <span className="text-xs uppercase tracking-widest text-warmUmber">One quick thing</span>
        <h2 id="age-title" className="font-serif text-3xl font-medium text-espressoInk tracking-tight mt-1 mb-2">
          How old are you?
        </h2>
        <p id="age-hint" className="text-sm text-warmUmber leading-relaxed mb-5">
          Age can shape how a drawing reads, so it's shared with each reading. It's stored encrypted and used for
          nothing else.
        </p>
        <label htmlFor="age-input" className="sr-only">
          Your age in years
        </label>
        <input
          id="age-input"
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={MIN_AGE}
          max={MAX_AGE}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'age-error' : 'age-hint'}
          placeholder="Age"
          className="w-full px-4 py-3 rounded-2xl border border-borderHairline bg-canvasPaper text-lg text-espressoInk focus:outline-none focus:border-peachTerracotta"
        />
        {error && (
          <p id="age-error" role="alert" className="mt-2 text-sm text-blushClay">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full mt-5 py-3.5 rounded-full bg-peachTerracotta text-canvasPaper font-medium hover:bg-peachTerracotta/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full mt-3 text-xs text-warmUmber hover:text-espressoInk underline cursor-pointer"
          >
            Sign out instead
          </button>
        )}
      </form>
    </div>
  );
};
