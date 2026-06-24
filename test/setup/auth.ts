import {
  AdminInitiateAuthCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

export async function getTestUserToken(): Promise<string> {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const username = process.env.COGNITO_TEST_USERNAME;
  const password = process.env.COGNITO_TEST_PASSWORD;

  const hasAwsCreds =
    Boolean(process.env.AWS_ACCESS_KEY_ID) &&
    Boolean(process.env.AWS_SECRET_ACCESS_KEY);

  if (!hasAwsCreds) {
    throw new Error(
      'AWS credentials (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) ' +
        'are missing from your environment. Ensure your local .env file is loaded properly.',
    );
  }

  if (!userPoolId || !clientId || !username || !password) {
    throw new Error(
      'COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_TEST_USERNAME, ' +
        'and COGNITO_TEST_PASSWORD must be set for integration tests to authenticate.',
    );
  }

  try {
    const result = await cognitoClient.send(
      new AdminInitiateAuthCommand({
        UserPoolId: userPoolId,
        ClientId: clientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: { USERNAME: username, PASSWORD: password },
      }),
    );

    const idToken = result.AuthenticationResult?.IdToken;
    if (!idToken) {
      throw new Error('Cognito did not return an IdToken');
    }

    return idToken;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'UnrecognizedClientException'
    ) {
      throw new Error(
        'AWS Authentication Failed: The security token included in the request is invalid. ' +
          'Your local session tokens might be expired. Try running `aws sso login` or refreshing your credentials.',
        { cause: error },
      );
    }
    throw error;
  }
}
