import jsPDF from "jspdf";

// ─── Helpers ─────────────────────────────────────────────
function sanitize(s: string | null | undefined): string {
  if (!s) return "";
  // Remove accented chars that might cause encoding issues
  return s
    .replace(/[áàâã]/g, "a").replace(/[ÁÀÂÃ]/g, "A")
    .replace(/[éèê]/g, "e").replace(/[ÉÈÊ]/g, "E")
    .replace(/[íìî]/g, "i").replace(/[ÍÌÎ]/g, "I")
    .replace(/[óòôõ]/g, "o").replace(/[ÓÒÔÕ]/g, "O")
    .replace(/[úùû]/g, "u").replace(/[ÚÙÛ]/g, "U")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/ñ/g, "n").replace(/Ñ/g, "N");
}

function formatDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function addHeader(doc: jsPDF, title: string, condominioName?: string) {
  const w = doc.internal.pageSize.getWidth();
  // Header bar
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, w, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize(title), 14, 12);
  if (condominioName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(condominioName), 14, 20);
  }
  doc.setFontSize(9);
  doc.text("Gerado em: " + formatDate(new Date().toISOString()), w - 14, 20, { align: "right" });
  doc.setTextColor(0, 0, 0);
  return 36;
}

function addField(doc: jsPDF, label: string, value: string | null | undefined, x: number, y: number, maxWidth?: number): number {
  if (!value) return y;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize(label.toUpperCase()), x, y);
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(sanitize(value), maxWidth || 80);
  doc.text(lines, x, y + 5);
  return y + 5 + lines.length * 4;
}

function addImage(doc: jsPDF, base64: string, x: number, y: number, maxW: number, maxH: number): number {
  try {
    if (base64.startsWith("data:image")) {
      const format = base64.includes("png") ? "PNG" : "JPEG";
      doc.addImage(base64, format, x, y, maxW, maxH);
      return y + maxH + 4;
    }
  } catch { /* ignore invalid images */ }
  return y;
}

function checkPage(doc: jsPDF, y: number, needed: number = 30): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 15) {
    doc.addPage();
    return 15;
  }
  return y;
}

// ─── Livro de Protocolo ──────────────────────────────────
export function gerarPdfLivroProtocolo(entry: any, condominioName?: string) {
  const doc = new jsPDF();
  let y = addHeader(doc, "Livro de Protocolo - Registro", condominioName);

  const w = doc.internal.pageSize.getWidth();
  const mid = w / 2;

  // Tipo badge
  const tipoLabels: Record<string, string> = {
    encomenda: "Encomenda",
    entrega: "Entrega de Item",
    retirada: "Retirada de Correspondencia",
  };
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, y, w - 28, 10, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(sanitize(tipoLabels[entry.tipo] || entry.tipo), 20, y + 7);
  y += 16;

  y = addField(doc, "Protocolo", entry.protocolo, 14, y);
  y = addField(doc, "Data/Hora", formatDate(entry.created_at), mid, y - 9, 80);
  y += 4;

  if (entry.tipo === "encomenda") {
    y = addField(doc, "Deixada por", entry.deixada_por, 14, y);
    y = addField(doc, "Para", entry.para, mid, y - 9, 80);
    y += 4;
  } else if (entry.tipo === "entrega") {
    y = addField(doc, "O que e", entry.o_que_e, 14, y, w - 28);
    y += 4;
    y = addField(doc, "Entregue para", entry.entregue_para, 14, y);
    y = addField(doc, "Porteiro", entry.porteiro_entregou, mid, y - 9, 80);
    y += 4;
  } else {
    y = addField(doc, "Retirada por", entry.retirada_por, 14, y);
    y = addField(doc, "Porteiro", entry.porteiro, mid, y - 9, 80);
    y += 4;
  }

  if (entry.foto) {
    y = checkPage(doc, y, 60);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "bold");
    doc.text("FOTO", 14, y);
    y += 3;
    y = addImage(doc, entry.foto, 14, y, 60, 45);
  }

  if (entry.assinatura) {
    y = checkPage(doc, y, 40);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "bold");
    doc.text("ASSINATURA DIGITAL", 14, y);
    y += 3;
    y = addImage(doc, entry.assinatura, 14, y, 50, 25);
  }

  doc.save(`livro-protocolo-${entry.protocolo}.pdf`);
}

// ─── Correspondencias ────────────────────────────────────
export function gerarPdfCorrespondencia(c: any, condominioName?: string) {
  const doc = new jsPDF();
  let y = addHeader(doc, "Correspondencia - Registro", condominioName);
  const w = doc.internal.pageSize.getWidth();
  const mid = w / 2;

  const tipoLabels: Record<string, string> = {
    encomenda: "Encomenda",
    carta: "Carta",
    notificacao: "Notificacao",
    revista: "Revista",
    outros: "Outros",
  };

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, y, w - 28, 10, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(sanitize(tipoLabels[c.tipo] || c.tipo), 20, y + 7);

  const statusLabel = c.status === "retirado" ? " - RETIRADO" : " - PENDENTE";
  doc.setTextColor(c.status === "retirado" ? 22 : 146, c.status === "retirado" ? 101 : 64, c.status === "retirado" ? 52 : 14);
  doc.setFontSize(10);
  doc.text(sanitize(statusLabel), w - 20, y + 7, { align: "right" });
  y += 16;

  y = addField(doc, "Protocolo", c.protocolo, 14, y);
  y = addField(doc, "Data/Hora", formatDate(c.created_at), mid, y - 9, 80);
  y += 4;
  y = addField(doc, "Morador", c.morador_name, 14, y);
  const enderecoText = [c.bloco, c.apartamento].filter(Boolean).join(" - Apto ");
  y = addField(doc, "Endereco", enderecoText ? `Bloco ${enderecoText}` : null, mid, y - 9, 80);
  y += 4;
  if (c.remetente) {
    y = addField(doc, "Remetente", c.remetente, 14, y, w - 28);
    y += 4;
  }
  if (c.descricao) {
    y = addField(doc, "Descricao", c.descricao, 14, y, w - 28);
    y += 4;
  }
  if (c.retirado_at) {
    y = addField(doc, "Retirado em", formatDate(c.retirado_at), 14, y);
    y += 4;
  }

  if (c.foto) {
    y = checkPage(doc, y, 60);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "bold");
    doc.text("FOTO", 14, y); y += 3;
    y = addImage(doc, c.foto, 14, y, 60, 45);
  }

  doc.save(`correspondencia-${c.protocolo}.pdf`);
}

