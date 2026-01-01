import ApiService from './apiService';

class DietProgramsService {
    async getPrograms(filters = {}) {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        const query = params.toString();
        return ApiService.get(query ? `/diet-programs?${query}` : '/diet-programs');
    }

    async getProgram(id) {
        return ApiService.get(`/diet-programs/${id}`);
    }

    async startProgram(programId) {
        return ApiService.post(`/diet-programs/${programId}/start`);
    }

    async getProgress(programId) {
        return ApiService.get(`/diet-programs/${programId}/progress`);
    }

    async completeDay(programId, dayNumber) {
        return ApiService.post(`/diet-programs/${programId}/complete-day`, { dayNumber });
    }
}

export default new DietProgramsService();
