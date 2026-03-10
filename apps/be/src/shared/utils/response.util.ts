export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export class APIResponse<T> {
  status: number;
  success: boolean;
  message: string;
  data?: T;
  errors?: any;

  constructor(
    status: number,
    success: boolean,
    message: string,
    data?: T,
    errors?: any,
  ) {
    this.status = status;
    this.success = success;
    this.message = message;
    this.data = data;
    this.errors = errors;
  }

  // ─── SUCCESS ───────────────────────────────────────────

  static OK<T>(message: string, data?: T): APIResponse<T> {
    return new APIResponse(HttpStatusCode.OK, true, message, data);
  }

  static Created<T>(message: string, data?: T): APIResponse<T> {
    return new APIResponse(HttpStatusCode.CREATED, true, message, data);
  }

  // ─── ERROR ─────────────────────────────────────────────

  static BadRequest<T>(message: string, errors?: any): APIResponse<T> {
    return new APIResponse(
      HttpStatusCode.BAD_REQUEST,
      false,
      message,
      undefined as unknown as T,
      errors,
    );
  }

  static Unauthorized<T>(message = "Unauthorized"): APIResponse<T> {
    return new APIResponse(HttpStatusCode.UNAUTHORIZED, false, message);
  }

  static Forbidden<T>(message = "Access Denied"): APIResponse<T> {
    return new APIResponse(HttpStatusCode.FORBIDDEN, false, message);
  }

  static NotFound<T>(message = "Resource Not Found"): APIResponse<T> {
    return new APIResponse(HttpStatusCode.NOT_FOUND, false, message);
  }

  static ServerError<T>(message = "Internal Server Error"): APIResponse<T> {
    return new APIResponse(
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      false,
      message,
    );
  }

  static Fail<T>(
    message: string,
    code = HttpStatusCode.INTERNAL_SERVER_ERROR,
  ): APIResponse<T> {
    return new APIResponse(code, false, message);
  }
}