// ─── Visitante ─────────────────────────────────────────
export function gerarPdfVisitante(v: any, condominioName?: string) {
  const doc = new jsPDF();
  let y = addHeader(doc, "Registro de Visitante", condominioName);
  const w = doc.internal.pageSize.getWidth();
  const mid = w / 2;

  const statusLabels: Record<string, string> = {
    autorizado: "Autorizado",
    pendente: "Pendente",
    negado: "Negado",
    dentro: "Dentro",
    saiu: "Saiu",
  };

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, y, w - 28, 10, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(sanitize(statusLabels[v.status] || v.status), 20, y + 7);
  y += 16;

  y = addField(doc, "Nome", v.nome, 14, y, w - 28);
  y += 4;
  y = addField(doc, "Documento", v.documento, 14, y);
  y = addField(doc, "Telefone", v.telefone, mid, y - 9, 80);
  y += 4;

  const enderecoText = [v.bloco ? `Bloco ${v.bloco}` : null, v.apartamento ? `Apto ${v.apartamento}` : null].filter(Boolean).join(" - ");
  y = addField(doc, "Destino (Bloco/Apto)", enderecoText || "N/A", 14, y, w - 28);
  y += 4;
  y = addField(doc, "Autorizado por", v.quem_autorizou || "N/A", 14, y);
  y = addField(doc, "Data/Hora", formatDate(v.created_at), mid, y - 9, 80);
  y += 4;

  if (v.foto) {
    y = checkPage(doc, y, 60);
    doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "bold");
    doc.text("FOTO DO VISITANTE", 14, y); y += 3;
    y = addImage(doc, v.foto, 14, y, 45, 45);
  }

  doc.save(`visitante-${v.nome?.replace(/\s+/g, "_") || v.id}-${Date.now()}.pdf`);
}

// ─── Delivery ────────────────────────────────────────────
export function gerarPdfDelivery(d: any, condominioName?: string) {
  const doc = new jsPDF();
  let y = addHeader(doc, "Registro de Delivery", condominioName);
  const w = doc.internal.pageSize.getWidth();
  const mid = w / 2;

  const SERVICOS: Record<string, string> = {
    ifood: "iFood", rappi: "Rappi", uber_eats: "Uber Eats",
    "99food": "99 Food", loggi: "Loggi", outro: "Outro",
  };

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, y, w - 28, 10, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(sanitize(SERVICOS[d.servico] || d.servico_custom || d.servico), 20, y + 7);

  const statusText = d.status === "recebido" ? " - RECEBIDO" : " - PENDENTE";
  doc.setTextColor(d.status === "recebido" ? 22 : 146, d.status === "recebido" ? 101 : 64, d.status === "recebido" ? 52 : 14);
  doc.setFontSize(10);
  doc.text(sanitize(statusText), w - 20, y + 7, { align: "right" });
  y += 16;

  y = addField(doc, "Morador", d.morador_name, 14, y);
  y = addField(doc, "Telefone", d.morador_phone, mid, y - 9, 80);
  y += 4;
  const enderecoText = [d.bloco ? `Bloco ${d.bloco}` : null, d.apartamento ? `Apto ${d.apartamento}` : null].filter(Boolean).join(" - ");
  y = addField(doc, "Endereco", enderecoText || null, 14, y, w - 28);
  y += 4;
  y = addField(doc, "Servico", SERVICOS[d.servico] || d.servico_custom || d.servico, 14, y);
  y = addField(doc, "Numero Pedido", d.numero_pedido, mid, y - 9, 80);
  y += 4;
  if (d.observacao) {
    y = addField(doc, "Observacao", d.observacao, 14, y, w - 28);
    y += 4;
  }
  y = addField(doc, "Registrado em", formatDate(d.created_at), 14, y);
  if (d.recebido_at) y = addField(doc, "Recebido em", formatDate(d.recebido_at), mid, y - 9, 80);
  y += 4;

  if (d.foto_entrega) {
    y = checkPage(doc, y, 60);
    doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "bold");
    doc.text("FOTO DA ENTREGA", 14, y); y += 3;
    y = addImage(doc, d.foto_entrega, 14, y, 60, 45);
  }
  if (d.print_pedido) {
    y = checkPage(doc, y, 60);
    doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "bold");
    doc.text("PRINT DO PEDIDO", 14, y); y += 3;
    y = addImage(doc, d.print_pedido, 14, y, 60, 45);
  }

  doc.save(`delivery-${d.morador_name?.replace(/\s+/g, "_") || d.id}-${Date.now()}.pdf`);
}

// ─── Veiculo ─────────────────────────────────────────────
export function gerarPdfVeiculo(v: any, condominioName?: string) {
  const doc = new jsPDF();
  let y = addHeader(doc, "Autorizacao de Veiculo", condominioName);
  const w = doc.internal.pageSize.getWidth();
  const mid = w / 2;

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, y, w - 28, 10, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(sanitize(v.placa || "Sem placa"), 20, y + 7);

  const statusMap: Record<string, string> = {
    ativa: "Ativa", pendente_aprovacao: "Pendente", utilizada: "Utilizada",
    expirada: "Expirada", rejeitada: "Rejeitada",
  };
  doc.setFontSize(10);
  doc.text(sanitize(statusMap[v.status] || v.status), w - 20, y + 7, { align: "right" });
  y += 16;

  y = addField(doc, "Morador", v.morador_name, 14, y);
  y = addField(doc, "Telefone", v.morador_phone, mid, y - 9, 80);
  y += 4;
  const enderecoText = [v.bloco ? `Bloco ${v.bloco}` : null, v.apartamento ? `Apto ${v.apartamento}` : null].filter(Boolean).join(" - ");
  y = addField(doc, "Endereco", enderecoText || null, 14, y, w - 28);
  y += 4;
  y = addField(doc, "Placa", v.placa, 14, y);
  y = addField(doc, "Modelo", v.modelo, mid, y - 9, 80);
  y += 4;
  y = addField(doc, "Cor", v.cor, 14, y);
  y = addField(doc, "Motorista", v.motorista_nome, mid, y - 9, 80);
  y += 4;
  y = addField(doc, "Periodo", `${v.data_inicio || ""} a ${v.data_fim || ""}`, 14, y, w - 28);
  y += 4;
  if (v.hora_inicio || v.hora_fim) {
    y = addField(doc, "Horario", `${v.hora_inicio || ""} - ${v.hora_fim || ""}`, 14, y);
    y += 4;
  }
  if (v.observacao) {
    y = addField(doc, "Observacao", v.observacao, 14, y, w - 28);
    y += 4;
  }
  y = addField(doc, "Registrado em", formatDate(v.created_at), 14, y);

  doc.save(`veiculo-${v.placa || v.id}-${Date.now()}.pdf`);
}

