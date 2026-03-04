/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Home, 
  Tablet, 
  FileText, 
  Phone, 
  AlertTriangle,
  Search, 
  Plus, 
  CheckCircle2,
  Clock,
  AlertCircle,
  User as UserIcon,
  Bell,
  Users as UsersIcon,
  ArrowRightLeft,
  ChevronRight,
  MoreVertical,
  Menu,
  X,
  Settings,
  LogOut,
  Printer,
  UploadCloud,
  ScanLine,
  Edit3,
  Trash2,
  Database,
  Camera,
  History,
  UserPlus,
  Mail,
  Download,
  QrCode,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  UserRole, 
  type SheetProduct, 
  type SheetUser, 
  type SheetTransaction, 
  type SheetMaintenance, 
  type SheetCategory,
  type SheetStudent,
  type SheetTeacher
} from './types';
import { APP_CONSTANTS } from './constants';
import { googleSheetService } from './services/googleSheetService';

// Current Auth User (Placeholder until login is implemented)
const currentUser: SheetUser = {
  id: 'U001',
  loginId: '65001',
  password: 'password123',
  role: UserRole.Admin
};

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedRoom, setSelectedRoom] = useState<string>('All');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'JSON' | 'CSV' | 'GoogleSheet'>('JSON');
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [selectedProductForBorrow, setSelectedProductForBorrow] = useState<SheetProduct | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [checkSerialQuery, setCheckSerialQuery] = useState('');
  const [selectedProductForCheck, setSelectedProductForCheck] = useState<SheetProduct | null>(null);

  // Real Data State
  const [products, setProducts] = useState<SheetProduct[]>([]);
  const [categories, setCategories] = useState<SheetCategory[]>([]);
  const [students, setStudents] = useState<SheetStudent[]>([]);
  const [teachers, setTeachers] = useState<SheetTeacher[]>([]);
  const [repairs, setRepairs] = useState<SheetMaintenance[]>([]);
  const [transactions, setTransactions] = useState<SheetTransaction[]>([]);
  const [users, setUsers] = useState<SheetUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auth State
  const [currentUser, setCurrentUser] = useState<SheetUser | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Repair Form State
  const [repairForm, setRepairForm] = useState({
    productId: '',
    issueType: 'screen',
    description: '',
    reporterEmail: '',
    repairNumber: `REP-${Date.now().toString().slice(-6)}`
  });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [repairSlipRef] = useState<React.RefObject<HTMLDivElement>>(React.createRef());

  // Fetch Data on Mount
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const data = await googleSheetService.getAllData();
        if (data) {
          setProducts(data.Products || []);
          setCategories(data.Categories || []);
          setStudents(data.Students || []);
          setTeachers(data.Teachers || []);
          setRepairs(data.Maintenance || []);
          setTransactions(data.Transactions || []);
          setUsers(data.Users || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Handle Borrowing
  const handleBorrow = (product: SheetProduct, fid: string, fname: string) => {
    if (!currentUser) return;

    const now = new Date();
    const borrowDate = now.toLocaleDateString('th-TH');
    const borrowTime = now.toLocaleTimeString('th-TH');
    
    // Calculate due date: Teacher 5 years, Student 3 years
    const dueDateObj = new Date(now);
    if (currentUser.role === UserRole.Teacher) {
      dueDateObj.setFullYear(dueDateObj.getFullYear() + 5);
    } else {
      dueDateObj.setFullYear(dueDateObj.getFullYear() + 3);
    }
    const dueDate = dueDateObj.toLocaleDateString('th-TH');

    const newTransaction: SheetTransaction = {
      borrowerId: `TX-${Date.now()}`,
      fid: fid,
      fname: fname,
      snDevice: product.productId, // Assuming productId is the S/N for now
      borrowDate,
      borrowTime,
      dueDate,
      recorder: currentUser.loginId,
      status: 'Active'
    };

    setTransactions([...transactions, newTransaction]);
    
    // Update product status
    setProducts(products.map(p => 
      p.productId === product.productId ? { ...p, status: 'Borrowed' } : p
    ));

    setIsBorrowModalOpen(false);
    setSelectedProductForBorrow(null);
  };

  // Handle Import
  const handleImportData = (data: any[], type: 'JSON' | 'CSV') => {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const newTransactions: SheetTransaction[] = [];

    data.forEach((row, index) => {
      try {
        // Basic validation
        if (!row.fid || !row.snDevice) {
          throw new Error(`Row ${index + 1}: Missing fid or snDevice`);
        }

        const now = new Date();
        const borrowDate = row.borrowDate || now.toLocaleDateString('th-TH');
        const borrowTime = row.borrowTime || now.toLocaleTimeString('th-TH');
        
        // Auto calculate due date if not provided
        let dueDate = row.dueDate;
        if (!dueDate) {
          const dueDateObj = new Date(now);
          // Default to 3 years if unknown, or check if fid belongs to teacher
          const isTeacher = teachers.some(t => t.teacherId === row.fid);
          dueDateObj.setFullYear(dueDateObj.getFullYear() + (isTeacher ? 5 : 3));
          dueDate = dueDateObj.toLocaleDateString('th-TH');
        }

        newTransactions.push({
          borrowerId: row.borrowerId || `TX-IMP-${Date.now()}-${index}`,
          fid: row.fid,
          fname: row.fname || 'Unknown',
          snDevice: row.snDevice,
          borrowDate,
          borrowTime,
          dueDate,
          recorder: row.recorder || currentUser?.loginId || 'System',
          status: row.status || 'Active'
        });
        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(err.message);
      }
    });

    setTransactions([...transactions, ...newTransactions]);
    setImportResults({ success: successCount, failed: failedCount, errors });
  };

  // Get students who haven't borrowed
  const getStudentsNotBorrowed = () => {
    const activeBorrowerIds = new Set(
      transactions
        .filter(t => t.status === 'Active')
        .map(t => t.fid)
    );
    return students.filter(s => !activeBorrowerIds.has(s.studentId));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (users.length === 0) {
      setLoginError('กำลังโหลดข้อมูลผู้ใช้... กรุณารอสักครู่แล้วลองใหม่');
      return;
    }

    // ปรับปรุงการตรวจสอบให้ยืดหยุ่นขึ้น (รองรับทั้ง string/number และตัดช่องว่าง)
    const user = users.find(u => 
      String(u.loginId).trim() === loginId.trim() && 
      String(u.password).trim() === password.trim()
    );

    if (user) {
      setCurrentUser(user);
      setIsLoginModalOpen(false);
      setLoginId('');
      setPassword('');
      if (user.role === UserRole.Admin) {
        setIsAdminMode(true);
      }
    } else {
      setLoginError('รหัสประจำตัวหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdminMode(false);
    setActiveTab('home');
  };

  const menuItems = [
    { id: 'home', label: 'หน้าแรก', icon: Home },
    { id: 'report', label: 'แจ้งปัญหา', icon: AlertTriangle },
    { id: 'products', label: 'รายการสินค้า', icon: Tablet },
    { id: 'rules', label: 'ระเบียบการยืม', icon: FileText },
    { id: 'contact', label: 'ติดต่อสอบถาม', icon: Phone },
  ];

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'all-items', label: 'รายการทั้งหมด', icon: Tablet },
    { id: 'check-status', label: 'ตรวจสอบสถานะ', icon: CheckCircle2 },
    { id: 'not-borrowed', label: 'นักเรียนที่ยังไม่ยืม', icon: UsersIcon },
    { id: 'manage-personnel', label: 'จัดการบุคลากร', icon: UsersIcon },
    { id: 'repairs', label: 'แจ้งซ่อม', icon: AlertTriangle },
  ];

  const grades = ['ม.4', 'ม.5', 'ม.6'];
  const rooms = Array.from({ length: 15 }, (_, i) => `${i + 1}`);

  const stats = useMemo(() => {
    const total = products.length;
    const available = products.filter(p => p.status === 'Available').length;
    const borrowed = products.filter(p => p.status === 'Borrowed').length;
    const maintenance = products.filter(p => p.status === 'Maintenance').length;
    
    return { total, available, borrowed, maintenance };
  }, [products]);

  const chartData = [
    { name: 'พร้อมใช้งาน', value: stats.available },
    { name: 'ถูกยืม', value: stats.borrowed },
    { name: 'ส่งซ่อม', value: stats.maintenance },
  ];

  const filteredProducts = products.map(p => {
    const category = categories.find(c => c.categoryId === p.categoryId);
    return { ...p, categoryDetails: category };
  }).filter(product => {
    const matchesSearch = product.categoryDetails?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         product.productId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'All' || product.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const renderDashboard = () => (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#004aa1] to-[#022d5f] rounded-[3rem] p-12 text-white shadow-2xl shadow-blue-900/20">
        <div className="relative z-10 max-w-2xl">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-black mb-6 leading-tight"
          >
            ยินดีต้อนรับสู่ <br />
            <span className="text-white">IPAD CHECK SYSTEM</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-blue-50 text-lg mb-8 leading-relaxed font-medium"
          >
            ระบบบริหารจัดการและให้บริการยืม-คืนเครื่อง iPad สำหรับนักเรียนและบุคลากร 
            โรงเรียนสารคามพิทยาคม มุ่งเน้นความสะดวก รวดเร็ว และโปร่งใส
          </motion.p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setActiveTab('products')}
              className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl shadow-blue-900/10 active:scale-95"
            >
              ดูรายการอุปกรณ์
            </button>
            <button 
              onClick={() => setActiveTab('rules')}
              className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95"
            >
              ระเบียบการยืม
            </button>
          </div>
        </div>
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-y-1/2 translate-x-1/4 blur-3xl"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'อุปกรณ์ทั้งหมด', value: stats.total, icon: Tablet, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'พร้อมใช้งาน', value: stats.available, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'กำลังถูกยืม', value: stats.borrowed, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'ส่งซ่อม/ชำรุด', value: stats.maintenance, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl`}>
                <stat.icon size={28} />
              </div>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Realtime</span>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold mb-1 uppercase tracking-tight">{stat.label}</p>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">ภาพรวมสถานะอุปกรณ์</h3>
              <p className="text-slate-400 text-sm font-medium">สรุปข้อมูลการใช้งานเครื่อง iPad ทั้งหมดในระบบ</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-12">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {chartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50 hover:bg-blue-50 transition-all group cursor-default">
                  <div className="flex items-center space-x-4">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-base font-bold text-slate-600 group-hover:text-blue-600 transition-colors">{entry.name}</span>
                  </div>
                  <span className="text-lg font-black text-slate-900">{entry.value} เครื่อง</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">กิจกรรมล่าสุด</h3>
          </div>
          <div className="space-y-8">
            {transactions
              .slice()
              .reverse()
              .slice(0, 5)
              .map((t, i) => (
                <div key={i} className="flex items-start space-x-5 group">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shrink-0 shadow-lg transition-transform group-hover:scale-110 ${
                    t.status === 'Active' ? 'bg-blue-500 shadow-blue-500/20' : 'bg-emerald-500 shadow-emerald-500/20'
                  }`}>
                    {t.fname[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-slate-900 truncate">{t.fname}</p>
                    <p className="text-sm text-slate-500 mb-1">{t.status === 'Active' ? 'ยืม' : 'คืน'} {t.snDevice}</p>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{t.borrowDate}</span>
                  </div>
                </div>
              ))}
            {transactions.length === 0 && (
              <p className="text-slate-400 text-center py-10 italic">ไม่มีกิจกรรมล่าสุด</p>
            )}
          </div>
          <button className="w-full mt-12 py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all active:scale-95">
            ดูประวัติทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );

  const renderRules = () => (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-800 tracking-tight">ระเบียบการยืมใช้งาน</h2>
        <p className="text-slate-500 text-lg">ข้อกำหนดและเงื่อนไขในการใช้บริการยืม-คืนเครื่อง iPad</p>
      </div>
      
      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 space-y-8">
        {[
          { title: '1. คุณสมบัติผู้ยืม', content: 'ต้องเป็นนักเรียนหรือบุคลากรของโรงเรียนสารคามพิทยาคมที่มีสถานะปกติ' },
          { title: '2. ระยะเวลาการยืม', content: 'สามารถยืมได้สูงสุด 7 วันทำการต่อครั้ง หากต้องการต่ออายุต้องนำเครื่องมาตรวจสอบ' },
          { title: '3. การดูแลรักษา', content: 'ผู้ยืมต้องดูแลรักษาเครื่องให้อยู่ในสภาพดี ห้ามแกะสติกเกอร์หรือดัดแปลงซอฟต์แวร์' },
          { title: '4. กรณีชำรุดหรือสูญหาย', content: 'ผู้ยืมต้องรับผิดชอบค่าใช้จ่ายในการซ่อมแซมหรือชดใช้ตามมูลค่าปัจจุบันของอุปกรณ์' },
          { title: '5. การส่งคืน', content: 'ต้องส่งคืนเครื่องพร้อมอุปกรณ์เสริมครบชุดตามกำหนดเวลา ณ ศูนย์ ICT' },
        ].map((rule, i) => (
          <div key={i} className="flex items-start space-x-6 p-6 rounded-3xl hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-black shrink-0">
              {i + 1}
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">{rule.title}</h4>
              <p className="text-slate-500 leading-relaxed">{rule.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-600 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2">
          <h4 className="text-2xl font-black">เข้าใจระเบียบแล้ว?</h4>
          <p className="text-blue-100">คุณสามารถเริ่มทำรายการยืมได้ทันทีผ่านระบบออนไลน์</p>
        </div>
        <button 
          onClick={() => setActiveTab('products')}
          className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl shadow-blue-900/10 active:scale-95"
        >
          ไปที่รายการสินค้า
        </button>
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-800 tracking-tight">ติดต่อสอบถาม</h2>
        <p className="text-slate-500 text-lg">ช่องทางการติดต่อสื่อสารกับศูนย์ ICT โรงเรียนสารคามพิทยาคม</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Phone, label: 'เบอร์โทรศัพท์', value: '043-711-xxx', sub: 'ในวันและเวลาราชการ', color: 'bg-blue-500' },
          { icon: UsersIcon, label: 'Facebook Page', value: 'ICT SPK Center', sub: 'ตอบกลับภายใน 24 ชม.', color: 'bg-indigo-500' },
          { icon: Home, label: 'สถานที่ติดต่อ', value: 'อาคาร ICT ชั้น 2', sub: 'ห้องปฏิบัติการคอมพิวเตอร์', color: 'bg-emerald-500' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 text-center space-y-6 hover:shadow-xl transition-all duration-500">
            <div className={`w-20 h-20 ${item.color} rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-lg`}>
              <item.icon size={36} />
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">{item.label}</p>
              <h4 className="text-xl font-black text-slate-800 mb-1">{item.value}</h4>
              <p className="text-slate-500 text-sm">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100">
        <h3 className="text-2xl font-black text-slate-800 mb-8">ส่งข้อความถึงเรา</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 ml-2">ชื่อ-นามสกุล</label>
            <input type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="กรอกชื่อของคุณ" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 ml-2">อีเมล</label>
            <input type="email" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="example@spk.ac.th" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-slate-600 ml-2">ข้อความ</label>
            <textarea rows={4} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="พิมพ์ข้อความที่ต้องการสอบถาม..."></textarea>
          </div>
          <div className="md:col-span-2">
            <button type="button" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95">
              ส่งข้อความ
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderReportIssue = () => (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-800 tracking-tight">แจ้งปัญหาการใช้งาน</h2>
        <p className="text-slate-500 text-lg">พบปัญหาเกี่ยวกับตัวเครื่อง iPad หรือซอฟต์แวร์? แจ้งเราได้ที่นี่</p>
      </div>

      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 space-y-10">
        <div className="flex items-center space-x-6 p-8 bg-rose-50 rounded-[2.5rem] border border-rose-100">
          <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20 shrink-0">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h4 className="text-xl font-black text-rose-900 mb-1">แจ้งซ่อมด่วน</h4>
            <p className="text-rose-700/70">หากอุปกรณ์เกิดความเสียหายรุนแรง กรุณานำเครื่องมาที่ศูนย์ ICT ทันที</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-600 ml-2">เลือกอุปกรณ์ที่มีปัญหา</label>
              <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer">
                <option>iPad Gen 9 (P001)</option>
                <option>iPad Gen 10 (P002)</option>
                <option>อื่นๆ</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-600 ml-2">ประเภทปัญหา</label>
              <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer">
                <option>หน้าจอแตก/เสียหาย</option>
                <option>แบตเตอรี่เสื่อม/ชาร์จไม่เข้า</option>
                <option>ปัญหาซอฟต์แวร์/แอปพลิเคชัน</option>
                <option>อุปกรณ์เสริมสูญหาย/ชำรุด</option>
                <option>อื่นๆ</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 ml-2">รายละเอียดปัญหา</label>
            <textarea rows={5} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="อธิบายอาการเสียหรือปัญหาที่พบอย่างละเอียด..."></textarea>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 ml-2">แนบรูปภาพประกอบ (ถ้ามี)</label>
            <div className="w-full h-40 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group">
              <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">คลิกเพื่ออัปโหลดรูปภาพ</span>
            </div>
          </div>
          <button className="w-full py-5 bg-white text-blue-900 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl shadow-blue-900/10 active:scale-95">
            ส่งรายงานปัญหา
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdminCheckStatus = () => {
    const handleSearch = () => {
      const product = products.find(p => p.productId.toLowerCase() === checkSerialQuery.toLowerCase());
      if (product) {
        const category = categories.find(c => c.categoryId === product.categoryId);
        setSelectedProductForCheck({ ...product, categoryDetails: category });
      } else {
        setSelectedProductForCheck(null);
      }
    };

    return (
      <div className="space-y-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <h3 className="text-2xl font-black text-slate-800 mb-8 tracking-tight">ตรวจสอบสถานะอุปกรณ์</h3>
          
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="ค้นหาด้วยรหัสสินค้า หรือ Serial Number..." 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                value={checkSerialQuery}
                onChange={(e) => setCheckSerialQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button 
              onClick={handleSearch}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center space-x-2"
            >
              <Search size={20} />
              <span>ตรวจสอบ</span>
            </button>
            <button 
              onClick={() => setIsScanning(!isScanning)}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95 flex items-center justify-center space-x-2"
            >
              <ScanLine size={20} />
              <span>สแกนบาร์โค้ด</span>
            </button>
          </div>

          {isScanning && (
            <div className="mb-8 p-8 bg-slate-900 rounded-[2.5rem] relative overflow-hidden">
              <div className="aspect-video bg-slate-800 rounded-2xl flex items-center justify-center text-white border-2 border-dashed border-slate-700">
                <div className="text-center space-y-4">
                  <Camera size={48} className="mx-auto text-slate-500" />
                  <p className="font-bold text-slate-400">กำลังเปิดกล้องเพื่อสแกน...</p>
                  <button 
                    onClick={() => setIsScanning(false)}
                    className="px-6 py-2 bg-rose-500 text-white rounded-xl text-sm font-bold"
                  >
                    ปิดกล้อง
                  </button>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {selectedProductForCheck ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100"
              >
                <div className="aspect-square rounded-3xl overflow-hidden bg-white shadow-sm">
                  <img src={selectedProductForCheck.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-100 px-3 py-1 rounded-full mb-2 inline-block">
                        {selectedProductForCheck.category}
                      </span>
                      <h4 className="text-3xl font-black text-slate-900">{selectedProductForCheck.name}</h4>
                      <p className="text-slate-500 font-mono text-sm mt-1">ID: {selectedProductForCheck.id}</p>
                    </div>
                    {(() => {
                      const s = selectedProductForCheck.status?.toLowerCase() || '';
                      const isAvailable = s === 'available' || s === 'พร้อมใช้งาน';
                      const isBorrowed = s === 'borrowed' || s === 'borrow' || s === 'ถูกยืม';
                      
                      return (
                        <span className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
                          isAvailable ? 'bg-emerald-500 text-white' :
                          isBorrowed ? 'bg-blue-500 text-white' :
                          'bg-rose-500 text-white'
                        }`}>
                          {isAvailable ? 'พร้อมใช้งาน' : isBorrowed ? 'ถูกยืม' : 'ส่งซ่อม'}
                        </span>
                      );
                    })()}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">อุปกรณ์เสริม</p>
                      <p className="text-sm font-bold text-slate-700">{selectedProductForCheck.defaultAccessories}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">กลุ่มเป้าหมาย</p>
                      <p className="text-sm font-bold text-slate-700">{selectedProductForCheck.designatedFor}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                    <h5 className="text-sm font-black text-slate-800 mb-4 flex items-center space-x-2">
                      <History size={16} />
                      <span>ประวัติการใช้งานล่าสุด</span>
                    </h5>
                    <div className="space-y-4">
                      {transactions
                        .filter(t => t.snDevice === selectedProductForCheck.productId)
                        .slice(0, 3)
                        .map((t, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">{t.status === 'Active' ? 'ยืมโดย' : 'คืนโดย'}: {t.fname}</span>
                            <span className="text-slate-400">{t.borrowDate}</span>
                          </div>
                        ))
                      }
                      {transactions.filter(t => t.snDevice === selectedProductForCheck.productId).length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4 italic">ไม่มีประวัติการใช้งาน</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : checkSerialQuery && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200"
              >
                <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold">ไม่พบข้อมูลอุปกรณ์รหัส "{checkSerialQuery}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const renderNotBorrowedStudents = () => {
    const notBorrowed = getStudentsNotBorrowed();
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">นักเรียนที่ยังไม่ยืมอุปกรณ์</h2>
            <p className="text-slate-500">รายชื่อนักเรียนที่ยังไม่มีรายการยืม iPad ในระบบ</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">จำนวนทั้งหมด</p>
            <p className="text-xl font-black text-blue-600">{notBorrowed.length} คน</p>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">รหัสนักเรียน</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">ชื่อ-นามสกุล</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">ระดับชั้น</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">ห้อง</th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {notBorrowed.map((student) => (
                  <tr key={student.studentId} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-sm font-mono font-bold text-slate-400">{student.studentId}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-800">{student.fullName}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">
                        {student.grade}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-slate-600">{student.classroom}</span>
                    </td>
                    <td className="px-8 py-6">
                      <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all active:scale-95">
                        ส่งคำเชิญ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminManagePersonnel = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">จัดการบุคลากร</h2>
          <p className="text-slate-500">จัดการข้อมูลนักเรียนและบุคลากรในระบบ</p>
        </div>
        <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center space-x-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95">
          <UserPlus size={20} />
          <span>เพิ่มบุคคลากร</span>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="ค้นหาชื่อ หรือ อีเมล..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">ชื่อ-นามสกุล</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">อีเมล</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">บทบาท</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((student) => (
                <tr key={student.studentId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                        {student.fullName[0]}
                      </div>
                      <span className="font-bold text-slate-800">{student.fullName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-slate-500 text-sm">{student.email}</td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                      นักเรียน
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        className="p-2 transition-colors text-slate-400 hover:text-blue-600"
                        title="แก้ไขข้อมูลนักเรียน"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const handleGenerateRepairPDF = async () => {
    if (!repairSlipRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(repairSlipRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`repair-slip-${repairForm.repairNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendRepairEmail = () => {
    const subject = encodeURIComponent(`แจ้งซ่อมอุปกรณ์: ${repairForm.repairNumber}`);
    const body = encodeURIComponent(`
หมายเลขแจ้งซ่อม: ${repairForm.repairNumber}
รหัสอุปกรณ์: ${repairForm.productId}
ประเภทปัญหา: ${repairForm.issueType}
รายละเอียด: ${repairForm.description}

กรุณาตรวจสอบใบแจ้งซ่อมที่แนบมาพร้อมกันนี้ (หากดาวน์โหลด PDF แล้ว)
    `);
    window.location.href = `mailto:${repairForm.reporterEmail}?subject=${subject}&body=${body}`;
  };

  const renderAdminRepairs = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">แจ้งซ่อมอุปกรณ์</h2>
          <p className="text-slate-500">สร้างใบแจ้งซ่อมและส่งข้อมูลทางอีเมล</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Repair Form */}
        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center space-x-3">
              <AlertTriangle className="text-yellow-500" />
              <span>ข้อมูลการแจ้งซ่อม</span>
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">เลือกอุปกรณ์</label>
                  <select 
                    value={repairForm.productId}
                    onChange={(e) => setRepairForm({...repairForm, productId: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer font-bold"
                  >
                    <option value="">-- เลือกอุปกรณ์ --</option>
                    {products.map(p => (
                      <option key={p.productId} value={p.productId}>{p.productId} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">ประเภทปัญหา</label>
                  <select 
                    value={repairForm.issueType}
                    onChange={(e) => setRepairForm({...repairForm, issueType: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer font-bold"
                  >
                    <option value="screen">หน้าจอแตก/เสียหาย</option>
                    <option value="battery">แบตเตอรี่/การชาร์จ</option>
                    <option value="software">ซอฟต์แวร์/ระบบ</option>
                    <option value="hardware">ฮาร์ดแวร์อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">อีเมลผู้แจ้ง/ผู้รับผิดชอบ</label>
                <input 
                  type="email"
                  value={repairForm.reporterEmail}
                  onChange={(e) => setRepairForm({...repairForm, reporterEmail: e.target.value})}
                  placeholder="example@email.com"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">รายละเอียดเพิ่มเติม</label>
                <textarea 
                  value={repairForm.description}
                  onChange={(e) => setRepairForm({...repairForm, description: e.target.value})}
                  rows={4}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold resize-none"
                  placeholder="ระบุรายละเอียดของปัญหา..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={handleGenerateRepairPDF}
                  disabled={!repairForm.productId || isGeneratingPDF}
                  className="flex items-center justify-center space-x-2 py-4 bg-yellow-400 text-blue-900 rounded-2xl font-black hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={20} />
                  <span>{isGeneratingPDF ? 'กำลังสร้าง...' : 'บันทึก PDF'}</span>
                </button>
                <button 
                  onClick={handleSendRepairEmail}
                  disabled={!repairForm.productId || !repairForm.reporterEmail}
                  className="flex items-center justify-center space-x-2 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail size={20} />
                  <span>ส่งอีเมล</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Preview Slip */}
        <div className="space-y-6">
          <div className="bg-slate-100 p-8 rounded-[3rem] border-2 border-dashed border-slate-200 flex items-center justify-center min-h-[500px]">
            <div 
              ref={repairSlipRef}
              className="bg-white w-full max-w-[350px] p-8 shadow-2xl rounded-2xl space-y-8 text-slate-800"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-blue-900 mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h4 className="text-xl font-black uppercase tracking-tight">ใบแจ้งซ่อมอุปกรณ์</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Repair Notification Slip</p>
              </div>

              <div className="space-y-4 border-y border-slate-100 py-6">
                <div className="flex justify-between text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">หมายเลขแจ้งซ่อม</span>
                  <span className="font-bold text-blue-600">{repairForm.repairNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">รหัสอุปกรณ์</span>
                  <span className="font-bold">{repairForm.productId || '-'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">ประเภทปัญหา</span>
                  <span className="font-bold uppercase">{repairForm.issueType}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest">วันที่แจ้ง</span>
                  <span className="font-bold">{new Date().toLocaleDateString('th-TH')}</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center space-y-4 pt-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <QRCodeCanvas 
                    value={repairForm.repairNumber} 
                    size={120}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scan to track status</p>
              </div>

              <div className="text-center pt-4">
                <p className="text-[9px] text-slate-300 font-medium">ระบบบริหารจัดการอุปกรณ์ ICT โรงเรียน</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminAllItems = () => (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex-1 space-y-4">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">รายการอุปกรณ์ทั้งหมด</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ, ชั้นเรียน, ปีการศึกษา..." 
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-500/10 shadow-sm cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">ทุกสถานะ</option>
              <option value="Available">พร้อมใช้งาน</option>
              <option value="Borrowed">ถูกยืม</option>
              <option value="Maintenance">ส่งซ่อม</option>
            </select>
            <div className="flex space-x-2">
              <select 
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-500/10 shadow-sm cursor-pointer"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <option value="All">ทุกชั้นเรียน</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {selectedGrade !== 'All' && (
                <select 
                  className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-500/10 shadow-sm cursor-pointer"
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <option value="All">ทุกห้อง</option>
                  {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm" 
            title="ตั้งค่าระบบ"
          >
            <Settings size={20} />
          </button>
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm" title="จัดการอุปกรณ์">
            <ArrowRightLeft size={20} />
          </button>
          <button 
            onClick={() => {
              setIsImportModalOpen(true);
              setImportResults(null);
            }}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm" 
            title="นำเข้าข้อมูล (JSON/CSV)"
          >
            <UploadCloud size={20} />
          </button>
          <button 
            onClick={() => setIsPrintPreviewOpen(true)}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm" 
            title="พิมพ์เอกสาร"
          >
            <Printer size={20} />
          </button>
          <button 
            onClick={() => setIsAddProductModalOpen(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center space-x-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
          >
            <Plus size={20} />
            <span>เพิ่มสินค้าใหม่</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-bottom border-slate-100">
                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">สินค้า</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">หมวดหมู่</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">ผู้ยืมปัจจุบัน</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400">สถานะ</th>
                <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((product) => (
                <tr key={product.productId} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                        <img src={product.categoryDetails?.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{product.categoryDetails?.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{product.productId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                      {product.categoryDetails?.name}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {(() => {
                      const s = product.status?.toLowerCase() || '';
                      const isBorrowed = s === 'borrowed' || s === 'borrow' || s === 'ถูกยืม';
                      
                      if (isBorrowed) {
                        const activeTx = transactions.find(t => t.productId === product.productId && t.status === 'Active');
                        if (!activeTx) return <span className="text-sm text-slate-300">-</span>;
                        
                        const borrower = activeTx.borrowerType === 'Student' 
                          ? students.find(s => s.studentId === activeTx.borrowerId)
                          : teachers.find(t => t.teacherId === activeTx.borrowerId);
                          
                        return (
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                              {borrower?.fullName?.[0] || '?'}
                            </div>
                            <span className="text-sm font-medium text-slate-600">
                              {borrower?.fullName || 'Unknown'} 
                              {activeTx.borrowerType === 'Student' && (borrower as SheetStudent)?.grade ? ` (${(borrower as SheetStudent).grade}/${(borrower as SheetStudent).classroom})` : ''}
                            </span>
                          </div>
                        );
                      }
                      return <span className="text-sm text-slate-300">-</span>;
                    })()}
                  </td>
                  <td className="px-8 py-6">
                    {(() => {
                      const s = product.status?.toLowerCase() || '';
                      const isAvailable = s === 'available' || s === 'พร้อมใช้งาน';
                      const isBorrowed = s === 'borrowed' || s === 'borrow' || s === 'ถูกยืม';
                      
                      return (
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isAvailable ? 'bg-emerald-100 text-emerald-600' :
                          isBorrowed ? 'bg-blue-100 text-blue-600' :
                          'bg-rose-100 text-rose-600'
                        }`}>
                          {isAvailable ? 'พร้อมใช้งาน' : isBorrowed ? 'ถูกยืม' : 'ส่งซ่อม'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                      <MoreVertical size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddProductModalOpen && renderAddProductForm()}
      {isSettingsModalOpen && renderSettingsModal()}
      {isPrintPreviewOpen && renderPrintPreview()}
      {isLoginModalOpen && renderLoginModal()}
    </div>
  );

  function renderLoginModal() {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsLoginModalOpen(false)}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          <div className="p-10">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-600/20">
                <UserIcon size={40} />
              </div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">เข้าสู่ระบบ</h3>
              <p className="text-slate-400 text-sm mt-2 font-medium">สำหรับเจ้าหน้าที่และผู้ดูแลระบบ</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">รหัสประจำตัว</label>
                <input 
                  type="text" 
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold" 
                  placeholder="กรอกรหัสประจำตัว" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">รหัสผ่าน</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold" 
                  placeholder="กรอกรหัสผ่าน" 
                />
              </div>

              {loginError && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold flex items-center space-x-2 border border-rose-100">
                  <AlertCircle size={18} />
                  <span>{loginError}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full py-5 bg-yellow-400 text-blue-900 rounded-2xl font-black hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-400/20 active:scale-95"
              >
                เข้าสู่ระบบ
              </button>
            </form>

            <button 
              onClick={() => setIsLoginModalOpen(false)}
              className="w-full mt-4 py-4 text-slate-400 text-sm font-bold hover:text-slate-600 transition-all"
            >
              ยกเลิก
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const renderPrintPreview = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsPrintPreviewOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">ตัวอย่างก่อนพิมพ์</h3>
            <p className="text-slate-400 text-sm mt-1">ตรวจสอบความถูกต้องของข้อมูลก่อนสั่งพิมพ์</p>
          </div>
          <button 
            onClick={() => setIsPrintPreviewOpen(false)}
            className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900 shadow-sm"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-12 bg-slate-100/30">
          <div className="bg-white p-12 shadow-sm mx-auto max-w-[210mm] min-h-[297mm] border border-slate-200" id="print-content">
            <div className="text-center mb-12 border-b-2 border-slate-900 pb-8">
              <h1 className="text-3xl font-black text-slate-900 uppercase mb-2">IPAD CHECK SYSTEM</h1>
              <h2 className="text-xl font-bold text-slate-700">โรงเรียนสารคามพิทยาคม</h2>
              <p className="text-sm text-slate-500 mt-4">รายงานรายการอุปกรณ์ทั้งหมดในระบบ (ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')})</p>
            </div>
            
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 px-4 py-3 text-sm font-black text-slate-900">รหัส</th>
                  <th className="border border-slate-300 px-4 py-3 text-sm font-black text-slate-900">ชื่ออุปกรณ์</th>
                  <th className="border border-slate-300 px-4 py-3 text-sm font-black text-slate-900">หมวดหมู่</th>
                  <th className="border border-slate-300 px-4 py-3 text-sm font-black text-slate-900">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const cat = categories.find(c => c.categoryId === p.categoryId);
                  return (
                    <tr key={p.productId}>
                      <td className="border border-slate-300 px-4 py-3 text-sm text-center font-mono">{p.productId}</td>
                      <td className="border border-slate-300 px-4 py-3 text-sm">{cat?.name}</td>
                      <td className="border border-slate-300 px-4 py-3 text-sm text-center">{cat?.name}</td>
                      <td className="border border-slate-300 px-4 py-3 text-sm text-center">{p.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="mt-20 flex justify-end">
              <div className="text-center">
                <p className="mb-12 text-sm">ลงชื่อ..........................................................ผู้รับรอง</p>
                <p className="text-sm font-bold">( .......................................................... )</p>
                <p className="text-xs text-slate-400 mt-2">ตำแหน่ง..........................................................</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4">
          <button 
            onClick={() => setIsPrintPreviewOpen(false)}
            className="px-8 py-3 bg-white text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-200"
          >
            ยกเลิก
          </button>
          <button 
            onClick={() => window.print()}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center space-x-2"
          >
            <Printer size={20} />
            <span>สั่งพิมพ์เอกสาร</span>
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderSettingsModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsSettingsModalOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden"
      >
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">ตั้งค่าระบบ</h3>
            <p className="text-slate-400 text-sm mt-1">จัดการการตั้งค่าพื้นฐานของระบบ</p>
          </div>
          <button 
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900 shadow-sm"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-10 space-y-8">
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">การเชื่อมต่อฐานข้อมูล</h4>
            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center space-x-4">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">Google Sheets Connected</p>
                <p className="text-xs text-emerald-700/70">เชื่อมต่อกับฐานข้อมูลโรงเรียนแล้ว</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">การแจ้งเตือน</h4>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <span className="text-sm font-bold text-slate-700">แจ้งเตือนผ่าน Line เมื่อมีการยืม</span>
              <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-50/50 border-t border-slate-100">
          <button 
            onClick={() => setIsSettingsModalOpen(false)}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
          >
            บันทึกการตั้งค่า
          </button>
        </div>
      </motion.div>
    </div>
  );

  const renderAddProductForm = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsAddProductModalOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
      >
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">เพิ่มสินค้าใหม่</h3>
            <p className="text-slate-400 text-sm mt-1">กรอกข้อมูลอุปกรณ์เพื่อนำเข้าสู่ระบบ</p>
          </div>
          <button 
            onClick={() => setIsAddProductModalOpen(false)}
            className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900 shadow-sm"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-10 max-h-[70vh] overflow-y-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">หมวดหมู่สินค้า (Category)</label>
              <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all cursor-pointer">
                {categories.map(cat => (
                  <option key={cat.categoryId} value={cat.categoryId}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">รหัสประจำเครื่อง (Serial/Asset ID)</label>
              <input type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all" placeholder="เช่น SPK-IPD-001" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">กลุ่มเป้าหมาย</label>
              <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all cursor-pointer">
                <option>Student</option>
                <option>Teacher</option>
                <option>Staff</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">รายละเอียด</label>
            <textarea rows={3} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all" placeholder="คำอธิบายสั้นๆ เกี่ยวกับอุปกรณ์..."></textarea>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">อุปกรณ์เสริมพื้นฐาน</label>
            <input type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all" placeholder="เช่น Case, Adapter, Cable (คั่นด้วยเครื่องหมาย ,)" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">URL รูปภาพ</label>
            <input type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all" placeholder="https://..." />
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-slate-800">แนะนำอุปกรณ์ (Featured)</p>
              <p className="text-xs text-slate-400">แสดงในส่วนแนะนำที่หน้าแรก</p>
            </div>
            <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex space-x-4">
          <button 
            onClick={() => setIsAddProductModalOpen(false)}
            className="flex-1 py-4 bg-white text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-200"
          >
            ยกเลิก
          </button>
          <button className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95">
            บันทึกข้อมูล
          </button>
        </div>
      </motion.div>
    </div>
  );
  const renderBorrowModal = () => (
    <AnimatePresence>
      {isBorrowModalOpen && selectedProductForBorrow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsBorrowModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">ทำรายการยืมอุปกรณ์</h3>
                  <p className="text-slate-500 font-bold">กรุณากรอกข้อมูลผู้ยืมให้ครบถ้วน</p>
                </div>
                <button onClick={() => setIsBorrowModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                    <Tablet size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">อุปกรณ์ที่เลือก</p>
                    <p className="font-black text-slate-800">{selectedProductForBorrow.productId}</p>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleBorrow(
                    selectedProductForBorrow, 
                    formData.get('fid') as string, 
                    formData.get('fname') as string
                  );
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">รหัสผู้ยืม (Fid)</label>
                      <input 
                        name="fid"
                        required
                        type="text" 
                        placeholder="เช่น 51604"
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-yellow-400 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ชื่อ-นามสกุล (Fname)</label>
                      <input 
                        name="fname"
                        required
                        type="text" 
                        placeholder="ระบุชื่อ-นามสกุล"
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-yellow-400 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                      />
                    </div>
                    <div className="pt-4">
                      <button 
                        type="submit"
                        className="w-full py-5 bg-yellow-400 text-blue-900 rounded-2xl font-black hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-400/20 active:scale-95"
                      >
                        ยืนยันการยืม
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderImportModal = () => (
    <AnimatePresence>
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsImportModalOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">นำเข้าข้อมูล Transactions</h3>
                  <p className="text-slate-500 font-bold">เลือกรูปแบบไฟล์และอัปโหลดข้อมูล</p>
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { id: 'JSON', label: 'JSON File', icon: FileText },
                  { id: 'CSV', label: 'CSV File', icon: FileText },
                  { id: 'GoogleSheet', label: 'Google Sheet', icon: Database },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setImportType(type.id as any)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 ${
                      importType === type.id 
                        ? 'border-yellow-400 bg-yellow-50 text-blue-900' 
                        : 'border-slate-100 hover:border-slate-200 text-slate-400'
                    }`}
                  >
                    <type.icon size={24} />
                    <span className="text-xs font-black uppercase tracking-widest">{type.label}</span>
                  </button>
                ))}
              </div>

              {importResults ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                      <p className="text-3xl font-black text-emerald-600">{importResults.success}</p>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">สำเร็จ</p>
                    </div>
                    <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 text-center">
                      <p className="text-3xl font-black text-rose-600">{importResults.failed}</p>
                      <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mt-1">ล้มเหลว</p>
                    </div>
                  </div>
                  {importResults.errors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      {importResults.errors.map((err, i) => (
                        <p key={i} className="text-xs font-bold text-rose-500 flex items-center space-x-2">
                          <AlertCircle size={12} />
                          <span>{err}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  <button 
                    onClick={() => setIsImportModalOpen(false)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {importType === 'GoogleSheet' ? (
                    <div className="p-12 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                      <Database size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 font-bold mb-6">เชื่อมต่อกับ Google Sheets เพื่อดึงข้อมูล</p>
                      <button className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">
                        เชื่อมต่อ Google Sheet
                      </button>
                    </div>
                  ) : (
                    <div className="p-12 border-2 border-dashed border-slate-200 rounded-[32px] text-center relative group hover:border-yellow-400 transition-all">
                      <UploadCloud size={48} className="mx-auto text-slate-300 mb-4 group-hover:text-yellow-400 transition-all" />
                      <p className="text-slate-500 font-bold">คลิกหรือลากไฟล์ {importType} มาวางที่นี่</p>
                      <input 
                        type="file" 
                        accept={importType === 'JSON' ? '.json' : '.csv'}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const content = event.target?.result as string;
                              if (importType === 'JSON') {
                                handleImportData(JSON.parse(content), 'JSON');
                              } else {
                                // Simple CSV parser
                                const lines = content.split('\n');
                                const headers = lines[0].split(',').map(h => h.trim());
                                const data = lines.slice(1).map(line => {
                                  const values = line.split(',').map(v => v.trim());
                                  const obj: any = {};
                                  headers.forEach((h, i) => obj[h] = values[i]);
                                  return obj;
                                });
                                handleImportData(data, 'CSV');
                              }
                            } catch (err) {
                              setImportResults({ success: 0, failed: 1, errors: ['ไฟล์ไม่ถูกต้อง'] });
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 flex items-center space-x-2">
                      <Info size={14} />
                      <span>โครงสร้างข้อมูลที่ต้องการ: borrowerId, fid, fname, snDevice, borrowDate, dueDate, recorder, status</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
  const renderProducts = () => (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
          <input 
            type="text" 
            placeholder="ค้นหาอุปกรณ์ตามชื่อ, หมวดหมู่ หรือ ID..." 
            className="w-full pl-16 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-4">
          <select 
            className="bg-white border border-slate-200 rounded-2xl px-8 py-5 text-base font-bold text-slate-700 focus:outline-none focus:ring-8 focus:ring-blue-500/5 shadow-sm cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">สถานะทั้งหมด</option>
            <option value="Available">พร้อมใช้งาน</option>
            <option value="Borrowed">ถูกยืม</option>
            <option value="Maintenance">ส่งซ่อม</option>
          </select>
          {currentUser?.role === UserRole.Admin && (
            <button 
              onClick={() => setIsAddProductModalOpen(true)}
              className="bg-yellow-400 text-blue-900 px-8 py-5 rounded-2xl text-base font-black flex items-center space-x-3 hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-400/20 active:scale-95"
            >
              <Plus size={24} />
              <span>เพิ่มอุปกรณ์</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={product.productId} 
              className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-700 flex flex-col"
            >
              <div className="aspect-[4/3] relative overflow-hidden m-4 rounded-[2.5rem]">
                <img 
                  src={product.categoryDetails?.imageUrl} 
                  alt={product.categoryDetails?.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-5 right-5">
                    {(() => {
                      const s = product.status?.toLowerCase() || '';
                      const isAvailable = s === 'available' || s === 'พร้อมใช้งาน';
                      const isBorrowed = s === 'borrowed' || s === 'borrow' || s === 'ถูกยืม';
                      
                      return (
                        <span className={`px-5 py-2 rounded-full text-xs font-black shadow-2xl backdrop-blur-xl ${
                          isAvailable ? 'bg-emerald-500/90 text-white' :
                          isBorrowed ? 'bg-blue-500/90 text-white' :
                          'bg-rose-500/90 text-white'
                        }`}>
                          {isAvailable ? 'พร้อมใช้งาน' : isBorrowed ? 'ถูกยืม' : 'ส่งซ่อม'}
                        </span>
                      );
                    })()}
                </div>
                {product.isFeatured && (
                  <div className="absolute top-5 left-5">
                    <span className="bg-white/90 backdrop-blur-xl text-blue-600 px-4 py-2 rounded-full text-xs font-black flex items-center space-x-2 shadow-xl">
                      <span className="text-blue-400">★</span>
                      <span>แนะนำ</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="p-10 pt-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-black text-slate-800 text-2xl mb-1 tracking-tight">{product.categoryDetails?.name}</h4>
                    <p className="text-xs text-slate-400 font-mono font-bold uppercase tracking-widest">{product.productId}</p>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
                    {product.categoryDetails?.name}
                  </span>
                </div>
                
                <p className="text-base text-slate-500 line-clamp-2 mb-8 leading-relaxed">
                  {product.categoryDetails?.description}
                </p>

                <div className="mt-auto space-y-8">
                  <div className="flex items-center space-x-4">
                    <button className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all active:scale-95">
                      รายละเอียด
                    </button>
                    {product.status === 'Available' && (
                      <button 
                        onClick={() => {
                          setSelectedProductForBorrow(product);
                          setIsBorrowModalOpen(true);
                        }}
                        className="flex-1 py-4 bg-yellow-400 text-blue-900 rounded-2xl text-sm font-black hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-400/20 active:scale-95"
                      >
                        ทำรายการยืม
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-blue-900 font-black animate-pulse">กำลังโหลดข้อมูลจาก Google Sheets...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#004aa1] to-[#022d5f] text-white shadow-xl shadow-blue-900/10">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4 cursor-pointer" onClick={() => { setActiveTab('home'); setIsAdminMode(false); }}>
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-900 shadow-lg shadow-blue-900/10">
              <Tablet size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter leading-none">
                IPAD<span className="text-white">CHECK</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">Service System</p>
            </div>
          </div>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center space-x-2">
            {!isAdminMode ? menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-6 py-3 rounded-2xl text-sm font-black transition-all duration-300 flex items-center space-x-2 ${
                  activeTab === item.id 
                    ? 'bg-white text-blue-900 shadow-lg shadow-blue-900/10' 
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            )) : adminMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setAdminTab(item.id)}
                className={`px-6 py-3 rounded-2xl text-sm font-black transition-all duration-300 flex items-center space-x-2 ${
                  adminTab === item.id 
                    ? 'bg-yellow-400 text-blue-900 shadow-lg shadow-yellow-400/20' 
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User & Actions */}
          <div className="flex items-center space-x-6">
            {currentUser ? (
              <div 
                className="hidden md:flex items-center space-x-3 bg-white/10 px-4 py-2 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/20 transition-all"
                onClick={() => currentUser.role === UserRole.Admin && setIsAdminMode(!isAdminMode)}
              >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-900 font-black text-xs">
                  {currentUser.loginId[0]}
                </div>
                <div className="text-left">
                  <p className="text-xs font-black leading-none">{currentUser.loginId}</p>
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">{isAdminMode ? 'admin' : currentUser.role}</p>
                </div>
                {currentUser.role === UserRole.Admin && <Settings size={14} className="text-slate-400" />}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex flex-col items-end">
                  <p className="text-xs font-black leading-none">ผู้เยี่ยมชม</p>
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">GUEST</p>
                </div>
                <button 
                  onClick={() => {
                    setCurrentUser({
                      loginId: 'Sunonchet',
                      fullName: 'Sunonchet',
                      role: UserRole.Admin,
                      password: ''
                    });
                    setIsAdminMode(true);
                  }}
                  className="p-3 bg-yellow-400 hover:bg-yellow-500 rounded-2xl transition-all text-blue-900 flex items-center justify-center shadow-lg shadow-yellow-400/20"
                  title="เข้าสู่ระบบสำหรับเจ้าหน้าที่"
                >
                  <Settings size={24} />
                </button>
              </div>
            )}
            
            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden p-3 bg-white/10 rounded-2xl"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden bg-blue-700 border-t border-white/10 p-6 space-y-3"
            >
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-6 py-4 rounded-2xl text-base font-black transition-all flex items-center space-x-4 ${
                    activeTab === item.id 
                      ? 'bg-white text-blue-900' 
                      : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <item.icon size={22} />
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <button className="flex items-center space-x-2 text-blue-200 font-bold text-sm">
                  <Settings size={18} />
                  <span>ตั้งค่า</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-rose-300 font-bold text-sm"
                >
                  <LogOut size={18} />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={isAdminMode ? `admin-${adminTab}` : activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              {!isAdminMode ? (
                activeTab === 'home' ? renderDashboard() : 
                activeTab === 'products' ? renderProducts() : 
                activeTab === 'rules' ? renderRules() :
                activeTab === 'contact' ? renderContact() :
                activeTab === 'report' ? renderReportIssue() :
                <div className="text-center py-20">
                  <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-bold">กำลังพัฒนาส่วนนี้...</p>
                </div>
              ) : (
                adminTab === 'dashboard' ? renderDashboard() :
                adminTab === 'all-items' ? renderAdminAllItems() :
                adminTab === 'check-status' ? renderAdminCheckStatus() :
                adminTab === 'not-borrowed' ? renderNotBorrowedStudents() :
                adminTab === 'manage-personnel' ? renderAdminManagePersonnel() :
                adminTab === 'repairs' ? renderAdminRepairs() :
                <div className="text-center py-20">
                  <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-bold">กำลังพัฒนาส่วนนี้...</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
              <Tablet size={20} />
            </div>
            <p className="text-sm font-bold text-slate-400">© 2026 iPad Check System - โรงเรียนสารคามพิทยาคม</p>
          </div>
          <div className="flex items-center space-x-8">
            <button className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors">นโยบายความเป็นส่วนตัว</button>
            <button className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors">เงื่อนไขการใช้งาน</button>
            <button onClick={() => setActiveTab('contact')} className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors">ติดต่อเรา</button>
          </div>
        </div>
      </footer>
      {renderBorrowModal()}
      {renderImportModal()}
    </div>
  );
}
