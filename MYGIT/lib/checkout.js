
const fs = require("fs");
const path = require("path");

function checkoutBranch(branchName) {
  const repoPath = path.join(process.cwd(), ".minigit");
  const headsPath = path.join(repoPath, "refs", "heads");
  const headPath = path.join(repoPath, "HEAD");

  if (!fs.existsSync(headsPath) || !fs.existsSync(headPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  if (
    !branchName ||
    branchName.startsWith("-") ||
    branchName.includes("/") ||
    !/^[a-zA-Z0-9._-]+$/.test(branchName) ||
    branchName === "." ||
    branchName === ".."
  ) {
    throw new Error("Invalid branch name.");
  }

  const branchPath = path.join(headsPath, branchName);

  if (!fs.existsSync(branchPath)) {
    throw new Error(`Branch '${branchName}' does not exist.`);
  }

  fs.writeFileSync(headPath, `ref: refs/heads/${branchName}\n`);

  console.log(`Switched to branch '${branchName}'.`);
}

module.exports = { checkoutBranch };
