
const path = require("path");

function getUserWorkspacePath(userId) {
  const numericId = Number(userId);

  if (
    !Number.isSafeInteger(numericId) ||
    numericId <= 0
  ) {
    throw new Error("Invalid user ID.");
  }

  return path.join(
    __dirname,
    "..",
    ".user-repos",
    String(numericId),
    "workspace"
  );
}

function getUserRepoPath(userId) {
  return path.join(getUserWorkspacePath(userId), ".minigit");
}

function getRepoPath() {
  const configuredPath = process.env.MINIGIT_REPO_DIR;

  if (!configuredPath) {
    return path.join(process.cwd(), ".minigit");
  }

  return path.resolve(configuredPath);
}

module.exports = {
  getUserWorkspacePath,
  getUserRepoPath,
  getRepoPath
};
