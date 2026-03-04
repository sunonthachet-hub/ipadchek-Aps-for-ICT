/**
 * API Service for ICT Inventory System
 * Connects to Google Apps Script Web App
 */

import { SheetTransaction } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export const apiService = {
  async getProducts() {
    if (!API_URL) {
      console.warn('VITE_API_URL is not set. Using mock data.');
      return null;
    }
    const url = API_URL.includes('?') ? `${API_URL}&action=getProducts` : `${API_URL}?action=getProducts`;
    const response = await fetch(url);
    return response.json();
  },

  async getStats() {
    if (!API_URL) return null;
    const url = API_URL.includes('?') ? `${API_URL}&action=getStats` : `${API_URL}?action=getStats`;
    const response = await fetch(url);
    return response.json();
  },

  async borrowProduct(transaction: SheetTransaction) {
    if (!API_URL) return null;
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'borrow',
        ...transaction
      })
    });
    return response.json();
  },

  async returnProduct(snDevice: string) {
    if (!API_URL) return null;
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'return',
        snDevice
      })
    });
    return response.json();
  },

  async reportIssue(productId: string, issue: string) {
    if (!API_URL) return null;
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'reportIssue',
        productId,
        issue
      })
    });
    return response.json();
  }
};
