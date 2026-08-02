import {
  API,
  getAuthHeaders,
} from '../api/client';

import {
  Customer,
  CustomerPayload,
} from '../types/customer';

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const contentType =
    response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const data = await response.json();

      if (typeof data === 'string') {
        return data;
      }

      return (
        data.message ||
        data.error ||
        data.title ||
        fallback
      );
    }

    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function ensureOk(
  response: Response,
  fallback: string
): Promise<void> {
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, fallback)
    );
  }
}

export async function getCustomers():
  Promise<Customer[]> {
  const response = await fetch(API.CUSTOMERS, {
    headers: getAuthHeaders(),
  });

  await ensureOk(
    response,
    'Failed to load registered customers.'
  );

  return response.json();
}

export async function createCustomer(
  payload: CustomerPayload
): Promise<Customer> {
  const response = await fetch(API.CUSTOMERS, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  await ensureOk(
    response,
    'Failed to register the customer.'
  );

  return response.json();
}