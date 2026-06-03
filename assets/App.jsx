import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Settings, Calendar as CalendarIcon, FileText, ChevronLeft, ChevronRight, Plus, Sun, Moon } from 'lucide-react';

// PATRONES DE IIPP ORDENADOS LÓGICAMENTE
const PATRONES_INICIALES = [
  { id: 'p4', nombre: '2x3 (T-MN-LLL)', secuencia: [['T'], ['M', 'N'], ['L'], ['L'], ['L']] },
  { id: 'p5', nombre: '2x3 (MT-N-LLL)', secuencia: [['M', 'T'], ['N'], ['L'], ['L'], ['L']] },
  { id: 'p3', nombre: '2x4 (MT-MT-LLLL)', secuencia: [['M', 'T'], ['M', 'T'], ['L'], ['L'], ['L'], ['L']] },
  { id: 'p6', nombre: '4x4 (T-T-M-MN-LLLL)', secuencia: [['T'], ['T'], ['M'], ['M', 'N'], ['L'], ['L'], ['L'], ['L']] },
  { id: 'p1', nombre: '3x5 (MT-MT-N-LLLLL)', secuencia: [['M', 'T'], ['M', 'T'], ['N'], ['L'], ['L'], ['L'], ['L'], ['L']] },
  { id: 'p2', nombre: '3x5 (T-MT-MN-LLLLL)', secuencia: [['T'], ['M', 'T'], ['M', 'N'], ['L'], ['L'], ['L'], ['L'], ['L']] },
  { id: 'p7', nombre: '3x5 (MT-L-MT-N-LLLL)', secuencia: [['M', 'T'], ['L'], ['M', 'T'], ['N'], ['L'], ['L'], ['L'], ['L']] }
];

const EVENTOS_PREDEFINIDOS = [
  { nombre: 'Elecciones', emoji: '🗳️' },
  { nombre: 'Entrevista', emoji: '🗣️' },
  { nombre: 'Fiesta trabajo', emoji: '🎉' },
  { nombre: 'Formación', emoji: '🎓' },
  { nombre: 'Inspección', emoji: '🔍' },
  { nombre: 'ITV', emoji: '🚗' },
  { nombre: 'Juicio', emoji: '⚖️' },
  { nombre: 'Médico', emoji: '🩺' },
  { nombre: 'Taller', emoji: '🔧' }
];

// FUNCIÓN PARA CARGAR DATOS DE FORMA SÍNCRONA

const cargarDatosIniciales = () => {
  try {

    //localStorage.removeItem('shiftapp_notificaciones');
    //localStorage.removeItem('shiftapp_ultimaAlerta');

    const savedPatrones = localStorage.getItem('shiftapp_patrones');
    const savedPatronActivo = localStorage.getItem('shiftapp_patronActivo');
    const savedFechaInicio = localStorage.getItem('shiftapp_fechaInicio');
    const savedVacacionesTotales = localStorage.getItem('shiftapp_vacacionesTotales');
    const savedIsOnboarded = localStorage.getItem('shiftapp_isOnboarded');
    const savedExcepciones = localStorage.getItem('shiftapp_excepciones');
    const savedDarkMode = localStorage.getItem('shiftapp_darkmode');
    const savedNotificaciones = localStorage.getItem('shiftapp_notificaciones');
    const savedResumenInicio = localStorage.getItem('shiftapp_resumenInicio');
    const savedResumenFin = localStorage.getItem('shiftapp_resumenFin');
    const savedUltimaAlerta = localStorage.getItem('shiftapp_ultimaAlerta');

    let patrones = PATRONES_INICIALES;
    if (savedPatrones) {
      try {
        patrones = JSON.parse(savedPatrones);
      } catch (e) {
        console.error('Error parseando patrones:', e);
        document.body.innerHTML = `
        <div style="background: black; color: red; padding: 20px;">
          <h2>❌ ERROR EN cargarDatosIniciales</h2>
          <p>${error.message}</p>
          <pre>${error.stack}</pre>
        </div>
      `;
      throw error;
      }
    }

    let excepciones = {};
    if (savedExcepciones) {
      try {
        excepciones = JSON.parse(savedExcepciones);
      } catch (e) {
        console.error('Error parseando excepciones:', e);
        // No lanzamos el error, usamos el valor por defecto
      }
    }

    return {
      patrones: patrones,
      patronActivoId: (savedPatronActivo && patrones.some(p => p.id === savedPatronActivo)) 
        ? savedPatronActivo 
        : (patrones[0]?.id),
      fechaInicio: savedFechaInicio || new Date().toISOString().split('T')[0],
      vacacionesTotales: savedVacacionesTotales ? Number(savedVacacionesTotales) : 45,
      excepciones: excepciones,
      isOnboarded: savedIsOnboarded === 'true',
      darkMode: savedDarkMode === 'true',
      notificacionesActivas: savedNotificaciones === 'true',
      resumenInicio: savedResumenInicio || '2026-01-01',
      resumenFin: savedResumenFin || '2026-12-31',
      ultimaAlerta: savedUltimaAlerta || null
    };
  } catch (error) {
    console.error('Error en cargarDatosIniciales:', error);
    // Retornar valores por defecto
    return {
      patrones: PATRONES_INICIALES,
      patronActivoId: PATRONES_INICIALES[0].id,
      fechaInicio: new Date().toISOString().split('T')[0],
      vacacionesTotales: 45,
      excepciones: {},
      isOnboarded: false,
      darkMode: false,
      notificacionesActivas: false,
      resumenInicio: '2026-01-01',
      resumenFin: '2026-12-31',
      ultimaAlerta: null
    };
  }
};

// DÍAS ESPECIALES FIJOS (MM-DD)
const DIAS_FIJOS = {
  '05-01': { emoji: '👷', nombre: '1º de Mayo' },
  '08-15': { emoji: '👑', nombre: 'Virgen de agosto' },
  '10-12': { emoji: '🥘', nombre: 'Día de la Hispanidad' },
  '11-01': { emoji: '💀', nombre: 'Todos los Santos' },
  '12-06': { emoji: '📜', nombre: 'Día de la Constitución' },
  '12-08': { emoji: '⭐', nombre: 'Inmaculada' },
  '12-24': { emoji: '🎄', nombre: 'Nochebuena' },
  '12-25': { emoji: '🎅', nombre: 'Navidad' },
  '12-31': { emoji: '🍇', nombre: 'Nochevieja' },
  '01-01': { emoji: '🎉', nombre: 'Año Nuevo' },
  '01-05': { emoji: '👑', nombre: 'Noche de Reyes' },
  '01-06': { emoji: '🎁', nombre: 'Día de Reyes' }
};

// CACHE para Semana Santa (no recalcular cada vez)
const CACHE_SEMANA_SANTA = {};

// Algoritmo de Gauss para calcular Semana Santa
const calcularSemanaSanta = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  
  // Domingo de Pascua
  const pascua = new Date(year, mes - 1, dia);
  
  // Jueves Santo (Pascua - 3 días)
  const juevesSanto = new Date(pascua);
  juevesSanto.setDate(pascua.getDate() - 3);
  
  // Viernes Santo (Pascua - 2 días)
  const viernesSanto = new Date(pascua);
  viernesSanto.setDate(pascua.getDate() - 2);
  
  return { juevesSanto, viernesSanto };
};

// Función con cache - solo calcula una vez por año
const getSemanaSanta = (year) => {
  if (!CACHE_SEMANA_SANTA[year]) {
    CACHE_SEMANA_SANTA[year] = calcularSemanaSanta(year);
  }
  return CACHE_SEMANA_SANTA[year];
};

// Obtener día especial (fijo o variable)
const getDiaEspecial = (date) => {
  const year = date.getFullYear();
  const mesDia = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  if (DIAS_FIJOS[mesDia]) {
    return DIAS_FIJOS[mesDia];
  }
  
  try {
    const { juevesSanto, viernesSanto } = getSemanaSanta(year);
    const fechaStr = date.toISOString().split('T')[0];
    const juevesStr = juevesSanto.toISOString().split('T')[0];
    const viernesStr = viernesSanto.toISOString().split('T')[0];
    
    if (fechaStr === juevesStr) {
      return { emoji: '✝️', nombre: 'Jueves Santo' };
    }
    if (fechaStr === viernesStr) {
      return { emoji: '✝️', nombre: 'Viernes Santo' };
    }
  } catch (error) {
    console.error('Error calculando Semana Santa:', error);
  }
  return null;
};

// Mostrar errores de inicialización antes de React
window.addEventListener('error', (event) => {
  document.body.innerHTML = `
    <div style="background: black; color: red; padding: 20px; font-family: monospace;">
      <h2>🔥 ERROR GLOBAL</h2>
      <p>${event.error?.message || event.message}</p>
      <pre>${event.error?.stack || ''}</pre>
    </div>
  `;
});

// Capturar promesas rechazadas
window.addEventListener('unhandledrejection', (event) => {
  document.body.innerHTML = `
    <div style="background: black; color: red; padding: 20px; font-family: monospace;">
      <h2>🔥 PROMESA RECHAZADA</h2>
      <p>${event.reason?.message || event.reason}</p>
      <pre>${event.reason?.stack || ''}</pre>
    </div>
  `;
});

