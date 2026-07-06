import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

/**
 * 成功返回响应格式
 * @param data 业务数据
 * @param message 提示语
 * @param status HTTP 状态码
 */
export function apiSuccess<T>(data: T, message = 'success', status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      code: 0,
      message,
      data,
    },
    { status }
  );
}

/**
 * 错误/失败响应格式
 * @param message 提示语
 * @param code 错误码（默认 500）
 * @param status HTTP 状态码（若不传，则根据 code 自动判断 HTTP status）
 */
export function apiError(message: string, code = 500, status?: number) {
  let httpStatus = status;
  if (!httpStatus) {
    if (code >= 400 && code <= 599) {
      httpStatus = code;
    } else {
      httpStatus = 500;
    }
  }

  return NextResponse.json<ApiResponse<null>>(
    {
      code,
      message,
      data: null,
    },
    { status: httpStatus }
  );
}
