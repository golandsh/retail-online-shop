import { describe, it, expect } from 'vitest';

// Simulating address completion verification
function isAddressComplete(profile: {
  fullName: string;
  city: string;
  street: string;
  streetNumber: string;
}) {
  return (
    profile.fullName.trim() !== '' &&
    profile.city.trim() !== '' &&
    profile.street.trim() !== '' &&
    profile.streetNumber.trim() !== ''
  );
}

// Simulating credit card formatting
function formatCardNumber(value: string): string {
  const digitsOnly = value.replace(/\D/g, '');
  const matched = digitsOnly.match(/.{1,4}/g);
  return matched ? matched.join(' ').substring(0, 19) : '';
}

function formatExpiry(value: string): string {
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length > 2) {
    return `${digitsOnly.substring(0, 2)}/${digitsOnly.substring(2, 4)}`.substring(0, 5);
  }
  return digitsOnly.substring(0, 2);
}

describe('Profile address completion check', () => {
  it('identifies incomplete profiles correctly', () => {
    const incomplete = {
      fullName: 'ישראל ישראלי',
      city: '',
      street: 'אבן גבירול',
      streetNumber: '',
    };
    expect(isAddressComplete(incomplete)).toBe(false);
  });

  it('identifies completed profiles correctly', () => {
    const complete = {
      fullName: 'ישראל ישראלי',
      city: 'תל אביב',
      street: 'אבן גבירול',
      streetNumber: '14',
    };
    expect(isAddressComplete(complete)).toBe(true);
  });
});

describe('Credit Card Form Input Formatters', () => {
  it('groups credit card digits in sets of 4 with spaces', () => {
    expect(formatCardNumber('4580123456789012')).toBe('4580 1234 5678 9012');
    expect(formatCardNumber('123')).toBe('123');
    expect(formatCardNumber('12345')).toBe('1234 5');
  });

  it('formats expiry fields as MM/YY', () => {
    expect(formatExpiry('1225')).toBe('12/25');
    expect(formatExpiry('1')).toBe('1');
    expect(formatExpiry('12')).toBe('12');
    expect(formatExpiry('122')).toBe('12/2');
  });
});
