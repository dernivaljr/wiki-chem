export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details: { field: string; reason: string }[] = [],
  ) {
    super(message)
  }
}
