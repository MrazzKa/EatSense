import ApiService from './apiService';

class ReferralsService {
    async getMyReferralCode() {
        return ApiService.get('/referrals/my-code');
    }

    async getReferralStats() {
        return ApiService.get('/referrals/stats');
    }

    async getRecentReferrals() {
        return ApiService.get('/referrals/recent');
    }
}

export default new ReferralsService();
