

const express = require("express");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcryptjs");
const pool = require("./lib/database");
const { getUserWorkspacePath, getUserRepoPath } =
  require("./lib/repo-path");


const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = path.resolve(__dirname);
const PUBLIC_DIR = path.join(ROOT, "public");

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from the environment.");
}


app.use(express.json({ limit: "10kb" }));

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: false
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use(express.static(PUBLIC_DIR));

app.post("/api/register", async (req, res) => {
  const username = req.body?.username;
  const password = req.body?.password;

  if (
    typeof username !== "string" ||
    !/^[a-zA-Z0-9_]{3,30}$/.test(username) ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 72
  ) {
    return res.status(400).json({
      error: "Use a username of 3–30 letters, numbers, or underscores and a password of 8–72 characters."
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username`,
      [username, passwordHash]
    );

    req.session.regenerate((error) => {
      if (error) {
        console.error("Session error:", error.message);
        return res.status(500).json({ error: "Could not start session." });
      }

      req.session.user = result.rows[0];

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save error:", saveError.message);
          return res.status(500).json({ error: "Could not save session." });
        }

        return res.status(201).json({ user: result.rows[0] });
      });
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "That username is already taken." });
    }

    console.error("Registration error:", error.message);
    return res.status(500).json({ error: "Registration failed." });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length > 50 ||
    password.length > 72
  ) {
    return res.status(400).json({ error: "Invalid username or password." });
  }

  try {
    const result = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE username = $1",
      [username]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const safeUser = { id: user.id, username: user.username };

    req.session.regenerate((error) => {
      if (error) {
        console.error("Session error:", error.message);
        return res.status(500).json({ error: "Could not start session." });
      }

      req.session.user = safeUser;

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save error:", saveError.message);
          return res.status(500).json({ error: "Could not save session." });
        }

        return res.json({ user: safeUser });
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Login failed." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error.message);
      return res.status(500).json({ error: "Could not log out." });
    }

    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out." });
  });
});


/*app.get("/api/files", requireLogin, (req, res) => {

  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in." });
  }

  return res.json({ user: req.session.user });
});*/
function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: "Please log in to use Mini Git."
    });
  }

  next();
}
function getCurrentUserWorkspace(req) {
  return getUserWorkspacePath(req.session.user.id);
}

function getCurrentUserRepo(req) {
  return getUserRepoPath(req.session.user.id);
}


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

app.post("/api/command", requireLogin, (req, res) => {
  const command = req.body?.command;

  if (!allowedCommands.has(command)) {
    return res.status(400).json({
      error: "Unsupported command."
    });
  }

  const args = command.split(" ");
  const workspace = getCurrentUserWorkspace(req);
  const repoPath = getCurrentUserRepo(req);

  // The workspace and repository are selected by the server,
  // using the authenticated user's session.
  fs.mkdirSync(workspace, { recursive: true });

  execFile(
    process.execPath,
    [path.join(ROOT, "index.js"), ...args],
    {
      cwd: workspace,
      env: {
        ...process.env,
        MINIGIT_REPO_DIR: repoPath
      },
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

app.get("/api/files", requireLogin, (req, res) => {
  try {
    const workspace = getCurrentUserWorkspace(req);

    fs.mkdirSync(workspace, { recursive: true });

    const files = listProjectFiles(workspace).sort((a, b) =>
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


app.post("/api/stage", requireLogin, (req, res) => {
  const relativePath = req.body?.file;

  if (!isSafeRelativePath(relativePath)) {
    return res.status(400).json({
      error: "Invalid file path."
    });
  }

  const workspace = getCurrentUserWorkspace(req);
  const repoPath = getCurrentUserRepo(req);
  const fullPath = path.resolve(workspace, relativePath);

  // Ensure the resolved path remains inside this user's workspace.
  const relativeToWorkspace = path.relative(workspace, fullPath);

  if (
    !relativeToWorkspace ||
    relativeToWorkspace === ".." ||
    relativeToWorkspace.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToWorkspace)
  ) {
    return res.status(400).json({
      error: "Invalid file path."
    });
  }

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
      cwd: workspace,
      env: {
        ...process.env,
        MINIGIT_REPO_DIR: repoPath
      },
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
        output: stdout.trim() || `Staged ${relativePath}`
      });
    }
  );
});


// Create a commit using the existing CLI's -m argument.

app.post("/api/commit", requireLogin, (req, res) => {
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

  const workspace = getCurrentUserWorkspace(req);
  const repoPath = getCurrentUserRepo(req);

  execFile(
    process.execPath,
    [
      path.join(ROOT, "index.js"),
      "commit",
      "-m",
      message.trim()
    ],
    {
      cwd: workspace,
      env: {
        ...process.env,
        MINIGIT_REPO_DIR: repoPath
      },
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

//adding new

 // Return saved commit history to the dashboard.

app.get("/api/history", requireLogin, (req, res) => {

  const repoPath = getCurrentUserRepo(req);
const commitsPath = path.join(repoPath, "commits.json");
  try {
    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({
        error: "Repository not initialized. Run init first."
      });
    }

    if (!fs.existsSync(commitsPath)) {
      return res.json({ commits: [] });
    }

    const commits = JSON.parse(
      fs.readFileSync(commitsPath, "utf8")
    );

    if (!Array.isArray(commits)) {
      return res.status(500).json({
        error: "Invalid commit history format."
      });
    }

    // Display the newest commit first.
    const history = [...commits].reverse().map((commit) => ({
      id: commit.id,
      message: commit.message,
      timestamp: commit.timestamp,
      parent: commit.parent,
      files: commit.files
    }));

    return res.json({ commits: history });
  } catch (error) {
    console.error("Commit history error:", error);

    return res.status(500).json({
      error: "Could not read commit history."
    });
  }
});


// Start the dashboard on the local computer only.
app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `Mini Git dashboard: http://127.0.0.1:${PORT}`
  );
});
