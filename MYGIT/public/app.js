

const output = document.getElementById("output");
const buttons = document.querySelectorAll("[data-command]");
const fileList = document.getElementById("file-list");
const fileMessage = document.getElementById("file-message");
const refreshButton = document.getElementById("refresh-files");
const stageButton = document.getElementById("stage-file");

const authPanel = document.getElementById("auth-panel");
const dashboard = document.getElementById("dashboard");
const authMessage = document.getElementById("auth-message");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const logoutButton = document.getElementById("logout-button");
const loggedInUser = document.getElementById("logged-in-user");

const commitMessageInput = document.getElementById("commit-message");
const commitButton = document.getElementById("commit-button");
const commitMessageStatus = document.getElementById(
  "commit-message-status"
);

const historyButton = document.getElementById("refresh-history");
const historyMessage = document.getElementById("history-message");
const historyList = document.getElementById("commit-history-list");

let selectedFile = null;
let busy = false;
let loggedIn = false;

function setBusy(value) {
  busy = value;

  buttons.forEach(button => {
    button.disabled = value;
  });

  refreshButton.disabled = value;
  stageButton.disabled = value || !selectedFile;
  commitButton.disabled = value;
  historyButton.disabled = value;
  logoutButton.disabled = value;
}

async function readJson(response) {
  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned non-JSON data (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}

async function postJson(url, body = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body)
  });

  return readJson(response);
}

function showLoggedOut() {
  loggedIn = false;
  authPanel.hidden = false;
  dashboard.hidden = true;
  authMessage.textContent = "";
}

async function showLoggedIn(user) {
  loggedIn = true;
  authPanel.hidden = true;
  dashboard.hidden = false;
  loggedInUser.textContent = `Logged in as ${user.username}`;

  output.textContent = "Welcome! Your Mini Git dashboard is ready.";
  await Promise.all([loadFiles(), loadCommitHistory()]);
}

// Login
loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  authMessage.textContent = "Logging in...";

  const form = new FormData(loginForm);

  try {
    const result = await postJson("/api/login", {
      username: form.get("username"),
      password: form.get("password")
    });

    loginForm.reset();
    await showLoggedIn(result.user);
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

// Register
registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  authMessage.textContent = "Creating your account...";

  const form = new FormData(registerForm);

  try {
    const result = await postJson("/api/register", {
      username: form.get("username"),
      password: form.get("password")
    });

    registerForm.reset();
    await showLoggedIn(result.user);
  } catch (error) {
    authMessage.textContent = error.message;
  }
});

// Logout
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    await postJson("/api/logout");
    showLoggedOut();
  } catch (error) {
    output.textContent = `Logout failed: ${error.message}`;
  } finally {
    logoutButton.disabled = false;
  }
});

// Repository command buttons
buttons.forEach(button => {
  button.addEventListener("click", async () => {
    if (busy || !loggedIn) return;

    const command = button.dataset.command;
    setBusy(true);

    try {
      if (command === "log") {
        const result = await readJson(await fetch("/api/history"));
        const commits = result.commits || [];

        if (commits.length === 0) {
          output.textContent = "No commits found.";
          return;
        }

        const lines = ["MINI GIT COMMIT HISTORY", ""];

        commits.forEach(commit => {
          lines.push(
            `Commit: ${commit.id}`,
            `Date: ${commit.timestamp}`,
            `Message: ${commit.message}`,
            `Parent: ${commit.parent || "None"}`,
            `Files: ${Object.keys(commit.files || {}).length}`,
            ""
          );
        });

        output.textContent = lines.join("\n");
        return;
      }

      output.textContent = `Running ${command}...`;

      const result = await postJson("/api/command", { command });
      output.textContent = result.output || "Command completed.";
    } catch (error) {
      output.textContent = `Error: ${error.message}`;
    } finally {
      setBusy(false);
    }
  });
});

