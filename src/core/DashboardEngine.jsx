import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    Search, Download, Filter, ChevronDown, List,
    AlertCircle, CheckCircle2, CircleDashed
} from 'lucide-react';
import { fetchSheetData } from '../services/sheetsApi';
import { DASHBOARD_CONFIG } from '../../dashboard.config';

const DashboardEngine = () => {
    const [selectedEmpresa, setSelectedEmpresa] = useState('ALL');
    const [selectedContrato, setSelectedContrato] = useState('ALL');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (isDarkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDarkMode]);

    // Pagination and search state
    const [searchQuery, setSearchQuery] = useState('');

    // Using filtered records from search to match design format, but keeping simple pagination structure for future implementation if needed,
    // though the prompt requests overflow-y-auto to just scroll implicitly inside.
    const itemsPerPage = 50;

    // Fetching data logic
    useEffect(() => {
        const fetchRecords = async () => {
            setIsLoading(true);
            try {
                const data = await fetchSheetData();
                setRecords(data);
            } catch (error) {
                console.error("DashboardEngine: Error fetching records:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecords();
    }, []);

    // Helper to check status
    const getFolioStatus = (r) => {
        const isNE = (val) => val && String(val).trim().toUpperCase() === 'N/E';
        if (isNE(r.LARGO) || isNE(r.ANCHO) || r.ESTADO === 'No Ejecutado' || r._isRed) return 'NO EJECUTADO';
        if (!r.LARGO || String(r.LARGO).trim() === '') return 'VACÍO';
        return 'CON INFO';
    };

    // Derived options from data
    const handleRecordUpdate = (id, field, value) => {
        setRecords(prev => prev.map(r => {
            if (r.ID === id) {
                const updated = { ...r, [field]: value };
                // Auto-calculate M2TOTAL
                const largo = parseFloat(updated.LARGO) || 0;
                const ancho = parseFloat(updated.ANCHO) || 0;
                if (largo > 0 && ancho > 0) {
                    updated.M2TOTAL = (largo * ancho).toFixed(2);
                } else {
                    updated.M2TOTAL = 0;
                }
                return updated;
            }
            return r;
        }));
    };

    const availableEmpresas = useMemo(() => {
        return [...new Set(records.map(r => r.EMPRESA))].filter(Boolean).sort((a, b) => a.localeCompare(b));
    }, [records]);

    const availableContratos = useMemo(() => {
        let options = records;
        if (selectedEmpresa !== 'ALL') {
            options = options.filter(r => r.EMPRESA === selectedEmpresa);
        }
        return [...new Set(options.map(r => r.ID))].filter(Boolean);
    }, [records, selectedEmpresa]);

    // Handle cascade reset when Empresa changes
    useEffect(() => {
        setSelectedContrato('ALL');
    }, [selectedEmpresa]);

    // Data filtering (Global - affects KPIs and Charts)
    const globalFilteredRecords = useMemo(() => {
        let filtered = records;
        if (selectedEmpresa !== 'ALL') filtered = filtered.filter(r => r.EMPRESA === selectedEmpresa);
        if (selectedContrato !== 'ALL') filtered = filtered.filter(r => String(r.ID) === String(selectedContrato));
        if (searchQuery) {
            const query = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(r => {
                const folio = String(r.FOLIO || '').toLowerCase();
                const folioRef = String(r.FOLIOREF || '').toLowerCase();
                return folio.includes(query) || folioRef.includes(query);
            });
        }
        return filtered;
    }, [records, selectedEmpresa, selectedContrato, searchQuery]);

    // Data filtering (Table Only - applies Status chip)
    const tableRecords = useMemo(() => {
        if (selectedStatusFilter === 'ALL') return globalFilteredRecords;
        return globalFilteredRecords.filter(r => getFolioStatus(r) === selectedStatusFilter);
    }, [globalFilteredRecords, selectedStatusFilter]);

    // KPI Calculations
    const stats = useMemo(() => {
        const total = globalFilteredRecords.length;
        const noEjecutados = globalFilteredRecords.filter(r => getFolioStatus(r) === 'NO EJECUTADO').length;
        const vacios = globalFilteredRecords.filter(r => getFolioStatus(r) === 'VACÍO').length;
        const conInfo = globalFilteredRecords.filter(r => getFolioStatus(r) === 'CON INFO').length;
        return { total, vacios, conInfo, noEjecutados };
    }, [globalFilteredRecords]);

    const pieData = [
        { name: 'VACÍOS', value: stats.vacios, color: '#8c1c3f' },
        { name: 'NO EJECUTADOS', value: stats.noEjecutados, color: '#94a3b8' },
        { name: 'CON INFO', value: stats.conInfo, color: '#f59e0b' },
    ].filter(d => d.value > 0);

    // Format numbers
    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

    const renderCustomizedLabel = ({ cx, cy }) => (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
            <tspan x={cx} y={cy - 5} fontSize="28" fontWeight="bold" fill={isDarkMode ? '#f8fafc' : '#1e293b'}>{formatNumber(stats.total)}</tspan>
            <tspan x={cx} y={cy + 15} fontSize="10" fill="#64748b" fontWeight="bold">TOTAL</tspan>
        </text>
    );

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. Header
        doc.setTextColor(140, 28, 63); // #8c1c3f
        doc.setFontSize(22);
        doc.text('Resumen Ejecutivo de Auditoría Global', 20, 25);

        doc.setTextColor(100, 116, 139); // Slate-500
        doc.setFontSize(10);
        doc.text('GOBIERNO MUNICIPAL DE TOLUCA - CONTROL DE BACHEO', 20, 32);

        doc.setDrawColor(200, 200, 200);
        doc.line(20, 35, pageWidth - 20, 35);

        doc.setTextColor(30, 41, 59); // Slate-800
        doc.setFontSize(11);
        doc.text(`Total de registros auditados: ${stats.total}`, 20, 45);

        // 2. Summary Table (KPIs)
        const summaryData = [
            ['Categoría de Error', 'Cantidad', '% del Total'],
            ['Sin Carpeta / Vacía', stats.vacios, `${((stats.vacios / stats.total) * 100).toFixed(1)}%`],
            ['No Ejecutado', stats.noEjecutados, `${((stats.noEjecutados / stats.total) * 100).toFixed(1)}%`],
            ['Con Información', stats.conInfo, `${((stats.conInfo / stats.total) * 100).toFixed(1)}%`]
        ];

        autoTable(doc, {
            startY: 55,
            head: [summaryData[0]],
            body: summaryData.slice(1),
            theme: 'striped',
            headStyles: { fillColor: [140, 28, 63], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 20, right: 20 }
        });

        // 3. Breakdown by Company Table
        doc.setTextColor(140, 28, 63);
        doc.setFontSize(14);
        doc.text('Desglose por Empresa', 20, doc.lastAutoTable.finalY + 15);

        const companies = [...new Set(globalFilteredRecords.map(r => r.EMPRESA))].filter(Boolean).sort();
        const breakdownData = companies.map(emp => {
            const empRecords = globalFilteredRecords.filter(r => r.EMPRESA === emp);
            const v = empRecords.filter(r => getFolioStatus(r) === 'VACÍO').length;
            const n = empRecords.filter(r => getFolioStatus(r) === 'NO EJECUTADO').length;
            const c = empRecords.filter(r => getFolioStatus(r) === 'CON INFO').length;
            return [emp, n, v, c, empRecords.length];
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Empresa', 'No Ejecutados', 'Vacíos', 'Con Info', 'Total']],
            body: breakdownData,
            theme: 'grid',
            headStyles: { fillColor: [140, 28, 63], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold' }, 4: { textColor: [140, 28, 63], fontStyle: 'bold' } },
            margin: { left: 20, right: 20 }
        });

        doc.save(`Resumen_Auditoria_${new Date().getTime()}.pdf`);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 transition-colors duration-300 min-h-screen text-slate-800 dark:text-slate-100 font-sans">

            {/* Header Exacto Replicado */}
            <header className="header-gradient text-white shadow-lg">
                <div className="semi-circle-1"></div>
                <div className="semi-circle-2"></div>

                <div className="w-full max-w-[1536px] mx-auto px-4 lg:px-8 py-4 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                                    <span className="material-symbols-outlined text-3xl">account_balance</span>
                                </div>
                                <div>
                                    <h1 className="text-xl font-black tracking-tight leading-none uppercase">Toluca Capital</h1>
                                    <p className="text-[10px] font-medium tracking-[0.2em] opacity-80 uppercase">Ayuntamiento 2025-2027</p>
                                </div>
                            </div>
                            <div className="h-10 w-[1px] bg-white/20 hidden md:block"></div>
                            <div className="hidden md:block">
                                <h2 className="text-lg font-bold leading-tight">Supervisión Inteligente</h2>
                                <p className="text-sm font-light opacity-90">DIRECCIÓN DE OBRAS PÚBLICAS</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                title="Cambiar Tema"
                            >
                                <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
                            </button>
                            <div
                                className="flex items-center gap-3 pl-2 border-l border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => alert('La configuración de usuario aún está bajo construcción.')}
                                title="Perfil de Usuario"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold leading-none">Admin Usuario</p>
                                    <p className="text-[10px] opacity-70">Supervisor General</p>
                                </div>
                                <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-xl">person</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* SECCIÓN BODY (La Plantilla Exacta) */}
            <main className="w-full max-w-[1536px] mx-auto px-4 lg:px-8 py-8">

                {/* Sección A: Encabezado de Página y Filtros */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Panel de Control de Folios sin Información</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Estado actual de folios y seguimiento de incidencias administrativas.</p>
                    </div>

                    {/* Filtros */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        <div className="flex flex-col">
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Empresa</label>
                            <div className="relative">
                                <select
                                    className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded px-3 py-2 pr-8 focus:ring-primary focus:border-primary dark:text-white w-full sm:w-64 outline-none transition-colors"
                                    value={selectedEmpresa}
                                    onChange={(e) => setSelectedEmpresa(e.target.value)}
                                >
                                    <option value="ALL">ALL</option>
                                    {availableEmpresas.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-lg">expand_more</span>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Contrato</label>
                            <div className="relative">
                                <select
                                    className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded px-3 py-2 pr-8 focus:ring-primary focus:border-primary dark:text-white w-full sm:w-64 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    value={selectedContrato}
                                    onChange={(e) => setSelectedContrato(e.target.value)}
                                    disabled={selectedEmpresa === 'ALL' || availableContratos.length === 0}
                                >
                                    <option value="ALL">ALL</option>
                                    {availableContratos.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-lg">expand_more</span>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Buscar Folio</label>
                            <input
                                type="text"
                                placeholder="..."
                                className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded px-3 py-2 focus:ring-primary focus:border-primary dark:text-white w-full sm:w-64 outline-none transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Sección B: Tarjetas de Métricas (KPIs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* KPI 1 */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-[#8c1c3f]">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">TOTAL FOLIOS</h4>
                        <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{isLoading ? '...' : formatNumber(stats.total)}</p>
                    </div>
                    {/* KPI 2 */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-rose-500">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">FOLIOS VACÍOS</h4>
                        <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{isLoading ? '...' : formatNumber(stats.vacios)}</p>
                    </div>
                    {/* KPI 3 */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-slate-400">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">NO EJECUTADOS</h4>
                        <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{isLoading ? '...' : formatNumber(stats.noEjecutados)}</p>
                    </div>
                    {/* KPI 4 */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-amber-500">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CON INFORMACIÓN</h4>
                        <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{isLoading ? '...' : formatNumber(stats.conInfo)}</p>
                    </div>
                </div>

                {/* Sección C: Layout Asimétrico de Gráficas y Tabla */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* Columna Izquierda (Gráficas) */}
                    <div className="xl:col-span-1 flex flex-col gap-6">

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-6">Distribución de Errores</h4>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={60}
                                            outerRadius={90}
                                            dataKey="value"
                                            stroke="none"
                                            paddingAngle={2}
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                                                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                                                borderRadius: '8px',
                                                color: isDarkMode ? '#fff' : '#0f172a'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-3 mt-4">
                                {pieData.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs font-bold">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                                            <span className="text-slate-600 dark:text-slate-400 uppercase tracking-wider">{item.name}</span>
                                        </div>
                                        <span className="text-slate-800 dark:text-slate-200">{((item.value / (stats.total || 1)) * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Additional Info box formatted to match the style */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-3">
                            <span className="material-symbols-outlined text-[#8c1c3f] dark:text-rose-400">info</span>
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-1">Nota del Sistema</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Los datos reflejan cortes de supervisión al día de hoy. La actualización de archivos físicos puede demorar hasta 24 horas.
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Columna Derecha (Tabla/Registros) */}
                    <div className="xl:col-span-2">
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden h-full border-t-[0px]">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 z-20 relative">
                                <div className="flex flex-col gap-3">
                                    <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-slate-400">list_alt</span>
                                        Registros de Incidencias
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['ALL', 'VACÍO', 'NO EJECUTADO', 'CON INFO'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => setSelectedStatusFilter(status)}
                                                className={`px-3 py-1 text-[10px] font-black uppercase rounded shadow-sm transition-colors ${selectedStatusFilter === status
                                                    ? 'bg-[#8c1c3f] text-white'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                    }`}
                                            >
                                                {status === 'ALL' ? 'TODOS' : status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={handleExportPDF}
                                    className="px-3 py-1.5 bg-[#8c1c3f] hover:bg-[#6c1430] text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
                                >
                                    <span className="material-symbols-outlined text-lg">download</span>
                                    Exportar PDF
                                </button>
                            </div>

                            <div className="overflow-x-auto overflow-y-auto w-full h-[580px] max-h-[580px] custom-scrollbar bg-white dark:bg-slate-800">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(51,65,85,1)]">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Folio</th>
                                            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Estado</th>
                                            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold hidden sm:table-cell">Largo</th>
                                            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold hidden sm:table-cell">Ancho</th>
                                            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold hidden sm:table-cell">M2 Total</th>
                                            <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Empresa + Contrato</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {tableRecords.slice(0, 100).map((r, i) => {
                                            const status = getFolioStatus(r);
                                            const getBadge = (s) => {
                                                if (s === 'VACÍO') return <span className="px-2 py-1.5 rounded text-[9px] font-black uppercase text-white shadow-sm bg-rose-500">VACÍO</span>;
                                                if (s === 'NO EJECUTADO') return <span className="px-2 py-1.5 rounded text-[9px] font-black uppercase text-white shadow-sm bg-slate-400">NO EJECUTADO</span>;
                                                return <span className="px-2 py-1.5 rounded text-[9px] font-black uppercase text-slate-800 shadow-sm bg-amber-400">CON INFO</span>;
                                            };

                                            return (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td className="px-4 py-3 text-[13px] font-bold text-slate-800 dark:text-slate-200">
                                                        {r.FOLIO || r.FOLIOREF || '---'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {getBadge(status)}
                                                    </td>
                                                    <td className="px-4 py-3 hidden sm:table-cell">
                                                        <input
                                                            type="text"
                                                            value={r.LARGO || ''}
                                                            onChange={(e) => handleRecordUpdate(r.ID, 'LARGO', e.target.value)}
                                                            className="w-16 bg-transparent border-b border-slate-200 dark:border-slate-700 text-[12px] text-slate-600 dark:text-slate-400 focus:border-[#8c1c3f] outline-none transition-colors px-1"
                                                            placeholder="0.00"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 hidden sm:table-cell">
                                                        <input
                                                            type="text"
                                                            value={r.ANCHO || ''}
                                                            onChange={(e) => handleRecordUpdate(r.ID, 'ANCHO', e.target.value)}
                                                            className="w-16 bg-transparent border-b border-slate-200 dark:border-slate-700 text-[12px] text-slate-600 dark:text-slate-400 focus:border-[#8c1c3f] outline-none transition-colors px-1"
                                                            placeholder="0.00"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-[12px] font-bold text-[#8c1c3f] hidden sm:table-cell">
                                                        {r.M2TOTAL || '0.00'}
                                                    </td>
                                                    <td className="px-4 py-3 text-[12px] text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                                                        {r.EMPRESA && r.ID ? `${r.EMPRESA} - ${r.ID}` : r.EMPRESA || r.ID || 'N/A'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {tableRecords.length === 0 && !isLoading && (
                                            <tr>
                                                <td colSpan="5" className="px-4 py-12 text-center text-slate-400 text-sm">
                                                    No se encontraron registros activos.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center font-bold tracking-wide">
                                Mostrando primeros {Math.min(100, tableRecords.length)} de {tableRecords.length} resultados filtrados
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default DashboardEngine;
