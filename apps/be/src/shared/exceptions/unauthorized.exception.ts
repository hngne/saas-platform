import { HttpException } from "./http.exceptions";

export class UnauthorizedException extends HttpException {
  constructor(message: string = "Unauthorized") {
    super(401, message);
  }
}
