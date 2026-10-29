

const fs = require("fs");
const path = require("path");
const { getRepoPath } = require("./repo-path");

function showLog() {
  const commitsPath = path.join(
    getRepoPath(),
    "commits.json"
  );

  if (!fs.existsSync(commitsPath)) {
    console.log("No commits yet.");
    return;
  }

  const commits = JSON.parse(
    fs.readFileSync(commitsPath, "utf8")
  );

  if (!Array.isArray(commits) || commits.length === 0) {
    console.log("No commits yet.");
    return;
  }

  console.log("\nMini Git Commit History");
  console.log("=======================");

  for (const commit of [...commits].reverse()) {
    console.log(`commit ${commit.id}`);
    console.log(`Date: ${commit.timestamp}`);
    console.log(`    ${commit.message}`);
    console.log("");
  }
}

module.exports = { showLog };
