const fs = require('node:fs/promises');
const path = require('node:path');
async function build({ destination = path.resolve(__dirname, '../web-dist') } = {}) {
  const root = path.resolve(__dirname, '..');
  const allowed = path.relative(root, destination);
  if (!allowed || allowed.startsWith('..') || path.isAbsolute(allowed)) throw new Error('Build the website inside this checkout.');
  await fs.mkdir(destination, { recursive: true });
  for (const name of ['index.html', 'site.css', 'aero-site.css', 'refinement.css', 'site.js']) await fs.copyFile(path.join(root, 'site', name), path.join(destination, name));
  const app = path.join(destination, 'app');
  await fs.mkdir(app, { recursive: true });
  for (const name of ['creator.html', 'creator.css', 'creator.js', 'creator-demo.js', 'appearance.js', 'design.css', 'aero.css', 'aero-scenes-data.js', 'aero-scenes.js', 'photo-scenes.css','studio-themes.js','studio-themes.css','app-views.js','app-views.css','original-views.js','original-views.css','workspace-polish.css','refinement.css','motion.js','motion.css']) await fs.copyFile(path.join(root, 'src/ui', name), path.join(app, name));
  await fs.cp(path.join(root, 'src/ui/assets'), path.join(app, 'assets'), { recursive: true });
  await fs.copyFile(path.join(root, 'LICENSE'), path.join(destination, 'LICENSE.txt'));
  await fs.writeFile(path.join(destination, '.nojekyll'), '');
  return { directory: destination, staticHosting: true, applicationBackendRequired: false, thirdPartyRequests: ['GitHub public releases, only when downloads are opened'], projectFilesIncluded: false };
}
if (require.main === module) build().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { build };
