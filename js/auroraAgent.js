// js/auroraAgent.js

import { gerarPromptSistema, gerarPromptObservacao } from './aurora/prompts.js';
import { gerarPromptResumo, formatoResumoAurora } from './aurora/report-prompt.js';
import { AURORA_TOOLS } from './aurora/tools.js';
import { executarFerramenta } from './aurora/dispatcher.js';
import {
  suportaReconhecimento,
  iniciarEscuta,
  pararEscuta,
  falarResposta,
  pararFala,
  estaFalando,
  travarMicrofoneHardware,
  liberarMicrofoneHardware
} from './aurora/speech.js';

let ctxApp = null;
let modoVozAtivo = false;
let processandoRequisicao = false;
let agenteInicializado = false;

let chatHistory = [
  { role: 'assistant', content: 'Olá, Letícia! Eu sou a Aurora. Estou conectada ao ERP, pronta para operar o sistema, consultar dados e cadastrar casos por voz ou texto!' }
];

const MODELOS_GROQ = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b'
];

async function chamarGroqComTools(mensagens, apiKey, options = {}) {
  const useTools = options.useTools !== false;
  let ultimoErro = '';
  let integrationCode = 'GROQ_NETWORK';

  for (const model of MODELOS_GROQ) {
    if (options.signal?.aborted) throw new DOMException('Operação cancelada.', 'AbortError');
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 30000);

    try {
      const payload = {
        model: model,
        messages: mensagens,
        temperature: useTools ? 0.1 : 0.4,
        ...(useTools ? { tools: AURORA_TOOLS, tool_choice: 'auto' } : {
          max_completion_tokens: options.maxCompletionTokens ?? 768,
          response_format: options.responseFormat ?? { type: 'json_object' },
          ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort, include_reasoning: false } : {})
        })
      };

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const data = await res.json();
      clearTimeout(timeoutId);
      if (res.ok && !data.error) return data;

      ultimoErro = (data.error && data.error.message) ? data.error.message : 'Erro na Groq';
      // Only the analytical integration receives safe diagnostic codes. Chat/voice
      // keep their existing transport and messages; no provider text is logged here.
      if (options.integration) integrationCode = res.status === 401 ? 'GROQ_AUTH' : res.status === 403 ? 'GROQ_FORBIDDEN' : res.status === 429 ? 'GROQ_RATE_LIMIT' : res.status >= 500 ? 'GROQ_UNAVAILABLE' : res.status === 400 && /json_schema|response_format|invalid schema|unsupported schema/i.test(ultimoErro) ? 'GROQ_SCHEMA' : 'GROQ_REQUEST';

      if ([429, 503].includes(res.status)) continue;
      if (/quota|rate limit/i.test(ultimoErro)) continue;
      break;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        integrationCode = 'GROQ_TIMEOUT';
        ultimoErro = 'Tempo limite de comunicação com a Groq excedido (' + ((options.timeoutMs || 30000) / 1000) + 's).';
      } else {
        integrationCode = 'GROQ_NETWORK';
        ultimoErro = err.message;
      }
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort', abort);
    }
  }

  const failure = new Error(ultimoErro ? ultimoErro : 'Nenhum modelo da Groq respondeu.');
  if (options.integration) failure.code = integrationCode;
  throw failure;
}

function iniciarCicloEscutaModal() {
  if (!modoVozAtivo) return;

  const modalStatus = ctxApp.$('auroraVoiceStatus');
  const modalTranscript = ctxApp.$('auroraVoiceTranscript');

  if (modalStatus) modalStatus.textContent = 'Ouvindo você…';
  if (modalTranscript) modalTranscript.textContent = 'Pode falar o que precisa…';

  iniciarEscuta({
    onInicio: () => {
      if (modalStatus) modalStatus.textContent = 'Ouvindo…';
    },
    onTranscricao: (textoEmTempoReal) => {
      if (modalTranscript) modalTranscript.textContent = textoEmTempoReal;
    },
    onFalaFinal: (comandoPronto) => {
      if (modalStatus) modalStatus.textContent = 'Processando comando…';
      processarMensagemAurora(comandoPronto, true);
    },
    onErro: (erro) => {
      console.warn('Erro voz:', erro);
    }
  });
}

