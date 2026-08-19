/* =========================================================
   ESTADO / PERSISTÊNCIA
========================================================= */
const STORAGE_KEY = "caderno-estudos:v1";

const COLOR_OPTIONS = ["#E9C25E","#4F9A6E","#C85A42","#5B84B1","#8C6FB0","#3D9A9A","#B27C3D","#6E7B4A"];

function uid(){ return Math.random().toString(36).slice(2, 10); }

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.warn("Não foi possível carregar dados salvos:", e); }
  return { disciplinas: [], activeSubjectId: null, activeTab: "questoes", respostas: {} };
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

function getActiveSubject(){
  return state.disciplinas.find(d => d.id === state.activeSubjectId) || null;
}

/* =========================================================
   ELEMENTOS
========================================================= */
const el = {
  tabList: document.getElementById("tabList"),
  viewEmpty: document.getElementById("view-empty"),
  viewSubject: document.getElementById("view-subject"),
  subjectName: document.getElementById("subjectName"),
  subjectEyebrow: document.getElementById("subjectEyebrow"),
  statQuestoes: document.getElementById("statQuestoes"),
  statAcerto: document.getElementById("statAcerto"),
  btnDeleteSubject: document.getElementById("btnDeleteSubject"),

  stripTabs: document.querySelectorAll(".strip-tab"),
  panelQuestoes: document.getElementById("panel-questoes"),
  panelConteudo: document.getElementById("panel-conteudo"),
  panelCadastrar: document.getElementById("panel-cadastrar"),

  filtroTipo: document.getElementById("filtroTipo"),
  btnResetQuiz: document.getElementById("btnResetQuiz"),
  questionList: document.getElementById("questionList"),
  questoesEmptyHint: document.getElementById("questoesEmptyHint"),

  noteForm: document.getElementById("noteForm"),
  noteTitulo: document.getElementById("noteTitulo"),
  noteTexto: document.getElementById("noteTexto"),
  noteList: document.getElementById("noteList"),
  notesEmptyHint: document.getElementById("notesEmptyHint"),
  noteImagesInput: document.getElementById("noteImagesInput"),
  imagePreviewList: document.getElementById("imagePreviewList"),

  lightboxBackdrop: document.getElementById("lightboxBackdrop"),
  lightboxImg: document.getElementById("lightboxImg"),
  lightboxClose: document.getElementById("lightboxClose"),

  questionForm: document.getElementById("questionForm"),
  tipoQuestaoSeg: document.getElementById("tipoQuestaoSeg"),
  qEnunciado: document.getElementById("qEnunciado"),
  alternativasWrap: document.getElementById("alternativasWrap"),
  altList: document.getElementById("altList"),
  btnAddAlt: document.getElementById("btnAddAlt"),
  certoErradoWrap: document.getElementById("certoErradoWrap"),
  ceSeg: document.getElementById("ceSeg"),
  qExplicacao: document.getElementById("qExplicacao"),
  questionFormError: document.getElementById("questionFormError"),

  modalBackdrop: document.getElementById("modalBackdrop"),
  subjectForm: document.getElementById("subjectForm"),
  subjectNameInput: document.getElementById("subjectNameInput"),
  colorPicker: document.getElementById("colorPicker"),
  btnCancelSubject: document.getElementById("btnCancelSubject"),
  btnNewSubject: document.getElementById("btnNewSubject"),
  btnNewSubjectEmpty: document.getElementById("btnNewSubjectEmpty"),
};

let filtroAtivo = "todas";
let novoTipoQuestao = "objetiva";
let novaRespostaCE = "certo";
let corSelecionada = COLOR_OPTIONS[0];

/* =========================================================
   RENDER: SIDEBAR (abas das disciplinas)
========================================================= */
function renderTabs(){
  el.tabList.innerHTML = "";
  state.disciplinas.forEach(d => {
    const btn = document.createElement("button");
    btn.className = "tab" + (d.id === state.activeSubjectId ? " is-active" : "");
    btn.innerHTML = `<span class="swatch" style="background:${d.cor}"></span><span>${escapeHtml(d.nome)}</span>`;
    btn.addEventListener("click", () => {
      state.activeSubjectId = d.id;
      state.activeTab = "questoes";
      saveState();
      renderAll();
    });
    el.tabList.appendChild(btn);
  });
}

