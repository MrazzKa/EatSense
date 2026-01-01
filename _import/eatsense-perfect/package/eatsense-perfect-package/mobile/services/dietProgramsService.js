import ApiService from './apiService';

class DietProgramsService {
  async getPrograms(category = null) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    const query = params.toString();
    return ApiService.get(query ? `/diet-programs?${query}` : '/diet-programs');
  }

  async getProgram(idOrSlug) {
    return ApiService.get(`/diet-programs/${idOrSlug}`);
  }

  async getProgramDay(programId, dayNumber) {
    return ApiService.get(`/diet-programs/${programId}/days/${dayNumber}`);
  }

  async getMyPrograms() {
    return ApiService.get('/diet-programs/user/my');
  }

  async startProgram(programId) {
    return ApiService.post(`/diet-programs/${programId}/start`);
  }

  async updateProgress(programId, day) {
    return ApiService.put(`/diet-programs/${programId}/progress/${day}`);
  }
}

export default new DietProgramsService();
