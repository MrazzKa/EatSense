import ApiService from './apiService';

class MarketplaceService {
    // ==================== EXPERTS ====================

    async getExperts(filters = {}) {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.language) params.append('language', filters.language);
        if (filters.specialization) params.append('specialization', filters.specialization);
        if (filters.verified !== undefined) params.append('verified', String(filters.verified));
        if (filters.minRating) params.append('minRating', String(filters.minRating));
        if (filters.search) params.append('search', filters.search);
        if (filters.limit) params.append('limit', String(filters.limit));
        if (filters.offset) params.append('offset', String(filters.offset));
        const query = params.toString();
        return ApiService.get(query ? `/experts?${query}` : '/experts');
    }

    async getExpert(id) {
        return ApiService.get(`/experts/${id}`);
    }

    async getExpertOffers(expertId) {
        return ApiService.get(`/experts/${expertId}/offers`);
    }

    // ==================== MY EXPERT PROFILE ====================

    async getMyExpertProfile() {
        return ApiService.get('/experts/me/profile');
    }

    async createExpertProfile(data) {
        return ApiService.post('/experts/me/profile', data);
    }

    async updateExpertProfile(data) {
        return ApiService.patch('/experts/me/profile', data);
    }

    async publishExpertProfile(isPublished) {
        return ApiService.post('/experts/me/profile/publish', { isPublished });
    }

    // ==================== MY CREDENTIALS ====================

    async getMyCredentials() {
        return ApiService.get('/experts/me/credentials');
    }

    async uploadCredential(data) {
        return ApiService.post('/experts/me/credentials', data);
    }

    async deleteCredential(id) {
        return ApiService.delete(`/experts/me/credentials/${id}`);
    }

    // ==================== MY OFFERS ====================

    async getMyOffers() {
        return ApiService.get('/experts/me/offers');
    }

    async createOffer(data) {
        return ApiService.post('/experts/me/offers', data);
    }

    async updateOffer(id, data) {
        return ApiService.patch(`/experts/me/offers/${id}`, data);
    }

    async deleteOffer(id) {
        return ApiService.delete(`/experts/me/offers/${id}`);
    }

    async publishOffer(id, isPublished) {
        return ApiService.post(`/experts/me/offers/${id}/publish`, { isPublished });
    }

    // ==================== CONVERSATIONS ====================

    async getConversations() {
        return ApiService.get('/conversations');
    }

    async getConversation(id) {
        return ApiService.get(`/conversations/${id}`);
    }

    /**
     * Start a new conversation with an expert
     * @param {string} expertId - Expert profile ID
     * @param {string} [offerId] - Optional offer ID
     * @returns {Promise<any>}
     */
    async startConversation(expertId, offerId) {
        return ApiService.post('/conversations/start', { expertId, offerId });
    }

    async updateConversation(id, data) {
        return ApiService.patch(`/conversations/${id}`, data);
    }

    async getConversationUnreadCount() {
        try {
            return await ApiService.get('/conversations/unread-count');
        } catch {
            return { count: 0, asClient: 0, asExpert: 0 };
        }
    }

    // ==================== MESSAGES ====================

    async getMessages(conversationId) {
        return ApiService.get(`/messages/conversation/${conversationId}`);
    }

    async sendMessage(conversationId, content, type = 'text', metadata = null) {
        return ApiService.post(`/messages/conversation/${conversationId}`, {
            content,
            type,
            metadata,
        });
    }

    async markAsRead(conversationId) {
        return ApiService.post(`/messages/conversation/${conversationId}/read`);
    }

    async getUnreadCount() {
        try {
            return await ApiService.get('/messages/unread-count');
        } catch {
            return { count: 0, asClient: 0, asExpert: 0 };
        }
    }

    async shareMeals(conversationId, fromDate, toDate) {
        return ApiService.post(`/messages/conversation/${conversationId}/share-meals`, {
            fromDate,
            toDate,
        });
    }

    async shareReport(conversationId, reportData) {
        return ApiService.post(`/messages/conversation/${conversationId}/share-report`, {
            reportData,
        });
    }

    // ==================== REVIEWS ====================

    async getExpertReviews(expertId) {
        return ApiService.get(`/reviews/expert/${expertId}`);
    }

    async createReview(expertId, rating, comment, conversationId = null) {
        return ApiService.post('/reviews', { expertId, rating, comment, conversationId });
    }

    async updateReview(id, rating, comment) {
        return ApiService.patch(`/reviews/${id}`, { rating, comment });
    }

    async deleteReview(id) {
        return ApiService.delete(`/reviews/${id}`);
    }

    // ==================== SAFETY ====================

    async getDisclaimerStatus() {
        try {
            return await ApiService.get('/disclaimers/status');
        } catch {
            return { experts_chat: false };
        }
    }

    async acceptDisclaimer(type) {
        return ApiService.post('/disclaimers/accept', { type });
    }

    async createAbuseReport(data) {
        return ApiService.post('/reports', data);
    }

    async getBlockedUsers() {
        return ApiService.get('/blocks');
    }

    async blockUser(blockedId) {
        return ApiService.post('/blocks', { blockedId });
    }

    async unblockUser(blockedId) {
        return ApiService.delete(`/blocks/${blockedId}`);
    }

    // ==================== BACKWARD COMPATIBILITY ====================
    // These methods are kept for backward compatibility with old code

    async getSpecialists(filters = {}) {
        return this.getExperts(filters);
    }

    async getSpecialist(id) {
        return this.getExpert(id);
    }

    async getMyConsultations() {
        const result = await this.getConversations();
        return result?.asClient || [];
    }

    async getConsultation(id) {
        return this.getConversation(id);
    }
}

export default new MarketplaceService();