/* =========================================================
   RENDER: VIEW SWITCH
========================================================= */
function renderAll(){
  renderTabs();
  const subject = getActiveSubject();

  if(!subject){
    el.viewEmpty.hidden = false;
    el.viewSubject.hidden = true;
    return;
  }
  el.viewEmpty.hidden = true;
  el.viewSubject.hidden = false;

  el.subjectName.textContent = subject.nome;
  el.subjectEyebrow.textContent = "disciplina";
  el.statQuestoes.textContent = `${subject.questoes.length} questão${subject.questoes.length===1?"":"es"}`;

  const respondidas = subject.questoes.filter(q => state.respostas[q.id] !== undefined);
  const corretas = respondidas.filter(q => isRespostaCorreta(q, state.respostas[q.id]));
  el.statAcerto.textContent = respondidas.length
    ? `${Math.round(corretas.length / respondidas.length * 100)}% de acerto (${corretas.length}/${respondidas.length})`
    : "sem respostas ainda";

  el.stripTabs.forEach(t => t.classList.toggle("is-active", t.dataset.panel === state.activeTab));
  el.panelQuestoes.hidden = state.activeTab !== "questoes";
  el.panelConteudo.hidden = state.activeTab !== "conteudo";
  el.panelCadastrar.hidden = state.activeTab !== "cadastrar";

  renderQuestions(subject);
  renderNotes(subject);
}

/* =========================================================
   QUESTÕES: lógica de resposta
========================================================= */
function isRespostaCorreta(q, resposta){
  if(q.tipo === "certo_errado") return resposta === q.correta;
  return resposta === q.corretaId;
}

function renderQuestions(subject){
  const lista = subject.questoes.filter(q => filtroAtivo === "todas" || q.tipo === filtroAtivo);
  el.questionList.innerHTML = "";
  el.questoesEmptyHint.hidden = subject.questoes.length > 0;

  if(subject.questoes.length && lista.length === 0){
    const p = document.createElement("p");
    p.className = "hint-empty";
    p.textContent = "Nenhuma questão neste filtro.";
    el.questionList.appendChild(p);
    return;
  }

  lista.forEach((q, idx) => {
    const respondida = state.respostas[q.id];
    const card = document.createElement("div");
    card.className = "q-card";
    card.style.setProperty("--card-color", subject.cor);

    const head = document.createElement("div");
    head.className = "q-head";
    head.innerHTML = `<span class="q-tag">questão ${idx+1} · ${q.tipo === "certo_errado" ? "certo/errado" : "objetiva"}</span>`;
    const del = document.createElement("button");
    del.className = "q-del";
    del.textContent = "excluir";
    del.addEventListener("click", () => {
      subject.questoes = subject.questoes.filter(x => x.id !== q.id);
      delete state.respostas[q.id];
      saveState();
      renderAll();
    });
    head.appendChild(del);
    card.appendChild(head);

    const enun = document.createElement("p");
    enun.className = "q-enunciado";
    enun.textContent = q.enunciado;
    card.appendChild(enun);

    const alts = document.createElement("div");
    alts.className = "q-alts";

    const opcoes = q.tipo === "certo_errado"
      ? [{id:"certo", texto:"Certo"}, {id:"errado", texto:"Errado"}]
      : q.alternativas;

    opcoes.forEach(op => {
      const optBtn = document.createElement("button");
      optBtn.type = "button";
      optBtn.className = "q-alt" + (q.tipo === "certo_errado" ? " ce" : "");
      if(q.tipo !== "certo_errado"){
        const bullet = document.createElement("span");
        bullet.className = "bullet";
        optBtn.appendChild(bullet);
      }
      const txt = document.createElement("span");
      txt.textContent = op.texto;
      optBtn.appendChild(txt);

      if(respondida !== undefined){
        optBtn.classList.add("is-disabled");
        const correctId = q.tipo === "certo_errado" ? q.correta : q.corretaId;
        if(op.id === correctId) optBtn.classList.add("is-correct");
        else if(op.id === respondida) optBtn.classList.add("is-wrong");
      }else{
        optBtn.addEventListener("click", () => {
          state.respostas[q.id] = op.id;
          saveState();
          renderAll();
        });
      }
      alts.appendChild(optBtn);
    });
    card.appendChild(alts);

    if(respondida !== undefined){
      const ok = isRespostaCorreta(q, respondida);
      const fb = document.createElement("div");
      fb.className = "q-feedback " + (ok ? "ok" : "bad");
      fb.innerHTML = `<span class="fb-title">${ok ? "Certa!" : "Errada."}</span>${escapeHtml(q.explicacao || (ok ? "" : "Revise o conteúdo relacionado a esta questão."))}`;
      card.appendChild(fb);
    }

    el.questionList.appendChild(card);
  });
}

