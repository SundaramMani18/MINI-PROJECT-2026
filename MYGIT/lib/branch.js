const fs = require("fs");
const path = require("path");

function getRepoPath() {
  return path.join(process.cwd(), ".minigit");
}

function getHeadBranch() {
  const headPath = path.join(getRepoPath(), "HEAD");

  if (!fs.existsSync(headPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  const head = fs.readFileSync(headPath, "utf8").trim();

  if (!head.startsWith("ref: ")) {
    throw new Error("HEAD is detached. Branch command is unavailable.");
  }

  return head.slice("ref: ".length);
}

function getBranchPath(branchName) {
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

  return path.join(
    getRepoPath(),
    "refs",
    "heads",
    branchName
  );
}

function listBranches() {
  const headsPath = path.join(
    getRepoPath(),
    "refs",
    "heads"
  );

  if (!fs.existsSync(headsPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  const currentBranch = path.basename(getHeadBranch());
  const branches = fs.readdirSync(headsPath)
    .filter(name => fs.statSync(path.join(headsPath, name)).isFile());

  if (branches.length === 0) {
    console.log("No branches found.");
    return;
  }

  for (const branch of branches) {
    console.log(
      `${branch === currentBranch ? "* " : "  "}${branch}`
    );
  }
}

function createBranch(branchName) {
  const headsPath = path.join(
    getRepoPath(),
    "refs",
    "heads"
  );

  if (!fs.existsSync(headsPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  const branchPath = getBranchPath(branchName);

  if (fs.existsSync(branchPath)) {
    throw new Error(`Branch '${branchName}' already exists.`);
  }

  const commitsPath = path.join(getRepoPath(), "commits.json");
  let latestCommitId = "";

  if (fs.existsSync(commitsPath)) {
    const commits = JSON.parse(
      fs.readFileSync(commitsPath, "utf8")
    );

    if (commits.length > 0) {
      latestCommitId = commits[commits.length - 1].id;
    }
  }

  fs.writeFileSync(branchPath, latestCommitId);
  console.log(`Created branch '${branchName}'.`);
}

module.exports = { listBranches, createBranch };
