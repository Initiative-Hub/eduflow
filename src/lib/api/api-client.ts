import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { toast } from 'sonner';
import { BASE_URL } from './endpoints';
import { getStatusMessage } from './status-codes';
import type { ApiError } from './types';

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: string) => void;
    reject: (reason: unknown) => void;
  }> = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 20000,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private processQueue(error: unknown, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else if (token) {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private async refreshAccessToken(): Promise<string> {
    try {
      const response = await this.axiosInstance.post<{
        accessToken: string;
        tokenType: string;
        expiresIn: number;
      }>('/auth/token/refresh');

      const { accessToken } = response.data;
      localStorage.setItem('accessToken', accessToken);
      return accessToken;
    } catch (error) {
      localStorage.removeItem('accessToken');
      throw error;
    }
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        const isRefreshEndpoint = config.url?.includes('/auth/token/refresh');

        if (token && !isRefreshEndpoint) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };
        const status = error.response?.status;
        const requestUrl = error.config?.url || '';
        const serverMessage = error.response?.data?.message;
        const message =
          typeof serverMessage === 'string'
            ? serverMessage
            : getStatusMessage(status);

        const isAuthEndpoint =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/register') ||
          requestUrl.includes('/auth/oauth') ||
          requestUrl.includes('/auth/verify-email') ||
          requestUrl.includes('/auth/resend-verification') ||
          requestUrl.includes('/auth/token/refresh');

        if (status === 401 && !isAuthEndpoint && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.axiosInstance(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            this.processQueue(null, newAccessToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            toast.error('Session expired. Please login again.');
            localStorage.removeItem('accessToken');

            window.location.href = '/auth';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

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

  public async tryRefreshToken(): Promise<void> {
    try {
      await this.refreshAccessToken();
      console.log('Access token refreshed proactively on app load');
    } catch (_error) {
      // If refresh fails, token is invalid - clear it
      console.log('Refresh token invalid or expired, clearing tokens');
      localStorage.removeItem('accessToken');
    }
  }
}

export const apiClient = new ApiClient();
export default ApiClient;
