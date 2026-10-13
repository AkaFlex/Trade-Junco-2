// Sem caracteres ambíguos (0/O, 1/I/L): 31 símbolos.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 10;
// Maior múltiplo de 31 que cabe em um byte; bytes acima disso são descartados para não haver viés.
const MAX_UNBIASED = 256 - (256 % ALPHABET.length);

export const generateTradeCode = (): string => {
  let code = '';
  while (code.length < CODE_LENGTH) {
    const bytes = new Uint8Array(CODE_LENGTH);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < MAX_UNBIASED && code.length < CODE_LENGTH) code += ALPHABET[b % ALPHABET.length];
    }
  }
  return `TJ-${code}`;
};

export const normalizeTradeCode = (input: string): string => input.trim().toUpperCase();
