// Pure helpers for the Dropbox API v2 direct-upload flow used by CloudFileSaver.tsx.
// Kept out of the component (which is 'use client' and pulls in React/DOM) so this
// logic — especially the ASCII-escaping required by Dropbox's HTTP API — is testable
// without a browser. See Etap 2 in AUDYT-BEZPIECZENSTWA.md: this replaces the Dropbox
// Saver widget (which required a server to host a publicly-fetchable URL) with the same
// OAuth-popup + direct-upload pattern already used for Google Drive and OneDrive in this
// codebase, so the file never leaves the browser for any provider.

export interface DropboxUploadArg {
  path: string;
  mode: 'add';
  autorename: boolean;
  mute: boolean;
}

// Dropbox's HTTP API requires the Dropbox-API-Arg header to contain only ASCII bytes;
// their docs give this exact JSON \uXXXX-escaping recipe for non-ASCII characters (e.g.
// a Polish filename) instead of sending raw UTF-8 in an HTTP header.
export function encodeDropboxApiArg(value: unknown): string {
  return JSON.stringify(value).replace(
    /[-￿]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
  );
}

// Not full Dropbox path validation — just strips the two characters that would break
// the path structure itself (a slash would be read as a subfolder, a backslash is
// passed through literally and looks broken in the Dropbox UI). Everything else Dropbox
// accepts as a valid path component.
export function sanitizeDropboxFileName(name: string): string {
  const cleaned = name.replace(/[/\\]/g, '_').trim();
  return cleaned === '' ? 'file' : cleaned;
}

export function buildDropboxUploadArgHeader(fileName: string): string {
  const arg: DropboxUploadArg = {
    path: '/' + sanitizeDropboxFileName(fileName),
    mode: 'add',
    autorename: true, // never silently overwrite an existing file — mirrors the old Saver widget's behavior
    mute: false,
  };
  return encodeDropboxApiArg(arg);
}

// OAuth 2.0 implicit grant (response_type=token), same pattern as getMicrosoftToken in
// CloudFileSaver.tsx. `scope` requests the narrowest permission this feature needs —
// upload only, not read/list/delete — from whatever scopes the Dropbox app is configured
// with in the App Console.
export function buildDropboxAuthUrl(clientId: string, redirectUri: string): string {
  return 'https://www.dropbox.com/oauth2/authorize'
    + '?client_id=' + encodeURIComponent(clientId)
    + '&response_type=token'
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
    + '&scope=' + encodeURIComponent('files.content.write');
}
