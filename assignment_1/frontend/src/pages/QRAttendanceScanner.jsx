import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import OrganizerNav from '../components/OrganizerNav';
import '../components/user.css';
import { getEventById, scanAttendance, getAttendanceDashboard, manualOverrideAttendance, exportAttendanceCSV } from '../services/AuthAPI';
import { loadUser } from '../utils/profileStore';

export default function QRAttendanceScanner() {
    const navigate = useNavigate();
    const { eventId } = useParams();
    const user = useMemo(() => loadUser(), []);

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('scanner');

    // Scanner state
    const [scannerActive, setScannerActive] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [scanHistory, setScanHistory] = useState([]);
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const scanLockRef = useRef(false);
    const resumeTimerRef = useRef(null);

    // File upload state
    const fileInputRef = useRef(null);
    const [fileProcessing, setFileProcessing] = useState(false);

    // Dashboard state
    const [dashboard, setDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);

    // Manual override state
    const [overrideForm, setOverrideForm] = useState({
        ticketId: '', participantName: '', participantEmail: '', reason: ''
    });
    const [overrideMsg, setOverrideMsg] = useState(null);

    useEffect(() => {
        if (!user || user.role !== 'organizer') {
            navigate('/');
            return;
        }
        loadEventData();
        fetchDashboard();
    }, [eventId]);

    const loadEventData = async () => {
        try {
            const response = await getEventById(eventId);
            setEvent(response.data.event);
        } catch (error) {
            console.error('Failed to load event:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboard = async () => {
        setDashboardLoading(true);
        try {
            const response = await getAttendanceDashboard(eventId);
            setDashboard(response.data.dashboard);
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setDashboardLoading(false);
        }
    };

    // Parse QR code text — new QRs contain JSON {ticketId, name, email}, old QRs are plain ticket IDs
    const parseQRPayload = (rawText) => {
        const cleanedRaw = String(rawText || '').trim();
        if (!cleanedRaw) return { ticketId: '', name: '', email: '' };

        try {
            const parsed = JSON.parse(cleanedRaw);
            if (typeof parsed === 'string') {
                return { ticketId: parsed.trim(), name: '', email: '' };
            }
            if (parsed.ticketId) return parsed;
        } catch { }

        const ticketIdMatch = cleanedRaw.match(/ticketId\s*[:=]\s*["']?([A-Za-z0-9-]+)/i);
        if (ticketIdMatch?.[1]) {
            return { ticketId: ticketIdMatch[1], name: '', email: '' };
        }

        // Fallback: treat raw text as plain ticket ID
        return { ticketId: cleanedRaw.replace(/^"|"$/g, ''), name: '', email: '' };
    };

    // Process a scanned QR result
    const processTicketScan = useCallback(async (rawText, method = 'QR Scan') => {
        const { ticketId, name: participantName, email: participantEmail } = parseQRPayload(rawText);

        if (!ticketId || !ticketId.trim()) {
            const result = {
                type: 'error',
                ticketId: '',
                message: 'Invalid QR payload. Could not extract ticket ID.',
                participantName: '',
                participantEmail: '',
                timestamp: new Date().toLocaleTimeString(),
                method
            };
            setScanResult(result);
            setScanHistory(prev => [result, ...prev]);
            return;
        }

        try {
            const response = await scanAttendance({
                eventId,
                ticketId,
                participantName,
                participantEmail
            });

            const result = {
                type: 'success',
                ticketId,
                message: response.data.message,
                participantName: response.data.attendance?.participantName || participantName || 'Unknown',
                participantEmail: response.data.attendance?.participantEmail || participantEmail || '',
                timestamp: new Date().toLocaleTimeString(),
                method
            };
            setScanResult(result);
            setScanHistory(prev => [result, ...prev]);
            fetchDashboard();
        } catch (error) {
            const isDuplicate = error.response?.status === 409;
            const result = {
                type: isDuplicate ? 'duplicate' : 'error',
                ticketId,
                message: error.response?.data?.message || 'Scan failed',
                participantName: error.response?.data?.originalScan?.participantName || participantName || '',
                participantEmail: error.response?.data?.originalScan?.participantEmail || participantEmail || '',
                timestamp: new Date().toLocaleTimeString(),
                method
            };
            setScanResult(result);
            setScanHistory(prev => [result, ...prev]);
        }
    }, [eventId]);

    // Start camera scanner
    const startScanner = async () => {
        if (scannerActive || html5QrCodeRef.current) return;

        setScanResult(null);
        setScannerActive(true);

        try {
            const { Html5Qrcode } = await import('html5-qrcode');

            await new Promise((resolve) => setTimeout(resolve, 30));

            const html5QrCode = new Html5Qrcode('qr-reader');
            html5QrCodeRef.current = html5QrCode;

            const cameras = await Html5Qrcode.getCameras();
            if (!cameras || cameras.length === 0) {
                throw new Error('No camera devices found');
            }

            const preferredCamera =
                cameras.find((camera) => /back|rear|environment/i.test(camera.label)) || cameras[0];

            await html5QrCode.start(
                { deviceId: { exact: preferredCamera.id } },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {
                    if (scanLockRef.current) return;
                    scanLockRef.current = true;

                    try {
                        await html5QrCode.pause(true);
                        await processTicketScan(decodedText, 'Camera');
                    } finally {
                        if (resumeTimerRef.current) {
                            clearTimeout(resumeTimerRef.current);
                        }
                        resumeTimerRef.current = setTimeout(async () => {
                            try {
                                if (html5QrCodeRef.current) {
                                    await html5QrCodeRef.current.resume();
                                }
                            } catch { }
                            scanLockRef.current = false;
                        }, 1200);
                    }
                },
                () => { } // ignore scan errors
            );
        } catch (error) {
            console.error('Failed to start scanner:', error);
            setScannerActive(false);
            if (html5QrCodeRef.current) {
                try {
                    await html5QrCodeRef.current.clear();
                } catch { }
                html5QrCodeRef.current = null;
            }
            setScanResult({
                type: 'error',
                ticketId: '',
                message: `Failed to access camera. ${error?.message || 'Please check permissions or try file upload.'}`,
                timestamp: new Date().toLocaleTimeString(),
                method: 'Camera'
            });
        }
    };

    // Stop camera scanner
    const stopScanner = async () => {
        if (resumeTimerRef.current) {
            clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = null;
        }
        scanLockRef.current = false;

        try {
            if (html5QrCodeRef.current) {
                try {
                    await html5QrCodeRef.current.stop();
                } catch { }
                await html5QrCodeRef.current.clear();
                html5QrCodeRef.current = null;
            }
        } catch { }
        setScannerActive(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => { stopScanner(); };
    }, []);

    // File upload handler
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileProcessing(true);
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const html5QrCode = new Html5Qrcode('qr-file-reader');
            const result = await html5QrCode.scanFile(file, true);
            html5QrCode.clear();
            await processTicketScan(result, 'File Upload');
        } catch (error) {
            setScanResult({
                type: 'error',
                ticketId: '',
                message: 'Could not read QR code from image. Please try a clearer image.',
                timestamp: new Date().toLocaleTimeString(),
                method: 'File Upload'
            });
        } finally {
            setFileProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Manual override submit
    const handleManualOverride = async (e) => {
        e.preventDefault();
        setOverrideMsg(null);

        if (!overrideForm.ticketId.trim() || !overrideForm.reason.trim()) {
            setOverrideMsg({ type: 'error', text: 'Ticket ID and reason are required.' });
            return;
        }

        try {
            const response = await manualOverrideAttendance({
                eventId,
                ticketId: overrideForm.ticketId.trim(),
                participantName: overrideForm.participantName.trim(),
                participantEmail: overrideForm.participantEmail.trim(),
                reason: overrideForm.reason.trim()
            });

            setOverrideMsg({ type: 'success', text: response.data.message });
            setScanHistory(prev => [{
                type: 'override',
                ticketId: overrideForm.ticketId,
                message: 'Manual override applied',
                participantName: overrideForm.participantName,
                participantEmail: overrideForm.participantEmail,
                timestamp: new Date().toLocaleTimeString(),
                method: 'Manual Override'
            }, ...prev]);
            setOverrideForm({ ticketId: '', participantName: '', participantEmail: '', reason: '' });
            fetchDashboard();
        } catch (error) {
            const isDuplicate = error.response?.status === 409;
            setOverrideMsg({
                type: isDuplicate ? 'duplicate' : 'error',
                text: error.response?.data?.message || 'Override failed'
            });
        }
    };

    // CSV export
    const handleExportCSV = async () => {
        try {
            const response = await exportAttendanceCSV(eventId);
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${event?.eventName || 'attendance'}-report.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="user-root">
                <OrganizerNav />
                <header className="user-header"><h1>Loading...</h1></header>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="user-root">
                <OrganizerNav />
                <header className="user-header"><h1>Event Not Found</h1></header>
            </div>
        );
    }

    const resultColors = { success: '#22c55e', duplicate: '#eab308', error: '#ef4444', override: '#3b82f6' };

    return (
        <div className="user-root">
            <OrganizerNav />

            <header className="user-header">
                <h1>📷 Attendance Scanner</h1>
                <div className="header-actions">
                    <button className="secondary-btn" onClick={() => navigate(`/organizer-event/${eventId}`)}>
                        ← Back to Event
                    </button>
                </div>
            </header>

            <main className="user-main user-main-wide">
                <section className="content">
                    {/* Event Info Bar */}
                    <div className="section-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none' }}>
                        <h3 style={{ color: '#fff', margin: 0 }}>{event.eventName}</h3>
                        <p style={{ opacity: 0.9, margin: '4px 0 0' }}>
                            {new Date(event.event_start).toLocaleDateString()} — {event.type} · {event.eligibility}
                        </p>
                    </div>

                    {/* Dashboard Stats */}
                    <div className="stats-grid">
                        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                            <h4>Total Registered</h4>
                            <p className="stat-number">{dashboard?.totalRegistered ?? '—'}</p>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
                            <h4>Scanned In</h4>
                            <p className="stat-number" style={{ color: '#22c55e' }}>{dashboard?.totalScanned ?? '—'}</p>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '4px solid #eab308' }}>
                            <h4>Not Yet Scanned</h4>
                            <p className="stat-number" style={{ color: '#eab308' }}>{dashboard?.notScanned ?? '—'}</p>
                        </div>
                        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                            <h4>Attendance Rate</h4>
                            <p className="stat-number" style={{ color: '#8b5cf6' }}>{dashboard?.attendanceRate ?? 0}%</p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="section-card">
                        <div className="tabs" style={{ marginBottom: '16px' }}>
                            {['scanner', 'dashboard', 'override'].map(tab => (
                                <button
                                    key={tab}
                                    className={activeTab === tab ? 'tab active' : 'tab'}
                                    onClick={() => { setActiveTab(tab); if (tab !== 'scanner') stopScanner(); }}
                                >
                                    {tab === 'scanner' ? '📷 Scanner' : tab === 'dashboard' ? '📊 Dashboard' : '✏️ Manual Override'}
                                </button>
                            ))}
                        </div>

                        {/* ===== SCANNER TAB ===== */}
                        {activeTab === 'scanner' && (
                            <div>
                                {/* Camera Scanner */}
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        {!scannerActive ? (
                                            <button className="primary-btn" onClick={startScanner}>📷 Start Camera Scanner</button>
                                        ) : (
                                            <button className="secondary-btn" onClick={stopScanner} style={{ background: '#ef4444', color: '#fff', border: 'none' }}>⏹ Stop Scanner</button>
                                        )}
                                        <label className="secondary-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            📁 Upload QR Image
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                        <button className="small-btn" onClick={handleExportCSV}>📥 Export CSV</button>
                                    </div>

                                    {fileProcessing && <p className="muted">Processing image...</p>}

                                    {/* Camera view */}
                                    <div
                                        id="qr-reader"
                                        ref={scannerRef}
                                        style={{
                                            width: '100%',
                                            maxWidth: '400px',
                                            margin: '0 auto',
                                            display: scannerActive ? 'block' : 'none',
                                            minHeight: scannerActive ? '280px' : 0,
                                            background: '#000',
                                            borderRadius: '12px',
                                            overflow: 'hidden'
                                        }}
                                    />
                                    {/* Hidden element for file scanning */}
                                    <div id="qr-file-reader" style={{ display: 'none' }} />
                                </div>

                                {/* Scan Result */}
                                {scanResult && (
                                    <div style={{
                                        padding: '16px',
                                        borderRadius: '10px',
                                        marginBottom: '16px',
                                        background: `${resultColors[scanResult.type]}15`,
                                        border: `2px solid ${resultColors[scanResult.type]}`,
                                        animation: 'fadeIn 0.3s ease'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '1.4em' }}>
                                                {scanResult.type === 'success' ? '✅' : scanResult.type === 'duplicate' ? '⚠️' : '❌'}
                                            </span>
                                            <strong style={{ color: resultColors[scanResult.type] }}>
                                                {scanResult.type === 'success' ? 'Attendance Marked!' : scanResult.type === 'duplicate' ? 'Duplicate Scan' : 'Scan Error'}
                                            </strong>
                                        </div>
                                        <p className="muted" style={{ margin: '4px 0' }}>{scanResult.message}</p>
                                        {scanResult.ticketId && <p className="muted" style={{ margin: '2px 0' }}>Ticket: <strong>{scanResult.ticketId}</strong></p>}
                                        {scanResult.participantName && <p className="muted" style={{ margin: '2px 0' }}>Participant: {scanResult.participantName}</p>}
                                        <p className="muted" style={{ margin: '2px 0', fontSize: '0.85em' }}>{scanResult.method} · {scanResult.timestamp}</p>
                                    </div>
                                )}

                                {/* Scan History */}
                                {scanHistory.length > 0 && (
                                    <div>
                                        <div className="section-title">
                                            <h4>Scan History ({scanHistory.length})</h4>
                                            <button className="small-btn" onClick={() => setScanHistory([])}>Clear</button>
                                        </div>
                                        <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            <div className="table-header">
                                                <span>Ticket ID</span>
                                                <span>Name</span>
                                                <span>Status</span>
                                                <span>Method</span>
                                                <span>Time</span>
                                            </div>
                                            {scanHistory.map((item, idx) => (
                                                <div key={idx} className="table-row">
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{item.ticketId || '—'}</span>
                                                    <span>{item.participantName || '—'}</span>
                                                    <span>
                                                        <span className={`badge ${item.type === 'success' ? 'attended' : item.type === 'duplicate' ? 'pending' : ''}`}
                                                            style={item.type === 'error' ? { background: '#fef2f2', color: '#ef4444' } : item.type === 'override' ? { background: '#eff6ff', color: '#3b82f6' } : {}}>
                                                            {item.type === 'success' ? '✓ Marked' : item.type === 'duplicate' ? '⚠ Duplicate' : item.type === 'override' ? '✏ Override' : '✗ Error'}
                                                        </span>
                                                    </span>
                                                    <span className="muted">{item.method}</span>
                                                    <span className="muted">{item.timestamp}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ===== DASHBOARD TAB ===== */}
                        {activeTab === 'dashboard' && (
                            <div>
                                <div className="section-title">
                                    <h4>Scanned Participants</h4>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="small-btn" onClick={fetchDashboard} disabled={dashboardLoading}>
                                            🔄 Refresh
                                        </button>
                                        <button className="small-btn" onClick={handleExportCSV}>📥 Export CSV</button>
                                    </div>
                                </div>

                                {dashboardLoading ? (
                                    <p className="muted">Loading dashboard...</p>
                                ) : dashboard?.scannedList?.length > 0 ? (
                                    <div className="table-container">
                                        <div className="table-header">
                                            <span>Ticket ID</span>
                                            <span>Name</span>
                                            <span>Email</span>
                                            <span>Scanned At</span>
                                            <span>Type</span>
                                        </div>
                                        {dashboard.scannedList.map((record) => (
                                            <div key={record.id} className="table-row">
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.85em' }}>{record.ticketId}</span>
                                                <span>{record.participantName || 'N/A'}</span>
                                                <span>{record.participantEmail || 'N/A'}</span>
                                                <span>{new Date(record.scannedAt).toLocaleString()}</span>
                                                <span>
                                                    {record.isManualOverride ? (
                                                        <span className="badge" style={{ background: '#eff6ff', color: '#3b82f6' }}
                                                            title={record.overrideReason}>
                                                            ✏️ Override
                                                        </span>
                                                    ) : (
                                                        <span className="badge attended">📷 QR Scan</span>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="muted" style={{ textAlign: 'center', padding: '20px' }}>No attendance records yet. Start scanning!</p>
                                )}
                            </div>
                        )}

                        {/* ===== MANUAL OVERRIDE TAB ===== */}
                        {activeTab === 'override' && (
                            <div>
                                <div style={{
                                    padding: '12px 16px',
                                    background: '#fffbeb',
                                    border: '1px solid #f59e0b',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontSize: '0.9em'
                                }}>
                                    ⚠️ <strong>Audit Notice:</strong> Manual overrides are logged with your identity and the given reason for audit purposes.
                                </div>

                                <form onSubmit={handleManualOverride}>
                                    <div className="form-row" style={{ marginBottom: '12px' }}>
                                        <label className="filter-label" htmlFor="override-ticketId">Ticket ID *</label>
                                        <input
                                            id="override-ticketId"
                                            className="input"
                                            placeholder="e.g. TKT-ABC123-XYZ"
                                            value={overrideForm.ticketId}
                                            onChange={e => setOverrideForm(prev => ({ ...prev, ticketId: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="form-row" style={{ marginBottom: '12px' }}>
                                        <label className="filter-label" htmlFor="override-name">Participant Name</label>
                                        <input
                                            id="override-name"
                                            className="input"
                                            placeholder="Full name"
                                            value={overrideForm.participantName}
                                            onChange={e => setOverrideForm(prev => ({ ...prev, participantName: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-row" style={{ marginBottom: '12px' }}>
                                        <label className="filter-label" htmlFor="override-email">Participant Email</label>
                                        <input
                                            id="override-email"
                                            className="input"
                                            type="email"
                                            placeholder="email@example.com"
                                            value={overrideForm.participantEmail}
                                            onChange={e => setOverrideForm(prev => ({ ...prev, participantEmail: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-row" style={{ marginBottom: '16px' }}>
                                        <label className="filter-label" htmlFor="override-reason">Reason for Override *</label>
                                        <textarea
                                            id="override-reason"
                                            className="input"
                                            placeholder="Explain why manual override is needed (required for audit)"
                                            rows={3}
                                            value={overrideForm.reason}
                                            onChange={e => setOverrideForm(prev => ({ ...prev, reason: e.target.value }))}
                                            required
                                            style={{ resize: 'vertical' }}
                                        />
                                    </div>

                                    {overrideMsg && (
                                        <p style={{
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            marginBottom: '12px',
                                            background: overrideMsg.type === 'success' ? '#f0fdf4' : overrideMsg.type === 'duplicate' ? '#fffbeb' : '#fef2f2',
                                            color: overrideMsg.type === 'success' ? '#16a34a' : overrideMsg.type === 'duplicate' ? '#d97706' : '#dc2626',
                                            border: `1px solid ${overrideMsg.type === 'success' ? '#bbf7d0' : overrideMsg.type === 'duplicate' ? '#fde68a' : '#fecaca'}`
                                        }}>
                                            {overrideMsg.text}
                                        </p>
                                    )}

                                    <button type="submit" className="primary-btn">
                                        ✏️ Apply Manual Override
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
