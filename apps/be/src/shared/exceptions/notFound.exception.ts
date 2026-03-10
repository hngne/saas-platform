import { HttpException } from "./http.exceptions";

export class NotFoundException extends HttpException {
  constructor(message: "Not Found") {
    super(404, message);
  }
}
