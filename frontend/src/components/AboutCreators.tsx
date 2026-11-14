import React, { useState } from "react";

interface Creator {
  name: string;
  role: string;
  photo: string;
  linkedin: string;
}

// Alphabetical, identical cards: neither creator is ranked above the other.
// Photos live in public/creators/; a missing file falls back to initials.
const CREATORS: Creator[] = [
  {
    name: "Bharadwaj Satyanarayana",
    role: "Co-creator",
    photo: "/creators/bharadwaj.png",
    linkedin: "https://www.linkedin.com/in/go2bharadwaj/",
  },
  {
    name: "Jayadeep Nukala",
    role: "Co-creator",
    photo: "/creators/jayadeep.png",
    linkedin: "https://www.linkedin.com/in/jayadeep-nukala/",
  },
];

const Avatar: React.FC<{ creator: Creator }> = ({ creator }) => {
  const [failed, setFailed] = useState(false);
  const initials = creator.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return failed ? (
    <div
      aria-hidden="true"
      className="w-12 h-12 sm:w-28 sm:h-28 rounded-full bg-turmericMist/50 border border-borderHairline flex items-center justify-center font-serif text-base sm:text-2xl text-espressoInk"
    >
      {initials}
    </div>
  ) : (
    <img
      src={creator.photo}
      alt={`Portrait of ${creator.name}`}
      onError={() => setFailed(true)}
      className="w-12 h-12 sm:w-28 sm:h-28 rounded-full object-cover border border-borderHairline"
    />
  );
};

export const AboutCreators: React.FC = () => (
  // Collapsed by default: returning users don't need to see it every visit
  <details className="group w-full max-w-3xl mx-auto sm:px-6 py-8 text-center">
    <summary className="list-none [&::-webkit-details-marker]:hidden inline-flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-widest text-warmUmber hover:text-espressoInk transition-colors">
      About
      <svg
        viewBox="0 0 24 24"
        className="w-3.5 h-3.5 stroke-current fill-none stroke-2 transition-transform group-open:rotate-180"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </summary>

    <h3 className="font-serif text-xl sm:text-2xl font-medium text-espressoInk tracking-tight mt-6 mb-6">
      The People Behind the Line
    </h3>

    <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-xl mx-auto">
      {CREATORS.map((c) => (
        <article
          key={c.name}
          className="aspect-square rounded-3xl border border-borderHairline bg-canvasPaper p-3 sm:p-6 flex flex-col items-center justify-center"
        >
          <Avatar creator={c} />
          <h4 className="font-serif text-sm leading-tight sm:text-xl text-espressoInk mt-1.5 sm:mt-3">
            {c.name}
          </h4>
          <p className="text-[11px] uppercase tracking-widest text-warmUmber mt-0.5 sm:mt-1">
            {c.role}
          </p>
          <a
            href={c.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 sm:mt-4 text-xs text-warmUmber hover:text-peachTerracotta underline underline-offset-4 transition-colors"
          >
            LinkedIn<span className="sr-only"> profile of {c.name}</span>
          </a>
        </article>
      ))}
    </div>
  </details>
);
