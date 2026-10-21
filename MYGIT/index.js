
const { initRepository } = require("./lib/repository");
const { hashObject, catFile } = require("./lib/objects");
const { addFile } = require("./lib/staging");
const { commitChanges } = require("./lib/commit");
const { showStatus } = require("./lib/status");
const { showLog } = require("./lib/log");
const { listBranches, createBranch } = require("./lib/branch");
const { checkoutBranch } = require("./lib/checkout");
const { manageTag } = require("./lib/tag");
const {
  stashChanges,
  listStashes,
  applyStash
} = require("./lib/stash");
const { mergeBranch } = require("./lib/merge");



const args = process.argv.slice(2);
const command = args[0];

try {
  if (command === "init") {
    initRepository();

  } else if (command === "hash-object") {
    if (!args[1]) {
      throw new Error(
        "Usage: node index.js hash-object <file>"
      );
    }

    hashObject(args[1]);

  } else if (command === "cat-file") {
    if (!args[1] || !args[2]) {
      throw new Error(
        "Usage: node index.js cat-file <-p|-t|-s> <hash>"
      );
    }

    catFile(args[1], args[2]);

  } else if (command === "add") {
    if (!args[1]) {
      throw new Error(
        "Usage: node index.js add <file>"
      );
    }

    addFile(args[1]);

  } else if (command === "commit") {
    const messageIndex = args.indexOf("-m");

    if (
      messageIndex === -1 ||
      !args[messageIndex + 1]
    ) {
      throw new Error(
        'Usage: node index.js commit -m "your message"'
      );
    }

    const message = args
      .slice(messageIndex + 1)
      .join(" ");

    commitChanges(message);

  } else if (command === "log") {
  showLog();
  }
   else if (command === "status") {
    showStatus();

  } else if (command === "branch") {
  if (args[1]) {
    createBranch(args[1]);
  } else {
    listBranches();
  }
}
 else if (command === "checkout") {
  if (!args[1]) {
    throw new Error("Usage: node index.js checkout <branch>");
  }

  checkoutBranch(args[1]);
}
 else if (command === "tag") {
  manageTag(args[1]);
}
  
 else if (command === "stash") {
  const action = args[1];

  if (action === "save") {
    stashChanges();
  } else if (action === "list") {
    listStashes();
  } else if (action === "apply") {
    applyStash();
  } else {
    console.log(
      "Usage: node index.js stash <save|list|apply>"
    );
  }
}  else if (command === "merge") {
  mergeBranch(args[1]);}

  else {
    console.log("Available commands:");
    console.log("  init");
    console.log("  hash-object <file>");
    console.log("  cat-file <-p|-t|-s> <hash>");
    console.log("  add <file>");
    console.log('  commit -m "your message"');
    console.log("  status");
    console.log("  log");
    console.log("  branch [name]");
    console.log("  checkout <branch>");
    console.log("  tag [name]");
    console.log("Unknown command. Run node index.js help");

  }

} catch (error) {
  console.error("Error:", error.message);
  process.exitCode = 1;
}


