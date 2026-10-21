
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function addFile(filePath) {
  const repoPath = path.join(process.cwd(), ".minigit");
  const objectsPath = path.join(repoPath, "objects");
  const indexPath = path.join(repoPath, "index");

  if (!fs.existsSync(repoPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error("File not found: " + filePath);
  }

  const content = fs.readFileSync(filePath);
  const header = Buffer.from(`blob ${content.length}\0`);
  const objectData = Buffer.concat([header, content]);

  const hash = crypto
    .createHash("sha1")
    .update(objectData)
    .digest("hex");

  const objectPath = path.join(objectsPath, hash);

  if (!fs.existsSync(objectPath)) {
    fs.writeFileSync(objectPath, objectData);
  }

  let index = {};

  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  }

  index[filePath.replace(/\\/g, "/")] = hash;

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log(`Staged: ${filePath}`);
}

module.exports = { addFile };
