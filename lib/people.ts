export type Person = { id: string; name: string; short: string; initials: string; hue: number };

export const PEOPLE: Person[] = [
  { id: "rahul",     name: "Rahul Kumar",        short: "Rahul",     initials: "RK", hue: 18 },
  { id: "kunal",     name: "Kunal Naik",         short: "Kunal",     initials: "KN", hue: 205 },
  { id: "jaydeep",   name: "Vala Jaydeep",       short: "Jaydeep",   initials: "VJ", hue: 150 },
  { id: "shubham-g", name: "Shubham Gupta",      short: "Shubham G", initials: "SG", hue: 280 },
  { id: "shubham-w", name: "Shubham Wadkade",    short: "Shubham W", initials: "SW", hue: 330 },
  { id: "mrigankar", name: "Mrigankar Sonowal",  short: "Mrigankar", initials: "MS", hue: 45 },
  { id: "ashish",    name: "Ashish Bhilala",     short: "Ashish",    initials: "AB", hue: 190 },
  { id: "bhanu",     name: "Bhanu PSinghS",      short: "Bhanu",     initials: "BS", hue: 100 },
  { id: "abhishek",  name: "Abhishek Bahal",     short: "Abhishek",  initials: "AB", hue: 0 },
];

export const PEOPLE_BY_ID: Record<string, Person> = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
export const person = (id: string): Person => PEOPLE_BY_ID[id] ?? { id, name: id, short: id, initials: "?", hue: 0 };

export const CATEGORIES = [
  { id: "food",    label: "Food",    glyph: "🍛" },
  { id: "travel",  label: "Travel",  glyph: "🛺" },
  { id: "stay",    label: "Stay",    glyph: "🏨" },
  { id: "fun",     label: "Fun",     glyph: "🎳" },
  { id: "grocery", label: "Grocery", glyph: "🧺" },
  { id: "bills",   label: "Bills",   glyph: "💡" },
  { id: "other",   label: "Other",   glyph: "🧾" },
] as const;
export const categoryGlyph = (id: string) => CATEGORIES.find((c) => c.id === id)?.glyph ?? "🧾";
