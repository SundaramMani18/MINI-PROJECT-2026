
const fs = require("fs");
const path = require("path");

function mergeBranch(branchName) {
  const repoPath = path.join(process.cwd(), ".minigit");
  const commitsPath = path.join(repoPath, "commits.json");
  const headPath = path.join(repoPath, "HEAD");
  const branchesPath = path.join(repoPath, "refs", "heads");
  const indexPath = path.join(repoPath, "index");

  if (!fs.existsSync(repoPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  if (!branchName) {
    throw new Error("Please specify a branch to merge.");
  }

  const head = fs.readFileSync(headPath, "utf8").trim();
  const prefix = "ref: refs/heads/";

  if (!head.startsWith(prefix)) {
    throw new Error("Invalid HEAD reference.");
  }

  const currentBranch = head.slice(prefix.length);

  if (branchName === currentBranch) {
    throw new Error("Cannot merge a branch into itself.");
  }

  const targetPath = path.join(branchesPath, branchName);

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

  const targetCommitId = fs.readFileSync(
    targetPath,
    "utf8"
  ).trim();

  const targetCommit = commits.find(
    commit => commit.id === targetCommitId
  );

  if (!targetCommitId || !targetCommit) {
    throw new Error(
      `Branch '${branchName}' has no valid commit reference.`
    );
  }

  // Avoid merging if staged changes exist.
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

  // This starter version records a merge commit.
  // It does not yet perform a three-way file merge.
  const mergeCommit = {
    message: `Merge branch '${branchName}' into '${currentBranch}'`,
    timestamp: new Date().toISOString(),
    files: targetCommit.files,
    parent: commits[commits.length - 1].id,
    mergedParent: targetCommit.id
  };

  const crypto = require("crypto");

  const content = JSON.stringify(mergeCommit);

  mergeCommit.id = crypto
    .createHash("sha1")
    .update(content)
    .digest("hex");

  fs.writeFileSync(
    path.join(repoPath, "objects", mergeCommit.id),
    JSON.stringify(mergeCommit, null, 2)
  );

  commits.push(mergeCommit);

  fs.writeFileSync(
    commitsPath,
    JSON.stringify(commits, null, 2)
  );

  fs.writeFileSync(
    targetPath,
    mergeCommit.id
  );

  console.log(
    `Merged '${branchName}' into '${currentBranch}'.`
  );
  console.log(
    `Merge commit: ${mergeCommit.id.slice(0, 7)}`
  );
}

module.exports = { mergeBranch };
