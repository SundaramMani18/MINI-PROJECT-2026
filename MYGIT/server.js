
const express = require("express");
const path = require("path");
const { execFile } = require("child_process");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const allowedCommands = new Set([
  "status",
  "log",
  "branch",
  "tag",
  "stash list"
]);

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
    [path.join(__dirname, "index.js"), ...args],
    {
      cwd: __dirname,
      timeout: 5000,
      windowsHide: true
    },
    (error, stdout, stderr) => {
      if (error) {
        return res.status(400).json({
          error: (stderr || error.message).trim()
        });
      }

      res.json({
        output: stdout.trim() || stderr.trim() || "Command completed."
      });
    }
  );
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Mini Git dashboard: http://127.0.0.1:${PORT}`);
});
