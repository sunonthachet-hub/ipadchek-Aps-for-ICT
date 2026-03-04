/**
 * API Service for ICT Inventory System
 * Connects to Google Apps Script Web App
 */

import { SheetTransaction } from '../types';

const API_URL = (import.meta as any).env.VITE_API_URL;

export const apiService = {
  async getProducts() {
    if (!API_URL) return null;
    const response = await fetch(`${API_URL}?action=getProducts`);
    return response.json();
  },

  async getStats() {
    if (!API_URL) return null;
    const response = await fetch(`${API_URL}?action=getStats`);
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
