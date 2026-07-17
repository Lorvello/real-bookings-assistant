export const ACCOUNT_OWNER_REQUIRED_CODE = "ACCOUNT_OWNER_REQUIRED";

export class AccountOwnerRequiredError extends Error {
  readonly code = ACCOUNT_OWNER_REQUIRED_CODE;
  readonly status = 403;

  constructor() {
    super("Only the account owner can manage billing or Stripe Connect");
    this.name = "AccountOwnerRequiredError";
  }
}

/**
 * Account owners are represented by a null account_owner_id. Any populated or
 * missing value is denied so privileged functions fail closed if profile data
 * is malformed or incomplete.
 */
export function requireAccountOwner(
  accountOwnerId: string | null | undefined,
  userId: string,
): string {
  if (accountOwnerId !== null) {
    throw new AccountOwnerRequiredError();
  }

  return userId;
}

export function isAccountOwnerRequiredError(
  error: unknown,
): error is AccountOwnerRequiredError {
  return error instanceof AccountOwnerRequiredError;
}
