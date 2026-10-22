
const output = document.getElementById("output");
const buttons = document.querySelectorAll("[data-command]");
const fileList = document.getElementById("file-list");
const fileMessage = document.getElementById("file-message");
const refreshButton = document.getElementById("refresh-files");
const stageButton = document.getElementById("stage-file");

let selectedFile = null;
let busy = false;

function setBusy(value) {
  busy = value;

  buttons.forEach(button => {
    button.disabled = value;
  });

  refreshButton.disabled = value;
  stageButton.disabled = value || !selectedFile;
}

async function readJson(response) {
  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned non-JSON data (HTTP ${response.status}). ` +
      `Response: ${text.slice(0, 150)}`
    );
  }

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
}





// Existing repository command buttons.
buttons.forEach(button => {
  button.addEventListener("click", async () => {
    if (busy) return;

    const command = button.dataset.command;
    setBusy(true);
    output.textContent = `Running ${command}...`;

    try {
      const response = await fetch("/api/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ command })
      });

      const result = await readJson(response);
      output.textContent = result.output || "Command completed.";
    } catch (error) {
      output.textContent = `Error: ${error.message}`;
    } finally {
      setBusy(false);
    }
  });
});

// Load the files returned by the local server.
async function loadFiles() {
  if (busy) return;

  selectedFile = null;
  stageButton.disabled = true;
  fileList.replaceChildren();
  fileMessage.textContent = "Loading project files...";

  try {
    const response = await fetch("/api/files");
    const result = await readJson(response);

    if (result.files.length === 0) {
      fileMessage.textContent = "No project files found.";
      return;
    }

    result.files.forEach(file => {
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
        stageButton.disabled = busy || !selectedFile;
        fileMessage.textContent = `Selected: ${file}`;
      });
    });

    fileMessage.textContent = `${result.files.length} file(s) found.`;
  } catch (error) {
    fileMessage.textContent = `Could not load files: ${error.message}`;
  }
}

// Stage the selected file through the existing CLI add command.
stageButton.addEventListener("click", async () => {
  if (busy || !selectedFile) return;

  const file = selectedFile;
  setBusy(true);
  output.textContent = `Staging ${file}...`;

  try {
    const response = await fetch("/api/stage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ file })
    });

    const result = await readJson(response);

    output.textContent = result.output || `Staged ${file}`;
    fileMessage.textContent = `Staged: ${file}`;
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  } finally {
    setBusy(false);
  }
});

refreshButton.addEventListener("click", loadFiles);

loadFiles();
//new add here

const commitMessageInput = document.getElementById("commit-message");
const commitButton = document.getElementById("commit-button");
const commitMessageStatus = document.getElementById(
  "commit-message-status"
);

commitButton.addEventListener("click", async () => {
  const message = commitMessageInput.value.trim();

  if (!message) {
    commitMessageStatus.textContent =
      "Please enter a commit message.";
    return;
  }

  if (busy) return;

  setBusy(true);
  commitMessageStatus.textContent = "Creating commit...";
  output.textContent = "Creating commit...";

  try {
    const response = await fetch("/api/commit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const result = await readJson(response);

    output.textContent = result.output;
    commitMessageStatus.textContent =
      "Commit created successfully!";
    commitMessageInput.value = "";

  } catch (error) {
    commitMessageStatus.textContent =
      `Commit failed: ${error.message}`;
  } finally {
    setBusy(false);
  }
});

