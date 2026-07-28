# Android Full Autonomous Mode

Full Autonomous mode is an explicit opt-in separate from the restricted Off, Suggest, Read-only, and Prepare modes.

## Capabilities

- arbitrary `/system/bin/sh -c` commands inside ForgeAI app-private storage;
- foreground command streaming, timeout, output cap, cancellation, and emergency Stop;
- public web research through Wikipedia and Google News RSS;
- Google Programmable Search when the user configures an API key and Search Engine ID;
- HTTPS direct retrieval with local/private-address blocking;
- encrypted GitHub PAT vault backed by Android Keystore AES-GCM;
- generic GitHub `/repos/` REST operations, including Actions endpoints;
- public/private JGit HTTPS clone into app-private repository storage;
- JGit status, log, fetch, pull, checkout/branch creation, commit, push, and rebase;
- model-directed terminal/Git action planning;
- autonomous application of deterministic-reviewed workspace patches and new files;
- task, subagent, queue, terminal, and Git result reporting.

## Platform boundaries

- commands run as the Android app UID, not root;
- other apps' private storage remains inaccessible;
- SAF workspace files are still handled through WorkspaceProvider; shell commands operate on app-private clones/home;
- Android normally does not ship Git, Node, npm, Python, compilers, or package managers; JGit supplies Git operations without a shell binary;
- cloned Git repositories are app-private and separate from SAF workspace folders;
- repository ZIP import has no Git history; use JGit clone for pull/push/rebase;
- Google general search requires official Programmable Search credentials; public fallback coverage is narrower;
- private/login-only social data and WhatsApp content are not accessible without an official authorized API.

## Credential handling

- GitHub PAT is entered in Settings and immediately encrypted;
- JavaScript can ask whether a token exists but cannot retrieve it;
- the token is not placed in terminal environment variables;
- the model receives tool results, never token contents;
- clearing the vault removes the encrypted token record.

## Risk model

Full autonomy deliberately removes per-operation approval. Web content can contain prompt injection, models can issue destructive commands, Git force-push can rewrite history, and scoped PATs can modify remote repositories. The Android app sandbox reduces device-wide impact but does not protect app-private clones or authorized GitHub resources from an autonomous mistake.

Use a narrowly scoped GitHub fine-grained PAT, avoid force push, keep important remotes protected, and disable Full Autonomous mode when the task ends.
