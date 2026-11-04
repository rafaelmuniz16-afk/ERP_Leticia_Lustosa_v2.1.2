// js/aurora/tools.js

export const AURORA_TOOLS = [
  {
    type: "function",
    function: {
      name: "sincronizarERP",
      description: "Forca a sincronizacao e atualizacao completa dos dados da ERP diretamente com o Google Planilhas.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultarRankingDiario",
      description: "Analisa qual dia do mes teve mais encerramentos, media diaria e ranking dos dias mais produtivos.",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "string", description: "Dois digitos do mes de referencia (ex: '08', '09', '10')." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultarCasos",
      description: "Consulta e lista os casos cadastrados no ERP com filtros por mes, tipo, panjud ou busca textual, ordenados por data.",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "string", description: "Dois digitos do mes de referencia (ex: '08', '09', '10')." },
          tipo: { type: "string", enum: ["Ônus", "Acordo", "Êxito", "Inativação", "Todos"], description: "Tipo de encerramento." },
          panjud: { type: "string", enum: ["Sim", "Não", "Todos"], description: "Status no Panjud." },
          termo: { type: "string", description: "Termo de busca para ID ou numero do processo." },
          limite: { type: "number", description: "Quantidade de casos a listar (maximo 5)." },
          ordem: { type: "string", enum: ["recente", "antigo"], description: "Ordenacao por data (padrao: 'recente')." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navegarEcra",
      description: "Muda a visualizacao ou rola a tela para uma secao especifica da interface da ERP.",
      parameters: {
        type: "object",
        properties: {
          destino: {
            type: "string",
            enum: ["dashboard", "cadastro", "historico", "auditoria"],
            description: "A secao ou tela para onde o usuario quer navegar."
          }
        },
        required: ["destino"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "filtrarTabela",
      description: "Aplica filtros automaticos na tabela de encerramentos/historico na interface.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["Ônus", "Acordo", "Êxito", "Inativação", "Todos"], description: "Filtrar por tipo." },
          panjud: { type: "string", enum: ["Sim", "Não", "Todos"], description: "Filtrar por status no Panjud." },
          mes: { type: "string", description: "Dois digitos do mes de referencia (ex: '08', '09', '10')." },
          busca: { type: "string", description: "Termo de busca textual para ID ou numero de processo." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultarMetricas",
      description: "ÚNICA fonte para metas: reais = casos com Panjud Sim. Cadastrados e totais NÃO contam para atingir a meta. Fornece faltaMeta = max(meta - reais, 0).",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "string", description: "Mes a consultar com dois digitos (ex: '08', '09', '10')." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "cadastrarCaso",
      description: "Cadastra um novo processo/caso na ERP. Sempre use com acentuacao estrita: 'Ônus', 'Acordo', 'Êxito', 'Inativação' e 'Sim' ou 'Não'.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID interno do caso." },
          processo: { type: "string", description: "Numero do processo judicial (CNJ de 20 digitos)." },
          tipo: { type: "string", enum: ["Ônus", "Acordo", "Êxito", "Inativação"], description: "Tipo com acento exato." },
          data: { type: "string", description: "Data no formato AAAA-MM-DD." },
          mesReferencia: { type: "string", description: "Dois digitos do mes de referencia (ex: '10')." },
          panjud: { type: "string", enum: ["Sim", "Não"], description: "Encerrado no Panjud: Sim ou Não com til." },
          recusado: { type: "string", enum: ["Sim", "Não"], description: "Recusado no Panjud: Sim ou Não com til." },
          observacoes: { type: "string", description: "Observacoes adicionais." }
        },
        required: ["id", "processo", "tipo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "alterarMeta",
      description: "Atualiza a meta quantitativa de encerramentos para um determinado mes.",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "string", description: "Dois digitos do mes (ex: '10')." },
          valor: { type: "number", description: "Novo valor numerico da meta." }
        },
        required: ["mes", "valor"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "gravarMemoria",
      description: "Salva uma nota ou lembrete importante na memoria persistente da Aurora.",
      parameters: {
        type: "object",
        properties: {
          texto: { type: "string", description: "O fato ou instrucao a ser lembrada." }
        },
        required: ["texto"]
      }
    }
  }
];
