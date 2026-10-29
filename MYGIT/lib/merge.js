

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getRepoPath } = require("./repo-path");

function mergeBranch(branchName) {
  const repoPath = getRepoPath();
  const commitsPath = path.join(repoPath, "commits.json");
  const headPath = path.join(repoPath, "HEAD");
  const branchesPath = path.join(repoPath, "refs", "heads");
  const indexPath = path.join(repoPath, "index");

  if (!fs.existsSync(repoPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  if (
    typeof branchName !== "string" ||
    !/^[a-zA-Z0-9._-]+$/.test(branchName) ||
    branchName === "." ||
    branchName === ".."
  ) {
    throw new Error("Invalid branch name.");
  }

  const head = fs.readFileSync(headPath, "utf8").trim();
  const prefix = "ref: refs/heads/";

  if (!head.startsWith(prefix)) {
    throw new Error("Invalid HEAD reference.");
  }

  const currentBranch = head.slice(prefix.length);

  if (
    !/^[a-zA-Z0-9._-]+$/.test(currentBranch) ||
    currentBranch === "." ||
    currentBranch === ".."
  ) {
    throw new Error("Invalid current branch reference.");
  }

  if (branchName === currentBranch) {
    throw new Error("Cannot merge a branch into itself.");
  }

  const currentPath = path.join(branchesPath, currentBranch);
  const targetPath = path.join(branchesPath, branchName);

  if (!fs.existsSync(currentPath)) {
    throw new Error("Current branch reference does not exist.");
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Branch '${branchName}' does not exist.`);
  }

  if (!fs.existsSync(commitsPath)) {
    throw new Error("No commits found.");
  }

  const commits = JSON.parse(
    fs.readFileSync(commitsPath, "utf8")
  );

  if (!Array.isArray(commits) || commits.length === 0) {
    throw new Error("No commits found.");
  }

  const currentCommitId = fs.readFileSync(
    currentPath,
    "utf8"
  ).trim();

  const targetCommitId = fs.readFileSync(
    targetPath,
    "utf8"
  ).trim();

  const currentCommit = commits.find(
    commit => commit.id === currentCommitId
  );

  const targetCommit = commits.find(
    commit => commit.id === targetCommitId
  );

  if (!currentCommit) {
    throw new Error("Current branch has no valid commit reference.");
  }

  if (!targetCommit) {
    throw new Error(
      `Branch '${branchName}' has no valid commit reference.`
    );
  }

  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(
      fs.readFileSync(indexPath, "utf8")
    );

    if (Object.keys(index).length > 0) {
      throw new Error(
        "Please commit or clear staged changes before merging."
      );
    }
  }

  // Starter version: records a merge commit.
  // It does not perform a three-way file merge.
  const mergeCommit = {
    message: `Merge branch '${branchName}' into '${currentBranch}'`,
    timestamp: new Date().toISOString(),
    files: targetCommit.files,
    parent: currentCommit.id,
    mergedParent: targetCommit.id
  };

  const content = JSON.stringify(mergeCommit);

  mergeCommit.id = crypto
    .createHash("sha1")
    .update(content)
    .digest("hex");

  const objectsPath = path.join(repoPath, "objects");
  fs.mkdirSync(objectsPath, { recursive: true });

  fs.writeFileSync(
    path.join(objectsPath, mergeCommit.id),
    JSON.stringify(mergeCommit, null, 2)
  );

  commits.push(mergeCommit);

  fs.writeFileSync(
    commitsPath,
    JSON.stringify(commits, null, 2)
  );

  // Update the CURRENT branch, not the branch being merged in.
  fs.writeFileSync(currentPath, mergeCommit.id);

  console.log(
    `Merged '${branchName}' into '${currentBranch}'.`
  );
  console.log(`Merge commit: ${mergeCommit.id.slice(0, 7)}`);
}

module.exports = { mergeBranch };
