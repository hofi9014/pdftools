declare global {
  const gapi: {
    load: (api: string, opts: { callback: () => void }) => void;
  };

  const google: {
    accounts: {
      oauth2: {
        initTokenClient: (opts: {
          client_id: string;
          scope: string;
          callback: (resp: { access_token: string; error?: string }) => void;
        }) => { requestAccessToken: () => void };
      };
    };
    picker: {
      PickerBuilder: new () => {
        addView: (view: unknown) => unknown;
        setOAuthToken: (token: string) => unknown;
        setDeveloperKey: (key: string) => unknown;
        setCallback: (cb: (data: { action: string; docs?: { id: string; name: string }[] }) => void) => unknown;
        build: () => { setVisible: (visible: boolean) => void };
      };
      ViewId: { DOCS: unknown };
    };
  };

  interface OneDrivePickerFileItem {
    name: string;
    downloadUrl?: string;
    webUrl?: string;
    content?: { downloadUrl?: string };
    '@microsoft.graph.downloadUrl'?: string;
  }

  interface Window {
    Dropbox?: {
      choose: (opts: {
        success: (files: { link: string; name: string }[]) => void;
        cancel?: () => void;
        linkType?: string;
        multiselect?: boolean;
        extensions?: string[];
      }) => void;
    };
    OneDrive?: {
      open: (opts: {
        clientId: string;
        action?: string;
        multiSelect?: boolean;
        advanced?: {
          queryParameters?: string;
          redirectUri?: string;
        };
        // The SDK's real success payload is either a bare array or a Graph-style
        // { value: [...] } wrapper depending on picker version/config, and the actual
        // download URL can land in any of several fields depending on the requested
        // queryParameters and API version — CloudFilePicker.tsx checks all of them.
        // The single-shape `{ name; content: { downloadUrl } }[]` this used to declare
        // never matched reality (same pattern as the historical SEC-014 Google Picker
        // mismatch) and was worked around with `any` at the call site instead of fixed.
        success: (response: OneDrivePickerFileItem[] | { value: OneDrivePickerFileItem[] }) => void;
        cancel?: () => void;
        error?: (error: Error) => void;
      }) => void;
    };
  }
}

export {};