// ─── Autorizacao Previa ──────────────────────────────────
export function gerarPdfPreAuth(a: any, condominioName?: string) {
  const doc = new jsPDF();
  let y = addHeader(doc, "Autorizacao Previa", condominioName);
  const w = doc.internal.pageSize.getWidth();
  const mid = w / 2;

  const statusMap: Record<string, string> = {
    ativa: "Ativa", utilizada: "Utilizada", expirada: "Expirada", cancelada: "Cancelada",
  };
  const tipoMap: Record<string, string> = {
    unica: "Unica", periodo: "Periodo", recorrente: "Recorrente",
  };

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, y, w - 28, 10, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(sanitize(tipoMap[a.tipo] || a.tipo), 20, y + 7);

  doc.setFontSize(10);
  doc.text(sanitize(statusMap[a.status] || a.status), w - 20, y + 7, { align: "right" });
  y += 16;

  y = addField(doc, "Visitante", a.visitante_nome, 14, y, w - 28);
  y += 4;
  y = addField(doc, "Documento", a.visitante_documento, 14, y);
  y = addField(doc, "Telefone", a.visitante_telefone, mid, y - 9, 80);
  y += 4;
  y = addField(doc, "Morador", a.morador_name, 14, y);
  y = addField(doc, "Telefone", a.morador_phone, mid, y - 9, 80);
  y += 4;
  const enderecoText = [a.bloco ? `Bloco ${a.bloco}` : null, a.apartamento ? `Apto ${a.apartamento}` : null].filter(Boolean).join(" - ");
  y = addField(doc, "Endereco", enderecoText || null, 14, y, w - 28);
  y += 4;
  y = addField(doc, "Periodo", `${a.data_inicio || ""} a ${a.data_fim || ""}`, 14, y, w - 28);
  y += 4;
  if (a.hora_inicio || a.hora_fim) {
    y = addField(doc, "Horario", `${a.hora_inicio || ""} - ${a.hora_fim || ""}`, 14, y);
    y += 4;
  }
  if (a.observacao) {
    y = addField(doc, "Observacao", a.observacao, 14, y, w - 28);
    y += 4;
  }
  y = addField(doc, "Registrado em", formatDate(a.created_at), 14, y);
  if (a.entrada_confirmada_at) {
    y += 4;
    y = addField(doc, "Entrada confirmada", formatDate(a.entrada_confirmada_at), 14, y);
  }

  if (a.visitante_foto) {
    y = checkPage(doc, y + 4, 60);
    doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "bold");
    doc.text("FOTO DO VISITANTE", 14, y); y += 3;
    y = addImage(doc, a.visitante_foto, 14, y, 45, 45);
  }

  doc.save(`autorizacao-${a.visitante_nome?.replace(/\s+/g, "_") || a.id}-${Date.now()}.pdf`);
}


// ═══════════ REPORT GENERATORS (by date range) ═══════════

function addReportHeader(doc: jsPDF, title: string, dateFrom: string, dateTo: string, condominioName?: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, w, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize(title), 14, 12);
  if (condominioName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(condominioName), 14, 20);
  }
  doc.setFontSize(9);
  doc.text(`Periodo: ${dateFrom} a ${dateTo}`, 14, 27);
  doc.text("Gerado em: " + formatDate(new Date().toISOString()), w - 14, 27, { align: "right" });
  doc.setTextColor(0, 0, 0);
  return 40;
}

function addTableRow(doc: jsPDF, cols: { text: string; x: number; w: number }[], y: number, isHeader: boolean = false) {
  if (isHeader) {
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y - 5, doc.internal.pageSize.getWidth() - 20, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
  }
  cols.forEach((c) => {
    const lines = doc.splitTextToSize(sanitize(c.text), c.w);
    doc.text(lines[0] || "", c.x, y);
  });
  return y + 7;
}

export function gerarRelatorioLivroProtocolo(entries: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();
  let y = addReportHeader(doc, "Relatorio - Livro de Protocolo", dateFrom, dateTo, condominioName);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Total de registros: ${entries.length}`, 14, y);
  y += 8;

  const cols = [
    { text: "PROTOCOLO", x: 14, w: 35 },
    { text: "TIPO", x: 52, w: 30 },
    { text: "DETALHES", x: 85, w: 60 },
    { text: "PORTEIRO", x: 148, w: 40 },
    { text: "ASSINATURA", x: 191, w: 25 },
    { text: "DATA/HORA", x: 219, w: 50 },
  ];
  y = addTableRow(doc, cols, y, true);

  const tipoLabels: Record<string, string> = { encomenda: "Encomenda", entrega: "Entrega", retirada: "Retirada" };

  entries.forEach((e) => {
    y = checkPage(doc, y, 10);
    let detail = "";
    if (e.tipo === "encomenda") detail = `De: ${e.deixada_por || ""} Para: ${e.para || ""}`;
    else if (e.tipo === "entrega") detail = `${e.o_que_e || ""} -> ${e.entregue_para || ""}`;
    else detail = `Por: ${e.retirada_por || ""}`;

    const row = [
      { text: e.protocolo || "", x: 14, w: 35 },
      { text: tipoLabels[e.tipo] || e.tipo, x: 52, w: 30 },
      { text: detail, x: 85, w: 60 },
      { text: e.porteiro_entregou || e.porteiro || "", x: 148, w: 40 },
      { text: e.assinatura ? "Sim" : "Nao", x: 191, w: 25 },
      { text: formatDate(e.created_at), x: 219, w: 50 },
    ];
    y = addTableRow(doc, row, y);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, y - 3, w - 14, y - 3);
  });

  doc.save(`relatorio-livro-protocolo-${dateFrom}-a-${dateTo}.pdf`);
}

export function gerarRelatorioCorrespondencias(items: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();
  let y = addReportHeader(doc, "Relatorio - Correspondencias", dateFrom, dateTo, condominioName);

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${items.length}`, 14, y); y += 8;

  const cols = [
    { text: "PROTOCOLO", x: 14, w: 35 },
    { text: "MORADOR", x: 52, w: 40 },
    { text: "BLOCO/APTO", x: 95, w: 25 },
    { text: "TIPO", x: 123, w: 25 },
    { text: "REMETENTE", x: 151, w: 35 },
    { text: "STATUS", x: 189, w: 20 },
    { text: "DATA", x: 212, w: 50 },
  ];
  y = addTableRow(doc, cols, y, true);

  items.forEach((c) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: c.protocolo || "", x: 14, w: 35 },
      { text: c.morador_name || "", x: 52, w: 40 },
      { text: `${c.bloco || ""} / ${c.apartamento || ""}`, x: 95, w: 25 },
      { text: c.tipo || "", x: 123, w: 25 },
      { text: c.remetente || "", x: 151, w: 35 },
      { text: c.status === "retirado" ? "Retirado" : "Pendente", x: 189, w: 20 },
      { text: formatDate(c.created_at), x: 212, w: 50 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });

  doc.save(`relatorio-correspondencias-${dateFrom}-a-${dateTo}.pdf`);
}