export async function processarMensagemAurora(textoUsuario, viaVoz = false) {
  // A interface envia um payload explícito. Mantém chamadas legadas e de voz.
  const payload = textoUsuario && typeof textoUsuario === 'object' ? textoUsuario : {};
  textoUsuario = String(payload.text ?? textoUsuario ?? '').trim();
  viaVoz = payload.viaVoz ?? viaVoz;
  if (!textoUsuario) return { accepted: false, reason: 'empty' };

  if (processandoRequisicao) {
    return { accepted: false, reason: 'busy' };
  }
  processandoRequisicao = true;
  let indicadorCarregando = null;
  let modalStatus = null;
  let mensagemExibida = false;
  let appendMessage = (sender, text) => window.obterContextoERP?.()?.appendMessage(sender, text);

  // Inclui preparação do contexto e prompt no try/finally. Uma falha nessa
  // etapa não pode deixar o agente permanentemente marcado como ocupado.
  try {
    ctxApp = payload.context || window.obterContextoERP?.() || ctxApp;

    if (!ctxApp) {
      throw new Error('O contexto do ERP ainda não está disponível.');
    }

    appendMessage = ctxApp.appendMessage;
    // Meta é cálculo determinístico do ERP, não inferência de linguagem nem memória.
    // Respostas diretas dispensam chamadas ao provedor e nunca misturam totais com reais.
    const respostaMetaReal=window.ERPGoalMetrics?.response(textoUsuario,ctxApp);
    if(respostaMetaReal){
      appendMessage('user',textoUsuario);
      appendMessage('bot',respostaMetaReal);
      chatHistory.push({role:'user',content:textoUsuario},{role:'assistant',content:respostaMetaReal});
      if(viaVoz){
        const transcricao=ctxApp.$('auroraVoiceTranscript');
        if(transcricao)transcricao.textContent=respostaMetaReal;
        falarResposta(respostaMetaReal,()=>{if(modoVozAtivo)setTimeout(iniciarCicloEscutaModal,600);});
      }
      return {accepted:true,local:true};
    }
    let apiKey = String(payload.apiKey || ctxApp.apiKey || '').trim();

    if (!apiKey) {
      if (ctxApp.configAPIKey) await ctxApp.configAPIKey();
      ctxApp = window.obterContextoERP?.() || ctxApp;
      apiKey = String(ctxApp.apiKey || '').trim();
      if (!apiKey) return { accepted: false, reason: 'key' };
    }
    // Aguarda a sincronização já iniciada na abertura; se o endpoint não
    // disponibilizar a aba, usa o cache sem inventar lembranças.
    if (typeof window.refreshSheetMemory === 'function') {
      await window.refreshSheetMemory();
      ctxApp = window.obterContextoERP?.() || ctxApp;
    }
    const { $, summarizeForAI, metas, memoriaIA } = ctxApp;

    pararFala();
    appendMessage('user', textoUsuario);
    mensagemExibida = true;

    appendMessage('system', 'Consultando ERP...');
    const containerMsgs = $('chatMessages');
    indicadorCarregando = containerMsgs ? containerMsgs.lastElementChild : null;

    modalStatus = $('auroraVoiceStatus');
    if (viaVoz && modalStatus) {
      modalStatus.textContent = 'Pensando e consultando ERP…';
    }

    // Captura data e mês atuais para cálculo automático de projeção
    const dataHoje = (typeof ctxApp.getTodayLocal === 'function')
      ? ctxApp.getTodayLocal()
      : new Date().toISOString().split('T')[0];

    const mesSelecionado = (typeof ctxApp.getSelectedMonth === 'function')
      ? ctxApp.getSelectedMonth()
      : '10';

    const resumoLocal=summarizeForAI();
    const metricasOficiais=ctxApp.calculate?.(mesSelecionado);
    const systemPrompt = gerarPromptSistema(
      resumoLocal,
      metas,
      memoriaIA,
      dataHoje,
      mesSelecionado
    ) + (metricasOficiais ? '\n\nMÉTRICAS OFICIAIS DO MÊS SELECIONADO (CALCULADAS PELO ERP, NÃO PELA IA):\n' + JSON.stringify({
      mes:mesSelecionado,meta:metricasOficiais.meta,reais:metricasOficiais.reais,
      faltaMeta:Math.max(0,metricasOficiais.meta-metricasOficiais.reais),
      origemDoReal:'registros com Panjud = Sim',
      cadastradosNaoContamComoReais:true
    }) : '');

    // Histórico com 6 mensagens para manter o contexto de confirmação afiado
    const historicoEnxuto = chatHistory.slice(-6).filter(m => ['user', 'assistant'].includes(m.role));

    const mensagensTurno = [
      { role: 'system', content: systemPrompt },
      ...historicoEnxuto,
      { role: 'user', content: textoUsuario }
    ];

    let passos = 0;
    const maxPassos = 5;
    let respostaConcluida = false;

    while (passos < maxPassos) {
      passos++;
      const respostaGroq = await chamarGroqComTools(mensagensTurno, apiKey);
      const escolha = (respostaGroq.choices && respostaGroq.choices[0]) ? respostaGroq.choices[0].message : null;
      if (!escolha) throw new Error('Resposta vazia da Aurora.');

      if (escolha.tool_calls && escolha.tool_calls.length > 0) {
        mensagensTurno.push(escolha);

        for (const chamada of escolha.tool_calls) {
          const nomeFerramenta = chamada.function.name;
          let args = {};
          try {
            args = JSON.parse(chamada.function.arguments ? chamada.function.arguments : '{}');
          } catch (e) {
            args = {};
          }

          appendMessage('system', 'Executando ação: ' + nomeFerramenta + '...');
          if (viaVoz && modalStatus) {
            modalStatus.textContent = 'Executando no ERP: ' + nomeFerramenta + '…';
          }

          try {
            const resultado = await executarFerramenta(nomeFerramenta, args, ctxApp);
            mensagensTurno.push({
              role: 'tool',
              tool_call_id: chamada.id,
              name: nomeFerramenta,
              content: typeof resultado === 'string' ? resultado : JSON.stringify(resultado)
            });
          } catch (errErroFerramenta) {
            mensagensTurno.push({
              role: 'tool',
              tool_call_id: chamada.id,
              name: nomeFerramenta,
              content: JSON.stringify({ erro: errErroFerramenta.message })
            });
          }
        }
      } else {
        respostaConcluida = true;
        if (indicadorCarregando && indicadorCarregando.parentNode) {
          indicadorCarregando.remove();
        }
        const textoFinal = escolha.content ? escolha.content : 'Compreendido!';

        chatHistory.push({ role: 'user', content: textoUsuario });
        chatHistory.push({ role: 'assistant', content: textoFinal });

        appendMessage('bot', textoFinal);

        if (viaVoz) {
          if (modalStatus) modalStatus.textContent = 'Aurora falando… (clique no orbe para interromper)';
          const modalTranscript = $('auroraVoiceTranscript');
          if (modalTranscript) modalTranscript.textContent = textoFinal;

          falarResposta(textoFinal, () => {
            if (modoVozAtivo) {
              setTimeout(() => {
                iniciarCicloEscutaModal();
              }, 400);
            }
          });
        }
        return { accepted: true };
      }
    }

    if (!respostaConcluida) {
      throw new Error('A Aurora atingiu o limite de etapas sem produzir a resposta final.');
    }
  } catch (errGeral) {
    if (indicadorCarregando && indicadorCarregando.parentNode) {
      indicadorCarregando.remove();
    }
    appendMessage('bot', 'Ops! Não consegui concluir o comando: ' + errGeral.message);
    if (viaVoz && modalStatus) {
      modalStatus.textContent = 'Erro ao processar';
      setTimeout(() => {
        if (modoVozAtivo) iniciarCicloEscutaModal();
      }, 1500);
    }
    return { accepted: mensagemExibida, error: true };
  } finally {
    processandoRequisicao = false;
  }
}

