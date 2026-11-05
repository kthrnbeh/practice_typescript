/* ============================================================
   FILE UPLOADER AND DOWNLOADER
   This program demonstrates local file storage through commands.
   It copies files into server-storage and copies them back out.
   ============================================================ */

/* These Node modules let the program copy files, inspect folders,
   build safe paths, and read commands from the terminal. */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/* A FileRecord stores the information shown by `list`.
   The actual file is stored on disk; this object stores its metadata. */
type FileRecord = {
  name: string;
  size: number;
  uploadedAt: string;
};

class FileServer {
  /* FileServer groups all storage operations.
     storageDirectory is the folder acting as the server.
     records is the in-memory list displayed to the user. */
  private readonly storageDirectory: string;
  private readonly records: FileRecord[] = [];

  public constructor(storageDirectory: string) {
    this.storageDirectory = storageDirectory;
  }

  public async start(): Promise<void> {
    /* Create the storage folder if needed.
       Then inspect existing files so previous uploads appear in `list`. */
    await fs.mkdir(this.storageDirectory, { recursive: true });
    await this.loadExistingFiles();
    console.log(`Server storage is ready at: ${this.storageDirectory}`);
  }

  public async upload(sourcePath: string): Promise<void> {
    /* Resolve the source path and confirm it is a file.
       basename keeps only the filename when placing it in server storage. */
    const source = path.resolve(sourcePath);
    const sourceStats = await fs.stat(source);
    if (!sourceStats.isFile()) throw new Error("The upload source must be a file.");
    const safeName = path.basename(source);
    // copyFile duplicates the source without changing the original file.
    await fs.copyFile(source, path.join(this.storageDirectory, safeName));
    this.addOrUpdateRecord(safeName, sourceStats.size);
    console.log(`Uploaded: ${safeName} (${formatBytes(sourceStats.size)})`);
  }

  public async download(fileName: string, destinationDirectory: string): Promise<void> {
    /* basename prevents path segments such as .. from selecting another
       server file location. The destination folder is created if necessary. */
    const safeName = path.basename(fileName);
    const source = path.join(this.storageDirectory, safeName);
    const sourceStats = await fs.stat(source);
    const destination = path.join(path.resolve(destinationDirectory), safeName);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
    console.log(`Downloaded: ${safeName} (${formatBytes(sourceStats.size)})`);
    console.log(`Saved to: ${destination}`);
  }

  public async delete(fileName: string): Promise<void> {
    /* Remove the physical file first.
       Then remove its matching metadata from the records array. */
    const safeName = path.basename(fileName);
    await fs.unlink(path.join(this.storageDirectory, safeName));
    const index = this.records.findIndex((record) => record.name === safeName);
    if (index >= 0) this.records.splice(index, 1);
    console.log(`Deleted: ${safeName}`);
  }

  public listFiles(): void {
    /* This method is synchronous because it reads memory only.
       It does not need to wait for a filesystem operation. */
    if (this.records.length === 0) {
      console.log("The server is empty.");
      return;
    }
    console.log("\nFiles on the server:");
    this.records.forEach((record, index) => {
      console.log(`${index + 1}. ${record.name} | ${formatBytes(record.size)} | uploaded ${record.uploadedAt}`);
    });
  }

  public async showTree(): Promise<void> {
    /* Start a recursive directory walk at the server folder.
       Nested directories are printed by printDirectoryTree. */
    console.log("\nServer file tree:");
    await printDirectoryTree(this.storageDirectory, "");
  }

  private async loadExistingFiles(): Promise<void> {
    /* Read files already present from an earlier run.
       Directories are skipped because this list tracks files only. */
    const entries = await fs.readdir(this.storageDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const stats = await fs.stat(path.join(this.storageDirectory, entry.name));
        this.addOrUpdateRecord(entry.name, stats.size);
      }
    }
  }

  private addOrUpdateRecord(name: string, size: number): void {
    /* If the filename already exists, update its metadata.
       Otherwise push a new FileRecord into the list. */
    const existing = this.records.find((record) => record.name === name);
    const record: FileRecord = { name, size, uploadedAt: new Date().toLocaleString() };
    if (existing) Object.assign(existing, record);
    else this.records.push(record);
  }
}

/* This recursive function walks every directory below the server folder.
   It demonstrates recursion by calling itself for each child directory. */
async function printDirectoryTree(directory: string, prefix: string): Promise<void> {
  // Read one directory, print its entries, and recurse into child directories.
  const entries = await fs.readdir(directory, { withFileTypes: true });
  if (entries.length === 0) {
    console.log(`${prefix}(empty)`);
    return;
  }
  for (const entry of entries) {
    const marker = entry.isDirectory() ? "📁" : "📄";
    console.log(`${prefix}${marker} ${entry.name}`);
    if (entry.isDirectory()) {
      await printDirectoryTree(path.join(directory, entry.name), `${prefix}  `);
    }
  }
}

function formatBytes(bytes: number): string {
  /* Convert raw bytes into a readable unit.
     Small files use bytes, medium files use KB, and larger files use MB. */
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function printHelp(): void {
  /* Keep command syntax in one place.
     This menu is printed at startup and by the help command. */
  console.log(`
Commands:
  upload <file-path>                 Copy a local file to the server.
  list                               Display uploaded files.
  download <file-name> [folder]      Copy a server file to a local folder.
  delete <file-name>                 Remove a file from the server.
  tree                               Recursively display the server folder.
  help                               Display these commands.
  exit                               Close the program.
`);
}

async function run(): Promise<void> {
  /* run is the application entry point.
     It creates the server, displays commands, and processes input repeatedly. */
  const server = new FileServer(path.resolve("server-storage"));
  await server.start();
  printHelp();
  const terminal = readline.createInterface({ input, output });
  console.log("Type a command to begin.");

  try {
    while (true) {
      // End-of-input, such as Ctrl+D or Ctrl+Z, is also treated as a normal exit.
      let answer: string;
      try {
        answer = (await terminal.question("\nfile-server> ")).trim();
      } catch {
        break;
      }
      // Splitting turns `upload report.txt` into command = upload and one argument.
      const [command, ...argumentsList] = answer.split(/\s+/);
      if (!command) continue;
      if (command.toLowerCase() === "exit") break;
      try {
        // Each operation has an error boundary so one bad command does not stop the server.
        switch (command.toLowerCase()) {
          case "upload":
            if (!argumentsList[0]) throw new Error("Usage: upload <file-path>");
            await server.upload(argumentsList[0]);
            break;
          case "list":
            server.listFiles();
            break;
          case "download":
            if (!argumentsList[0]) throw new Error("Usage: download <file-name> [folder]");
            await server.download(argumentsList[0], argumentsList[1] ?? "downloads");
            break;
          case "delete":
            if (!argumentsList[0]) throw new Error("Usage: delete <file-name>");
            await server.delete(argumentsList[0]);
            break;
          case "tree":
            await server.showTree();
            break;
          case "help":
            printHelp();
            break;
          default:
            console.log(`Unknown command: ${command}. Type help for available commands.`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error(`Operation failed: ${message}`);
      }
    }
  } finally {
    terminal.close();
    console.log("File server closed.");
  }
}

run().catch((error: unknown) => {
  // Handle failures that happen before the command loop can handle them.
  const message = error instanceof Error ? error.message : "An unknown startup error occurred.";
  console.error(`Could not start the file server: ${message}`);
  process.exitCode = 1;
});
