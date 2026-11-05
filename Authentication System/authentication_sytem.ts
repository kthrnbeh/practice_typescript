/* ============================================================
   AUTHENTICATION SYSTEM
   This program lets a person register, log in, manage a profile,
   and log out through a terminal command interface.
   ============================================================ */

/* Node's built-in modules provide encryption, file storage, path
   handling, and terminal input. No web framework is required. */
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/* A User is the shape of one saved account.
   passwordHash and passwordSalt are stored instead of the original password.
   lastLogin can be null because a new user has not logged in yet. */
type User = {
  username: string;
  email: string;
  displayName: string;
  bio: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  lastLogin: string | null;
};

class AuthenticationError extends Error {
  /* This custom error represents expected user mistakes, such as
     an invalid password or trying to view a profile while logged out. */
  public constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

class UserManager {
  /* UserManager is the main part of the application.
     users stores all accounts loaded from JSON.
     dataFile stores the path to the persistent database.
     currentUsername represents the current terminal session. */
  private readonly users: User[] = [];
  private readonly dataFile: string;
  private currentUsername: string | null = null;

  public constructor(dataFile: string) {
    this.dataFile = dataFile;
  }

  public async start(): Promise<void> {
    /* Create the data folder if it does not exist.
       Then load saved accounts so data survives program restarts. */
    await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
    try {
      // Read the JSON text and convert it back into a User array.
      const savedUsers = await fs.readFile(this.dataFile, "utf8");
      const parsedUsers: User[] = JSON.parse(savedUsers);
      this.users.push(...parsedUsers);
    } catch (error: unknown) {
      /* A missing file is normal on the first run, so create an empty database.
         Other errors may mean the database is damaged or inaccessible. */
      if (isFileNotFound(error)) {
        await this.saveUsers();
      } else {
        throw new Error("The user database could not be loaded.");
      }
    }
  }

  public async register(username: string, email: string, password: string): Promise<void> {
    /* Normalize values before checking duplicates.
       This prevents "Alice" and " alice " from becoming separate accounts. */
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    // Reject invalid input before creating a user or hashing a password.
    validateRegistration(normalizedUsername, normalizedEmail, password);
    if (this.findUser(normalizedUsername)) throw new AuthenticationError("That username is already registered.");
    if (this.users.some((user) => user.email === normalizedEmail)) {
      throw new AuthenticationError("That email is already registered.");
    }

    // Hashing is asynchronous because scrypt intentionally requires computer work.
    const passwordData = await hashPassword(password);
    const newUser: User = {
      username: normalizedUsername,
      email: normalizedEmail,
      displayName: normalizedUsername,
      bio: "No bio has been added yet.",
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };
    // Add the account to memory, then save the updated list to disk.
    this.users.push(newUser);
    await this.saveUsers();
    console.log(`Registration complete. Welcome, ${newUser.displayName}!`);
  }

  public async login(username: string, password: string): Promise<void> {
    /* Find the account and compare the submitted password with its saved hash.
       The same error is used for a missing user and a wrong password. */
    const user = this.findUser(username.trim().toLowerCase());
    if (!user || !(await verifyPassword(password, user.passwordHash, user.passwordSalt))) {
      throw new AuthenticationError("The username or password is incorrect.");
    }
    // A successful login updates both the session and the last-login timestamp.
    user.lastLogin = new Date().toISOString();
    this.currentUsername = user.username;
    await this.saveUsers();
    console.log(`Login successful. Hello, ${user.displayName}!`);
  }

  public logout(): void {
    // Logging out clears the session, but keeps the account saved for next time.
    if (!this.currentUsername) throw new AuthenticationError("No user is currently logged in.");
    console.log(`${this.currentUsername} has been logged out.`);
    this.currentUsername = null;
  }

