export class ProviderError extends Error {
  public err_code: string;

  constructor(code: string, message?: string) {
    super(message || code);
    this.name = 'ProviderError';
    this.err_code = code;
  }
}
