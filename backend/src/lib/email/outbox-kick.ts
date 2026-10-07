import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

let client: LambdaClient | null = null;

/**
 * Starts the email outbox worker Lambda in the background. Only used in
 * production (EMAIL_OUTBOX_FUNCTION_NAME is set by the CDK stack); locally the
 * dev server polls the outbox instead. Never throws: the emails are already
 * queued, and the HR status panel starts the worker again if needed.
 */
export async function kickEmailOutbox(
  functionName = process.env.EMAIL_OUTBOX_FUNCTION_NAME,
): Promise<void> {
  if (!functionName) return;
  client ??= new LambdaClient({});
  try {
    await client.send(new InvokeCommand({ FunctionName: functionName, InvocationType: "Event" }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email-outbox] could not start the worker: ${message}`);
  }
}
