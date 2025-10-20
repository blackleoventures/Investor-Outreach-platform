export type Environment = 'development' | 'production' | 'test';

export interface EnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  shouldLogFullErrors: boolean;
  shouldShowTechnicalErrors: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
