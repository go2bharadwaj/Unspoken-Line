import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Props {
  message?: string | null;
  onReturn: () => void;
}

export const CrisisSupportView: React.FC<Props> = ({ message, onReturn }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="w-full max-w-lg mx-auto py-12 px-6 flex flex-col items-center text-center">
      {/* Slow breathing circle */}
      <div className="w-32 h-32 flex items-center justify-center my-6">
        <motion.div
          className="w-24 h-24 rounded-full border border-sageCalm bg-sageCalm/10 flex items-center justify-center"
          animate={{
            scale: shouldReduceMotion ? 1 : [1, 1.25, 1],
            opacity: shouldReduceMotion ? 0.8 : [0.6, 1, 0.6],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="w-8 h-8 rounded-full bg-sageCalm/20" />
        </motion.div>
      </div>

      <h2 className="font-serif text-3xl font-medium text-espressoInk tracking-tight mb-4">
        You Are Not Alone
      </h2>

      <p className="text-espressoInk text-base leading-relaxed mb-8 max-w-md">
        {message ||
          'We sensed that you may be carrying more weight than anyone should bear by themselves. Please let someone hold space for you right now.'}
      </p>

      {/* Emergency & Lifeline Contacts */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
        <a
          href="tel:988"
          className="w-full sm:w-auto px-6 py-3 rounded-full bg-peachTerracotta text-canvasPaper font-medium hover:bg-peachTerracotta/90 transition-colors shadow-none text-center"
        >
          Call 988
        </a>
        <a
          href="sms:988"
          className="w-full sm:w-auto px-6 py-3 rounded-full border border-peachTerracotta text-espressoInk font-medium hover:bg-turmericMist/40 transition-colors text-center"
        >
          Text 988
        </a>
      </div>

      <div className="mb-10 text-sm text-warmUmber">
        <span>Outside the United States? Find local, confidential support at </span>
        <a
          href="https://findahelpline.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-espressoInk"
        >
          findahelpline.com
        </a>
      </div>

      <button
        type="button"
        onClick={onReturn}
        className="px-6 py-2.5 rounded-full border border-borderHairline text-warmUmber hover:text-espressoInk hover:bg-turmericMist/30 transition-colors text-sm cursor-pointer"
      >
        Return when ready
      </button>
    </div>
  );
};
