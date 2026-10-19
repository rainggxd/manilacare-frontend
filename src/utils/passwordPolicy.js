// Same rules as the backend (app/Libraries/PasswordPolicy.php).
// At least 8 characters, with an uppercase letter, a lowercase letter,
// a number, and a special character.

export const PASSWORD_RULE_TEXT =
  "At least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character.";

// Returns an error message, or "" when the password is OK.
export function checkPassword(pw) {
  const value = pw || "";
  if (
    value.length < 8 ||
    value.length > 72 ||
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/[0-9]/.test(value) ||
    !/[^A-Za-z0-9]/.test(value)
  ) {
    return PASSWORD_RULE_TEXT;
  }
  return "";
}