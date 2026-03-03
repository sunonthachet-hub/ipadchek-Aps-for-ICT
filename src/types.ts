export enum UserRole {
  Admin = 'Admin',
  Staff = 'Staff',
  Teacher = 'Teacher',
  Student = 'Student'
}

export interface SheetUser {
  id: string;      // Internal ID
  loginId: string; // studentId or teacherId
  password?: string;
  role: UserRole;
}

export interface SheetStudent {
  studentId: string;
  fullName: string;
  grade: string;
  classroom: string;
  email: string;
  notes: string;
}

export interface SheetTeacher {
  teacherId: string;
  fullName: string;
  department: string;
  email?: string;
}

export interface SheetCategory {
  categoryId: string;
  name: string;
  description: string;
  designatedFor: 'Student' | 'Teacher' | 'Staff' | 'All';
  imageUrl: string;
}

export interface SheetProduct {
  productId: string;
  categoryId: string; // Foreign Key to SheetCategory
  status: 'Available' | 'Borrowed' | 'Maintenance' | 'Lost';
  isFeatured: boolean;
  notes?: string;
}

export interface SheetTransaction {
  id: string;
  productId: string;
  borrowerId: string; // studentId or teacherId
  borrowerType: 'Student' | 'Teacher';
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'Active' | 'Returned' | 'Overdue';
}

export interface SheetMaintenance {
  id: string;
  productId: string;
  issue: string;
  reportDate: string;
  status: 'Pending' | 'Repairing' | 'Fixed' | 'Scrapped';
}
