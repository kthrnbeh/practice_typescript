TypeScript Authentication System
Overview
This project is a terminal-based user authentication system written in TypeScript. A user can register an account, log in, log out, view a profile, and edit a display name or bio. User accounts are saved in data/users.json, so the information remains available after the program closes.

This project uses Node's built-in crypto.scrypt function to hash passwords. Plain-text passwords are never saved in the data file. This is an educational project and is not intended to replace a production identity provider.
Project Demonstration Video
Add the link to the 4–5 minute demonstration video here: Video link
Development Environment
- Visual Studio Code
- Node.js 18 or newer
- TypeScript 5 or newer
- Windows, macOS, or Linux
Useful Websites
- TypeScript Documentation
- What is TypeScript and why should you use it?
- CSE 310 TypeScript Module
- How to Set Up a New TypeScript Project
- Node.js Crypto Documentation
Setup
Open the authentication-system folder in Visual Studio Code. In the terminal, run:
npm install
npm run build
Running the Program
npm start
The program creates the data folder and users.json file automatically on the first run.
Example Demonstration
register
Username: katherine
Email: katherine@example.com
Password: learning123

login
Username: katherine
Password: learning123

profile
edit-profile
security
logout
exit
TypeScript Requirements Demonstrated
Requirement	Where it appears
Display output to the terminal	console.log and console.error throughout the program
Recursion	printSecurityChecklist calls itself until every checklist item is printed
Classes	UserManager and AuthenticationError organize the program
Lists	User[] stores all registered accounts
Asynchronous functions	File storage, password hashing, and terminal questions use async and await
Stretch: exceptions	Registration, login, profile actions, and file errors throw and handle exceptions


Important Security Ideas
- Passwords are hashed with a random salt using crypto.scrypt.
- The JSON file stores password hashes and salts, not the original passwords.
- Usernames and emails are normalized before duplicate checks.
- Profile commands require a logged-in session.
- timingSafeEqual helps compare password hashes more safely.
Future Improvements
- Add password reset and email verification.
- Add account roles such as administrator and regular user.
- Replace the JSON file with a database.
- Add Jest tests for registration, login, and profile editing.
- Add a browser interface with Express and secure session cookies.