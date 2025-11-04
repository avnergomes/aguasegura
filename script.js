(() => {
  'use strict';

  const turf = window.turf || null;
  const pako = window.pako || null;

  function resolveAppBaseUrl() {
    try {
      if (typeof window !== 'undefined' && window.__APP_BASE_URL__) {
        return window.__APP_BASE_URL__;
      }
      const base = new URL('./', window.location.href);
      if (typeof window !== 'undefined') {
        window.__APP_BASE_URL__ = base.href;
      }
      return base.href;
    } catch (error) {
      console.warn('Não foi possível determinar a URL base automaticamente.', error);
      return './';
    }
  }

  const APP_BASE_URL = resolveAppBaseUrl();
  const DATA_BASE_URL = new URL('data/', APP_BASE_URL);

  const fmt = {
    ha(value) {
      if (!Number.isFinite(value)) return '0,00';
      const abs = Math.abs(value);
      const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
    },
    km(value) {
      if (!Number.isFinite(value)) return '0,00';
      const abs = Math.abs(value);
      const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
    },
    count(value) {
      if (!Number.isFinite(value)) return '0';
      return Math.round(value).toLocaleString('pt-BR');
    },
    pct(value) {
      if (!Number.isFinite(value)) return '0,0';
      return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
    }
  };

  const CODE_FIELD_CANDIDATES = [
    'Cod_otto',
    'COD_OTTO',
    'cod_otto',
    'codotto',
    'Cod_otto_1',
    'COD_OTTO_1',
    'cod_otto_1',
    'Cod_otto_2',
    'COD_OTTO_2',
    'cod_otto_2',
    'Cod_otto_3',
    'COD_OTTO_3',
    'cod_otto_3',
    'Cod_bacia',
    'COD_BACIA',
    'cod_bacia',
    'cobacia',
    'cobacia_2011',
    'Cod_man',
    'COD_MAN',
    'cod_man',
    'codman'
  ];
  const MICRO_NAME_FIELDS = ['Nome_bacia', 'NOME_BACIA', 'nome_bacia'];
  const MICRO_MANANCIAL_FIELDS = ['Página1_M', 'Pagina1_M', 'Manancial', 'MANANCIAL', 'manancial', 'manancial_1', 'manancial_2'];
  const MICRO_MANANCIAL_CODE_FIELDS = [
    'Cod_man',
    'COD_MAN',
    'cod_man',
    'codman',
    'cod_man_1',
    'cod_man_2',
    'COD_MAN_1',
    'COD_MAN_2'
  ];
  const MICRO_REGION_FIELDS = [
    'Regiao',
    'REGIAO',
    'Região',
    'REGIÃO',
    'Página1_R',
    'Pagina1_R',
    'regional_i_1',
    'regional_i_2',
    'regional',
    'regiao'
  ];
  const MICRO_MUNICIPIO_FIELDS = [
    'Municipio',
    'MUNICIPIO',
    'Município',
    'MUNICÍPIO',
    'Página1_N',
    'Pagina1_N',
    'municipio',
    'municipio_1',
    'municipio_2'
  ];
  const MICRO_CLASS_FIELDS = ['Classe', 'CLASSE'];
  const MICRO_REGION_PATTERNS = [/reg[ií]a[õo]/i, /regional/i];
  const MICRO_MUNICIPIO_PATTERNS = [/munic[ií]pio/i, /prefeit/i, /cidade/i];
  const MICRO_MANANCIAL_PATTERNS = [/mananc/i];
  const MICRO_MANANCIAL_CODE_PATTERNS = [/cod.*man/i, /man.*cod/i];
  const CODE_FIELD_FALLBACK_PATTERNS = [/^(?:cod|co)[_\s-]*(?:otto|bacia|micro|sub|curso|trecho)/i];
  const DECLIVIDADE_FIELDS = ['ClDec', 'CLDEC', 'cldec'];
  const ALTIMETRIA_FIELDS = ['ClAlt', 'CLALT', 'clalt'];
  const USO_FIELDS = ['NIVEL_II', 'Nivel_II', 'nivel_ii'];
  const USO_FALLBACK_FIELDS = ['NIVEL_I', 'Nivel_I', 'nivel_i'];
  const SOLOS_FIELDS = ['Cl_solos', 'CL_SOLOS', 'cl_solos'];

  const SLOPE_CLASSES = ['000a003', '003a008', '008a015', '015a025', '025a045', '045a100', '>100'];
  const SLOPE_LABELS = ['0–3%', '3–8%', '8–15%', '15–25%', '25–45%', '45–100%', '>100%'];
  const SLOPE_COLORS = ['#edf8e9', '#c7e9c0', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#0c2c84'];

  const ALT_RAMP = ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837', '#00441b'];

  const USO_COLORS = {
    'Agricultura Anual': '#e6ab02',
    'Agricultura Perene': '#c98c00',
    'Corpos d’Água': '#67a9cf',
    'Floresta Nativa': '#1b9e77',
    Mangue: '#0f766e',
    'Pastagem/Campo': '#a6d854',
    'Plantios Florestais': '#106b21',
    Restinga: '#66c2a5',
    'Solo Exposto/Mineração': '#bdbdbd',
    'Várzea': '#c7e9c0',
    'Área Construída': '#7570b3',
    'Área Urbanizada': '#6a51a3'
  };

  const USO_FALLBACK_COLORS = {
    Água: '#67a9cf',
    'Áreas de Vegetação Natural': '#1b9e77',
    'Áreas Antrópicas Agrícolas': '#e6ab02',
    'Áreas Antrópicas Não Agrícolas': '#6a51a3',
    'Áreas Antrópicas Agrícolas/Áreas de Vegetação Natural': '#8da0cb'
  };

  const SOIL_COLORS = {
    LATOSSOLOS: '#d95f0e',
    ARGISSOLOS: '#fdae6b',
    'NEOSSOLOS LITÓLICOS': '#fee6ce',
    'NEOSSOLOS REGOLÍTICOS': '#fdd0a2',
    NITOSSOLOS: '#a6761d',
    CAMBISSOLOS: '#e0c2a2',
    GLEISSOLOS: '#74c476',
    ESPODOSSOLOS: '#9ecae1',
    ORGANOSSOLOS: '#807dba',
    'AFLORAMENTOS DE ROCHAS': '#bdbdbd',
    'ÁREAS URBANAS': '#756bb1',
    'ESPELHOS DAGUA': '#67a9cf'
  };

  const microIndex = {
    byCode: new Map(),
    manancialCodeToOtto: new Map(),
    manancialNameToOtto: new Map(),
    fullBounds: null
  };
  let microIndexReady = false;

  function trim(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  }

  function normaliseCode(value) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return '';
      return Math.trunc(value).toString();
    }
    const text = trim(value);
    if (!text) return '';
    if (/^\d+(?:\.\d+)?$/.test(text)) {
      const parsed = Number(text);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed).toString();
      }
    }
    const digits = text.replace(/\D+/g, '');
    return digits || text;
  }

  function normaliseText(value) {
    return trim(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseNumeric(value) {
    if (value === undefined || value === null || value === '') return Number.NaN;
    if (typeof value === 'number') return value;
    const text = String(value).trim();
    if (!text) return Number.NaN;
    const cleaned = text
      .replace(/\s+/g, '')
      .replace(/[^0-9.,-]/g, '');
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');
    let normalised = cleaned;
    if (hasComma && hasDot) {
      normalised = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      normalised = cleaned.replace(',', '.');
    }
    const parsed = Number(normalised);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  function extractFeatureArea(props) {
    if (!props) return Number.NaN;
    const entries = Object.keys(props);
    if (!entries.length) return Number.NaN;
    const lower = Object.create(null);
    entries.forEach(key => {
      lower[key.toLowerCase()] = key;
    });
    const haCandidates = [
      'area_ha',
      'area_hectares',
      'area_ha_calc',
      'area_ha_1',
      'area_ha_2',
      'area_total_ha',
      'areaha',
      'area_ha_mapa'
    ];
    for (const candidate of haCandidates) {
      const key = lower[candidate];
      if (!key) continue;
      const value = parseNumeric(props[key]);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
    for (const key of entries) {
      const raw = props[key];
      if (raw === undefined || raw === null || raw === '') continue;
      const lowerKey = key.toLowerCase();
      if (!lowerKey.includes('area')) continue;
      const value = parseNumeric(raw);
      if (!Number.isFinite(value) || value <= 0) continue;
      if (lowerKey.includes('m2') || lowerKey.includes('metros') || lowerKey.includes('m²')) {
        return value / 10000;
      }
      if (lowerKey.includes('ha') || lowerKey.includes('hect')) {
        return value;
      }
      if (lowerKey.endsWith('_area') || lowerKey.endsWith('area')) {
        return value;
      }
    }
    return Number.NaN;
  }

  function ensureSet(map, key) {
    let set = map.get(key);
    if (!set) {
      set = new Set();
      map.set(key, set);
    }
    return set;
  }

  function collectValues(target, value, options = {}) {
    if (!target) return;
    const { numericOnly = false } = options;
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(item => collectValues(target, item, options));
      return;
    }
    if (value instanceof Set) {
      value.forEach(item => collectValues(target, item, options));
      return;
    }
    if (typeof value === 'object' && value.valueOf && value !== value.valueOf()) {
      collectValues(target, value.valueOf(), options);
      return;
    }
    let text = typeof value === 'number' ? String(value) : trim(value);
    if (!text) return;
    const tokens = text.split(/[\n\r,;|/]+/);
    tokens.forEach(token => {
      let piece = trim(token);
      if (!piece) return;
      if (numericOnly) {
        const digits = piece.replace(/\D+/g, '');
        if (!digits) return;
        piece = digits;
      }
      if (piece) {
        target.add(piece);
      }
    });
  }

  function gatherValues(props, candidates, patterns = [], options = {}) {
    const values = new Set();
    if (!props) return values;
    const lower = Object.create(null);
    Object.keys(props).forEach(key => {
      lower[key.toLowerCase()] = key;
    });
    candidates.forEach(candidate => {
      const key = lower[candidate.toLowerCase()];
      if (key !== undefined) {
        collectValues(values, props[key], options);
      }
    });
    if (patterns.length) {
      Object.keys(props).forEach(key => {
        if (patterns.some(pattern => pattern.test(key))) {
          collectValues(values, props[key], options);
        }
      });
    }
    return values;
  }

  function getFirstValue(props, candidates) {
    if (!props) return '';
    const lower = Object.create(null);
    Object.keys(props).forEach(key => {
      lower[key.toLowerCase()] = key;
    });
    for (const candidate of candidates) {
      const key = lower[candidate.toLowerCase()];
      if (key !== undefined) {
        const value = props[key];
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
    }
    return '';
  }

  function resolveFieldValue(props, candidates, patterns = []) {
    const primary = trim(getFirstValue(props, candidates));
    if (primary) return primary;
    if (!props || !patterns.length) return '';
    const entries = Object.keys(props);
    for (const pattern of patterns) {
      for (const key of entries) {
        if (!pattern.test(key)) continue;
        const value = trim(props[key]);
        if (value) return value;
      }
    }
    return '';
  }

  function getUsoClass(props) {
    const value = getFirstValue(props, USO_FIELDS);
    if (value) return value;
    return getFirstValue(props, USO_FALLBACK_FIELDS);
  }

  function getUsoColor(value) {
    if (!value) return '#31a354';
    return USO_COLORS[value] || USO_FALLBACK_COLORS[value] || '#31a354';
  }

  function getSoilColor(value) {
    if (!value) return '#d9b26f';
    const key = String(value).toUpperCase();
    return SOIL_COLORS[key] || '#d9b26f';
  }

  function altColorFor(value) {
    if (!value) return ALT_RAMP[0];
    const match = String(value).match(/(\d+).+?(\d+)/);
    const mid = match ? (Number(match[1]) + Number(match[2])) / 2 : Number.NaN;
    if (Number.isNaN(mid)) return ALT_RAMP[0];
    const breaks = [0, 400, 800, 1200, 1600, 2000, Number.POSITIVE_INFINITY];
    for (let i = 0; i < breaks.length - 1; i += 1) {
      if (mid >= breaks[i] && mid < breaks[i + 1]) return ALT_RAMP[i];
    }
    return ALT_RAMP[ALT_RAMP.length - 1];
  }

  function parseRangeStart(value) {
    const match = String(value).match(/(\d+)/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  }

  function makeDataUrl(file) {
    return new URL(file, DATA_BASE_URL).href;
  }

  async function fetchGeoJsonFile(file) {
    const url = makeDataUrl(file);
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao carregar ${file}`);
    }
    if (file.toLowerCase().endsWith('.gz')) {
      const buffer = await response.arrayBuffer();
      if (!buffer || !buffer.byteLength) return [];
      let text;
      try {
        if (pako && typeof pako.ungzip === 'function') {
          text = pako.ungzip(new Uint8Array(buffer), { to: 'string' });
        } else if (pako && typeof pako.inflate === 'function') {
          text = pako.inflate(new Uint8Array(buffer), { to: 'string' });
        } else {
          text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
        }
      } catch (error) {
        console.warn('Falha ao descompactar', file, error);
        text = new TextDecoder('utf-8').decode(new Uint8Array(buffer));
      }
      return parseGeoJson(text);
    }
    const text = await response.text();
    return parseGeoJson(text);
  }

  function parseGeoJson(payload) {
    if (!payload) return [];
    let data = payload;
    if (typeof payload === 'string') {
      try {
        data = JSON.parse(payload);
      } catch (error) {
        console.warn('JSON inválido detectado durante o carregamento.', error);
        return [];
      }
    }
    if (!data) return [];
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      return data.features.filter(Boolean);
    }
    if (data.type === 'Feature') {
      return [data];
    }
    return [];
  }

  const EARTH_RADIUS = 6378137;

  function toRadians(value) {
    return (value * Math.PI) / 180;
  }

  function ringArea(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length < 4) return 0;
    let total = 0;
    for (let i = 0; i < coordinates.length - 1; i += 1) {
      const [lon1, lat1] = coordinates[i];
      const [lon2, lat2] = coordinates[i + 1];
      if (!Number.isFinite(lon1) || !Number.isFinite(lat1) || !Number.isFinite(lon2) || !Number.isFinite(lat2)) {
        continue;
      }
      const lon1Rad = toRadians(lon1);
      const lon2Rad = toRadians(lon2);
      const lat1Rad = toRadians(lat1);
      const lat2Rad = toRadians(lat2);
      total += (lon2Rad - lon1Rad) * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
    }
    return (total * EARTH_RADIUS * EARTH_RADIUS) / 2;
  }

  function polygonArea(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return 0;
    let area = Math.abs(ringArea(coordinates[0]));
    for (let i = 1; i < coordinates.length; i += 1) {
      area -= Math.abs(ringArea(coordinates[i]));
    }
    return area;
  }

  function multiPolygonArea(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return 0;
    return coordinates.reduce((sum, polygon) => sum + polygonArea(polygon), 0);
  }

  function geometryArea(geometry) {
    if (!geometry) return 0;
    switch (geometry.type) {
      case 'Polygon':
        return polygonArea(geometry.coordinates);
      case 'MultiPolygon':
        return multiPolygonArea(geometry.coordinates);
      case 'GeometryCollection':
        return (geometry.geometries || []).reduce((sum, geom) => sum + geometryArea(geom), 0);
      default:
        return 0;
    }
  }

  function computeAreaHa(feature) {
    if (!feature) return 0;
    let area = 0;
    if (turf && typeof turf.area === 'function') {
      try {
        area = turf.area(feature);
      } catch (error) {
        console.warn('Falha ao calcular área de uma feição com Turf.', error);
        area = 0;
      }
    }
    if (!Number.isFinite(area) || area <= 0) {
      const geometry = feature.geometry || feature;
      area = geometryArea(geometry);
    }
    return Number.isFinite(area) && area > 0 ? area / 10000 : 0;
  }

  function computeLengthKm(feature) {
    if (!feature || !turf) return 0;
    try {
      const length = turf.length(feature, { units: 'kilometers' });
      return Number.isFinite(length) ? length : 0;
    } catch (error) {
      console.warn('Falha ao calcular comprimento de uma feição.', error);
      return 0;
    }
  }

  function countPoints(feature) {
    const geometry = feature?.geometry;
    if (!geometry) return 0;
    if (geometry.type === 'Point') return 1;
    if (geometry.type === 'MultiPoint' && Array.isArray(geometry.coordinates)) {
      return geometry.coordinates.length;
    }
    return 0;
  }

  function findField(props, candidates) {
    if (!props) return null;
    const lower = Object.create(null);
    Object.keys(props).forEach(key => {
      lower[key.toLowerCase()] = key;
    });
    for (const candidate of candidates) {
      const match = lower[candidate.toLowerCase()];
      if (match) return match;
    }
    return null;
  }

  function detectCodeMetadata(props, def = {}) {
    const meta = {
      codeFields: def.codeFields ? [...def.codeFields] : [],
      manancialFields: def.manancialFields ? [...def.manancialFields] : [],
      manancialNameFields: def.manancialNameFields ? [...def.manancialNameFields] : []
    };
    if (!props) return meta;
    const keys = Object.keys(props);
    const lower = Object.create(null);
    keys.forEach(key => {
      lower[key.toLowerCase()] = key;
    });
    const addUnique = (list, value) => {
      if (!value) return;
      if (!list.includes(value)) {
        list.push(value);
      }
    };
    CODE_FIELD_CANDIDATES.forEach(candidate => {
      const key = lower[candidate.toLowerCase()];
      if (key) addUnique(meta.codeFields, key);
    });
    keys.forEach(key => {
      if (/cod[_\s-]*otto/i.test(key)) {
        addUnique(meta.codeFields, key);
      }
    });
    CODE_FIELD_FALLBACK_PATTERNS.forEach(pattern => {
      keys.forEach(key => {
        if (pattern.test(key)) {
          addUnique(meta.codeFields, key);
        }
      });
    });
    MICRO_MANANCIAL_CODE_FIELDS.forEach(candidate => {
      const key = lower[candidate.toLowerCase()];
      if (key) addUnique(meta.manancialFields, key);
    });
    keys.forEach(key => {
      if (/cod[_\s-]*man/i.test(key)) {
        addUnique(meta.manancialFields, key);
      }
    });
    MICRO_MANANCIAL_CODE_PATTERNS.forEach(pattern => {
      keys.forEach(key => {
        if (pattern.test(key)) {
          addUnique(meta.manancialFields, key);
        }
      });
    });
    MICRO_MANANCIAL_FIELDS.forEach(candidate => {
      const key = lower[candidate.toLowerCase()];
      if (key) addUnique(meta.manancialNameFields, key);
    });
    keys.forEach(key => {
      if (/manancial/i.test(key)) {
        addUnique(meta.manancialNameFields, key);
      }
    });
    MICRO_MANANCIAL_PATTERNS.forEach(pattern => {
      keys.forEach(key => {
        if (pattern.test(key)) {
          addUnique(meta.manancialNameFields, key);
        }
      });
    });
    return meta;
  }

  function mergeUnique(target, source) {
    if (!Array.isArray(target) || !Array.isArray(source)) return;
    source.forEach(value => {
      if (!value) return;
      if (!target.includes(value)) {
        target.push(value);
      }
    });
  }

  function buildLayerCodeMetadata(def, features) {
    const meta = {
      codeFields: def?.codeFields ? [...def.codeFields] : [],
      manancialFields: def?.manancialFields ? [...def.manancialFields] : [],
      manancialNameFields: def?.manancialNameFields ? [...def.manancialNameFields] : []
    };
    if (!Array.isArray(features) || !features.length) {
      return meta;
    }
    const limit = Math.min(features.length, 200);
    for (let i = 0; i < limit; i += 1) {
      const props = features[i]?.properties;
      if (!props) continue;
      const detected = detectCodeMetadata(props, def);
      mergeUnique(meta.codeFields, detected.codeFields);
      mergeUnique(meta.manancialFields, detected.manancialFields);
      mergeUnique(meta.manancialNameFields, detected.manancialNameFields);
    }
    return meta;
  }

  function resolveFeatureCodes(props, meta = {}) {
    const codes = new Set();
    if (!props) {
      return { codes };
    }
    const codeFields = Array.isArray(meta.codeFields) ? meta.codeFields : [];
    const manancialFields = Array.isArray(meta.manancialFields) ? meta.manancialFields : [];
    const manancialNameFields = Array.isArray(meta.manancialNameFields) ? meta.manancialNameFields : [];
    const rawCodes = new Set();
    codeFields.forEach(field => collectValues(rawCodes, props[field], { numericOnly: true }));
    if (!codeFields.length) {
      Object.keys(props).forEach(key => {
        if (/cod[_\s-]*otto/i.test(key)) {
          collectValues(rawCodes, props[key], { numericOnly: true });
        }
      });
    }
    rawCodes.forEach(code => {
      if (code) {
        codes.add(code);
      }
    });
    const manCodes = new Set();
    manancialFields.forEach(field => collectValues(manCodes, props[field], { numericOnly: true }));
    if (!manancialFields.length) {
      Object.keys(props).forEach(key => {
        if (/cod[_\s-]*man/i.test(key)) {
          collectValues(manCodes, props[key], { numericOnly: true });
        }
      });
    }
    const manNames = new Set();
    manancialNameFields.forEach(field => collectValues(manNames, props[field]));
    if (!manancialNameFields.length) {
      Object.keys(props).forEach(key => {
        if (/manancial/i.test(key)) {
          collectValues(manNames, props[key]);
        }
      });
    }
    if (manCodes.size && microIndexReady) {
      manCodes.forEach(code => {
        const normalised = trim(code);
        if (!normalised) return;
        const mapped = microIndex.manancialCodeToOtto.get(normalised);
        if (mapped && mapped.size) {
          mapped.forEach(value => codes.add(value));
        }
      });
    }
    if (manNames.size && microIndexReady) {
      manNames.forEach(name => {
        const normalisedName = normaliseText(name);
        if (!normalisedName) return;
        const mapped = microIndex.manancialNameToOtto.get(normalisedName);
        if (mapped && mapped.size) {
          mapped.forEach(value => codes.add(value));
        }
      });
    }
    return { codes };
  }

  function enrichFeature(def, feature, codeMeta) {
    const props = feature?.properties || {};
    const { codes } = resolveFeatureCodes(props, codeMeta);
    const code = codes && codes.size ? codes.values().next().value : '';
    let areaHa = 0;
    if (def.type === 'polygon') {
      const fromProps = extractFeatureArea(props);
      if (Number.isFinite(fromProps) && fromProps > 0) {
        areaHa = fromProps;
      } else {
        areaHa = computeAreaHa(feature);
      }
    }
    let lengthKm = 0;
    if (def.lengthProperty) {
      const rawLen = props[def.lengthProperty];
      const parsedLen = parseNumeric(rawLen);
      if (Number.isFinite(parsedLen)) {
        if (def.lengthUnit === 'm') {
          lengthKm = parsedLen / 1000;
        } else {
          lengthKm = parsedLen;
        }
      }
    }
    if (!lengthKm && def.type === 'line') {
      lengthKm = computeLengthKm(feature);
    }
    const pointCount = def.type === 'point' ? countPoints(feature) : 0;
    let classValue = '';
    if (def.legend && def.legend.type === 'area-classes') {
      try {
        classValue = trim(def.legend.getClass(feature, props));
      } catch (error) {
        console.warn('Falha ao obter a classe da feição.', error);
        classValue = '';
      }
    }
    return {
      feature,
      code,
      codes,
      areaHa,
      lengthKm,
      pointCount,
      classValue
    };
  }

  function featureMatchesSelection(item, selectedCodes) {
    if (!item || !selectedCodes) return false;
    const { codes, code } = item;
    if (codes instanceof Set) {
      for (const value of codes) {
        if (selectedCodes.has(value)) return true;
      }
    } else if (Array.isArray(codes)) {
      for (const value of codes) {
        if (selectedCodes.has(value)) return true;
      }
    } else if (typeof codes === 'string' && codes) {
      if (selectedCodes.has(codes)) return true;
    }
    return !!code && selectedCodes.has(code);
  }

  function createPopupContent(feature) {
    const props = feature?.properties;
    if (!props) return '';
    const keys = Object.keys(props);
    if (!keys.length) return '';
    const limit = Math.min(keys.length, 12);
    const pieces = [];
    for (let i = 0; i < limit; i += 1) {
      const key = keys[i];
      const value = props[key];
      if (value === undefined || value === null) continue;
      pieces.push(`<div><span class="popup-key">${escapeHtml(key)}</span>: ${escapeHtml(value)}</div>`);
    }
    return pieces.join('');
  }

  function buildGeoJsonLayer(def, features) {
    const options = {};
    if (def.type === 'polygon' || def.type === 'line') {
      options.style = feature => (def.type === 'line'
        ? getLineStyle(def, feature)
        : getPolygonStyle(def, feature));
    }
    if (def.type === 'point') {
      options.pointToLayer = (feature, latlng) => L.circleMarker(latlng, getPointStyle(def, feature));
    }
    options.onEachFeature = (feature, layer) => {
      const content = createPopupContent(feature);
      if (content) {
        layer.bindPopup(`<div class="popup-content">${content}</div>`);
      }
    };
    return L.geoJSON(features, options);
  }

  function getPolygonStyle(def, feature) {
    const opacity = currentOpacity;
    switch (def.key) {
      case 'microbacias':
        return {
          color: '#1d4ed8',
          weight: 1.2,
          fillColor: '#bfdbfe',
          fillOpacity: 0.25 * opacity,
          opacity
        };
      case 'declividade': {
        const props = feature?.properties || {};
        const value = trim(getFirstValue(props, DECLIVIDADE_FIELDS));
        const idx = SLOPE_CLASSES.indexOf(value);
        const fillColor = SLOPE_COLORS[idx >= 0 ? idx : 0];
        return {
          color: '#1f2937',
          weight: 0.5,
          fillColor,
          fillOpacity: 0.65 * opacity,
          opacity
        };
      }
      case 'altimetria': {
        const props = feature?.properties || {};
        const value = trim(getFirstValue(props, ALTIMETRIA_FIELDS));
        return {
          color: '#1f2937',
          weight: 0.45,
          fillColor: altColorFor(value),
          fillOpacity: 0.6 * opacity,
          opacity
        };
      }
      case 'uso_solo': {
        const props = feature?.properties || {};
        const value = trim(getUsoClass(props));
        return {
          color: '#1f2937',
          weight: 0.45,
          fillColor: getUsoColor(value),
          fillOpacity: 0.55 * opacity,
          opacity
        };
      }
      case 'uso_app': {
        const props = feature?.properties || {};
        const value = trim(getUsoClass(props));
        return {
          color: '#7c2d12',
          weight: 0.6,
          dashArray: '3,2',
          fillColor: getUsoColor(value),
          fillOpacity: 0.5 * opacity,
          opacity
        };
      }
      case 'conflitos_uso': {
        const props = feature?.properties || {};
        const value = trim(getUsoClass(props));
        return {
          color: '#991b1b',
          weight: 0.65,
          fillColor: getUsoColor(value),
          fillOpacity: 0.52 * opacity,
          opacity
        };
      }
      case 'solos': {
        const props = feature?.properties || {};
        const value = trim(getFirstValue(props, SOLOS_FIELDS)).toUpperCase();
        return {
          color: '#1f2937',
          weight: 0.5,
          fillColor: getSoilColor(value),
          fillOpacity: 0.6 * opacity,
          opacity
        };
      }
      case 'construcoes':
        return {
          color: '#111827',
          weight: 0.35,
          fillColor: '#1f2937',
          fillOpacity: Math.min(0.65, 0.3 + opacity * 0.6),
          opacity: Math.min(0.9, opacity + 0.15)
        };
      case 'car':
        return {
          color: '#be123c',
          weight: 0.6,
          fillColor: '#fda4af',
          fillOpacity: 0.3 * opacity,
          opacity: Math.min(0.85, opacity + 0.05)
        };
      default:
        return {
          color: '#1f2937',
          weight: 0.5,
          fillColor: '#cbd5f5',
          fillOpacity: 0.5 * opacity,
          opacity
        };
    }
  }

  function getLineStyle(def) {
    const opacity = currentOpacity;
    switch (def.key) {
      case 'curvasdenivel':
        return {
          color: '#9ca3af',
          weight: 1,
          opacity,
          dashArray: '4,4'
        };
      case 'estradas':
        return {
          color: '#737373',
          weight: 2,
          opacity,
          dashArray: '6,4'
        };
      case 'hidrografia':
        return {
          color: '#2563eb',
          weight: 2.2,
          opacity,
          lineCap: 'round'
        };
      default:
        return {
          color: '#1f2937',
          weight: 1.5,
          opacity
        };
    }
  }

  function getPointStyle(def) {
    const opacity = currentOpacity;
    const base = {
      radius: 5,
      color: '#111827',
      weight: 1,
      fillColor: '#4b5563',
      fillOpacity: Math.min(1, opacity + 0.2),
      opacity
    };
    switch (def.key) {
      case 'nascentes':
        return { ...base, color: '#0ea5e9', fillColor: '#38bdf8', fillOpacity: Math.min(1, opacity + 0.25) };
      case 'sigarh':
        return { ...base, color: '#c2410c', fillColor: '#fb923c' };
      case 'caf':
        return { ...base, color: '#047857', fillColor: '#34d399' };
      case 'educacao':
        return { ...base, color: '#6b21a8', fillColor: '#a855f7' };
      case 'aves':
        return { ...base, color: '#d97706', fillColor: '#fbbf24' };
      case 'bovinos':
        return { ...base, color: '#78350f', fillColor: '#f59e0b' };
      case 'bubalinos':
        return { ...base, color: '#92400e', fillColor: '#facc15' };
      case 'suinos':
        return { ...base, color: '#b91c1c', fillColor: '#f87171' };
      default:
        return base;
    }
  }

  function legendColorFor(def, feature) {
    if (def.type === 'point') {
      const style = getPointStyle(def, feature);
      return style.fillColor || style.color || '#1f2937';
    }
    if (def.type === 'line') {
      const style = getLineStyle(def, feature);
      return style.color || '#1f2937';
    }
    const style = getPolygonStyle(def, feature);
    return style.fillColor || style.color || '#1f2937';
  }

  const layerDefs = [
    {
      key: 'microbacias',
      name: 'Microbacias',
      type: 'polygon',
      files: ['baciasselecionadas.geojson'],
      legend: {
        type: 'area-total',
        title: 'Microbacias',
        color: '#1d4ed8',
        includeCount: true
      }
    },
    {
      key: 'declividade',
      name: 'Declividade',
      type: 'polygon',
      files: [
        'declividade__declividade_otto.geojson_part-001.gz',
        'declividade__declividade_otto.geojson_part-002.gz'
      ],
      legend: {
        type: 'area-classes',
        title: 'Declividade (%)',
        getClass: (_, props) => getFirstValue(props, DECLIVIDADE_FIELDS),
        getColor: value => {
          const idx = SLOPE_CLASSES.indexOf(trim(value));
          return SLOPE_COLORS[idx >= 0 ? idx : 0];
        },
        order: SLOPE_CLASSES,
        labelFor: value => {
          const idx = SLOPE_CLASSES.indexOf(trim(value));
          return idx >= 0 ? SLOPE_LABELS[idx] : value;
        }
      }
    },
    {
      key: 'altimetria',
      name: 'Altimetria',
      type: 'polygon',
      files: ['altimetria__altimetria_otto.geojson_part-001.gz'],
      legend: {
        type: 'area-classes',
        title: 'Altimetria (m)',
        getClass: (_, props) => getFirstValue(props, ALTIMETRIA_FIELDS),
        getColor: value => altColorFor(value),
        sorter: (a, b) => parseRangeStart(a.value) - parseRangeStart(b.value)
      }
    },
    {
      key: 'uso_solo',
      name: 'Uso do Solo',
      type: 'polygon',
      files: [
        'uso_solo__usodosolo_otto.geojson_part-001.gz',
        'uso_solo__usodosolo_otto.geojson_part-002.gz',
        'uso_solo__usodosolo_otto.geojson_part-003.gz',
        'uso_solo__usodosolo_otto.geojson_part-004.gz'
      ],
      legend: {
        type: 'area-classes',
        title: 'Uso do Solo',
        getClass: (_, props) => getUsoClass(props),
        getColor: value => getUsoColor(value)
      }
    },
    {
      key: 'uso_app',
      name: 'Uso do Solo em APP',
      type: 'polygon',
      files: ['conflitosdeuso__uso_solo_em_app.geojson_part-001.gz'],
      codeFields: ['cod_otto_1', 'cod_otto_2'],
      legend: {
        type: 'area-classes',
        title: 'Uso do Solo em APP',
        getClass: (_, props) => getUsoClass(props),
        getColor: value => getUsoColor(value)
      }
    },
     {
      key: 'solos',
      name: 'Solos',
      type: 'polygon',
      files: ['solos__solos_otto.geojson_part-001.gz'],
      legend: {
        type: 'area-classes',
        title: 'Solos',
        getClass: (_, props) => getFirstValue(props, SOLOS_FIELDS),
        getColor: value => getSoilColor(value)
      }
    },
    {
      key: 'construcoes',
      name: 'Construções',
      type: 'polygon',
      files: [
        'construcoes__construcoes_otto.geojson_part-001.gz',
        'construcoes__construcoes_otto.geojson_part-002.gz',
        'construcoes__construcoes_otto.geojson_part-003.gz'
      ],
      legend: {
        type: 'area-total',
        title: 'Construções',
        color: '#1f2937',
        includeCount: true
      }
    },
    {
      key: 'car',
      name: 'CAR',
      type: 'polygon',
      files: ['car.geojson_part-001.gz'],
      manancialFields: ['Cod_man'],
      manancialNameFields: ['Manancial'],
      legend: {
        type: 'area-total',
        title: 'CAR',
        color: '#be123c',
        includeCount: true
      }
    },
    {
      key: 'curvasdenivel',
      name: 'Curvas de Nível',
      type: 'line',
      files: [
        'curvasdenivel__curvas_otto.geojson_part-001.gz',
        'curvasdenivel__curvas_otto.geojson_part-002.gz',
        'curvasdenivel__curvas_otto.geojson_part-003.gz',
        'curvasdenivel__curvas_otto.geojson_part-004.gz'
      ],
      legend: {
        type: 'length-total',
        title: 'Curvas de Nível',
        color: '#9ca3af',
        unit: 'km'
      }
    },
    {
      key: 'estradas',
      name: 'Estradas',
      type: 'line',
      files: ['estradas__estradas_otto.geojson_part-001.gz'],
      legend: {
        type: 'length-total',
        title: 'Estradas',
        color: '#737373',
        unit: 'km'
      }
    },
    {
      key: 'hidrografia',
      name: 'Hidrografia',
      type: 'line',
      files: ['hidrografia__hidrografia_otto.geojson_part-001.gz'],
      lengthProperty: 'CompM',
      lengthUnit: 'm',
      legend: {
        type: 'length-total',
        title: 'Hidrografia',
        color: '#2563eb',
        unit: 'km'
      }
    },
    {
      key: 'nascentes',
      name: 'Nascentes',
      type: 'point',
      files: ['nascentes__nascentes_otto.geojson_part-001.gz'],
      legend: {
        type: 'count-total',
        title: 'Nascentes',
        unit: 'pontos'
      }
    },
    {
      key: 'sigarh',
      name: 'SIGARH',
      type: 'point',
      files: ['sigarh.geojson_part-001.gz'],
      legend: {
        type: 'count-total',
        title: 'Usos de água (SIGARH)',
        unit: 'registros'
      }
    },
    {
      key: 'caf',
      name: 'CAF',
      type: 'point',
      files: ['caf.geojson_part-001.gz'],
      legend: {
        type: 'count-total',
        title: 'CAF',
        unit: 'registros'
      }
    },
    {
      key: 'educacao',
      name: 'Educação',
      type: 'point',
      files: ['educacao__educacao_otto.geojson_part-001.gz'],
      legend: {
        type: 'count-total',
        title: 'Equipamentos de Educação',
        unit: 'equipamentos'
      }
    },
    {
      key: 'aves',
      name: 'Aves',
      type: 'point',
      files: ['aves__aves.geojson_part-001.gz'],
      legend: {
        type: 'count-total',
        title: 'Estabelecimentos com aves',
        unit: 'registros'
      }
    },
    {
      key: 'bovinos',
      name: 'Bovinos',
      type: 'point',
      files: ['bovinos__bovinos.geojson_part-001.gz'],
      legend: {
        type: 'count-total',
        title: 'Estabelecimentos com bovinos',
        unit: 'registros'
      }
    },
    {
      key: 'bubalinos',
      name: 'Bubalinos',
      type: 'point',
      files: ['bubalinos__bubalinos.geojson_part-001.gz'],
      legend: {
        type: 'count-total',
        title: 'Estabelecimentos com bubalinos',
        unit: 'registros'
      }
    },
    {
      key: 'suinos',
      name: 'Suínos',
      type: 'point',
      files: ['suinos__suinos.geojson_part-001.gz'],
      legend: {
        type: 'count-total',
        title: 'Estabelecimentos com suínos',
        unit: 'registros'
      }
    }
  ];

  const baseLayers = {
    'CARTO Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap • © CARTO'
    }),
    'OSM Padrão': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap colaboradores'
    }),
    'Esri Imagery': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imagens © Esri & partners'
    }),
    'Esri Streets': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Map data © Esri'
    }),
    'Stamen Terrain': L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', {
      attribution: 'Map tiles © Stamen'
    })
  };

  const map = L.map('map', {
    center: [-24.5, -51.5],
    zoom: 7,
    preferCanvas: true,
    layers: [baseLayers['CARTO Light']]
  });

  const layerControl = L.control.layers(baseLayers, {}, {
    collapsed: false,
    position: 'topleft'
  }).addTo(map);

  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution('Água Segura');

  const legendControl = createLegendDock().addTo(map);
  const legendContainer = legendControl.getContainer();

  const stateByKey = new Map();
  const groupLookup = new Map();

  const microUi = setupMicroFilterControl();
  let microOptions = [];
  const allMicroCodes = new Set();
  let microTotalArea = 0;
  let activeCodes = new Set();
  let microOptionsReady = false;
  let selectedRegion = '';
  let selectedMunicipio = '';
  let selectedManancial = '';
  let lastRenderedCodes = [];

  let currentOpacity = 0.7;
  const opacityInput = document.getElementById('opacity');
  const opacityValue = document.getElementById('opacityVal');
  if (opacityInput) {
    const initial = Number(opacityInput.value || 70);
    const clamped = Math.min(100, Math.max(20, Number.isFinite(initial) ? initial : 70));
    currentOpacity = clamped / 100;
    if (opacityValue) {
      opacityValue.textContent = `${clamped}%`;
    }
    opacityInput.addEventListener('input', event => {
      const raw = Number(event.target.value);
      const next = Math.min(100, Math.max(20, Number.isFinite(raw) ? raw : 70));
      currentOpacity = next / 100;
      if (opacityValue) {
        opacityValue.textContent = `${next}%`;
      }
      stateByKey.forEach(updateLayerOpacity);
    });
  }

  const fitAllButton = document.getElementById('fitAll');
  if (fitAllButton) {
    fitAllButton.addEventListener('click', () => {
      let combined = null;
      stateByKey.forEach(state => {
        if (!map.hasLayer(state.group) || !state.displayLayer) return;
        const bounds = state.displayLayer.getBounds?.();
        if (!bounds || !bounds.isValid || !bounds.isValid()) return;
        combined = combined ? combined.extend(bounds) : L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
      });
      if (combined && combined.isValid && combined.isValid()) {
        map.fitBounds(combined.pad(0.08));
      }
    });
  }

  layerDefs.forEach(def => {
    const group = L.layerGroup();
    const state = {
      def,
      group,
      ready: false,
      loading: false,
      promise: null,
      features: [],
      enriched: [],
      filtered: [],
      displayLayer: null,
      codeMeta: null
    };
    stateByKey.set(def.key, state);
    groupLookup.set(group, def.key);
    layerControl.addOverlay(group, def.name);
  });

  map.on('overlayadd', event => {
    const key = groupLookup.get(event.layer);
    if (!key) return;
    const state = stateByKey.get(key);
    if (!state) return;
    if (!state.ready) {
      loadLayer(state).then(() => {
        applyFilters();
      }).catch(error => {
        console.error(`Falha ao carregar a camada ${state.def.name}`, error);
      });
    } else {
      applyFilters();
    }
  });

  map.on('overlayremove', event => {
    if (!groupLookup.has(event.layer)) return;
    updateLegendDock();
  });

  const microState = stateByKey.get('microbacias');
  if (microState) {
    map.addLayer(microState.group);
    loadLayer(microState)
      .then(() => {
        applyFilters();
      })
      .catch(error => {
        console.error('Falha ao carregar a camada de microbacias.', error);
      });
  }

  if (microUi.search) {
    microUi.search.addEventListener('input', () => {
      renderMicroList();
    });
  }

  const filterUi = microUi.filters || {};
  if (filterUi.region) {
    filterUi.region.addEventListener('change', event => {
      selectedRegion = trim(event.target.value) || '';
      updateFilterSelects();
      renderMicroList();
    });
  }
  if (filterUi.municipio) {
    filterUi.municipio.addEventListener('change', event => {
      selectedMunicipio = trim(event.target.value) || '';
      updateFilterSelects();
      renderMicroList();
    });
  }
  if (filterUi.manancial) {
    filterUi.manancial.addEventListener('change', event => {
      selectedManancial = trim(event.target.value) || '';
      updateFilterSelects();
      renderMicroList();
    });
  }

  if (microUi.selectAll) {
    microUi.selectAll.addEventListener('click', () => {
      if (!microOptions.length) return;
      const codes = lastRenderedCodes.length ? lastRenderedCodes : Array.from(allMicroCodes);
      if (!codes.length) return;
      activeCodes = new Set(codes);
      updateMicroSummary();
      renderMicroList();
      applyFilters({ fitToMicro: true });
    });
  }

  if (microUi.clear) {
    microUi.clear.addEventListener('click', () => {
      activeCodes = new Set();
      updateMicroSummary();
      renderMicroList();
      applyFilters({ fitToMicro: true });
    });
  }

  function getEffectiveCodes() {
    if (!microOptionsReady || !microOptions.length) return null;
    if (!activeCodes) return null;
    if (activeCodes.size === 0) return new Set();
    if (activeCodes.size >= microOptions.length) return null;
    return activeCodes;
  }

  function getSelectedMicroArea(selectedCodes) {
    if (!microIndexReady) return 0;
    if (selectedCodes === null) {
      return microTotalArea;
    }
    if (!(selectedCodes instanceof Set) || selectedCodes.size === 0) {
      return 0;
    }
    let total = 0;
    selectedCodes.forEach(code => {
      const entry = microIndex.byCode.get(code);
      if (!entry) return;
      const area = Number(entry.areaHa);
      if (Number.isFinite(area) && area > 0) {
        total += area;
      }
    });
    return total;
  }

  function fitMapToSelection(selectedCodes) {
    if (!microIndexReady) return;
    let bounds = null;
    const extend = entry => {
      if (!entry || !entry.bounds) return;
      const entryBounds = entry.bounds;
      if (!entryBounds || !entryBounds.isValid || !entryBounds.isValid()) return;
      bounds = bounds
        ? bounds.extend(entryBounds)
        : L.latLngBounds(entryBounds.getSouthWest(), entryBounds.getNorthEast());
    };
    if (selectedCodes === null) {
      if (microIndex.fullBounds && microIndex.fullBounds.isValid && microIndex.fullBounds.isValid()) {
        bounds = L.latLngBounds(
          microIndex.fullBounds.getSouthWest(),
          microIndex.fullBounds.getNorthEast()
        );
      } else {
        microIndex.byCode.forEach(entry => extend(entry));
      }
    } else if (selectedCodes instanceof Set && selectedCodes.size) {
      selectedCodes.forEach(code => {
        const entry = microIndex.byCode.get(code);
        if (entry) {
          extend(entry);
        }
      });
    }
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.fitBounds(bounds.pad(0.08));
    }
  }

  function applyFilters(options = {}) {
    const { fitToMicro = false } = options;
    const effectiveCodes = getEffectiveCodes();
    stateByKey.forEach(state => {
      if (!state || !state.ready) return;
      const { enriched = [], group } = state;
      const filtered = !effectiveCodes
        ? [...enriched]
        : enriched.filter(item => featureMatchesSelection(item, effectiveCodes));
      state.filtered = filtered;
      state.displayLayer = null;
      if (group && typeof group.clearLayers === 'function') {
        group.clearLayers();
      }
      if (!filtered.length) return;
      const features = filtered.map(item => item.feature).filter(Boolean);
      if (!features.length) return;
      const displayLayer = buildGeoJsonLayer(state.def, features);
      state.displayLayer = displayLayer;
      if (group) {
        group.addLayer(displayLayer);
      }
      updateLayerOpacity(state);
    });
    updateLegendDock(effectiveCodes);
    updateMicroSummary();
    if (fitToMicro) {
      fitMapToSelection(effectiveCodes);
    }
  }

  function updateLayerOpacity(state) {
    if (!state || !state.displayLayer) return;
    const { def, displayLayer } = state;
    displayLayer.eachLayer(layer => {
      const feature = layer?.feature;
      if (!feature || typeof layer.setStyle !== 'function') return;
      if (def.type === 'polygon') {
        layer.setStyle(getPolygonStyle(def, feature));
      } else if (def.type === 'line') {
        layer.setStyle(getLineStyle(def, feature));
      } else if (def.type === 'point') {
        layer.setStyle(getPointStyle(def, feature));
      }
    });
  }

  function updateLegendDock(effectiveCodes) {
    if (!legendContainer) return;
    legendContainer.innerHTML = '';

    const activeStates = [];
    stateByKey.forEach(state => {
      if (!state || !state.ready) return;
      if (!map.hasLayer(state.group)) return;
      if (!state.filtered || !state.filtered.length) return;
      activeStates.push(state);
    });

    if (!activeStates.length) {
      const empty = document.createElement('div');
      empty.className = 'legend-empty';
      empty.textContent = 'Ative uma camada temática para ver a legenda.';
      legendContainer.appendChild(empty);
      return;
    }

    if (microIndexReady) {
      const summary = document.createElement('div');
      summary.className = 'legend-note';
      if (!activeCodes || activeCodes.size === 0) {
        summary.textContent = 'Nenhuma microbacia selecionada.';
      } else if (activeCodes.size >= microOptions.length) {
        summary.textContent = `Todas as ${fmt.count(microOptions.length)} microbacias (${fmt.ha(microTotalArea)} ha)`;
      } else {
        const selectedArea = getSelectedMicroArea(effectiveCodes || activeCodes);
        summary.textContent = `${fmt.count(activeCodes.size)} selecionada(s) • ${fmt.ha(selectedArea)} ha`;
      }
      legendContainer.appendChild(summary);
    }

    activeStates.forEach(state => {
      const block = document.createElement('div');
      block.className = 'legend-block';
      const header = document.createElement('h4');
      header.textContent = state.def.name;
      block.appendChild(header);

      const legend = state.def.legend || {};
      const type = legend.type || 'area-total';

      if (type === 'area-classes') {
        block.appendChild(renderAreaClassesLegend(state, legend, effectiveCodes));
      } else if (type === 'length-total') {
        block.appendChild(renderLengthLegend(state, legend));
      } else if (type === 'count-total') {
        block.appendChild(renderCountLegend(state, legend));
      } else {
        block.appendChild(renderAreaTotalLegend(state, legend, effectiveCodes));
      }

      if (legend.note) {
        const note = document.createElement('div');
        note.className = 'legend-note';
        note.textContent = legend.note;
        block.appendChild(note);
      }

      legendContainer.appendChild(block);
    });
  }

  function createCoverageNote(totalAreaHa, effectiveCodes, state) {
    if (!microIndexReady) return null;
    const baseArea = getSelectedMicroArea(effectiveCodes || activeCodes);
    if (!Number.isFinite(baseArea) || baseArea <= 0) return null;
    if (!Number.isFinite(totalAreaHa)) return null;
    const diff = totalAreaHa - baseArea;
    const diffAbs = Math.abs(diff);
    const coverage = Math.max(0, Math.min(9999, (totalAreaHa / baseArea) * 100));
    const note = document.createElement('div');
    note.className = 'legend-note';
    const sign = diffAbs < 0.01 ? '±' : diff >= 0 ? '+' : '−';
    note.textContent = `Cobertura sobre as microbacias: ${fmt.pct(coverage)}% (Δ ${sign}${fmt.ha(diffAbs)} ha)`;
    if (diffAbs > 1 || Math.abs(coverage - 100) > 2) {
      console.warn(
        `Diferença de área detectada na camada "${state.def.name}": microbacias ${baseArea.toFixed(2)} ha × camada ${totalAreaHa.toFixed(2)} ha.`
      );
    }
    return note;
  }

  function renderAreaTotalLegend(state, legend, effectiveCodes) {
    const totalArea = state.filtered.reduce((sum, item) => {
      const area = Number(item.areaHa);
      return Number.isFinite(area) && area > 0 ? sum + area : sum;
    }, 0);
    const list = document.createElement('ul');
    list.className = 'legend-list';
    const li = document.createElement('li');
    li.className = 'legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = legend.color || '#1f2937';
    li.appendChild(swatch);

    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = legend.title || 'Área total';
    li.appendChild(label);

    const value = document.createElement('span');
    value.className = 'legend-value';
    let text = `${fmt.ha(totalArea)} ha`;
    if (legend.includeCount) {
      text += ` · ${fmt.count(state.filtered.length)} feições`;
    }
    value.textContent = text;
    li.appendChild(value);
    list.appendChild(li);

    const wrapper = document.createElement('div');
    wrapper.appendChild(list);
    const coverage = createCoverageNote(totalArea, effectiveCodes, state);
    if (coverage) {
      wrapper.appendChild(coverage);
    }
    return wrapper;
  }

  function renderAreaClassesLegend(state, legend, effectiveCodes) {
    const groups = new Map();
    let totalArea = 0;
    state.filtered.forEach(item => {
      const area = Number(item.areaHa);
      if (Number.isFinite(area) && area > 0) {
        totalArea += area;
      }
      const keyRaw = trim(item.classValue);
      const key = keyRaw || '__sem_classe__';
      if (!groups.has(key)) {
        groups.set(key, { value: keyRaw, areaHa: 0, feature: item.feature });
      }
      const entry = groups.get(key);
      if (Number.isFinite(area) && area > 0) {
        entry.areaHa += area;
      }
      if (!entry.feature && item.feature) {
        entry.feature = item.feature;
      }
    });

    const entries = Array.from(groups.values());
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'legend-empty';
      empty.textContent = 'Sem dados para a seleção atual.';
      return empty;
    }

    if (Array.isArray(legend.order) && legend.order.length) {
      const orderMap = new Map();
      legend.order.forEach((value, idx) => {
        orderMap.set(normaliseText(value), idx);
      });
      entries.sort((a, b) => {
        const aKey = normaliseText(a.value);
        const bKey = normaliseText(b.value);
        const aIdx = orderMap.has(aKey) ? orderMap.get(aKey) : Number.POSITIVE_INFINITY;
        const bIdx = orderMap.has(bKey) ? orderMap.get(bKey) : Number.POSITIVE_INFINITY;
        if (aIdx === bIdx) {
          return aKey.localeCompare(bKey, 'pt-BR');
        }
        return aIdx - bIdx;
      });
    } else if (typeof legend.sorter === 'function') {
      entries.sort((a, b) => {
        try {
          return legend.sorter(a, b);
        } catch (error) {
          return 0;
        }
      });
    } else {
      entries.sort((a, b) => b.areaHa - a.areaHa);
    }

    const list = document.createElement('ul');
    list.className = 'legend-list';

    entries.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'legend-item';
      const swatch = document.createElement('span');
      swatch.className = 'legend-swatch';
      let color = '#1f2937';
      try {
        if (typeof legend.getColor === 'function') {
          color = legend.getColor(entry.value, entry.feature);
        } else {
          color = legendColorFor(state.def, entry.feature);
        }
      } catch (error) {
        color = '#1f2937';
      }
      swatch.style.background = color;
      li.appendChild(swatch);

      const label = document.createElement('span');
      label.className = 'legend-label';
      let text = entry.value || 'Sem classificação';
      if (typeof legend.labelFor === 'function') {
        try {
          text = legend.labelFor(entry.value, entry);
        } catch (error) {
          text = entry.value || 'Sem classificação';
        }
      }
      label.textContent = text;
      li.appendChild(label);

      const value = document.createElement('span');
      value.className = 'legend-value';
      value.textContent = `${fmt.ha(entry.areaHa)} ha`;
      li.appendChild(value);

      list.appendChild(li);
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(list);
    const coverage = createCoverageNote(totalArea, effectiveCodes, state);
    if (coverage) {
      wrapper.appendChild(coverage);
    }
    return wrapper;
  }

  function renderLengthLegend(state, legend) {
    const totalLength = state.filtered.reduce((sum, item) => {
      const length = Number(item.lengthKm);
      return Number.isFinite(length) && length > 0 ? sum + length : sum;
    }, 0);
    const list = document.createElement('ul');
    list.className = 'legend-list';
    const li = document.createElement('li');
    li.className = 'legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch line';
    swatch.style.background = legend.color || '#1f2937';
    li.appendChild(swatch);
    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = legend.title || 'Extensão total';
    li.appendChild(label);
    const value = document.createElement('span');
    value.className = 'legend-value';
    value.textContent = `${fmt.km(totalLength)} ${legend.unit || 'km'}`;
    li.appendChild(value);
    list.appendChild(li);
    return list;
  }

  function renderCountLegend(state, legend) {
    const totalCount = state.filtered.reduce((sum, item) => {
      const count = Number(item.pointCount);
      if (Number.isFinite(count) && count > 0) {
        return sum + count;
      }
      return sum + 1;
    }, 0);
    const list = document.createElement('ul');
    list.className = 'legend-list';
    const li = document.createElement('li');
    li.className = 'legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = legend.color || '#1f2937';
    li.appendChild(swatch);
    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = legend.title || 'Total de registros';
    li.appendChild(label);
    const value = document.createElement('span');
    value.className = 'legend-value';
    value.textContent = `${fmt.count(totalCount)} ${legend.unit || 'registros'}`;
    li.appendChild(value);
    list.appendChild(li);
    return list;
  }

  function loadLayer(state) {
    if (!state) return Promise.resolve();
    if (state.ready && !state.loading) {
      return Promise.resolve(state);
    }
    if (state.loading && state.promise) {
      return state.promise;
    }
    state.loading = true;
    state.promise = (async () => {
      const { def } = state;
      const features = [];
      for (const file of def.files) {
        try {
          const part = await fetchGeoJsonFile(file);
          if (Array.isArray(part)) {
            part.forEach(feature => {
              if (feature) {
                features.push(feature);
              }
            });
          }
        } catch (error) {
          console.error(`Falha ao carregar o arquivo ${file}`, error);
        }
      }
      state.features = features;
      state.codeMeta = buildLayerCodeMetadata(def, features);
      state.enriched = features.map(feature => enrichFeature(def, feature, state.codeMeta));
      state.ready = true;
      state.loading = false;
      if (def.key === 'microbacias') {
        prepareMicroOptions(state);
      }
      return state;
    })().catch(error => {
      state.loading = false;
      throw error;
    });
    return state.promise;
  }

  function prepareMicroOptions(state) {
    microIndex.byCode.clear();
    microIndex.manancialCodeToOtto.clear();
    microIndex.manancialNameToOtto.clear();
    microIndex.fullBounds = null;

    const unique = new Map();
    let combinedBounds = null;
    microTotalArea = 0;

    (state.enriched || []).forEach(item => {
      const code = normaliseCode(item.code || (item.codes instanceof Set ? Array.from(item.codes)[0] : item.codes));
      if (!code || unique.has(code)) return;
      const feature = item.feature;
      const props = feature?.properties || {};
      const name = resolveFieldValue(props, MICRO_NAME_FIELDS) || `Microbacia ${code}`;
      const region = resolveFieldValue(props, MICRO_REGION_FIELDS, MICRO_REGION_PATTERNS);
      const municipio = resolveFieldValue(props, MICRO_MUNICIPIO_FIELDS, MICRO_MUNICIPIO_PATTERNS);
      const manancial = resolveFieldValue(props, MICRO_MANANCIAL_FIELDS, MICRO_MANANCIAL_PATTERNS);
      const areaHa = Number(item.areaHa);
      if (Number.isFinite(areaHa) && areaHa > 0) {
        microTotalArea += areaHa;
      }

      let bounds = null;
      try {
        const temp = L.geoJSON(feature);
        bounds = temp.getBounds?.() || null;
        temp.remove?.();
      } catch (error) {
        bounds = null;
      }
      if (bounds && bounds.isValid && bounds.isValid()) {
        const clone = L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
        bounds = clone;
        if (!combinedBounds) {
          combinedBounds = L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
        } else {
          combinedBounds.extend(bounds);
        }
      } else {
        bounds = null;
      }

      const searchText = [code, name, region, municipio, manancial]
        .map(value => normaliseText(value))
        .filter(Boolean)
        .join(' ');

      const entry = {
        code,
        name,
        region: region || '',
        municipio: municipio || '',
        manancial: manancial || '',
        areaHa: Number.isFinite(areaHa) ? areaHa : 0,
        feature,
        bounds,
        searchText
      };
      unique.set(code, entry);

      microIndex.byCode.set(code, {
        code,
        name,
        region: entry.region,
        municipio: entry.municipio,
        manancial: entry.manancial,
        areaHa: entry.areaHa,
        feature,
        bounds
      });

      const manCodes = gatherValues(props, MICRO_MANANCIAL_CODE_FIELDS, MICRO_MANANCIAL_CODE_PATTERNS, { numericOnly: true });
      manCodes.forEach(value => {
        const normalised = normaliseCode(value);
        if (!normalised) return;
        ensureSet(microIndex.manancialCodeToOtto, normalised).add(code);
      });

      const manNames = gatherValues(props, MICRO_MANANCIAL_FIELDS, MICRO_MANANCIAL_PATTERNS);
      manNames.forEach(value => {
        const normalised = normaliseText(value);
        if (!normalised) return;
        ensureSet(microIndex.manancialNameToOtto, normalised).add(code);
      });
    });

    microOptions = Array.from(unique.values()).sort((a, b) => {
      if (a.region && b.region && a.region !== b.region) {
        return a.region.localeCompare(b.region, 'pt-BR');
      }
      if (a.municipio && b.municipio && a.municipio !== b.municipio) {
        return a.municipio.localeCompare(b.municipio, 'pt-BR');
      }
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    allMicroCodes.clear();
    microOptions.forEach(option => allMicroCodes.add(option.code));
    microIndex.fullBounds = combinedBounds || null;
    microOptionsReady = true;
    microIndexReady = true;

    if (microUi.filters) {
      Object.values(microUi.filters).forEach(select => {
        if (select) {
          select.disabled = false;
        }
      });
    }

    updateFilterSelects();
    renderMicroList();
    updateMicroSummary();
    refreshLayersAfterMicroIndex();
    applyFilters();
  }

  function refreshLayersAfterMicroIndex() {
    if (!microIndexReady) return;
    stateByKey.forEach(state => {
      if (!state || !state.ready) return;
      if (!Array.isArray(state.features) || !state.features.length) return;
      state.enriched = state.features.map(feature => enrichFeature(state.def, feature, state.codeMeta));
    });
  }

  function updateFilterSelects() {
    if (!microOptionsReady) return;
    const filters = microUi.filters || {};
    const regionSelect = filters.region;
    const municipioSelect = filters.municipio;
    const manancialSelect = filters.manancial;

    const regionValues = new Set();
    const municipioValues = new Set();
    const manancialValues = new Set();

    microOptions.forEach(option => {
      if (!option) return;
      if (!selectedMunicipio || option.municipio === selectedMunicipio) {
        if (!selectedManancial || option.manancial === selectedManancial) {
          if (option.region) {
            regionValues.add(option.region);
          }
        }
      }
      if (!selectedRegion || option.region === selectedRegion) {
        if (!selectedManancial || option.manancial === selectedManancial) {
          if (option.municipio) {
            municipioValues.add(option.municipio);
          }
        }
      }
      if (!selectedRegion || option.region === selectedRegion) {
        if (!selectedMunicipio || option.municipio === selectedMunicipio) {
          if (option.manancial) {
            manancialValues.add(option.manancial);
          }
        }
      }
    });

    if (regionSelect) {
      populateSelectOptions(regionSelect, regionValues, 'Todas as regionais', selectedRegion);
      if (selectedRegion && !regionValues.has(selectedRegion)) {
        selectedRegion = '';
        regionSelect.value = '';
      }
    }
    if (municipioSelect) {
      populateSelectOptions(municipioSelect, municipioValues, 'Todos os municípios', selectedMunicipio);
      if (selectedMunicipio && !municipioValues.has(selectedMunicipio)) {
        selectedMunicipio = '';
        municipioSelect.value = '';
      }
    }
    if (manancialSelect) {
      populateSelectOptions(manancialSelect, manancialValues, 'Todos os mananciais', selectedManancial);
      if (selectedManancial && !manancialValues.has(selectedManancial)) {
        selectedManancial = '';
        manancialSelect.value = '';
      }
    }
  }

  function populateSelectOptions(select, values, placeholder, selectedValue) {
    if (!select) return;
    const sorted = Array.from(values).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    select.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = placeholder;
    select.appendChild(defaultOption);
    sorted.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if (selectedValue && values.has(selectedValue)) {
      select.value = selectedValue;
    } else {
      select.value = '';
    }
  }

  function renderMicroList() {
    if (!microUi.list) return;
    microUi.list.innerHTML = '';

    if (!microOptionsReady || !microOptions.length) {
      const empty = document.createElement('div');
      empty.className = 'micro-empty';
      empty.textContent = 'Carregando microbacias...';
      microUi.list.appendChild(empty);
      lastRenderedCodes = [];
      return;
    }

    const searchValue = microUi.search ? normaliseText(microUi.search.value) : '';
    const searchWords = searchValue ? searchValue.split(/\s+/).filter(Boolean) : [];

    const filtered = microOptions.filter(option => {
      if (selectedRegion && option.region !== selectedRegion) return false;
      if (selectedMunicipio && option.municipio !== selectedMunicipio) return false;
      if (selectedManancial && option.manancial !== selectedManancial) return false;
      if (!searchWords.length) return true;
      return searchWords.every(word => option.searchText.includes(word));
    });

    lastRenderedCodes = filtered.map(option => option.code);

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'micro-empty';
      empty.textContent = 'Nenhuma microbacia atende aos filtros.';
      microUi.list.appendChild(empty);
      return;
    }

    filtered.forEach(option => {
      const label = document.createElement('label');
      label.className = 'micro-option';
      if (activeCodes.has(option.code)) {
        label.classList.add('active');
      }

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = activeCodes.has(option.code);
      checkbox.addEventListener('change', event => {
        if (event.target.checked) {
          activeCodes.add(option.code);
          label.classList.add('active');
        } else {
          activeCodes.delete(option.code);
          label.classList.remove('active');
        }
        updateMicroSummary();
        applyFilters({ fitToMicro: true });
      });
      label.appendChild(checkbox);

      const text = document.createElement('div');
      text.className = 'micro-option-text';

      const title = document.createElement('div');
      title.className = 'micro-option-title';
      title.textContent = option.name;
      text.appendChild(title);

      const metaLine = document.createElement('div');
      metaLine.className = 'micro-option-sub';
      const pieces = [];
      if (option.region) pieces.push(option.region);
      if (option.municipio) pieces.push(option.municipio);
      metaLine.textContent = pieces.length ? pieces.join(' • ') : '—';
      text.appendChild(metaLine);

      const infoLine = document.createElement('div');
      infoLine.className = 'micro-option-sub';
      const infoPieces = [`OTTO ${option.code}`];
      if (option.manancial) {
        infoPieces.push(`Manancial: ${option.manancial}`);
      }
      infoLine.textContent = infoPieces.join(' • ');
      text.appendChild(infoLine);

      const areaLine = document.createElement('div');
      areaLine.className = 'micro-option-area';
      areaLine.textContent = `Área: ${fmt.ha(option.areaHa)} ha`;
      text.appendChild(areaLine);

      label.appendChild(text);
      microUi.list.appendChild(label);
    });
  }

  function updateMicroSummary() {
    if (!microUi.summary) return;
    if (!microOptionsReady || !microOptions.length) {
      microUi.summary.textContent = 'Carregando microbacias...';
      return;
    }
    if (!activeCodes || activeCodes.size === 0) {
      microUi.summary.textContent = 'Nenhuma microbacia selecionada.';
      return;
    }
    if (activeCodes.size >= microOptions.length) {
      microUi.summary.textContent = `Todas as ${fmt.count(microOptions.length)} microbacias (${fmt.ha(microTotalArea)} ha)`;
      return;
    }
    let area = 0;
    activeCodes.forEach(code => {
      const entry = microIndex.byCode.get(code);
      if (!entry) return;
      const value = Number(entry.areaHa);
      if (Number.isFinite(value) && value > 0) {
        area += value;
      }
    });
    microUi.summary.textContent = `${fmt.count(activeCodes.size)} selecionada(s) • ${fmt.ha(area)} ha`;
  }

  function setupMicroFilterControl() {
    const ui = {
      container: null,
      summary: null,
      search: null,
      list: null,
      selectAll: null,
      clear: null,
      filters: {}
    };

    const Control = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-control micro-filter');
        ui.container = container;
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        const header = document.createElement('div');
        header.className = 'micro-header';

        const titleWrap = document.createElement('div');
        const title = document.createElement('h2');
        title.textContent = 'Microbacias';
        titleWrap.appendChild(title);
        const summary = document.createElement('p');
        summary.className = 'micro-summary';
        summary.textContent = 'Carregando microbacias...';
        ui.summary = summary;
        titleWrap.appendChild(summary);

        const actions = document.createElement('div');
        actions.className = 'micro-actions';
        const selectAllBtn = document.createElement('button');
        selectAllBtn.type = 'button';
        selectAllBtn.className = 'btn-chip';
        selectAllBtn.textContent = 'Selecionar exibidos';
        ui.selectAll = selectAllBtn;
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'btn-chip';
        clearBtn.textContent = 'Limpar seleção';
        ui.clear = clearBtn;
        actions.appendChild(selectAllBtn);
        actions.appendChild(clearBtn);

        header.appendChild(titleWrap);
        header.appendChild(actions);
        container.appendChild(header);

        const search = document.createElement('input');
        search.type = 'search';
        search.className = 'micro-search';
        search.placeholder = 'Buscar por nome, município ou código...';
        ui.search = search;
        container.appendChild(search);

        const filters = document.createElement('div');
        filters.className = 'micro-filters';

        const createField = (labelText, placeholder) => {
          const wrapper = document.createElement('label');
          wrapper.className = 'micro-filter-field';
          const label = document.createElement('span');
          label.className = 'micro-filter-label';
          label.textContent = labelText;
          const select = document.createElement('select');
          select.className = 'micro-select';
          select.disabled = true;
          const option = document.createElement('option');
          option.value = '';
          option.textContent = placeholder;
          select.appendChild(option);
          wrapper.appendChild(label);
          wrapper.appendChild(select);
          filters.appendChild(wrapper);
          return select;
        };

        const regionSelect = createField('Regional', 'Todas as regionais');
        const municipioSelect = createField('Município', 'Todos os municípios');
        const manancialSelect = createField('Manancial', 'Todos os mananciais');
        ui.filters = {
          region: regionSelect,
          municipio: municipioSelect,
          manancial: manancialSelect
        };

        container.appendChild(filters);

        const list = document.createElement('div');
        list.className = 'micro-list';
        const placeholder = document.createElement('div');
        placeholder.className = 'micro-empty';
        placeholder.textContent = 'Carregando microbacias...';
        list.appendChild(placeholder);
        ui.list = list;
        container.appendChild(list);

        return container;
      }
    });

    const control = new Control();
    map.addControl(control);
    return ui;
  }

})();
