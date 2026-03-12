import { HttpException } from "./http.exceptions";

export class BadRequestException extends HttpException {
  constructor(message: string = "Bad Request", errors?: any) {
    super(400, message, errors);
  }
}