  public showProfile(): void {
    /* requireCurrentUser prevents a logged-out person from seeing profile data.
       The nullish coalescing operator displays "Never" for a new account. */
    const user = this.requireCurrentUser();
    console.log("\n--- User Profile ---");
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Display name: ${user.displayName}`);
    console.log(`Bio: ${user.bio}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Last login: ${user.lastLogin ?? "Never"}`);
  }

  public async editProfile(displayName: string, bio: string): Promise<void> {
    /* Only a logged-in user may change profile fields.
       trim removes accidental spaces before checking for empty values. */
    const user = this.requireCurrentUser();
    const trimmedName = displayName.trim();
    const trimmedBio = bio.trim();
    if (!trimmedName || !trimmedBio) throw new AuthenticationError("Display name and bio cannot be empty.");
    user.displayName = trimmedName;
    user.bio = trimmedBio;
    await this.saveUsers();
    console.log("Profile updated.");
  }

  public security(): void {
    /* This command explains the main security ideas demonstrated here.
       printSecurityChecklist uses recursion to print the list. */
    console.log("\n--- Security Checklist ---");
    printSecurityChecklist([
      "Passwords are saved as salted scrypt hashes.",
      "Plain-text passwords are never written to users.json.",
      "Usernames and emails are normalized before duplicate checks.",
      "Profile commands require a logged-in session.",
    ]);
  }

  private findUser(username: string): User | undefined {
    /* Array.find checks each user until it finds the requested username.
       If there is no match, it returns undefined. */
    return this.users.find((user) => user.username === username);
  }

  private requireCurrentUser(): User {
    /* Convert a missing or invalid session into a clear error.
       Returning User after this check lets other methods safely use the account. */
    if (!this.currentUsername) throw new AuthenticationError("Please log in first.");
    const user = this.findUser(this.currentUsername);
    if (!user) throw new AuthenticationError("The current user no longer exists.");
    return user;
  }

  private async saveUsers(): Promise<void> {
    /* JSON.stringify converts the users array to JSON text.
       The null and 2 arguments make the file easier for a learner to read. */
    await fs.writeFile(this.dataFile, JSON.stringify(this.users, null, 2), "utf8");
  }
}

function isFileNotFound(error: unknown): boolean {
  /* File errors have a code such as ENOENT.
     unknown must be checked before TypeScript allows access to that property. */
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
}

function validateRegistration(username: string, email: string, password: string): void {
  /* Basic validation keeps obviously invalid data out of the database.
     Throwing an error stops registration and returns control to the command loop. */
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new AuthenticationError("Username must be 3-20 characters using letters, numbers, or underscores.");
  }
  if (!email.includes("@")) throw new AuthenticationError("Please enter a valid email address.");
  if (password.length < 8) throw new AuthenticationError("Password must be at least 8 characters.");
}

function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  /* A random salt makes each password hash unique.
     scrypt turns the password and salt into a one-way derived key. */
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve({ hash: derivedKey.toString("hex"), salt });
    });
  });
}

function verifyPassword(password: string, savedHash: string, salt: string): Promise<boolean> {
  /* Recreate a hash from the attempted password and the saved salt.
     timingSafeEqual helps avoid timing-based comparisons of secret values. */
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      const expected = Buffer.from(savedHash, "hex");
      resolve(expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey));
    });
  });
}

function printSecurityChecklist(items: string[], index = 0): void {
  /* Recursion means the function calls itself with the next index.
     The base case stops when every checklist item has been printed. */
  if (index >= items.length) return;
  console.log(`- ${items[index]}`);
  printSecurityChecklist(items, index + 1);
}

async function askRequired(terminal: readline.Interface, question: string): Promise<string> {
  /* Ask repeatedly until the user provides a non-empty answer.
     This helper keeps the register and login code shorter. */
  while (true) {
    const answer = (await terminal.question(question)).trim();
    if (answer) return answer;
    console.log("Please enter a value.");
  }
}

function printHelp(): void {
  /* Keep all command instructions in one place.
     The same menu can be printed at startup or with the help command. */
  console.log(`
Commands:
  register       Create an account.
  login          Sign in to an account.
  profile        Show the signed-in user's profile.
  edit-profile   Change the display name and bio.
  security       Show the security checklist.
  logout         Sign out.
  help           Display these commands.
  exit           Close the program.
`);
}

async function run(): Promise<void> {
  /* run is the application entry point.
     It creates the manager, starts the database, and controls the command loop. */
  const manager = new UserManager(path.resolve("data", "users.json"));
  await manager.start();
  const terminal = readline.createInterface({ input, output });
  console.log("Authentication system ready. Type help for commands.");

  try {
    while (true) {
      // Read one command, remove extra spaces, and make command matching case-insensitive.
      const answer = (await terminal.question("\nauth> ")).trim().toLowerCase();
      try {
        // Each command calls a UserManager method or prints a menu.
        if (answer === "exit") break;
        if (answer === "help") printHelp();
        else if (answer === "register") {
          await manager.register(await askRequired(terminal, "Username: "), await askRequired(terminal, "Email: "), await askRequired(terminal, "Password: "));
        } else if (answer === "login") {
          await manager.login(await askRequired(terminal, "Username: "), await askRequired(terminal, "Password: "));
        } else if (answer === "profile") manager.showProfile();
        else if (answer === "edit-profile") await manager.editProfile(await askRequired(terminal, "Display name: "), await askRequired(terminal, "Bio: "));
        else if (answer === "security") manager.security();
        else if (answer === "logout") manager.logout();
        else if (answer) console.log(`Unknown command: ${answer}. Type help for available commands.`);
      } catch (error: unknown) {
        // Keep the command loop alive after a user mistake or failed operation.
        console.error(error instanceof Error ? error.message : "An unknown error occurred.");
      }
    }
  } finally {
    // Always close the terminal interface so Node can exit cleanly.
    terminal.close();
    console.log("Authentication system closed.");
  }
}

// Catch startup failures that happen before the command loop can handle them.
run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "An unknown startup error occurred.");
  process.exitCode = 1;
});
