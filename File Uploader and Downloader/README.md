# File Uploader and Downloader

## Overview

This project is a command-line file server written in TypeScript. It allows a user to upload files into server storage, list available files, download a file to a local folder, delete files, and view a recursive file tree.

The project demonstrates TypeScript classes, typed objects, lists, asynchronous file-system functions, terminal output, recursion, and exception handling.

## Project Demonstration Video

Add the link to the 4–5 minute demonstration video here: **[Video link](PASTE-YOUR-VIDEO-LINK-HERE)**

## Development Environment

* Visual Studio Code
* Node.js 18 or newer
* TypeScript 5 or newer
* Windows, macOS, or Linux

## Useful Websites

* [TypeScript Documentation](https://www.typescriptlang.org/docs/)
* [What is TypeScript and why should you use it?](https://www.contentful.com/blog/what-is-typescript-and-why-should-you-use-it/)
* [CSE 310 TypeScript Module](https://byui-cse.github.io/cse310-course/modules/language_typescript/README.md)
* [How to Set Up a New TypeScript Project](https://www.digitalocean.com/community/tutorials/typescript-new-project)

## Setup

1. Install Node.js from [nodejs.org](https://nodejs.org/).
2. Open this project folder in Visual Studio Code.
3. Open the terminal and run:

```bash
npm install
npm run build
```

## Running the Program

```bash
npm start
```

The program creates a `server-storage` folder automatically. Try these commands:

```text
upload sample.txt
list
tree
download sample.txt downloads
delete sample.txt
exit
```

The `upload` command copies a file into server storage. The `download` command copies it back out to the requested local folder. The program keeps the server files between runs.

## TypeScript Requirements Demonstrated

| Requirement | Where it appears |
| --- | --- |
| Display output to the terminal | `console.log` and `console.error` throughout `file-server.ts` |
| Recursion | `printDirectoryTree` in `file-server.ts` calls itself for nested directories |
| Classes | `FileServer` in `file-server.ts` organizes server operations and data |
| Lists | `FileRecord[]` in `file-server.ts` stores uploaded-file records |
| Asynchronous functions | File operations in `file-server.ts` use `async`, `await`, and `fs/promises` |
| Stretch: exceptions | Operations throw errors and the command loop in `file-server.ts` catches and displays them |

## Future Improvements

* Add user accounts and authentication.
* Add a browser interface with Express.
* Add file-size and file-type limits.
* Add Jest tests for upload, download, and delete behavior.
