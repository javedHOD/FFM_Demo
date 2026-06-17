import apiClient from './client';
import type { Country, Region, City, LocationHierarchy } from '../types/hr';

export const locationApi = {
  // Countries
  getCountries: async (): Promise<Country[]> => {
    const { data } = await apiClient.get('/location/countries');
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getCountryById: async (id: number): Promise<Country> => {
    const { data } = await apiClient.get(`/location/countries/${id}`);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  createCountry: async (payload: Partial<Country>): Promise<Country> => {
    const { data } = await apiClient.post('/location/countries', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create country');
    return data.data;
  },

  updateCountry: async (id: number, payload: Partial<Country>): Promise<Country> => {
    const { data } = await apiClient.put(`/location/countries/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update country');
    return data.data;
  },

  deleteCountry: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/location/countries/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete country');
  },

  // Regions
  getRegions: async (countryId?: number): Promise<Region[]> => {
    const url = countryId ? `/location/regions?countryId=${countryId}` : '/location/regions';
    const { data } = await apiClient.get(url);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getRegionById: async (id: number): Promise<Region> => {
    const { data } = await apiClient.get(`/location/regions/${id}`);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  createRegion: async (payload: Partial<Region>): Promise<Region> => {
    const { data } = await apiClient.post('/location/regions', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create region');
    return data.data;
  },

  updateRegion: async (id: number, payload: Partial<Region>): Promise<Region> => {
    const { data } = await apiClient.put(`/location/regions/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update region');
    return data.data;
  },

  deleteRegion: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/location/regions/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete region');
  },

  // Cities
  getCities: async (regionId?: number, countryId?: number): Promise<City[]> => {
    const params = new URLSearchParams();
    if (regionId) params.append('regionId', String(regionId));
    if (countryId) params.append('countryId', String(countryId));
    const url = `/location/cities${params.toString() ? '?' + params.toString() : ''}`;
    const { data } = await apiClient.get(url);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getCityById: async (id: number): Promise<City> => {
    const { data } = await apiClient.get(`/location/cities/${id}`);
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  createCity: async (payload: Partial<City>): Promise<City> => {
    const { data } = await apiClient.post('/location/cities', payload);
    if (!data.success) throw new Error(data.message || 'Failed to create city');
    return data.data;
  },

  updateCity: async (id: number, payload: Partial<City>): Promise<City> => {
    const { data } = await apiClient.put(`/location/cities/${id}`, payload);
    if (!data.success) throw new Error(data.message || 'Failed to update city');
    return data.data;
  },

  deleteCity: async (id: number): Promise<void> => {
    const { data } = await apiClient.delete(`/location/cities/${id}`);
    if (!data.success) throw new Error(data.message || 'Failed to delete city');
  },

  // Location Hierarchy
  getLocationHierarchy: async (): Promise<LocationHierarchy> => {
    const { data } = await apiClient.get('/location/hierarchy');
    if (!data.success) throw new Error(data.message);
    return data.data[0] || { countryId: 0, countryName: '', regions: [] };
  },
};