/* =========================================================
   CONTEÚDOS (anotações)
========================================================= */
function renderNotes(subject){
  el.noteList.innerHTML = "";
  el.notesEmptyHint.hidden = subject.conteudos.length > 0;

  [...subject.conteudos].sort((a,b) => b.data - a.data).forEach(n => {
    const card = document.createElement("div");
    card.className = "note-card";
    const date = new Date(n.data).toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });
    card.innerHTML = `
      <button class="note-del">excluir</button>
      <h4>${escapeHtml(n.titulo)}</h4>
      <span class="note-date">${date}</span>
      ${n.texto ? `<p>${escapeHtml(n.texto)}</p>` : ""}
    `;
    if(n.imagens && n.imagens.length){
      const grid = document.createElement("div");
      grid.className = "note-images";
      n.imagens.forEach(src => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `Imagem de ${n.titulo}`;
        img.addEventListener("click", () => openLightbox(src));
        grid.appendChild(img);
      });
      card.appendChild(grid);
    }
    card.querySelector(".note-del").addEventListener("click", () => {
      subject.conteudos = subject.conteudos.filter(x => x.id !== n.id);
      saveState();
      renderAll();
    });
    el.noteList.appendChild(card);
  });
}

/* =========================================================
   FORM: cadastrar questão
========================================================= */
function buildAltRows(alternativas){
  el.altList.innerHTML = "";
  alternativas.forEach((a, i) => {
    const row = document.createElement("div");
    row.className = "alt-row";
    row.dataset.id = a.id;
    row.innerHTML = `
      <input type="radio" name="corretaRadio" ${i===0 ? "checked":""} data-id="${a.id}">
      <input type="text" placeholder="Alternativa ${i+1}" value="${escapeAttr(a.texto||"")}">
      <button type="button" class="alt-del" title="remover">×</button>
    `;
    row.querySelector(".alt-del").addEventListener("click", () => {
      const rows = [...el.altList.querySelectorAll(".alt-row")];
      if(rows.length <= 2) return;
      row.remove();
    });
    el.altList.appendChild(row);
  });
}

el.btnAddAlt.addEventListener("click", () => {
  const rows = [...el.altList.querySelectorAll(".alt-row")];
  if(rows.length >= 8) return;
  buildAltRows([
    ...rows.map(r => ({ id:r.dataset.id, texto:r.querySelector('input[type=text]').value })),
    { id: uid(), texto: "" }
  ]);
});

el.tipoQuestaoSeg.addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if(!btn) return;
  novoTipoQuestao = btn.dataset.tipo;
  [...el.tipoQuestaoSeg.children].forEach(b => b.classList.toggle("is-active", b === btn));
  el.alternativasWrap.hidden = novoTipoQuestao !== "objetiva";
  el.certoErradoWrap.hidden = novoTipoQuestao !== "certo_errado";
  clearQuestionFormError();
});

