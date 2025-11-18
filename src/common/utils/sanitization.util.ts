export class SanitizationUtil {
  /**
   * Sanitizes input to prevent SQL injection and XSS attacks
   */
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return (
      input
        .trim()
        // Remove potential SQL injection patterns
        .replace(/['";\\]/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '')
        .replace(/xp_/gi, '')
        .replace(/sp_/gi, '')
        .replace(/exec/gi, '')
        .replace(/execute/gi, '')
        .replace(/select/gi, '')
        .replace(/insert/gi, '')
        .replace(/update/gi, '')
        .replace(/delete/gi, '')
        .replace(/drop/gi, '')
        .replace(/create/gi, '')
        .replace(/alter/gi, '')
        .replace(/union/gi, '')
        .replace(/script/gi, '')
        .replace(/javascript/gi, '')
        .replace(/vbscript/gi, '')
        .replace(/onload/gi, '')
        .replace(/onerror/gi, '')
        .replace(/onclick/gi, '')
        // Remove null bytes
        .replace(/\0/g, '')
        // Limit length
        .substring(0, 2000)
    );
  }

  /**
   * Validates email format and sanitizes it
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized;
  }

  /**
   * Validates and sanitizes UUID
   */
  static sanitizeUUID(uuid: string): string | null {
    if (!uuid || typeof uuid !== 'string') {
      return null;
    }

    const sanitized = uuid.trim();
    const uuidRegex =
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

    if (!uuidRegex.test(sanitized)) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validates feedback type against allowed values
   */
  static validateFeedbackType(type: string): string {
    const allowedTypes = ['Bug', 'Feature Request', 'General', 'Other'];

    if (!type || !allowedTypes.includes(type)) {
      throw new Error('Invalid feedback type');
    }

    return type;
  }

  /**
   * Detects if a string appears to be random/spam (gibberish detection)
   * Checks for patterns like: random character sequences, excessive uppercase/lowercase alternation
   */
  static isSpamText(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const trimmed = text.trim();

    // Too short to analyze
    if (trimmed.length < 5) {
      return false;
    }

    // Check for random character patterns (high entropy)
    // Random strings typically have many alternating case letters
    const alternatingCasePattern = /([a-z][A-Z]|[A-Z][a-z])/g;
    const alternatingMatches = (trimmed.match(alternatingCasePattern) || [])
      .length;
    const alternatingRatio = alternatingMatches / trimmed.length;

    // If more than 30% of characters are in alternating case pattern, likely spam
    if (alternatingRatio > 0.3) {
      return true;
    }

    // Check for excessive random character sequences (like "SIisVZOfTWxYmUlsiLamR")
    // Pattern: many consecutive uppercase/lowercase alternations
    const randomPattern = /([A-Z]{2,}[a-z]{2,}){3,}/g;
    if (randomPattern.test(trimmed)) {
      return true;
    }

    // Check for lack of vowels (common in random strings)
    const vowels = (trimmed.match(/[aeiouAEIOU]/g) || []).length;
    const vowelRatio = vowels / trimmed.length;
    // If less than 10% vowels and length > 10, likely random
    if (trimmed.length > 10 && vowelRatio < 0.1) {
      return true;
    }

    // Check for excessive repeated characters
    const repeatedPattern = /(.)\1{4,}/g;
    if (repeatedPattern.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Validates name format - should be human-readable
   */
  static isValidName(name: string): boolean {
    if (!name || typeof name !== 'string') {
      return false;
    }

    const trimmed = name.trim();

    // Must be at least 2 characters
    if (trimmed.length < 2) {
      return false;
    }

    // Check if it looks like spam
    if (this.isSpamText(trimmed)) {
      return false;
    }

    // Should contain at least one letter
    if (!/[a-zA-Z]/.test(trimmed)) {
      return false;
    }

    // Should not be all uppercase (unless it's an acronym-like name, but check length)
    if (
      trimmed.length > 3 &&
      trimmed === trimmed.toUpperCase() &&
      !trimmed.includes(' ')
    ) {
      return false;
    }

    return true;
  }

  /**
   * Validates message content - should be meaningful
   */
  static isValidMessage(message: string): boolean {
    if (!message || typeof message !== 'string') {
      return false;
    }

    const trimmed = message.trim();

    // Must be at least 10 characters
    if (trimmed.length < 10) {
      return false;
    }

    // Check if it looks like spam
    if (this.isSpamText(trimmed)) {
      return false;
    }

    // Should contain at least some letters (not just numbers/symbols)
    if (!/[a-zA-Z]/.test(trimmed)) {
      return false;
    }

    return true;
  }
}
