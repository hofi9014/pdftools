declare global {
  const gapi: {
    load: (api: string, opts: { callback: () => void }) => void;
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
  };

  interface Window {
    Dropbox?: {
      choose: (opts: {
        success: (files: { link: string; name: string }[]) => void;
        cancel?: () => void;
        linkType?: string;
        multiselect?: boolean;
        extensions?: string[];
      }) => void;
      save: (url: string, name: string, opts: { success?: () => void; cancel?: () => void }) => void;
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
        success: (files: { name: string; content?: { downloadUrl: string } }[]) => void;
        cancel?: () => void;
        error?: (error: Error) => void;
      }) => void;
    };
  }
}

export {};
