import { readFile, writeFile } from 'node:fs/promises';
import { projectCatalog } from '../catalog.mjs';
import { attachSizeCharts } from '../sizing.mjs';

const args = process.argv.slice(2);
const option = key => { const i=args.indexOf(key); return i < 0 ? '' : args[i+1]; };
const apply = args.includes('--apply');
const url = option('--cms-url') || process.env.PLAYBOOK_CMS_URL;
const input = option('--input');
if (!url && !input) throw new Error('Provide --cms-url or --input');
const source = input ? JSON.parse(await readFile(input, 'utf8')) : await (async () => {
  const response = await fetch(url); if (!response.ok) throw new Error(`CMS HTTP ${response.status}`);
  return response.json();
})();
const chartData=JSON.parse(await readFile(new URL('../size-charts.json',import.meta.url),'utf8'));
const boards = attachSizeCharts(projectCatalog(source),chartData);
if (!boards.length) throw new Error('No published snowboards; refusing to publish');
const output = option('--output') || 'customer/data/catalog-preview.json';
await writeFile(output, JSON.stringify({ generatedAt: source.generatedAt, boards }, null, 2) + '\n');
console.log(`${boards.length} customer-safe boards projected to ${output}`);
if (apply) {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { initializeApp, applicationDefault } = await import('firebase-admin/app');
  const projectId = option('--project-id') || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new Error('Provide --project-id for --apply');
  initializeApp({ credential: applicationDefault(), projectId });
  const db = getFirestore();
  const batch = db.batch();
  const ids = new Set(boards.map(b => b.id));
  for (const board of boards) batch.set(db.doc(`customerBoards/${board.id}`), board);
  const existing = await db.collection('customerBoards').get();
  for (const doc of existing.docs) if (!ids.has(doc.id)) batch.delete(doc.ref);
  await batch.commit();
  console.log(`Published ${boards.length}; removed ${existing.docs.filter(d => !ids.has(d.id)).length} stale boards`);
}
