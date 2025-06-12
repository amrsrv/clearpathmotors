/**
 * Utility functions for formatting data consistently throughout the application
 */

/**
 * Converts a string to Start Case (Title Case)
 * Example: "john doe" -> "John Doe"
 * 
 * @param str The string to convert
 * @returns The string in Start Case format
 */
export const toStartCase = (str: string | null | undefined): string => {
  if (!str) return '';
  
  return str
    .toString()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Formats a phone number to a standard format
 * Example: "1234567890" -> "(123) 456-7890"
 * 
 * @param phone The phone number to format
 * @returns The formatted phone number
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if the input is valid
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
};

/**
 * Formats a currency value
 * Example: 1000 -> "$1,000"
 * 
 * @param value The number to format
 * @returns The formatted currency string
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};