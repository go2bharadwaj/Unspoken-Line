import React, { useState } from 'react';
import { isIOS, promptInstall, useInstallState } from '../lib/install';

/** Install button for when the browser's own prompt didn't show or was dismissed. Hidden inside the installed app. */
export const InstallApp: React.FC = () => {
  const state = useInstallState();
  const [showHow, setShowHow] = useState(false);
  if (state === 'installed') return null;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-2 pt-2 pb-6">
      <button
        type="button"
        onClick={() => (state === 'prompt' ? promptInstall() : setShowHow((s) => !s))}
        aria-expanded={state === 'manual' ? showHow : undefined}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-borderHairline text-xs text-warmUmber hover:text-espressoInk hover:bg-turmericMist/30 transition-colors cursor-pointer"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2" aria-hidden="true">
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Install Unspoken Lines
      </button>
      {state === 'manual' && showHow && (
        <p className="text-xs text-warmUmber max-w-xs text-center leading-relaxed">
          {isIOS()
            ? 'In Safari, tap the Share button, then “Add to Home Screen”.'
            : 'Open your browser’s menu and choose “Install app” or “Add to Home screen”.'}
        </p>
      )}
    </div>
  );
};
