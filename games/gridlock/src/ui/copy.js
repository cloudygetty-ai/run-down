/**
 * Long-form player-facing text. Kept out of the logic modules so copy edits
 * never touch code.
 */

export const INTRO = {
  eyebrow: 'City Directive 001',
  title: 'GRIDLOCK',
  body: [
    'The coast moved inland, the old capital drowned, and what is left of the region has handed you a bay, a road stub, and thirty thousand credits.',
    'Zone it. Power it. Cool it. Every watt, every litre and every commuter runs through decisions you make on this map — and the planet is keeping score in the Heat Index.',
    'Build the Zero Point interchange to win. Go bankrupt, and the city goes into receivership without you.',
  ].join('\n\n'),
};

export const HELP = {
  eyebrow: 'Field Manual',
  title: 'How to run a city',
  body: [
    'BUILDING — pick a structure on the left, then click or drag across the map. Drag is how you lay roads. Right-drag or drag with no tool selected to pan; the wheel zooms toward the cursor.',
    'THE THREE CHAINS — a structure works only if it touches a road wired back to the Nexus, draws power, and draws water. Power failures cascade: unpowered pumps stop making water. Watch the Utilities view.',
    'ADJACENCY — placement is the puzzle. Commerce beside housing earns more, housing beside industry loses approval, data centres on the waterfront run cooler. The inspector shows exactly what a tile would score before you commit.',
    'HEAT — industry, generators, and server farms raise the Heat Index. Past 55 it raises cooling demand and costs approval; past 88 the city is in crisis. Parks, sky gardens, and carbon scrubbers pull it back.',
    'RESEARCH — academies and labs bank research, and research is the only thing that advances the era. New eras unlock everything worth building.',
    'KEYS — [Space] pause · [1][2][3] speed · [X] bulldoze · [O] cycle map view · [S] save · [H] this screen · [Esc] drop tool.',
  ].join('\n\n'),
};

export const VICTORY = {
  eyebrow: 'Zero Point online',
  title: 'The city moves',
  body: [
    'The interchange lit at 04:12 and the arterials cleared for the first time since the founding. Nothing about this city is stuck any more.',
    'You can keep building — there is no cap on what this becomes.',
  ].join('\n\n'),
};

export const BANKRUPT = {
  eyebrow: 'Receivership',
  title: 'The treasury is empty',
  body: [
    'Creditors have taken the ledger. You keep your desk, for now, but every month below zero digs the hole deeper.',
    'Raise the tax rate, bulldoze what you cannot afford to run, and get business revenue moving again.',
  ].join('\n\n'),
};