export function inicializarAuroraAgent(contexto) {
  ctxApp = contexto;
  if (agenteInicializado) return;
  agenteInicializado = true;
  const { $ } = contexto;

  let btnVoz = $('btnVoiceInput');
  if (!btnVoz) {
    btnVoz = $('btnAiVoice');
  }

  const modalVoz = $('auroraVoiceModal');
  const btnFecharVoz = $('btnFecharVoz');
  const orbVoz = $('auroraVoiceOrb');

  function fecharModalVoz() {
    modoVozAtivo = false;
    pararFala();
    pararEscuta();
    liberarMicrofoneHardware();
    if (modalVoz) {
      modalVoz.classList.remove('active');
      modalVoz.setAttribute('aria-hidden', 'true');
    }
  }

  if (btnFecharVoz) {
    btnFecharVoz.onclick = (e) => {
      e.stopPropagation();
      fecharModalVoz();
    };
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modoVozAtivo) {
      fecharModalVoz();
    }
  });

  if (orbVoz) {
    orbVoz.style.cursor = 'pointer';
    orbVoz.onclick = () => {
      pararFala();
      if (modoVozAtivo) {
        setTimeout(() => {
          iniciarCicloEscutaModal();
        }, 120);
      }
    };
  }

  if (btnVoz) {
    if (!suportaReconhecimento()) {
      btnVoz.style.display = 'none';
    } else {
      btnVoz.onclick = async (e) => {
        e.preventDefault();
        pararFala();

        modoVozAtivo = true;
        if (modalVoz) {
          modalVoz.classList.add('active');
          modalVoz.setAttribute('aria-hidden', 'false');
        }

        await travarMicrofoneHardware();
        iniciarCicloEscutaModal();
      };
    }
  }

  const msgsBox = $('chatMessages');
  if (msgsBox && !msgsBox.children.length) {
    chatHistory.forEach(m => {
      if (['assistant', 'user'].includes(m.role)) {
        ctxApp.appendMessage(m.role === 'assistant' ? 'bot' : 'user', m.content);
      }
    });
  }
}

