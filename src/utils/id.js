export function generateEntityId(prefix = 'gf') {
  const normalizedPrefix = String(prefix || 'gf').trim().toLowerCase() || 'gf';
  const rawId = generateUuid();

  return `${normalizedPrefix}-${rawId}`.slice(0, 50);
}

export function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const fallback = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`.replace(/[^a-z0-9-]/gi, '');
  return `${fallback.slice(0, 8)}-${fallback.slice(8, 12).padEnd(4, '0')}-${fallback.slice(12, 16).padEnd(4, '0')}-${fallback.slice(16, 20).padEnd(4, '0')}-${fallback.slice(20, 32).padEnd(12, '0')}`;
}
