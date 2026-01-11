import ApiService from './apiService';

class DietProgramsService {
    async getPrograms(filters = {}) {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        const query = params.toString();
        return ApiService.get(query ? `/diet-programs?${query}` : '/diet-programs');
    }

    async getProgram(id) {
        // Try /diets endpoint first (public), fall back to /diet-programs (auth required)
        try {
            return await ApiService.getDiet(id);
        } catch {
            return ApiService.get(`/diet-programs/${id}`);
        }
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

    async stopProgram(programId) {
        return ApiService.post(`/diet-programs/${programId}/stop`);
    }

    async pauseProgram() {
        return ApiService.post('/diets/pause');
    }

    async resumeProgram() {
        return ApiService.post('/diets/resume');
    }
}

export default new DietProgramsService();