export function gerarRelatorioVisitantes(items: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();
  let y = addReportHeader(doc, "Relatorio - Visitantes", dateFrom, dateTo, condominioName);

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${items.length}`, 14, y); y += 8;

  const cols = [
    { text: "NOME", x: 14, w: 45 },
    { text: "DOCUMENTO", x: 62, w: 30 },
    { text: "TELEFONE", x: 95, w: 30 },
    { text: "BLOCO/APTO", x: 128, w: 25 },
    { text: "AUTORIZOU", x: 156, w: 30 },
    { text: "STATUS", x: 189, w: 20 },
    { text: "DATA", x: 212, w: 50 },
  ];
  y = addTableRow(doc, cols, y, true);

  items.forEach((v) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: v.nome || "", x: 14, w: 45 },
      { text: v.documento || "", x: 62, w: 30 },
      { text: v.telefone || "", x: 95, w: 30 },
      { text: `${v.bloco || ""} / ${v.apartamento || ""}`, x: 128, w: 25 },
      { text: v.quem_autorizou || "", x: 156, w: 30 },
      { text: v.status || "", x: 189, w: 20 },
      { text: formatDate(v.created_at), x: 212, w: 50 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });

  doc.save(`relatorio-visitantes-${dateFrom}-a-${dateTo}.pdf`);
}

export function gerarRelatorioDelivery(items: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();
  let y = addReportHeader(doc, "Relatorio - Deliveries", dateFrom, dateTo, condominioName);

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${items.length}`, 14, y); y += 8;

  const SERVICOS: Record<string, string> = {
    ifood: "iFood", rappi: "Rappi", uber_eats: "Uber Eats",
    "99food": "99 Food", loggi: "Loggi", outro: "Outro",
  };

  const cols = [
    { text: "MORADOR", x: 14, w: 40 },
    { text: "BLOCO/APTO", x: 57, w: 25 },
    { text: "SERVICO", x: 85, w: 25 },
    { text: "N. PEDIDO", x: 113, w: 30 },
    { text: "OBS", x: 146, w: 40 },
    { text: "STATUS", x: 189, w: 20 },
    { text: "DATA", x: 212, w: 50 },
  ];
  y = addTableRow(doc, cols, y, true);

  items.forEach((d) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: d.morador_name || "", x: 14, w: 40 },
      { text: `${d.bloco || ""} / ${d.apartamento || ""}`, x: 57, w: 25 },
      { text: SERVICOS[d.servico] || d.servico_custom || d.servico, x: 85, w: 25 },
      { text: d.numero_pedido || "", x: 113, w: 30 },
      { text: d.observacao || "", x: 146, w: 40 },
      { text: d.status === "recebido" ? "Recebido" : "Pendente", x: 189, w: 20 },
      { text: formatDate(d.created_at), x: 212, w: 50 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });

  doc.save(`relatorio-deliveries-${dateFrom}-a-${dateTo}.pdf`);
}

export function gerarRelatorioVeiculos(items: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();
  let y = addReportHeader(doc, "Relatorio - Veiculos", dateFrom, dateTo, condominioName);

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${items.length}`, 14, y); y += 8;

  const cols = [
    { text: "PLACA", x: 14, w: 25 },
    { text: "MODELO/COR", x: 42, w: 30 },
    { text: "MOTORISTA", x: 75, w: 30 },
    { text: "MORADOR", x: 108, w: 30 },
    { text: "BLOCO/APTO", x: 141, w: 22 },
    { text: "PERIODO", x: 166, w: 35 },
    { text: "STATUS", x: 204, w: 20 },
    { text: "DATA", x: 227, w: 45 },
  ];
  y = addTableRow(doc, cols, y, true);

  items.forEach((v) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: v.placa || "", x: 14, w: 25 },
      { text: `${v.modelo || ""} ${v.cor || ""}`.trim(), x: 42, w: 30 },
      { text: v.motorista_nome || "", x: 75, w: 30 },
      { text: v.morador_name || "", x: 108, w: 30 },
      { text: `${v.bloco || ""} / ${v.apartamento || ""}`, x: 141, w: 22 },
      { text: `${v.data_inicio || ""} a ${v.data_fim || ""}`, x: 166, w: 35 },
      { text: v.status || "", x: 204, w: 20 },
      { text: formatDate(v.created_at), x: 227, w: 45 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });

  doc.save(`relatorio-veiculos-${dateFrom}-a-${dateTo}.pdf`);
}

export function gerarRelatorioPreAuths(items: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();
  let y = addReportHeader(doc, "Relatorio - Autorizacoes Previas", dateFrom, dateTo, condominioName);

  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${items.length}`, 14, y); y += 8;

  const cols = [
    { text: "VISITANTE", x: 14, w: 35 },
    { text: "DOCUMENTO", x: 52, w: 30 },
    { text: "MORADOR", x: 85, w: 30 },
    { text: "BLOCO/APTO", x: 118, w: 22 },
    { text: "TIPO", x: 143, w: 20 },
    { text: "PERIODO", x: 166, w: 35 },
    { text: "STATUS", x: 204, w: 20 },
    { text: "DATA", x: 227, w: 45 },
  ];
  y = addTableRow(doc, cols, y, true);

  items.forEach((a) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: a.visitante_nome || "", x: 14, w: 35 },
      { text: a.visitante_documento || "", x: 52, w: 30 },
      { text: a.morador_name || "", x: 85, w: 30 },
      { text: `${a.bloco || ""} / ${a.apartamento || ""}`, x: 118, w: 22 },
      { text: a.tipo || "", x: 143, w: 20 },
      { text: `${a.data_inicio || ""} a ${a.data_fim || ""}`, x: 166, w: 35 },
      { text: a.status || "", x: 204, w: 20 },
      { text: formatDate(a.created_at), x: 227, w: 45 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });

  doc.save(`relatorio-autorizacoes-previas-${dateFrom}-a-${dateTo}.pdf`);
}

// ─── Helper: draw a horizontal bar chart inside the PDF ─────
function drawBarChart(
  doc: jsPDF,
  title: string,
  data: { label: string; value: number }[],
  x: number,
  y: number,
  chartW: number,
  barH: number = 6,
  barGap: number = 3,
  color: [number, number, number] = [34, 197, 94],
): number {
  if (!data.length) return y;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(sanitize(title), x, y);
  y += 6;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const labelW = 55;
  const barAreaW = chartW - labelW - 30;

  data.forEach((d) => {
    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const lbl = sanitize(d.label).substring(0, 25);
    doc.text(lbl, x, y + barH * 0.65);

    // Bar
    const bw = Math.max((d.value / maxVal) * barAreaW, 2);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x + labelW, y, bw, barH, 1, 1, "F");

    // Value
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(String(d.value), x + labelW + bw + 3, y + barH * 0.65);

    y += barH + barGap;
  });

  return y + 4;
}

