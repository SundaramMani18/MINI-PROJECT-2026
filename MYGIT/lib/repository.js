

const fs = require("fs");
const path = require("path");
const { getRepoPath } = require("./repo-path");

function initRepository() {
  const repoPath = getRepoPath();

  if (fs.existsSync(repoPath)) {
    console.log("Mini Git repository already exists.");
    return;
  }

  fs.mkdirSync(path.join(repoPath, "objects"), {
    recursive: true
  });

  fs.mkdirSync(path.join(repoPath, "refs", "heads"), {
    recursive: true
  });

  fs.writeFileSync(
    path.join(repoPath, "HEAD"),
    "ref: refs/heads/main\n"
  );

  console.log("Initialized empty Mini Git repository.");
}

module.exports = { initRepository };
