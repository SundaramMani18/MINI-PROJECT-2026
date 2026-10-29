
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getRepoPath } = require("./repo-path");

function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  const header = Buffer.from(`blob ${content.length}\0`);
  const objectData = Buffer.concat([header, content]);

  return crypto
    .createHash("sha1")
    .update(objectData)
    .digest("hex");
}

function showStatus() {
  const repoPath = getRepoPath();
  const indexPath = path.join(repoPath, "index");

  if (!fs.existsSync(repoPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  let stagedFiles = {};

  if (fs.existsSync(indexPath)) {
    stagedFiles = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  }

  console.log("\nMini Git Status");
  console.log("----------------");

  const files = Object.keys(stagedFiles);

  if (files.length === 0) {
    console.log("No files staged.");
    return;
  }

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log(`Deleted from working directory: ${file}`);
      continue;
    }

    const currentHash = getFileHash(file);
    const stagedHash = stagedFiles[file];

    if (currentHash === stagedHash) {
      console.log(`Staged: ${file} (unchanged)`);
    } else {
      console.log(`Modified after staging: ${file}`);
    }
  }
}

module.exports = { showStatus };
