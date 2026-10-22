
const express = require("express");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");

const app = express();
const PORT = 3000;

const ROOT = path.resolve(__dirname);
const PUBLIC_DIR = path.join(ROOT, "public");

app.use(express.json({ limit: "10kb" }));
app.use(express.static(PUBLIC_DIR));

// Commands permitted through the dashboard.
const allowedCommands = new Set([
  "status",
  "log",
  "branch",
  "tag",
  "stash list"
]);

// Internal folders and sensitive files excluded from browsing.
const excludedNames = new Set([
  ".minigit",
  ".git",
  "node_modules",
  ".env",
  ".vscode"
]);

// Validate a path before allowing the dashboard to stage a file.
function isSafeRelativePath(relativePath) {
  if (
    typeof relativePath !== "string" ||
    !relativePath.trim() ||
    path.isAbsolute(relativePath)
  ) {
    return false;
  }

  const normalized = path.normalize(relativePath);

  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith(".." + path.sep)
  ) {
    return false;
  }

  const fullPath = path.resolve(ROOT, normalized);

  if (!fullPath.startsWith(ROOT + path.sep)) {
    return false;
  }

  const parts = normalized.split(path.sep);

  if (
    parts.some(
      (part) =>
        excludedNames.has(part) ||
        part.toLowerCase().startsWith(".env")
    )
  ) {
    return false;
  }

  return true;
}

// List project files without exposing repository internals,
// dependency folders, or symbolic links.
function listProjectFiles(directory = ROOT, results = []) {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true
  });

  for (const entry of entries) {
    if (
      excludedNames.has(entry.name) ||
      entry.name.toLowerCase().startsWith(".env")
    ) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      listProjectFiles(fullPath, results);
    } else if (entry.isFile()) {
      results.push(
        path.relative(ROOT, fullPath).split(path.sep).join("/")
      );
    }
  }

  return results;
}

// Run an existing Mini Git CLI command.
app.post("/api/command", (req, res) => {
  const command = req.body?.command;

  if (!allowedCommands.has(command)) {
    return res.status(400).json({
      error: "Unsupported command."
    });
  }

  const args = command.split(" ");

  execFile(
    process.execPath,
    [path.join(ROOT, "index.js"), ...args],
    {
      cwd: ROOT,
      timeout: 5000,
      windowsHide: true
    },
    (error, stdout, stderr) => {
      if (error) {
        return res.status(400).json({
          error: (stderr || error.message).trim()
        });
      }

      return res.json({
        output:
          stdout.trim() ||
          stderr.trim() ||
          "Command completed."
      });
    }
  );
});

// Return the available project files to the browser.
app.get("/api/files", (req, res) => {
  try {
    const files = listProjectFiles().sort((a, b) =>
      a.localeCompare(b)
    );

    return res.json({ files });
  } catch (error) {
    console.error("File listing error:", error);

    return res.status(500).json({
      error: "Could not list project files."
    });
  }
});

// Stage a selected file using the existing CLI.
app.post("/api/stage", (req, res) => {
  const relativePath = req.body?.file;

  if (!isSafeRelativePath(relativePath)) {
    return res.status(400).json({
      error: "Invalid file path."
    });
  }

  const fullPath = path.resolve(ROOT, relativePath);

  try {
    const stats = fs.lstatSync(fullPath);

    if (!stats.isFile() || stats.isSymbolicLink()) {
      return res.status(400).json({
        error: "Only regular files can be staged."
      });
    }
  } catch (error) {
    return res.status(404).json({
      error: "File not found."
    });
  }

  execFile(
    process.execPath,
    [
      path.join(ROOT, "index.js"),
      "add",
      relativePath
    ],
    {
      cwd: ROOT,
      timeout: 5000,
      windowsHide: true
    },
    (error, stdout, stderr) => {
      if (error) {
        return res.status(400).json({
          error: (stderr || error.message).trim()
        });
      }

      return res.json({
        output:
          stdout.trim() ||
          `Staged ${relativePath}`
      });
    }
  );
});

// Create a commit using the existing CLI's -m argument.
app.post("/api/commit", (req, res) => {
  const message = req.body?.message;

  if (
    typeof message !== "string" ||
    !message.trim()
  ) {
    return res.status(400).json({
      error: "Please enter a commit message."
    });
  }

  if (message.length > 200) {
    return res.status(400).json({
      error: "Commit message must be 200 characters or fewer."
    });
  }

  execFile(
    process.execPath,
    [
      path.join(ROOT, "index.js"),
      "commit",
      "-m",
      message.trim()
    ],
    {
      cwd: ROOT,
      timeout: 5000,
      windowsHide: true
    },
    (error, stdout, stderr) => {
      if (error) {
        return res.status(400).json({
          error: (stderr || error.message).trim()
        });
      }

      return res.json({
        output:
          stdout.trim() ||
          stderr.trim() ||
          "Commit created successfully."
      });
    }
  );
});

// Start the dashboard on the local computer only.
app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `Mini Git dashboard: http://127.0.0.1:${PORT}`
  );
});
