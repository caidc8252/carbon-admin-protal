const fs = require('fs');
const path = require('path');

function toBusinessLabel(dirName, fileName) {
  const baseName = path.basename(fileName, path.extname(fileName));
  const dirParts = dirName.toUpperCase().split('-');
  const fileParts = baseName.toUpperCase().split('-');
  const withoutDir = fileParts.slice(dirParts.length);
  const businessParts = withoutDir.length > 1 ? withoutDir.slice(1) : withoutDir;
  return (businessParts.length ? businessParts : fileParts.slice(-1)).join(' ');
}

function buildMenu(shellRoot) {
  return fs.readdirSync(shellRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((dir) => {
      const dirPath = path.join(shellRoot, dir.name);
      const items = fs.readdirSync(dirPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.html')
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map((file) => ({
          label: toBusinessLabel(dir.name, file.name),
          href: `${encodeURIComponent(dir.name)}/${encodeURIComponent(file.name)}`,
          file: file.name,
        }));

      return { section: dir.name.toUpperCase(), items };
    })
    .filter((group) => group.items.length > 0);
}

module.exports = {
  buildMenu,
  toBusinessLabel,
};
