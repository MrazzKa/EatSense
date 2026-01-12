import ApiService from './apiService';

/**
 * DietProgramsService - Legacy wrapper around ApiService diet methods
 * All diet operations go through /diets/ endpoints
 */
class DietProgramsService {
    async getPrograms(filters = {}) {
        return ApiService.getDiets(filters);
    }

    async getProgram(id) {
        return ApiService.getDiet(id);
    }

    async startProgram(programId) {
        return ApiService.startDiet(programId);
    }

    async getProgress(programId) {
        // Get active diet includes progress
        return ApiService.getActiveDiet();
    }

    async completeDay(programId, dayNumber) {
        // Use today's plan endpoint or checklist
        return ApiService.request('/diets/active/checklist', {
            method: 'PATCH',
            body: JSON.stringify({ dayNumber }),
        });
    }

    async stopProgram(programId) {
        return ApiService.abandonDiet();
    }

    async pauseProgram() {
        return ApiService.pauseDiet();
    }

    async resumeProgram() {
        return ApiService.resumeDiet();
    }
}

export default new DietProgramsService();