function inicializarGlobal() {
  const contexto = (typeof window.obterContextoERP === 'function') ? window.obterContextoERP() : null;
  if (contexto) {
    inicializarAuroraAgent(contexto);
  }
}

// Registra o envio antes da inicialização dos controles opcionais de voz.
window.processarMensagemAurora = processarMensagemAurora;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarGlobal, { once: true });
} else {
  inicializarGlobal();
}

// Observações usam o mesmo transporte e a mesma chave do agente, sem ferramentas,
// histórico de chat, voz, gravação de memória ou execução de ações no ERP.
export async function gerarObservacaoAurora(context, options = {}) {
  if (processandoRequisicao) throw new Error('O chat tem prioridade.');
  const ctx = window.obterContextoERP?.();
  if (!ctx?.apiKey) throw new Error('Chave indisponível.');
  const response = await chamarGroqComTools([
    { role: 'system', content: gerarPromptObservacao() },
    { role: 'user', content: JSON.stringify(context) }
  ], ctx.apiKey, { useTools: false, timeoutMs: 8000, signal: options.signal });
  return response.choices?.[0]?.message?.content || '';
}

window.AuroraLiveAI = Object.freeze({
  available: () => !processandoRequisicao && !!window.obterContextoERP?.()?.apiKey,
  generate: gerarObservacaoAurora
});