// ─── Helper: group items by a key and count ─────────────
function groupAndCount(items: any[], keyFn: (item: any) => string): { label: string; value: number }[] {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = keyFn(item) || "(vazio)";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function groupByDay(items: any[]): { label: string; value: number }[] {
  const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  items.forEach((item) => {
    const d = new Date(item.created_at);
    if (!isNaN(d.getTime())) counts[d.getDay()]++;
  });
  return DIAS.map((label, i) => ({ label, value: counts[i] }));
}

function groupByHour(items: any[]): { label: string; value: number }[] {
  const counts: number[] = Array(24).fill(0);
  items.forEach((item) => {
    const d = new Date(item.created_at);
    if (!isNaN(d.getTime())) counts[d.getHours()]++;
  });
  return counts
    .map((value, i) => ({ label: `${String(i).padStart(2, "0")}:00`, value }))
    .filter((d) => d.value > 0);
}

// Helper: draw summary boxes row
function drawSummaryBoxes(doc: jsPDF, boxes: { label: string; value: string; color: [number, number, number] }[], y: number): number {
  const boxW = Math.min(60, (doc.internal.pageSize.getWidth() - 28 - (boxes.length - 1) * 8) / boxes.length);
  boxes.forEach((b, i) => {
    const bx = 14 + i * (boxW + 8);
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.roundedRect(bx, y, boxW, 18, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(sanitize(b.value), bx + boxW / 2, y + 8, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(b.label), bx + boxW / 2, y + 14, { align: "center" });
  });
  doc.setTextColor(0, 0, 0);
  return y + 26;
}

// ═══════════ CHART-ENHANCED REPORT GENERATORS ═══════════

export function gerarRelatorioVisitantesComGraficos(items: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();

  // ── Page 1: Charts ──
  let y = addReportHeader(doc, "Relatorio de Visitantes - Graficos", dateFrom, dateTo, condominioName);

  const statusCount = groupAndCount(items, (v) => v.status || "pendente");
  const byBloco = groupAndCount(items, (v) => v.bloco ? `Bloco ${v.bloco}` : "(sem bloco)");
  const byDay = groupByDay(items);
  const byHour = groupByHour(items);
  const autorizados = items.filter((v) => v.status === "autorizado" || v.status === "dentro").length;

  y = drawSummaryBoxes(doc, [
    { label: "Total Visitantes", value: String(items.length), color: [99, 102, 241] },
    { label: "Autorizados", value: String(autorizados), color: [22, 163, 74] },
    { label: "Blocos Distintos", value: String(byBloco.length), color: [37, 99, 235] },
    { label: "Dias c/ Registro", value: String(new Set(items.map((v) => v.created_at?.split("T")[0])).size), color: [217, 119, 6] },
  ], y);

  const halfW = (w - 28) / 2;
  const chartY = y;
  y = drawBarChart(doc, "Por Status", statusCount.slice(0, 8), 14, chartY, halfW, 6, 3, [99, 102, 241]);
  let y2 = drawBarChart(doc, "Por Bloco", byBloco.slice(0, 8), 14 + halfW + 14, chartY, halfW, 6, 3, [22, 163, 74]);
  y = Math.max(y, y2) + 2;
  y = checkPage(doc, y, 50);
  const chartY2 = y;
  y = drawBarChart(doc, "Por Dia da Semana", byDay, 14, chartY2, halfW, 6, 3, [217, 119, 6]);
  y2 = drawBarChart(doc, "Por Hora do Dia", byHour.slice(0, 12), 14 + halfW + 14, chartY2, halfW, 5, 2, [139, 92, 246]);
  y = Math.max(y, y2);

  // ── Page 2: Table ──
  doc.addPage();
  y = addReportHeader(doc, "Relatorio de Visitantes - Detalhado", dateFrom, dateTo, condominioName);
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${items.length}`, 14, y); y += 8;

  const cols = [
    { text: "NOME", x: 14, w: 45 },
    { text: "DOCUMENTO", x: 62, w: 30 },
    { text: "TELEFONE", x: 95, w: 30 },
    { text: "BLOCO/APTO", x: 128, w: 25 },
    { text: "AUTORIZOU", x: 156, w: 30 },
    { text: "STATUS", x: 189, w: 20 },
    { text: "DATA", x: 212, w: 50 },
  ];
  y = addTableRow(doc, cols, y, true);
  items.forEach((v) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: v.nome || "", x: 14, w: 45 },
      { text: v.documento || "", x: 62, w: 30 },
      { text: v.telefone || "", x: 95, w: 30 },
      { text: `${v.bloco || ""} / ${v.apartamento || ""}`, x: 128, w: 25 },
      { text: v.quem_autorizou || "", x: 156, w: 30 },
      { text: v.status || "", x: 189, w: 20 },
      { text: formatDate(v.created_at), x: 212, w: 50 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });

  doc.save(`relatorio-visitantes-graficos-${dateFrom}-a-${dateTo}.pdf`);
}

export function gerarRelatorioPreAuthsComGraficos(items: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();

  let y = addReportHeader(doc, "Relatorio de Autorizacoes Previas - Graficos", dateFrom, dateTo, condominioName);

  const byStatus = groupAndCount(items, (a) => a.status || "pendente");
  const byTipo = groupAndCount(items, (a) => a.tipo || "unica");
  const byBloco = groupAndCount(items, (a) => a.bloco ? `Bloco ${a.bloco}` : "(sem bloco)");
  const byDay = groupByDay(items);
  const ativas = items.filter((a) => a.status === "ativa" || a.status === "pendente").length;

  y = drawSummaryBoxes(doc, [
    { label: "Total Autorizacoes", value: String(items.length), color: [99, 102, 241] },
    { label: "Ativas/Pendentes", value: String(ativas), color: [22, 163, 74] },
    { label: "Tipos Distintos", value: String(byTipo.length), color: [37, 99, 235] },
    { label: "Blocos", value: String(byBloco.length), color: [217, 119, 6] },
  ], y);

  const halfW = (w - 28) / 2;
  const chartY = y;
  y = drawBarChart(doc, "Por Status", byStatus.slice(0, 8), 14, chartY, halfW, 6, 3, [99, 102, 241]);
  let y2 = drawBarChart(doc, "Por Tipo", byTipo.slice(0, 8), 14 + halfW + 14, chartY, halfW, 6, 3, [22, 163, 74]);
  y = Math.max(y, y2) + 2;
  y = checkPage(doc, y, 40);
  const chartY2 = y;
  y = drawBarChart(doc, "Por Bloco", byBloco.slice(0, 10), 14, chartY2, halfW, 6, 3, [217, 119, 6]);
  y2 = drawBarChart(doc, "Por Dia da Semana", byDay, 14 + halfW + 14, chartY2, halfW, 6, 3, [139, 92, 246]);
  y = Math.max(y, y2);

  // ── Page 2: Table ──
  doc.addPage();
  y = addReportHeader(doc, "Relatorio de Autorizacoes Previas - Detalhado", dateFrom, dateTo, condominioName);
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${items.length}`, 14, y); y += 8;
  const cols = [
    { text: "VISITANTE", x: 14, w: 35 },
    { text: "DOCUMENTO", x: 52, w: 30 },
    { text: "MORADOR", x: 85, w: 30 },
    { text: "BLOCO/APTO", x: 118, w: 22 },
    { text: "TIPO", x: 143, w: 20 },
    { text: "PERIODO", x: 166, w: 35 },
    { text: "STATUS", x: 204, w: 20 },
    { text: "DATA", x: 227, w: 45 },
  ];
  y = addTableRow(doc, cols, y, true);
  items.forEach((a) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: a.visitante_nome || "", x: 14, w: 35 },
      { text: a.visitante_documento || "", x: 52, w: 30 },
      { text: a.morador_name || "", x: 85, w: 30 },
      { text: `${a.bloco || ""} / ${a.apartamento || ""}`, x: 118, w: 22 },
      { text: a.tipo || "", x: 143, w: 20 },
      { text: `${a.data_inicio || ""} a ${a.data_fim || ""}`, x: 166, w: 35 },
      { text: a.status || "", x: 204, w: 20 },
      { text: formatDate(a.created_at), x: 227, w: 45 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });
  doc.save(`relatorio-autorizacoes-graficos-${dateFrom}-a-${dateTo}.pdf`);
}

