
const fs = require("fs");
const path = require("path");
const { getRepoPath } = require("./repo-path");

function manageTag(tagName) {
  const repoPath = getRepoPath();
  const commitsPath = path.join(repoPath, "commits.json");
  const tagsPath = path.join(repoPath, "tags.json");

  if (!fs.existsSync(repoPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  let tags = {};

  if (fs.existsSync(tagsPath)) {
    tags = JSON.parse(fs.readFileSync(tagsPath, "utf8"));
  }

  // List all tags.
  if (!tagName) {
    const names = Object.keys(tags).sort();

    if (names.length === 0) {
      console.log("No tags found.");
      return;
    }

    console.log("Mini Git Tags:");

    for (const name of names) {
      console.log(`${name} -> ${tags[name]}`);
    }

    return;
  }

  if (
    tagName.startsWith("-") ||
    !/^[a-zA-Z0-9._-]+$/.test(tagName) ||
    tagName === "." ||
    tagName === ".."
  ) {
    throw new Error("Invalid tag name.");
  }

  if (Object.prototype.hasOwnProperty.call(tags, tagName)) {
    throw new Error(`Tag '${tagName}' already exists.`);
  }

  if (!fs.existsSync(commitsPath)) {
    throw new Error("No commits found. Create a commit first.");
  }

  const commits = JSON.parse(
    fs.readFileSync(commitsPath, "utf8")
  );

  if (!Array.isArray(commits) || commits.length === 0) {
    throw new Error("No commits found. Create a commit first.");
  }

  const latestCommit = commits[commits.length - 1];

  tags[tagName] = latestCommit.id;

  fs.writeFileSync(
    tagsPath,
    JSON.stringify(tags, null, 2)
  );

  console.log(
    `Created tag '${tagName}' at ${latestCommit.id.slice(0, 7)}`
  );
}

module.exports = { manageTag };
