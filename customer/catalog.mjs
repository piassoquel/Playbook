import { evaluateSizing } from './sizing.mjs';
const clean = value => String(value ?? '').trim();
const webUrl = value => /^https:\/\/[^\s]+$/i.test(clean(value)) ? clean(value) : '';
const published = p => p && p.Active === true && p.Status === 'Published';

export function projectCatalog(source) {
  if (source?.success !== true || !Array.isArray(source.products)) throw new Error('Invalid CMS catalog');
  const allowed = source.products.filter(published);
  const brands = new Map((source.brands || []).map(b => [b.BrandID, b.Name]));
  const byId = new Map(allowed.map(p => [p.ProductID, p]));
  const boards = allowed.filter(p => p.SportID === 'SNB' && p.CategoryID === 'SNBBOARD');
  const product = p => ({
    id: clean(p.ProductID), sport: 'snowboard', category: clean(p.CategoryID), season: Number(p.Season) || null,
    brand: clean(brands.get(p.BrandID) || p.BrandID), model: clean(p.Model),
    gender: clean(p.Gender), description: clean(p.Description), price: Number(p.MSRP) || null,
    ability: clean(p.Ability).split('|').map(clean).filter(Boolean),
    abilityLevel: Number(p.AbilityLevel) || null,
    terrain: Object.fromEntries(['Groomers','AllMountain','Powder','Trees','Park'].map(k => [k, Number(p[`Terrain${k}`]) || null])),
    shape: clean(p.ShapeOrWidth), profile: clean(p.Profile), flex: clean(p.Flex), width: clean(p.SnowboardWidth),
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
        if (target && target.SportID === 'SNB' && target.CategoryID === (type === 'Binding' ? 'SNBBIND' : 'SNBBOOT')) {
          rec[type.toLowerCase()][tier.toLowerCase()] = {
            id: clean(target.ProductID), brand: clean(brands.get(target.BrandID) || target.BrandID),
            model: clean(target.Model), image: webUrl(target.ImageURL), price: Number(target.MSRP) || null,
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

export function rankBoards(boards, answers) {
  return boards.map(board => {
    let score = 0;
    const reasons = [];
    const sizing = evaluateSizing(board, answers);
    const eligible = !answers.ability || board.ability.includes(answers.ability);
    if (answers.ability && board.ability.includes(answers.ability)) {
      score += 4; reasons.push(`Listed for ${answers.ability.toLowerCase()} riders`);
    }
    if (answers.terrain && board.terrain[answers.terrain] >= 4) {
      score += board.terrain[answers.terrain] === 5 ? 4 : 3;
      reasons.push(`Strong ${terrainLabels[answers.terrain].toLowerCase()} rating in the catalog`);
    }
    if (answers.feel && flexFeel(board.flex) === answers.feel) {
      score += 2; reasons.push(`${board.flex} flex matches your preferred feel`);
    }
    if (answers.wide && board.sizes.some(isWideSize)) {
      score += 1; reasons.push('Wide size listed among available variants');
    }
    if (sizing.best.length) {
      if (!sizing.minimumOnly) {
        score += sizing.kind === 'model' ? 3 : 1;
        reasons.push(sizing.kind === 'model' ? `Listed ${sizing.best.join(', ')} size${sizing.best.length===1?'':'s'} within the maker’s guidance` : `Listed ${sizing.best.join(', ')} size${sizing.best.length===1?'':'s'} near the general guide`);
      }
    }
    return { board, score, reasons, eligible, sizing };
  }).sort((a,b) => b.score-a.score || a.board.brand.localeCompare(b.board.brand) || a.board.model.localeCompare(b.board.model));
}
export const terrainLabels = { Groomers:'Groomers', AllMountain:'All mountain', Powder:'Powder', Trees:'Trees', Park:'Park' };
export const isWideSize = value => /\d\s*w$/i.test(value) || /\bwide\b/i.test(value);
export function recommendedSetup(board) {
  const binding = board.recommendations?.binding?.recommended;
  const boot = board.recommendations?.boot?.recommended;
  if (binding && boot && Boolean(binding.stepOn) !== Boolean(boot.stepOn)) {
    return { binding: null, boot: null, needsReview: true };
  }
  return { binding: binding || null, boot: boot || null, needsReview: false };
}
function flexFeel(value) { const s=clean(value).toLowerCase(); return s.startsWith('soft') ? 'playful' : s.includes('stiff') ? 'supportive' : s === 'medium' ? 'balanced' : ''; }
