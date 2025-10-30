/**
 * Type declarations for raw module imports
 *
 * Enables importing markdown files as strings using ?raw suffix
 * Example: import content from './file.md?raw'
 */

declare module '*.md?raw' {
  const content: string;
  export default content;
}
