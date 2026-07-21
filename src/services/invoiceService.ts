import { API, getAuthHeaders } from '../api/client';
import {
  InvoiceSecurityStatus,
  TaxInvoice,
  TaxInvoicePayload,
  TaxInvoiceSearchFilters,
  TaxInvoiceSearchResponse,
  TaxInvoiceSummary,
} from '../types/invoice';

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const data = await response.json();

      if (typeof data === 'string') return data;

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

export async function getRecentInvoices():
  Promise<TaxInvoiceSummary[]> {
  const response = await fetch(
    `${API.TAX_INVOICES}/recent`,
    { headers: getAuthHeaders() }
  );

  await ensureOk(
    response,
    'Failed to load recent Tax Invoices.'
  );

  return response.json();
}

export async function searchInvoices(
  filters: TaxInvoiceSearchFilters,
  page = 1,
  pageSize = 25
): Promise<TaxInvoiceSearchResponse> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim());
  });

  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  const response = await fetch(
    `${API.TAX_INVOICES}/search?${params.toString()}`,
    { headers: getAuthHeaders() }
  );

  await ensureOk(
    response,
    'Failed to search Tax Invoices.'
  );

  return response.json();
}

export async function getInvoice(
  id: string
): Promise<TaxInvoice> {
  const response = await fetch(
    `${API.TAX_INVOICES}/${encodeURIComponent(id)}`,
    { headers: getAuthHeaders() }
  );

  await ensureOk(
    response,
    'Failed to load the Tax Invoice.'
  );

  return response.json();
}

export async function createInvoice(
  payload: TaxInvoicePayload
): Promise<TaxInvoice> {
  const response = await fetch(API.TAX_INVOICES, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  await ensureOk(
    response,
    'Failed to save the Tax Invoice.'
  );

  return response.json();
}

export async function verifyInvoicePassword(
  password: string
): Promise<void> {
  const response = await fetch(
    `${API.TAX_INVOICES}/verify-password`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password }),
    }
  );

  await ensureOk(
    response,
    'Invalid invoice alteration password.'
  );
}

export async function updateInvoice(
  id: string,
  payload: TaxInvoicePayload,
  invoicePassword: string
): Promise<TaxInvoice> {
  const response = await fetch(
    `${API.TAX_INVOICES}/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...payload,
        invoicePassword,
      }),
    }
  );

  await ensureOk(
    response,
    'Failed to update the Tax Invoice.'
  );

  return response.json();
}

export async function deleteInvoice(
  id: string,
  password: string
): Promise<void> {
  const response = await fetch(
    `${API.TAX_INVOICES}/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password }),
    }
  );

  await ensureOk(
    response,
    'Failed to delete the Tax Invoice.'
  );
}

export async function getInvoiceSecurityStatus():
  Promise<InvoiceSecurityStatus> {
  const response = await fetch(
    `${API.INVOICE_SECURITY}/status`,
    { headers: getAuthHeaders() }
  );

  await ensureOk(
    response,
    'Failed to load invoice password status.'
  );

  return response.json();
}

export async function setInvoicePassword(
  password: string,
  confirmPassword: string
): Promise<InvoiceSecurityStatus & { message: string }> {
  const response = await fetch(
    `${API.INVOICE_SECURITY}/password`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        password,
        confirmPassword,
      }),
    }
  );

  await ensureOk(
    response,
    'Failed to save invoice alteration password.'
  );

  return response.json();
}