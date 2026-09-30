export class MembershipPaymentError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 = 400,
  ) {
    super(message);
    this.name = "MembershipPaymentError";
  }
}
