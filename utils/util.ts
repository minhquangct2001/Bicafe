import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import outputs from '../amplify_outputs.json';

export const { runWithAmplifyServerContext } = createServerRunner({
    config: outputs,
});

export async function getAuthenticatedUserServer() {
  try {
    const currentUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (context) => getCurrentUser(context)
    });
    return currentUser;
  } catch (error) {
    console.error('Error fetching authenticated user:', error);
    return null;
  }
}
