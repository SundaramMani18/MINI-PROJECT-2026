
const output = document.getElementById("output");
const buttons = document.querySelectorAll("[data-command]");

buttons.forEach((button) => {
  button.addEventListener("click", async () => {
    const command = button.dataset.command;

    output.textContent = `Running ${command}...`;
    buttons.forEach((item) => {
      item.disabled = true;
    });

    try {
      const response = await fetch("/api/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ command })
      });

      const text = await response.text();

let result;

try {
    result = JSON.parse(text);
} catch {
    throw new Error(
        text.trim()
            ? "Server returned invalid JSON: " + text.slice(0, 200)
            : "Server returned an empty response. Check your backend."
    );
}


      if (!response.ok) {
        throw new Error(result.error || "Command failed.");
      }

      output.textContent = result.output || "Command completed.";
    } catch (error) {
      output.textContent = `Error: ${error.message}`;
    } finally {
      buttons.forEach((item) => {
        item.disabled = false;
      });
    }
  });
});
