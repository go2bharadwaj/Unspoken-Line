import React, { useState } from "react";

interface Creator {
  name: string;
  role: string;
  photo: string;
  linkedin: string;
  bio: string;
}

// Alphabetical, identical cards: neither creator is ranked above the other.
// Photos live in public/creators/; a missing file falls back to initials.
const CREATORS: Creator[] = [
  {
    name: "Bharadwaj",
    role: "Co-creator",
    photo: "/creators/bharadwaj.png",
    linkedin: "https://www.linkedin.com/in/go2bharadwaj/",
    bio: "Engineer building multimodal AI that brings vision, language and audio together, shaped by large-scale systems at Walmart Labs and open-source tools for learning and focus. Wants AI to work for the global good, widening who gets care rather than just what machines can do. Unspoken Line is a step toward that: a way to be heard when words won't come.",
  },
  {
    name: "Jayadeep Nukala",
    role: "Co-creator",
    photo: "/creators/jayadeep.png",
    linkedin: "https://www.linkedin.com/in/jayadeep-nukala/",
    bio: "Software engineer who builds the backend systems, data pipelines and cloud infrastructure that keep products dependable, most recently shipping an enterprise testing platform at KAYA. Drawn to work where precision has real consequences. Here, that means keeping every reflection private, fast and safe to rely on.",
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
      className="w-24 h-24 rounded-full bg-turmericMist/50 border border-borderHairline flex items-center justify-center font-serif text-2xl text-espressoInk"
    >
      {initials}
    </div>
  ) : (
    <img
      src={creator.photo}
      alt={`Portrait of ${creator.name}`}
      onError={() => setFailed(true)}
      className="w-24 h-24 rounded-full object-cover border border-borderHairline"
    />
  );
};

export const AboutCreators: React.FC = () => (
  <section
    aria-labelledby="about-creators-heading"
    className="w-full max-w-3xl mx-auto px-6 py-12 text-center"
  >
    <span className="text-xs uppercase tracking-widest text-warmUmber">
      The People Behind the Line
    </span>
    <h3
      id="about-creators-heading"
      className="font-serif text-2xl sm:text-3xl font-medium text-espressoInk tracking-tight mt-1 mb-8"
    >
      About the Creators
    </h3>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {CREATORS.map((c) => (
        <article
          key={c.name}
          className="rounded-3xl border border-borderHairline bg-canvasPaper p-6 flex flex-col items-center"
        >
          <Avatar creator={c} />
          <h4 className="font-serif text-xl text-espressoInk mt-4">{c.name}</h4>
          <p className="text-[11px] uppercase tracking-widest text-warmUmber mt-1">
            {c.role}
          </p>
          <p className="text-sm text-espressoInk/80 leading-relaxed mt-4 flex-1">
            {c.bio}
          </p>
          <a
            href={c.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 text-xs text-warmUmber hover:text-peachTerracotta underline underline-offset-4 transition-colors"
          >
            LinkedIn
          </a>
        </article>
      ))}
    </div>
  </section>
);
