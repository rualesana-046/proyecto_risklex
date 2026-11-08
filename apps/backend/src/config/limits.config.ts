export const RATE_LIMITS = {
  install: {
    bindingName: 'INSTALL_RATE_LIMITER',
    limit: 3,
    periodSeconds: 60,
  },
  ip: {
    bindingName: 'IP_RATE_LIMITER',
    limit: 5,
    periodSeconds: 60,
  },
} as const;
