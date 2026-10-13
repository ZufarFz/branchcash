import { DenomConfig, BankOption, PaymentMethodOption } from '../types';

/**
 * Seluruh master data (pecahan uang, bank, metode pembayaran)
 * dikelola 100% secara dinamis dari tabel database Supabase Cloud.
 */
export const MASTER_DENOMS: DenomConfig[] = [];
export const MASTER_BANKS: BankOption[] = [];
export const MASTER_PAYMENT_METHODS: PaymentMethodOption[] = [];


