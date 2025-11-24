import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  TrendingUp,
  UserCheck,
  Building2,
  PieChart,
  ChevronRight,
  Save,
  RefreshCw,
  Menu,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  MessageCircle
} from 'lucide-react';

// --- CONFIG & UTILS ---

const formatIDR = (value) => {
  if (value === undefined || value === null || isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const parseIDR = (str) => {
  if (!str) return 0;
  const num = parseInt(str.toString().replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

// Helper for financial calculations
const sumFields = (data, keys) => keys.reduce((acc, k) => acc + (data[k] || 0), 0);

const getFinancialSummary = (data) => {
  if (!data || Object.keys(data).length === 0) return { assets: 0, liabilities: 0, equity: 0, profit: 0, sales: 0, currentAssets: 0, currentLiabilities: 0 };
  const assetKeys = ["Kas dan Setara Kas", "Persediaan", "Biaya dibayar dimuka", "Jaminan", "Piutang belum dikwitansikan", "Aset Tetap - Bersih", "Piutang Dagang", "Work in Progress", "Pajak dibayar dimuka", "Investasi Jangka Pendek"];
  const liabilityKeys = ["Utang usaha", "Utang pajak", "Pendapatan diterima dimuka", "Utang lembaga pembiayaan", "Utang bank (lancar)", "Utang lain-lain", "Utang bank (jbg panjang)", "Liabilitas Imbalan Pascakerja", "Utang kepada pemegang saham", "Utang kepada pihak berelasi", "Utang sewa pembiayaan", "Utang muka pelanggan"];
  const assets = sumFields(data, assetKeys);
  const liabilities = sumFields(data, liabilityKeys);
  const equity = assets - liabilities;
  const profit = data["Laba tahun berjalan"] || 0;
  const sales = data["Penjualan (Sales)"] || 0;
  const currentAssets = sumFields(data, ["Kas dan Setara Kas", "Persediaan", "Biaya dibayar dimuka", "Jaminan", "Piutang belum dikwitansikan"]);
  const currentLiabilities = sumFields(data, ["Utang usaha", "Utang pajak", "Pendapatan diterima dimuka", "Utang lembaga pembiayaan", "Utang bank (lancar)", "Utang lain-lain"]);
  return { assets, liabilities, equity, profit, sales, currentAssets, currentLiabilities };
};

const calculateAllRatios = (finT1, finT2) => {
  const y1 = getFinancialSummary(finT1);
  const y2 = getFinancialSummary(finT2);
  const calcYoY = (prev, curr) => prev === 0 ? 0 : ((curr - prev) / prev) * 100;
  return {
    y1, y2,
    yoy: {
      assets: calcYoY(y1.assets, y2.assets),
      liabilities: calcYoY(y1.liabilities, y2.liabilities),
      equity: calcYoY(y1.equity, y2.equity),
      profit: calcYoY(y1.profit, y2.profit),
    },
    ratios: {
      liquidity: y2.currentLiabilities === 0 ? 0 : (y2.currentAssets / y2.currentLiabilities) * 100,
      solvency: y2.equity === 0 ? 0 : (y2.liabilities / y2.equity) * 100,
      profitability: y2.equity === 0 ? 0 : (y2.profit / y2.equity) * 100
    }
  };
};

// FIXED: getScore now consistently returns an object with a 'score' property
const getScore = (val, type = 'financial') => {
  if (type === 'financial') {
    if (val >= 15) return { grade: 'A', score: 100 };
    if (val >= 5) return { grade: 'B', score: 66.67 };
    return { grade: 'C', score: 33.33 };
  }
  const map = { 'A': 100, 'B': 66.67, 'C': 33.33 };
  // Wrap result in object to match structure expected by calculation
  return { score: map[val] || 0 };
};

const calculateFinalResults = (finT1, finT2, capacityAnswers, charAnswers, capitalAnswers, conditionAnswers) => {
  const { yoy } = calculateAllRatios(finT1, finT2);
  const capEk = getScore(yoy.equity).score;
  const capProf = getScore(yoy.profit).score;
  const capAsset = getScore(yoy.assets).score;
  const capLiab = getScore(yoy.liabilities).score;
  const capacityScore = (capEk + capProf + capAsset + capLiab) / 4;

  const calcSection = (answers, weights) => {
    let totalScore = 0;
    let totalWeight = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const val = answers[key];
      if (val) {
        // This line was causing NaN because getScore returned a number before
        totalScore += getScore(val, 'q').score * weight;
        totalWeight += weight;
      }
    }
    return totalWeight === 0 ? 0 : totalScore / totalWeight;
  };

  // Weights are defined here for calculation (Bobot is preserved here)
  const charWeights = { q1: 7, q2: 7, q3: 7, q4: 5, q5: 5 };
  const capitalWeights = { q1: 5, q2: 5, q3: 5, q4: 5, q5: 5, q6: 5 };
  const condWeights = { q1: 8, q2: 3, q3: 3, q4: 5 };
  const techCapWeights = { q1: 7, q2: 3, q3: 5, q4: 5 };

  const characterScore = calcSection(charAnswers, charWeights);
  const capitalScore = calcSection(capitalAnswers, capitalWeights);
  const conditionScore = calcSection(conditionAnswers, condWeights);
  const techCapacityScore = calcSection(capacityAnswers, techCapWeights);

  const finalScore = (characterScore * 0.25) + (capitalScore * 0.25) + (capacityScore * 0.25) + (conditionScore * 0.25);

  return { characterScore, capitalScore, conditionScore, financialCapacityScore: capacityScore, techCapacityScore, finalScore };
};


// --- SHARED COMPONENTS ---

const MoneyInput = ({ label, value, onChange }) => (
  <div className="mb-5 group">
    <label className="block text-sm font-bold text-gray-600 mb-2 ml-1">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <span className="text-blue-600 font-bold">Rp</span>
      </div>
      <input
        type="text"
        className="block w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 font-semibold placeholder-gray-400"
        value={value === 0 ? "" : formatIDR(value).replace('Rp', '').trim()}
        onChange={(e) => {
          const val = parseIDR(e.target.value);
          onChange(val);
        }}
        placeholder="0"
      />
    </div>
  </div>
);

const SelectInput = ({ label, value, onChange, options }) => (
  <div className="mb-5">
    <label className="block text-sm font-bold text-gray-600 mb-2 ml-1">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 font-semibold cursor-pointer appearance-none"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
        <ChevronRight className="rotate-90" size={18} />
      </div>
    </div>
  </div>
);

const TextInput = ({ label, value, onChange, placeholder }) => (
  <div className="mb-5">
    <label className="block text-sm font-bold text-gray-600 mb-2 ml-1">{label}</label>
    <input
      type="text"
      className="block w-full px-5 py-3 bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 font-semibold placeholder-gray-400"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

const QuestionCard = ({ title, options, selected, onSelect }) => (
  <div className="bg-white rounded-3xl p-6 mb-6 border border-gray-200">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-base font-bold text-gray-700 flex-1 leading-relaxed">{title}</h3>
      {/* Bobot Badge Removed from UI, but calculation logic remains */}
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`
              text-sm px-4 py-3 rounded-2xl font-semibold text-left transition-all duration-200 border
              ${isSelected
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
            `}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

const SplashScreen = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);
    const removeTimer = setTimeout(() => {
      onFinish();
    }, 3000);
    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-blue-50 transition-opacity duration-1000 ease-in-out ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
    >
      <div className="flex flex-col items-center w-[85%] max-w-sm md:max-w-none md:w-auto animate-fade-in-up">
        <img
          src="4._logo_emas.png"
          alt="Jamkrindo Gold"
          className="h-24 md:h-48 w-auto object-contain mb-6 transition-all duration-500"
        />
        <div className="text-[#005EB8] font-extrabold text-xl md:text-2xl tracking-widest text-center">
          RISK ANALYZER
        </div>
        <div className="mt-6 w-full md:w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 animate-loading-bar"></div>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ activeStep, setActiveStep, isOpen, toggleSidebar }) => {
  const menuItems = [
    { id: 1, label: "Data Diri & Proyek", icon: <UserCheck size={20} /> },
    { id: 2, label: "Keuangan Tahun 1", icon: <DollarSign size={20} /> },
    { id: 3, label: "Keuangan Tahun 2", icon: <TrendingUp size={20} /> },
    { id: 4, label: "Capacity Analysis", icon: <LayoutDashboard size={20} /> },
    { id: 5, label: "Character Assessment", icon: <FileText size={20} /> },
    { id: 6, label: "Capital & Condition", icon: <Building2 size={20} /> },
    { id: 7, label: "Hasil & Laporan", icon: <PieChart size={20} /> },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className={`
        fixed top-0 left-0 h-full z-30 transition-transform duration-300 ease-in-out w-72
        bg-white border-r border-gray-200 flex flex-col print:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static
      `}>
        <div className="p-8 flex flex-col items-center justify-center border-b border-gray-100">
          <img
            src="5. logo jamkrindo.png"
            alt="Jamkrindo Logo"
            className="w-full h-auto object-contain max-h-16 mb-2"
          />
          <span className="text-xs font-bold text-gray-400 tracking-widest uppercase mt-2">5C Risk System</span>
          <button onClick={toggleSidebar} className="md:hidden absolute top-4 right-4 text-gray-500">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = activeStep === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveStep(item.id);
                  if (window.innerWidth < 768) toggleSidebar();
                }}
                className={`
                  w-full flex items-center px-5 py-4 text-sm font-bold transition-all duration-200 rounded-2xl
                  ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
                `}
              >
                <span className={`mr-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

// --- STEP COMPONENTS ---

const StepDataDiri = ({ dataDiri, setDataDiri, setActiveStep }) => {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="bg-white p-8 rounded-[2rem] border border-gray-200">

        <h2 className="text-2xl font-extrabold text-gray-800 mb-8 flex items-center relative z-10">
          <div className="p-3 bg-blue-50 rounded-2xl mr-4 text-blue-600">
            <UserCheck size={28} />
          </div>
          Data Diri & Proyek
        </h2>

        <div className="space-y-2 relative z-10">
          <TextInput label="Nama Calon Terjamin" value={dataDiri.nama} onChange={v => setDataDiri({ ...dataDiri, nama: v })} placeholder="PT. Example Indonesia" />
          <TextInput label="Alamat Lengkap" value={dataDiri.alamat} onChange={v => setDataDiri({ ...dataDiri, alamat: v })} placeholder="Jl. Jenderal Sudirman No..." />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectInput label="Jenis Surety Bond" value={dataDiri.jenisBond} options={["Penawaran", "Pelaksanaan", "Uang Muka", "Pemeliharaan"]} onChange={v => setDataDiri({ ...dataDiri, jenisBond: v })} />
            <SelectInput label="Jenis Pemberi Kerja" value={dataDiri.workType} options={["Swasta", "BUMN"]} onChange={v => setDataDiri({ ...dataDiri, workType: v })} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MoneyInput label="Nilai Jaminan (NJ)" value={dataDiri.nilaiJaminan} onChange={v => setDataDiri({ ...dataDiri, nilaiJaminan: v })} />
            <div className="mb-5">
              <label className="block text-sm font-bold text-gray-600 mb-2 ml-1">Coverage (%)</label>
              <input type="number" className="block w-full px-5 py-3 bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 font-semibold" value={dataDiri.coverage} onChange={(e) => setDataDiri({ ...dataDiri, coverage: e.target.value })} />
            </div>
          </div>

          <div className="bg-blue-50 p-5 rounded-2xl mt-4 flex items-start border border-blue-100">
            <AlertCircle className="text-blue-500 mr-3 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-blue-800 font-medium">Nilai Proyek akan dihitung otomatis: Coverage% × Nilai Jaminan</p>
          </div>
        </div>

        <div className="mt-10 flex justify-end relative z-10">
          <button
            onClick={() => setActiveStep(2)}
            className="group bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-full font-bold transition-all duration-200"
          >
            <span className="flex items-center gap-2">
              Mulai Analisis <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const FinancialPage = ({ data, setData, yearLabel, setActiveStep }) => {
  const groups = [
    { title: "ASET - Aktiva Lancar", fields: ["Kas dan Setara Kas", "Persediaan", "Biaya dibayar dimuka", "Jaminan", "Piutang belum dikwitansikan"] },
    { title: "ASET - Aktiva Tidak Lancar", fields: ["Aset Tetap - Bersih", "Piutang Dagang", "Work in Progress", "Pajak dibayar dimuka", "Investasi Jangka Pendek"] },
    { title: "KEWAJIBAN Jangka Pendek", fields: ["Utang usaha", "Utang pajak", "Pendapatan diterima dimuka", "Utang lembaga pembiayaan", "Utang bank (lancar)", "Utang lain-lain"] },
    { title: "KEWAJIBAN Jangka Panjang", fields: ["Utang bank (jbg panjang)", "Liabilitas Imbalan Pascakerja", "Utang kepada pemegang saham", "Utang kepada pihak berelasi", "Utang sewa pembiayaan", "Utang muka pelanggan"] },
    { title: "EKUITAS & LAINNYA", fields: ["Modal disetor", "Laba ditahan", "Komponen ekuitas lain", "Aset tax amnesty", "Laba tahun berjalan", "Penjualan (Sales)"] }
  ];

  return (
    <div className="animate-fade-in-up pb-10">
      <div className="bg-white p-8 rounded-[2rem] border border-gray-200 mb-6">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-8 flex items-center">
          <div className="p-3 bg-blue-50 rounded-2xl mr-4 text-blue-600"><DollarSign size={28} /></div>
          Data Keuangan: {yearLabel}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {groups.map((group, idx) => (
            <div key={idx} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
              <h3 className="text-sm font-extrabold text-blue-600 mb-5 uppercase tracking-wide border-b border-gray-200 pb-2">{group.title}</h3>
              {group.fields.map(field => <MoneyInput key={field} label={field} value={data[field]} onChange={(val) => setData(prev => ({ ...prev, [field]: val }))} />)}
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-8">
          <button onClick={() => setActiveStep(prev => prev + 1)} className="group bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-full font-bold transition-all flex items-center">
            Lanjut <ChevronRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionPage = ({ title, icon, data, setData, questions, setActiveStep }) => {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="bg-white p-8 rounded-[2rem] border border-gray-200">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-8 flex items-center">
          <div className="p-3 bg-blue-50 rounded-2xl mr-4 text-blue-600">
            {icon}
          </div>
          {title}
        </h2>

        {questions.map((q, idx) => (
          <QuestionCard
            key={idx}
            title={q.title}
            // Weight is removed from QuestionCard props to hide it, but it exists in 'questions' array for later calc
            options={q.options}
            selected={data[q.key]}
            onSelect={v => setData({ ...data, [q.key]: v })}
          />
        ))}

        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <button onClick={() => setActiveStep(prev => prev - 1)} className="text-gray-400 hover:text-gray-600 font-bold px-4 py-2 transition-colors">Kembali</button>
          <button
            onClick={() => setActiveStep(prev => prev + 1)}
            className="bg-gray-800 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-900 transition-all flex items-center"
          >
            Lanjut <ChevronRight size={16} className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

const StepCapitalCondition = ({ finT1, finT2, capitalAnswers, setCapitalAnswers, conditionAnswers, setConditionAnswers, setActiveStep }) => {
  const ratios = calculateAllRatios(finT1, finT2).ratios;
  const equity = calculateAllRatios(finT1, finT2).y2.equity;

  const capQuestions = [
    { title: "1. Ratio Likuiditas (Aktiva Lancar/Kewajiban Lancar)", key: 'q1', weight: 5, options: [{ label: "A: Baik (>120%)", value: "A" }, { label: "B: Cukup (100-120%)", value: "B" }, { label: "C: Kurang (<100%)", value: "C" }] },
    { title: "2. Ratio Rentabilitas (Laba/Ekuitas)", key: 'q2', weight: 5, options: [{ label: "A: Profit Tinggi", value: "A" }, { label: "B: Profit Sedang", value: "B" }, { label: "C: Rugi/Kecil", value: "C" }] },
    { title: "3. Ratio Solvabilitas (Total Kewajiban/Ekuitas)", key: 'q3', weight: 5, options: [{ label: "A: Sehat (<100%)", value: "A" }, { label: "B: Wajar (100-200%)", value: "B" }, { label: "C: Berisiko (>200%)", value: "C" }] },
    { title: "4. Ekuitas vs Nilai Proyek", key: 'q4', weight: 5, options: [{ label: "A: Kuat", value: "A" }, { label: "B: Cukup", value: "B" }, { label: "C: Lemah", value: "C" }] },
    { title: "5. Audit Laporan Keuangan", key: 'q5', weight: 5, options: [{ label: "A: Auditor Terdaftar", value: "A" }, { label: "B: Non Audit", value: "B" }, { label: "C: Tidak Ada", value: "C" }] },
    { title: "6. Sumber Dana Pelaksanaan", key: 'q6', weight: 5, options: [{ label: "A: Sendiri + Luar", value: "A" }, { label: "B: Sendiri", value: "B" }, { label: "C: Dana Luar", value: "C" }] }
  ];

  const condQuestions = [
    { title: "1. Jenis Pekerjaan", key: 'q1', weight: 8, options: [{ label: "A: Mudah", value: "A" }, { label: "B: Sedang", value: "B" }, { label: "C: Sulit", value: "C" }] },
    { title: "2. Periode Kontrak Proyek", key: 'q2', weight: 3, options: [{ label: "A: <1 tahun", value: "A" }, { label: "B: s/d 1 tahun", value: "B" }, { label: "C: >1 tahun", value: "C" }] },
    { title: "3. Lokasi Proyek vs Kantor", key: 'q3', weight: 3, options: [{ label: "A: Provinsi sama", value: "A" }, { label: "B: Provinsi lain", value: "B" }, { label: "C: Luar Negeri", value: "C" }] },
    { title: "4. Supply Bahan Baku", key: 'q4', weight: 5, options: [{ label: "A: Lokal", value: "A" }, { label: "B: Campuran", value: "B" }, { label: "C: Luar", value: "C" }] }
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="bg-white p-8 rounded-[2rem] border border-gray-200 mb-8">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center">
          <div className="p-3 bg-blue-50 rounded-2xl mr-4 text-blue-600"><Building2 size={28} /></div>
          Capital Assessment
        </h2>

        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 mb-8">
          <h4 className="font-bold text-blue-700 mb-4 flex items-center"><TrendingUp size={20} className="mr-2" /> Financial Ratios (Auto)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-blue-100">
              <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Likuiditas</span>
              <span className="font-mono font-bold text-lg text-gray-800">{ratios.liquidity.toFixed(2)}%</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-100">
              <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Solvabilitas</span>
              <span className="font-mono font-bold text-lg text-gray-800">{ratios.solvency.toFixed(2)}%</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-100">
              <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Profitability</span>
              <span className="font-mono font-bold text-lg text-gray-800">{ratios.profitability.toFixed(2)}%</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-100">
              <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">Total Equity</span>
              <span className="font-mono font-bold text-lg text-gray-800">{formatIDR(equity)}</span>
            </div>
          </div>
        </div>

        {capQuestions.map((q, i) => (
          <QuestionCard key={i} title={q.title} options={q.options} selected={capitalAnswers[q.key]} onSelect={v => setCapitalAnswers({ ...capitalAnswers, [q.key]: v })} />
        ))}
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-gray-200">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center">
          <div className="p-3 bg-blue-50 rounded-2xl mr-4 text-blue-600"><Building2 size={28} /></div>
          Condition Assessment
        </h2>
        {condQuestions.map((q, i) => (
          <QuestionCard key={i} title={q.title} options={q.options} selected={conditionAnswers[q.key]} onSelect={v => setConditionAnswers({ ...conditionAnswers, [q.key]: v })} />
        ))}

        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <button onClick={() => setActiveStep(prev => prev - 1)} className="text-gray-400 hover:text-gray-600 font-bold px-4 py-2 transition-colors">Kembali</button>
          <button onClick={() => setActiveStep(prev => prev + 1)} className="bg-gray-800 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-900 transition-all flex items-center">
            Lihat Hasil <CheckCircle2 size={16} className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

const StepResults = ({ dataDiri, finT1, finT2, capacityAnswers, charAnswers, capitalAnswers, conditionAnswers, setActiveStep }) => {
  const results = calculateFinalResults(finT1, finT2, capacityAnswers, charAnswers, capitalAnswers, conditionAnswers);
  const isApproved = results.finalScore >= 60;
  const isRange1 = results.finalScore >= 78;
  let collateralStatus = "", collateralAmount = 0;
  const threshold = dataDiri.workType === "Swasta" ? 500000000 : 1000000000;
  const nilaiProyek = (dataDiri.coverage / 100) * dataDiri.nilaiJaminan;
  const { yoy } = calculateAllRatios(finT1, finT2);

  if (dataDiri.jenisBond.toLowerCase().includes("penawaran")) {
    collateralStatus = "Tidak ada Agunan";
  } else {
    if (!isApproved) {
      collateralStatus = "Agunan ditolak (Score Rendah)";
    } else if (isRange1) {
      if (dataDiri.nilaiJaminan <= threshold) {
        collateralAmount = 0; collateralStatus = "Cash Collateral 0%";
      } else {
        collateralAmount = dataDiri.nilaiJaminan * 0.05; collateralStatus = "Cash Collateral 5% (Range 1 > Threshold)";
      }
    } else {
      const pct = dataDiri.nilaiJaminan <= threshold ? 0.05 : 0.10;
      collateralAmount = dataDiri.nilaiJaminan * pct; collateralStatus = `Cash Collateral ${pct * 100}% (Range 2)`;
    }
  }

  const generateAnalysisText = () => {
    let text = [];
    text.push(yoy.assets > 0 ? `✅ Peningkatan aset ${yoy.assets.toFixed(1)}%.` : `⚠️ Penurunan aset ${Math.abs(yoy.assets).toFixed(1)}%.`);
    text.push(yoy.liabilities > 0 ? `Liabilitas naik ${yoy.liabilities.toFixed(1)}%.` : `Liabilitas turun ${Math.abs(yoy.liabilities).toFixed(1)}%.`);
    text.push(yoy.profit > 0 ? `✅ Laba bersih tumbuh ${yoy.profit.toFixed(1)}%.` : `⚠️ Laba bersih turun ${Math.abs(yoy.profit).toFixed(1)}%.`);
    return text.join(" ");
  };

  const PrintLayout = () => {
    const timestamp = new Date().toLocaleString();
    return (
      <div className="hidden print:block font-sans text-black p-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold">JAMKRINDO - 5C RISK ANALYZER</h1>
          <p className="text-sm">Laporan dibuat pada: {timestamp}</p>
        </div>

        <h2 className="text-lg font-bold mb-4">LAPORAN ANALISIS 5C {timestamp}</h2>

        <div className="mb-6 space-y-1">
          <p><strong>Nama:</strong> {dataDiri.nama}</p>
          <p><strong>Alamat:</strong> {dataDiri.alamat}</p>
          <p><strong>Jenis Bond:</strong> {dataDiri.jenisBond}</p>
          <p><strong>Jenis Pekerja:</strong> {dataDiri.workType}</p>
          <p><strong>NJ:</strong> {formatIDR(dataDiri.nilaiJaminan)}</p>
          <p><strong>Coverage:</strong> {dataDiri.coverage}%</p>
          <p><strong>Nilai Proyek:</strong> {formatIDR(nilaiProyek)}</p>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2">HASIL PER SECTION (avg 0-100):</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>CHARACTER:</strong> {results.characterScore.toFixed(2)}</li>
            <li><strong>CAPITAL:</strong> {results.capitalScore.toFixed(2)}</li>
            <li><strong>CONDITION:</strong> {results.conditionScore.toFixed(2)}</li>
            <li><strong>CAPACITY:</strong> {results.financialCapacityScore.toFixed(2)}</li>
          </ul>
        </div>

        <div className="mb-6">
          <p className="font-bold">TOTAL SCORE (weighted): {results.finalScore.toFixed(2)}</p>
          <p className="font-bold mt-2">Decision:</p>
          <p className="text-lg uppercase">
            {isApproved ? (isRange1 ? "DIPROSES - Agunan Range 1" : "DIPROSES - Agunan Range 2") : "PENGAJUAN DITOLAK"}
          </p>
        </div>

        <div className="mb-6 border-t pt-4">
          <p><strong>Cash Collateral:</strong> {collateralStatus}</p>
          <p>• <strong>Amount:</strong> {formatIDR(collateralAmount)}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in-up pb-10">
      <PrintLayout />

      <div className="print:hidden">
        <div className="max-w-4xl mx-auto">
          <div className={`
              p-10 rounded-[2rem] mb-8 text-white relative overflow-hidden
              ${isApproved ? 'bg-blue-600' : 'bg-red-500'}
              `}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-4xl font-extrabold mb-2 tracking-tight">
                {isApproved ? (isRange1 ? "✅ DISETUJUI" : "⚠️ DISETUJUI (R2)") : "❌ DITOLAK"}
              </h2>
              <p className="opacity-90 text-xl font-medium">Total Score: {results.finalScore.toFixed(2)} / 100</p>

              <div className="mt-8 flex flex-wrap gap-8 justify-center md:justify-start">
                <div className="bg-white/10 rounded-2xl p-4 min-w-[150px] border border-white/20">
                  <span className="block text-xs uppercase tracking-wider opacity-80 mb-1">Cash Collateral</span>
                  <span className="font-bold text-2xl">{formatIDR(collateralAmount)}</span>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 min-w-[150px] border border-white/20">
                  <span className="block text-xs uppercase tracking-wider opacity-80 mb-1">Nilai Jaminan</span>
                  <span className="font-bold text-2xl">{formatIDR(dataDiri.nilaiJaminan)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center"><TrendingUp className="mr-3 text-blue-500" size={24} /> Rincian Skor 5C</h3>
              <div className="space-y-5">
                {[
                  { l: "Character", s: results.characterScore },
                  { l: "Capacity (Fin)", s: results.financialCapacityScore },
                  { l: "Capital", s: results.capitalScore },
                  { l: "Condition", s: results.conditionScore }
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-500 font-medium text-sm">{item.l}</span>
                      <span className="font-bold text-blue-600">{item.s.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${item.s}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-200 flex flex-col">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center"><CheckCircle2 className="mr-3 text-blue-500" size={24} /> Summary Proyek</h3>
              <div className="space-y-4 flex-1">
                {[
                  { l: "Pemohon", v: dataDiri.nama },
                  { l: "Jenis Bond", v: dataDiri.jenisBond },
                  { l: "Pemberi Kerja", v: dataDiri.workType },
                  { l: "Tech Capacity", v: `${results.techCapacityScore.toFixed(0)} / 100` }
                ].map((row, i) => (
                  <div key={i} className="flex justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-500 text-sm font-medium">{row.l}</span>
                    <span className="font-bold text-gray-800 text-sm text-right">{row.v}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => window.print()} className="mt-8 w-full py-4 border-2 border-dashed border-gray-300 text-gray-500 font-bold hover:border-blue-500 hover:text-blue-600 rounded-2xl transition-all">
                <span className="flex items-center justify-center"><Save size={18} className="mr-2" /> Cetak Laporan / Export PDF</span>
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8">
            <h3 className="text-lg font-extrabold text-blue-800 mb-4 flex items-center">🤖 AI Analysis</h3>
            <p className="text-blue-900 leading-relaxed font-medium">
              {generateAnalysisText()} <br /><br />
              Perusahaan memiliki kapasitas keuangan <span className="font-bold bg-blue-200 px-2 py-1 rounded-lg">{results.financialCapacityScore > 70 ? "KUAT" : "CUKUP"}</span>.
              Status collateral: <span className="italic">{collateralStatus}</span>.
            </p>
          </div>
          <div className="mt-10 flex justify-center">
            <button onClick={() => setActiveStep(1)} className="text-gray-500 hover:text-gray-800 font-bold flex items-center px-6 py-3 rounded-full hover:bg-gray-200 transition-all">
              <RefreshCw size={18} className="mr-2" /> Analisis Baru
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function JamkrindoApp() {
  const [activeStep, setActiveStep] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // --- DYNAMIC FAVICON LOGIC ---
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (!link) {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = '4._logo_emas.png';
      document.head.appendChild(newLink);
    } else {
      link.href = '4._logo_emas.png';
    }
  }, []);

  // --- WHATSAPP LOGIC ---
  const openWhatsApp = () => {
    const phoneNumber = "6281234567890";
    const message = "Halo, saya ingin bertanya tentang 5C Risk Analyzer";
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // --- STATE MANAGEMENT ---
  const [dataDiri, setDataDiri] = useState({
    nama: "",
    alamat: "",
    jenisBond: "Pelaksanaan",
    workType: "Swasta",
    nilaiJaminan: 0,
    coverage: 100
  });

  const [finT1, setFinT1] = useState({});
  const [finT2, setFinT2] = useState({});

  const [capacityAnswers, setCapacityAnswers] = useState({});
  const [charAnswers, setCharAnswers] = useState({});
  const [capitalAnswers, setCapitalAnswers] = useState({});
  const [conditionAnswers, setConditionAnswers] = useState({});

  const initFinancials = (state, setState) => {
    const fields = [
      "Kas dan Setara Kas", "Persediaan", "Biaya dibayar dimuka", "Jaminan", "Piutang belum dikwitansikan",
      "Aset Tetap - Bersih", "Piutang Dagang", "Work in Progress", "Pajak dibayar dimuka", "Investasi Jangka Pendek",
      "Utang usaha", "Utang pajak", "Pendapatan diterima dimuka", "Utang lembaga pembiayaan", "Utang bank (lancar)", "Utang lain-lain",
      "Utang bank (jbg panjang)", "Liabilitas Imbalan Pascakerja", "Utang kepada pemegang saham", "Utang kepada pihak berelasi", "Utang sewa pembiayaan", "Utang muka pelanggan",
      "Modal disetor", "Laba ditahan", "Komponen ekuitas lain", "Aset tax amnesty", "Laba tahun berjalan", "Penjualan (Sales)"
    ];
    if (Object.keys(state).length === 0) {
      const initial = {};
      fields.forEach(f => initial[f] = 0);
      setState(initial);
    }
  };

  useEffect(() => {
    initFinancials(finT1, setFinT1);
    initFinancials(finT2, setFinT2);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <Sidebar activeStep={activeStep} setActiveStep={setActiveStep} isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 print:h-auto print:overflow-visible">
        <div className="p-4 md:hidden flex items-center justify-between print:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-700 bg-white p-2 rounded-xl border border-gray-200"><Menu size={24} /></button>
          <img src="5. logo jamkrindo.png" alt="Logo" className="h-8 object-contain" />
          <div className="w-8"></div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth print:overflow-visible print:p-0">
          <div className="max-w-6xl mx-auto print:max-w-none">
            {activeStep === 1 && <StepDataDiri dataDiri={dataDiri} setDataDiri={setDataDiri} setActiveStep={setActiveStep} />}
            {activeStep === 2 && <FinancialPage data={finT1} setData={setFinT1} yearLabel="Tahun 1 (Sebelumnya)" setActiveStep={setActiveStep} />}
            {activeStep === 3 && <FinancialPage data={finT2} setData={setFinT2} yearLabel="Tahun 2 (Berjalan)" setActiveStep={setActiveStep} />}
            {activeStep === 4 && <QuestionPage
              title="Capacity Analysis"
              icon={<LayoutDashboard size={28} />}
              data={capacityAnswers}
              setData={setCapacityAnswers}
              setActiveStep={setActiveStep}
              questions={[
                { title: "1. Pengalaman Terhadap Jenis Pekerjaan", key: 'q1', weight: 7, options: [{ label: "A: >4 proyek", value: "A" }, { label: "B: 1-4 proyek", value: "B" }, { label: "C: Belum pernah", value: "C" }] },
                { title: "2. Tenaga Ahli sesuai proyek", key: 'q2', weight: 3, options: [{ label: "A: >5 orang", value: "A" }, { label: "B: 2-5 orang", value: "B" }, { label: "C: <2 orang", value: "C" }] },
                { title: "3. Proyek Lain yang Sedang Dikerjakan", key: 'q3', weight: 5, options: [{ label: "A: Tidak ada", value: "A" }, { label: "B: 1-2 proyek", value: "B" }, { label: "C: >2 proyek", value: "C" }] },
                { title: "4. Peralatan Untuk Mengerjakan Proyek", key: 'q4', weight: 5, options: [{ label: "A: Cukup, Milik sendiri", value: "A" }, { label: "B: Milik + Sewa", value: "B" }, { label: "C: Sewa", value: "C" }] }
              ]}
            />}
            {activeStep === 5 && <QuestionPage
              title="Character Assessment"
              icon={<FileText size={28} />}
              data={charAnswers}
              setData={setCharAnswers}
              setActiveStep={setActiveStep}
              questions={[
                { title: "1. Lama Operasional Usaha", key: 'q1', weight: 7, options: [{ label: "A: > 10 tahun", value: "A" }, { label: "B: 5-10 tahun", value: "B" }, { label: "C: <5 tahun", value: "C" }] },
                { title: "2. Hubungan dengan Obligee", key: 'q2', weight: 7, options: [{ label: "A: >2 Obligee", value: "A" }, { label: "B: 2 Obligee", value: "B" }, { label: "C: 1 Obligee", value: "C" }] },
                { title: "3. Lama Berhubungan dengan Obligee", key: 'q3', weight: 7, options: [{ label: "A: > 5 tahun", value: "A" }, { label: "B: 2-5 tahun", value: "B" }, { label: "C: <2 tahun", value: "C" }] },
                { title: "4. Indemnity Agreement", key: 'q4', weight: 5, options: [{ label: "A: Dirut", value: "A" }, { label: "B: Surat Kuasa", value: "B" }] },
                { title: "5. Legalitas Indemnity Agreement", key: 'q5', weight: 5, options: [{ label: "A: Notariil", value: "A" }, { label: "B: Bermaterai", value: "B" }, { label: "C: Tidak Bermaterai", value: "C" }] }
              ]}
            />}
            {activeStep === 6 && <StepCapitalCondition
              finT1={finT1}
              finT2={finT2}
              capitalAnswers={capitalAnswers}
              setCapitalAnswers={setCapitalAnswers}
              conditionAnswers={conditionAnswers}
              setConditionAnswers={setConditionAnswers}
              setActiveStep={setActiveStep}
            />}
            {activeStep === 7 && <StepResults
              dataDiri={dataDiri}
              finT1={finT1}
              finT2={finT2}
              capacityAnswers={capacityAnswers}
              charAnswers={charAnswers}
              capitalAnswers={capitalAnswers}
              conditionAnswers={conditionAnswers}
              setActiveStep={setActiveStep}
            />}
          </div>
        </main>
      </div>

      {/* WhatsApp Floating Button */}
      <button
        onClick={openWhatsApp}
        className="fixed bottom-8 right-8 z-50 bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center group print:hidden"
        aria-label="Contact WhatsApp"
      >
        <MessageCircle size={28} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-500 ease-in-out whitespace-nowrap font-bold">
          Hubungi CS
        </span>
      </button>
    </div>
  );
}