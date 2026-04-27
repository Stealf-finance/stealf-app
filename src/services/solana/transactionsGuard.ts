import * as bip39 from 'bip39';
import { isAddress } from './kit';

const ESTIMATED_FEE_SOL = 0.000005;
const RENT_EXEMPT_MIN_SOL = 0.00089;

export interface GuardResult {
  valid: boolean;
  error?: string;
}

const SOLANA_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

export function validateAddress(addr: string): GuardResult {
  if (!addr || addr.trim() === '') {
    return { valid: false, error: 'Please enter a recipient address' };
  }
  const trimmed = addr.trim();
  if (!SOLANA_BASE58_RE.test(trimmed)) return { valid: false, error: 'Invalid Solana address' };
  if (trimmed.length < 32 || trimmed.length > 44) return { valid: false, error: 'Invalid Solana address' };
  if (!isAddress(trimmed)) return { valid: false, error: 'Invalid Solana address' };
  return { valid: true };
}

export function validateAmount(amount: string, maxDecimals = 9): GuardResult {
  if (!amount || amount.trim() === '') return { valid: false, error: 'Please enter an amount' };
  const num = parseFloat(amount);
  if (isNaN(num)) return { valid: false, error: 'Invalid amount format' };
  if (num <= 0) return { valid: false, error: 'Amount must be greater than 0' };

  const parts = amount.split('.');
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    return { valid: false, error: `Maximum ${maxDecimals} decimal places allowed` };
  }
  return { valid: true };
}

export function validateBalance(amountSOL: number, balanceSOL: number): GuardResult {
  if (balanceSOL <= 0) return { valid: false, error: 'Insufficient balance' };

  const totalNeeded = amountSOL + ESTIMATED_FEE_SOL;
  if (totalNeeded > balanceSOL) {
    const maxSendable = Math.max(0, balanceSOL - ESTIMATED_FEE_SOL);
    return {
      valid: false,
      error: `Insufficient balance. Max sendable: ${maxSendable.toFixed(6)} SOL (fees: ~${ESTIMATED_FEE_SOL} SOL)`,
    };
  }

  const remaining = balanceSOL - totalNeeded;
  if (remaining > 0 && remaining < RENT_EXEMPT_MIN_SOL) {
    return {
      valid: false,
      error: `This would leave ${remaining.toFixed(6)} SOL — below the rent-exempt minimum (${RENT_EXEMPT_MIN_SOL} SOL). Send all or reduce amount.`,
    };
  }
  return { valid: true };
}

export function validateNotSelf(from: string, to: string): GuardResult {
  if (from.trim() === to.trim()) return { valid: false, error: 'Cannot send to yourself' };
  return { valid: true };
}

export function validateMnemonic(mnemonic: string): GuardResult {
  if (!mnemonic || mnemonic.trim() === '') {
    return { valid: false, error: 'Please enter your seed phrase' };
  }
  const normalized = mnemonic.trim().toLowerCase();
  const words = normalized.split(/\s+/);
  if (words.length !== 12 && words.length !== 24) {
    return { valid: false, error: 'Seed phrase must be 12 or 24 words' };
  }
  if (!bip39.validateMnemonic(normalized)) {
    return { valid: false, error: 'Invalid seed phrase. Please check for typos.' };
  }
  return { valid: true };
}

export function guardTransaction(params: {
  fromAddress: string;
  toAddress: string;
  amount: string;
  amountSOL: number;
  balanceSOL?: number;
}): GuardResult {
  const { fromAddress, toAddress, amount, amountSOL, balanceSOL } = params;

  const addressCheck = validateAddress(toAddress);
  if (!addressCheck.valid) return addressCheck;

  const selfCheck = validateNotSelf(fromAddress, toAddress);
  if (!selfCheck.valid) return selfCheck;

  const amountCheck = validateAmount(amount);
  if (!amountCheck.valid) return amountCheck;

  if (balanceSOL != null) {
    const balanceCheck = validateBalance(amountSOL, balanceSOL);
    if (!balanceCheck.valid) return balanceCheck;
  }
  return { valid: true };
}
