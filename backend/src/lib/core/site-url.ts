const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

/** True for an address that only works on the machine it is typed on. */
export function isLoopbackUrl(value: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * The website address a deployment will put in every email button. It must be
 * the real site: a localhost address deployed to production would send every
 * applicant a link that can never open for them.
 */
export function assertDeployableSiteUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`The website address "${value}" is not a valid URL. Export APP_BASE_URL as the real site, e.g. https://aws-ust.org.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`The website address "${value}" must start with https://.`);
  }
  if (isLoopbackUrl(value)) {
    throw new Error(
      `Refusing to deploy with the website address "${value}": every email link would point at localhost. Export APP_BASE_URL (or CORS_ORIGIN) as the real site, e.g. https://aws-ust.org, before deploying.`,
    );
  }
  return value;
}
