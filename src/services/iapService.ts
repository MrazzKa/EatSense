// src/services/iapService.ts
// In-App Purchase service using react-native-iap

import { Platform } from 'react-native';
import {
    initConnection,
    endConnection,
    getSubscriptions,
    getProducts,
    requestSubscription,
    requestPurchase,
    purchaseUpdatedListener,
    purchaseErrorListener,
    finishTransaction,
    getPurchaseHistory,
    clearTransactionIOS,
    type ProductPurchase,
    type SubscriptionPurchase,
    type PurchaseError,
} from 'react-native-iap';
import { SUBSCRIPTION_SKUS, NON_CONSUMABLE_SKUS } from '../config/subscriptions';
import ApiService from './apiService';

class IAPService {
    private purchaseUpdateSubscription: any = null;
    private purchaseErrorSubscription: any = null;
    private isInitialized = false;
    private onPurchaseSuccess: ((_productId: string) => void) | null = null;
    private onPurchaseError: ((_error: any) => void) | null = null;
    // Cache verified transaction IDs to avoid duplicate verify calls
    private verifiedTransactionIds = new Set<string>();

    async init(): Promise<boolean> {
        if (this.isInitialized) {
            return true;
        }

        try {
            const result = await initConnection();
            console.log('[IAP] Connection initialized:', result);

            if (Platform.OS === 'ios') {
                await clearTransactionIOS();
            }

            this.purchaseUpdateSubscription = purchaseUpdatedListener(
                async (purchase: SubscriptionPurchase | ProductPurchase) => {
                    console.log('[IAP] Purchase updated:', purchase.productId);
                    await this.handlePurchase(purchase);
                }
            );

            this.purchaseErrorSubscription = purchaseErrorListener(
                (error: PurchaseError) => {
                    console.log('[IAP] Purchase error:', error.code, error.message);
                    if (this.onPurchaseError) {
                        this.onPurchaseError(error);
                    }
                }
            );

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('[IAP] Init failed:', error);
            return false;
        }
    }

    private async handlePurchase(purchase: SubscriptionPurchase | ProductPurchase) {
        const receipt = Platform.OS === 'ios'
            ? purchase.transactionReceipt
            : purchase.purchaseToken;

        if (!receipt) {
            console.error('[IAP] No receipt found');
            if (this.onPurchaseError) {
                this.onPurchaseError(new Error('No receipt found in purchase'));
            }
            return;
        }

        // Skip if this transaction was already verified
        const txId = purchase.transactionId;
        if (txId && this.verifiedTransactionIds.has(txId)) {
            console.log('[IAP] Transaction already verified, skipping:', txId);
            if (this.onPurchaseSuccess) {
                this.onPurchaseSuccess(purchase.productId);
            }
            return;
        }

        try {
            const response = await ApiService.verifyPurchase({
                productId: purchase.productId,
                platform: Platform.OS as 'ios' | 'android',
                receipt: receipt,
                transactionId: purchase.transactionId,
            });

            if (response?.success) {
                await finishTransaction({
                    purchase,
                    isConsumable: false,
                });

                // Cache verified transaction ID
                if (txId) {
                    this.verifiedTransactionIds.add(txId);
                }

                console.log('[IAP] Transaction finished:', purchase.productId);

                if (this.onPurchaseSuccess) {
                    this.onPurchaseSuccess(purchase.productId);
                }
            } else {
                throw new Error('Backend validation failed');
            }
        } catch (error) {
            console.error('[IAP] Handle purchase error:', error);
            if (this.onPurchaseError) {
                this.onPurchaseError(error);
            }
        }
    }

    async getAvailableProducts() {
        try {
            const subscriptions = await getSubscriptions({
                skus: Object.values(SUBSCRIPTION_SKUS),
            });

            const products = await getProducts({
                skus: Object.values(NON_CONSUMABLE_SKUS),
            });

            console.log('[IAP] Subscriptions:', subscriptions.length);
            console.log('[IAP] Products:', products.length);

            return {
                subscriptions,
                products,
                all: [...subscriptions, ...products],
            };
        } catch (error) {
            console.error('[IAP] Get products failed:', error);
            return { subscriptions: [], products: [], all: [] };
        }
    }

