interface ImportMetaEnv {
  readonly MAIN_VITE_RISKLEX_API_URL?: string;
  readonly MAIN_VITE_RISKLEX_FIXTURE?: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
