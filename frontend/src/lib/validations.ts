export interface ValidationError {
  field: string;
  message: string;
}

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Email wajib diisi';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Format email tidak valid';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Password wajib diisi';
  if (value.length < 6) return 'Password minimal 6 karakter';
  return null;
}

export function validatePhone(value: string): string | null {
  if (!value.trim()) return null; // optional
  const cleaned = value.replace(/[\s\-()]/g, '');
  if (!/^[0-9]+$/.test(cleaned)) return 'Nomor telepon hanya boleh angka';
  if (!cleaned.startsWith('62')) return 'Nomor telepon harus diawali 62 (contoh: 628123456789)';
  if (cleaned.length < 10 || cleaned.length > 15) return 'Nomor telepon tidak valid (10-15 digit)';
  return null;
}

export function validateName(value: string, label = 'Nama'): string | null {
  if (!value.trim()) return `${label} wajib diisi`;
  if (value.trim().length < 2) return `${label} minimal 2 karakter`;
  return null;
}

export function validateNumber(value: number | string, label: string, min = 0, max?: number): string | null {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return `${label} harus berupa angka`;
  if (num < min) return `${label} minimal ${min}`;
  if (max !== undefined && num > max) return `${label} maksimal ${max}`;
  return null;
}

export function validateTime(value: string): string | null {
  if (!value) return null;
  if (!/^\d{2}:\d{2}$/.test(value)) return 'Format jam tidak valid';
  const [h, m] = value.split(':').map(Number);
  if (h < 0 || h > 23) return 'Jam harus 0-23';
  if (m !== 0 && m !== 30) return 'Menit harus 00 atau 30';
  return null;
}

export function validateUrl(value: string, label = 'URL'): string | null {
  if (!value.trim()) return null;
  try { new URL(value); return null; } catch { return `${label} tidak valid`; }
}

export function validateDate(value: string, label = 'Tanggal'): string | null {
  if (!value) return `${label} wajib diisi`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return `${label} tidak valid`;
  return null;
}

export function validateMinLength(value: string, min: number, label: string): string | null {
  if (!value.trim()) return `${label} wajib diisi`;
  if (value.trim().length < min) return `${label} minimal ${min} karakter`;
  return null;
}

export function runValidations(validations: (string | null)[]): string | null {
  for (const err of validations) {
    if (err) return err;
  }
  return null;
}
