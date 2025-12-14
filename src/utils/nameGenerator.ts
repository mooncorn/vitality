// Generate random display names for sessions

const adjectives = [
  'ancient', 'blazing', 'celestial', 'daring', 'ethereal',
  'fierce', 'golden', 'hidden', 'iron', 'jade',
  'keen', 'luminous', 'mystic', 'noble', 'obsidian',
  'primal', 'quick', 'radiant', 'shadow', 'thundering',
  'unstoppable', 'vengeful', 'wild', 'xenial', 'zealous',
  'arcane', 'bold', 'crimson', 'dire', 'ember',
  'feral', 'glacial', 'hallowed', 'infernal', 'jeweled',
  'kindred', 'lunar', 'molten', 'nether', 'omen',
  'phantom', 'quaking', 'regal', 'spectral', 'twilight',
  'umbral', 'valiant', 'wicked', 'crystal', 'divine',
];

const subjects = [
  'dragon', 'phoenix', 'serpent', 'titan', 'hydra',
  'griffin', 'sphinx', 'kraken', 'wyrm', 'leviathan',
  'chimera', 'basilisk', 'wyvern', 'golem', 'specter',
  'oracle', 'sentinel', 'guardian', 'champion', 'monarch',
  'tempest', 'storm', 'flame', 'frost', 'void',
  'blade', 'crown', 'throne', 'sanctum', 'citadel',
  'spirit', 'shade', 'knight', 'mage', 'sage',
  'hunter', 'seeker', 'warden', 'herald', 'avatar',
  'rune', 'sigil', 'pact', 'oath', 'ritual',
  'realm', 'domain', 'empire', 'legion', 'order',
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Generate a random session name composed of an adjective and a subject
 * Example: "Blazing Phoenix", "Shadow Sentinel", "Celestial Dragon"
 */
export function generateSessionName(): string {
  const adjective = capitalize(getRandomElement(adjectives));
  const subject = capitalize(getRandomElement(subjects));
  return `${adjective} ${subject}`;
}