    async purchaseSubscription(
        sku: string,
        onSuccess?: (_productId: string) => void,
        onError?: (_error: any) => void
    ) {
        this.onPurchaseSuccess = onSuccess || null;
        this.onPurchaseError = onError || null;

        try {
            console.log('[IAP] Requesting subscription:', sku);
            await requestSubscription({
                sku,
                andDangerouslyFinishTransactionAutomaticallyIOS: false,
            });
        } catch (error: any) {
            console.error('[IAP] Purchase subscription error:', error);
            if (error.code === 'E_USER_CANCELLED') {
                // Call error callback so UI can reset purchasing state
                if (this.onPurchaseError) {
                    this.onPurchaseError(error);
                }
                return;
            }
            throw error;
        }
    }

    /**
     * Purchase subscription with promotional offer (free trial)
     * Used for paywall purchases where user gets a free trial period
     *
     * @param sku - Product SKU (e.g., 'eatsense.pro.monthly')
     * @param offerData - Signed offer data from server
     * @param onSuccess - Success callback
     * @param onError - Error callback
     */
    async purchaseSubscriptionWithOffer(
        sku: string,
        offerData: {
            offerId: string;
            keyIdentifier: string;
            nonce: string;
            timestamp: number;
            signature: string;
            applicationUsername: string;
        },
        onSuccess?: (_productId: string) => void,
        onError?: (_error: any) => void
    ) {
        this.onPurchaseSuccess = onSuccess || null;
        this.onPurchaseError = onError || null;

        try {
            console.log('[IAP] Requesting subscription with offer:', sku, offerData.offerId);

            // Build iOS discount object for promotional offer
            const iosOffer = Platform.OS === 'ios' ? {
                identifier: offerData.offerId,
                keyIdentifier: offerData.keyIdentifier,
                nonce: offerData.nonce,
                signature: offerData.signature,
                timestamp: offerData.timestamp,
            } : undefined;

            await requestSubscription({
                sku,
                andDangerouslyFinishTransactionAutomaticallyIOS: false,
                // @ts-ignore - iosOffer is supported but not in types
                subscriptionOffers: iosOffer ? [{
                    sku,
                    offerToken: '', // Not needed for iOS promotional offers
                    ...iosOffer,
                }] : undefined,
            });
        } catch (error: any) {
            console.error('[IAP] Purchase with offer error:', error);
            if (error.code === 'E_USER_CANCELLED') {
                if (this.onPurchaseError) {
                    this.onPurchaseError(error);
                }
                return;
            }
            throw error;
        }
    }

    async purchaseProduct(
        sku: string,
        onSuccess?: (_productId: string) => void,
        onError?: (_error: any) => void
    ) {
        this.onPurchaseSuccess = onSuccess || null;
        this.onPurchaseError = onError || null;

        try {
            console.log('[IAP] Requesting product:', sku);
            await requestPurchase({
                sku,
                andDangerouslyFinishTransactionAutomaticallyIOS: false,
            });
        } catch (error: any) {
            console.error('[IAP] Purchase product error:', error);
            if (error.code === 'E_USER_CANCELLED') {
                // Call error callback so UI can reset purchasing state
                if (this.onPurchaseError) {
                    this.onPurchaseError(error);
                }
                return;
            }
            throw error;
        }
    }

    async restorePurchases(): Promise<boolean> {
        try {
            console.log('[IAP] Restoring purchases...');
            const purchases = await getPurchaseHistory();
            console.log('[IAP] Found purchases:', purchases.length);

            let restored = false;

            for (const purchase of purchases) {
                const receipt = Platform.OS === 'ios'
                    ? purchase.transactionReceipt
                    : purchase.purchaseToken;

                if (receipt) {
                    try {
                        const response = await ApiService.verifyPurchase({
                            productId: purchase.productId,
                            platform: Platform.OS as 'ios' | 'android',
                            receipt: receipt,
                            transactionId: purchase.transactionId,
                        });

                        if (response?.success) {
                            restored = true;
                        }
                    } catch (e) {
                        console.log('[IAP] Restore single purchase failed:', e);
                    }
                }
            }

            return restored;
        } catch (error) {
            console.error('[IAP] Restore purchases error:', error);
            throw error;
        }
    }

    destroy() {
        console.log('[IAP] Destroying service...');
        if (this.purchaseUpdateSubscription) {
            this.purchaseUpdateSubscription.remove();
            this.purchaseUpdateSubscription = null;
        }
        if (this.purchaseErrorSubscription) {
            this.purchaseErrorSubscription.remove();
            this.purchaseErrorSubscription = null;
        }
        this.isInitialized = false;
        endConnection();
    }
}

export default new IAPService();
