/**
 * Login command - Authenticate with Spotify via OAuth
 */
import http from "http";
import chalk from "chalk";
import open from "open";
import ora from "ora";

import {
  setToken,
  setUser,
  setSpotifyAuth,
  getOAuthProxyUrl,
  getApiUrl,
  isLoggedIn,
  getUser,
} from "../utils/config.js";
import { registerSpotifyAuth } from "../utils/api.js";

interface SpotifyAuthData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  user: {
    id: string;
    email?: string;
    displayName?: string;
  };
}

/**
 * Find an available port
 */
async function findPort(startPort = 9876): Promise<number> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(startPort, () => {
      const address = server.address();
      const port =
        typeof address === "object" && address ? address.port : startPort;
      server.close(() => resolve(port));
    });
    server.on("error", () => resolve(findPort(startPort + 1)));
  });
}

/**
 * Start local server to receive OAuth callback
 */
async function startCallbackServer(port: number): Promise<SpotifyAuthData> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);

      if (url.pathname === "/callback") {
        const authParam = url.searchParams.get("auth");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(getErrorHtml(error));
          server.close();
          reject(new Error(error));
          return;
        }

        if (authParam) {
          try {
            const authData: SpotifyAuthData = JSON.parse(
              decodeURIComponent(authParam),
            );
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(getSuccessHtml());
            server.close();
            resolve(authData);
            return;
          } catch {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(getErrorHtml("Failed to parse auth data"));
            server.close();
            reject(new Error("Failed to parse auth data"));
            return;
          }
        }
      }

      res.writeHead(404);
      res.end("Not found");
    });

    server.listen(port);

    // Timeout after 5 minutes
    setTimeout(
      () => {
        server.close();
        reject(new Error("Login timed out"));
      },
      5 * 60 * 1000,
    );
  });
}

function getSuccessHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>SongJump - Login Successful</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #1DB954 0%, #191414 100%);
      color: white;
    }
    .container { text-align: center; padding: 40px; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; opacity: 0.9; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>Login Successful!</h1>
    <p>You can close this window and return to your terminal.</p>
  </div>
</body>
</html>`;
}

function getErrorHtml(error: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>SongJump - Login Failed</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #e74c3c 0%, #191414 100%);
      color: white;
    }
    .container { text-align: center; padding: 40px; }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; opacity: 0.9; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✗</div>
    <h1>Login Failed</h1>
    <p>${error}</p>
  </div>
</body>
</html>`;
}

export async function loginCommand(): Promise<void> {
  // Check if already logged in
  if (isLoggedIn()) {
    const user = getUser();
    if (user) {
      console.log(
        chalk.yellow(
          `\nAlready logged in as ${chalk.bold(user.email || user.displayName)}`,
        ),
      );
      console.log(chalk.dim("Run 'songjump logout' to log out first.\n"));
      return;
    }
  }

  const spinner = ora("Preparing login...").start();

  try {
    const port = await findPort();
    const callbackUrl = `http://127.0.0.1:${port}/callback`;
    const oauthProxyUrl = getOAuthProxyUrl();

    // Build OAuth URL with CLI callback (using hosted OAuth proxy)
    const oauthUrl = `${oauthProxyUrl}/api/spotify/start?cli_callback=${encodeURIComponent(callbackUrl)}`;

    spinner.text = "Opening browser for Spotify login...";

    // Start server before opening browser
    const tokenPromise = startCallbackServer(port);

    // Open browser
    await open(oauthUrl);

    spinner.text = "Waiting for login completion...";

    // Wait for auth data from OAuth proxy
    const authData = await tokenPromise;

    spinner.text = "Registering with backend...";

    // Save Spotify tokens locally
    setSpotifyAuth({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      expiresAt: authData.expiresAt,
    });

    // Save user info
    setUser(authData.user);

    // Register with backend and get JWT token
    try {
      const response = await registerSpotifyAuth(authData);
      if (response?.token) {
        setToken(response.token);
      }
    } catch {
      // Backend registration failed - but Spotify auth is saved
      // User can still try transfers later
    }

    spinner.succeed(chalk.green("Login successful!"));

    const user = getUser();
    if (user) {
      console.log(
        chalk.dim(
          `  Logged in as: ${chalk.white(user.email || user.displayName || "Unknown")}`,
        ),
      );
    }

    console.log();
    console.log(chalk.cyan("Next steps:"));
    console.log(
      chalk.dim("  1. Set up YouTube Music auth: ") +
        chalk.white("songjump yt-auth"),
    );
    console.log(
      chalk.dim("  2. Transfer a playlist:       ") +
        chalk.white("songjump transfer <url>"),
    );
    console.log();

    // Exit cleanly
    process.exit(0);
  } catch (error) {
    spinner.fail(chalk.red("Login failed"));
    console.error(
      chalk.red(`  ${error instanceof Error ? error.message : String(error)}`),
    );
    process.exit(1);
  }
}
