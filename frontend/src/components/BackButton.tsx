import React from 'react';

/** Quiet "Back" link at the top-left of a step */
export const BackButton: React.FC<{ onClick: () => void; label?: string }> = ({
  onClick,
  label = 'Back',
}) => (
  <button
    type="button"
    onClick={onClick}
    className="self-start -ml-2 mb-6 inline-flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm text-warmUmber hover:text-espressoInk hover:bg-turmericMist/30 transition-colors cursor-pointer"
  >
    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    {label}
  </button>
);