// Load project files
async function loadFiles() {
  if (!loggedIn) return;

  selectedFile = null;
  stageButton.disabled = true;
  fileList.replaceChildren();
  fileMessage.textContent = "Loading project files...";

  try {
    const result = await readJson(await fetch("/api/files"));
    const files = result.files || [];

    if (files.length === 0) {
      fileMessage.textContent = "No project files found.";
      return;
    }

    files.forEach(file => {
      const item = document.createElement("li");
      const label = document.createElement("label");
      const radio = document.createElement("input");
      const name = document.createElement("span");

      radio.type = "radio";
      radio.name = "project-file";
      radio.value = file;
      name.textContent = file;

      label.className = "file-option";
      label.append(radio, name);
      item.append(label);
      fileList.append(item);

      radio.addEventListener("change", () => {
        selectedFile = file;

        fileList.querySelectorAll(".file-option").forEach(option => {
          option.classList.remove("selected");
        });

        label.classList.add("selected");
        stageButton.disabled = busy || !loggedIn;
        fileMessage.textContent = `Selected: ${file}`;
      });
    });

    fileMessage.textContent = `${files.length} file(s) found.`;
  } catch (error) {
    fileMessage.textContent = `Could not load files: ${error.message}`;
  }
}

refreshButton.addEventListener("click", loadFiles);

// Stage selected file
stageButton.addEventListener("click", async () => {
  if (busy || !selectedFile || !loggedIn) return;

  const file = selectedFile;
  setBusy(true);
  output.textContent = `Staging ${file}...`;

  try {
    const result = await postJson("/api/stage", { file });
    output.textContent = result.output || `Staged ${file}`;
    fileMessage.textContent = `Staged: ${file}`;
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  } finally {
    setBusy(false);
  }
});

// Create commit
commitButton.addEventListener("click", async () => {
  const message = commitMessageInput.value.trim();

  if (!message) {
    commitMessageStatus.textContent = "Please enter a commit message.";
    return;
  }

  if (busy || !loggedIn) return;

  setBusy(true);
  commitMessageStatus.textContent = "Creating commit...";
  output.textContent = "Creating commit...";

  try {
    const result = await postJson("/api/commit", { message });

    output.textContent = result.output || "Commit created successfully!";
    commitMessageStatus.textContent = "Commit created successfully!";
    commitMessageInput.value = "";

    await loadCommitHistory();
  } catch (error) {
    commitMessageStatus.textContent = `Commit failed: ${error.message}`;
  } finally {
    setBusy(false);
  }
});

// Display commit history
async function loadCommitHistory() {
  if (!loggedIn) return;

  historyMessage.textContent = "Loading commit history...";
  historyList.replaceChildren();

  try {
    const result = await readJson(await fetch("/api/history"));
    const commits = [...(result.commits || [])].reverse();

    if (commits.length === 0) {
      historyMessage.textContent = "No commits yet.";
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "Create your first commit!";
      historyList.append(empty);
      return;
    }

    commits.forEach(commit => {
      const card = document.createElement("article");
      card.className = "commit-card";

      const title = document.createElement("h3");
      title.className = "commit-card-message";
      title.textContent = commit.message || "Untitled commit";

      const details = document.createElement("div");
      details.className = "commit-card-details";

      function addDetail(labelText, valueText, extraClass = "") {
        const wrapper = document.createElement("div");
        wrapper.className = "commit-detail";

        const label = document.createElement("span");
        label.className = "commit-detail-label";
        label.textContent = labelText;

        const value = document.createElement("span");
        value.className = `commit-detail-value ${extraClass}`;
        value.textContent = valueText;

        wrapper.append(label, value);
        details.append(wrapper);
      }

      addDetail("COMMIT ID", (commit.id || "").slice(0, 7) || "Unavailable", "commit-id");

      const date = commit.timestamp ? new Date(commit.timestamp) : null;
      const formattedDate =
        date && !Number.isNaN(date.getTime())
          ? date.toLocaleString()
          : "Unknown date";

      addDetail("DATE", formattedDate);
      addDetail(
        "PARENT",
        commit.parent ? commit.parent.slice(0, 7) : "Initial commit",
        "commit-id"
      );

      const files = document.createElement("div");
      files.className = "commit-files";
      files.textContent =
        `${Object.keys(commit.files || {}).length} file(s) recorded in this commit`;

      card.append(title, details, files);
      historyList.append(card);
    });

    historyMessage.textContent = `${commits.length} commit(s) found.`;
  } catch (error) {
    historyMessage.textContent = `Could not load history: ${error.message}`;
  }
}

historyButton.addEventListener("click", loadCommitHistory);

// Check whether a session already exists when the page opens.
async function initializeApp() {
  showLoggedOut();

  try {
    const result = await readJson(await fetch("/api/me"));
    await showLoggedIn(result.user);
  } catch {
    showLoggedOut();
  }
}

initializeApp();
