// lib/config/environment.ts

import type { Environment, EnvironmentConfig } from '@/types';

/**
 * Get current environment
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV;
  
  if (env === 'production') return 'production';
  if (env === 'test') return 'test';
  return 'development';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return getEnvironment() === 'test';
}

/**
 * Get environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = getEnvironment();
  
  return {
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    shouldLogFullErrors: env === 'development',
    shouldShowTechnicalErrors: env === 'development',
    logLevel: env === 'production' ? 'error' : 'debug',
  };
}

/**
 * Should log full error details
 */
export function shouldLogFullErrors(): boolean {
  return isDevelopment();
}

/**
 * Should show technical error messages to users
 */
export function shouldShowTechnicalErrors(): boolean {
  return isDevelopment();
}

/**
 * Get log level based on environment
 */
export function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  return isProduction() ? 'error' : 'debug';
}
