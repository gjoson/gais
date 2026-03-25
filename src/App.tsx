import { useState, useEffect, type ReactNode } from 'react';
import { 
  LayoutDashboard, 
  LineChart, 
  Wallet, 
  Settings, 
  Sun, 
  Moon,
  LogOut,
  TrendingUp,
  Activity
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dummyChartData = [
  { name: '9:15', value: 22000 },
  { name: '10:00', value: 22050 },
  { name: '11:00', value: 21980 },
  { name: '12:00', value: 22100 },
  { name: '13:00', value: 22150 },
  { name: '14:00', value: 22080 },
  { name: '15:00', value: 22200 },
  { name: '15:30', value: 22180 },
];

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [marginData, setMarginData] = useState<any>(null);
  const [niftyData, setNiftyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    checkAuthStatus();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FLATTRADE_AUTH_SUCCESS') {
        checkAuthStatus();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsAuthenticated(data.isAuthenticated);
      if (data.isAuthenticated) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to check auth status', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [marginRes, niftyRes] = await Promise.all([
        fetch('/api/margin'),
        fetch('/api/quote/nifty')
      ]);
      
      if (marginRes.ok) {
        const mData = await marginRes.json();
        setMarginData(mData);
      }
      
      if (niftyRes.ok) {
        const nData = await niftyRes.json();
        setNiftyData(nData);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, 'flattrade_auth', 'width=600,height=700');
      }
    } catch (error) {
      console.error('Failed to get auth URL', error);
      alert('Failed to initiate login. Check console and ensure environment variables are set.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setMarginData(null);
      setNiftyData(null);
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 transition-colors duration-300">
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-lg text-slate-800 dark:text-slate-200 hover:bg-white/30 dark:hover:bg-black/30 transition-all"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        
        <div className="w-full max-w-md p-8 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Activity className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Pro Algo Trading</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">Connect your Flattrade account to access the trading terminal.</p>
          
          <button
            onClick={handleLogin}
            className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 flex items-center justify-center gap-2"
          >
            <Wallet size={20} />
            Connect Flattrade
          </button>
          
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-500">
            Token is valid until 6 AM the next day.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/20 backdrop-blur-xl flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Activity className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">Pro Algo</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active />
          <NavItem icon={<LineChart size={20} />} label="Trading Terminal" />
          <NavItem icon={<Wallet size={20} />} label="Ledger" />
        </nav>
        
        <div className="p-4 space-y-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span className="font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/10 backdrop-blur-md">
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-medium">Connected</span>
            </div>
            <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-600/20">
              Refresh Data
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard className="flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Available Margin</p>
                    <h3 className="text-3xl font-bold tracking-tight">
                      ₹{marginData?.cash ? parseFloat(marginData.cash).toLocaleString('en-IN') : '---'}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <Wallet size={24} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Used: ₹{marginData?.marginused || '0.00'}</span>
                </div>
              </GlassCard>

              <GlassCard className="flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Nifty 50 Spot</p>
                    <h3 className="text-3xl font-bold tracking-tight">
                      {niftyData?.lp ? parseFloat(niftyData.lp).toLocaleString('en-IN') : '---'}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {niftyData?.pc && (
                    <span className={cn(
                      "font-medium px-2 py-1 rounded-md",
                      parseFloat(niftyData.pc) >= 0 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    )}>
                      {parseFloat(niftyData.pc) >= 0 ? '+' : ''}{niftyData.pc}%
                    </span>
                  )}
                  <span className="text-slate-500 dark:text-slate-400">Today</span>
                </div>
              </GlassCard>

              <GlassCard className="flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">System Status</p>
                    <h3 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                      Active & Running
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    <Activity size={24} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Strategy</span>
                    <span className="font-medium">Nifty Weekly</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Order Type</span>
                    <span className="font-medium">Limit (0.5% Buffer)</span>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Chart Area */}
            <GlassCard className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Performance Curve</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Simulated strategy performance for today</p>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dummyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
                      domain={['dataMin - 100', 'dataMax + 100']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(8px)',
                        color: isDarkMode ? '#f8fafc' : '#0f172a'
                      }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active }: { icon: ReactNode, label: string, active?: boolean }) {
  return (
    <button className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
    )}>
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function GlassCard({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn(
      "p-6 rounded-3xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]",
      className
    )}>
      {children}
    </div>
  );
}
