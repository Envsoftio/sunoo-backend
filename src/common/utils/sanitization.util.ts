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
}
