import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { toast } from 'sonner';
import { API_URL } from './endpoints';
import { getStatusMessage } from './status-codes';
import type { ApiError } from './types';

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 20000,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || '';
        const serverMessage = error.response?.data?.message;
        const message =
          typeof serverMessage === 'string'
            ? serverMessage
            : getStatusMessage(status);

        const isAuthEndpoint = requestUrl.includes('/auth/');

        if (status === 403) {
          toast.error('You do not have permission to access this resource.');
        } else if (!isAuthEndpoint && status !== 404) {
          toast.error(message);
        }

        return Promise.reject({
          message,
          status,
          details: error.response?.data?.details,
        });
      }
    );
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  public async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const finalConfig =
      data instanceof FormData
        ? {
            ...config,
            headers: { ...config?.headers, 'Content-Type': undefined },
          }
        : config;
    const response = await this.axiosInstance.post<T>(url, data, finalConfig);
    return response.data;
  }

  public async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  public async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default ApiClient;
