// Email utility functions

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts[1] || '';
}

/**
 * Extract organization name from email domain
 */
export function extractOrganization(email: string): string {
  const domain = extractDomain(email);
  
  const parts = domain.split('.');
  
  if (parts.length > 2) {
    return parts[parts.length - 2];
  }
  
  return parts[0] || 'Unknown';
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract name from email address
 */
export function extractNameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  
  return localPart
    .split(/[._-]/)
    .map(word => capitalizeFirst(word))
    .join(' ');
}

/**
 * Check if two emails are from same domain
 */
export function isSameDomain(email1: string, email2: string): boolean {
  return extractDomain(email1) === extractDomain(email2);
}

/**
 * Generate unique email ID
 */
export function generateEmailId(): string {
  return `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Capitalize first letter of a word
 */
export function capitalizeFirst(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Clean and format name
 */
export function cleanName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(word => capitalizeFirst(word))
    .join(' ');
}
