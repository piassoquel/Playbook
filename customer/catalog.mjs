import { evaluateSizing } from './sizing.mjs';
const clean = value => String(value ?? '').trim();
const webUrl = value => /^https:\/\/[^\s]+$/i.test(clean(value)) ? clean(value) : '';
const published = p => p && p.Active === true && p.Status === 'Published';
const SPORTS = {
  SNB: { sport: 'snowboard', board: 'SNBBOARD', binding: 'SNBBIND', boot: 'SNBBOOT' },
  SKI: { sport: 'ski', board: 'SKIS', binding: 'SKIBIND', boot: 'SKIBOOT' },
};

// Customer-facing spec for a boot or binding. Terrain, selling tips, talking points and comparison notes are deliberately left out.
const gearSpec = target => {
  const number = value => Number(value) || null;
  const brakeWidths = (target.Variants || []).filter(v => /brake/i.test(clean(v.VariantType))).map(v => Number(clean(v.VariantValue))).filter(n => n > 0).sort((a, b) => a - b);
  const spec = {
    description: clean(target.Description), ability: clean(target.Ability).split('|').map(clean).filter(Boolean), gender: clean(target.Gender),
    flexScale: number(target.BootFlex) || number(target.BindingFlex), flexIndex: number(target.BootFlexIndex),
    closure: clean(target.ClosureSystem), entry: clean(target.EntryStyle), response: clean(target.Response),
    lastWidth: number(target.LastWidth), din: /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(clean(target.DINRange)) ? clean(target.DINRange) : '', brakeWidths,
  };
  return Object.fromEntries(Object.entries(spec).filter(([, value]) => Array.isArray(value) ? value.length : value));
};

export function projectCatalog(source) {
  if (source?.success !== true || !Array.isArray(source.products)) throw new Error('Invalid CMS catalog');
  const allowed = source.products.filter(published);
  const brands = new Map((source.brands || []).map(b => [b.BrandID, b.Name]));
  const byId = new Map(allowed.map(p => [p.ProductID, p]));
  const boards = allowed.filter(p => SPORTS[p.SportID]?.board === p.CategoryID);
  const product = p => ({
    id: clean(p.ProductID), sport: SPORTS[p.SportID].sport, category: clean(p.CategoryID), season: Number(p.Season) || null,
    brand: clean(brands.get(p.BrandID) || p.BrandID), model: clean(p.Model),
    gender: clean(p.Gender), description: clean(p.Description), price: Number(p.MSRP) || null,
    ability: clean(p.Ability).split('|').map(clean).filter(Boolean),
    abilityLevel: Number(p.AbilityLevel) || null,
    terrain: Object.fromEntries(['Groomers','AllMountain','Powder','Trees','Park'].map(k => [k, Number(p[`Terrain${k}`]) || null])),
    shape: SPORTS[p.SportID].sport === 'ski' ? '' : clean(p.ShapeOrWidth), profile: clean(p.Profile), flex: clean(p.Flex), width: clean(p.SnowboardWidth),
    ...(SPORTS[p.SportID].sport === 'ski' ? { waist: Number(p.ShapeOrWidth) || null } : {}),
    sizes: (p.Variants || []).filter(v => ['size','length'].includes(clean(v.VariantType).toLowerCase())).map(v => clean(v.VariantValue)).filter(Boolean),
    images: (p.Images || []).map(i => ({ url: webUrl(i.ImageURL), alt: clean(i.AltText) })).filter(i => i.url).slice(0, 5),
    image: webUrl(p.ImageURL),
  });
  return boards.map(p => {
    const rec = {};
    for (const type of ['Binding', 'Boot']) {
      rec[type.toLowerCase()] = {};
      for (const tier of ['Recommended', 'Upgrade', 'Budget']) {
        const target = byId.get(p.Recommendations?.[type]?.[tier]);
        if (target && target.SportID === p.SportID && target.CategoryID === SPORTS[p.SportID][type.toLowerCase()]) {
          rec[type.toLowerCase()][tier.toLowerCase()] = {
            id: clean(target.ProductID), brand: clean(brands.get(target.BrandID) || target.BrandID),
            model: clean(target.Model), image: webUrl(target.ImageURL), price: Number(target.MSRP) || null, ...gearSpec(target),
            stepOn: type === 'Binding'
              ? clean(target.EntryStyle).toLowerCase() === 'step on'
              : /\bstep on\b/i.test(clean(target.Model)),
          };
        }
      }
    }
    return { ...product(p), recommendations: rec };
  }).sort((a,b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model));
}

// No ski is tagged Expert in the catalog yet, so an expert skier is matched to Advanced skis rather than shown nothing.
const matchedAbility = (board, ability) => board.ability.includes(ability) ? ability
  : ability === 'Expert' && board.sport === 'ski' && board.ability.includes('Advanced') ? 'Advanced' : '';

export function rankBoards(boards, answers) {
  return boards.map(board => {
    let score = 0;
    const reasons = [];
    const sizing = evaluateSizing(board, answers);
    const abilityMatch = answers.ability ? matchedAbility(board, answers.ability) : '';
    const eligible = (!answers.ability || Boolean(abilityMatch)) &&
      (!answers.gender || answers.gender === 'All Boards' || board.gender === answers.gender || (board.gender === 'Unisex' && answers.gender !== 'Youth')) &&
      (!answers.weight || sizing.best.length > 0);
    if (abilityMatch) {
      score += 4; reasons.push(`Great for ${abilityMatch.toLowerCase()} riders`);
    }
    if (answers.terrain && board.terrain[answers.terrain] >= 4) {
      score += board.terrain[answers.terrain] === 5 ? 4 : 3;
      reasons.push(`Strong ${terrainLabels[answers.terrain].toLowerCase()} ${board.sport === 'ski' ? 'ski' : 'board'}`);
    }
    if (answers.feel && flexFeel(board.flex) === answers.feel) {
      score += 2; reasons.push(`${board.flex} flex`);
    }
    if (sizing.best.length) {
      score += sizing.kind === 'model' && !sizing.minimumOnly ? 3 : 1;
    }
    return { board, score, reasons, eligible, sizing };
  }).sort((a,b) => b.score-a.score || a.board.brand.localeCompare(b.board.brand) || a.board.model.localeCompare(b.board.model));
}
export const terrainLabels = { Groomers:'Resort', AllMountain:'All mountain', Powder:'Powder', Trees:'Trees', Park:'Park' };
export const isWideSize = value => /\d\s*w$/i.test(value) || /\bwide\b/i.test(value);
export function recommendedSetup(board, tier='recommended') {
  const binding = board.recommendations?.binding?.[tier];
  const boot = board.recommendations?.boot?.[tier];
  if (binding && boot && Boolean(binding.stepOn) !== Boolean(boot.stepOn)) {
    return { binding: null, boot: null, needsReview: true };
  }
  return { binding: binding || null, boot: boot || null, needsReview: false };
}
function flexFeel(value) { const s=clean(value).toLowerCase(); return s.startsWith('soft') ? 'playful' : s.includes('stiff') ? 'supportive' : s === 'medium' ? 'balanced' : ''; }
