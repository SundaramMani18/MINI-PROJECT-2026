
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function commitChanges(message) {
  const repoPath = path.join(process.cwd(), ".minigit");
  const indexPath = path.join(repoPath, "index");
  const objectsPath = path.join(repoPath, "objects");
  const commitsPath = path.join(repoPath, "commits.json");

  if (!fs.existsSync(repoPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  if (!fs.existsSync(indexPath)) {
    throw new Error("Staging index not found. Run add first.");
  }

  if (!message || !message.trim()) {
    throw new Error("Commit message cannot be empty.");
  }

  const stagedFiles = JSON.parse(
    fs.readFileSync(indexPath, "utf8")
  );

  if (Object.keys(stagedFiles).length === 0) {
    throw new Error("Nothing staged to commit.");
  }

  let commits = [];

  if (fs.existsSync(commitsPath)) {
    commits = JSON.parse(
      fs.readFileSync(commitsPath, "utf8")
    );
  }

  const commitData = {
    message: message.trim(),
    timestamp: new Date().toISOString(),
    files: stagedFiles,
    parent: commits.length
      ? commits[commits.length - 1].id
      : null
  };

  const content = JSON.stringify(commitData);

  commitData.id = crypto
    .createHash("sha1")
    .update(content)
    .digest("hex");

  fs.writeFileSync(
    path.join(objectsPath, commitData.id),
    JSON.stringify(commitData, null, 2)
  );

  commits.push(commitData);

  fs.writeFileSync(
    commitsPath,
    JSON.stringify(commits, null, 2)
  );

  console.log(
    `[${commitData.id.slice(0, 7)}] ${commitData.message}`
  );
}

module.exports = { commitChanges };