export function gerarRelatorioDeliveryComGraficos(items: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();

  let y = addReportHeader(doc, "Relatorio de Deliveries - Graficos", dateFrom, dateTo, condominioName);

  const SERVICOS: Record<string, string> = {
    ifood: "iFood", rappi: "Rappi", uber_eats: "Uber Eats",
    "99food": "99 Food", loggi: "Loggi", outro: "Outro",
  };
  const byServico = groupAndCount(items, (d) => SERVICOS[d.servico] || d.servico_custom || d.servico || "Outro");
  const byStatus = groupAndCount(items, (d) => d.status === "recebido" ? "Recebido" : "Pendente");
  const byBloco = groupAndCount(items, (d) => d.bloco ? `Bloco ${d.bloco}` : "(sem bloco)");
  const byDay = groupByDay(items);
  const byHour = groupByHour(items);
  const recebidos = items.filter((d) => d.status === "recebido").length;

  y = drawSummaryBoxes(doc, [
    { label: "Total Deliveries", value: String(items.length), color: [99, 102, 241] },
    { label: "Recebidos", value: String(recebidos), color: [22, 163, 74] },
    { label: "Pendentes", value: String(items.length - recebidos), color: [217, 119, 6] },
    { label: "Servicos", value: String(byServico.length), color: [139, 92, 246] },
  ], y);

  const halfW = (w - 28) / 2;
  const chartY = y;
  y = drawBarChart(doc, "Por Servico", byServico.slice(0, 8), 14, chartY, halfW, 6, 3, [99, 102, 241]);
  let y2 = drawBarChart(doc, "Por Bloco", byBloco.slice(0, 8), 14 + halfW + 14, chartY, halfW, 6, 3, [22, 163, 74]);
  y = Math.max(y, y2) + 2;
  y = checkPage(doc, y, 50);
  const chartY2 = y;
  y = drawBarChart(doc, "Por Dia da Semana", byDay, 14, chartY2, halfW, 6, 3, [217, 119, 6]);
  y2 = drawBarChart(doc, "Por Hora do Dia", byHour.slice(0, 12), 14 + halfW + 14, chartY2, halfW, 5, 2, [139, 92, 246]);
  y = Math.max(y, y2);

  // ── Page 2: Table ──
  doc.addPage();
  y = addReportHeader(doc, "Relatorio de Deliveries - Detalhado", dateFrom, dateTo, condominioName);
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${items.length}`, 14, y); y += 8;
  const cols = [
    { text: "MORADOR", x: 14, w: 40 },
    { text: "BLOCO/APTO", x: 57, w: 25 },
    { text: "SERVICO", x: 85, w: 25 },
    { text: "N. PEDIDO", x: 113, w: 30 },
    { text: "OBS", x: 146, w: 40 },
    { text: "STATUS", x: 189, w: 20 },
    { text: "DATA", x: 212, w: 50 },
  ];
  y = addTableRow(doc, cols, y, true);
  items.forEach((d) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: d.morador_name || "", x: 14, w: 40 },
      { text: `${d.bloco || ""} / ${d.apartamento || ""}`, x: 57, w: 25 },
      { text: SERVICOS[d.servico] || d.servico_custom || d.servico, x: 85, w: 25 },
      { text: d.numero_pedido || "", x: 113, w: 30 },
      { text: d.observacao || "", x: 146, w: 40 },
      { text: d.status === "recebido" ? "Recebido" : "Pendente", x: 189, w: 20 },
      { text: formatDate(d.created_at), x: 212, w: 50 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });
  doc.save(`relatorio-deliveries-graficos-${dateFrom}-a-${dateTo}.pdf`);
}

export function gerarRelatorioVeiculosComGraficos(items: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();

  let y = addReportHeader(doc, "Relatorio de Veiculos - Graficos", dateFrom, dateTo, condominioName);

  const byStatus = groupAndCount(items, (v) => v.status || "pendente");
  const byBloco = groupAndCount(items, (v) => v.bloco ? `Bloco ${v.bloco}` : "(sem bloco)");
  const byDay = groupByDay(items);
  const byHour = groupByHour(items);
  const ativos = items.filter((v) => v.status === "ativo" || v.status === "autorizado" || v.status === "dentro").length;

  y = drawSummaryBoxes(doc, [
    { label: "Total Veiculos", value: String(items.length), color: [99, 102, 241] },
    { label: "Ativos", value: String(ativos), color: [22, 163, 74] },
    { label: "Blocos", value: String(byBloco.length), color: [37, 99, 235] },
    { label: "Dias c/ Registro", value: String(new Set(items.map((v) => v.created_at?.split("T")[0])).size), color: [217, 119, 6] },
  ], y);

  const halfW = (w - 28) / 2;
  const chartY = y;
  y = drawBarChart(doc, "Por Status", byStatus.slice(0, 8), 14, chartY, halfW, 6, 3, [99, 102, 241]);
  let y2 = drawBarChart(doc, "Por Bloco", byBloco.slice(0, 8), 14 + halfW + 14, chartY, halfW, 6, 3, [22, 163, 74]);
  y = Math.max(y, y2) + 2;
  y = checkPage(doc, y, 50);
  const chartY2 = y;
  y = drawBarChart(doc, "Por Dia da Semana", byDay, 14, chartY2, halfW, 6, 3, [217, 119, 6]);
  y2 = drawBarChart(doc, "Por Hora do Dia", byHour.slice(0, 12), 14 + halfW + 14, chartY2, halfW, 5, 2, [139, 92, 246]);
  y = Math.max(y, y2);

  // ── Page 2: Table ──
  doc.addPage();
  y = addReportHeader(doc, "Relatorio de Veiculos - Detalhado", dateFrom, dateTo, condominioName);
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${items.length}`, 14, y); y += 8;
  const cols = [
    { text: "PLACA", x: 14, w: 25 },
    { text: "MODELO/COR", x: 42, w: 30 },
    { text: "MOTORISTA", x: 75, w: 30 },
    { text: "MORADOR", x: 108, w: 30 },
    { text: "BLOCO/APTO", x: 141, w: 22 },
    { text: "PERIODO", x: 166, w: 35 },
    { text: "STATUS", x: 204, w: 20 },
    { text: "DATA", x: 227, w: 45 },
  ];
  y = addTableRow(doc, cols, y, true);
  items.forEach((v) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: v.placa || "", x: 14, w: 25 },
      { text: `${v.modelo || ""} ${v.cor || ""}`.trim(), x: 42, w: 30 },
      { text: v.motorista_nome || "", x: 75, w: 30 },
      { text: v.morador_name || "", x: 108, w: 30 },
      { text: `${v.bloco || ""} / ${v.apartamento || ""}`, x: 141, w: 22 },
      { text: `${v.data_inicio || ""} a ${v.data_fim || ""}`, x: 166, w: 35 },
      { text: v.status || "", x: 204, w: 20 },
      { text: formatDate(v.created_at), x: 227, w: 45 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });
  doc.save(`relatorio-veiculos-graficos-${dateFrom}-a-${dateTo}.pdf`);
}