el.ceSeg.addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if(!btn) return;
  novaRespostaCE = btn.dataset.ce;
  [...el.ceSeg.children].forEach(b => b.classList.toggle("is-active", b === btn));
});

function showQuestionFormError(msg){
  el.questionFormError.textContent = msg;
  el.questionFormError.hidden = false;
}
function clearQuestionFormError(){
  el.questionFormError.hidden = true;
  el.questionFormError.textContent = "";
}

el.questionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearQuestionFormError();

  const subject = getActiveSubject();
  if(!subject) return;

  const enunciado = el.qEnunciado.value.trim();
  const explicacao = el.qExplicacao.value.trim();
  if(!enunciado){
    showQuestionFormError("Escreva o enunciado da questão.");
    el.qEnunciado.focus();
    return;
  }

  let novaQuestao;
  if(novoTipoQuestao === "certo_errado"){
    novaQuestao = { id: uid(), tipo:"certo_errado", enunciado, correta: novaRespostaCE, explicacao };
  }else{
    const rows = [...el.altList.querySelectorAll(".alt-row")];
    const alternativas = rows.map(r => ({ id: r.dataset.id, texto: r.querySelector('input[type=text]').value.trim() }))
                              .filter(a => a.texto);
    if(alternativas.length < 2){
      showQuestionFormError("Adicione pelo menos 2 alternativas preenchidas.");
      return;
    }
    const radioChecked = el.altList.querySelector('input[type=radio]:checked');
    const corretaId = radioChecked ? radioChecked.dataset.id : alternativas[0].id;
    novaQuestao = { id: uid(), tipo:"objetiva", enunciado, alternativas, corretaId, explicacao };
  }

  subject.questoes.push(novaQuestao);
  saveState();

  el.questionForm.reset();
  buildAltRows([{id: uid(), texto:""}, {id: uid(), texto:""}]);
  novoTipoQuestao = "objetiva";
  [...el.tipoQuestaoSeg.children].forEach((b,i) => b.classList.toggle("is-active", i===0));
  el.alternativasWrap.hidden = false;
  el.certoErradoWrap.hidden = true;

  state.activeTab = "questoes";
  renderAll();
});

/* =========================================================
   IMAGENS: seleção, redimensionamento e preview
========================================================= */
let pendingImages = []; // { id, dataUrl }
const MAX_IMG_WIDTH = 1400;
const JPEG_QUALITY = 0.82;

function resizeImageFile(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMG_WIDTH / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews(){
  el.imagePreviewList.innerHTML = "";
  pendingImages.forEach(img => {
    const wrap = document.createElement("div");
    wrap.className = "image-preview";
    wrap.innerHTML = `
      <img src="${img.dataUrl}" alt="Prévia da imagem">
      <button type="button" class="img-remove" title="Remover">×</button>
    `;
    wrap.querySelector(".img-remove").addEventListener("click", () => {
      pendingImages = pendingImages.filter(i => i.id !== img.id);
      renderImagePreviews();
    });
    el.imagePreviewList.appendChild(wrap);
  });
}

el.noteImagesInput.addEventListener("change", async (e) => {
  const files = [...e.target.files];
  el.noteImagesInput.value = ""; // permite selecionar o mesmo arquivo de novo depois

  for(const file of files){
    if(!file.type.startsWith("image/")) continue;
    const placeholderId = uid();
    try{
      const dataUrl = await resizeImageFile(file);
      pendingImages.push({ id: placeholderId, dataUrl });
      renderImagePreviews();
    }catch(err){
      console.warn("Falha ao processar imagem:", err);
    }
  }
});

/* =========================================================
   LIGHTBOX: ver imagem ampliada
========================================================= */
function openLightbox(src){
  el.lightboxImg.src = src;
  el.lightboxBackdrop.hidden = false;
}
function closeLightbox(){
  el.lightboxBackdrop.hidden = true;
  el.lightboxImg.src = "";
}
el.lightboxClose.addEventListener("click", closeLightbox);
el.lightboxBackdrop.addEventListener("click", (e) => {
  if(e.target === el.lightboxBackdrop) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && !el.lightboxBackdrop.hidden) closeLightbox();
});

