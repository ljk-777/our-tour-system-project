import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 8000 });

// 景点相关
export const getSpots = (params) => api.get('/spots', { params });
export const getTopK = (params) => api.get('/spots/topk', { params });
export const searchSpots = (params) => api.get('/spots/search', { params });
export const autocompleteSpots = (q) => api.get('/spots/autocomplete', { params: { q } });
export const recommendSpots = (params) => api.get('/spots/recommend', { params });
export const getSpotById = (id) => api.get(`/spots/${id}`);

// 路线相关
export const shortestPath = (data) => api.post('/routes/shortest', data);
export const multiPointPath = (data) => api.post('/routes/multi', data);
export const nearbySearch = (params) => api.get('/routes/nearby', { params });
export const getGraphStats = () => api.get('/routes/graph-stats');

// 日记相关
export const getDiaries = (params) => api.get('/diaries', { params });
export const searchDiaries = (params) => api.get('/diaries/search', { params });
export const getDiaryById = (id) => api.get(`/diaries/${id}`);
export const createDiary = (data) => api.post('/diaries', data);
export const likeDiary = (id) => api.post(`/diaries/${id}/like`);

// 用户相关
export const getUsers = () => api.get('/users');
export const getUserById = (id) => api.get(`/users/${id}`);
export const login = (data) => api.post('/users/login', data);
export const register = (data) => api.post('/users', data);

export default api;
