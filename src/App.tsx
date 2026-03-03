/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  UserPlus
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const user = users.find(u => u.loginId === loginId && u.password === password);
    if (user) {
      setCurrentUser(user);
      setIsLoginModalOpen(false);
      setLoginId('');
      setPassword('');
      // Auto-switch to admin mode if admin logs in
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
    { id: 'products', label: 'รายการสินค้า', icon: Tablet },
    { id: 'rules', label: 'ระเบียบการยืม', icon: FileText },
    { id: 'contact', label: 'ติดต่อสอบถาม', icon: Phone },
    { id: 'report', label: 'แจ้งปัญหาการใช้งาน', icon: AlertTriangle },
  ];

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'all-items', label: 'รายการทั้งหมด', icon: Tablet },
    { id: 'check-status', label: 'ตรวจสอบสถานะ', icon: CheckCircle2 },
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
            {[
              { user: 'John Doe', action: 'ยืม iPad Gen 9', time: '2 ชม. ที่แล้ว', type: 'borrow' },
              { user: 'Jane Smith', action: 'คืน iPad Gen 10', time: '5 ชม. ที่แล้ว', type: 'return' },
              { user: 'Admin', action: 'ส่งซ่อม Macbook Air', time: '1 วันที่แล้ว', type: 'maintenance' },
            ].map((activity, i) => (
              <div key={i} className="flex items-start space-x-5 group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shrink-0 shadow-lg transition-transform group-hover:scale-110 ${
                  activity.type === 'borrow' ? 'bg-blue-500 shadow-blue-500/20' : 
                  activity.type === 'return' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
                }`}>
                  {activity.user[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black text-slate-900 truncate">{activity.user}</p>
                  <p className="text-sm text-slate-500 mb-1">{activity.action}</p>
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{activity.time}</span>
                </div>
              </div>
            ))}
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
                    <span className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
                      selectedProductForCheck.status === 'Available' ? 'bg-emerald-500 text-white' :
                      selectedProductForCheck.status === 'Borrowed' ? 'bg-blue-500 text-white' :
                      'bg-rose-500 text-white'
                    }`}>
                      {selectedProductForCheck.status === 'Available' ? 'พร้อมใช้งาน' :
                       selectedProductForCheck.status === 'Borrowed' ? 'ถูกยืม' : 'ส่งซ่อม'}
                    </span>
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
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">ยืมโดย: Somchai K.</span>
                        <span className="text-slate-400">01/03/2026</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">คืนโดย: Somchai K.</span>
                        <span className="text-slate-400">05/03/2026</span>
                      </div>
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

  const renderAdminRepairs = () => (
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">จัดการการแจ้งซ่อม</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Repair Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center space-x-3">
              <AlertTriangle className="text-blue-500" />
              <span>แจ้งซ่อมอุปกรณ์</span>
            </h3>
            
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">เลือกอุปกรณ์ที่มีปัญหา</label>
                  <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer">
                    <option value="">-- เลือกอุปกรณ์ --</option>
                    {products.map(p => (
                      <option key={p.productId} value={p.productId}>{p.productId} ({p.status})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">ประเภทปัญหา</label>
                  <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer">
                    <option value="screen">หน้าจอแตก/เสียหาย</option>
                    <option value="battery">แบตเตอรี่/การชาร์จ</option>
                    <option value="software">ซอฟต์แวร์/ระบบ</option>
                    <option value="accessories">อุปกรณ์เสริม</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">รายละเอียดปัญหา</label>
                <textarea rows={5} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="อธิบายอาการเสียอย่างละเอียด..."></textarea>
              </div>

              <button type="button" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                บันทึกการแจ้งซ่อม
              </button>
            </form>
          </div>
        </div>

        {/* Right: Recent Repairs */}
        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center space-x-3">
              <History className="text-blue-500" />
              <span>รายการซ่อมล่าสุด</span>
            </h3>
            
            <div className="space-y-6">
              {repairs.map((repair, i) => (
                <div key={repair.id} className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    repair.status === 'Pending' ? 'bg-blue-500' :
                    repair.status === 'Repairing' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}>
                    {repair.status === 'Pending' ? <Clock size={20} /> :
                     repair.status === 'Repairing' ? <ArrowRightLeft size={20} /> : <CheckCircle2 size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-black text-slate-900 truncate">{repair.productId}</p>
                      <span className="text-[10px] text-slate-400 font-bold">{repair.reportDate}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{repair.issue}</p>
                    <span className={`text-[9px] font-black uppercase tracking-widest mt-2 inline-block ${
                      repair.status === 'Pending' ? 'text-blue-600' :
                      repair.status === 'Repairing' ? 'text-blue-600' : 'text-emerald-600'
                    }`}>
                      {repair.status === 'Pending' ? 'รอดำเนินการ' :
                       repair.status === 'Repairing' ? 'กำลังซ่อม' : 'ซ่อมเสร็จแล้ว'}
                    </span>
                  </div>
                </div>
              ))}
              
              {repairs.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm font-bold">ไม่มีรายการซ่อม</p>
                </div>
              )}
            </div>
            
            <button className="w-full mt-8 py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all">
              ดูรายการทั้งหมด
            </button>
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
          <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm" title="นำเข้าข้อมูล (JSON)">
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
                    {product.status === 'Borrowed' ? (() => {
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
                    })() : (
                      <span className="text-sm text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      product.status === 'Available' ? 'bg-emerald-100 text-emerald-600' :
                      product.status === 'Borrowed' ? 'bg-blue-100 text-blue-600' :
                      'bg-rose-100 text-rose-600'
                    }`}>
                      {product.status === 'Available' ? 'พร้อมใช้งาน' :
                       product.status === 'Borrowed' ? 'ถูกยืม' : 'ส่งซ่อม'}
                    </span>
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
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
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
              className="bg-white text-blue-900 px-8 py-5 rounded-2xl text-base font-black flex items-center space-x-3 hover:bg-slate-100 transition-all shadow-xl shadow-blue-900/10 active:scale-95"
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
                  <span className={`px-5 py-2 rounded-full text-xs font-black shadow-2xl backdrop-blur-xl ${
                    product.status === 'Available' ? 'bg-emerald-500/90 text-white' :
                    product.status === 'Borrowed' ? 'bg-blue-500/90 text-white' :
                    'bg-rose-500/90 text-white'
                  }`}>
                    {product.status === 'Available' ? 'พร้อมใช้งาน' :
                     product.status === 'Borrowed' ? 'ถูกยืม' : 'ส่งซ่อม'}
                  </span>
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
                      <button className="flex-1 py-4 bg-white text-blue-900 rounded-2xl text-sm font-black hover:bg-slate-100 transition-all shadow-xl shadow-blue-900/10 active:scale-95">
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
                    ? 'bg-white text-blue-900 shadow-lg shadow-blue-900/10' 
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
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">{isAdminMode ? 'ADMIN MODE' : currentUser.role}</p>
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
                  onClick={() => setIsLoginModalOpen(true)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white flex items-center justify-center"
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
    </div>
  );
}
