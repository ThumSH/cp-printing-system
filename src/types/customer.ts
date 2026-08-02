export interface CustomerPayload {
  customerName: string;
  customerCode: string;
  address: string;
  tinNumber: string;
  telephoneNumber: string;
  email: string;
}

export interface Customer extends CustomerPayload {
  id: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string | null;
}

export const createBlankCustomer =
  (): CustomerPayload => ({
    customerName: '',
    customerCode: '',
    address: '',
    tinNumber: '',
    telephoneNumber: '',
    email: '',
  });