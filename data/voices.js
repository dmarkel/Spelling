// Who can speak, how they look in speech bubbles, and how OpenAI TTS should voice them.
// `voice` + `style` are only used by scripts/generate-audio.mjs, which also adds ACCENT and PACE to every line.
// `pitch`/`rate` tune the iPad's built-in voice when an mp3 is missing.

export const ACCENT = 'Speak with a natural, friendly General American English accent, like a voice actor from the United States. Never use a British accent.';
export const PACE = 'Speak at a natural, normal conversational pace.';
// Spelling words and spelled-out letters are deliberately slow so kids can hear every sound.
export const PACE_SLOW = 'Speak slowly and very clearly, stretching the word out a little so every sound can be heard, like a teacher at a spelling bee.';

export const SPEAKERS = {
  narrator: { name: 'Narrator', color: '#5b4b8a', voice: 'marin', pitch: 1, rate: 0.95,
    style: 'Warm, playful storybook narrator reading to kids aged 7 to 10. Expressive but clear, with gentle dramatic pauses.' },
  coach: { name: 'Coach', color: '#2a7a5a', voice: 'coral', pitch: 1.05, rate: 0.85,
    style: 'Kind, encouraging reading teacher. Clear and upbeat, never disappointed.' },
  emma: { name: 'Emma', color: '#9b59d0', voice: 'shimmer', pitch: 1.3, rate: 1,
    style: 'A bright, funny 9-year-old girl. Youthful, lively, a little dramatic, sometimes giggly or nervous.' },
  parker: { name: 'Parker', color: '#2563eb', voice: 'verse', pitch: 1.4, rate: 1.05,
    style: 'An excited, brave 7-year-old boy playing a knight. High-energy, youthful, big enthusiasm.' },
  maya: { name: 'Maya', color: '#e0558a', voice: 'nova', pitch: 1.3, rate: 1,
    style: "A cheerful 9-year-old girl, Emma's best friend. Bubbly and loyal, loves to tease a little." },
  leo: { name: 'Leo', color: '#e67e22', voice: 'echo', pitch: 1.25, rate: 0.95,
    style: 'A shy, sweet 9-year-old boy who is new at school. Friendly, a bit awkward, speaks softly.' },
  rivera: { name: 'Ms. Rivera', color: '#16a085', voice: 'sage', pitch: 1, rate: 0.95,
    style: 'A warm, funny 4th-grade teacher.' },
  grizzle: { name: 'Grizzle', color: '#5a8f29', voice: 'ash', pitch: 0.7, rate: 1.05,
    style: 'Grizzle the Misspell Goblin: a sneaky, silly, raspy little goblin who cackles. Mischievous and goofy, never actually scary.' },
  sparky: { name: 'Sparky', color: '#f39c12', voice: 'ballad', pitch: 1.6, rate: 1.05,
    style: 'Sparky, a tiny baby dragon: squeaky, cute, excitable, a little nervous.' },
  slime: { name: 'Swamp Slime', color: '#27ae60', voice: 'onyx', pitch: 0.6, rate: 0.85,
    style: 'A big goofy swamp slime monster: gloopy, bubbly, slow, silly. Funny rather than scary.' },
  shadowbeard: { name: 'Captain Shadowbeard', color: '#34495e', voice: 'onyx', pitch: 0.7, rate: 1,
    style: 'A silly pirate captain made of shadows. Big "arr" pirate voice, over the top, funny not scary.' },
  ghost: { name: 'Silent E Ghost', color: '#7f8fa6', voice: 'shimmer', pitch: 1.1, rate: 0.9,
    style: 'A shy, whispery, slightly sad friendly ghost who wants to be noticed.' },
  troll: { name: 'Bridge Troll', color: '#8e6e53', voice: 'ash', pitch: 0.6, rate: 0.9,
    style: 'A grumpy but silly bridge troll who loves riddles. Grumbly, comic timing.' },
  giant: { name: 'Storm Giant', color: '#4a69bd', voice: 'onyx', pitch: 0.5, rate: 0.85,
    style: 'An enormous booming storm giant. Loud, dramatic, then soft-hearted. Kid-friendly.' },
  robot: { name: 'Robo-Boss', color: '#718093', voice: 'alloy', pitch: 0.9, rate: 1,
    style: 'A glitchy, funny robot commander. Beepy, clipped robotic delivery.' },
  batty: { name: 'Batty', color: '#6c3483', voice: 'ballad', pitch: 1.2, rate: 1.1,
    style: 'A chatty, dramatic little bat who loves tricky words. Fast, silly, theatrical.' },
  justin: { name: 'Justin', color: '#1e3a8a', voice: 'cedar', pitch: 1, rate: 1,
    style: 'Justin, a 41-year-old attorney who is nervous, dry-witted and self-deprecating. Deadpan comic timing, like a sitcom lead.' },
  ashley: { name: 'Ashley', color: '#d6334a', voice: 'nova', pitch: 1.1, rate: 1,
    style: 'Ashley, a warm, affectionate woman in her late thirties who adores her husband. Sincere with a playful sense of humor.' },
  stabby: { name: 'Stabby McGee', color: '#ea7a1a', voice: 'ash', pitch: 0.8, rate: 1,
    style: 'Stabby McGee, a shifty, overly charming small-time crook with a gravelly voice. Slippery and funny, like a con man in a heist comedy.' },
  judge: { name: 'Judge Hammer', color: '#3f3f46', voice: 'sage', pitch: 0.9, rate: 0.95,
    style: 'A stern, no-nonsense judge with a dry, commanding voice and zero patience, but secretly amused.' },
  pruitt: { name: 'Prosecutor Pruitt', color: '#64748b', voice: 'echo', pitch: 1, rate: 1.05,
    style: 'A smug, theatrical prosecutor who loves shouting objection. Over-the-top courtroom drama.' },
  dragon: { name: 'The Great Word Dragon', color: '#c0392b', voice: 'onyx', pitch: 0.55, rate: 0.85,
    style: 'An ancient, grand dragon with a deep rumbling voice. Grand and dramatic, but never terrifying for kids.' },
};
