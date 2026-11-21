export const TEST_SUPPORT_MARKERS: Readonly<Record<string, readonly string[]>> = {
  'src/main/modules/history/history.test-support.ts': [
    'syntheticAnalysis',
    'syntheticEntry',
    'syntheticText',
  ],
  'src/main/ipc/analysis.ipc.test-support.ts': ['clientReturning', 'hangingClient'],
};

export const BUILD_MARKERS: readonly string[] = [
  'risklex-development-fixture',
  'createFixtureAnalysisClient',
  'keyPhrase',
  'expectedSeverity',
  'localServerTransport',
  'fakeResolver',
  ...Object.values(TEST_SUPPORT_MARKERS).flat(),
];
