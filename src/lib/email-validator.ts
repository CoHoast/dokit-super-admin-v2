/**
 * Email Validation Service
 * Validates extracted emails before sending negotiation offers
 */

import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

export interface EmailValidationResult {
  email: string;
  isValid: boolean;
  hasMxRecords: boolean;
  confidence: number;
  warnings: string[];
  suggestions?: string[];
}

/**
 * Common OCR misreadings to check for
 */
const COMMON_TYPOS: Record<string, string[]> = {
  '0': ['o', 'O'],
  'o': ['0'],
  'O': ['0'],
  '1': ['l', 'i', 'I'],
  'l': ['1', 'i'],
  'i': ['1', 'l'],
  'I': ['1', 'l'],
  '5': ['s', 'S'],
  's': ['5'],
  'S': ['5'],
  '8': ['B'],
  'B': ['8'],
  'n': ['m', 'h', 'u'],
  'm': ['n', 'rn'],
  'h': ['n', 'b'],
  'u': ['n', 'v'],
  'rn': ['m'],
  'cl': ['d'],
  'd': ['cl'],
  'vv': ['w'],
  'w': ['vv'],
};

/**
 * Check if email format is valid
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Check if domain has MX records (can receive email)
 */
export async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

/**
 * Generate possible correct versions of a potentially misread email
 */
export function generateEmailVariations(email: string): string[] {
  const variations: Set<string> = new Set();
  const [localPart, domain] = email.split('@');
  
  if (!domain) return [];
  
  // Check each character for common OCR misreadings
  for (let i = 0; i < localPart.length; i++) {
    const char = localPart[i];
    const possibleChars = COMMON_TYPOS[char];
    
    if (possibleChars) {
      for (const replacement of possibleChars) {
        const newLocal = localPart.slice(0, i) + replacement + localPart.slice(i + 1);
        variations.add(`${newLocal}@${domain}`);
      }
    }
  }
  
  // Check for double-character substitutions (rn -> m, etc)
  const twoCharSubs = [
    { from: 'rn', to: 'm' },
    { from: 'cl', to: 'd' },
    { from: 'vv', to: 'w' },
  ];
  
  for (const sub of twoCharSubs) {
    if (localPart.includes(sub.from)) {
      variations.add(`${localPart.replace(sub.from, sub.to)}@${domain}`);
    }
    if (localPart.includes(sub.to)) {
      variations.add(`${localPart.replace(sub.to, sub.from)}@${domain}`);
    }
  }
  
  return Array.from(variations);
}

/**
 * Validate an extracted email address
 */
export async function validateEmail(
  email: string, 
  confidence: number = 100
): Promise<EmailValidationResult> {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Clean email
  const cleanEmail = email.toLowerCase().trim();
  
  // Check format
  if (!isValidEmailFormat(cleanEmail)) {
    return {
      email: cleanEmail,
      isValid: false,
      hasMxRecords: false,
      confidence: 0,
      warnings: ['Invalid email format'],
    };
  }
  
  // Extract domain
  const domain = cleanEmail.split('@')[1];
  
  // Check MX records
  const mxExists = await hasMxRecords(domain);
  
  if (!mxExists) {
    // Generate variations and check them
    const variations = generateEmailVariations(cleanEmail);
    
    for (const variation of variations) {
      const varDomain = variation.split('@')[1];
      const varMxExists = await hasMxRecords(varDomain);
      
      if (varMxExists) {
        suggestions.push(variation);
      }
    }
    
    warnings.push(`Domain ${domain} has no MX records`);
    
    if (suggestions.length > 0) {
      warnings.push(`Possible correct email: ${suggestions.join(', ')}`);
    }
    
    return {
      email: cleanEmail,
      isValid: false,
      hasMxRecords: false,
      confidence: Math.min(confidence, 30),
      warnings,
      suggestions,
    };
  }
  
  // Check confidence threshold
  if (confidence < 70) {
    warnings.push('Low extraction confidence - recommend manual verification');
  }
  
  // Check for suspicious patterns
  if (/[0-9]{3,}/.test(cleanEmail.split('@')[0])) {
    // Lots of numbers might indicate OCR errors
    warnings.push('Multiple consecutive numbers detected - verify accuracy');
  }
  
  return {
    email: cleanEmail,
    isValid: true,
    hasMxRecords: true,
    confidence,
    warnings,
    suggestions,
  };
}

/**
 * Validate email and return best match
 * Returns original if valid, or best suggestion if original is invalid
 */
export async function validateAndCorrectEmail(
  email: string,
  confidence: number = 100
): Promise<{ email: string; wasCorreted: boolean; validation: EmailValidationResult }> {
  const validation = await validateEmail(email, confidence);
  
  if (validation.isValid) {
    return { email, wasCorreted: false, validation };
  }
  
  // Try suggestions
  if (validation.suggestions && validation.suggestions.length > 0) {
    for (const suggestion of validation.suggestions) {
      const suggestionValidation = await validateEmail(suggestion, confidence);
      if (suggestionValidation.isValid) {
        return { 
          email: suggestion, 
          wasCorreted: true, 
          validation: suggestionValidation 
        };
      }
    }
  }
  
  // Return original with warning
  return { email, wasCorreted: false, validation };
}

/**
 * Check common provider email patterns
 */
export function suggestProviderEmail(providerName: string, existingEmail?: string): string[] {
  const suggestions: string[] = [];
  const cleanName = providerName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Common healthcare provider email patterns
  const commonPatterns = [
    `billing@${cleanName}.com`,
    `accounts@${cleanName}.com`,
    `ar@${cleanName}.com`,
    `payments@${cleanName}.com`,
    `claims@${cleanName}.com`,
  ];
  
  return commonPatterns;
}
