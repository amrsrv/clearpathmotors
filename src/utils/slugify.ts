/**
 * Converts a string to a URL-friendly slug
 * @param text The string to convert to a slug
 * @returns A URL-friendly slug
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/&/g, '-and-')      // Replace & with 'and'
    .replace(/[^\w\-]+/g, '')    // Remove all non-word characters
    .replace(/\-\-+/g, '-');     // Replace multiple - with single -
};

/**
 * Generates a unique slug with fallback mechanism
 * @param text The base text to slugify
 * @param existingSlugs Array of existing slugs to check against
 * @param maxAttempts Maximum number of attempts to generate a unique slug
 * @returns A unique slug
 */
export const slugifyWithFallback = (
  text: string, 
  existingSlugs: string[] = [], 
  maxAttempts: number = 5
): string => {
  let slug = slugify(text);
  let counter = 0;
  let uniqueSlug = slug;
  
  // Try to find a unique slug
  while (existingSlugs.includes(uniqueSlug) && counter < maxAttempts) {
    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }
  
  // If we couldn't find a unique slug after maxAttempts, throw an error
  if (existingSlugs.includes(uniqueSlug)) {
    throw new Error(`Could not generate a unique slug for "${text}" after ${maxAttempts} attempts`);
  }
  
  return uniqueSlug;
};