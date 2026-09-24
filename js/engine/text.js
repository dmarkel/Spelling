// Story lines may start with a stage direction: "(whispering) Maya! He is here!"
// The direction is shown in italics and used as voice styling, but never read aloud.

export function splitDirection(text) {
  const m = /^\(([^)]+)\)\s*(.*)$/s.exec(text);
  return m ? { direction: m[1], spoken: m[2] } : { direction: '', spoken: text };
}

export function audioKey(speaker, text) {
  return `${speaker}|${text}`;
}

export function pick(list, rand = Math.random) {
  return list[Math.floor(rand() * list.length)];
}