/* =========================================================
   FORM: nova anotação
========================================================= */
el.noteForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const subject = getActiveSubject();
  if(!subject) return;
  const titulo = el.noteTitulo.value.trim();
  const texto = el.noteTexto.value.trim();
  if(!titulo || (!texto && pendingImages.length === 0)) return;

  subject.conteudos.push({
    id: uid(),
    titulo,
    texto,
    data: Date.now(),
    imagens: pendingImages.map(i => i.dataUrl)
  });

  let salvou = true;
  try{
    saveState();
  }catch(err){
    salvou = false;
    subject.conteudos.pop();
    alert("Não foi possível salvar: o armazenamento do navegador está cheio. Tente usar imagens menores ou remover anotações antigas com muitas imagens.");
  }

  if(salvou){
    el.noteForm.reset();
    pendingImages = [];
    renderImagePreviews();
    renderAll();
  }
});

/* =========================================================
   TABS (strip: questões / conteúdo / cadastrar)
========================================================= */
el.stripTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    state.activeTab = tab.dataset.panel;
    saveState();
    renderAll();
  });
});

/* =========================================================
   FILTRO DE QUESTÕES
========================================================= */
el.filtroTipo.addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if(!btn) return;
  filtroAtivo = btn.dataset.filtro;
  [...el.filtroTipo.children].forEach(b => b.classList.toggle("is-active", b === btn));
  renderQuestions(getActiveSubject());
});

el.btnResetQuiz.addEventListener("click", () => {
  const subject = getActiveSubject();
  if(!subject) return;
  subject.questoes.forEach(q => delete state.respostas[q.id]);
  saveState();
  renderAll();
});

/* =========================================================
   EXCLUIR DISCIPLINA
========================================================= */
el.btnDeleteSubject.addEventListener("click", () => {
  const subject = getActiveSubject();
  if(!subject) return;
  if(!confirm(`Excluir a disciplina "${subject.nome}"? Todas as questões e conteúdos serão perdidos.`)) return;
  state.disciplinas = state.disciplinas.filter(d => d.id !== subject.id);
  state.activeSubjectId = state.disciplinas[0]?.id || null;
  saveState();
  renderAll();
});

/* =========================================================
   MODAL: nova disciplina
========================================================= */
function openModal(){
  corSelecionada = COLOR_OPTIONS[state.disciplinas.length % COLOR_OPTIONS.length];
  el.colorPicker.innerHTML = "";
  COLOR_OPTIONS.forEach(c => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "color-swatch" + (c === corSelecionada ? " is-selected" : "");
    sw.style.background = c;
    sw.addEventListener("click", () => {
      corSelecionada = c;
      [...el.colorPicker.children].forEach(s => s.classList.toggle("is-selected", s === sw));
    });
    el.colorPicker.appendChild(sw);
  });
  el.subjectNameInput.value = "";
  el.modalBackdrop.hidden = false;
  el.subjectNameInput.focus();
}
function closeModal(){ el.modalBackdrop.hidden = true; }

el.btnNewSubject.addEventListener("click", openModal);
el.btnNewSubjectEmpty.addEventListener("click", openModal);
el.btnCancelSubject.addEventListener("click", closeModal);
el.modalBackdrop.addEventListener("click", (e) => { if(e.target === el.modalBackdrop) closeModal(); });

el.subjectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = el.subjectNameInput.value.trim();
  if(!nome) return;
  const nova = { id: uid(), nome, cor: corSelecionada, questoes: [], conteudos: [] };
  state.disciplinas.push(nova);
  state.activeSubjectId = nova.id;
  state.activeTab = "questoes";
  saveState();
  closeModal();
  renderAll();
});

/* =========================================================
   UTIL
========================================================= */
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function escapeAttr(str){ return escapeHtml(str); }

/* =========================================================
   INIT
========================================================= */
buildAltRows([{id: uid(), texto:""}, {id: uid(), texto:""}]);
renderAll();