import React from 'react';

interface Props {
  /** Whether the photo is shown with the reading; the switch appears only for signed-in people */
  showPhoto?: boolean;
  onShowPhotoChange?: (on: boolean) => void;
}

export const PrivacyBadge: React.FC<Props> = ({ showPhoto, onShowPhotoChange }) => {
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
          No words spoken. Your sketch photo is read in memory and never stored—only your emotional rhythm stays with you.
        </p>

        {onShowPhotoChange && (
          <div className="mt-3 pt-3 border-t border-borderHairline flex items-start justify-between gap-3">
            <div>
              <span id="photo-label" className="block text-xs sm:text-sm font-medium text-espressoInk">
                Show my drawing with the reading
              </span>
              <span id="photo-hint" className="block text-xs text-warmUmber leading-relaxed">
                {showPhoto
                  ? 'Your photo appears above your reading on this screen, then is discarded. It is never stored.'
                  : 'Off: your photo is discarded the moment it is read and never shown.'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showPhoto}
              aria-labelledby="photo-label"
              aria-describedby="photo-hint"
              onClick={() => onShowPhotoChange(!showPhoto)}
              className={`relative shrink-0 mt-0.5 w-11 h-6 rounded-full transition-colors cursor-pointer ${
                showPhoto ? 'bg-peachTerracotta' : 'bg-borderHairline'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-canvasPaper shadow-sm transition-transform ${
                  showPhoto ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
