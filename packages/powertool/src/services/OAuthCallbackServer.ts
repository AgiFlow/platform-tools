/**
 * OAuthCallbackServer
 *
 * HTTP server for handling OAuth callbacks and coordinating between multiple instances
 *
 * SECURITY:
 * - Session-based authentication to prevent session hijacking
 * - CSRF protection via state parameter validation
 * - Session-specific notification queues
 * - Secure random session ID generation
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { randomBytes } from 'node:crypto';

export interface OAuthCallbackServerOptions {
  port?: number;
  path?: string;
  authTimeoutMs?: number;
}

export interface OAuthCallbackServer {
  server: Server;
  port: number;
  waitForAuthCode: (sessionId: string) => Promise<string>;
  authCompleted: (sessionId: string) => Promise<void>;
  generateSession: () => OAuthSession;
}

export interface OAuthSession {
  sessionId: string;
  state: string;
  createdAt: number;
}

interface SessionData {
  state: string;
  authCode?: string;
  authError?: string;
  waitingClients: ServerResponse[];
  createdAt: number;
}

/**
 * Creates an OAuth callback server with long-polling support
 *
 * SECURITY FEATURES:
 * - Each OAuth flow gets a unique session ID and state parameter
 * - State parameter prevents CSRF attacks
 * - Session-specific notification queues prevent session hijacking
 * - Sessions expire after authTimeoutMs
 */
