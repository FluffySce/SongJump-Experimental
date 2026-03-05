#!/usr/bin/env node
/**
 * SongJump CLI - Transfer Spotify playlists to YouTube Music
 */
import { Command } from "commander";
import chalk from "chalk";

import { loginCommand } from "./commands/login.js";
import { ytAuthCommand } from "./commands/ytauth.js";
import { transferCommand } from "./commands/transfer.js";
import {
  clearAll,
  isLoggedIn,
  getUser,
  getConfigPath,
} from "./utils/config.js";

const program = new Command();

program
  .name("songjump")
  .description("Transfer Spotify playlists to YouTube Music")
  .version("1.0.0");

// Login command
program
  .command("login")
  .description("Login with your Spotify account")
  .action(loginCommand);

// Logout command
program
  .command("logout")
  .description("Log out and clear saved credentials")
  .action(() => {
    if (!isLoggedIn()) {
      console.log(chalk.yellow("\nYou're not logged in.\n"));
      return;
    }

    const user = getUser();
    clearAll();

    console.log(chalk.green("\nLogged out successfully."));
    if (user) {
      console.log(chalk.dim(`  Was logged in as: ${user.email || "Unknown"}`));
    }
    console.log(chalk.dim(`  Config cleared: ${getConfigPath()}\n`));
  });

// YouTube auth command
program
  .command("yt-auth")
  .description("Set up YouTube Music authentication")
  .action(ytAuthCommand);

// Transfer command
program
  .command("transfer")
  .description("Transfer a Spotify playlist to YouTube Music")
  .argument("<spotify-playlist-url>", "Spotify playlist URL or ID")
  .option("-o, --open", "Open YouTube Music after transfer")
  .action(transferCommand);

// Parse and execute
program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan.bold("\n  🎵 SongJump - Spotify to YouTube Music\n"));
  program.outputHelp();
}
