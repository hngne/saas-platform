import { HttpException } from "./http.exceptions";

export class ForbiddenException extends HttpException {
  constructor(message: string = "Forbidden") {
    super(403, message);
  }
}
