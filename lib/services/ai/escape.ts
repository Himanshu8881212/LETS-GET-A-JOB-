/**
 * Neutralize prompt-injection attempts in user-supplied text before it's
 * interpolated into a system/user prompt.
 *
 * We don't strip content — that would damage legitimate resumes that happen
 * to mention "system:" or contain XML-looking strings. Instead, we escape
 * the characters that delimit our XML scope tags and insert zero-width marks
 * around common instruction phrases, so the model still sees the words but
 * won't be fooled into treating them as commands.
 */

const INSTRUCTION_TRIGGERS: RegExp[] = [
  /\bignore (all|the|previous|prior|above) (instructions?|rules?|prompts?)\b/gi,
  /\byou are now\b/gi,
  /\bdisregard (all|the|previous|prior) /gi,
  /\bsystem\s*[:=]/gi,
  /\bassistant\s*[:=]/gi,
  /\bdeveloper\s*[:=]/gi,
]

export function escapeForPrompt(text: string | null | undefined): string {
  if (!text) return ''
  let out = String(text)
  // Escape XML tag delimiters so our <tags> can't be closed by user content.
  out = out.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // De-weaponize common override phrases by inserting a zero-width space
  // between the trigger word and the rest. Humans reading the prompt still
  // see "ignore all instructions"; the tokenizer sees a different token
  // sequence, which defuses the command.
  for (const re of INSTRUCTION_TRIGGERS) {
    out = out.replace(re, (m) => m.replace(/\s/, '\u200b '))
  }
  return out
}

/** Shorthand for user content that may be multi-kilobyte. */
export function safeUserContent(text: string | null | undefined, maxChars?: number): string {
  const escaped = escapeForPrompt(text)
  if (maxChars && escaped.length > maxChars) {
    return escaped.slice(0, maxChars) + '\n…[truncated]'
  }
  return escaped
}