export function createOAuthCallbackServer(
  options: OAuthCallbackServerOptions = {},
): Promise<OAuthCallbackServer> {
  const {
    port = 0, // 0 = auto-assign port
    path = '/oauth/callback',
    authTimeoutMs = 5 * 60 * 1000, // 5 minutes
  } = options;

  return new Promise((resolve, reject) => {
    // Session storage: sessionId -> SessionData
    const sessions = new Map<string, SessionData>();

    // Clean up expired sessions periodically
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of sessions.entries()) {
        if (now - session.createdAt > authTimeoutMs) {
          // Notify waiting clients of timeout
          notifySessionClients(sessionId, 408, { status: 'timeout', error: 'Session expired' });
          sessions.delete(sessionId);
        }
      }
    }, 60000); // Cleanup every minute

    // Generate a new OAuth session with secure random IDs
    const generateSession = (): OAuthSession => {
      const sessionId = randomBytes(32).toString('base64url');
      const state = randomBytes(32).toString('base64url');
      const createdAt = Date.now();

      sessions.set(sessionId, {
        state,
        waitingClients: [],
        createdAt,
      });

      return { sessionId, state, createdAt };
    };

    // Notify all waiting clients for a specific session
    const notifySessionClients = (sessionId: string, status: number, body: any) => {
      const session = sessions.get(sessionId);
      if (!session) return;

      while (session.waitingClients.length > 0) {
        const res = session.waitingClients.shift();
        if (res && !res.writableEnded) {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(body));
        }
      }
    };

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const requestUrl = new URL(req.url || '/', `http://localhost:${port}`);

      // OAuth callback endpoint with CSRF protection
      if (requestUrl.pathname === path) {
        const code = requestUrl.searchParams.get('code');
        const error = requestUrl.searchParams.get('error');
        const state = requestUrl.searchParams.get('state');

        // SECURITY: Validate state parameter to prevent CSRF
        if (!state) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Security Error</h1>
                <p>Missing state parameter. This may indicate a CSRF attack.</p>
              </body>
            </html>
          `);
          return;
        }

        // Parse state: format is "sessionId:stateValue"
        const [sessionId, stateValue] = state.split(':');
        if (!sessionId || !stateValue) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Security Error</h1>
                <p>Invalid state format.</p>
              </body>
            </html>
          `);
          return;
        }

        const session = sessions.get(sessionId);
        if (!session) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Session Error</h1>
                <p>Invalid or expired session.</p>
              </body>
            </html>
          `);
          return;
        }

        // SECURITY: Validate state matches stored state
        if (session.state !== stateValue) {
          res.writeHead(403, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Security Error</h1>
                <p>State parameter mismatch. Possible CSRF attack detected.</p>
              </body>
            </html>
          `);
          return;
        }

        if (code) {
          session.authCode = code;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                <script>setTimeout(() => window.close(), 2000);</script>
              </body>
            </html>
          `);

          // Notify waiting clients for this session only
          notifySessionClients(sessionId, 200, { status: 'completed' });
        } else if (error) {
          session.authError = error;
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Authorization Failed</h1>
                <p>Error: ${error}</p>
              </body>
            </html>
          `);

          // Notify waiting clients of error for this session only
          notifySessionClients(sessionId, 400, { status: 'error', error });
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing code or error parameter');
        }
        return;
      }

      // Long-polling endpoint for coordination (session-based)
      if (requestUrl.pathname === '/wait-for-auth') {
        const poll = requestUrl.searchParams.get('poll') !== 'false';
        const sessionId = requestUrl.searchParams.get('sessionId');

        // SECURITY: Require session ID to prevent unauthorized polling
        if (!sessionId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', error: 'Missing sessionId parameter' }));
          return;
        }

        const session = sessions.get(sessionId);
        if (!session) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', error: 'Invalid or expired session' }));
          return;
        }

        if (session.authCode) {
          // Auth already completed for this session
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'completed' }));
        } else if (session.authError) {
          // Auth failed for this session
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', error: session.authError }));
        } else if (poll) {
          // Add to session-specific waiting clients for long-polling
          session.waitingClients.push(res);

          // Set timeout for this request
          const timeout = setTimeout(() => {
            const index = session.waitingClients.indexOf(res);
            if (index > -1) {
              session.waitingClients.splice(index, 1);
            }
            if (!res.writableEnded) {
              res.writeHead(202, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'pending' }));
            }
          }, 30000); // 30 second timeout per request

          // Clean up on client disconnect
          req.on('close', () => {
            clearTimeout(timeout);
            const index = session.waitingClients.indexOf(res);
            if (index > -1) {
              session.waitingClients.splice(index, 1);
            }
          });
        } else {
          // Non-polling check
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'pending' }));
        }
        return;
      }

      // Health check
      if (requestUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      // 404 for unknown paths
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });

    // Handle server errors (e.g., port already in use)
    let retryAttempted = false;
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && port !== 0 && !retryAttempted) {
        // Port already in use - try auto-assigning a port instead
        retryAttempted = true;
        console.error(`Port ${port} is already in use, trying auto-assigned port...`);

        clearInterval(cleanupInterval);

        // Don't call server.close() since it never successfully listened
        // Retry immediately with port 0
        createOAuthCallbackServer({ path, authTimeoutMs, port: 0 }).then(resolve).catch(reject);
      } else {
        clearInterval(cleanupInterval);
        reject(
          new Error(
            `Failed to start OAuth callback server${port !== 0 ? ` on port ${port}` : ''}:\n${err.message}`,
          ),
        );
      }
    });

    server.listen(port, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address !== null ? address.port : port;

      // Clean up interval when server closes
      server.on('close', () => {
        clearInterval(cleanupInterval);
      });

      resolve({
        server,
        port: actualPort,
        generateSession,
        waitForAuthCode: (sessionId: string) => {
          return new Promise((resolveCode, rejectCode) => {
            const session = sessions.get(sessionId);
            if (!session) {
              rejectCode(new Error('Invalid session ID'));
              return;
            }

            if (session.authCode) {
              resolveCode(session.authCode);
              return;
            }

            if (session.authError) {
              rejectCode(new Error(`OAuth error: ${session.authError}`));
              return;
            }

            const timeout = setTimeout(() => {
              rejectCode(new Error('OAuth authentication timeout'));
            }, authTimeoutMs);

            const checkAuth = () => {
              const currentSession = sessions.get(sessionId);
              if (!currentSession) {
                clearTimeout(timeout);
                rejectCode(new Error('Session expired'));
                return;
              }

              if (currentSession.authCode) {
                clearTimeout(timeout);
                resolveCode(currentSession.authCode);
              } else if (currentSession.authError) {
                clearTimeout(timeout);
                rejectCode(new Error(`OAuth error: ${currentSession.authError}`));
              } else {
                setTimeout(checkAuth, 100);
              }
            };

            checkAuth();
          });
        },
        authCompleted: (sessionId: string) => {
          return new Promise((resolveAuth, rejectAuth) => {
            const session = sessions.get(sessionId);
            if (!session) {
              rejectAuth(new Error('Invalid session ID'));
              return;
            }

            if (session.authCode) {
              resolveAuth();
              return;
            }

            if (session.authError) {
              rejectAuth(new Error(`OAuth error: ${session.authError}`));
              return;
            }

            const timeout = setTimeout(() => {
              rejectAuth(new Error('OAuth authentication timeout'));
            }, authTimeoutMs);

            const checkAuth = () => {
              const currentSession = sessions.get(sessionId);
              if (!currentSession) {
                clearTimeout(timeout);
                rejectAuth(new Error('Session expired'));
                return;
              }

              if (currentSession.authCode || currentSession.authError) {
                clearTimeout(timeout);
                if (currentSession.authCode) {
                  resolveAuth();
                } else {
                  rejectAuth(new Error(`OAuth error: ${currentSession.authError}`));
                }
              } else {
                setTimeout(checkAuth, 100);
              }
            };

            checkAuth();
          });
        },
      });
    });

    server.on('error', reject);
  });
}

/**
 * Wait for authentication from another server instance
 *
 * SECURITY: Requires sessionId to prevent unauthorized access to auth status
 */
export async function waitForAuthentication(
  port: number,
  sessionId: string,
  timeoutMs: number = 5 * 60 * 1000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/wait-for-auth?sessionId=${encodeURIComponent(sessionId)}`,
      );

      if (response.status === 200) {
        // Auth completed
        return true;
      } else if (response.status === 202) {
        // Still pending, continue polling
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        // Error
        return false;
      }
    } catch (_error) {
      // Connection failed, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return false;
}
