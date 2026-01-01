import ApiService from './apiService';

class MarketplaceService {
    // Specialists
    async getSpecialists(filters = {}) {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.verified) params.append('verified', 'true');
        const query = params.toString();
        return ApiService.get(query ? `/specialists?${query}` : '/specialists');
    }

    async getSpecialist(id) {
        return ApiService.get(`/specialists/${id}`);
    }

    // Consultations
    async startConsultation(specialistId) {
        return ApiService.post(`/consultations/start/${specialistId}`);
    }

    async getMyConsultations() {
        return ApiService.get('/consultations/my');
    }

    async getConsultation(id) {
        return ApiService.get(`/consultations/${id}`);
    }

    // Messages
    async getMessages(consultationId) {
        return ApiService.get(`/messages/consultation/${consultationId}`);
    }

    async sendMessage(consultationId, content, type = 'text', metadata = null) {
        return ApiService.post(`/messages/consultation/${consultationId}`, {
            content,
            type,
            metadata,
        });
    }

    async markAsRead(consultationId) {
        return ApiService.post(`/messages/consultation/${consultationId}/read`);
    }

    async getUnreadCount() {
        try {
            return await ApiService.get('/messages/unread-count');
        } catch {
            // Return 0 if endpoint not available yet
            return { count: 0 };
        }
    }

    async shareMeals(consultationId, fromDate, toDate) {
        return ApiService.post(`/messages/consultation/${consultationId}/share-meals`, {
            fromDate,
            toDate,
        });
    }

    // Reviews
    async createReview(consultationId, rating, comment) {
        return ApiService.post(`/reviews/consultation/${consultationId}`, { rating, comment });
    }
}

export default new MarketplaceService();