// Adaptador de relatório: mesmo transporte/modelos/chave, sem ações ou memória.
// Não participa do ledger de eventos automáticos do Aurora Live.
export async function gerarResumoAurora(context, options = {}) {
  if (processandoRequisicao) throw new Error('CHAT_BUSY');
  const ctx = window.obterContextoERP?.();
  if (!ctx?.apiKey) throw new Error('NO_API_KEY');
  const response = await chamarGroqComTools([
    { role: 'system', content: gerarPromptResumo(options.repair) },
    { role: 'user', content: JSON.stringify(context) }
  ], ctx.apiKey, {
    useTools: false, timeoutMs: 15000, signal: options.signal,
    responseFormat: formatoResumoAurora(context),
    maxCompletionTokens: options.repair ? 4096 : 2048, reasoningEffort: 'low'
  });
  const choice = response.choices?.[0], message = choice?.message;
  if (choice?.finish_reason === 'length') throw new Error('TRUNCATED_REPORT_RESPONSE');
  if (message?.refusal || choice?.finish_reason === 'content_filter') throw new Error('REPORT_REFUSED');
  if (message?.tool_calls?.length || typeof message?.content !== 'string' || !message.content.trim()) throw new Error('INVALID_REPORT_RESPONSE');
  return message.content;
}
window.AuroraSummaryAI = Object.freeze({ generate: gerarResumoAurora });

// Explicit aggregate-only query; same transport, models and API key.
export async function analisarCentralTrabalho(context, options = {}) {
  if (processandoRequisicao) throw new Error('CHAT_BUSY');
  const ctx = window.obterContextoERP?.();
  if (!ctx?.apiKey) throw new Error('NO_API_KEY');
  const ai = window.ERPWorkAI;
  if (!ai) throw new Error('AI_UNAVAILABLE');
  const response = await chamarGroqComTools([
    { role:'system', content:ai.prompt(options.repair) },
    { role:'user', content:JSON.stringify(context) }
  ], ctx.apiKey, { useTools:false, timeoutMs:15000, signal:options.signal,
    responseFormat:ai.schema(context), maxCompletionTokens:options.repair ? 4096 : 2048, reasoningEffort:'low' });
  const choice = response.choices?.[0], message = choice?.message;
  if (choice?.finish_reason === 'length') throw new Error('TRUNCATED_WORK_RESPONSE');
  if (message?.refusal || message?.tool_calls?.length || typeof message?.content !== 'string') throw new Error('INVALID_WORK_RESPONSE');
  return message.content;
}
window.AuroraWorkAI = Object.freeze({ generate:analisarCentralTrabalho });

// Phase 3 uses the existing transport/key/models, without tools or chat history.
export async function gerarIntegracaoAurora(context, options = {}) {
  if (processandoRequisicao) throw new Error('CHAT_BUSY');
  const ctx = window.obterContextoERP?.();
  if (!ctx?.apiKey) throw new Error('NO_API_KEY');
  const integration = window.AuroraIntegration;
  const response = await chamarGroqComTools([
    { role: 'system', content: integration.prompt(context.channel, options.repair) },
    { role: 'user', content: JSON.stringify(context) }
  ], ctx.apiKey, { useTools: false, integration: true, timeoutMs: context.channel === 'observa' ? 8000 : 15000,
    signal: options.signal, responseFormat: options.compatibility === true ? {type:'json_object'} : integration.schema(context),
    maxCompletionTokens: 4096, reasoningEffort: 'low' });
  const choice = response.choices?.[0], message = choice?.message;
  if (choice?.finish_reason === 'length') throw new Error('TRUNCATED_INTEGRATION_RESPONSE');
  if (message?.refusal || message?.tool_calls?.length || typeof message?.content !== 'string') throw new Error('INVALID_INTEGRATION_RESPONSE');
  return message.content;
}
window.AuroraIntegrationAI = Object.freeze({
  status: () => processandoRequisicao ? 'CHAT_BUSY' : !window.obterContextoERP?.()?.apiKey ? 'NO_API_KEY' : 'READY',
  available: () => !processandoRequisicao && !!window.obterContextoERP?.()?.apiKey,
  generate: gerarIntegracaoAurora
});
