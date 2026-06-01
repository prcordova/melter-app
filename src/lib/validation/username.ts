export function validateUsername(value: string): { ok: true } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (trimmed.length < 3) {
    return { ok: false, message: 'Username deve ter no mínimo 3 caracteres' };
  }
  if (trimmed.length > 20) {
    return { ok: false, message: 'Username deve ter no máximo 20 caracteres' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { ok: false, message: 'Username pode conter apenas letras, números e underscore' };
  }
  return { ok: true };
}
