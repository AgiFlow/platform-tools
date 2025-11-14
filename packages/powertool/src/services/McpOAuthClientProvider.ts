/**
 * McpOAuthClientProvider
 *
 * DESIGN PATTERNS:
 * - Provider pattern for OAuth client implementation
 * - Implements OAuthClientProvider interface from MCP SDK
 *
 * CODING STANDARDS:
 * - Store credentials securely per server
 * - Handle OAuth flow for remote MCP servers
 * - Support authorization code flow with PKCE
 *
 * SECURITY:
 * - Session-based authentication to prevent session hijacking
 * - CSRF protection via state parameter
 * - State parameter format: "sessionId:stateValue"
 *
 * AVOID:
 * - Storing credentials in plain text
 * - Mixing server credentials
 */

import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientMetadata,
  OAuthTokens,
  OAuthClientInformation,
  OAuthClientInformationFull,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { CredentialsManagerService } from './CredentialsManagerService.js';
import type { OAuthSession } from './OAuthCallbackServer.js';

/**
 * OAuth client provider for MCP servers
 * Handles OAuth authentication for individual remote MCP servers with session-based security
 */
export class McpOAuthClientProvider implements OAuthClientProvider {
  private serverName: string;
  private credentialsManager: CredentialsManagerService;
  private projectPath: string;
  private _redirectUrl: string;
  private callbackPort: number;
  private onRedirectCallback?: (url: URL) => void | Promise<void>;
  private session?: OAuthSession;

  constructor(
    serverName: string,
    credentialsManager: CredentialsManagerService,
    projectPath: string,
    callbackPort: number,
    onRedirectCallback?: (url: URL) => void | Promise<void>,
  ) {
    this.serverName = serverName;
    this.credentialsManager = credentialsManager;
    this.projectPath = projectPath;
    this.callbackPort = callbackPort;
    this._redirectUrl = `http://localhost:${this.callbackPort}/oauth/callback`;
    this.onRedirectCallback = onRedirectCallback;
  }

  /**
   * Set the OAuth session for CSRF protection
   * SECURITY: Must be called before starting OAuth flow
   */
  setSession(session: OAuthSession): void {
    this.session = session;
  }

  /**
   * Get the current session (for use by client manager)
   */
  getSession(): OAuthSession | undefined {
    return this.session;
  }

  get redirectUrl(): string | URL {
    return this._redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: `@agiflowai/powertool proxy for ${this.serverName}`,
      redirect_uris: [this._redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
      scope: 'mcp:tools',
    };
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    const credentials = await this.credentialsManager.getCredentials(this.projectPath);
    if (!credentials?.servers?.[this.serverName]?.clientInfo) {
      return undefined;
    }
    return credentials.servers[this.serverName].clientInfo;
  }

  async saveClientInformation(clientInfo: OAuthClientInformationFull): Promise<void> {
    const credentials = (await this.credentialsManager.getCredentials(this.projectPath)) || {
      endpoint: '',
      apiKey: '',
    };

    if (!credentials.servers) {
      credentials.servers = {};
    }
    if (!credentials.servers[this.serverName]) {
      credentials.servers[this.serverName] = {};
    }

    credentials.servers[this.serverName].clientInfo = clientInfo;
    await this.credentialsManager.saveCredentials(this.projectPath, credentials);
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const credentials = await this.credentialsManager.getCredentials(this.projectPath);
    if (!credentials?.servers?.[this.serverName]?.tokens) {
      return undefined;
    }
    return credentials.servers[this.serverName].tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const credentials = (await this.credentialsManager.getCredentials(this.projectPath)) || {
      endpoint: '',
      apiKey: '',
    };

    if (!credentials.servers) {
      credentials.servers = {};
    }
    if (!credentials.servers[this.serverName]) {
      credentials.servers[this.serverName] = {};
    }

    credentials.servers[this.serverName].tokens = tokens;
    await this.credentialsManager.saveCredentials(this.projectPath, credentials);
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    // SECURITY: Add state parameter for CSRF protection
    if (!this.session) {
      throw new Error(
        'OAuth session not initialized. Call setSession() before starting OAuth flow.',
      );
    }

    // Add state parameter in format "sessionId:stateValue"
    const stateParam = `${this.session.sessionId}:${this.session.state}`;
    authorizationUrl.searchParams.set('state', stateParam);

    if (this.onRedirectCallback) {
      await this.onRedirectCallback(authorizationUrl);
    } else {
      console.error(`\n=== OAuth Authorization Required for ${this.serverName} ===`);
      console.error(`Please visit: ${authorizationUrl.toString()}`);
      console.error(`After authorizing, you will be redirected to: ${this._redirectUrl}\n`);
    }
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    const credentials = (await this.credentialsManager.getCredentials(this.projectPath)) || {
      endpoint: '',
      apiKey: '',
    };

    if (!credentials.servers) {
      credentials.servers = {};
    }
    if (!credentials.servers[this.serverName]) {
      credentials.servers[this.serverName] = {};
    }

    credentials.servers[this.serverName].codeVerifier = codeVerifier;
    await this.credentialsManager.saveCredentials(this.projectPath, credentials);
  }

  async codeVerifier(): Promise<string> {
    const credentials = await this.credentialsManager.getCredentials(this.projectPath);
    const verifier = credentials?.servers?.[this.serverName]?.codeVerifier;
    if (!verifier) {
      throw new Error(`No code verifier found for ${this.serverName}`);
    }
    return verifier;
  }
}
