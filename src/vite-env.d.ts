/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly ARTHUR_GCAL_LINK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
