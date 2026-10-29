
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getRepoPath } = require("./repo-path");

function getObjectsPath() {
  return path.join(getRepoPath(), "objects");
}

function hashObject(filePath) {
  const objectsPath = getObjectsPath();

  if (!fs.existsSync(objectsPath)) {
    throw new Error("Repository not initialized. Run init first.");
  }

  const content = fs.readFileSync(filePath);
  const header = Buffer.from(`blob ${content.length}\0`);
  const objectData = Buffer.concat([header, content]);

  const hash = crypto
    .createHash("sha1")
    .update(objectData)
    .digest("hex");

  const objectPath = path.join(objectsPath, hash);

  if (!fs.existsSync(objectPath)) {
    fs.writeFileSync(objectPath, objectData);
  }

  console.log(hash);
  return hash;
}

function catFile(option, hash) {
  if (!/^[a-f0-9]{40}$/.test(hash || "")) {
    throw new Error("Invalid object hash.");
  }

  const objectPath = path.join(getObjectsPath(), hash);

  if (!fs.existsSync(objectPath)) {
    throw new Error("Object not found: " + hash);
  }

  const objectData = fs.readFileSync(objectPath);
  const separator = objectData.indexOf(0);

  if (separator === -1) {
    throw new Error("Invalid object format.");
  }

  const header = objectData.subarray(0, separator).toString();
  const content = objectData.subarray(separator + 1);
  const [type, sizeText] = header.split(" ");

  if (Number(sizeText) !== content.length) {
    throw new Error("Object size mismatch.");
  }

  if (option === "-t") {
    console.log(type);
  } else if (option === "-s") {
    console.log(content.length);
  } else if (option === "-p") {
    process.stdout.write(content);
    if (!content.toString().endsWith("\n")) {
      process.stdout.write("\n");
    }
  } else {
    throw new Error("Use -p, -t, or -s.");
  }
}

module.exports = { hashObject, catFile };
