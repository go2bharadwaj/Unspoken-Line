import React from 'react';

export const PrivacyBadge: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-borderHairline bg-turmericMist/20 p-4 flex items-start gap-3.5 text-left">
      <div className="p-2 rounded-xl bg-canvasPaper border border-borderHairline shrink-0 text-warmUmber">
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 stroke-current fill-none stroke-[1.75]"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Leaf / Line icon */}
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      </div>

      <div className="flex-1">
        <h4 className="text-xs uppercase tracking-widest text-warmUmber font-medium mb-1">
          Sanctuary Privacy Promise
        </h4>
        <p className="text-xs sm:text-sm text-espressoInk leading-relaxed">
          No words spoken. Your physical sketch photo vanishes from memory the moment it is read—only your emotional rhythm stays with you.
        </p>
      </div>
    </div>
  );
};
