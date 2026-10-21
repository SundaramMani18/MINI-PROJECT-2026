
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function getRepoPath() {
  return path.join(process.cwd(), ".minigit");
}

function stashChanges() {
  const repoPath = getRepoPath();
  const stashPath = path.join(repoPath, "stash.json");
  const indexPath = path.join(repoPath, "index");

  if (!fs.existsSync(repoPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  if (!fs.existsSync(indexPath)) {
    throw new Error("Nothing staged to stash.");
  }

  const index = JSON.parse(
    fs.readFileSync(indexPath, "utf8")
  );

  if (Object.keys(index).length === 0) {
    throw new Error("Nothing staged to stash.");
  }

  const files = {};

  for (const [filePath, hash] of Object.entries(index)) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    files[filePath] = {
      content: fs.readFileSync(filePath, "utf8"),
      hash
    };
  }

  let stashes = [];

  if (fs.existsSync(stashPath)) {
    stashes = JSON.parse(
      fs.readFileSync(stashPath, "utf8")
    );
  }

  const id = crypto
    .createHash("sha1")
    .update(JSON.stringify(files) + Date.now())
    .digest("hex");

  stashes.push({
    id,
    timestamp: new Date().toISOString(),
    files
  });

  fs.writeFileSync(
    stashPath,
    JSON.stringify(stashes, null, 2)
  );

  // Remove staged entries and restore the saved file content.
  fs.writeFileSync(indexPath, JSON.stringify({}, null, 2));

  console.log(`Saved stash ${id.slice(0, 7)}.`);
}

function listStashes() {
  const stashPath = path.join(getRepoPath(), "stash.json");

  if (!fs.existsSync(stashPath)) {
    console.log("No stashes found.");
    return;
  }

  const stashes = JSON.parse(
    fs.readFileSync(stashPath, "utf8")
  );

  if (stashes.length === 0) {
    console.log("No stashes found.");
    return;
  }

  stashes.forEach((stash, index) => {
    console.log(
      `stash@{${index}} ${stash.id.slice(0, 7)} ${stash.timestamp}`
    );
  });
}

function applyStash() {
  const repoPath = getRepoPath();
  const stashPath = path.join(repoPath, "stash.json");

  if (!fs.existsSync(stashPath)) {
    throw new Error("No stashes found.");
  }

  const stashes = JSON.parse(
    fs.readFileSync(stashPath, "utf8")
  );

  if (stashes.length === 0) {
    throw new Error("No stashes found.");
  }

  const stash = stashes[stashes.length - 1];

  for (const [filePath, saved] of Object.entries(stash.files)) {
    const absolutePath = path.resolve(filePath);
    const rootPath = path.resolve(process.cwd());

    if (
      absolutePath !== rootPath &&
      !absolutePath.startsWith(rootPath + path.sep)
    ) {
      throw new Error("Invalid file path in stash.");
    }

    fs.mkdirSync(path.dirname(absolutePath), {
      recursive: true
    });

    fs.writeFileSync(absolutePath, saved.content);
  }

  console.log(`Applied stash ${stash.id.slice(0, 7)}.`);
}

module.exports = {
  stashChanges,
  listStashes,
  applyStash
};
