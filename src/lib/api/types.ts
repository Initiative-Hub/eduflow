export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}

export interface PageResponse<T> {
  content: T[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  details?: Record<string, any>;
  status?: number;
}
