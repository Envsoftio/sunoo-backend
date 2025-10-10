import { SetMetadata } from '@nestjs/common';

export const LOGGER_CONTEXT_KEY = 'logger_context';

/**
 * Decorator to set logger context for a class
 * Usage: @LoggerContext('MyService')
 */
export const LoggerContext = (context: string) =>
  SetMetadata(LOGGER_CONTEXT_KEY, context);
