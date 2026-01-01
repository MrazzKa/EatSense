import ApiService from './apiService';

class ReferralsService {
  async getMyReferrals() {
    return ApiService.get('/referrals/my');
  }

  async getCode() {
    return ApiService.get('/referrals/code');
  }

  async validateCode(code) {
    return ApiService.get(`/referrals/validate?code=${encodeURIComponent(code)}`);
  }

  async applyCode(code) {
    return ApiService.post('/referrals/apply', { code });
  }
}

export default new ReferralsService();
