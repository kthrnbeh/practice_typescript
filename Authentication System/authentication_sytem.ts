import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

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
  public constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

class UserManager {
  private readonly users: User[] = [];
  private readonly dataFile: string;
  private currentUsername: string | null = null;

  public constructor(dataFile: string) {
    this.dataFile = dataFile;
  }

  public async start(): Promise<void> {
    await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
    try {
      const savedUsers = await fs.readFile(this.dataFile, "utf8");
      const parsedUsers: User[] = JSON.parse(savedUsers);
      this.users.push(...parsedUsers);
    } catch (error: unknown) {
      // A missing data file is normal on the first run; other file errors are reported.
      if (isFileNotFound(error)) {
        await this.saveUsers();
      } else {
        throw new Error("The user database could not be loaded.");
      }
    }
  }

  public async register(username: string, email: string, password: string): Promise<void> {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    validateRegistration(normalizedUsername, normalizedEmail, password);
    if (this.findUser(normalizedUsername)) throw new AuthenticationError("That username is already registered.");
    if (this.users.some((user) => user.email === normalizedEmail)) {
      throw new AuthenticationError("That email is already registered.");
    }

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
    this.users.push(newUser);
    await this.saveUsers();
    console.log(`Registration complete. Welcome, ${newUser.displayName}!`);
  }

  public async login(username: string, password: string): Promise<void> {
    const user = this.findUser(username.trim().toLowerCase());
    if (!user || !(await verifyPassword(password, user.passwordHash, user.passwordSalt))) {
      throw new AuthenticationError("The username or password is incorrect.");
    }
    user.lastLogin = new Date().toISOString();
    this.currentUsername = user.username;
    await this.saveUsers();
    console.log(`Login successful. Hello, ${user.displayName}!`);
  }

  public logout(): void {
    if (!this.currentUsername) throw new AuthenticationError("No user is currently logged in.");
    console.log(`${this.currentUsername} has been logged out.`);
    this.currentUsername = null;
  }

  public showProfile(): void {
    const user = this.requireCurrentUser();
    console.log("\n--- User Profile ---");
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);