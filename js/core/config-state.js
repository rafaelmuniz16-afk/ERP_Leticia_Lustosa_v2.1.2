
// ============================================================
// CONFIGURAÇÕES E BANCO NA NUVEM (API REAL)
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbzkcsULH3xNPbjNFmLy-wlqKuSE0cbwBlkqmVd8t1ugoP89RHzuW9wCMHK0V7eKYrxp/exec';

const MONTHS = [['06','Junho'],['07','Julho'],['08','Agosto'],['09','Setembro'],['10','Outubro'],['11','Novembro'],['12','Dezembro']];
const CACHE_KEY = 'bd_oficial_leticia';
const META_KEY = 'metas_oficial_leticia';
const LAST_MONTH_KEY = 'ultimo_mes_selecionado';
const AI_KEY = 'groq_api_key_erp';
const LOGS_KEY = 'logs_oficial_leticia';
const MEMORIA_KEY = 'memoria_oficial_ia';

let bd = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
let metas = JSON.parse(localStorage.getItem(META_KEY) || '{}');
let logsAuditoria = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
let memoriaIA = JSON.parse(localStorage.getItem(MEMORIA_KEY) || '[]');
let editUid = null, currentPage = 1, itemsPerPage = 15, metaSaveTimer = null, lastConfirmedMetas = JSON.parse(JSON.stringify(metas));
let charts = {tipos:null, linha:null};
let apiKey = localStorage.getItem(AI_KEY) || '';
let chatHistory = [{role:'assistant', content:'Olá, Letícia! Eu sou a Aurora. ✦ Estou pronta para consultar a base, analisar indicadores e cadastrar ou editar casos.'}];

