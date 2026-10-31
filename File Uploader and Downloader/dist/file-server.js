"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const readline = __importStar(require("node:readline/promises"));
const node_process_1 = require("node:process");
class FileServer {
    storageDirectory;
    records = [];
    constructor(storageDirectory) {
        this.storageDirectory = storageDirectory;
    }
    async start() {
        await fs.mkdir(this.storageDirectory, { recursive: true });
        await this.loadExistingFiles();
        console.log(`Server storage is ready at: ${this.storageDirectory}`);
    }
    async upload(sourcePath) {
        const source = path.resolve(sourcePath);
        const sourceStats = await fs.stat(source);
        if (!sourceStats.isFile())
            throw new Error("The upload source must be a file.");
        const safeName = path.basename(source);
        await fs.copyFile(source, path.join(this.storageDirectory, safeName));
        this.addOrUpdateRecord(safeName, sourceStats.size);
        console.log(`Uploaded: ${safeName} (${formatBytes(sourceStats.size)})`);
    }
    async download(fileName, destinationDirectory) {
        const safeName = path.basename(fileName);
        const source = path.join(this.storageDirectory, safeName);
        const sourceStats = await fs.stat(source);
        const destination = path.join(path.resolve(destinationDirectory), safeName);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.copyFile(source, destination);
        console.log(`Downloaded: ${safeName} (${formatBytes(sourceStats.size)})`);
        console.log(`Saved to: ${destination}`);
    }
    async delete(fileName) {
        const safeName = path.basename(fileName);
        await fs.unlink(path.join(this.storageDirectory, safeName));
        const index = this.records.findIndex((record) => record.name === safeName);
        if (index >= 0)
            this.records.splice(index, 1);
        console.log(`Deleted: ${safeName}`);
    }
    listFiles() {
        if (this.records.length === 0) {
            console.log("The server is empty.");
            return;
        }
        console.log("\nFiles on the server:");
        this.records.forEach((record, index) => {
            console.log(`${index + 1}. ${record.name} | ${formatBytes(record.size)} | uploaded ${record.uploadedAt}`);
        });
    }
    async showTree() {
        console.log("\nServer file tree:");
        await printDirectoryTree(this.storageDirectory, "");
    }
    async loadExistingFiles() {
        const entries = await fs.readdir(this.storageDirectory, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile()) {
                const stats = await fs.stat(path.join(this.storageDirectory, entry.name));
                this.addOrUpdateRecord(entry.name, stats.size);
            }
        }
    }
    addOrUpdateRecord(name, size) {
        const existing = this.records.find((record) => record.name === name);
        const record = { name, size, uploadedAt: new Date().toLocaleString() };
        if (existing)
            Object.assign(existing, record);
        else
            this.records.push(record);
    }
}
// This recursive function walks every directory below the server folder.
async function printDirectoryTree(directory, prefix) {
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
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 ** 2)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
function printHelp() {
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
async function run() {
    const server = new FileServer(path.resolve("server-storage"));
    await server.start();
    printHelp();
    const terminal = readline.createInterface({ input: node_process_1.stdin, output: node_process_1.stdout });
    console.log("Type a command to begin.");
    try {
        while (true) {
            const answer = (await terminal.question("\nfile-server> ")).trim();
            const [command, ...argumentsList] = answer.split(/\s+/);
            if (!command)
                continue;
            if (command.toLowerCase() === "exit")
                break;
            try {
                switch (command.toLowerCase()) {
                    case "upload":
                        if (!argumentsList[0])
                            throw new Error("Usage: upload <file-path>");
                        await server.upload(argumentsList[0]);
                        break;
                    case "list":
                        server.listFiles();
                        break;
                    case "download":
                        if (!argumentsList[0])
                            throw new Error("Usage: download <file-name> [folder]");
                        await server.download(argumentsList[0], argumentsList[1] ?? "downloads");
                        break;
                    case "delete":
                        if (!argumentsList[0])
                            throw new Error("Usage: delete <file-name>");
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
            }
            catch (error) {
                const message = error instanceof Error ? error.message : "An unknown error occurred.";
                console.error(`Operation failed: ${message}`);
            }
        }
    }
    finally {
        terminal.close();
        console.log("File server closed.");
    }
}
run().catch((error) => {
    const message = error instanceof Error ? error.message : "An unknown startup error occurred.";
    console.error(`Could not start the file server: ${message}`);
    process.exitCode = 1;
});
