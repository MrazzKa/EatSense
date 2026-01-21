// apps/api/src/subscriptions/apple-receipt.service.ts
// Service for validating Apple App Store receipts

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface AppleReceiptValidationResult {
    isValid: boolean;
    status?: number;
    productId?: string;
    transactionId?: string;
    originalTransactionId?: string;
    purchaseDate?: Date;
    expiresDate?: Date;
    isTrialPeriod?: boolean;
    isSandbox?: boolean;
    error?: any;
}

@Injectable()
export class AppleReceiptService {
    private readonly logger = new Logger(AppleReceiptService.name);

    private readonly VERIFY_URL_PROD = 'https://buy.itunes.apple.com/verifyReceipt';
    private readonly VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

    async verifyReceipt(receiptData: string): Promise<AppleReceiptValidationResult> {
        const sharedSecret = process.env.APPLE_SHARED_SECRET;

        if (!sharedSecret) {
            this.logger.error('APPLE_SHARED_SECRET not configured');
            return { isValid: false, error: 'Server configuration error' };
        }

        const payload = {
            'receipt-data': receiptData,
            'password': sharedSecret,
            'exclude-old-transactions': true,
        };

        try {
            // First try production
            let response = await axios.post(this.VERIFY_URL_PROD, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000,
            });

            // Status 21007 means sandbox receipt sent to production - retry with sandbox
            if (response.data.status === 21007) {
                this.logger.log('Sandbox receipt detected, switching to sandbox URL');
                response = await axios.post(this.VERIFY_URL_SANDBOX, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000,
                });
            }

            const { status, latest_receipt_info } = response.data;

            if (status === 0 && latest_receipt_info?.length > 0) {
                const latestReceipt = latest_receipt_info.sort((a, b) =>
                    parseInt(b.expires_date_ms || '0') - parseInt(a.expires_date_ms || '0')
                )[0];

                return {
                    isValid: true,
                    status,
                    productId: latestReceipt.product_id,
                    transactionId: latestReceipt.transaction_id,
                    originalTransactionId: latestReceipt.original_transaction_id,
                    purchaseDate: latestReceipt.purchase_date_ms
                        ? new Date(parseInt(latestReceipt.purchase_date_ms))
                        : undefined,
                    expiresDate: latestReceipt.expires_date_ms
                        ? new Date(parseInt(latestReceipt.expires_date_ms))
                        : undefined,
                    isTrialPeriod: latestReceipt.is_trial_period === 'true',
                    isSandbox: response.config.url?.includes('sandbox') || false,
                };
            }

            this.logger.warn(`Apple receipt validation failed with status: ${status}`);
            return { isValid: false, status };

        } catch (error: any) {
            this.logger.error('Apple receipt validation error:', error.message);
            return { isValid: false, error: error.message };
        }
    }

    getStatusMessage(status: number): string {
        const statusMessages: Record<number, string> = {
            0: 'Valid receipt',
            21000: 'App Store could not read the JSON',
            21002: 'Receipt data malformed',
            21003: 'Receipt could not be authenticated',
            21004: 'Shared secret mismatch',
            21005: 'Receipt server unavailable',
            21006: 'Receipt valid but subscription expired',
            21007: 'Sandbox receipt sent to production',
            21008: 'Production receipt sent to sandbox',
            21010: 'Could not be authorized',
        };
        return statusMessages[status] || `Unknown status: ${status}`;
    }
}
