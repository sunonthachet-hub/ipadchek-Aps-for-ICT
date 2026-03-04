import { SheetProduct, SheetTransaction, SheetMaintenance, SheetUser } from '../types';

// NOTE: ในการใช้งานจริง คุณต้องสร้าง Google Apps Script และ Deploy เป็น Web App 
// เพื่อให้สามารถ Read/Write ข้อมูลใน Google Sheets ได้อย่างปลอดภัย
const SCRIPT_URL = import.meta.env.VITE_API_URL || '';

export const googleSheetService = {
  async getAllData(): Promise<any> {
    if (!SCRIPT_URL) {
      console.warn('VITE_API_URL is not set. Using mock data.');
      return null;
    }
    const url = SCRIPT_URL.includes('?') ? `${SCRIPT_URL}&action=getAllData` : `${SCRIPT_URL}?action=getAllData`;
    try {
      console.log('Fetching all data from Google Sheets...');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
      const data = await response.json();
      console.log('Successfully fetched data from Google Sheets.');
      return data;
    } catch (error) {
      console.error('Error fetching all data from Google Sheets:', error);
      return null;
    }
  },

  async postAction(action: string, data: any): Promise<{ success: boolean; message?: string; data?: any }> {
    if (!SCRIPT_URL) return { success: false, message: 'API URL not configured' };
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action, data }),
      });
      const result = await response.json();
      return { 
        success: result.status === 'success', 
        message: result.message,
        data: result
      };
    } catch (error) {
      console.error(`Error posting ${action}:`, error);
      return { success: false, message: String(error) };
    }
  }
};