export function gerarRelatorioCorrespondenciasComGraficos(items: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();

  let y = addReportHeader(doc, "Relatorio de Correspondencias - Graficos", dateFrom, dateTo, condominioName);

  const byTipo = groupAndCount(items, (c) => c.tipo || "carta");
  const byStatus = groupAndCount(items, (c) => c.status === "retirado" ? "Retirado" : "Pendente");
  const byBloco = groupAndCount(items, (c) => c.bloco ? `Bloco ${c.bloco}` : "(sem bloco)");
  const byDay = groupByDay(items);
  const byHour = groupByHour(items);
  const retirados = items.filter((c) => c.status === "retirado").length;

  y = drawSummaryBoxes(doc, [
    { label: "Total", value: String(items.length), color: [99, 102, 241] },
    { label: "Retiradas", value: String(retirados), color: [22, 163, 74] },
    { label: "Pendentes", value: String(items.length - retirados), color: [217, 119, 6] },
    { label: "Tipos", value: String(byTipo.length), color: [139, 92, 246] },
  ], y);

  const halfW = (w - 28) / 2;
  const chartY = y;
  y = drawBarChart(doc, "Por Tipo", byTipo.slice(0, 8), 14, chartY, halfW, 6, 3, [99, 102, 241]);
  let y2 = drawBarChart(doc, "Por Bloco", byBloco.slice(0, 8), 14 + halfW + 14, chartY, halfW, 6, 3, [22, 163, 74]);
  y = Math.max(y, y2) + 2;
  y = checkPage(doc, y, 50);
  const chartY2 = y;
  y = drawBarChart(doc, "Por Dia da Semana", byDay, 14, chartY2, halfW, 6, 3, [217, 119, 6]);
  y2 = drawBarChart(doc, "Por Hora do Dia", byHour.slice(0, 12), 14 + halfW + 14, chartY2, halfW, 5, 2, [139, 92, 246]);
  y = Math.max(y, y2);

  // ── Page 2: Table ──
  doc.addPage();
  y = addReportHeader(doc, "Relatorio de Correspondencias - Detalhado", dateFrom, dateTo, condominioName);
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total: ${items.length}`, 14, y); y += 8;
  const cols = [
    { text: "PROTOCOLO", x: 14, w: 35 },
    { text: "MORADOR", x: 52, w: 40 },
    { text: "BLOCO/APTO", x: 95, w: 25 },
    { text: "TIPO", x: 123, w: 25 },
    { text: "REMETENTE", x: 151, w: 35 },
    { text: "STATUS", x: 189, w: 20 },
    { text: "DATA", x: 212, w: 50 },
  ];
  y = addTableRow(doc, cols, y, true);
  items.forEach((c) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: c.protocolo || "", x: 14, w: 35 },
      { text: c.morador_name || "", x: 52, w: 40 },
      { text: `${c.bloco || ""} / ${c.apartamento || ""}`, x: 95, w: 25 },
      { text: c.tipo || "", x: 123, w: 25 },
      { text: c.remetente || "", x: 151, w: 35 },
      { text: c.status === "retirado" ? "Retirado" : "Pendente", x: 189, w: 20 },
      { text: formatDate(c.created_at), x: 212, w: 50 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });
  doc.save(`relatorio-correspondencias-graficos-${dateFrom}-a-${dateTo}.pdf`);
}

export function gerarRelatorioLivroProtocoloComGraficos(entries: any[], dateFrom: string, dateTo: string, condominioName?: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();

  let y = addReportHeader(doc, "Relatorio Livro de Protocolo - Graficos", dateFrom, dateTo, condominioName);

  const tipoLabels: Record<string, string> = { encomenda: "Encomenda", entrega: "Entrega", retirada: "Retirada" };
  const byTipo = groupAndCount(entries, (e) => tipoLabels[e.tipo] || e.tipo || "Outro");
  const byDay = groupByDay(entries);
  const byHour = groupByHour(entries);
  const comAssinatura = entries.filter((e) => e.assinatura).length;

  y = drawSummaryBoxes(doc, [
    { label: "Total Registros", value: String(entries.length), color: [99, 102, 241] },
    { label: "Encomendas", value: String(entries.filter((e) => e.tipo === "encomenda").length), color: [22, 163, 74] },
    { label: "Entregas", value: String(entries.filter((e) => e.tipo === "entrega").length), color: [37, 99, 235] },
    { label: "Com Assinatura", value: String(comAssinatura), color: [217, 119, 6] },
  ], y);

  const halfW = (w - 28) / 2;
  const chartY = y;
  y = drawBarChart(doc, "Por Tipo", byTipo.slice(0, 8), 14, chartY, halfW, 6, 3, [99, 102, 241]);
  let y2 = drawBarChart(doc, "Por Dia da Semana", byDay, 14 + halfW + 14, chartY, halfW, 6, 3, [22, 163, 74]);
  y = Math.max(y, y2) + 2;
  y = checkPage(doc, y, 40);
  y = drawBarChart(doc, "Por Hora do Dia", byHour.slice(0, 12), 14, y, halfW, 5, 2, [217, 119, 6]);

  // ── Page 2: Table ──
  doc.addPage();
  y = addReportHeader(doc, "Livro de Protocolo - Detalhado", dateFrom, dateTo, condominioName);
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text(`Total de registros: ${entries.length}`, 14, y); y += 8;
  const cols = [
    { text: "PROTOCOLO", x: 14, w: 35 },
    { text: "TIPO", x: 52, w: 30 },
    { text: "DETALHES", x: 85, w: 60 },
    { text: "PORTEIRO", x: 148, w: 40 },
    { text: "ASSINATURA", x: 191, w: 25 },
    { text: "DATA/HORA", x: 219, w: 50 },
  ];
  y = addTableRow(doc, cols, y, true);
  entries.forEach((e) => {
    y = checkPage(doc, y, 10);
    let detail = "";
    if (e.tipo === "encomenda") detail = `De: ${e.deixada_por || ""} Para: ${e.para || ""}`;
    else if (e.tipo === "entrega") detail = `${e.o_que_e || ""} -> ${e.entregue_para || ""}`;
    else detail = `Por: ${e.retirada_por || ""}`;
    const row = [
      { text: e.protocolo || "", x: 14, w: 35 },
      { text: tipoLabels[e.tipo] || e.tipo, x: 52, w: 30 },
      { text: detail, x: 85, w: 60 },
      { text: e.porteiro_entregou || e.porteiro || "", x: 148, w: 40 },
      { text: e.assinatura ? "Sim" : "Nao", x: 191, w: 25 },
      { text: formatDate(e.created_at), x: 219, w: 50 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240); doc.line(14, y - 3, w - 14, y - 3);
  });
  doc.save(`relatorio-livro-protocolo-graficos-${dateFrom}-a-${dateTo}.pdf`);
}

// ─── Relatorio de Rondas (with charts) ──────────────────
export function gerarRelatorioRondas(
  registros: any[],
  stats: {
    total: number;
    byCheckpoint: { checkpoint_nome: string; total: number }[];
    byFuncionario: { funcionario_nome: string; total: number }[];
    byHour: { hora: number; total: number }[];
    byDay: { dia: number; total: number }[];
    totalCheckpoints: number;
    checkpointsCobertos: number;
  },
  dateFrom: string,
  dateTo: string,
  condominioName?: string,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();
  let y: number;

  // ── Page 1: Summary + Charts ──
  // Custom green header
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, w, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize("Relatorio de Rondas"), 14, 12);
  if (condominioName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(condominioName), 14, 20);
  }
  doc.setFontSize(9);
  doc.text(`Periodo: ${dateFrom} a ${dateTo}`, 14, 27);
  doc.text("Gerado em: " + formatDate(new Date().toISOString()), w - 14, 27, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y = 40;

  // Summary boxes
  const boxW = 55;
  const boxes = [
    { label: "Total de Registros", value: String(stats.total), color: [22, 163, 74] as [number, number, number] },
    { label: "Checkpoints Ativos", value: String(stats.totalCheckpoints), color: [37, 99, 235] as [number, number, number] },
    { label: "Checkpoints Cobertos", value: String(stats.checkpointsCobertos), color: [217, 119, 6] as [number, number, number] },
    { label: "Taxa de Cobertura", value: stats.totalCheckpoints > 0 ? Math.round((stats.checkpointsCobertos / stats.totalCheckpoints) * 100) + "%" : "0%", color: [139, 92, 246] as [number, number, number] },
  ];
  boxes.forEach((b, i) => {
    const bx = 14 + i * (boxW + 8);
    doc.setFillColor(b.color[0], b.color[1], b.color[2]);
    doc.roundedRect(bx, y, boxW, 18, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(b.value, bx + boxW / 2, y + 8, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(b.label), bx + boxW / 2, y + 14, { align: "center" });
  });
  doc.setTextColor(0, 0, 0);
  y += 28;

  // Chart: by checkpoint
  const halfW = (w - 28) / 2;
  const chartY = y;
  y = drawBarChart(doc, "Registros por Checkpoint", stats.byCheckpoint.map((c) => ({ label: c.checkpoint_nome, value: c.total })), 14, chartY, halfW, 6, 3, [22, 163, 74]);

  // Chart: by funcionario (right side)
  let y2 = drawBarChart(doc, "Registros por Funcionario", stats.byFuncionario.map((f) => ({ label: f.funcionario_nome, value: f.total })), 14 + halfW + 14, chartY, halfW, 6, 3, [37, 99, 235]);

  y = Math.max(y, y2) + 4;
  y = checkPage(doc, y, 50);

  // Chart: by hour of day
  const DIAS_SEMANA_LABEL = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
  y = drawBarChart(
    doc,
    "Registros por Hora do Dia",
    stats.byHour.map((h) => ({ label: `${String(h.hora).padStart(2, "0")}:00`, value: h.total })),
    14, y, halfW, 5, 2, [217, 119, 6],
  );

  // Chart: by day of week (right side, same row)
  const dayY = y - (stats.byHour.length * 7 + 10); // align if possible
  drawBarChart(
    doc,
    "Registros por Dia da Semana",
    stats.byDay.map((d) => ({ label: DIAS_SEMANA_LABEL[d.dia] || `Dia ${d.dia}`, value: d.total })),
    14 + halfW + 14, Math.max(dayY, chartY + (Math.max(stats.byCheckpoint.length, stats.byFuncionario.length) * 9) + 12), halfW, 6, 3, [139, 92, 246],
  );

  // ── Page 2: Detailed Table ──
  doc.addPage();
  y = addReportHeader(doc, "Relatorio de Rondas - Detalhado", dateFrom, dateTo, condominioName);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Total de registros: ${registros.length}`, 14, y);
  y += 8;

  const cols = [
    { text: "CHECKPOINT", x: 14, w: 50 },
    { text: "FUNCIONARIO", x: 67, w: 40 },
    { text: "LOCALIZACAO", x: 110, w: 40 },
    { text: "OBSERVACAO", x: 153, w: 50 },
    { text: "DATA/HORA", x: 206, w: 55 },
  ];
  y = addTableRow(doc, cols, y, true);

  registros.forEach((r) => {
    y = checkPage(doc, y, 10);
    const row = [
      { text: r.checkpoint_nome || "", x: 14, w: 50 },
      { text: r.funcionario_nome || "", x: 67, w: 40 },
      { text: r.localizacao || "", x: 110, w: 40 },
      { text: r.observacao || "", x: 153, w: 50 },
      { text: formatDate(r.created_at), x: 206, w: 55 },
    ];
    y = addTableRow(doc, row, y);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y - 3, w - 14, y - 3);
  });

  doc.save(`relatorio-rondas-${dateFrom}-a-${dateTo}.pdf`);
}
