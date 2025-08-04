import React, { useState, useEffect } from "react";
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Drawer, 
  Box, 
  Button, 
  Switch,
  FormControlLabel,
  ThemeProvider,
  createTheme,
  CssBaseline,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent
} from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PieChart } from '@mui/x-charts/PieChart';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import axios from 'axios';
import dayjs from 'dayjs';
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SearchIcon from "@mui/icons-material/Search";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LogoutIcon from "@mui/icons-material/Logout";

const AppProvider = () => {
  const [drawerOpen, setDrawerOpen] = useState(false); // Drawer is collapsed (closed) by default
  const [darkMode, setDarkMode] = useState(false); // Theme state
  const [activeSection, setActiveSection] = useState('risk-roi'); // Active section state

  // Initial entry for new trades (moved before it's used)
  const initialEntry = {
    stock: "",
    cmp: "",
    slp: "",
    tgtp: "",
    sb: "",
    rsi: "",
    candle: "",
    volume: "",
    pl: "",
    entry_date: "",
    exit_date: "",
    remarks: ""
  };

  // Trading state variables from original implementation
  const [entries, setEntries] = useState([initialEntry]);
  const [capital, setCapital] = useState(0);
  const [risk, setRisk] = useState(0);
  const [maxLoss, setMaxLoss] = useState(5000);
  const [maxProfit, setMaxProfit] = useState(15000);
  const [user, setUser] = useState(null);
  const [screeners, setScreeners] = useState([]);
  const [selectedScreener, setSelectedScreener] = useState('');
  const [screenerStocks, setScreenerStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [diversification, setDiversification] = useState(0);
  const [roiLoaded, setRoiLoaded] = useState(false);

  // Settings form state (based on UserROI.jsx)
  const [settingsForm, setSettingsForm] = useState({
    total_capital: "",
    risk: "",
    total_risk: "",
    diversification: "",
    ipt: "",
    rpt: "",
    invested: "",
    monthly_pl: "",
    tax_pl: "",
    donation_pl: "",
    monthly_gain: "",
    monthly_percent_gain: "",
    total_gain: "",
    total_percert_gain: ""
  });
  const [settingsMessage, setSettingsMessage] = useState("");
  
  // Screener management state
  const [showAddScreenerModal, setShowAddScreenerModal] = useState(false);
  const [newScreenerName, setNewScreenerName] = useState("");
  const [addScreenerLoading, setAddScreenerLoading] = useState(false);
  const [addScreenerError, setAddScreenerError] = useState("");

  // Screener table columns (from UserROI.jsx)
  const screenerTableColumns = [
    "screener_name",
    "created_by", 
    "created_at",
    "updated_at",
    "last_run"
  ];

  // Pagination for stocks table (add these state variables)
  const [stocksPage, setStocksPage] = useState(1);
  const stocksPerPage = 5;
  const paginatedStocks = screenerStocks.slice((stocksPage - 1) * stocksPerPage, stocksPage * stocksPerPage);
  const totalPages = Math.ceil(screenerStocks.length / stocksPerPage);

  // Trade Entries filtering state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // getMonth() returns 0-11
  const [showAllEntries, setShowAllEntries] = useState(false);

  // Generate year options (2025 to 2035)
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2025 + i);
  
  // Month options
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Chart state for financial analysis
  const [selectedStock, setSelectedStock] = useState('');
  const [chartData, setChartData] = useState([]);
  const [chartTimeframe, setChartTimeframe] = useState('daily');
  const [loadingChart, setLoadingChart] = useState(false);

  // --- Calculated fields for summary stats ---
  const riskPerTrade = capital * risk / 100;
  const totalRisk = riskPerTrade * diversification;
  const investmentPerTrade = capital / diversification;

  // --- Summary calculations for dashboard KPIs ---
  let investedSum = 0, monthlyPLTotal = 0, taxPL = 0, donation = 0, monthlyGain = 0, monthlyGainPercent = 0;

  // Only sum Invested for rows where P/L is not selected
  investedSum = entries.reduce((sum, row) => {
    if (!row.pl) {
      // Use the computed invested value for the row
      return sum + (Number(row.invested) || 0);
    }
    return sum;
  }, 0);

  monthlyPLTotal = entries.reduce((sum, row) => {
    if (row.pl === "Profit" || row.pl === "Loss") {
      const cmp = Number(row.cmp) || 0;
      const slp = Number(row.slp) || 0;
      const tgtp = Number(row.tgtp) || 0;
      const sb = Number(row.sb) || 0;
      const sl = cmp - slp;
      const tgt = tgtp - cmp;
      const invested = cmp * sb;
      let booked = 0;
      if (row.pl === "Profit") booked = (cmp + tgt) * sb - invested;
      else if (row.pl === "Loss") booked = (cmp - sl) * sb - invested;
      return sum + booked;
    }
    return sum;
  }, 0);

  taxPL = monthlyPLTotal > 0 ? monthlyPLTotal * 0.2 : 0;
  donation = monthlyPLTotal > 0 ? monthlyPLTotal * 0.04 : 0;
  monthlyGain = monthlyPLTotal - taxPL - donation;
  monthlyGainPercent = capital > 0 ? (monthlyGain / capital) * 100 : 0;

  // Pie chart data: sum of Booked < 0 and > 0
  const bookedPositive = entries.reduce((sum, row) => sum + (row.booked > 0 ? row.booked : 0), 0);
  const bookedNegative = entries.reduce((sum, row) => sum + (row.booked < 0 ? Math.abs(row.booked) : 0), 0);
  const pieData = [
    { id: 0, value: bookedPositive, label: 'Profit', color: '#38a169' },
    { id: 1, value: bookedNegative, label: 'Loss', color: '#dc2626' },
  ];

  // Filter entries based on selected year and month (only if showAllEntries is false)
  const filteredEntries = showAllEntries 
    ? entries.map((entry, originalIndex) => ({ ...entry, originalIndex }))
    : entries
        .map((entry, originalIndex) => ({ ...entry, originalIndex }))
        .filter(entry => {
          if (!entry.entry_date) return false;
          
          const entryDate = new Date(entry.entry_date);
          const entryYear = entryDate.getFullYear();
          const entryMonth = entryDate.getMonth() + 1; // getMonth() returns 0-11
          
          return entryYear === selectedYear && entryMonth === selectedMonth;
        });

  // Technical indicator calculations
  const calculateEMA = (data, period) => {
    const k = 2 / (period + 1);
    const emaArray = [];
    
    if (data.length === 0) return emaArray;
    
    emaArray[0] = data[0].close;
    
    for (let i = 1; i < data.length; i++) {
      emaArray[i] = data[i].close * k + emaArray[i - 1] * (1 - k);
    }
    
    return emaArray;
  };

  const calculateMACD = (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);
    
    const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
    
    const signalData = macdLine.map((value, i) => ({ close: value }));
    const signalLine = calculateEMA(signalData, signalPeriod);
    
    const histogram = macdLine.map((macd, i) => macd - (signalLine[i] || 0));
    
    return { macdLine, signalLine, histogram };
  };

  const calculateRSI = (data, period = 13) => {
    const changes = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i].close - data[i - 1].close);
    }
    
    const rsiArray = [];
    
    for (let i = period - 1; i < changes.length; i++) {
      const periodChanges = changes.slice(i - period + 1, i + 1);
      const gains = periodChanges.filter(change => change > 0);
      const losses = periodChanges.filter(change => change < 0).map(loss => Math.abs(loss));
      
      const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
      const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      rsiArray.push(rsi);
    }
    
    return rsiArray;
  };

  const calculateBollingerBands = (data, period = 20, multiplier = 2) => {
    const sma = [];
    const upperBand = [];
    const lowerBand = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, item) => sum + item.close, 0) / period;
      
      const variance = slice.reduce((sum, item) => sum + Math.pow(item.close - avg, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      sma.push(avg);
      upperBand.push(avg + (stdDev * multiplier));
      lowerBand.push(avg - (stdDev * multiplier));
    }
    
    return { sma, upperBand, lowerBand };
  };

  const calculateADX = (data, period = 14) => {
    // Simplified ADX calculation
    const tr = [];
    const plusDM = [];
    const minusDM = [];
    
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const close = data[i].close;
      const prevHigh = data[i - 1].high;
      const prevLow = data[i - 1].low;
      const prevClose = data[i - 1].close;
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      tr.push(Math.max(tr1, tr2, tr3));
      
      const upMove = high - prevHigh;
      const downMove = prevLow - low;
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
    
    // Simplified smoothed calculations
    const smoothedTR = [];
    const smoothedPlusDM = [];
    const smoothedMinusDM = [];
    
    let trSum = tr.slice(0, period).reduce((a, b) => a + b, 0);
    let plusSum = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
    let minusSum = minusDM.slice(0, period).reduce((a, b) => a + b, 0);
    
    smoothedTR.push(trSum);
    smoothedPlusDM.push(plusSum);
    smoothedMinusDM.push(minusSum);
    
    for (let i = period; i < tr.length; i++) {
      trSum = trSum - (trSum / period) + tr[i];
      plusSum = plusSum - (plusSum / period) + plusDM[i];
      minusSum = minusSum - (minusSum / period) + minusDM[i];
      
      smoothedTR.push(trSum);
      smoothedPlusDM.push(plusSum);
      smoothedMinusDM.push(minusSum);
    }
    
    const plusDI = smoothedPlusDM.map((plus, i) => (plus / smoothedTR[i]) * 100);
    const minusDI = smoothedMinusDM.map((minus, i) => (minus / smoothedTR[i]) * 100);
    const adx = plusDI.map((plus, i) => Math.abs(plus - minusDI[i]) / (plus + minusDI[i]) * 100);
    
    return { plusDI, minusDI, adx };
  };

  // Custom Candlestick component for Recharts
  const Candlestick = (props) => {
    const { payload, x, y, width, height } = props;
    if (!payload) return null;

    const { open, high, low, close } = payload;
    const isGreen = close > open;
    const color = isGreen ? '#16a34a' : '#dc2626';
    
    const bodyHeight = Math.abs(close - open);
    const bodyY = Math.min(close, open);
    const wickTop = high;
    const wickBottom = low;
    
    // Calculate actual pixel positions
    const candleWidth = Math.max(width * 0.6, 2);
    const centerX = x + width / 2;
    
    // Scale factor to convert price to pixels (simplified)
    const priceRange = wickTop - wickBottom;
    const pixelScale = height / priceRange;
    
    const wickTopY = y + (wickTop - wickTop) * pixelScale;
    const wickBottomY = y + (wickTop - wickBottom) * pixelScale;
    const bodyTopY = y + (wickTop - Math.max(open, close)) * pixelScale;
    const bodyBottomY = y + (wickTop - Math.min(open, close)) * pixelScale;
    
    return (
      <g>
        {/* Wick line */}
        <line
          x1={centerX}
          y1={wickTopY}
          x2={centerX}
          y2={wickBottomY}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body rectangle */}
        <rect
          x={centerX - candleWidth / 2}
          y={bodyTopY}
          width={candleWidth}
          height={Math.max(bodyBottomY - bodyTopY, 1)}
          fill={isGreen ? color : color}
          stroke={color}
          strokeWidth={1}
          fillOpacity={isGreen ? 0.8 : 1}
        />
      </g>
    );
  };

  // Mock data generator for demonstration (replace with actual API call)
  const generateMockChartData = (symbol) => {
    const data = [];
    let basePrice = 100 + Math.random() * 500;
    
    for (let i = 0; i < 100; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (100 - i));
      
      const dailyChange = (Math.random() - 0.5) * 20;
      const open = basePrice;
      const close = basePrice + dailyChange;
      const high = Math.max(open, close) + Math.random() * 10;
      const low = Math.min(open, close) - Math.random() * 10;
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      basePrice = close; // Update base price for next iteration
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: open,
        high: high,
        low: low,
        close: close,
        volume: volume,
        symbol: symbol
      });
    }
    
    // Add technical indicators
    const ema5 = calculateEMA(data, 5);
    const ema13 = calculateEMA(data, 13);
    const ema26 = calculateEMA(data, 26);
    const macd = calculateMACD(data);
    const rsi = calculateRSI(data, 13);
    const bollinger = calculateBollingerBands(data);
    const adxData = calculateADX(data);
    
    return data.map((item, index) => ({
      ...item,
      ema5: ema5[index],
      ema13: ema13[index],
      ema26: ema26[index],
      macd: macd.macdLine[index],
      macdSignal: macd.signalLine[index],
      macdHistogram: macd.histogram[index],
      rsi: index >= 12 ? rsi[index - 12] : null,
      bbUpper: index >= 19 ? bollinger.upperBand[index - 19] : null,
      bbMiddle: index >= 19 ? bollinger.sma[index - 19] : null,
      bbLower: index >= 19 ? bollinger.lowerBand[index - 19] : null,
      adx: index >= 13 ? adxData.adx[index - 13] : null,
      plusDI: index >= 13 ? adxData.plusDI[index - 13] : null,
      minusDI: index >= 13 ? adxData.minusDI[index - 13] : null,
    }));
  };

  // Function to fetch chart data
  const fetchChartData = async (symbol) => {
    setLoadingChart(true);
    try {
      // For now, using mock data. Replace with actual API call
      const data = generateMockChartData(symbol);
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoadingChart(false);
    }
  };

  // API helper function
  const getApiUrl = (endpoint) => {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://algotrading-backend.onrender.com' 
      : 'http://localhost:8000';
    return `${baseUrl}/${endpoint}`;
  };

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Logout function
  const handleLogout = () => {
    // Route to home page
    window.location.href = "/";
  };

  // Create theme based on dark mode state
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2563eb', // Blue color from original theme
      },
      secondary: {
        main: '#64748b',
      },
      background: {
        default: darkMode ? '#0f172a' : '#f8fafc',
        paper: darkMode ? '#1e293b' : '#ffffff',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#1e293b' : '#2563eb',
          },
        },
      },
    },
  });

  // Menu items for sidebar
  const menuItems = [
    { id: 'risk-roi', label: 'Risk Management & ROI', icon: <TrendingUpIcon /> },
    { id: 'screener', label: 'Screener & Trade Entries', icon: <SearchIcon /> },
    { id: 'charts', label: 'Charts', icon: <BarChartIcon /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
  ];

  const handleMenuItemClick = (sectionId) => {
    setActiveSection(sectionId);
    setDrawerOpen(false);
  };

  // Add stock to Trade Entries at the top (from screener)
  const handleTradeStock = (stock) => {
    // Handle both old format (string) and new format (object with symbol and price)
    const stockName = typeof stock === 'string' ? stock : stock.symbol;
    const stockPrice = typeof stock === 'object' && stock.price ? Math.floor(Number(stock.price)) : '';
    
    const newEntry = computeRow({
      ...initialEntry,
      stock: stockName,
      cmp: stockPrice // Set CMP from screener price as integer
    });
    setEntries(prev => [newEntry, ...prev]);
  };

  // Helper to compute all derived fields for a row
  const computeRow = (row) => {
    const cmp = Number(row.cmp) || 0;
    let slp = Number(row.slp) || 0;
    let tgtp = Number(row.tgtp) || 0;
    
    // Auto-calculate SLP and TGTP when CMP is set but SLP/TGTP are empty
    if (cmp > 0) {
      if (!row.slp || row.slp === '') {
        slp = Math.floor(cmp * 0.97); // 3% less than CMP, rounded down to integer
      }
      if (!row.tgtp || row.tgtp === '') {
        tgtp = Math.floor(cmp * 1.09); // 9% more than CMP, rounded down to integer
      }
    }
    
    const sl = cmp - slp;
    const tgt = tgtp - cmp;
    
    // Calculate STB first
    const stb_sl = sl !== 0 ? Math.floor(riskPerTrade / sl) : 0;
    const stb_ipt = cmp !== 0 ? Math.floor(investmentPerTrade / cmp) : 0;
    let stb = '';
    if (stb_sl > 0 && stb_ipt > 0) stb = Math.min(stb_sl, stb_ipt).toString();
    else if (stb_sl > 0) stb = stb_sl.toString();
    else if (stb_ipt > 0) stb = stb_ipt.toString();
    
    // Auto-update SB when STB is calculated but SB is empty
    let sb = Number(row.sb) || 0;
    if (stb && (!row.sb || row.sb === '')) {
      sb = Number(stb);
    }
    
    // Auto-set Entry date when SB is set for the first time
    let entry_date = row.entry_date;
    if (sb > 0 && (!row.entry_date || row.entry_date === '')) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      entry_date = `${yyyy}-${mm}-${dd}`;
    }
    
    // Auto-set Exit date when P/L is marked as Profit or Loss for the first time
    let exit_date = row.exit_date;
    if ((row.pl === 'Profit' || row.pl === 'Loss') && (!row.exit_date || row.exit_date === '')) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      exit_date = `${yyyy}-${mm}-${dd}`;
    }
    
    // Invested logic: CMP * SB only when P/L is not selected
    let invested;
    if (!row.pl) {
      invested = cmp * sb;
    } else {
      invested = cmp * sb; // fallback to previous logic, can be customized if needed
    }
    
    let booked = '';
    if (row.pl === 'Profit') booked = ((cmp + tgt) * sb - invested).toFixed(2);
    else if (row.pl === 'Loss') booked = ((cmp - sl) * sb - invested).toFixed(2);
    else booked = '';
    
    let rr = '';
    if (row.pl === 'Profit' && sl !== 0 && sb !== 0) rr = ((booked / sb) / sl).toFixed(2);
    
    const percent_pl = invested !== 0 ? ((booked / invested) * 100).toFixed(2) : '';
    
    return {
      ...row,
      slp: slp, // Include calculated SLP
      tgtp: tgtp, // Include calculated TGTP
      sb: sb, // Include calculated SB from STB
      entry_date: entry_date, // Include auto-set entry date
      exit_date: exit_date, // Include auto-set exit date
      sl: sl.toFixed(2),
      tgt: tgt.toFixed(2),
      stb_sl,
      stb_ipt,
      stb: stb ? Number(stb) : 0,
      invested: invested.toFixed(2),
      booked: booked ? Number(booked) : 0,
      rr: rr ? Number(rr) : 0,
      percent_pl: percent_pl ? Number(percent_pl) : 0,
    };
  };

  // Helper for Tenure calculation (days between entry and exit)
  const getTenure = (entry, exit) => {
    if (!entry) return "";
    const entryDate = new Date(entry);
    const today = new Date();
    if (!exit) {
      // Entry present, exit blank
      return Math.ceil((today - entryDate) / (1000 * 60 * 60 * 24));
    }
    // Both present
    const exitDate = new Date(exit);
    return Math.ceil((exitDate - entryDate) / (1000 * 60 * 60 * 24));
  };

  // Add row handler (ensure computed fields are set)
  const handleAddRow = () => setEntries(prev => [computeRow(initialEntry), ...prev]);

  // Buy handler for Trade Entries
  const handleBuyRow = async (row, idx) => {
    if (!user || !user.user_id || !row.stock) {
      alert('Missing user or stock information');
      return;
    }
    const payload = {
      user_id: user.user_id,
      stock_name: row.stock,
      quantity: row.sb && Number(row.sb) > 0 ? Number(row.sb) : 1
    };
    try {
      const response = await axios.post(getApiUrl('api/stock/buy'), payload);
      if (response.status === 200) {
        // Simulate DB save: set id to a dummy value to show Save button
        const updated = [...entries];
        updated[idx] = { ...row, id: Date.now() };
        setEntries(updated);
        alert(`Buy order placed for ${row.stock}`);
      } else {
        alert('Failed to place buy order.');
      }
    } catch (error) {
      alert('Error placing buy order: ' + (error?.response?.data?.error || error.message));
    }
  };

  // GTT handler for Trade Entries
  const handleGttRow = async (row, idx) => {
    if (!user || !user.user_id || !row.stock) {
      alert('Missing user or stock information');
      return;
    }
    
    // Validate required fields for GTT
    if (!row.sb || Number(row.sb) <= 0) {
      alert('Please set a valid quantity (SB) before setting GTT');
      return;
    }
    if (!row.slp || Number(row.slp) <= 0) {
      alert('Please set a valid stop loss price (SLP) before setting GTT');
      return;
    }
    if (!row.tgtp || Number(row.tgtp) <= 0) {
      alert('Please set a valid target price (TGTP) before setting GTT');
      return;
    }
    
    const payload = {
      user_id: user.user_id,
      stock_name: row.stock,
      quantity: Number(row.sb),
      stop_loss: Number(row.slp),
      target: Number(row.tgtp)
    };
    
    try {
      const response = await axios.post(getApiUrl('api/gtt/'), payload);
      if (response.status === 200) {
        alert(`GTT order set successfully for ${row.stock}\nGTT ID: ${response.data.gtt_id}\nStop Loss: ${response.data.stop_loss}\nTarget: ${response.data.target}`);
      } else {
        alert('Failed to set GTT order.');
      }
    } catch (error) {
      alert('Error setting GTT order: ' + (error?.response?.data?.error || error.message));
    }
  };

  // Delete a trade row (and from backend if saved)
  const handleDeleteRow = async (row, index) => {
    // If the row has a database ID, call backend to delete
    if (row.id && typeof row.id === 'number') {
      try {
        await axios.delete(getApiUrl('api/trades/' + row.id + '/'));
        alert('Row deleted from database!');
      } catch (error) {
        alert('Failed to delete row from database.');
        return;
      }
    }
    // Remove from UI
    const updated = [...entries];
    updated.splice(index, 1);
    setEntries(updated);
  };

  // Save a trade row (create or update in backend)
  const handleSaveRow = async (row, index) => {
    // Get user_id from user state (Kite user_id or map to your backend user)
    const user_id = user && user.user_id ? user.user_id : null;
    // Always use the latest user input from entries[index]
    const latest = entries[index];
    const cmp = Number(latest.cmp) || 0;
    const slp = Number(latest.slp) || 0;
    const tgtp = Number(latest.tgtp) || 0;
    const sb = Number(latest.sb) || 0;
    const sl = cmp - slp;
    const tgt = tgtp - cmp;
    const stb_sl = sl !== 0 ? Math.floor(riskPerTrade / sl) : 0;
    const stb_ipt = cmp !== 0 ? Math.floor(investmentPerTrade / cmp) : 0;
    let stb = '';
    if (stb_sl > 0 && stb_ipt > 0) stb = Math.min(stb_sl, stb_ipt).toString();
    else if (stb_sl > 0) stb = stb_sl.toString();
    else if (stb_ipt > 0) stb = stb_ipt.toString();
    const invested = cmp * sb;
    const pl = latest.pl;
    let booked = "";
    if (pl === "Profit") booked = ((cmp + tgt) * sb - invested).toFixed(2);
    else if (pl === "Loss") booked = ((cmp - sl) * sb - invested).toFixed(2);
    else booked = "";
    const rr = (pl === "Profit" && sl !== 0 && sb !== 0) ? ((booked / sb) / sl).toFixed(2) : "";
    const percent_pl = invested !== 0 ? ((booked / invested) * 100).toFixed(2) : "";
    const tenure = getTenure(latest.entry_date, latest.exit_date);

    // Ensure date fields are always in YYYY-MM-DD format
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      if (dateStr.includes('T')) return dateStr.split('T')[0];
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return null;
    };

    // Build the complete trade object
    const tradeData = {
      stock: latest.stock || '',
      cmp: latest.cmp !== undefined && latest.cmp !== null && latest.cmp !== '' ? Number(latest.cmp) : 0,
      slp: latest.slp !== undefined && latest.slp !== null && latest.slp !== '' ? Number(latest.slp) : 0,
      tgtp: latest.tgtp !== undefined && latest.tgtp !== null && latest.tgtp !== '' ? Number(latest.tgtp) : 0,
      sb: latest.sb !== undefined && latest.sb !== null && latest.sb !== '' ? Number(latest.sb) : 0,
      rsi: latest.rsi || '',
      candle: latest.candle || '',
      volume: latest.volume || '',
      pl: latest.pl || '',
      entry_date: !latest.entry_date ? null : formatDate(latest.entry_date),
      exit_date: !latest.exit_date ? null : formatDate(latest.exit_date),
      remarks: latest.remarks || '',
      sl,
      tgt,
      stb_sl,
      stb_ipt,
      stb: stb ? Number(stb) : 0,
      invested,
      percent_pl: percent_pl ? Number(percent_pl) : 0,
      booked: booked ? Number(booked) : 0,
      rr: rr ? Number(rr) : 0,
      tenure: tenure ? parseInt(tenure) : null,
      user_id: user_id,
    };
    try {
      let response;
      if (row.id && typeof row.id === 'number') {
        response = await axios.put(getApiUrl('api/trades/' + row.id + '/'), tradeData);
      } else {
        response = await axios.post(getApiUrl('api/trades/'), tradeData);
      }
      const updated = [...entries];
      updated[index] = { ...row, ...response.data };
      setEntries(updated);
      alert(`Trade saved successfully!`);
    } catch (error) {
      alert('Failed to save row.');
    }
  };

  // Settings form calculation logic (from UserROI.jsx)
  const recalculateSettingsForm = (changed, value) => {
    const newForm = { ...settingsForm, [changed]: value };
    const totalCapital = parseFloat(newForm.total_capital) || 0;
    const risk = parseFloat(newForm.risk) || 0;
    const diversification = parseFloat(newForm.diversification) || 0;
    const riskPerTrade = totalCapital * risk / 100;
    const totalRisk = riskPerTrade * diversification;
    const investmentPerTrade = diversification !== 0 ? totalCapital / diversification : 0;

    // Recalculate dependent fields when base values change
    if (["total_capital", "risk", "diversification"].includes(changed)) {
      newForm.rpt = riskPerTrade;
      newForm.total_risk = totalRisk;
      newForm.ipt = investmentPerTrade;
      
      // Update main state variables as well
      setCapital(totalCapital);
      setRisk(risk);
      setDiversification(diversification);
    }

    // Recalculate P/L related fields
    const monthlyPL = parseFloat(newForm.monthly_pl) || 0;
    let taxPL = monthlyPL > 0 ? monthlyPL * 0.2 : 0; // 20% tax
    let donation = monthlyPL > 0 ? monthlyPL * 0.04 : 0; // 4% donation
    let monthlyGain = monthlyPL - taxPL - donation;
    let monthlyGainPercent = totalCapital > 0 ? (monthlyGain / totalCapital) * 100 : 0;
    
    if (["monthly_pl", "total_capital"].includes(changed)) {
      newForm.tax_pl = taxPL;
      newForm.donation_pl = donation;
      newForm.monthly_gain = monthlyGain;
      newForm.monthly_percent_gain = monthlyGainPercent;
      newForm.total_gain = monthlyGain;
      newForm.total_percert_gain = monthlyGainPercent;
    }

    return newForm;
  };

  // Settings form change handler
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettingsForm(prev => recalculateSettingsForm(name, value));
  };

  // Settings form submit handler
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsMessage("");
    
    const userId = user && user.user_id ? user.user_id : null;
    if (!userId) {
      setSettingsMessage("User not authenticated");
      return;
    }

    // Convert all fields to numbers or null for backend
    const payload = { user_id: userId };
    Object.keys(settingsForm).forEach(key => {
      let val = settingsForm[key];
      if (val === "" || val === null || typeof val === "undefined") {
        payload[key] = null;
      } else {
        let num = Number(val);
        // Round percent fields to 2 decimal places
        if (["monthly_percent_gain", "total_percert_gain"].includes(key) && !isNaN(num)) {
          num = Math.round(num * 100) / 100;
        }
        payload[key] = isNaN(num) ? null : num;
      }
    });

    try {
      await axios.post(getApiUrl("api/user_roi/"), payload);
      setSettingsMessage("Settings saved successfully!");
      alert("Settings saved successfully!");
    } catch (err) {
      setSettingsMessage("Error saving settings.");
      alert("Error saving settings.");
    }
  };

  // Add screener handler
  const handleAddScreener = async () => {
    if (!newScreenerName) return;
    
    const userId = user && user.user_id ? user.user_id : null;
    if (!userId) {
      setAddScreenerError("User not authenticated");
      return;
    }

    setAddScreenerLoading(true);
    setAddScreenerError("");
    
    try {
      const payload = { user_id: userId, screener_name: newScreenerName };
      const res = await axios.post(getApiUrl("api/screener/"), payload);
      
      if (res.data.success) {
        // Refresh screener list
        const listRes = await axios.get(getApiUrl("api/screener/"));
        setScreeners(listRes.data);
        setNewScreenerName("");
        setShowAddScreenerModal(false);
        alert("Screener added successfully!");
      } else {
        setAddScreenerError(res.data.error || "Unknown error");
      }
    } catch (e) {
      setAddScreenerError(e.response?.data?.error || "Failed to add screener");
    } finally {
      setAddScreenerLoading(false);
    }
  };

  // Ensure all entries always have computed fields populated (on mount)
  useEffect(() => {
    setEntries((prev) => prev.map(computeRow));
    // eslint-disable-next-line
  }, []);

  // Fetch screeners on mount
  useEffect(() => {
    axios.get(getApiUrl("api/screener/"))
      .then(res => {
        if (Array.isArray(res.data)) {
          setScreeners(res.data);
        }
      })
      .catch(() => setScreeners([]));
  }, []);

  // On mount: handle request_token and fetch trades for user
  useEffect(() => {
        const params = new URLSearchParams(window.location.search);
    const requestToken = params.get("request_token");
    if (requestToken) {
      axios.post(getApiUrl("api/generate-token/"), { request_token: requestToken })
        .then(res => {
          setAccessToken(res.data.access_token);
          localStorage.setItem("accessToken", res.data.access_token);
          if (res.data.user) {
            setUser(res.data.user);
            localStorage.setItem("kiteUser", JSON.stringify(res.data.user));
          }
          params.delete("request_token");
          const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
          window.history.replaceState({}, "", newUrl);
          window.location.replace("/trade");
        })
        .catch(err => {
          console.error("Failed to fetch access token:", err);
        });
    } else {
      // If user is already set, fetch trades and ROI for user
      const kiteUser = user || (localStorage.getItem("kiteUser") ? JSON.parse(localStorage.getItem("kiteUser")) : null);
      if (kiteUser && kiteUser.user_id) {
        axios.get(getApiUrl(`api/trades/?user_id=${kiteUser.user_id}`))
          .then(res => {
            if (Array.isArray(res.data) && res.data.length > 0) {
              setEntries(res.data);
            }
          })
          .catch(err => {
            window.location.replace('/');
          });
        // Fetch user_roi for this user and update summary fields
        if (!roiLoaded) {
          axios.get(getApiUrl(`api/user_roi/?user_id=${kiteUser.user_id}`))
            .then(res => {
              if (res.data && typeof res.data === 'object') {
                // Update all summary fields except user
                if (res.data.total_capital !== undefined) setCapital(Number(res.data.total_capital));
                if (res.data.risk !== undefined) setRisk(Number(res.data.risk));
                if (res.data.diversification !== undefined) setDiversification(Number(res.data.diversification));
                
                // Populate settings form with fetched data
                setSettingsForm(prev => ({
                  ...prev,
                  total_capital: res.data.total_capital || "",
                  risk: res.data.risk || "",
                  total_risk: res.data.total_risk || "",
                  diversification: res.data.diversification || "",
                  ipt: res.data.ipt || "",
                  rpt: res.data.rpt || "",
                  invested: res.data.invested || "",
                  monthly_pl: res.data.monthly_pl || "",
                  tax_pl: res.data.tax_pl || "",
                  donation_pl: res.data.donation_pl || "",
                  monthly_gain: res.data.monthly_gain || "",
                  monthly_percent_gain: res.data.monthly_percent_gain || "",
                  total_gain: res.data.total_gain || "",
                  total_percert_gain: res.data.total_percert_gain || ""
                }));
              }
              setRoiLoaded(true);
            })
            .catch(() => setRoiLoaded(true));
        }
      }
    }
  }, [user, roiLoaded]);

  // State for access token and user authentication
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("accessToken") || "");

  // Initialize user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("kiteUser");
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        setUser(userData);
        console.log('User initialized from localStorage:', userData); // Debug log
      } catch (err) {
        console.error('Error parsing stored user data:', err);
        localStorage.removeItem("kiteUser"); // Clean up invalid data
      }
    }
  }, []);

  // Fetch screener stocks when selectedScreener changes
  useEffect(() => {
    if (!selectedScreener) {
      setScreenerStocks([]);
      return;
    }
    
    setLoadingStocks(true);
    setStocksPage(1); // Reset to first page when screener changes
    axios.get(getApiUrl(`api/stocks?screener_name=${encodeURIComponent(selectedScreener)}`))
      .then(res => {
        if (res.data && Array.isArray(res.data.stocks)) {
          setScreenerStocks(res.data.stocks);
        } else {
          setScreenerStocks([]);
        }
      })
      .catch(() => setScreenerStocks([]))
      .finally(() => setLoadingStocks(false));
  }, [selectedScreener]);

  // Fetch user ROI data when user changes (separate effect for settings)
  useEffect(() => {
    if (user && user.user_id && !roiLoaded) {
      axios.get(getApiUrl(`api/user_roi/?user_id=${user.user_id}`))
        .then(res => {
          if (res.data && typeof res.data === 'object') {
            console.log('Fetched ROI data:', res.data); // Debug log
            
            // Update main state variables
            if (res.data.total_capital !== undefined) setCapital(Number(res.data.total_capital));
            if (res.data.risk !== undefined) setRisk(Number(res.data.risk));
            if (res.data.diversification !== undefined) setDiversification(Number(res.data.diversification));
            
            // Populate settings form with all available data
            setSettingsForm({
              total_capital: res.data.total_capital?.toString() || "",
              risk: res.data.risk?.toString() || "",
              total_risk: res.data.total_risk?.toString() || "",
              diversification: res.data.diversification?.toString() || "",
              ipt: res.data.ipt?.toString() || "",
              rpt: res.data.rpt?.toString() || "",
              invested: res.data.invested?.toString() || "",
              monthly_pl: res.data.monthly_pl?.toString() || "",
              tax_pl: res.data.tax_pl?.toString() || "",
              donation_pl: res.data.donation_pl?.toString() || "",
              monthly_gain: res.data.monthly_gain?.toString() || "",
              monthly_percent_gain: res.data.monthly_percent_gain?.toString() || "",
              total_gain: res.data.total_gain?.toString() || "",
              total_percert_gain: res.data.total_percert_gain?.toString() || ""
            });
          }
          setRoiLoaded(true);
        })
        .catch(err => {
          console.error('Error fetching ROI data:', err);
          setRoiLoaded(true);
        });
    }
  }, [user, roiLoaded]);

  // Debug effect to monitor settingsForm changes
  useEffect(() => {
    console.log('Settings form updated:', settingsForm);
  }, [settingsForm]);

  const renderMainContent = () => {
    switch (activeSection) {
      case 'risk-roi':
        return (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100vh', padding: '20px 0' }}>
              {/* Centered Heading above KPI Box */}
              <h1 style={{ 
                textAlign: 'center', 
                fontSize: 'clamp(1.2rem, 4vw, 2rem)', 
                fontWeight: 'bold', 
                color: '#2563eb', 
                marginBottom: '18px',
                lineHeight: '1.2',
                padding: '0 10px'
              }}>
                {user?.user_shortname ? `${user.user_shortname}'s Risk Management & ROI Portfolio` : 'Risk Management & ROI Portfolio'}
              </h1>
              <Box sx={{ flexGrow: 1, width: '100%', border: '2px solid #222', borderRadius: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: '#fff', padding: '24px 6px', marginBottom: '0px' }}>
                <Grid container spacing={2} columns={4}>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Total Capital<br />{capital}
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Risk (%)<br />{risk}
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Total Risk<br />{totalRisk.toFixed(2)}
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Diversification<br />{diversification}
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Investment/Trade<br />{investmentPerTrade.toFixed(2)}
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Risk/Trade<br />{riskPerTrade.toFixed(2)}
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Invested<br />{investedSum.toFixed(2)}
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Monthly P/L<br />
                      <span style={{ color: monthlyPLTotal > 0 ? '#38a169' : monthlyPLTotal < 0 ? 'red' : undefined, fontWeight: 'bold' }}>
                        {monthlyPLTotal.toFixed(2)}
                      </span>
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Tax P/L<br />
                      <span style={{ color: taxPL > 0 ? '#38a169' : taxPL < 0 ? 'red' : undefined, fontWeight: 'bold' }}>
                        {taxPL.toFixed(2)}
                      </span>
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Donation<br />
                      <span style={{ color: donation > 0 ? '#38a169' : donation < 0 ? 'red' : undefined, fontWeight: 'bold' }}>
                        {donation.toFixed(2)}
                      </span>
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Monthly Gain<br />
                      <span style={{ color: monthlyGain > 0 ? '#38a169' : monthlyGain < 0 ? 'red' : undefined, fontWeight: 'bold' }}>
                        {monthlyGain.toFixed(2)}
                      </span>
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Monthly % Gain<br />
                      <span style={{ color: monthlyGainPercent > 0 ? '#38a169' : monthlyGainPercent < 0 ? 'red' : undefined, fontWeight: 'bold' }}>
                        {monthlyGainPercent.toFixed(2)}%
                      </span>
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Total Gain<br />
                      <span style={{ color: monthlyGain > 0 ? '#38a169' : monthlyGain < 0 ? 'red' : undefined, fontWeight: 'bold' }}>
                        {monthlyGain.toFixed(2)}
                      </span>
                    </Paper>
                  </Grid>
                  <Grid item xs={1} sx={{ minWidth: 0, width: '20%', height: 120 }}>
                    <Paper sx={{ 
                      height: '50%', 
                      minWidth: 0, 
                      fontSize: { xs: '0.7rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      Total % Gain<br />
                      <span style={{ color: monthlyGainPercent > 0 ? '#38a169' : monthlyGainPercent < 0 ? 'red' : undefined, fontWeight: 'bold' }}>
                        {monthlyGainPercent.toFixed(2)}%
                      </span>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </div>
          </LocalizationProvider>
        );
      
      case 'screener':
        return (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ width: '100%', p: { xs: 1, sm: 2 } }}>
              <Typography 
                variant="h4" 
                gutterBottom 
                sx={{ 
                  color: '#2563eb', 
                  fontWeight: 'bold', 
                  mb: 3,
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
                  textAlign: { xs: 'center', md: 'left' }
                }}
              >
                Screener & Trade Entries
              </Typography>
              
              {/* Upper section with Screener */}
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, mb: 4 }}>
                {/* Screener Section */}
                <Card sx={{ minWidth: '400px', maxWidth: '520px', border: '2px solid #222', borderRadius: '18px' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="h5" 
                      gutterBottom 
                      sx={{ 
                        color: '#2563eb', 
                        fontSize: { xs: '1.3em', sm: '1.6em', md: '2em' }, 
                        fontWeight: 'bold' 
                      }}
                    >
                      Screener
                    </Typography>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>Select Screener</InputLabel>
                      <Select
                        value={selectedScreener}
                        onChange={(e) => {
                          setSelectedScreener(e.target.value);
                          setStocksPage(1);
                        }}
                        label="Select Screener"
                        sx={{ 
                          fontSize: { xs: '0.9em', sm: '1.1em' }, 
                          backgroundColor: 'white', 
                          color: '#2563eb' 
                        }}
                      >
                        <MenuItem value="">Select Screener</MenuItem>
                        {screeners.map((screener) => (
                          <MenuItem key={screener.id || screener.screener_name} value={screener.screener_name || screener.name}>
                            {screener.screener_name || screener.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <Typography 
                      variant="h6" 
                      gutterBottom 
                      sx={{ 
                        fontSize: { xs: '1.2em', sm: '1.5em', md: '1.8em' }, 
                        mb: 2 
                      }}
                    >
                      Stocks in Screener
                    </Typography>
                    
                    {loadingStocks ? (
                      <Typography sx={{ fontSize: { xs: '0.9em', sm: '1.1em' } }}>Loading stocks...</Typography>
                    ) : screenerStocks.length === 0 ? (
                      <Typography color="textSecondary" sx={{ fontSize: { xs: '0.9em', sm: '1.1em' } }}>
                        No stocks found for this screener.
                      </Typography>
                    ) : (
                      <>
                        <TableContainer component={Paper} sx={{ 
                          mt: 2, 
                          border: '2px solid #222', 
                          borderRadius: '12px',
                          maxHeight: { xs: '250px', sm: '300px' },
                          overflow: 'auto'
                        }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ background: '#fff' }}>
                                <TableCell sx={{ 
                                  fontSize: { xs: '0.9em', sm: '1.15em' }, 
                                  textAlign: 'center', 
                                  borderBottom: '2px solid #222',
                                  fontWeight: 'bold'
                                }}>
                                  Stock
                                </TableCell>
                                <TableCell sx={{ 
                                  fontSize: { xs: '0.9em', sm: '1.15em' }, 
                                  textAlign: 'center', 
                                  borderBottom: '2px solid #222',
                                  fontWeight: 'bold'
                                }}>
                                  Price (₹)
                                </TableCell>
                                <TableCell sx={{ 
                                  fontSize: { xs: '0.9em', sm: '1.15em' }, 
                                  textAlign: 'center', 
                                  borderBottom: '2px solid #222',
                                  fontWeight: 'bold'
                                }}>
                                  Action
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {paginatedStocks.map((stock, idx) => (
                                <TableRow key={(stock.symbol || stock) + idx} sx={{ 
                                  background: '#fff', 
                                  borderBottom: '1px solid #222' 
                                }}>
                                  <TableCell sx={{ 
                                    fontSize: { xs: '0.85em', sm: '1.1em' }, 
                                    textAlign: 'center', 
                                    borderRight: '1px solid #222' 
                                  }}>
                                    <Button
                                      variant="text"
                                      onClick={() => {
                                        const stockName = stock.symbol || stock;
                                        setSelectedStock(stockName);
                                        fetchChartData(stockName);
                                      }}
                                      sx={{
                                        fontSize: { xs: '0.85em', sm: '1.1em' },
                                        color: '#2563eb',
                                        fontWeight: 'bold',
                                        textTransform: 'none',
                                        padding: 0,
                                        minWidth: 'auto',
                                        '&:hover': {
                                          backgroundColor: 'transparent',
                                          textDecoration: 'underline'
                                        }
                                      }}
                                    >
                                      {stock.symbol || stock}
                                    </Button>
                                  </TableCell>
                                  <TableCell sx={{ 
                                    fontSize: { xs: '0.85em', sm: '1.1em' }, 
                                    textAlign: 'center', 
                                    borderRight: '1px solid #222',
                                    color: '#2563eb',
                                    fontWeight: 'bold'
                                  }}>
                                    ₹{stock.price || 'N/A'}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: { xs: '0.85em', sm: '1.1em' }, textAlign: 'center' }}>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleTradeStock(stock)}
                                      sx={{
                                        fontSize: { xs: '0.8em', sm: '1.1em' },
                                        backgroundColor: 'white',
                                        color: '#2563eb',
                                        borderColor: '#2563eb',
                                        padding: { xs: '4px 8px', sm: '6px 16px' },
                                        '&:hover': {
                                          backgroundColor: '#e3f0ff'
                                        }
                                      }}
                                    >
                                      Trade
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        
                        {/* Pagination */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center', 
                          mt: 2, 
                          gap: 1,
                          flexDirection: { xs: 'column', sm: 'row' }
                        }}>
                          <Button
                            size="small"
                            disabled={stocksPage === 1}
                            onClick={() => setStocksPage(stocksPage - 1)}
                            sx={{ 
                              fontSize: { xs: '0.85em', sm: '1.1em' }, 
                              color: '#2563eb', 
                              borderColor: '#2563eb' 
                            }}
                          >
                            Prev
                          </Button>
                          <Typography sx={{ fontSize: { xs: '0.85em', sm: '1.1em' } }}>
                            Page {stocksPage} of {totalPages}
                          </Typography>
                          <Button
                            size="small"
                            disabled={stocksPage === totalPages}
                            onClick={() => setStocksPage(stocksPage + 1)}
                            sx={{ 
                              fontSize: { xs: '0.85em', sm: '1.1em' }, 
                              color: '#2563eb', 
                              borderColor: '#2563eb' 
                            }}
                          >
                            Next
                          </Button>
                        </Box>
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.85em', sm: '1.1em' }, mt: 1 }}>
                          Total stocks: {screenerStocks.length}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Financial Charts Section */}
                <Card sx={{ flex: 1, minWidth: '600px', border: '2px solid #222', borderRadius: '18px' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="h5" 
                      gutterBottom 
                      sx={{ 
                        color: '#2563eb', 
                        fontSize: { xs: '1.3em', sm: '1.6em', md: '2em' }, 
                        fontWeight: 'bold' 
                      }}
                    >
                      Financial Charts
                    </Typography>
                    
                    {selectedStock ? (
                      <>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            color: '#2563eb', 
                            fontSize: { xs: '1.1em', sm: '1.3em' }, 
                            mb: 2,
                            fontWeight: 600
                          }}
                        >
                          {selectedStock} - Daily Chart
                        </Typography>

                        {loadingChart ? (
                          <Typography sx={{ fontSize: { xs: '0.9em', sm: '1.1em' } }}>Loading chart...</Typography>
                        ) : chartData.length > 0 ? (
                          <Box sx={{ width: '100%', height: '600px' }}>
                            {/* Main Price Chart with Candlesticks, EMAs and Bollinger Bands */}
                            <ResponsiveContainer width="100%" height="40%">
                              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip 
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      const change = data.close - data.open;
                                      const changePercent = ((change / data.open) * 100).toFixed(2);
                                      return (
                                        <div style={{ 
                                          backgroundColor: 'white', 
                                          border: '1px solid #ccc', 
                                          padding: '10px',
                                          borderRadius: '5px',
                                          fontSize: '12px'
                                        }}>
                                          <p style={{ margin: '2px 0', fontWeight: 'bold' }}>{`${data.symbol} - ${label}`}</p>
                                          <p style={{ margin: '2px 0', color: '#666' }}>{`Open: ₹${data.open?.toFixed(2)}`}</p>
                                          <p style={{ margin: '2px 0', color: '#16a34a' }}>{`High: ₹${data.high?.toFixed(2)}`}</p>
                                          <p style={{ margin: '2px 0', color: '#dc2626' }}>{`Low: ₹${data.low?.toFixed(2)}`}</p>
                                          <p style={{ margin: '2px 0', color: change >= 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                                            {`Close: ₹${data.close?.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)} / ${changePercent}%)`}
                                          </p>
                                          <p style={{ margin: '2px 0', color: '#8b5cf6' }}>{`Volume: ${data.volume?.toLocaleString()}`}</p>
                                          {data.ema5 && <p style={{ margin: '2px 0', color: '#dc2626' }}>{`EMA 5: ₹${data.ema5?.toFixed(2)}`}</p>}
                                          {data.ema13 && <p style={{ margin: '2px 0', color: '#2563eb' }}>{`EMA 13: ₹${data.ema13?.toFixed(2)}`}</p>}
                                          {data.ema26 && <p style={{ margin: '2px 0', color: '#16a34a' }}>{`EMA 26: ₹${data.ema26?.toFixed(2)}`}</p>}
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Legend />
                                
                                {/* Bollinger Bands background */}
                                <Area type="monotone" dataKey="bbUpper" stroke="#e5e7eb" fill="#f3f4f6" fillOpacity={0.3} name="BB Upper" />
                                <Area type="monotone" dataKey="bbLower" stroke="#e5e7eb" fill="#f3f4f6" fillOpacity={0.3} name="BB Lower" />
                                
                                {/* EMAs - Technical Indicators */}
                                <Line type="monotone" dataKey="ema5" stroke="#dc2626" strokeWidth={2} dot={false} name="EMA 5 (Red)" />
                                <Line type="monotone" dataKey="ema13" stroke="#2563eb" strokeWidth={2} dot={false} name="EMA 13 (Blue)" />
                                <Line type="monotone" dataKey="ema26" stroke="#16a34a" strokeWidth={2} dot={false} name="EMA 26 (Green)" />
                                
                                {/* Bollinger Middle (SMA) */}
                                <Line type="monotone" dataKey="bbMiddle" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="BB Middle (SMA 20)" />
                                
                                {/* Candlestick representation using custom shape */}
                                <Bar 
                                  dataKey="close" 
                                  fill={(entry) => entry.close >= entry.open ? '#16a34a' : '#dc2626'}
                                  shape={(props) => {
                                    const { payload, x, y, width, height } = props;
                                    if (!payload) return null;
                                    
                                    const { open, high, low, close } = payload;
                                    const isGreen = close >= open;
                                    const color = isGreen ? '#16a34a' : '#dc2626';
                                    
                                    const candleWidth = Math.max(width * 0.8, 2);
                                    const centerX = x + width / 2;
                                    
                                    // Calculate body dimensions
                                    const bodyTop = Math.max(open, close);
                                    const bodyBottom = Math.min(open, close);
                                    const bodyHeight = Math.abs(close - open);
                                    
                                    // Simple scaling for demonstration
                                    const scale = height / (high - low || 1);
                                    const wickY1 = y;
                                    const wickY2 = y + height;
                                    const bodyY = y + (high - bodyTop) * scale;
                                    const bodyH = bodyHeight * scale;
                                    
                                    return (
                                      <g>
                                        {/* High-Low wick */}
                                        <line
                                          x1={centerX}
                                          y1={wickY1}
                                          x2={centerX}
                                          y2={wickY2}
                                          stroke={color}
                                          strokeWidth={1}
                                        />
                                        {/* Open-Close body */}
                                        <rect
                                          x={centerX - candleWidth / 2}
                                          y={bodyY}
                                          width={candleWidth}
                                          height={Math.max(bodyH, 1)}
                                          fill={isGreen ? color : 'white'}
                                          stroke={color}
                                          strokeWidth={1}
                                        />
                                      </g>
                                    );
                                  }}
                                  name="Candlesticks"
                                />
                              </ComposedChart>
                            </ResponsiveContainer>

                            {/* MACD Chart */}
                            <ResponsiveContainer width="100%" height="20%">
                              <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip formatter={(value, name) => [value?.toFixed(4), name]} />
                                <Legend />
                                
                                <Line type="monotone" dataKey="macd" stroke="#2563eb" strokeWidth={1.5} dot={false} name="MACD" />
                                <Line type="monotone" dataKey="macdSignal" stroke="#dc2626" strokeWidth={1.5} dot={false} name="Signal" />
                                <Bar dataKey="macdHistogram" fill="#16a34a" name="Histogram" />
                              </ComposedChart>
                            </ResponsiveContainer>

                            {/* Volume Chart */}
                            <ResponsiveContainer width="100%" height="15%">
                              <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip formatter={(value, name) => [value?.toLocaleString(), name]} />
                                <Legend />
                                
                                <Area type="monotone" dataKey="volume" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Volume" />
                              </AreaChart>
                            </ResponsiveContainer>

                            {/* ADX and DI Chart */}
                            <ResponsiveContainer width="100%" height="15%">
                              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip formatter={(value, name) => [value?.toFixed(2), name]} />
                                <Legend />
                                
                                <Line type="monotone" dataKey="adx" stroke="#1f2937" strokeWidth={2} dot={false} name="ADX" />
                                <Line type="monotone" dataKey="plusDI" stroke="#16a34a" strokeWidth={1.5} dot={false} name="+DI" />
                                <Line type="monotone" dataKey="minusDI" stroke="#dc2626" strokeWidth={1.5} dot={false} name="-DI" />
                              </LineChart>
                            </ResponsiveContainer>

                            {/* RSI Chart */}
                            <ResponsiveContainer width="100%" height="10%">
                              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip formatter={(value, name) => [value?.toFixed(2), name]} />
                                <Legend />
                                
                                <Line type="monotone" dataKey="rsi" stroke="#f59e0b" strokeWidth={2} dot={false} name="RSI (13)" />
                                
                                {/* RSI levels */}
                                <Line type="monotone" dataKey={() => 70} stroke="#dc2626" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Overbought (70)" />
                                <Line type="monotone" dataKey={() => 30} stroke="#16a34a" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Oversold (30)" />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                        ) : (
                          <Typography color="textSecondary" sx={{ fontSize: { xs: '0.9em', sm: '1.1em' } }}>
                            No chart data available.
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography color="textSecondary" sx={{ fontSize: { xs: '0.9em', sm: '1.1em' }, mt: 4 }}>
                        Click on a stock from the screener to view its financial chart
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>

              {/* Trade Entries Table Section */}
              <Card sx={{ minWidth: '400px', maxWidth: '1600px', border: '2px solid #222', borderRadius: '12px' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" sx={{ color: '#2563eb', fontWeight: 'bold' }}>
                      Trade Entries
                    </Typography>
                  </Box>
                  
                  {/* Filter Controls */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    mb: 3, 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between'
                  }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={showAllEntries}
                            onChange={(e) => setShowAllEntries(e.target.checked)}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#2563eb',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#2563eb',
                              },
                            }}
                          />
                        }
                        label="Show All Entries"
                        sx={{ 
                          '& .MuiFormControlLabel-label': {
                            color: '#2563eb',
                            fontWeight: 600,
                            fontSize: '1.1em'
                          }
                        }}
                      />
                      
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel sx={{ color: '#2563eb', fontSize: '1rem' }}>Selected Year</InputLabel>
                        <Select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          label="Selected Year"
                          disabled={showAllEntries}
                          sx={{
                            color: '#2563eb',
                            backgroundColor: showAllEntries ? '#f5f5f5' : 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#2563eb',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#2563eb',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#2563eb',
                            }
                          }}
                        >
                          {yearOptions.map((year) => (
                            <MenuItem key={year} value={year}>
                              {year}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel sx={{ color: '#2563eb', fontSize: '1rem' }}>Selected Month</InputLabel>
                        <Select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          label="Selected Month"
                          disabled={showAllEntries}
                          sx={{
                            color: '#2563eb',
                            backgroundColor: showAllEntries ? '#f5f5f5' : 'white',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#2563eb',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#2563eb',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#2563eb',
                            }
                          }}
                        >
                          {monthOptions.map((month) => (
                            <MenuItem key={month.value} value={month.value}>
                              {month.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    
                    <Button
                      variant="contained"
                      onClick={handleAddRow}
                      sx={{
                        background: '#e3f0ff',
                        color: '#2563eb',
                        fontWeight: 700,
                        fontSize: '1.15em',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '14px 24px',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
                        '&:hover': {
                          background: '#d1e7ff'
                        }
                      }}
                    >
                      Add Trade Entry
                    </Button>
                  </Box>
                  
                  {/* Scrollable Trade Entries Table */}
                  <Box sx={{ 
                    overflowX: 'auto', 
                    overflowY: 'auto',
                    maxHeight: '480px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: darkMode ? '#1e293b' : '#fff',
                    '&::-webkit-scrollbar': {
                      width: '12px',
                      height: '12px'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: darkMode ? '#0f172a' : '#e5e7eb',
                      borderRadius: '6px'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#2563eb',
                      borderRadius: '6px',
                      border: darkMode ? '2px solid #1e293b' : '2px solid #fff'
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#1d4ed8'
                    },
                    '&::-webkit-scrollbar-corner': {
                      background: darkMode ? '#1e293b' : '#fff'
                    }
                  }}>
                    <Table sx={{ 
                      minWidth: '1400px', 
                      background: darkMode ? '#1e293b' : '#fff', 
                      border: `2px solid ${darkMode ? '#374151' : '#222'}` 
                    }}>
                      <TableHead>
                        <TableRow sx={{ background: darkMode ? '#374151' : '#fff' }}>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '60px'
                          }}>#</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '120px'
                          }}>Stock</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>CMP</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>SLP</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>TGTP</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '80px'
                          }}>SL</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '80px'
                          }}>TGT</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>STB-SL</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>STB-IPT</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '80px'
                          }}>STB</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '80px'
                          }}>SB</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>Invested</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>RSI</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '140px'
                          }}>Candle</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>Volume</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>P/L</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '140px'
                          }}>Entry</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '140px'
                          }}>Exit</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>Booked</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '80px'
                          }}>r:R</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '100px'
                          }}>Tenure</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '140px'
                          }}>Remarks</TableCell>
                          <TableCell sx={{ 
                            borderBottom: `2px solid ${darkMode ? '#4b5563' : '#222'}`, 
                            fontSize: '1.16em', 
                            fontWeight: 'bold',
                            color: darkMode ? '#fff' : '#000',
                            minWidth: '140px'
                          }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredEntries.map((row, idx) => {
                          const originalIndex = row.originalIndex;
                          return (
                          <TableRow key={originalIndex} sx={{ 
                            background: '#fff', 
                            borderBottom: '1px solid #222',
                            '& td': { textAlign: 'center' }
                          }}>
                            <TableCell sx={{ 
                              color: '#2563eb', 
                              fontSize: { xs: '0.8em', sm: '1em', md: '1.13em' }, 
                              minWidth: { xs: '30px', sm: '40px', md: '50px' }
                            }}>
                              {originalIndex + 1}
                            </TableCell>
                            <TableCell sx={{ minWidth: '120px' }}>
                              <TextField
                                size="small"
                                value={row.stock || ""}
                                onChange={(e) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ ...row, stock: e.target.value });
                                  setEntries(updated);
                                }}
                                sx={{
                                  minWidth: '120px',
                                  '& .MuiInputBase-input': {
                                    background: '#fff',
                                    border: '1px solid #222',
                                    color: '#2563eb',
                                    fontSize: { xs: '0.8em', sm: '1em', md: '1.13em' },
                                    padding: { xs: '4px', sm: '6px', md: '8px' }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ minWidth: '96px' }}>
                              <TextField
                                size="small"
                                type="number"
                                value={row.cmp || ""}
                                onChange={(e) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ ...row, cmp: e.target.value });
                                  setEntries(updated);
                                }}
                                sx={{
                                  minWidth: '96px',
                                  '& .MuiInputBase-input': {
                                    background: '#fff',
                                    border: '1px solid #222',
                                    color: '#2563eb',
                                    fontSize: '1.13em'
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ minWidth: '96px' }}>
                              <TextField
                                size="small"
                                type="number"
                                value={row.slp || ""}
                                onChange={(e) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ ...row, slp: e.target.value });
                                  setEntries(updated);
                                }}
                                sx={{
                                  minWidth: '96px',
                                  '& .MuiInputBase-input': {
                                    background: '#fff',
                                    border: '1px solid #222',
                                    color: '#2563eb',
                                    fontSize: '1.13em'
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ minWidth: '96px' }}>
                              <TextField
                                size="small"
                                type="number"
                                value={row.tgtp || ""}
                                onChange={(e) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ ...row, tgtp: e.target.value });
                                  setEntries(updated);
                                }}
                                sx={{
                                  minWidth: '96px',
                                  '& .MuiInputBase-input': {
                                    background: '#fff',
                                    border: '1px solid #222',
                                    color: '#2563eb',
                                    fontSize: '1.13em'
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: '#2563eb', fontSize: '1.13em', minWidth: '50px' }}>
                              {row.sl}
                            </TableCell>
                            <TableCell sx={{ color: '#2563eb', fontSize: '1.13em', minWidth: '50px' }}>
                              {row.tgt}
                            </TableCell>
                            <TableCell sx={{ color: '#2563eb', fontSize: '1.13em', minWidth: '70px' }}>
                              {row.stb_sl}
                            </TableCell>
                            <TableCell sx={{ color: '#2563eb', fontSize: '1.13em', minWidth: '70px' }}>
                              {row.stb_ipt}
                            </TableCell>
                            <TableCell sx={{ color: '#2563eb', fontSize: '1.13em', minWidth: '50px' }}>
                              {row.stb}
                            </TableCell>
                            <TableCell sx={{ minWidth: '96px' }}>
                              <TextField
                                size="small"
                                type="number"
                                value={row.sb || ""}
                                onChange={(e) => {
                                  let val = Number(e.target.value);
                                  if (val > row.stb) {
                                    alert('SB cannot be greater than STB. Value will be reset to 0.');
                                    val = 0;
                                  }
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ ...row, sb: val });
                                  setEntries(updated);
                                }}
                                sx={{
                                  minWidth: '96px',
                                  '& .MuiInputBase-input': {
                                    background: '#fff',
                                    border: '1px solid #222',
                                    color: '#2563eb',
                                    fontSize: '1.13em'
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: '#2563eb', fontSize: '1.13em', minWidth: '80px' }}>
                              {row.invested}
                            </TableCell>
                            <TableCell sx={{ minWidth: '120px' }}>
                              <Select
                                size="small"
                                value={row.rsi || ""}
                                onChange={(e) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ ...row, rsi: e.target.value });
                                  setEntries(updated);
                                }}
                                sx={{
                                  background: '#fff',
                                  border: '1px solid #222',
                                  color: '#2563eb',
                                  fontSize: '1.13em',
                                  minWidth: '120px'
                                }}
                              >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value="Yes">Yes</MenuItem>
                                <MenuItem value="No">No</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell sx={{ minWidth: '168px' }}>
                              <Select
                                size="small"
                                value={row.candle || ""}
                                onChange={(e) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ ...row, candle: e.target.value });
                                  setEntries(updated);
                                }}
                                sx={{
                                  background: '#fff',
                                  border: '1px solid #222',
                                  color: '#2563eb',
                                  fontSize: '1.13em',
                                  minWidth: '168px'
                                }}
                              >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value="Mazibozu">Mazibozu</MenuItem>
                                <MenuItem value="Bullish">Bullish</MenuItem>
                                <MenuItem value="Hammer">Hammer</MenuItem>
                                <MenuItem value="Engulf">Engulf</MenuItem>
                                <MenuItem value="Pin">Pin</MenuItem>
                                <MenuItem value="Tweezer">Tweezer</MenuItem>
                                <MenuItem value="Doji">Doji</MenuItem>
                                <MenuItem value="Bearish">Bearish</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell sx={{ minWidth: '120px' }}>
                              <Select
                                size="small"
                                value={row.volume || ""}
                                onChange={(e) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ ...row, volume: e.target.value });
                                  setEntries(updated);
                                }}
                                sx={{
                                  background: '#fff',
                                  border: '1px solid #222',
                                  color: '#2563eb',
                                  fontSize: '1.13em',
                                  minWidth: '120px'
                                }}
                              >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value="Yes">Yes</MenuItem>
                                <MenuItem value="No">No</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell sx={{ minWidth: '132px' }}>
                              <Select
                                size="small"
                                value={row.pl || ""}
                                onChange={(e) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ ...row, pl: e.target.value });
                                  setEntries(updated);
                                }}
                                sx={{
                                  background: '#fff',
                                  border: '1px solid #222',
                                  color: '#2563eb',
                                  fontSize: '1.13em',
                                  minWidth: '132px'
                                }}
                              >
                                <MenuItem value="">Select</MenuItem>
                                <MenuItem value="Profit">Profit</MenuItem>
                                <MenuItem value="Loss">Loss</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell sx={{ minWidth: '144px' }}>
                              <DatePicker
                                value={row.entry_date ? dayjs(row.entry_date) : null}
                                onChange={(newValue) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ 
                                    ...row, 
                                    entry_date: newValue ? newValue.format('YYYY-MM-DD') : '' 
                                  });
                                  setEntries(updated);
                                }}
                                slotProps={{
                                  textField: {
                                    size: 'small',
                                    sx: {
                                      minWidth: '144px',
                                      '& .MuiInputBase-input': {
                                        background: '#fff',
                                        border: '1px solid #222',
                                        borderRadius: '8px',
                                        color: '#2563eb',
                                        fontSize: '1.089em',
                                        padding: '8px'
                                      }
                                    }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ minWidth: '144px' }}>
                              <DatePicker
                                value={row.exit_date ? dayjs(row.exit_date) : null}
                                onChange={(newValue) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ 
                                    ...row, 
                                    exit_date: newValue ? newValue.format('YYYY-MM-DD') : '' 
                                  });
                                  setEntries(updated);
                                }}
                                slotProps={{
                                  textField: {
                                    size: 'small',
                                    sx: {
                                      minWidth: '144px',
                                      '& .MuiInputBase-input': {
                                        background: '#fff',
                                        border: '1px solid #222',
                                        borderRadius: '8px',
                                        color: '#2563eb',
                                        fontSize: '1.089em',
                                        padding: '8px'
                                      }
                                    }
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ 
                              color: Number(row.booked) > 0 ? '#38a169' : Number(row.booked) < 0 ? 'red' : '#2563eb',
                              fontSize: '1.13em',
                              minWidth: '80px',
                              fontWeight: 'bold'
                            }}>
                              {row.booked}
                            </TableCell>
                            <TableCell sx={{ color: '#2563eb', fontSize: '1.13em', minWidth: '50px' }}>
                              {row.rr}
                            </TableCell>
                            <TableCell sx={{ color: '#2563eb', fontSize: '1.13em', minWidth: '60px' }}>
                              {getTenure(row.entry_date, row.exit_date)}
                            </TableCell>
                            <TableCell sx={{ minWidth: '144px' }}>
                              <TextField
                                size="small"
                                value={row.remarks || ""}
                                onChange={(e) => {
                                  const updated = [...entries];
                                  updated[originalIndex] = computeRow({ ...row, remarks: e.target.value });
                                  setEntries(updated);
                                }}
                                sx={{
                                  minWidth: '144px',
                                  '& .MuiInputBase-input': {
                                    background: '#fff',
                                    border: '1px solid #222',
                                    color: '#2563eb',
                                    fontSize: '1.13em'
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ minWidth: '180px' }}>
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                                {(!row.id || typeof row.id !== 'number') && (
                                  <>
                                    <Button
                                      size="small"
                                      onClick={() => handleBuyRow(row, originalIndex)}
                                      sx={{
                                        background: '#e3f0ff',
                                        color: '#2563eb',
                                        fontWeight: 700,
                                        fontSize: '0.85em',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '6px 12px',
                                        minWidth: '50px',
                                        '&:hover': {
                                          background: '#d1e7ff'
                                        }
                                      }}
                                    >
                                      Buy
                                    </Button>
                                  </>
                                )}
                                    {/* <Button
                                      size="small"
                                      onClick={() => handleGttRow(row, idx)}
                                      sx={{
                                        background: '#fff3cd',
                                        color: '#856404',
                                        fontWeight: 700,
                                        fontSize: '0.85em',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '6px 12px',
                                        minWidth: '50px',
                                        '&:hover': {
                                          background: '#ffeeba'
                                        }
                                      }}
                                    >
                                      GTT
                                    </Button>                                 */}
                                <Button
                                  size="small"
                                  onClick={() => handleSaveRow(row, originalIndex)}
                                  sx={{
                                    background: '#e3f0ff',
                                    color: '#2563eb',
                                    fontWeight: 700,
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '6px 8px',
                                    minWidth: '40px',
                                    '&:hover': {
                                      background: '#d1e7ff'
                                    }
                                  }}
                                >
                                  💾
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => handleDeleteRow(row, originalIndex)}
                                  sx={{
                                    background: '#e3f0ff',
                                    color: '#2563eb',
                                    fontWeight: 700,
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '6px 8px',
                                    minWidth: '40px',
                                    '&:hover': {
                                      background: '#d1e7ff'
                                    }
                                  }}
                                >
                                  🗑️
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </LocalizationProvider>
        );

      case 'charts':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#2563eb', fontWeight: 'bold', mb: 3 }}>
              Trading Charts
            </Typography>
            
            <Grid container spacing={4}>
              {/* First Chart */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Monthly P/L</Typography>
                    <PieChart
                      series={[
                        {
                          data: pieData,
                          innerRadius: 30,
                          outerRadius: 100,
                          paddingAngle: 5,
                          cornerRadius: 5,
                          startAngle: -90,
                          endAngle: 90,
                          cx: 150,
                          cy: 150,
                        },
                      ]}
                      width={400}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Second Chart */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Total P/L</Typography>
                    <PieChart
                      series={[
                        {
                          data: pieData,
                          innerRadius: 30,
                          outerRadius: 100,
                          paddingAngle: 5,
                          cornerRadius: 5,
                          startAngle: -90,
                          endAngle: 90,
                          cx: 150,
                          cy: 150,
                        },
                      ]}
                      width={400}
                      height={300}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 'settings':
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#2563eb', fontWeight: 'bold', mb: 3 }}>
              Trading Settings
            </Typography>
            
            {/* Investment Plan Section */}
            <Card sx={{ mb: 4, border: '3px solid #2563eb', borderRadius: '24px' }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom sx={{ 
                  color: '#2563eb', 
                  fontSize: '2.2em', 
                  fontWeight: 800, 
                  letterSpacing: '0.02em', 
                  mb: 4 
                }}>
                  Investment Plan
                </Typography>
                
                <Box component="form" onSubmit={handleSettingsSubmit} sx={{ width: '100%' }}>
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    {Object.keys(settingsForm).map((key) => (
                      <Grid item xs={12} sm={6} md={4} key={key}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography variant="body1" sx={{ 
                            color: '#2563eb', 
                            fontSize: '1.1em', 
                            mb: 1, 
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}>
                            {key.replace(/_/g, " ")}
                          </Typography>
                          <TextField
                            type="number"
                            step="0.01"
                            name={key}
                            value={settingsForm[key]}
                            onChange={handleSettingsChange}
                            size="small"
                            placeholder={`Enter ${key.replace(/_/g, " ")}`}
                            sx={{
                              '& .MuiInputBase-input': {
                                background: '#fff',
                                border: '2px solid #2563eb',
                                color: '#2563eb',
                                fontSize: '1.13em',
                                borderRadius: '12px',
                                padding: '12px',
                                textAlign: 'center',
                                fontWeight: 600
                              },
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                '& fieldset': {
                                  border: '2px solid #2563eb'
                                }
                              },
                              maxWidth: '250px'
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      background: '#e3f0ff',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontSize: '1.15em',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '14px 32px',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
                      '&:hover': {
                        background: '#d1e7ff'
                      }
                    }}
                  >
                    Save Settings
                  </Button>
                  
                  {settingsMessage && (
                    <Typography sx={{ 
                      color: '#2563eb', 
                      fontSize: '1.1em', 
                      mt: 2, 
                      fontWeight: 600 
                    }}>
                      {settingsMessage}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Screener Management Section */}
            <Card sx={{ border: '3px solid #2563eb', borderRadius: '24px' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ 
                  color: '#2563eb', 
                  fontSize: '1.8em', 
                  textAlign: 'center', 
                  mb: 3, 
                  fontWeight: 700 
                }}>
                  Screeners Management
                </Typography>
                
                {/* Screener Table */}
                <Box sx={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  border: '2px solid #2563eb',
                  borderRadius: '12px',
                  mb: 3
                }}>
                  <Table sx={{ 
                    background: '#fff', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)' 
                  }}>
                    <TableHead>
                      <TableRow sx={{ background: '#e3f0ff' }}>
                        {screenerTableColumns.map(col => (
                          <TableCell key={col} sx={{ 
                            color: '#2563eb', 
                            fontSize: '1.1em', 
                            padding: '12px', 
                            borderBottom: '2px solid #2563eb', 
                            fontWeight: 700,
                            textTransform: 'capitalize'
                          }}>
                            {col.replace(/_/g, " ")}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {screeners.length === 0 ? (
                        <TableRow>
                          <TableCell 
                            colSpan={screenerTableColumns.length} 
                            sx={{ 
                              color: '#2563eb', 
                              fontSize: '1.1em', 
                              padding: '20px', 
                              textAlign: 'center' 
                            }}
                          >
                            No screeners found
                          </TableCell>
                        </TableRow>
                      ) : (
                        screeners.map((screener, idx) => (
                          <TableRow key={idx} sx={{ borderBottom: '1px solid #e3f0ff' }}>
                            {screenerTableColumns.map(col => (
                              <TableCell key={col} sx={{ 
                                color: '#2563eb', 
                                fontSize: '1.05em', 
                                padding: '12px', 
                                textAlign: 'center' 
                              }}>
                                {screener[col]?.toString() || ""}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
                
                {/* Action Buttons */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  justifyContent: 'center', 
                  flexWrap: 'wrap' 
                }}>
                  <Button
                    variant="contained"
                    onClick={() => setShowAddScreenerModal(true)}
                    sx={{
                      background: '#e3f0ff',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontSize: '1.15em',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '14px 24px',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
                      '&:hover': {
                        background: '#d1e7ff'
                      }
                    }}
                  >
                    Add Screener
                  </Button>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={darkMode}
                        onChange={toggleTheme}
                      />
                    }
                    label="Dark Mode"
                    sx={{ 
                      '& .MuiFormControlLabel-label': {
                        color: '#2563eb',
                        fontWeight: 600,
                        fontSize: '1.1em'
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Add Screener Modal */}
            {showAddScreenerModal && (
              <Box sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1300
              }}>
                <Card sx={{
                  border: '3px solid #2563eb',
                  borderRadius: '24px',
                  background: '#fff',
                  p: 4,
                  boxShadow: '0 4px 24px rgba(37,99,235,0.08)',
                  maxWidth: '420px',
                  width: '90%',
                  textAlign: 'center'
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ 
                      color: '#2563eb', 
                      fontSize: '1.8em', 
                      fontWeight: 800, 
                      letterSpacing: '0.02em', 
                      mb: 3 
                    }}>
                      Add Screener
                    </Typography>
                    
                    <TextField
                      fullWidth
                      placeholder="Screener Name"
                      value={newScreenerName}
                      onChange={(e) => setNewScreenerName(e.target.value)}
                      disabled={addScreenerLoading}
                      sx={{
                        mb: 2,
                        '& .MuiInputBase-input': {
                          background: '#fff',
                          border: '2px solid #2563eb',
                          color: '#2563eb',
                          fontSize: '1.13em',
                          borderRadius: '12px',
                          padding: '12px',
                          textAlign: 'center',
                          fontWeight: 600
                        },
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '12px',
                          '& fieldset': {
                            border: '2px solid #2563eb'
                          }
                        }
                      }}
                    />
                    
                    {addScreenerError && (
                      <Typography color="error" sx={{ fontSize: '1.05em', mb: 2 }}>
                        {addScreenerError}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '80%', mx: 'auto' }}>
                      <Button
                        variant="contained"
                        onClick={handleAddScreener}
                        disabled={addScreenerLoading || !newScreenerName}
                        sx={{
                          background: '#e3f0ff',
                          color: '#2563eb',
                          fontWeight: 700,
                          fontSize: '1.1em',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px 0',
                          boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
                          '&:hover': {
                            background: '#d1e7ff'
                          }
                        }}
                      >
                        {addScreenerLoading ? "Verifying..." : "Verify & Add"}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setShowAddScreenerModal(false)}
                        disabled={addScreenerLoading}
                        sx={{
                          color: '#2563eb',
                          borderColor: '#2563eb',
                          fontWeight: 700,
                          fontSize: '1.1em',
                          borderRadius: '12px',
                          padding: '12px 0',
                          '&:hover': {
                            background: '#e3f0ff',
                            borderColor: '#2563eb'
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        );

      default:
        return (
          <Box>
            <Typography variant="h4" gutterBottom>Risk Management & ROI Portfolio</Typography>
            <Typography>Manage your investment risk and track ROI</Typography>
          </Box>
        );
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex" }}>
        {/* AppBar */}
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={toggleDrawer(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
              Money Multiplier⚡
            </Typography>
            
            {/* Theme Switch */}
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={toggleTheme}
                  icon={<Brightness7Icon />}
                  checkedIcon={<Brightness4Icon />}
                />
              }
              label=""
              sx={{ ml: 1 }}
            />
            
            {/* Logout Button */}
            <IconButton
              color="inherit"
              onClick={handleLogout}
              sx={{ ml: 2 }}
              title="Logout"
            >
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Drawer */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={toggleDrawer(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              mt: '64px', // Account for AppBar height
              height: 'calc(100vh - 64px)',
            },
          }}
        >
          <Box
            role="presentation"
            onClick={toggleDrawer(false)}
            onKeyDown={toggleDrawer(false)}
          >
            <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              Navigation Menu
            </Typography>
            <List>
              {menuItems.map((item) => (
                <ListItem 
                  button 
                  key={item.id}
                  onClick={() => handleMenuItemClick(item.id)}
                  selected={activeSection === item.id}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.primary.main + '20',
                      borderRight: `3px solid ${theme.palette.primary.main}`,
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: theme.palette.primary.main + '30',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: activeSection === item.id ? theme.palette.primary.main : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label} 
                    sx={{ 
                      '& .MuiListItemText-primary': {
                        fontWeight: activeSection === item.id ? 600 : 400,
                        color: activeSection === item.id ? theme.palette.primary.main : 'inherit'
                      }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 3, 
            mt: 8,
            backgroundColor: theme.palette.background.default,
            minHeight: 'calc(100vh - 64px)'
          }}
        >
          {renderMainContent()}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AppProvider;