export default function ShiftApp() {

  try{

  // ========== 1. TODOS LOS useState ==========
  const datosIniciales = useMemo(() => {
    try {
      return cargarDatosIniciales();
    } catch (error) {
      document.body.innerHTML = `
        <div style="background: black; color: red; padding: 20px;">
          <h2>❌ ERROR EN useMemo</h2>
          <p>${error.message}</p>
        </div>
      `;
      throw error;
    }
  }, []);
  
  /*control de errores temporal solo para dev*/
  const [errorTemporal, setErrorTemporal] = useState(null);
  

  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(datosIniciales.darkMode);
  const [patrones, setPatrones] = useState(datosIniciales.patrones);
  const [patronActivoId, setPatronActivoId] = useState(datosIniciales.patronActivoId);
  const [fechaInicio, setFechaInicio] = useState(datosIniciales.fechaInicio);
  const [vacacionesTotales, setVacacionesTotales] = useState(datosIniciales.vacacionesTotales);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [excepciones, setExcepciones] = useState(datosIniciales.excepciones);
  const [showConfig, setShowConfig] = useState(false);
  const [showResumen, setShowResumen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedDia, setSelectedDia] = useState(null);
  const [nuevoNombrePatron, setNuevoNombrePatron] = useState('');
  const [nuevaSecuenciaStr, setNuevaSecuenciaStr] = useState('M/T/N/L');
  const [excTipo, setExcTipo] = useState('V');
  const [excSubTiposMultiC, setExcSubTiposMultiC] = useState(['M']);
  const [excSubTiposMultiE, setExcSubTiposMultiE] = useState(['M']);
  const [excNotas, setExcNotas] = useState({});
  const [resumenInicio, setResumenInicio] = useState(datosIniciales.resumenInicio);
  const [resumenFin, setResumenFin] = useState(datosIniciales.resumenFin);
  const [isOnboarded, setIsOnboarded] = useState(datosIniciales.isOnboarded);
  const [fechaBusqueda, setFechaBusqueda] = useState('');
  const [notificacionesActivas, setNotificacionesActivas] = useState(datosIniciales.notificacionesActivas);
  const [ultimaNotificacion, setUltimaNotificacion] = useState(null);
  
  // Estados para el swipe
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [animateOutDir, setAnimateOutDir] = useState(null);
  const [touchStartTime, setTouchStartTime] = useState(null);

  // Estados para las modales
  const [modalClosing, setModalClosing] = useState(false);
  const [configClosing, setConfigClosing] = useState(false);
  const [resumenClosing, setResumenClosing] = useState(false);
  const [resetClosing, setResetClosing] = useState(false);

  // Estados para festivos y eventos
  const [festivos, setFestivos] = useState(() => {
    const saved = localStorage.getItem('shiftapp_festivos');
    return saved ? JSON.parse(saved) : {};
  });
  const [eventos, setEventos] = useState(() => {
    const saved = localStorage.getItem('shiftapp_eventos');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [nuevoFestivoNombre, setNuevoFestivoNombre] = useState('');
  const [nuevoFestivoEmoji, setNuevoFestivoEmoji] = useState('🎉');
  
  const [nuevoEventoNombre, setNuevoEventoNombre] = useState('');
  const [nuevoEventoEmoji, setNuevoEventoEmoji] = useState('📒');
  const [nuevoEventoHora, setNuevoEventoHora] = useState(''); 
  const [nuevoEventoRepite, setNuevoEventoRepite] = useState(false);
  const [nuevoEventoFrecuencia, setNuevoEventoFrecuencia] = useState(7);
  const [nuevoEventoFechaFin, setNuevoEventoFechaFin] = useState('');
  
  // estado modal unificado
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionModalData, setActionModalData] = useState(null);
  const [actionModalClosing, setActionModalClosing] = useState(false);

  // Estados para pulsación larga
  const [pressTimer, setPressTimer] = useState(null);

  // Obtener emojis adicionales de festivos y eventos
  const getEmojisAdicionales = (fechaStr) => {
    const emojis = [];
    const festivo = festivos[fechaStr];
    const eventosDia = eventos[fechaStr] || [];
    
    if (festivo) emojis.push(festivo.emoji);
    eventosDia.forEach(e => emojis.push(e.emoji));
    
    return emojis;
  };

  // Funciones para eventos repetidos
  const getFechasEvento = (evento, fechaInicio) => {
    if (!evento.repite) return [fechaInicio];
    
    const fechas = [];
    const inicio = new Date(fechaInicio);
    const fin = new Date(evento.fechaFin);
    let current = new Date(inicio);
    
    while (current <= fin) {
      fechas.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + evento.frecuencia);
    }
    return fechas;
  };

  const guardarEvento = (fechaBase, eventoData) => {
    const fechas = getFechasEvento(eventoData, fechaBase);
    const nuevosEventos = { ...eventos };
    
    fechas.forEach(fecha => {
      if (!nuevosEventos[fecha]) nuevosEventos[fecha] = [];
      const index = nuevosEventos[fecha].findIndex(e => e.id === eventoData.id);
      const eventoConHora = {
        ...eventoData,
        hora: eventoData.hora || null
      };
      if (index >= 0) {
        nuevosEventos[fecha][index] = eventoConHora;
      } else {
        nuevosEventos[fecha].push(eventoConHora);
      }
    });
    
    setEventos(nuevosEventos);
  };
  const eliminarEventoCompleto = (eventoId, fechaBase, eventoData) => {
    const fechas = eventoData.repite 
      ? getFechasEvento(eventoData, fechaBase)
      : [fechaBase];
    
    const nuevosEventos = { ...eventos };
    fechas.forEach(fecha => {
      if (nuevosEventos[fecha]) {
        nuevosEventos[fecha] = nuevosEventos[fecha].filter(e => e.id !== eventoId);
        if (nuevosEventos[fecha].length === 0) {
          delete nuevosEventos[fecha];
        }
      }
    });
    setEventos(nuevosEventos);
  };

  // Para el selector de horas
  const generarOpcionesHoras = () => {
    const opciones = [];
    for (let h = 6; h < 24; h++) {
      for (let m = 0; m < 60; m += 10) {
        const hora = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        opciones.push(<option key={hora} value={hora}>{hora}</option>);
      }
    }
    return opciones;
  };

  // Cerrar modal
  const cerrarModal = (setter, closingSetter) => {
    closingSetter(true);
    setTimeout(() => {
      setter(false);
      closingSetter(false);
    }, 150);
  };

  const esHoy = (date) => {
    const hoy = new Date();
    return date.getDate() === hoy.getDate() &&
           date.getMonth() === hoy.getMonth() &&
           date.getFullYear() === hoy.getFullYear();
  };

  const irAFecha = () => {
    if (fechaBusqueda) {
      const [year, month, day] = fechaBusqueda.split('-');
      setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
      setFechaBusqueda('');
    }
  };

  const enviarNotificacion = async (titulo, cuerpo, id) => {
    if (!notificacionesActivas) return;
    if (ultimaNotificacion === id) return;
    
    setUltimaNotificacion(id);
    
    try {
      // Intentar usar Service Worker primero
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(titulo, {
          body: cuerpo,
          icon: './icon-192.png',
          badge: './icon-192.png',
          vibrate: [200, 100, 200],
          requireInteraction: true
        });
        return;
      }
      
      // Fallback a Notification API (solo funciona en PC)
      if (Notification.permission === 'granted') {
        new Notification(titulo, { body: cuerpo, icon: './icon-192.png' });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(titulo, { body: cuerpo, icon: './icon-192.png' });
        }
      }
    } catch (error) {
      console.error('Error al enviar notificación:', error);
    }
  };

  const buscarProximoCambio = useCallback(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Calcular la fecha de mañana
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    const mananaStr = manana.toISOString().split('T')[0];
    
    let detalles = null;
    let tipo = null;
    
    // Buscar si hay algún cambio o turno extra para mañana
    for (const [fechaStr, exc] of Object.entries(excepciones)) {
      if (fechaStr !== mananaStr) continue; // Solo mirar mañana
      
      const esCambio = (typeof exc.tipo === 'string' && exc.tipo.startsWith('C_')) ||
        (Array.isArray(exc.tipo) && exc.tipo.includes('C'));
      const esTurnoExtra = (typeof exc.tipo === 'string' && exc.tipo.startsWith('E_')) ||
        (Array.isArray(exc.tipo) && exc.tipo.includes('E'));
      
      if (esCambio || esTurnoExtra) {
        tipo = esCambio ? 'C' : 'E';
        
        // Extraer información de notas
        const notas = exc.notas;
        let personas = '';
        if (typeof notas === 'object') {
          personas = Object.values(notas).filter(n => n).join(' y ');
        } else if (typeof notas === 'string') {
          personas = notas;
        }
        
        let turnosInfo = '';
        if (esCambio && typeof exc.tipo === 'string' && exc.tipo.startsWith('C_')) {
          const turnosCambio = exc.tipo.substring(2);
          turnosInfo = `Turnos afectados: ${turnosCambio.split('').join('/')}`;
        } else if (esCambio && Array.isArray(exc.tipo)) {
          const turnosAfectados = exc.tipo.filter(t => t === 'C').length;
          turnosInfo = `${turnosAfectados} turno(s) modificado(s)`;
        } else if (esTurnoExtra && typeof exc.tipo === 'string' && exc.tipo.startsWith('E_')) {
          const turnosExtra = exc.tipo.substring(2);
          turnosInfo = `Turno extra: ${turnosExtra.split('').join('/')}`;
        }
        
        detalles = { 
          fecha: manana, 
          personas, 
          turnosInfo,
          esCambio, 
          esTurnoExtra 
        };
        break;
      }
    }
    
    return { fechaProxima: detalles ? manana : null, detalles, tipo };
  }, [excepciones]);

  // Comprobación de errores
  useEffect(() => {
    const handleError = (event) => {
      console.error('Error global capturado:', event.error);
      setErrorTemporal(`Error: ${event.error?.message || event.message}`);
      // Guardar error en localStorage
      try {
        localStorage.setItem('shiftapp_last_error', JSON.stringify({
          message: event.message,
          stack: event.error?.stack,
          time: new Date().toISOString()
        }));
      } catch (e) {}
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // ========== 2. TODOS LOS useEffect ==========
  useEffect(() => { localStorage.setItem('shiftapp_darkmode', darkMode); }, [darkMode]);
  useEffect(() => { localStorage.setItem('shiftapp_isOnboarded', isOnboarded); }, [isOnboarded]);
  useEffect(() => { localStorage.setItem('shiftapp_excepciones', JSON.stringify(excepciones)); }, [excepciones]);
  useEffect(() => { localStorage.setItem('shiftapp_patrones', JSON.stringify(patrones)); }, [patrones]);
  useEffect(() => { localStorage.setItem('shiftapp_patronActivo', patronActivoId); }, [patronActivoId]);
  useEffect(() => { localStorage.setItem('shiftapp_fechaInicio', fechaInicio); }, [fechaInicio]);
  useEffect(() => { localStorage.setItem('shiftapp_vacacionesTotales', vacacionesTotales); }, [vacacionesTotales]);
  useEffect(() => { localStorage.setItem('shiftapp_notificaciones', notificacionesActivas); }, [notificacionesActivas]);
  useEffect(() => { localStorage.setItem('shiftapp_resumenInicio', resumenInicio); }, [resumenInicio]);
  useEffect(() => { localStorage.setItem('shiftapp_resumenFin', resumenFin); }, [resumenFin]);
  useEffect(() => { localStorage.setItem('shiftapp_festivos', JSON.stringify(festivos));}, [festivos]);
  useEffect(() => { localStorage.setItem('shiftapp_eventos', JSON.stringify(eventos));}, [eventos]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('Service Worker registrado:', reg);
      }).catch(err => {
        console.error('Error al registrar SW:', err);
      });
    }
  }, []);

  //extrae la fecha local y establece el día siguiente por defecto
      useEffect(() => {
        if (showActionModal && actionModalData && nuevoEventoRepite && !nuevoEventoFechaFin) {
          const date = actionModalData.date;
          if (date && !isNaN(date.getTime())) {
            const fechaSugerida = new Date(date);
            fechaSugerida.setDate(date.getDate() + nuevoEventoFrecuencia);
            
            const year = fechaSugerida.getFullYear();
            const month = String(fechaSugerida.getMonth() + 1).padStart(2, '0');
            const day = String(fechaSugerida.getDate()).padStart(2, '0');
            const fechaLocal = `${year}-${month}-${day}`;
            
            setNuevoEventoFechaFin(fechaLocal);
          }
        }
      }, [showActionModal, actionModalData, nuevoEventoRepite, nuevoEventoFechaFin, nuevoEventoFrecuencia]);

  useEffect(() => {
    if (!notificacionesActivas) return;
    
    const pedirPermiso = async () => {
      try {
        // Si tenemos Service Worker, lo usamos para pedir permiso
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;
          // El SW ya tiene permiso implícito, solo mostramos notificación de prueba
          registration.showNotification('🔔 Notificaciones activadas', {
            body: 'Recibirás alertas de cambios de turno',
            icon: './icon-192.png',
            silent: true
          });
        } 
        // Fallback para PC
        else if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            new Notification('🔔 Notificaciones activadas', {
              body: 'Recibirás alertas de cambios de turno',
              icon: './icon-192.png'
            });
          }
        }
      } catch (error) {
        console.error('Error al pedir permiso:', error);
        setNotificacionesActivas(false);
        localStorage.setItem('shiftapp_notificaciones', 'false');
      }
    };
    
    pedirPermiso();
  }, [notificacionesActivas]);

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    const ultimaAlerta = localStorage.getItem('shiftapp_ultimaAlerta');
    
    // No enviar más de una vez por día
    if (ultimaAlerta === hoy) return;
    if (!notificacionesActivas) return;
    
    const { fechaProxima, detalles, tipo } = buscarProximoCambio();
    
    if (fechaProxima) {
      let titulo = '', mensaje = '';
      
      if (tipo === 'C') {
        titulo = '🔄 Cambio de turno MAÑANA';
        mensaje = `Tienes un cambio de turno mañana.`;
        if (detalles?.turnosInfo) mensaje += ` ${detalles.turnosInfo}`;
        if (detalles?.personas) mensaje += `\n👤 Con: ${detalles.personas}`;
      } else if (tipo === 'E') {
        titulo = '💰 Turno Extra MAÑANA';
        mensaje = `Tienes un turno extra mañana.`;
        if (detalles?.turnosInfo) mensaje += ` ${detalles.turnosInfo}`;
      }
      
      // Usar tu función existente
      enviarNotificacion(titulo, mensaje, `recordatorio_${fechaProxima.toISOString().split('T')[0]}`);
      
      // Guardar que ya se envió hoy
      localStorage.setItem('shiftapp_ultimaAlerta', hoy);
    }
  }, [excepciones, notificacionesActivas, buscarProximoCambio]);

  useEffect(() => {
    const style = document.createElement('style');

    const tipoFuente = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap');
  
  *,
  *::before,
  *::after {
    font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  }
    `;

    const noSeleccionar = `/* Prevenir selección de texto en toda la app */
    * {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }

    /* Permitir selección en inputs y textareas */
    input, textarea {
      -webkit-user-select: text;
      user-select: text;
    }
    `;
    
    // ANIMACIONES COMUNES (se aplican en ambos modos)
    const animaciones = `
      /* ANIMACIONES DE SWIPE */
      .swipe-out-left {
        animation: slideOutLeft 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
      }
      .swipe-out-right {
        animation: slideOutRight 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
      }
      .swipe-in-left {
        animation: slideInLeft 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
      }
      .swipe-in-right {
        animation: slideInRight 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
      }
      @keyframes slideOutLeft {
        0% { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(-25%); opacity: 0; }
      }
      @keyframes slideOutRight {
        0% { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(25%); opacity: 0; }
      }
      @keyframes slideInLeft {
        0% { transform: translateX(25%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideInRight {
        0% { transform: translateX(-25%); opacity: 0; }
        100% { transform: translateX(0); opacity: 1; }
      }
     
      /* ANIMACIONES PARA MODALES */
      @keyframes modalFadeIn {
        0% { opacity: 0; backdrop-filter: blur(0px); }
        100% { opacity: 1; backdrop-filter: blur(4px); }
      }

      @keyframes modalFadeOut {
        0% { opacity: 1; backdrop-filter: blur(4px); }
        100% { opacity: 0; backdrop-filter: blur(0px); }
      }

      @keyframes modalContentFadeIn {
        0% { opacity: 0; transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
      }

      @keyframes modalContentFadeOut {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.95); }
      }

      .modal-overlay-in {
        animation: modalFadeIn 0.2s ease-out forwards;
      }

      .modal-overlay-out {
        animation: modalFadeOut 0.15s ease-out forwards;
      }

      .modal-content-in {
        animation: modalContentFadeIn 0.2s ease-out forwards;
      }

      .modal-content-out {
        animation: modalContentFadeOut 0.15s ease-out forwards;
      }
      
    `;
    
    if (darkMode) {
      style.textContent = `
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.7;
          cursor: pointer;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
        input[type="date"] {
          color-scheme: dark;
        }
        .turno-pill, .day-number {
          -webkit-touch-callout: default;
          -webkit-user-select: text;
          user-select: text;
          text-rendering: optimizeLegibility;
        }
        .day-today {
          position: relative;
          z-index: 1;
          border: 3px solid rgb(96, 165, 250) !important;
          background-color: rgba(96, 165, 250, 0.15) !important;
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3);
        }
        .day-today::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: calc(100% - 4px);
          height: calc(100% - 4px);
          border-radius: 0.75rem;
          pointer-events: none;
          animation: pulse-ring-dark 2s ease-in-out infinite;
          z-index: -1;
        }
        @keyframes pulse-ring-dark {
          0% { box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.8); opacity: 1; }
          50% { box-shadow: 0 0 0 8px rgba(96, 165, 250, 0.4); opacity: 0.8; }
          100% { box-shadow: 0 0 0 12px rgba(96, 165, 250, 0); opacity: 0; }
        }
        ${animaciones}
        ${noSeleccionar}
        ${tipoFuente}
      `;
    } else {
      style.textContent = `
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0);
          opacity: 0.5;
          cursor: pointer;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 0.8;
        }
        input[type="date"] {
          color-scheme: light;
        }
        .turno-pill, .day-number {
          -webkit-touch-callout: default;
          -webkit-user-select: text;
          user-select: text;
          text-rendering: optimizeLegibility;
        }
        .day-today {
          position: relative;
          z-index: 1;
          border: 3px solid rgb(59, 130, 246) !important;
          background-color: rgba(59, 130, 246, 0.1) !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }
        .day-today::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: calc(100% - 4px);
          height: calc(100% - 4px);
          border-radius: 0.75rem;
          pointer-events: none;
          animation: pulse-ring 2s ease-in-out infinite;
          z-index: -1;
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); opacity: 1; }
          50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3); opacity: 0.8; }
          100% { box-shadow: 0 0 0 12px rgba(59, 130, 246, 0); opacity: 0; }
        }
        ${animaciones}
        ${noSeleccionar}
        ${tipoFuente}
      `;
    }
    
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [darkMode]);

  // Gestión de navegación con botón atrás
  useEffect(() => {
    // Verificar si hay algún modal abierto
    const hayModalAbierto = showConfig || showResumen || showResetConfirm || showActionModal || selectedDia;
    
    if (hayModalAbierto) {
      // Agregar estado al historial
      window.history.pushState({ modal: true }, '');
    }
    
    const handlePopState = (event) => {
      // Volver a verificar modales abiertos (por si cambió el estado)
      if (showConfig || showResumen || showResetConfirm || showActionModal || selectedDia) {
        event.preventDefault();
        
        // Cerrar el modal más reciente con animación
        if (showConfig) {
          cerrarModal(setShowConfig, setConfigClosing);
        }
        else if (showResumen) {
          cerrarModal(setShowResumen, setResumenClosing);
        }
        else if (showResetConfirm) {
          cerrarModal(setShowResetConfirm, setResetClosing);
        }
        else if (showActionModal) {
          cerrarModal(setShowActionModal, setActionModalClosing);
        }
        else if (selectedDia) {
          cerrarModal(setSelectedDia, setModalClosing);
        }
        
        // Volver a agregar estado para el siguiente modal si existe
        window.history.pushState({ modal: true }, '');
        return false;
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showConfig, showResumen, showResetConfirm, showActionModal, selectedDia]);

  

  // ========== 3. DICCIONARIO DE ESTILOS ==========
  const dm = darkMode;
  const t = {
    page: dm ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-800',
    card: dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    input: dm ? 'bg-slate-900 border-slate-600 text-slate-100 focus:ring-blue-400' : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500',
    label: dm ? 'text-slate-300' : 'text-slate-700',
    muted: dm ? 'text-slate-400' : 'text-slate-500',
    header: dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    navBtn: dm ? 'hover:bg-slate-700' : 'hover:bg-slate-100',
    headerBtn: dm ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    modalBg: dm ? 'bg-slate-800' : 'bg-white',
    subtle: dm ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200',
    dayCell: dm ? 'bg-slate-800 border-slate-700 hover:border-blue-400' : 'bg-white border-slate-200/80 hover:border-blue-400',
    dayNum: dm ? 'text-slate-400' : 'text-slate-600',
    emptyCell: dm ? 'bg-slate-800/40' : 'bg-slate-200/50',
    weekday: dm ? 'text-slate-500' : 'text-slate-400',
    closeBtn: dm ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700',
    cancelBtn: dm ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600',
    toggleRow: dm ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200',
    patronBox: dm ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200/60',
    patronInput: dm ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-800',
    divider: dm ? 'border-slate-700' : 'border-slate-100',
    sectionTitle: dm ? 'text-slate-300' : 'text-slate-700',
    optionBtn: dm ? 'bg-slate-700 border-slate-500 text-slate-200 hover:bg-slate-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100',
    optionBox: dm ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200',
    typeBtnSelected: 'bg-emerald-500 text-white border-transparent shadow-md',
    resVac: dm ? 'bg-emerald-900/50 text-emerald-200 border-emerald-700' : 'bg-emerald-50 text-emerald-800 border-emerald-100',
    resCambio: dm ? 'bg-amber-900/50 text-amber-200 border-amber-700' : 'bg-amber-50 text-amber-800 border-amber-100',
    resBaja: dm ? 'bg-rose-900/50 text-rose-200 border-rose-700' : 'bg-rose-50 text-rose-800 border-rose-100',
    resPermiso: dm ? 'bg-purple-900/50 text-purple-200 border-purple-700' : 'bg-purple-50 text-purple-800 border-purple-100',
    resOtros:  dm ? 'bg-emerald-900/50 text-emerald-200 border-emerald-700' : 'bg-emerald-50 text-emerald-800 border-emerald-200',
    resExtra: dm ? 'bg-yellow-900/50 text-yellow-200 border-yellow-700' : 'bg-yellow-50 text-yellow-800 border-yellow-100',
    pillM: dm ? 'bg-sky-900 text-sky-300' : 'bg-sky-100 text-sky-700',
    pillT: dm ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700',
    pillN: dm ? 'bg-slate-900 text-slate-200 border border-slate-600' : 'bg-slate-800 text-white',
    pillL: dm ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
    pillExtra: dm ? 'bg-yellow-700 text-yellow-100' : 'bg-yellow-500 text-white',
    pillCambio: dm ? 'bg-amber-700 text-amber-100' : 'bg-amber-500 text-white',
  };

  // ========== 4. useCallback y useMemo ==========
  const patronActivo = useMemo(() => patrones.find(p => p.id === patronActivoId), [patronActivoId, patrones]);

  const ordenTurnos = useCallback((turnos) => {
    const orden = { 'M': 0, 'T': 1, 'N': 2 };
    return [...turnos].sort((a, b) => orden[a] - orden[b]);
  }, []);

  const getTurnosParaFecha = useCallback((fechaObj) => {
    const fInicio = new Date(fechaInicio);
    const fActual = new Date(fechaObj);
    fInicio.setHours(0, 0, 0, 0);
    fActual.setHours(0, 0, 0, 0);
    if (fActual < fInicio) return [];
    let diffDias = 0;
    let tempDate = new Date(fInicio);
    while (tempDate < fActual) {
      tempDate.setDate(tempDate.getDate() + 1);
      diffDias++;
    }
    const turnosBase = patronActivo?.secuencia[diffDias % patronActivo.secuencia.length] || [];
    const fechaStr = fechaObj.toISOString().split('T')[0];
    const excepcion = excepciones[fechaStr];
    if (excepcion && Array.isArray(excepcion.tipo)) {
      return excepcion.tipo.map((_, idx) => {
        const turnosMap = ['M', 'T', 'N'];
        return turnosMap[idx] || '';
      }).filter(t => t);
    }
    return turnosBase;
  }, [fechaInicio, patronActivo, excepciones]);

  const handleGoogleLogin = () => setUser({ name: 'Juan Pérez', email: 'juan.perez@gmail.com' });

  const getColorPorTipo = (tipo) => {
    if (tipo === 'V') return 'bg-emerald-600 text-white';
    if (tipo === 'C') return 'bg-amber-600 text-white';
    if (tipo === 'B') return 'bg-rose-600 text-white';
    if (tipo === 'P') return 'bg-purple-600 text-white';
    if (tipo === 'O') return 'bg-emerald-500 text-white';
    if (tipo === 'E') return 'bg-yellow-600 text-white';
    return 'bg-gray-500 text-white';
  };

  const esLibreEnRangoVacaciones = useCallback((date, turnosBase, excepcion) => {
  // Solo aplica para días que son completamente L
  if (!turnosBase.every(t => t === 'L')) return false;
  if (excepcion) return false;
  
  // Verificar si un día tiene TODOS los turnos en vacaciones (completo)
  const tieneVacacionesCompletas = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    const exc = excepciones[fechaStr];
    const turnos = getTurnosParaFecha(fecha);
    
    if (turnos.length === 0 || turnos.every(t => t === 'L')) return false;
    if (!exc) return false;
    
    if (Array.isArray(exc.tipo)) {
      return exc.tipo.every(t => t === 'V');
    } else {
      return exc.tipo === 'V';
    }
  };
  
  // Verificar si un día tiene vacaciones en turno N (noche)
  const tieneVacacionesEnNoche = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    const exc = excepciones[fechaStr];
    const turnos = getTurnosParaFecha(fecha);
    
    if (turnos.length === 0 || turnos.every(t => t === 'L')) return false;
    if (!exc) return false;
    
    if (Array.isArray(exc.tipo)) {
      for (let i = 0; i < turnos.length; i++) {
        if (turnos[i] === 'N' && exc.tipo[i] === 'V') return true;
      }
      return false;
    }
    return exc.tipo === 'V' && turnos.includes('N');
  };
  
  // Verificar si un día tiene cambio o turno extra (bloquea el empalme)
  const tieneBloqueante = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    const exc = excepciones[fechaStr];
    const turnos = getTurnosParaFecha(fecha);
    
    if (turnos.length === 0 || turnos.every(t => t === 'L')) return false;
    if (!exc) return false;
    
    const { tipo } = exc;
    
    // Cambio en día L
    if (typeof tipo === 'string' && tipo.startsWith('C_')) return true;
    // Turno Extra en día L
    if (typeof tipo === 'string' && tipo.startsWith('E_')) return true;
    // Cambio en día de trabajo (array que contiene 'C')
    if (Array.isArray(tipo) && tipo.includes('C')) return true;
    // Cambio en día de trabajo (string 'C')
    if (tipo === 'C') return true;
    // Turno Extra en día de trabajo
    if (tipo === 'E') return true;
    
    return false;
  };
  
  // Verificar si un día tiene algún turno normal NO en vacaciones
  const tieneNormalBloqueante = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    const exc = excepciones[fechaStr];
    const turnos = getTurnosParaFecha(fecha);
    
    if (turnos.length === 0 || turnos.every(t => t === 'L')) return false;
    if (!exc) return turnos.some(t => t === 'M' || t === 'T' || t === 'N');
    if (Array.isArray(exc.tipo)) {
      for (let i = 0; i < turnos.length; i++) {
        const turno = turnos[i];
        if ((turno === 'M' || turno === 'T' || turno === 'N') && exc.tipo[i] !== 'V') return true;
      }
      return false;
    }
    return exc.tipo !== 'V';
  };
  
  // Buscar hacia atrás
  let hayEmpalmeAtras = false;
  let diaAtras = new Date(date);
  for (let i = 1; i <= 30; i++) {
    diaAtras = new Date(date);
    diaAtras.setDate(date.getDate() - i);
    const turnosAtras = getTurnosParaFecha(diaAtras);
    
    if (turnosAtras.length === 0) break;
    
    // Si encontramos un cambio o turno extra, DETENER (no empalmar)
    if (tieneBloqueante(diaAtras)) break;
    
    if (tieneNormalBloqueante(diaAtras)) break;
    if (tieneVacacionesCompletas(diaAtras)) {
      hayEmpalmeAtras = true;
      break;
    }
  }
  
  // Buscar hacia adelante
  let hayEmpalmeAdelante = false;
  let diaAdelante = new Date(date);
  for (let i = 1; i <= 30; i++) {
    diaAdelante = new Date(date);
    diaAdelante.setDate(date.getDate() + i);
    const turnosAdelante = getTurnosParaFecha(diaAdelante);
    
    if (turnosAdelante.length === 0) break;
    
    // Si encontramos un cambio o turno extra, DETENER (no empalmar)
    if (tieneBloqueante(diaAdelante)) break;
    
    if (tieneNormalBloqueante(diaAdelante)) break;
    if (tieneVacacionesCompletas(diaAdelante) || tieneVacacionesEnNoche(diaAdelante)) {
      hayEmpalmeAdelante = true;
      break;
    }
  }
  
  return hayEmpalmeAtras || hayEmpalmeAdelante;
}, [excepciones, getTurnosParaFecha]);

  const getExcepcionDisplay = (excepcion, turnosBase) => {
    if (!excepcion) return null;
    const { tipo, notas } = excepcion;
    
    // Cambios en día L
    if (typeof tipo === 'string' && tipo.startsWith('C_')) {
      let cambioTurnos = tipo.substring(2);
      const orden = { 'M': 0, 'T': 1, 'N': 2 };
      cambioTurnos = cambioTurnos.split('').sort((a, b) => orden[a] - orden[b]).join('');
      const notasObj = typeof notas === 'object' ? notas : {};
      return {
        texto: `🔄${cambioTurnos}`,
        clase: 'bg-amber-500 text-white',
        notas: notasObj,
        esParcial: false,
        esDiaCompleto: true,
        esCambioL: true,
        turnos: cambioTurnos.split('')
      };
    }
    
    // Turnos Extra en días L
    if (typeof tipo === 'string' && tipo.startsWith('E_')) {
      const extraTurnos = tipo.substring(2);
      return {
        texto: `💰${extraTurnos}`,
        clase: t.pillExtra,
        notas: notas,
        esParcial: false,
        esDiaCompleto: true,
        esTurnoExtra: true
      };
    }
    
    // Cambio en día de trabajo de 1 turno
    if (typeof tipo === 'string' && tipo === 'C') {
      const turnoOriginal = turnosBase[0] || '';
      return {
        texto: `🔄${turnoOriginal}`,
        clase: 'bg-amber-500 text-white',
        notas: notas,
        esParcial: false,
        esDiaCompleto: true,
        esCambioTrabajo: true
      };
    }
    
    // Array de turnos modificados
    if (Array.isArray(tipo)) {
      const tieneCambio = tipo.some(t => t === 'C');
      if (tieneCambio) {
        const turnosVisual = tipo.map((t, idx) => {
          if (t === 'C') {
            const turnoOriginal = turnosBase[idx] || '';
            return `🔄${turnoOriginal}`;
          }
          return t;
        });
        return {
          texto: turnosVisual.join('/'),
          clase: 'bg-amber-500 text-white',
          notas: notas,
          esParcial: true,
          turnosModificados: tipo,
          tipoOriginal: 'C',
          esCambioTrabajo: true
        };
      }
      
      const tieneExtra = tipo.some(t => typeof t === 'string' && t.startsWith('E_'));
      if (tieneExtra) {
        const turnosVisual = tipo.map(t => {
          if (typeof t === 'string' && t.startsWith('E_')) {
            return `💰${t.charAt(2)}`;
          }
          return t;
        });
        return {
          texto: turnosVisual.join('/'),
          clase: 'bg-yellow-500 text-white',
          notas: notas,
          esParcial: true,
          turnosModificados: tipo,
          tipoOriginal: 'E',
          esTurnoExtra: true
        };
      }
      
      const tipoPrincipal = tipo.find(t => t === 'V' || t === 'C' || t === 'B' || t === 'P' || t === 'O') || 'C';
      const esDiaCompleto = tipo.length === turnosBase.length && tipo.every(t => t === tipoPrincipal);
      
      let textoMostrado = tipoPrincipal;
      if (tipoPrincipal === 'V') textoMostrado = '🏖️ V';
      
      return {
        texto: textoMostrado,
        clase: getColorPorTipo(tipoPrincipal),
        notas: notas,
        esParcial: !esDiaCompleto,
        turnosModificados: tipo,
        tipoOriginal: tipoPrincipal,
        esDiaCompleto: esDiaCompleto
      };
    }
    
    // String simple (día completo con un solo tipo)
    if (tipo === 'V') {
      return { 
        texto: '🏖️ V', 
        clase: getColorPorTipo(tipo), 
        notas, 
        esParcial: false,
        esDiaCompleto: true 
      };
    }
    return { 
      texto: tipo, 
      clase: getColorPorTipo(tipo), 
      notas, 
      esParcial: false,
      esDiaCompleto: true 
    };
  };

  const guardarExcepcion = useCallback((nuevoTipo, nuevoSubTipo, notasActuales, cerrarModal = true) => {
    if (!selectedDia) return;
    
    const key = selectedDia.fechaStr;
    const esCambio = (nuevoTipo === 'C') || 
          (excTipo === 'C' && nuevoTipo === undefined) ||
          (Array.isArray(nuevoTipo) && nuevoTipo.some(t => t === 'C'));
    const esDiaLibre = selectedDia.turnosBase.every(t => t === 'L');
    
    // VALIDACIÓN: Asegurar que notasActuales sea siempre un objeto válido
    let notasFinales = {};
    if (esCambio) {
      try {
        if (notasActuales !== undefined && typeof notasActuales === 'object' && notasActuales !== null) {
          notasFinales = notasActuales;
        } else if (typeof excNotas === 'object' && excNotas !== null) {
          notasFinales = excNotas;
        } else if (typeof excNotas === 'string' && excNotas) {
          notasFinales = { 0: excNotas };
        }
      } catch (e) {
        setErrorTemporal('Error al procesar notas:', e);
        notasFinales = {};
      }
    }
    
    // V_CICLO: marcar todo el ciclo de vacaciones
    if (nuevoTipo === 'V_CICLO') {
      try {
        const nuevasExcepciones = { ...excepciones };
        const fechaBase = new Date(selectedDia.date);
        fechaBase.setHours(0, 0, 0, 0);
        
        const fInicio = new Date(fechaInicio);
        fInicio.setHours(0, 0, 0, 0);
        
        let diffDias = 0;
        let tempDate = new Date(fInicio);
        while (tempDate < fechaBase) {
          tempDate.setDate(tempDate.getDate() + 1);
          diffDias++;
        }
        
        const secuenciaCompleta = patronActivo.secuencia;
        const posicionEnCiclo = diffDias % secuenciaCompleta.length;
        
        let fechaCiclo = new Date(fechaBase);
        for (let i = 0; i < posicionEnCiclo; i++) {
          fechaCiclo.setDate(fechaCiclo.getDate() - 1);
        }
        
        for (let i = 0; i < secuenciaCompleta.length; i++) {
          const turnosDelDia = secuenciaCompleta[i];
          const fechaStr = fechaCiclo.toISOString().split('T')[0];
          const tieneTurnos = turnosDelDia.some(t => t === 'M' || t === 'T' || t === 'N');
          
          if (tieneTurnos) {
            nuevasExcepciones[fechaStr] = { 
              tipo: turnosDelDia.map(() => 'V'), 
              notas: {} 
            };
          } else {
            delete nuevasExcepciones[fechaStr];
          }
          fechaCiclo.setDate(fechaCiclo.getDate() + 1);
        }
        setExcepciones(nuevasExcepciones);
      } catch (e) {
        setErrorTemporal('Error en V_CICLO:', e);
      }
    } 
    // Turno Extra en día L
    else if (esDiaLibre && excTipo === 'E' && nuevoTipo === undefined) {
      const turnosStr = excSubTiposMultiE.sort().join('');
      setExcepciones(prev => ({ ...prev, [key]: { tipo: `E_${turnosStr}`, notas: {} } }));
    } 
    // Cambio en día L
    else if (esDiaLibre && excTipo === 'C' && nuevoTipo === undefined) {
      const turnosStr = excSubTiposMultiC.sort().join('');
      setExcepciones(prev => ({ ...prev, [key]: { tipo: `C_${turnosStr}`, notas: notasFinales } }));
    } 
    // Turno Extra con subtipo específico
    else if (nuevoTipo === 'E' && nuevoSubTipo) {
      setExcepciones(prev => ({ ...prev, [key]: { tipo: `E_${nuevoSubTipo}`, notas: {} } }));
    } 
    // Cambio en día L con subtipo específico
    else if (nuevoTipo === 'C' && nuevoSubTipo && esDiaLibre) {
      setExcepciones(prev => ({ ...prev, [key]: { tipo: `C_${nuevoSubTipo}`, notas: notasFinales } }));
    } 
    // Guardar desde las opciones directas (botones de turno)
    else if (nuevoTipo !== undefined) {
      let tipoFinal = nuevoTipo;
      
      // VALIDACIÓN: Asegurar que tipoFinal sea válido
      if (typeof nuevoTipo === 'string' && nuevoTipo === 'V') {
        const turnosBase = getTurnosParaFecha(selectedDia.date);
        if (turnosBase.length > 1) {
          tipoFinal = turnosBase.map(() => 'V');
        } else {
          tipoFinal = ['V'];
        }
      }
      else if (typeof nuevoTipo === 'string' && nuevoTipo === 'O') {
        const turnosBase = getTurnosParaFecha(selectedDia.date);
        if (turnosBase.length > 1) {
          tipoFinal = turnosBase.map(() => 'O');
        } else {
          tipoFinal = ['O'];
        }
      }
      
      // VALIDACIÓN: Asegurar que el tipo no sea undefined o null
      if (!tipoFinal) {
        console.error('Error: tipoFinal es inválido', { nuevoTipo, tipoFinal });
        return;
      }
      
      setExcepciones(prev => ({ ...prev, [key]: { tipo: tipoFinal, notas: notasFinales } }));
    } 
    // Guardado normal
    else {
      try {
        let tipoFinal = excTipo;
        
        // VALIDACIÓN: Asegurar que excTipo sea válido
        if (!excTipo) {
          console.error('Error: excTipo es inválido', excTipo);
          return;
        }
        
        // Si es Vacaciones y no es array, convertir a array
        if (excTipo === 'V' && !Array.isArray(excTipo)) {
          const turnosBase = getTurnosParaFecha(selectedDia.date);
          if (turnosBase.length > 1) {
            tipoFinal = turnosBase.map(() => 'V');
          } else {
            tipoFinal = ['V'];
          }
        }
        // Si es Otros y no es array, convertir a array
        else if (excTipo === 'O' && !Array.isArray(excTipo)) {
          const turnosBase = getTurnosParaFecha(selectedDia.date);
          if (turnosBase.length > 1) {
            tipoFinal = turnosBase.map(() => 'O');
          } else {
            tipoFinal = ['O'];
          }
        }
        // Si es Cambio en día L
        else if (excTipo === 'C' && esDiaLibre) {
          const turnosStr = excSubTiposMultiC.sort().join('');
          tipoFinal = `C_${turnosStr}`;
        }
        
        // VALIDACIÓN FINAL: Verificar que el tipo sea válido antes de guardar
        if (tipoFinal === undefined || tipoFinal === null) {
          console.error('Error: tipoFinal no válido después de procesar', { excTipo, esDiaLibre });
          return;
        }
        
        setExcepciones(prev => ({ 
          ...prev, 
          [key]: { 
            tipo: tipoFinal, 
            notas: notasFinales 
          } 
        }));
      } catch (e) {
        setErrorTemporal('Error crítico al guardar excepción:', e);
      }
    }
    
    // Enviar notificación si se guardó un cambio
    /*if (esCambio && cerrarModal) {
      try {
        const fechaFormateada = selectedDia.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const turnosAfectados = Array.isArray(nuevoTipo) ? nuevoTipo.filter(t => t === 'C').length : (nuevoTipo === 'C' ? 1 : 0);
        enviarNotificacion(
          '🔄 Cambio de turno registrado',
          `${fechaFormateada} - ${turnosAfectados} turno(s) modificado(s)`,
          `${key}_${Date.now()}`
        );
      } catch (e) {
        setErrorTemporal('Error al enviar notificación:', e);
      }
    }*/
    
    if (cerrarModal) {
      setSelectedDia(null);
    }
  }, [selectedDia, excNotas, excTipo, excSubTiposMultiC, excSubTiposMultiE, excepciones, fechaInicio, patronActivo, getTurnosParaFecha, enviarNotificacion]);

  const eliminarExcepcion = (key) => {
    const nuevas = { ...excepciones };
    delete nuevas[key];
    setExcepciones(nuevas);
    setSelectedDia(null);
  };

  const handleGuardarOpcion = (nuevoTipo, nuevoSubTipo = null) => {
    if (!selectedDia) return;
    guardarExcepcion(nuevoTipo, nuevoSubTipo, excNotas, true);
  };

  const toggleSubTipoMultiC = (turno) => {
    setExcSubTiposMultiC(prev => {
      const orden = { 'M': 0, 'T': 1, 'N': 2 };
      if (prev.includes(turno)) {
        return prev.filter(t => t !== turno);
      } else {
        return [...prev, turno].sort((a, b) => orden[a] - orden[b]);
      }
    });
  };

  const toggleSubTipoMultiE = (turno) => {
    setExcSubTiposMultiE(prev => {
      if (prev.includes(turno)) { return prev.filter(t => t !== turno); }
      else { return [...prev, turno].sort(); }
    });
  };

  const agregarNuevoPatron = () => {
    if (!nuevoNombrePatron) return;
    const secuencia = nuevaSecuenciaStr.split('/').map(dia => dia.split('').filter(c => ['M','T','N','L'].includes(c)));
    const nuevo = { id: `p_${Date.now()}`, nombre: nuevoNombrePatron, secuencia };
    setPatrones([...patrones, nuevo]);
    setPatronActivoId(nuevo.id);
    setNuevoNombrePatron('');
    setNuevaSecuenciaStr('M/T/N/L');
  };

  const contarTurnos = useCallback((fechaInicioParam, fechaFinParam, tipoBusqueda) => {
    const inicio = new Date(fechaInicioParam);
    const fin = new Date(fechaFinParam);
    let total = 0;
    let loop = new Date(inicio);
    while (loop <= fin) {
      const dStr = loop.toISOString().split('T')[0];
      const exc = excepciones[dStr];
      if (exc) {
        if (typeof exc.tipo === 'string' && exc.tipo.startsWith('E_')) {
          if (tipoBusqueda === 'E') { total += exc.tipo.substring(2).length; }
        } else if (typeof exc.tipo === 'string' && exc.tipo.startsWith('C_')) {
          if (tipoBusqueda === 'C') total += 1;
        } else if (Array.isArray(exc.tipo)) {
          total += exc.tipo.filter(t => t === tipoBusqueda).length;
        } else if (exc.tipo === tipoBusqueda) {
          total += getTurnosParaFecha(loop).length;
        }
      }
      loop.setDate(loop.getDate() + 1);
    }
    if (tipoBusqueda === 'C') { return Math.floor(total / 2); }
    return total;
  }, [excepciones, getTurnosParaFecha]);

  const conteoResumen = useMemo(() => ({
    V: contarTurnos(resumenInicio, resumenFin, 'V'),
    C: contarTurnos(resumenInicio, resumenFin, 'C'),
    B: contarTurnos(resumenInicio, resumenFin, 'B'),
    P: contarTurnos(resumenInicio, resumenFin, 'P'),
    O: contarTurnos(resumenInicio, resumenFin, 'O'),
    E: contarTurnos(resumenInicio, resumenFin, 'E')
  }), [resumenInicio, resumenFin, contarTurnos]);

  const ThemeToggle = () => (
    <div className={`flex items-center gap-3 p-3 rounded-xl border mb-5 ${t.toggleRow}`}>
      {darkMode ? <Moon size={16} className={t.muted} /> : <Sun size={16} className={t.muted} />}
      <span className={`flex-1 text-sm ${t.muted}`}>{darkMode ? 'Modo oscuro' : 'Modo claro'}</span>
      <button onClick={() => setDarkMode(!darkMode)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  const resetCompleto = useCallback(() => {
    // Limpiar todas las claves de localStorage que empiecen con 'shiftapp_'
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('shiftapp_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Recargar la página para un estado completamente limpio
    window.location.reload();
  }, []);

  const resetNotificaciones = () => {
    localStorage.removeItem('shiftapp_notificaciones');
    localStorage.removeItem('shiftapp_ultimaAlerta');
    // También reseteamos los estados locales
    setNotificacionesActivas(false);
    setUltimaNotificacion(null);
    
  };

  // ========== FUNCIONES PARA SWIPE ==========
  const minSwipeDistance = 20;
  const cambiarMes = (direccion) => {
    if (animateOutDir) return;
    
    // Guardar la dirección de salida
    setAnimateOutDir(direccion);
    
    // Animar salida (150ms)
    setTimeout(() => {
      // Cambiar el mes real
      if (direccion === 'left') {
        setCurrentDate(new Date(year, month + 1, 1));
      } else if (direccion === 'right') {
        setCurrentDate(new Date(year, month - 1, 1));
      }
      
      // Limpiar animación de salida y activar entrada
      setAnimateOutDir(null);
      setAnimateIn(true);
      
      // Limpiar animación de entrada después de completarse (250ms)
      setTimeout(() => {
        setAnimateIn(false);
      }, 250);
    }, 150);
  };
  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); setTouchStartTime(Date.now()); };
  const onTouchMove = (e) => { if (!touchStart) return; setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || animateOutDir) { setTouchStart(null); setTouchEnd(null); setTouchStartTime(null); return; }
    const distance = touchStart - touchEnd;
    const absDistance = Math.abs(distance);
    const timeDiff = Date.now() - touchStartTime;
    const velocity = absDistance / timeDiff;
    if (absDistance > minSwipeDistance || velocity > 0.1) {
      if (distance > 0) { cambiarMes('left'); }
      else { cambiarMes('right'); }
    }
    setTouchStart(null); setTouchEnd(null); setTouchStartTime(null);
  };
  const getAnimationClass = () => {
    if (animateOutDir === 'left') return 'swipe-out-left';
    if (animateOutDir === 'right') return 'swipe-out-right';
    if (animateIn) {
      if (animateOutDir === 'left') return 'swipe-in-right';
      if (animateOutDir === 'right') return 'swipe-in-left';
    }
    return '';
  };

  // Manejadores de pulsación larga
  const handlePressStart = (e, date, fechaStr, turnosBase, excepcion) => {
    e.preventDefault();
    const timer = setTimeout(() => {
      handleLongPress(date, fechaStr, turnosBase, excepcion);
    }, 500);
    setPressTimer(timer);
  };

  const handlePressEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  const handleLongPress = (date, fechaStr, turnosBase, excepcion) => {
    setActionModalData({ date, fechaStr, turnosBase, excepcion });
    setShowActionModal(true);
  };

  // ========== RENDERIZADO ==========
  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 ${t.page}`}>
        <div className={`p-8 rounded-2xl shadow-xl max-w-md w-full border ${t.card}`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src="./icon-512.png" alt="Quadrante" className="w-8 h-8" />
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Quadrante</h1>
          </div>
          <p className={`text-align-left mb-6 ${t.muted}`}>Gestión de turnos, vacaciones, incidencias, cambios y servicios extraordinarios, específica para <strong>funcionarios de prisiones</strong> y para cualquier otro cuerpo que tenga turnos rotativos fijos.</p>
          <ThemeToggle />
          <button onClick={handleGoogleLogin} className={`w-full flex items-center justify-center gap-3 border font-semibold py-3 px-4 rounded-xl transition-all ${t.card} ${darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'} shadow-sm`}>
            <img src="./dev38.png" alt="logo" className="w-15 h-15" /> Comenzar <img src="./iipp.png" alt="logo prisiones" className="w-11.25 h-15" />
          </button>
        </div>
      </div>
    );
  }

  if (!isOnboarded) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 ${t.page}`}>
        <div className={`p-8 rounded-2xl shadow-xl max-w-md w-full border ${t.card}`}>
          <h2 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Configuración Inicial</h2>
          <p className={`text-sm mb-6 ${t.muted}`}>Indícanos tu cadencia actual y la fecha de inicio.</p>
          <ThemeToggle />
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.label}`}>Selecciona tu cadencia</label>
              <select value={patronActivoId} onChange={(e) => setPatronActivoId(e.target.value)} className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 ${t.input}`}>
                {patrones.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className={`p-3 rounded-xl border ${t.patronBox}`}>
              <p className={`text-xs font-semibold mb-2 ${t.sectionTitle}`}>➕ Crear nueva cadencia personalizada</p>
              <div className="space-y-2">
                <input type="text" placeholder="Nombre (ej: Mi Cadencia 4x4)" value={nuevoNombrePatron} onChange={(e) => setNuevoNombrePatron(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" className={`w-full p-2 border rounded-lg text-sm ${t.patronInput}`} />
                <input type="text" placeholder="Secuencia (ej: M/T/N/L/L)" value={nuevaSecuenciaStr} onChange={(e) => setNuevaSecuenciaStr(e.target.value.toUpperCase())} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" className={`w-full p-2 border rounded-lg text-sm font-mono ${t.patronInput}`} />
                <p className={`text-[10px] ${t.muted}`}>Usa "/" para cambiar de día. Combina letras para el mismo día (ej: MT/MN/L).</p>
                <button onClick={agregarNuevoPatron} className={`w-full flex items-center justify-center gap-1 text-white text-xs font-semibold py-2 rounded-lg transition-all ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'}`}><Plus size={14} /> Crear y seleccionar esta cadencia</button>
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.label}`}>Fecha de Inicio de la cadencia</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} autoComplete="off" className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 ${t.input}`} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.label}`}>Días Totales de Vacaciones Anuales</label>
              <input type="number" value={vacacionesTotales} onChange={(e) => setVacacionesTotales(Number(e.target.value))} min="0" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 ${t.input}`} />
            </div>
            <button onClick={() => setIsOnboarded(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all mt-4">Generar mi Calendario</button>
          </div>
        </div>
      </div>
    );
  }

  // ========== RENDERIZADO PRINCIPAL DEL CALENDARIO ==========
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const primerDiaMes = new Date(year, month, 1).getDay();
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const diasFaltantesInicio = primerDiaMes === 0 ? 6 : primerDiaMes - 1;
  const diasCalendario = [];
  for (let i = 0; i < diasFaltantesInicio; i++) diasCalendario.push(null);
  for (let d = 1; d <= diasEnMes; d++) diasCalendario.push(new Date(year, month, d));
  const meses = ["❄️Enero","🧣Febrero","🍃Marzo","☔Abril","🌷Mayo","☀️Junio","🌞Julio","🏖️Agosto","🏫Septiembre","🍂Octubre","🧥Noviembre","☃️Diciembre"];

  return (
    <div className={`min-h-screen ${t.page}`}>
      <header className={`border-b px-4 py-3 flex flex-wrap justify-between items-center gap-2 sticky top-0 z-10 shadow-sm ${t.header}`}>
        <div>
          <h1 className={`text-lg md:text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            <img src="./icon-512.png" alt="Quadrante" className="w-5 h-5" /> Quadrante
          </h1>
          <p className={`text-[10px] md:text-xs ${t.muted}`}>Cadencia: {patronActivo?.nombre}</p>
        </div>
        <div className="flex gap-1 md:gap-2 items-center flex-wrap">
          {buscarProximoCambio().fechaProxima && <span className="ml-2 text-xs bg-red-500 text-white px-2 py-2 rounded-full">📅</span>}
          <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-xl transition-all ${t.headerBtn}`} title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button onClick={() => setShowResumen(true)} className={`p-2 rounded-xl transition-all ${t.headerBtn}`} title="Ver resumen"><FileText size={18} /></button>
          <button onClick={() => setShowConfig(true)} className={`p-2 rounded-xl transition-all ${t.headerBtn}`} title="Configuración"><Settings size={18} /></button>
        </div>
      </header>

      <main className={`w-full max-w-7xl mx-auto p-2 md:p-4 relative overflow-hidden ${getAnimationClass()}`} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className={`flex flex-col gap-2 mb-4 p-2 md:p-3 rounded-2xl shadow-sm border ${t.card}`}>
          <div className="flex justify-between items-center">
            <button onClick={() => cambiarMes('right')} className={`p-2 rounded-lg ${t.navBtn}`}><ChevronLeft size={20} /></button>
            <h2 className={`text-base md:text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{meses[month]} {year}</h2>
            <button onClick={() => cambiarMes('left')} className={`p-2 rounded-lg ${t.navBtn}`}><ChevronRight size={20} /></button>
            <button onClick={() => { setCurrentDate(new Date()); setFechaBusqueda(''); }} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${t.headerBtn}`} title="Ir al mes actual">🗓️ Hoy</button>
          </div>
        </div>

        <div className={`grid grid-cols-7 gap-1 md:gap-2 text-center text-[10px] md:text-xs font-bold mb-2 px-1 ${t.weekday}`}>
          <div>LUN</div><div>MAR</div><div>MIÉ</div><div>JUE</div><div>VIE</div><div>SÁB</div><div>DOM</div>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {diasCalendario.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className={`rounded-xl aspect-square ${t.emptyCell}`}></div>;
            const fechaStr = date.toISOString().split('T')[0];
            const turnosBase = getTurnosParaFecha(date);
            const excepcion = excepciones[fechaStr];
            const displayInfo = excepcion ? getExcepcionDisplay(excepcion, turnosBase) : null;
            const esLComoVacaciones = !excepcion && esLibreEnRangoVacaciones(date, turnosBase, excepcion);
            const esTurnoExtra = displayInfo?.esTurnoExtra === true;
            const esCambioL = displayInfo?.esCambioL === true;
            const hoyAnimacion = esHoy(date) ? 'day-today' : '';
            let dayBgClass = '', textColorClass = '';
            if (esLComoVacaciones) { dayBgClass = 'bg-emerald-600 border-transparent'; textColorClass = 'text-white'; }
            else if (esTurnoExtra) { dayBgClass = 'bg-yellow-500 border-transparent'; textColorClass = 'text-white'; }
            else if (esCambioL) { dayBgClass = 'bg-amber-500 border-transparent'; textColorClass = 'text-white'; }
            else if (displayInfo && displayInfo.esDiaCompleto) {
              if (displayInfo.texto.includes('V')) { dayBgClass = 'bg-emerald-500 border-transparent'; textColorClass = 'text-white'; }
              else if (displayInfo.texto === 'C') { dayBgClass = 'bg-amber-500 border-transparent'; textColorClass = 'text-white'; }
              else if (displayInfo.texto === 'B') { dayBgClass = 'bg-rose-500 border-transparent'; textColorClass = 'text-white'; }
              else if (displayInfo.texto === 'P') { dayBgClass = 'bg-purple-500 border-transparent'; textColorClass = 'text-white'; }
              else if (displayInfo.texto === 'O') { dayBgClass = 'bg-emerald-500 border-transparent'; textColorClass = 'text-white'; }
              else { dayBgClass = t.dayCell; textColorClass = t.dayNum; }
            } else if (turnosBase.every(t => t === 'L') && !esLComoVacaciones) { dayBgClass = dm ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200/50'; textColorClass = dm ? 'text-emerald-300' : 'text-emerald-700'; }
            else { dayBgClass = t.dayCell; textColorClass = t.dayNum; }

            return (
              <div key={fechaStr} onClick={() => { setSelectedDia({ date, fechaStr, excepcion, turnosBase });
                if (excepcion) {
                  if (typeof excepcion.tipo === 'string' && excepcion.tipo.startsWith('E_')) { setExcTipo('E'); setExcSubTiposMultiE(excepcion.tipo.substring(2).split('')); }
                  else if (typeof excepcion.tipo === 'string' && excepcion.tipo.startsWith('C_')) { setExcTipo('C'); setExcSubTiposMultiC(excepcion.tipo.substring(2).split('')); }
                  else if (Array.isArray(excepcion.tipo)) { setExcTipo(excepcion.tipo.find(t => t === 'V' || t === 'C' || t === 'B' || t === 'P' || t === 'O') || 'V'); setExcSubTiposMultiC(['M']); setExcSubTiposMultiE(['M']); }
                  else { setExcTipo(excepcion.tipo); setExcSubTiposMultiC(['M']); setExcSubTiposMultiE(['M']); }
                  setExcNotas(typeof excepcion.notas === 'object' ? excepcion.notas : {});
                } else { setExcTipo(turnosBase.every(t => t === 'L') ? 'C' : 'V'); setExcSubTiposMultiC(['M']); setExcSubTiposMultiE(['M']); setExcNotas({}); }
              }} 
              onTouchStart={(e) => handlePressStart(e, date, fechaStr, turnosBase, excepcion)}
              onTouchEnd={handlePressEnd}
              onMouseDown={(e) => handlePressStart(e, date, fechaStr, turnosBase, excepcion)}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              className={`border-2 rounded-xl p-0 h-full min-h-21.25 md:min-h-25 flex flex-col cursor-pointer transition-all group ${dayBgClass} ${hoyAnimacion}${getDiaEspecial(date) || festivos[fechaStr] ? 'border-red-400 dark:border-red-500 border-2 border-dashed animate-pulse' : ''}`}
              
              >
                <span className={`flex flex-row flex-wrap items-center gap-x-0.5 gap-y-0 text-sm md:text-base font-bold group-hover:text-blue-500 day-number ${textColorClass} p-1 md:p-2 ${esHoy(date) ? 'font-extrabold text-blue-600 dark:text-blue-400 animate-pulse' : ''}`}>
                  <span className="whitespace-nowrap">{date.getDate()}</span>
                  
                  {/* Emoji del día especial/festivo predefinido */}
                  {getDiaEspecial(date) && (
                    <span className="inline-flex items-center animate-bounce" title={getDiaEspecial(date).nombre}>
                      {getDiaEspecial(date).emoji}
                    </span>
                  )}
                  
                  {/* Emojis de festivos y eventos personalizados */}
                  {getEmojisAdicionales(fechaStr).map((emoji, idx) => (
                    <span key={idx} className="inline-flex items-center text-xl animate-pulse">
                      {emoji}
                    </span>
                  ))}
                </span>
                <div className="flex flex-col gap-1 mt-1 flex-1 justify-evenly">
                  {esLComoVacaciones && <div className="text-center text-sm md:text-base bg-emerald-100 text-emerald-900 py-1.5 rounded-xl font-semibold w-full h-full flex items-center justify-center">🏖️ V (L)</div>}
                  {!esLComoVacaciones && esTurnoExtra && <div className={`text-center text-sm md:text-base py-1.5 rounded-xl w-full font-semibold turno-pill ${t.pillExtra}`}>{displayInfo?.texto}</div>}
                  {!esLComoVacaciones && esCambioL && (
                    <div className={`text-center text-sm md:text-base py-1.5 rounded-xl w-full font-semibold turno-pill ${t.pillCambio}`}>
                      {displayInfo?.texto}
                      {displayInfo?.notas && displayInfo?.turnos && (
                        <div className="mt-1 space-y-1">
                          {displayInfo.turnos.map(turno => {
                            const idx = turno === 'M' ? 0 : turno === 'T' ? 1 : 2;
                            const nota = displayInfo.notas[idx];
                            return nota ? <div key={turno} className="text-[9px] md:text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">{turno}: {nota}</div> : null;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {!esLComoVacaciones && !esTurnoExtra && !esCambioL && displayInfo && displayInfo.esDiaCompleto && (
                    <div className={`text-center text-sm md:text-base py-1.5 rounded-xl w-full font-semibold turno-pill ${displayInfo.clase}`}>
                      {displayInfo.texto}
                      {displayInfo.texto.includes('🔄') && displayInfo.notas && <span className="block text-[9px] md:text-[10px] mt-1 px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">{typeof displayInfo.notas === 'string' ? displayInfo.notas : (displayInfo.notas[0] || '')}</span>}
                    </div>
                  )}
                  {!esLComoVacaciones && !esTurnoExtra && !esCambioL && displayInfo && displayInfo.esParcial && (
                    <div className="flex flex-col gap-2 w-full">
                      {turnosBase.map((turno, idxT) => {
                        let valorMostrar = turno, bgColor = '', notaDelTurno = '', esCambioTurno = false;
                        if (displayInfo.turnosModificados && displayInfo.turnosModificados[idxT]) {
                          const modificado = displayInfo.turnosModificados[idxT];
                          if (modificado === 'C') { valorMostrar = `🔄${turno}`; bgColor = 'bg-amber-600 text-white'; esCambioTurno = true; notaDelTurno = displayInfo.notas?.[idxT] || ''; }
                          else if (typeof modificado === 'string' && modificado.startsWith('E_')) { valorMostrar = `💰${modificado.charAt(2)}`; bgColor = 'bg-yellow-500 text-white'; }
                          else if (modificado === 'V') { valorMostrar = '🏖️ V'; bgColor = 'bg-emerald-600 text-white'; }
                          else if (modificado === 'B') { valorMostrar = 'B'; bgColor = 'bg-rose-600 text-white'; }
                          else if (modificado === 'P') { valorMostrar = 'P'; bgColor = 'bg-purple-600 text-white'; }
                          else if (modificado === 'O') { valorMostrar = 'O'; bgColor = 'bg-emerald-500 text-white'; }
                          else { if (turno === 'M') bgColor = t.pillM; if (turno === 'T') bgColor = t.pillT; if (turno === 'N') bgColor = t.pillN; }
                        } else { if (turno === 'M') bgColor = t.pillM; if (turno === 'T') bgColor = t.pillT; if (turno === 'N') bgColor = t.pillN; }
                        return (
                          <div key={idxT} className="flex flex-col items-center w-full">
                            <span className={`text-xs md:text-sm font-bold px-1 py-1 rounded-xl w-full text-center turno-pill ${bgColor}`}>{valorMostrar}</span>
                            {esCambioTurno && notaDelTurno && <span className="text-[9px] md:text-[10px] text-center wrap-break-word w-full mt-1 px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">📝 {notaDelTurno}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!esLComoVacaciones && !displayInfo && (
                    <div className="flex flex-col gap-2 w-full">
                      {ordenTurnos(turnosBase).map((tv, idxT) => (
                        <span key={idxT} lang="en" translate="no" className={`text-xs md:text-sm font-bold px-1 py-1 rounded-xl w-full text-center turno-pill ${tv === 'M' ? t.pillM : tv === 'T' ? t.pillT : tv === 'N' ? t.pillN : t.pillL}`}>{tv}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* MODAL DE GESTIÓN DE DÍA */}
{(selectedDia || modalClosing) && (
  <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 ${modalClosing ? 'modal-overlay-out' : 'modal-overlay-in'}`}>
    <div className={`rounded-2xl p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border ${t.modalBg} ${darkMode ? 'border-slate-700' : 'border-slate-100'} ${modalClosing ? 'modal-content-out' : 'modal-content-in'}`}>
      <h3 className={`text-base md:text-lg font-bold mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Gestionar Día</h3>
      <p className={`text-[11px] md:text-xs mb-4 ${t.muted}`}>{selectedDia?.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      
      <div className={`mb-4 p-2 rounded-lg ${darkMode ? 'bg-blue-500/15' : 'bg-blue-500/8'}`}>
        <p className={`text-[11px] md:text-xs font-semibold mb-1 ${t.label}`}>Turnos programados:</p>
        <div className="flex flex-wrap gap-1 md:gap-2">
          {selectedDia?.turnosBase.map((turno, idx) => (
            <span key={idx} lang="en" translate="no" className={`text-[11px] md:text-xs font-bold px-2 py-1 rounded-full
              ${turno === 'M' ? (darkMode ? 'bg-sky-800 text-sky-200' : 'bg-sky-100 text-sky-700') : ''}
              ${turno === 'T' ? (darkMode ? 'bg-orange-800 text-orange-200' : 'bg-orange-100 text-orange-700') : ''}
              ${turno === 'N' ? (darkMode ? 'bg-slate-700 text-slate-200 border border-slate-500' : 'bg-slate-800 text-white') : ''}
              ${turno === 'L' ? (darkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : ''}
            `}>
              {turno === 'M' ? '🌅 Mañana' : turno === 'T' ? '☀️ Tarde' : turno === 'N' ? '🌙 Noche' : '📅 Libre'}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className={`block text-[11px] md:text-xs font-medium mb-2 ${t.muted}`}>Tipo de incidencia</label>
          
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {[
              { id: 'V', label: '🏖️ Vacaciones', bgHover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30' },
              { id: 'C', label: '🔄 Cambio', bgHover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30' },
              { id: 'B', label: '🚑 Baja', bgHover: 'hover:bg-rose-100 dark:hover:bg-rose-900/30' },
              { id: 'P', label: '📝 Permiso', bgHover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30' },
              { id: 'O', label: '❓ Otros', bgHover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30' },
              { id: 'E', label: '💰 Turno Extra', bgHover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30' }
            ].filter(btn => {
              if (btn.id === 'C') return true;
              if (btn.id === 'E') return selectedDia?.turnosBase.every(t => t === 'L') || selectedDia?.turnosBase.length === 1;
              return !selectedDia?.turnosBase.every(t => t === 'L');
            }).map(btn => {
              const isSelected = excTipo === btn.id || (btn.id === 'V' && excTipo === 'V_CICLO');
              return (
                <button key={btn.id} onClick={() => { 
                  setExcTipo(btn.id); 
                  if (btn.id === 'C' && selectedDia?.turnosBase.every(t => t === 'L')) setExcSubTiposMultiC(['M']);
                  else if (btn.id === 'E') setExcSubTiposMultiE(['M']);
                }} className={`px-3 py-2 rounded-xl border font-bold transition-all whitespace-nowrap ${isSelected ? t.typeBtnSelected : `${t.typeBtn} ${btn.bgHover}`} text-xs md:text-sm`}>
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* ========== DÍAS DE TRABAJO CON 1 TURNO - CAMBIO ========== */}
          {selectedDia?.turnosBase.length === 1 && !selectedDia?.turnosBase.every(t => t === 'L') && excTipo === 'C' && (
            <div className={`space-y-2 p-3 rounded-xl border-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 mb-3`}>
              <div className="flex items-center gap-2">
                <span className="text-sm">🔄</span>
                <span className={`text-xs font-semibold ${t.label}`}>Cambio de turno</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedDia.turnosBase[0] === 'M' ? t.pillM : selectedDia.turnosBase[0] === 'T' ? t.pillT : t.pillN}`}>
                  {selectedDia.turnosBase[0] === 'M' ? '🌅 Mañana' : selectedDia.turnosBase[0] === 'T' ? '☀️ Tarde' : '🌙 Noche'}
                </span>
                <span className={`text-[10px] ${t.muted}`}>cambia con:</span>
              </div>
              <input 
                type="text"
                value={typeof excNotas === 'object' ? (excNotas[0] || '') : (excNotas || '')}
                onChange={(e) => setExcNotas(typeof excNotas === 'object' ? { ...excNotas, [0]: e.target.value } : { 0: e.target.value })}
                placeholder="Ej. María López"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                className={`w-full p-2 border rounded-lg text-sm ${t.input}`}
              />
              <button onClick={() => handleGuardarOpcion('C')} className="w-full text-center text-[11px] md:text-xs p-2 rounded-lg font-semibold shadow-sm text-white bg-amber-600 hover:bg-amber-700">
                ✅ Aplicar 🔄 Cambio al turno {selectedDia.turnosBase[0] === 'M' ? '🌅 Mañana' : selectedDia.turnosBase[0] === 'T' ? '☀️ Tarde' : '🌙 Noche'}
              </button>
            </div>
          )}

          {/* Días de trabajo con 1 turno - V, B, P, O */}
          {selectedDia?.turnosBase.length === 1 && !selectedDia?.turnosBase.every(t => t === 'L') && excTipo !== 'V_CICLO' && excTipo !== 'E' && excTipo !== 'C' && (
            <div className={`space-y-2 p-3 rounded-xl border mb-3 ${t.optionBox}`}>
              <span className={`text-[11px] md:text-xs font-bold block ${t.muted}`}>
                {excTipo === 'V' ? '🏖️ Vacaciones' : 
                excTipo === 'B' ? '🚑 Baja' : 
                excTipo === 'P' ? '📝 Permiso' : 
                '❓ Otros'} - Día de un solo turno
              </span>
              <button 
                onClick={() => handleGuardarOpcion([excTipo])}
                className={`w-full text-left text-[11px] md:text-xs p-2 rounded-lg font-semibold shadow-sm text-white
                  ${excTipo === 'V' ? 'bg-emerald-600 hover:bg-emerald-700' : 
                    excTipo === 'B' ? 'bg-rose-600 hover:bg-rose-700' : 
                    excTipo === 'P' ? 'bg-purple-600 hover:bg-purple-700' : 
                    'bg-slate-500 hover:bg-slate-600'}`}>
                ✅ Aplicar {excTipo === 'V' ? '🏖️ Vacaciones' : excTipo === 'B' ? '🚑 Baja' : excTipo === 'P' ? '📝 Permiso' : '❓ Otros'} al turno {selectedDia.turnosBase[0] === 'M' ? '🌅 Mañana' : selectedDia.turnosBase[0] === 'T' ? '☀️ Tarde' : '🌙 Noche'}
              </button>
            </div>
          )}

          {/* ========== DÍAS DE TRABAJO CON 2 TURNOS - CAMBIO con toggles y notas ========== */}
          {selectedDia?.turnosBase.length === 2 && excTipo === 'C' && !selectedDia?.turnosBase.every(t => t === 'L') && (
            <div className="space-y-3 p-3 rounded-xl border-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔄</span>
                <span className={`text-xs font-semibold ${t.label}`}>Cambio de turnos - selecciona qué turnos cambian:</span>
              </div>
              
              {/* Loop para cada turno */}
              {selectedDia.turnosBase.map((turno, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        turno === 'M' ? t.pillM : turno === 'T' ? t.pillT : t.pillN
                      }`}>
                        {turno === 'M' ? '🌅 Mañana' : turno === 'T' ? '☀️ Tarde' : '🌙 Noche'}
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">Cambiar</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={excSubTiposMultiC.includes(turno)}
                        onClick={() => toggleSubTipoMultiC(turno)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all ${
                          excSubTiposMultiC.includes(turno) 
                            ? 'bg-amber-500' 
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-all ${
                            excSubTiposMultiC.includes(turno) 
                              ? 'translate-x-4' 
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                  {excSubTiposMultiC.includes(turno) && (
                    <input 
                      type="text"
                      value={typeof excNotas === 'object' ? (excNotas[idx] || '') : ''}
                      onChange={(e) => setExcNotas(prev => ({ ...(typeof prev === 'object' ? prev : {}), [idx]: e.target.value }))}
                      placeholder="Con quién cambia este turno"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      className={`w-full mt-2 p-1.5 border rounded-lg text-xs ${t.input}`}
                    />
                  )}
                </div>
              ))}
              
              <button 
                onClick={() => { 
                  const tipoFinal = selectedDia.turnosBase.map((turno, idxTurno) => 
                    excSubTiposMultiC.includes(turno) ? 'C' : turno
                  ); 
                  handleGuardarOpcion(tipoFinal); 
                }}
                disabled={excSubTiposMultiC.length === 0}
                className={`w-full text-center text-[11px] md:text-xs p-2 rounded-lg font-semibold shadow transition-all ${
                  excSubTiposMultiC.length === 0 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                ✅ Aplicar Cambio a {excSubTiposMultiC.length} turno{excSubTiposMultiC.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* ========== DÍAS DE TRABAJO CON 2 TURNOS - V, B, P, O ========== */}
          {selectedDia?.turnosBase.length === 2 && excTipo !== 'V_CICLO' && excTipo !== 'E' && excTipo !== 'C' && (
            <div className={`space-y-2 p-3 rounded-xl border mb-3 ${t.optionBox}`}>
              <span className={`text-[11px] md:text-xs font-bold block ${t.muted}`}>
                {excTipo === 'V' ? '🏖️ Vacaciones - Selecciona turnos:' : 
                excTipo === 'B' ? '🚑 Baja - Selecciona turnos:' : 
                excTipo === 'P' ? '📝 Permiso - Selecciona turnos:' : 
                '❓ Otros - Selecciona turnos:'}
              </span>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => handleGuardarOpcion([excTipo, selectedDia.turnosBase[1]])} 
                  className={`text-left text-[11px] md:text-xs p-2 rounded-lg border transition-all ${t.optionBtn}`}>
                  🌅 Solo {selectedDia.turnosBase[0] === 'M' ? 'Mañana' : selectedDia.turnosBase[0] === 'T' ? 'Tarde' : 'Noche'} → {excTipo === 'V' ? '🏖️ Vacaciones' : excTipo === 'B' ? '🚑 Baja' : excTipo === 'P' ? '📝 Permiso' : '❓ Otros'}, {selectedDia.turnosBase[1] === 'M' ? 'Mañana' : selectedDia.turnosBase[1] === 'T' ? 'Tarde' : 'Noche'} queda igual
                </button>
                <button onClick={() => handleGuardarOpcion([selectedDia.turnosBase[0], excTipo])} 
                  className={`text-left text-[11px] md:text-xs p-2 rounded-lg border transition-all ${t.optionBtn}`}>
                  🌙 Solo {selectedDia.turnosBase[1] === 'M' ? 'Mañana' : selectedDia.turnosBase[1] === 'T' ? 'Tarde' : 'Noche'} → {excTipo === 'V' ? '🏖️ Vacaciones' : excTipo === 'B' ? '🚑 Baja' : excTipo === 'P' ? '📝 Permiso' : '❓ Otros'}, {selectedDia.turnosBase[0] === 'M' ? 'Mañana' : selectedDia.turnosBase[0] === 'T' ? 'Tarde' : 'Noche'} queda igual
                </button>
                <button onClick={() => handleGuardarOpcion([excTipo, excTipo])} 
                  className={`text-left text-[11px] md:text-xs p-2 rounded-lg font-semibold shadow-sm text-white
                    ${excTipo === 'V' ? 'bg-emerald-600 hover:bg-emerald-700' : 
                      excTipo === 'B' ? 'bg-rose-600 hover:bg-rose-700' : 
                      excTipo === 'P' ? 'bg-purple-600 hover:bg-purple-700' : 
                      'bg-slate-500 hover:bg-slate-600'}`}>
                  ✅ Día completo (ambos turnos) → {excTipo === 'V' ? '🏖️ Vacaciones' : excTipo === 'B' ? '🚑 Baja' : excTipo === 'P' ? '📝 Permiso' : '❓ Otros'}
                </button>
              </div>
            </div>
          )}

          {/* ========== CICLO DE VACACIONES ========== */}
          {excTipo === 'V' && (
            <button onClick={() => handleGuardarOpcion('V_CICLO')} 
              className={`w-full text-left text-[11px] md:text-xs p-2 rounded-lg border transition-all mb-3 ${t.optionBtn}`}>
              🔄 Marcar todo el CICLO de vacaciones (todos los turnos del ciclo)
            </button>
          )}

          {/* DÍAS L - CAMBIO con notas por turno */}
          {selectedDia?.turnosBase.every(t => t === 'L') && excTipo === 'C' && (
            <div className={`space-y-3 p-3 rounded-xl border-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 mb-3`}>
              <div className="flex items-center gap-2">
                <span className="text-sm">🔄</span>
                <span className={`text-xs font-semibold ${t.label}`}>Cambio - Selecciona los turnos a cambiar:</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {['M', 'T', 'N'].map(turno => (
                  <button 
                    key={turno}
                    onClick={() => toggleSubTipoMultiC(turno)}
                    className={`text-center text-[11px] md:text-xs px-3 py-2 rounded-lg border transition-all ${excSubTiposMultiC.includes(turno) ? 'bg-amber-500 text-white' : t.optionBtn}`}>
                    {turno === 'M' ? '🌅 Mañana' : turno === 'T' ? '☀️ Tarde' : '🌙 Noche'}
                  </button>
                ))}
              </div>
              
              {excSubTiposMultiC.length > 0 && (
                <div className="mt-2 space-y-2">
                  <span className={`text-[10px] font-semibold ${t.muted}`}>Notas (opcional):</span>
                  {[...excSubTiposMultiC].sort((a, b) => {
                    const orden = { 'M': 0, 'T': 1, 'N': 2 };
                    return orden[a] - orden[b];
                  }).map(turno => {
                    const idx = turno === 'M' ? 0 : turno === 'T' ? 1 : 2;
                    return (
                      <div key={turno} className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${turno === 'M' ? t.pillM : turno === 'T' ? t.pillT : t.pillN}`}>
                          {turno === 'M' ? '🌅 Mañana' : turno === 'T' ? '☀️ Tarde' : '🌙 Noche'}
                        </span>
                        <input 
                          type="text"
                          value={typeof excNotas === 'object' ? (excNotas[idx] || '') : ''}
                          onChange={(e) => setExcNotas(prev => ({ ...(typeof prev === 'object' ? prev : {}), [idx]: e.target.value }))}
                          placeholder="Con quién cambia este turno (opcional)"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck="false"
                          className={`flex-1 p-1.5 border rounded-lg text-xs ${t.input}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className={`text-[10px] md:text-xs ${t.muted} mt-1`}>
                Turnos seleccionados: {[...excSubTiposMultiC].sort((a, b) => {
                  const orden = { 'M': 0, 'T': 1, 'N': 2 };
                  return orden[a] - orden[b];
                }).map(turno => turno === 'M' ? '🌅 Mañana' : turno === 'T' ? '☀️ Tarde' : '🌙 Noche').join(', ')}
              </div>
              
              <button 
                onClick={() => {
                  const orden = { 'M': 0, 'T': 1, 'N': 2 };
                  const turnosOrdenados = [...excSubTiposMultiC].sort((a, b) => orden[a] - orden[b]);
                  handleGuardarOpcion('C', turnosOrdenados.join(''));
                }}
                disabled={excSubTiposMultiC.length === 0}
                className={`w-full text-center text-[11px] md:text-xs p-2 rounded-lg font-semibold shadow-sm text-white ${excSubTiposMultiC.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'}`}>
                🔄 Guardar Cambio en {[...excSubTiposMultiC].sort((a, b) => {
                  const orden = { 'M': 0, 'T': 1, 'N': 2 };
                  return orden[a] - orden[b];
                }).map(turno => turno === 'M' ? '🌅 Mañana' : turno === 'T' ? '☀️ Tarde' : '🌙 Noche').join(', ')}
              </button>
            </div>
          )}

          {/* ========== DÍAS L - TURNO EXTRA ========== */}
          {selectedDia?.turnosBase.every(t => t === 'L') && excTipo === 'E' && (
            <div className={`space-y-2 p-3 rounded-xl border mb-3 ${t.optionBox}`}>
              <span className={`text-[11px] md:text-xs font-bold block ${t.muted}`}>💰 Turno Extra - Selecciona los turnos:</span>
              <div className="flex flex-wrap gap-2">
                {['M', 'T', 'N'].map(turno => (
                  <button 
                    key={turno}
                    onClick={() => toggleSubTipoMultiE(turno)}
                    className={`text-center text-[11px] md:text-xs px-3 py-2 rounded-lg border transition-all ${excSubTiposMultiE.includes(turno) ? 'bg-yellow-500 text-white' : t.optionBtn}`}>
                    {turno === 'M' ? '🌅 Mañana' : turno === 'T' ? '☀️ Tarde' : '🌙 Noche'}
                  </button>
                ))}
              </div>
              <div className={`text-[10px] md:text-xs ${t.muted} mt-1`}>
                Turnos seleccionados: {excSubTiposMultiE.sort().map(t => t === 'M' ? '🌅 Mañana' : t === 'T' ? '☀️ Tarde' : '🌙 Noche').join(', ')}
              </div>
              <button 
                onClick={() => { const orden = { 'M': 0, 'T': 1, 'N': 2 }; const turnosOrdenados = [...excSubTiposMultiE].sort((a, b) => orden[a] - orden[b]); handleGuardarOpcion('E', turnosOrdenados.join('')); }}
                disabled={excSubTiposMultiE.length === 0}
                className={`w-full text-center text-[11px] md:text-xs p-2 rounded-lg font-semibold shadow-sm text-white ${excSubTiposMultiE.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
                💰 Guardar Turno Extra
              </button>
            </div>
          )}

          {/* ========== TURNO EXTRA - Días de trabajo de 1 turno ========== */}
          {!selectedDia?.turnosBase.every(t => t === 'L') && selectedDia?.turnosBase.length === 1 && excTipo === 'E' && (
            <div className={`space-y-2 p-3 rounded-xl border mb-3 ${t.optionBox}`}>
              <span className={`text-[11px] md:text-xs font-bold block ${t.muted}`}>
                💰 Turno Extra - Día con turno {selectedDia.turnosBase[0] === 'M' ? '🌅 Mañana' : selectedDia.turnosBase[0] === 'T' ? '☀️ Tarde' : '🌙 Noche'}
              </span>
              <p className={`text-[10px] ${t.muted} mb-2`}>
                Selecciona qué turno adicional quieres trabajar (trabajarás dos turnos ese día):
              </p>
              <div className="flex flex-wrap gap-2">
                {['M', 'T', 'N'].filter(turno => turno !== selectedDia.turnosBase[0]).map(turnoExtra => {
                  const turnoOriginal = selectedDia.turnosBase[0];
                  let tipoFinal = [];
                  const orden = { 'M': 0, 'T': 1, 'N': 2 };
                  if (orden[turnoOriginal] < orden[turnoExtra]) { tipoFinal = [turnoOriginal, `E_${turnoExtra}`]; }
                  else { tipoFinal = [`E_${turnoExtra}`, turnoOriginal]; }
                  return (
                    <button 
                      key={turnoExtra}
                      onClick={() => handleGuardarOpcion(tipoFinal)}
                      className={`text-center text-[11px] md:text-xs px-3 py-2 rounded-lg border transition-all ${t.optionBtn}`}>
                      Añadir {turnoExtra === 'M' ? '🌅 Mañana' : turnoExtra === 'T' ? '☀️ Tarde' : '🌙 Noche'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========== DÍAS DE TRABAJO DE 2 TURNOS - TURNO EXTRA NO DISPONIBLE ========== */}
          {!selectedDia?.turnosBase.every(t => t === 'L') && selectedDia?.turnosBase.length === 2 && excTipo === 'E' && (
            <div className={`space-y-2 p-3 rounded-xl border mb-3 bg-gray-100 dark:bg-gray-800 ${t.optionBox}`}>
              <span className={`text-[11px] md:text-xs font-bold block ${t.muted}`}>
                ⚠️ Turno Extra no disponible
              </span>
              <p className={`text-[10px] ${t.muted}`}>
                En días con dos turnos ya estás trabajando ambos turnos. Los turnos extra solo se pueden asignar en días libres (L) o días de un solo turno.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        {selectedDia?.excepcion && (
          <button onClick={() => eliminarExcepcion(selectedDia.fechaStr)} 
            className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-2 rounded-xl text-sm transition-all">
            Eliminar
          </button>
        )}
        <button onClick={() => cerrarModal(setSelectedDia, setModalClosing)} 
          className={`flex-1 font-semibold py-2 rounded-xl text-sm transition-all ${t.cancelBtn}`}>
          ❌ Cancelar
        </button>
      </div>
    </div>
  </div>
)}

{/* MODAL CONFIGURACIÓN */}
{(showConfig || configClosing) && (
  <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 ${configClosing ? 'modal-overlay-out' : 'modal-overlay-in'}`}>
    <div className={`rounded-2xl p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border ${t.modalBg} ${darkMode ? 'border-slate-700' : 'border-slate-100'} ${configClosing ? 'modal-content-out' : 'modal-content-in'}`}>
      <h3 className={`text-lg md:text-xl font-bold mb-4 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Configuración</h3>
      <ThemeToggle />
      <div className={`mb-6 pb-6 border-b ${t.divider}`}>
        <h4 className={`text-sm font-semibold mb-2 ${t.sectionTitle}`}>Cambiar cadencia activa y/o fecha de inicio</h4>
        <div className="space-y-3">
          <select value={patronActivoId} onChange={(e) => setPatronActivoId(e.target.value)} className={`w-full p-2.5 border rounded-xl text-sm ${t.input}`}>
            {patrones.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} autoComplete="off" className={`w-full p-2.5 border rounded-xl text-sm ${t.input}`} />
        </div>
      </div>
      <div className={`mb-6 pb-6 border-b ${t.divider}`}>
        <h4 className={`text-sm font-semibold mb-2 ${t.sectionTitle}`}>Añadir nueva cadencia personalizada</h4>
        <div className={`space-y-3 p-3 rounded-xl border ${t.patronBox}`}>
          <input type="text" placeholder="Nombre (ej: Mi Cadencia 4x4)" value={nuevoNombrePatron} onChange={(e) => setNuevoNombrePatron(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" className={`w-full p-2 border rounded-lg text-sm ${t.patronInput}`} />
          <input type="text" placeholder="Secuencia (ej: M/T/N/L/L)" value={nuevaSecuenciaStr} onChange={(e) => setNuevaSecuenciaStr(e.target.value.toUpperCase())} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" className={`w-full p-2 border rounded-lg text-sm font-mono ${t.patronInput}`} />
          <p className={`text-[10px] mt-1 ${t.muted}`}>Usa "/" para cambiar de día. Combina letras para el mismo día (ej: MT/MN/L).</p>
          <button onClick={agregarNuevoPatron} className={`w-full flex items-center justify-center gap-1 text-white text-xs font-semibold py-2 rounded-lg transition-all ${darkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-800 hover:bg-slate-900'}`}><Plus size={14} /> Registrar cadencia</button>
        </div>
      </div>
      <div className="mb-4">
        <label className={`block text-xs font-medium mb-1 ${t.muted}`}>Días Totales de Vacaciones</label>
        <input type="number" value={vacacionesTotales} onChange={(e) => setVacacionesTotales(Number(e.target.value))} min="0" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck="false" className={`w-full p-2.5 border rounded-xl text-sm ${t.input}`} />
      </div>
      <div className={`mb-6 pb-6 border-b ${t.divider}`}>
        <h4 className={`text-sm font-semibold mb-2 ${t.sectionTitle}`}>🔔 Notificaciones</h4>
        <div className="flex items-center justify-between">
          <div><p className={`text-sm ${t.label}`}>Recordatorios</p><p className={`text-[10px] ${t.muted}`}>Recibe notificaciones de cambios y turnos extra</p></div>
          <button
            onClick={() => {
              try {
                const nuevoEstado = !notificacionesActivas;
                setNotificacionesActivas(nuevoEstado);
                localStorage.setItem('shiftapp_notificaciones', nuevoEstado);
                
                if (nuevoEstado && typeof Notification !== 'undefined') {
                  if (Notification.permission === 'default') {
                    Notification.requestPermission().catch(err => {
                      setErrorTemporal(`Error al pedir permiso de notificaciones:\n${err.message}`);
                      setNotificacionesActivas(false);
                      localStorage.setItem('shiftapp_notificaciones', 'false');
                    });
                  } else if (Notification.permission === 'denied') {
                    setErrorTemporal('No se pueden activar notificaciones porque el usuario las ha denegado previamente. Ve a la configuración del navegador para habilitarlas.');
                    setNotificacionesActivas(false);
                    localStorage.setItem('shiftapp_notificaciones', 'false');
                  }
                } else if (nuevoEstado && typeof Notification === 'undefined') {
                  setErrorTemporal('Este navegador no soporta notificaciones.');
                  setNotificacionesActivas(false);
                  localStorage.setItem('shiftapp_notificaciones', 'false');
                }
              } catch (error) {
                setErrorTemporal(`Error al cambiar notificaciones:\n${error.message}\n\n${error.stack}`);
                setNotificacionesActivas(!nuevoEstado);
                localStorage.setItem('shiftapp_notificaciones', !nuevoEstado);
              }
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificacionesActivas ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${notificacionesActivas ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
      <div className="mb-4 pt-4 border-t border-red-500/30">
        <button onClick={() => setShowResetConfirm(true)} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2">🔄 RESET COMPLETO - Borrar todos los datos</button>
        <p className={`text-[10px] text-center mt-2 ${t.muted}`}>Borra toda la configuración y vuelve a empezar desde cero</p>
      </div>
      <button onClick={() => cerrarModal(setShowConfig, setConfigClosing)} className={`w-full font-semibold py-2.5 rounded-xl text-sm transition-all ${t.closeBtn}`}>⚙️ Cerrar Ajustes</button>
    </div>
  </div>
)}

{/* MODAL DE CONFIRMACIÓN PARA RESET */}
{(showResetConfirm || resetClosing) && (
  <div className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-60 ${resetClosing ? 'modal-overlay-out' : 'modal-overlay-in'}`}>
    <div className={`rounded-2xl p-6 w-full max-w-sm shadow-2xl border ${t.modalBg} ${darkMode ? 'border-slate-700' : 'border-slate-100'} ${resetClosing ? 'modal-content-out' : 'modal-content-in'}`}>
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4"><span className="text-3xl">⚠️</span></div>
        <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>¿Borrar todos los datos?</h3>
        <p className={`text-sm mb-4 ${t.muted}`}>Esta acción eliminará permanentemente:</p>
        <div className={`text-left text-xs space-y-1 mb-6 p-3 rounded-xl ${darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-600'}`}>
          <p>• Todas las vacaciones, cambios, bajas, permisos, otros y turnos extra</p>
          <p>• Todos los patrones personalizados creados</p>
          <p>• La configuración de cadencia y fecha de inicio</p>
          <p className="font-bold mt-2">Esta acción NO SE PUEDE DESHACER.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => cerrarModal(setShowResetConfirm, setResetClosing)} className={`flex-1 font-semibold py-2.5 rounded-xl text-sm transition-all ${t.cancelBtn}`}>Cancelar</button>
          <button onClick={resetCompleto} 
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all">
            Sí, borrar todo
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* MODAL RESUMEN */}
{(showResumen || resumenClosing) && (
  <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 ${resumenClosing ? 'modal-overlay-out' : 'modal-overlay-in'}`}>
    <div className={`rounded-2xl p-4 md:p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border ${t.modalBg} ${darkMode ? 'border-slate-700' : 'border-slate-100'} ${resumenClosing ? 'modal-content-out' : 'modal-content-in'}`}>
      <h3 className={`text-lg md:text-xl font-bold mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Resumen</h3>
      <div className="grid grid-cols-2 gap-2 mb-5">
        <div><label className={`block text-[10px] md:text-[11px] font-medium mb-1 ${t.muted}`}>Desde</label><input type="date" value={resumenInicio} onChange={(e) => setResumenInicio(e.target.value)} autoComplete="off" className={`w-full p-2 border rounded-lg text-xs ${t.input}`} /></div>
        <div><label className={`block text-[10px] md:text-[11px] font-medium mb-1 ${t.muted}`}>Hasta</label><input type="date" value={resumenFin} onChange={(e) => setResumenFin(e.target.value)} autoComplete="off" className={`w-full p-2 border rounded-lg text-xs ${t.input}`} /></div>
      </div>
      <div className="space-y-2">
        <div className={`p-3 rounded-xl border ${t.resVac}`}>
          <div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold flex items-center gap-2">🏖️ Vacaciones (V)</span><span className="text-lg font-bold">{conteoResumen.V} / {vacacionesTotales}</span></div>
          <div className="w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-2.5 mb-2"><div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min((conteoResumen.V / vacacionesTotales) * 100, 100)}%` }}></div></div>
          <div className="flex justify-between items-center text-xs opacity-75"><span>Consumidas: {conteoResumen.V}</span></div>
          <div className="flex justify-between items-center text-sm font-black mt-2"><span>Restantes:</span><span className="text-base">{vacacionesTotales - conteoResumen.V}</span></div>
        </div>
        <div className={`flex justify-between items-center p-3 rounded-xl border ${t.resCambio}`}><span className="text-sm font-semibold flex items-center gap-2">🔄 Cambios (C)</span><span className="text-lg font-bold">{conteoResumen.C}</span></div>
        <div className={`flex justify-between items-center p-3 rounded-xl border ${t.resBaja}`}><span className="text-sm font-semibold flex items-center gap-2">🚑 Días de Baja (B)</span><span className="text-lg font-bold">{conteoResumen.B}</span></div>
        <div className={`flex justify-between items-center p-3 rounded-xl border ${t.resPermiso}`}><span className="text-sm font-semibold flex items-center gap-2">📝 Días de Permiso (P)</span><span className="text-lg font-bold">{conteoResumen.P}</span></div>
        <div className={`flex justify-between items-center p-3 rounded-xl border ${t.resOtros}`}><span className="text-sm font-semibold flex items-center gap-2">❓ Otros (O)</span><span className="text-lg font-bold}">{conteoResumen.O}</span></div>
        <div className={`flex justify-between items-center p-3 rounded-xl border ${t.resExtra}`}><span className="text-sm font-semibold flex items-center gap-2">💰 Turnos Extra (E)</span><span className="text-lg font-bold">{conteoResumen.E}</span></div>
      </div>
      <button onClick={() => cerrarModal(setShowResumen, setResumenClosing)} className={`w-full mt-4 font-semibold py-2.5 rounded-xl text-sm transition-all ${t.cancelBtn}`}>🗓️ Volver al Calendario</button>
    </div>
  </div>
)}

{/* MODAL UNIFICADO DE FESTIVOS Y EVENTOS */}
{(showActionModal || actionModalClosing) && actionModalData && (
  <div 
    className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 ${actionModalClosing ? 'modal-overlay-out' : 'modal-overlay-in'}`}
    onClick={() => cerrarModal(setShowActionModal, setActionModalClosing)}
  >
    <div 
      className={`rounded-2xl p-4 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border ${t.modalBg} ${darkMode ? 'border-slate-700' : 'border-slate-100'} ${actionModalClosing ? 'modal-content-out' : 'modal-content-in'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className={`text-base md:text-lg font-bold mb-3 text-center ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
        {actionModalData.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
      </h3>
      
      {/* Sección de Festivo */}
      <div className="mb-4 p-3 rounded-xl border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎉</span>
            <span className={`text-sm font-semibold ${t.label}`}>Festivo local</span>
          </div>
          {festivos[actionModalData.fechaStr] && (
            <button
              onClick={() => {
                const nuevos = { ...festivos };
                delete nuevos[actionModalData.fechaStr];
                setFestivos(nuevos);
              }}
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-all"
              title="Eliminar festivo"
            >
              ❌
            </button>
          )}
        </div>
        
        {festivos[actionModalData.fechaStr] ? (
          <div className="flex items-center gap-2 text-lg">
            <span>{festivos[actionModalData.fechaStr].emoji}</span>
            <span className="font-medium text-sm">{festivos[actionModalData.fechaStr].nombre}</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nombre"
              value={nuevoFestivoNombre}
              onChange={(e) => setNuevoFestivoNombre(e.target.value)}
              className={`flex-1 p-2 border rounded-lg text-sm ${t.input}`}
              tabIndex={-1}
            />
            <div className="flex gap-2 justify-between">
              <input
                type="text"
                placeholder="Emoji"
                value={nuevoFestivoEmoji}
                onChange={(e) => setNuevoFestivoEmoji(e.target.value)}
                className="w-16 p-2 border rounded-lg text-center text-lg"
                maxLength="2"
                tabIndex={-1}
              />
              <button
                onClick={() => {
                  if (nuevoFestivoNombre.trim()) {
                    setFestivos(prev => ({
                      ...prev,
                      [actionModalData.fechaStr]: {
                        nombre: nuevoFestivoNombre.trim(),
                        emoji: nuevoFestivoEmoji || '🎉'
                      }
                    }));
                    setNuevoFestivoNombre('');
                    setNuevoFestivoEmoji('🎉');
                  }
                }}
                disabled={!nuevoFestivoNombre.trim()}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-2xl font-semibold disabled:opacity-50 transition-all whitespace-nowrap"
              >
                📆
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Sección de Eventos */}
      <div className="mb-4 p-3 rounded-xl border-2 border-blue-200 dark:border-blue-400">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📒</span>
          <span className={`text-sm font-semibold ${t.label}`}>Eventos</span>
        </div>
        
        {/* Lista de eventos existentes */}
        <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
          {(eventos[actionModalData.fechaStr] || []).map(evento => (
            <div key={evento.id} className={`p-2 rounded-lg mb-2 ${t.optionBox}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{evento.emoji}</span>
                  <div>
                    <span className="text-sm">{evento.nombre}</span>
                    {evento.hora && (
                      <span className="bg-gray-200 border-2 rounded-xl border-gray-400 p-1 text-sm ml-2 text-gray-500">🕐 {evento.hora}h</span>
                    )}
                  
                    {evento.repite && (
                      <span className="bg-gray-200 border-2 rounded-full border-gray-400 p-1 text-sm ml-2 text-gray-500">♻️ {evento.frecuencia}d</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => eliminarEventoCompleto(evento.id, actionModalData.fechaStr, evento)}
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  ❌
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Formulario para nuevo evento */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                list="eventosPredefinidos"
                placeholder="Nombre del evento"
                value={nuevoEventoNombre}
                onChange={(e) => {
                  const value = e.target.value;
                  setNuevoEventoNombre(value);
                  
                  const seleccionado = EVENTOS_PREDEFINIDOS.find(
                    evento => evento.nombre.toLowerCase() === value.toLowerCase()
                  );
                  
                  if (seleccionado) {
                    setNuevoEventoEmoji(seleccionado.emoji);
                  }
                }}
                onBlur={(e) => {
                  // Al salir del input, si el texto coincide con un evento predefinido, asigna emoji
                  const value = e.target.value;
                  const seleccionado = EVENTOS_PREDEFINIDOS.find(
                    evento => evento.nombre.toLowerCase() === value.toLowerCase()
                  );
                  if (seleccionado && !nuevoEventoEmoji) {
                    setNuevoEventoEmoji(seleccionado.emoji);
                  }
                }}
                className={`w-full p-2 border rounded-lg text-sm ${t.input}`}
              />
              <datalist id="eventosPredefinidos">
                {EVENTOS_PREDEFINIDOS.map(evento => (
                  <option key={evento.nombre} value={evento.nombre} />
                ))}
              </datalist>
            </div>
            <div className="flex justify-between gap-2">
              <input
                type="text"
                placeholder="Emoji"
                value={nuevoEventoEmoji}
                onChange={(e) => setNuevoEventoEmoji(e.target.value)}
                className="w-16 p-2 border rounded-lg text-center text-lg"
                maxLength="2"
              />
              <button
                onClick={() => {
                  // Validaciones básicas
                  if (!nuevoEventoNombre.trim()) {
                    alert('El nombre del evento es obligatorio');
                    return;
                  }
                  if (!nuevoEventoEmoji) {
                    alert('El emoji del evento es obligatorio');
                    return;
                  }
                  
                  // Validaciones para eventos repetidos
                  if (nuevoEventoRepite) {
                    if (!nuevoEventoFechaFin) {
                      alert('Debes seleccionar una fecha de finalización');
                      return;
                    }
                    
                    const fechaInicioEvento = new Date(actionModalData.fechaStr);
                    const fechaFinEvento = new Date(nuevoEventoFechaFin);
                    
                    if (fechaFinEvento <= fechaInicioEvento) {
                      alert('La fecha final debe ser posterior a la fecha del evento');
                      return;
                    }
                    
                    if (nuevoEventoFrecuencia < 1 || nuevoEventoFrecuencia > 999) {
                      alert('La frecuencia debe estar entre 1 y 999 días');
                      return;
                    }
                  }
                  
                  // Crear y guardar evento
                  const eventoData = {
                    id: `evt_${Date.now()}`,
                    nombre: nuevoEventoNombre.trim(),
                    emoji: nuevoEventoEmoji,
                    hora: nuevoEventoHora || null,
                    repite: nuevoEventoRepite,
                    frecuencia: nuevoEventoRepite ? nuevoEventoFrecuencia : null,
                    fechaFin: nuevoEventoRepite ? nuevoEventoFechaFin : null
                  };
                  
                  guardarEvento(actionModalData.fechaStr, eventoData);
                  
                  // Resetear formulario
                  setNuevoEventoNombre('');
                  setNuevoEventoEmoji('📌');
                  setNuevoEventoHora('');
                  setNuevoEventoRepite(false);
                  setNuevoEventoFrecuencia(7);
                  setNuevoEventoFechaFin('');
                }}
                disabled={!nuevoEventoNombre.trim() || !nuevoEventoEmoji}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-2xl font-semibold disabled:opacity-50 transition-all whitespace-nowrap"
              >
                📌
              </button>
            </div>
          </div>
          
          {/* ✅ NUEVO: Campo de hora opcional */}
          <div className="flex items-center gap-2">
            <span className={`text-sm ${t.label}`}>🕐 Hora (opcional)</span>
            <select
              value={nuevoEventoHora}
              onChange={(e) => setNuevoEventoHora(e.target.value)}
              className={`flex-1 p-2 border rounded-lg text-sm ${t.input}`}
            >
              <option value="">-- Sin hora --</option>
              {generarOpcionesHoras()}
            </select>
          </div>
          
          {/* Toggle para repetición */}
          <div className="flex items-center justify-between">
            <span className={`text-sm ${t.label}`}>Repetir evento</span>
            <button
              type="button"
              role="switch"
              aria-checked={nuevoEventoRepite}
              onClick={() => setNuevoEventoRepite(!nuevoEventoRepite)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                nuevoEventoRepite ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-all ${
                nuevoEventoRepite ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          {/* Opciones de repetición */}
          {nuevoEventoRepite && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${t.muted}`}>Cada</span>
                <input
                  type="number"
                  value={nuevoEventoFrecuencia}
                  onChange={(e) => setNuevoEventoFrecuencia(Number(e.target.value))}
                  min="1"
                  max="999"
                  className="w-16 p-1.5 border rounded-lg text-xs text-center"
                />
                <span className={`text-xs ${t.muted}`}>días</span>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-35">
                <span className={`text-xs ${t.muted}`}>Hasta</span>
                <input
                  type="date"
                  value={nuevoEventoFechaFin}
                  onChange={(e) => setNuevoEventoFechaFin(e.target.value)}
                  min={actionModalData?.fechaStr}
                  className={`flex-1 p-1.5 border rounded-lg text-xs ${t.input}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <button
        onClick={() => cerrarModal(setShowActionModal, setActionModalClosing)}
        className={`w-full text-center py-3 rounded-xl font-semibold transition-all ${t.cancelBtn}`}
      >
        Cerrar
      </button>
    </div>
  </div>
)}
{/* MODAL DE ERROR TEMPORAL (para depuración) */}
{errorTemporal && (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center p-4 z-9999">
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-red-500">
      <div className="text-center mb-4">
        <span className="text-5xl">🐛</span>
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mt-2">Error detectado</h2>
      </div>
      
      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
        <p className="text-sm font-mono text-red-700 dark:text-red-300 wrap-break-word">
          {errorTemporal}
        </p>
      </div>
      
      <button
        onClick={() => setErrorTemporal(null)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-all"
      >
        Cerrar
      </button>
    </div>
  </div>
)}
    </div>
  );
}catch(error){
    // Mostrar error directamente en el body
    document.body.innerHTML = `
      <div style="background: black; color: red; padding: 20px; font-family: monospace; white-space: pre-wrap; height: 100vh; overflow: auto;">
        <h2>❌ ERROR EN ShiftApp</h2>
        <p><strong>Mensaje:</strong> ${error.message}</p>
        <p><strong>Stack:</strong></p>
        <pre style="color: #0f0; font-size: 10px;">${error.stack}</pre>
        <button onclick="localStorage.clear(); window.location.reload();" style="margin-top: 20px; padding: 10px; background: red; color: white; border: none;">
          LIMPIAR TODO
        </button>
      </div>
    `;
    return null;
  }
}
