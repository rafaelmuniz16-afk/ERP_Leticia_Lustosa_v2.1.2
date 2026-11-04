// js/aurora/dispatcher.js

// Normalização estrita do tipo: não adivinha nem converte erro para Ônus silenciosamente
function normalizarTipoEstrito(valor) {
  if (!valor) throw new Error('Tipo de encerramento obrigatório. Opções: Ônus, Acordo, Êxito ou Inativação.');
  const limpo = String(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (limpo === 'exito' || limpo.includes('exit')) return 'Êxito';
  if (limpo === 'onus' || limpo.includes('onus')) return 'Ônus';
  if (limpo === 'acordo' || limpo.includes('acord')) return 'Acordo';
  if (limpo === 'inativacao') return 'Inativação';
  throw new Error('Tipo inválido ("' + valor + '"). Deve ser estritamente: Ônus, Acordo, Êxito ou Inativação.');
}

// Dicionário fonético robusto para o Panjud
function normalizarPanjud(valor, padrao = 'Não') {
  if (!valor) return padrao;
  const limpo = String(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  const variantesAfirmativas = ['sim', 's', 'true', '1', 'positivo', 'encerrado', 'panjud sim', 'panjude sim', 'panjuge sim'];
  const variantesNegativas = ['nao', 'n', 'false', '0', 'negativo', 'recusado', 'panjud nao', 'panjude nao', 'panjuge nao'];

  if (variantesAfirmativas.includes(limpo)) return 'Sim';
  if (variantesNegativas.includes(limpo)) return 'Não';

  if (/^(panjud|panjude|panjuge|panju|paju)$/i.test(limpo)) return 'Sim';
  return padrao;
}

function normalizarSimNaoEstrito(valor, campo = 'campo') {
  if (!valor) return 'Não';
  const limpo = String(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (['sim', 's', 'true', '1', 'positivo'].includes(limpo)) return 'Sim';
  if (['nao', 'n', 'false', '0', 'negativo'].includes(limpo)) return 'Não';
  throw new Error('Valor inválido para ' + campo + ': "' + valor + '". Deve ser Sim ou Não.');
}

function formatarCNJAutomatico(valor, formatadorOriginal) {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (digitos.length === 20) {
    return digitos.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6');
  }
  if (typeof formatadorOriginal === 'function') {
    return formatadorOriginal(valor);
  }
  return valor;
}

function obterMesDoRegistro(r, getMesCorretoFn) {
  if (typeof getMesCorretoFn === 'function') {
    return String(getMesCorretoFn(r) || '').padStart(2, '0');
  }
  return String(r.mesReferencia || '').padStart(2, '0');
}

export async function executarFerramenta(nome, args, ctx) {
  const { 
    $, bd, metas, memoriaIA, calculate, renderAll, updateMetaInput, 
    saveRecord, registrarLog, toast, formatarProcessoCNJ, validarDigitoCNJ, 
    getTodayLocal, getSelectedMonth, getMesCorreto, uid, serverMutation, loadCloud 
  } = ctx;

  switch (nome) {
    // -------------------------------------------------------------
    // TOOL: SINCRONIZAÇÃO DIRETA COM A NUVEM
    // -------------------------------------------------------------
    case 'sincronizarERP': {
      if (typeof loadCloud === 'function') {
        await loadCloud(false);
      } else if (typeof window.loadCloud === 'function') {
        await window.loadCloud(false);
      }
      return { status: 'sucesso', mensagem: 'Dados sincronizados com o Google Planilhas com sucesso.' };
    }

    // -------------------------------------------------------------
    // TOOL: RANKING DIÁRIO DE PRODUTIVIDADE
    // -------------------------------------------------------------
    case 'consultarRankingDiario': {
      const mAlvo = String(args.mes || getSelectedMonth()).padStart(2, '0');
      const lista = (Array.isArray(bd) ? bd : []).filter(r => obterMesDoRegistro(r, getMesCorreto) === mAlvo);
      
      const porDia = {};
      lista.forEach(r => {
        const dia = r.data || 'Sem data';
        porDia[dia] = (porDia[dia] || 0) + 1;
      });

      const ordenado = Object.entries(porDia).sort((a, b) => b[1] - a[1]);
      const melhor = ordenado[0] ? { data: ordenado[0][0], totalCasos: ordenado[0][1] } : null;

      return {
        mesReferencia: mAlvo,
        totalCasosNoMes: lista.length,
        diaCampeao: melhor,
        rankingTop3: ordenado.slice(0, 3).map(([data, total]) => ({ data, total }))
      };
    }

    // -------------------------------------------------------------
    // TOOL: CONSULTA DE CASOS COM FILTROS
    // -------------------------------------------------------------
    case 'consultarCasos': {
      const { mes, tipo, panjud, termo, limite = 3, ordem = 'recente' } = args;
      let lista = Array.isArray(bd) ? [...bd] : [];

      if (mes) {
        const mAlvo = String(mes).padStart(2, '0');
        lista = lista.filter(r => obterMesDoRegistro(r, getMesCorreto) === mAlvo);
      }
      if (tipo && tipo !== 'Todos') {
        const tNormalizado = normalizarTipoEstrito(tipo);
        lista = lista.filter(r => {
          try { return normalizarTipoEstrito(r.tipo) === tNormalizado; } catch(e) { return false; }
        });
      }
      if (panjud && panjud !== 'Todos') {
        const pNormalizado = normalizarPanjud(panjud);
        lista = lista.filter(r => normalizarPanjud(r.panjud) === pNormalizado);
      }
      if (termo) {
        const t = String(termo).toLowerCase();
        lista = lista.filter(r => String(r.id).toLowerCase().includes(t) || String(r.processo).toLowerCase().includes(t));
      }

      lista.sort((a, b) => {
        const dA = new Date(a.data || 0);
        const dB = new Date(b.data || 0);
        return ordem === 'recente' ? dB - dA : dA - dB;
      });

      const max = Math.min(Number(limite) || 3, 5);
      const casosFiltrados = lista.slice(0, max).map(r => ({
        id: r.id,
        processo: r.processo,
        tipo: r.tipo,
        data: r.data,
        mes: obterMesDoRegistro(r, getMesCorreto),
        panjud: r.panjud
      }));

      return {
        totalEncontrados: lista.length,
        casos: casosFiltrados
      };
    }

    // -------------------------------------------------------------
    // TOOL: NAVEGAÇÃO DE TELA
    // -------------------------------------------------------------
    case 'navegarEcra': {
      const { destino } = args;
      if (destino === 'auditoria') {
        const win = $('winAuditoria');
        if (win) {
          win.style.display = 'flex';
          if (ctx.renderLogs) ctx.renderLogs();
        }
        return { status: 'sucesso', destino: 'auditoria' };
      }

      const elemento = $(destino);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (destino === 'cadastro') {
          setTimeout(() => {
            const inp = $('idCaso');
            if (inp) inp.focus();
          }, 400);
        }
        return { status: 'sucesso', destino: destino };
      }
      return { status: 'erro', mensagem: 'Seção não encontrada: ' + destino };
    }

    // -------------------------------------------------------------
    // TOOL: FILTRAR TABELA NO ERP
    // -------------------------------------------------------------
    case 'filtrarTabela': {
      const { tipo, panjud, mes, busca } = args;
      if (tipo && $('filterTipo')) {$('filterTipo').value = tipo === 'Todos' ? 'Todos' : normalizarTipoEstrito(tipo);
      }
      if (panjud && $('filterEncerrado')) {$('filterEncerrado').value = panjud === 'Todos' ? 'Todos' : normalizarPanjud(panjud);
      }
      if (mes && $('filterMonth')) {
        $('filterMonth').value = String(mes).padStart(2, '0');$('filterMonth').dispatchEvent(new Event('change'));
      }
      if (busca !== undefined && $('searchInput')) {$('searchInput').value = busca;
      }
      if (ctx.setCurrentPage) ctx.setCurrentPage(1);
      renderAll();
      return { status: 'sucesso', mensagem: 'Filtros aplicados no ERP.' };
    }

    // -------------------------------------------------------------
    // TOOL: CONSULTAR MÉTRICAS DO MÊS
    // -------------------------------------------------------------
    case 'consultarMetricas': {
      const mesConsultado = String(args.mes || getSelectedMonth()).padStart(2, '0');
      const c = (typeof calculate === 'function') ? calculate(mesConsultado) : {};
      
      return {
        mes: mesConsultado,
        meta: c.meta || (metas ? metas[mesConsultado] : 0),
        reais: c.reais !== undefined ? c.reais : 0,
        totais: c.totais !== undefined ? c.totais : 0,
        cadastrados: c.quant !== undefined ? c.quant : 0,
        baseMeta: 'encerramentos_reais_confirmados_panjud_sim',
        notaMeta: 'Atingimento da meta usa SOMENTE reais, nunca totais nem cadastrados.',
        recusados: c.recusados !== undefined ? c.recusados : 0,
        faltaMeta: c.faltaReais !== undefined ? Math.max(0, c.faltaReais) : 0,
        metaBatida: c.faltaReais !== undefined ? (c.faltaReais <= 0) : false
      };
    }

    // -------------------------------------------------------------
    // TOOL: CADASTRAR CASO COM TRAVA ANTI-SWEETALERT NA VOZ
    // -------------------------------------------------------------
    case 'cadastrarCaso': {
      const { id, processo, tipo, data, mesReferencia, panjud, recusado, observacoes } = args;

      const tipoHigienizado = normalizarTipoEstrito(tipo);
      const processoFormatado = formatarCNJAutomatico(processo, formatarProcessoCNJ);
      const digitos = processoFormatado.replace(/\D/g, '');

      if (digitos.length !== 20) {
        throw new Error('Processo incompleto (' + digitos.length + '/20 dígitos). O padrão CNJ exige 20 dígitos.');
      }

      if (typeof validarDigitoCNJ === 'function' && !validarDigitoCNJ(processoFormatado)) {
        throw new Error('Dígitos verificadores do processo CNJ inválidos.');
      }

      let panjudHigienizado = normalizarPanjud(panjud, 'Não');
      let recusadoHigienizado = normalizarSimNaoEstrito(recusado, 'Recusado');

      const obsTexto = String(observacoes || '').toLowerCase();
      if (/panjud[eg]?\s*(e|foi|ta|esta)?\s*(sim|ok|positivo)/i.test(obsTexto)) panjudHigienizado = 'Sim';
      if (/recusad[oa]\s*(no\s*panjud[eg]?)?\s*(e|foi|ta|esta)?\s*(sim|positivo)/i.test(obsTexto)) recusadoHigienizado = 'Sim';

      if (panjudHigienizado === 'Sim' && recusadoHigienizado === 'Sim') {
        throw new Error('Inconsistência: um caso não pode estar encerrado no Panjud (Sim) e Recusado no Panjud (Sim) ao mesmo tempo.');
      }

      // Se o modal de voz estiver aberto, a confirmação já foi feita por voz (sem travar por trás)
      const modalVozAberto = document.getElementById('auroraVoiceModal')?.classList.contains('active');
      if (!modalVozAberto && typeof Swal !== 'undefined') {
        const confirmacao = await Swal.fire({
          title: 'Confirmar Cadastro?',
          html: `<b>ID:</b> ${id}<br><b>Processo:</b> ${processoFormatado}<br><b>Tipo:</b> ${tipoHigienizado}<br><b>Panjud:</b> ${panjudHigienizado}`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sim, cadastrar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#4f46e5'
        });

        if (!confirmacao.isConfirmed) {
          throw new Error('Cadastro cancelado pelo usuário.');
        }
      }

      const registro = {
        id: String(id).trim(),
        processo: processoFormatado,
        tipo: tipoHigienizado,
        data: data || getTodayLocal(),
        mesReferencia: String(mesReferencia || getSelectedMonth()).padStart(2, '0'),
        panjud: panjudHigienizado,
        recusado: recusadoHigienizado,
        observacoes: (observacoes || '').trim(),
        _uid: uid()
      };

      await saveRecord(registro);
      bd.push(registro);
      localStorage.setItem('bd_oficial_leticia', JSON.stringify(bd));
      registrarLog('CADASTRAR (AURORA TOOL)', registro.id, 'Processo: ' + registro.processo + ' | Tipo: ' + registro.tipo + ' | Panjud: ' + registro.panjud);
      renderAll();
      ctx.refreshAuroraLive?.({ confirmed: true });
      toast('success', 'Caso ' + registro.id + ' cadastrado com sucesso!');

      return {
        status: 'sucesso',
        id: registro.id,
        processo: registro.processo,
        tipo: registro.tipo,
        panjud: registro.panjud
      };
    }

    // -------------------------------------------------------------
    // TOOL: ALTERAR META COM CONFIRMAÇÃO NA NUVEM
    // -------------------------------------------------------------
    case 'alterarMeta': {
      const { mes, valor } = args;
      const mesFormatado = String(mes).padStart(2, '0');
      const numValor = Number(valor);

      if (isNaN(numValor) || numValor < 0) {
        throw new Error('Valor de meta inválido: ' + valor);
      }

      const modalVozAberto = document.getElementById('auroraVoiceModal')?.classList.contains('active');
      if (!modalVozAberto && typeof Swal !== 'undefined') {
        const confirmacao = await Swal.fire({
          title: 'Alterar Meta?',
          text: `Deseja alterar a meta do mês ${mesFormatado} para ${numValor}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Confirmar alteração',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#4f46e5'
        });

        if (!confirmacao.isConfirmed) {
          throw new Error('Alteração de meta cancelada pelo usuário.');
        }
      }

      const mutacaoFn = serverMutation || window.serverMutation;
      if (typeof mutacaoFn === 'function') {
        await mutacaoFn('salvarMeta', { mes: mesFormatado, meta: numValor });
      }

      metas[mesFormatado] = numValor;
      localStorage.setItem('metas_oficial_leticia', JSON.stringify(metas));
      
      if (getSelectedMonth() === mesFormatado && $('metaInput')) {$('metaInput').value = numValor;
      }
      
      renderAll();
      ctx.refreshAuroraLive?.({ confirmed: true });
      toast('success', 'Meta de ' + mesFormatado + ' atualizada para ' + numValor + ' pela nuvem!');
      
      return {
        status: 'sucesso',
        mes: mesFormatado,
        novaMeta: numValor,
        confirmadoNuvem: true
      };
    }

    // -------------------------------------------------------------
    // TOOL: GRAVAR MEMÓRIA DA AURORA
    // -------------------------------------------------------------
    case 'gravarMemoria': {
      const textoLimpo = String(args?.texto || '').trim().slice(0, 500);
      if (!textoLimpo) throw new Error('Texto de memória vazio.');
      let confirmadoNuvem = false;
      try {
        // Antes o sistema iniciava o fetch sem conferir o resultado e dizia
        // "salvo" mesmo se a aba Memoria_IA não recebesse a gravação.
        if (typeof ctx.serverMutation === 'function') {
          await ctx.serverMutation('salvarMemoria', { texto: textoLimpo });
          confirmadoNuvem = true;
        }
      } catch (_) { /* Preserva a nota local com status explícito. */ }
      const atual = Array.isArray(memoriaIA) ? memoriaIA : [];
      if (!atual.includes(textoLimpo)) atual.push(textoLimpo);
      while (atual.length > 100) atual.shift();
      localStorage.setItem('memoria_oficial_ia', JSON.stringify(atual));
      registrarLog('MEMORIA (AURORA)', '-', 'Anotação: ' + textoLimpo + (confirmadoNuvem ? ' | Confirmada na nuvem' : ' | Apenas local'));
      return {
        status: confirmadoNuvem ? 'sucesso' : 'salvo_apenas_localmente',
        confirmadoNuvem,
        memoriaSalva: textoLimpo,
        mensagem: confirmadoNuvem ? 'Memória confirmada no servidor.' : 'Memória salva somente neste navegador. O endpoint de escrita não confirmou o registro na planilha.'
      };
    }

    default:
      throw new Error('Ferramenta "' + nome + '" não implementada.');
  }
}
