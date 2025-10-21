// lib/utils/data-normalizer.ts

/**
 * Data Normalization Utilities
 * Handles inconsistent data structures from Firestore (arrays stored as objects)
 */

/**
 * Ensures a value is an array, converting objects with numeric keys or returning empty array
 */
export function normalizeToArray<T>(value: any): T[] {
  // Already an array
  if (Array.isArray(value)) {
    return value;
  }
  
  // Null or undefined
  if (!value) {
    return [];
  }
  
  // Object with numeric keys (Firestore array-as-object)
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    
    // Check if all keys are numeric
    const isNumericKeys = keys.every(key => !isNaN(Number(key)));
    
    if (isNumericKeys && keys.length > 0) {
      // Convert object to array by sorting numeric keys
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map(key => value[key]);
    }
  }
  
  // Fallback: return empty array
  return [];
}

/**
 * Safe array operations that handle both array and object formats
 * Use these instead of direct array methods to prevent runtime errors
 */
export class SafeArray {
  /**
   * Find an item in array-like structure
   */
  static find<T>(arrayLike: any, predicate: (item: T, index: number, array: T[]) => boolean): T | undefined {
    const arr = normalizeToArray<T>(arrayLike);
    return arr.find(predicate);
  }
  
  /**
   * Find index in array-like structure
   */
  static findIndex<T>(arrayLike: any, predicate: (item: T, index: number, array: T[]) => boolean): number {
    const arr = normalizeToArray<T>(arrayLike);
    return arr.findIndex(predicate);
  }
  
  /**
   * For each over array-like structure
   */
  static forEach<T>(arrayLike: any, callback: (item: T, index: number, array: T[]) => void): void {
    const arr = normalizeToArray<T>(arrayLike);
    arr.forEach(callback);
  }
  
  /**
   * Get length of array-like structure
   */
  static length(arrayLike: any): number {
    const arr = normalizeToArray(arrayLike);
    return arr.length;
  }
  
  /**
   * Map over array-like structure
   */
  static map<T, R>(arrayLike: any, callback: (item: T, index: number, array: T[]) => R): R[] {
    const arr = normalizeToArray<T>(arrayLike);
    return arr.map(callback);
  }
  
  /**
   * Filter array-like structure
   */
  static filter<T>(arrayLike: any, predicate: (item: T, index: number, array: T[]) => boolean): T[] {
    const arr = normalizeToArray<T>(arrayLike);
    return arr.filter(predicate);
  }
  
  /**
   * Check if array-like structure is empty
   */
  static isEmpty(arrayLike: any): boolean {
    const arr = normalizeToArray(arrayLike);
    return arr.length === 0;
  }
  
  /**
   * Get first item from array-like structure
   */
  static first<T>(arrayLike: any): T | undefined {
    const arr = normalizeToArray<T>(arrayLike);
    return arr[0];
  }
  
  /**
   * Get last item from array-like structure
   */
  static last<T>(arrayLike: any): T | undefined {
    const arr = normalizeToArray<T>(arrayLike);
    return arr[arr.length - 1];
  }
}
