// js/aurora/speech.js

const ReconhecimentoAPI = window.SpeechRecognition ? window.SpeechRecognition : window.webkitSpeechRecognition;
const sintetizador = ('speechSynthesis' in window) ? window.speechSynthesis : null;

let reconhecimentoAtivo = null;
let timerSilencio = null;
let bufferTexto = '';
let escutaContinuaAtiva = false;
let streamHardwareAudio = null;
let cancelouFalaManual = false;

export function suportaReconhecimento() {
  return Boolean(ReconhecimentoAPI);
}

export async function travarMicrofoneHardware() {
  try {
    if (!streamHardwareAudio && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      streamHardwareAudio = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    }
  } catch (err) {
    console.warn('[Voz] Hardware lock não disponível:', err);
  }
}

export function liberarMicrofoneHardware() {
  if (streamHardwareAudio) {
    try {
      streamHardwareAudio.getTracks().forEach(track => track.stop());
    } catch (e) {}
    streamHardwareAudio = null;
  }
}

export function limparTextoParaVoz(textoOriginal) {
  if (!textoOriginal) return '';

  let texto = textoOriginal;

  texto = texto.replace(/```[\s\S]*?```/g, '');
  texto = texto.replace(/`.*?`/g, '');
  texto = texto.replace(/\\[a-zA-Z]+\{[^}]*\}\{[^}]*\}/g, '');
  texto = texto.replace(/\\[a-zA-Z]+\{[^}]*\}/g, '');
  texto = texto.replace(/\\[a-zA-Z]+/g, '');

  const linhas = texto.split('\n');
  const linhasSemTabela = linhas.filter(l => !l.includes('|'));
  texto = linhasSemTabela.join(' ');

  texto = texto.replace(/≈/g, ' aproximadamente ');
  texto = texto.replace(/÷/g, ' dividido por ');
  texto = texto.replace(/%/g, ' por cento ');
  texto = texto.replace(/\+/g, ' mais ');

  texto = texto.replace(/[#*_~>•✓❌🚀💪📌✨✦]/g, '');
  texto = texto.replace(/\[\d+\]/g, '');
  texto = texto.replace(/[-]{2,}/g, '');
  texto = texto.replace(/\s+/g, ' ').trim();

  const frases = texto.match(/[^.!?]+[.!?]+/g);
  if (frases && frases.length > 2) {
    const resumoFalado = frases.slice(0, 2).join(' ').trim();
    return resumoFalado + ' Deixei o detalhamento e as tabelas completas na tela pra você conferir!';
  }

  return texto;
}

export function iniciarEscuta({ onInicio, onTranscricao, onFalaFinal, onErro }) {
  if (!suportaReconhecimento()) {
    if (onErro) onErro('Navegador sem suporte a voz.');
    return;
  }

  escutaContinuaAtiva = true;
  bufferTexto = '';
  pararEscutaInterna();

  function iniciarInstancia() {
    if (!escutaContinuaAtiva) return;

    try {
      const rec = new ReconhecimentoAPI();
      rec.lang = 'pt-BR';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        if (onInicio) onInicio();
      };

      rec.onsoundstart = () => {
        if (timerSilencio) {
          clearTimeout(timerSilencio);
          timerSilencio = null;
        }
      };

      rec.onspeechstart = () => {
        if (timerSilencio) {
          clearTimeout(timerSilencio);
          timerSilencio = null;
        }
      };

      rec.onresult = (event) => {
        let textoAtual = '';
        for (let i = 0; i < event.results.length; ++i) {
          textoAtual += event.results[i][0].transcript;
        }

        bufferTexto = textoAtual.trim();

        if (onTranscricao && bufferTexto) {
          onTranscricao(bufferTexto);
        }

        if (timerSilencio) clearTimeout(timerSilencio);

        if (bufferTexto) {
          timerSilencio = setTimeout(() => {
            if (bufferTexto && escutaContinuaAtiva) {
              const comandoFinal = bufferTexto;
              escutaContinuaAtiva = false;
              pararEscutaInterna();
              if (onFalaFinal) onFalaFinal(comandoFinal);
            }
          }, 2600);
        }
      };

      rec.onerror = (event) => {
        if (['no-speech', 'aborted'].includes(event.error)) return;
        if (event.error === 'not-allowed') {
          escutaContinuaAtiva = false;
          if (onErro) onErro('Permissão de microfone negada.');
        }
      };

      rec.onend = () => {
        reconhecimentoAtivo = null;
        if (escutaContinuaAtiva) {
          setTimeout(iniciarInstancia, 150);
        }
      };

      rec.start();
      reconhecimentoAtivo = rec;
    } catch (e) {
      if (escutaContinuaAtiva) {
        setTimeout(iniciarInstancia, 250);
      }
    }
  }

  // Pequeno intervalo para o navegador desarmar instâncias antigas antes de subir a nova
  setTimeout(iniciarInstancia, 60);
}

function pararEscutaInterna() {
  if (timerSilencio) {
    clearTimeout(timerSilencio);
    timerSilencio = null;
  }
  if (reconhecimentoAtivo) {
    try {
      // Remove os listeners antigos para evitar que o onend antigo interfira na nova instância
      reconhecimentoAtivo.onstart = null;
      reconhecimentoAtivo.onresult = null;
      reconhecimentoAtivo.onerror = null;
      reconhecimentoAtivo.onend = null;
      reconhecimentoAtivo.abort();
    } catch (e) {}
    reconhecimentoAtivo = null;
  }
}

export function pararEscuta() {
  escutaContinuaAtiva = false;
  pararEscutaInterna();
}

export function pararFala() {
  cancelouFalaManual = true; // Sinaliza interrupção intencional
  if (sintetizador) {
    sintetizador.cancel();
    window._utteranceAtiva = null;
  }
}

export function estaFalando() {
  return Boolean(sintetizador && sintetizador.speaking);
}

export function falarResposta(textoOriginal, onEnd) {
  if (!sintetizador || !textoOriginal) {
    if (onEnd) onEnd();
    return;
  }

  pararFala();
  cancelouFalaManual = false; // Novo ciclo de fala

  const textoLimpo = limparTextoParaVoz(textoOriginal);

  if (!textoLimpo) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(textoLimpo);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.25;
  utterance.pitch = 1.05;

  window._utteranceAtiva = utterance;

  const vozes = sintetizador.getVoices();
  const termosHumanos = ['Natural', 'Neural', 'Online', 'Google', 'Francisca', 'Luciana'];
  
  let vozEscolhida = vozes.find(v => v.lang.includes('pt') && termosHumanos.some(t => v.name.includes(t)));
  if (!vozEscolhida) {
    vozEscolhida = vozes.find(v => v.lang.includes('pt-BR') && !v.name.includes('Desktop'));
  }
  if (!vozEscolhida) {
    vozEscolhida = vozes.find(v => v.lang.includes('pt-BR'));
  }

  if (vozEscolhida) {
    utterance.voice = vozEscolhida;
  }

  utterance.onend = () => {
    window._utteranceAtiva = null;
    // SÓ reabre a escuta automática se a fala terminou naturalmente (não foi interrompida pelo clique no orbe)
    if (!cancelouFalaManual && onEnd) {
      onEnd();
    }
  };

  utterance.onerror = () => {
    window._utteranceAtiva = null;
  };

  sintetizador.speak(utterance);
}
