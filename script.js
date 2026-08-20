// 1. Importações do Firebase SDK via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Sua configuração do Firebase Web
const firebaseConfig = {
  apiKey: "AIzaSyCKYY2TiWe19F2JjTKKiVJFpHUML6ko5YY",
  authDomain: "appestudos-3b07f.firebaseapp.com",
  projectId: "appestudos-3b07f",
  storageBucket: "appestudos-3b07f.firebasestorage.app",
  messagingSenderId: "833188821649",
  appId: "1:833188821649:web:2e950f5e36af643b24dd30",
  measurementId: "G-EJF3QCVS7B"
};

// 3. Inicialização dos serviços
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================================================
   ESTADO / PERSISTÊNCIA NA NUVEM (DOCUMENTOS SEPARADOS)
========================================================= */
const COLOR_OPTIONS = ["#E9C25E","#4F9A6E","#C85A42","#5B84B1","#8C6FB0","#3D9A9A","#B27C3D","#6E7B4A"];

function uid(){ return Math.random().toString(36).slice(2, 10); }

let state = { disciplinas: [], activeSubjectId: null, activeTab: "questoes", respostas: {} };

// Carrega todas as disciplinas e anotações de coleções separadas
async function loadStateFromFirebase() {
  try {
    // 1. Carrega disciplinas
    const discSnap = await getDocs(collection(db, "disciplinas"));
    const disciplinas = [];
    discSnap.forEach(dDoc => {
      disciplinas.push(dDoc.data());
    });
    state.disciplinas = disciplinas;

    // Se houver disciplinas e nenhuma ativa, ativa a primeira
    if (state.disciplinas.length > 0 && !state.activeSubjectId) {
      state.activeSubjectId = state.disciplinas[0].id;
    }

    // 2. Carrega anotações do banco
    const notesSnap = await getDocs(collection(db, "anotacoes"));
    const todasNotas = [];
    notesSnap.forEach(nDoc => todasNotas.push(nDoc.data()));

    // Associa as notas às suas respectivas disciplinas
    state.disciplinas.forEach(d => {
      d.notas = todasNotas.filter(n => n.subjectId === d.id);
      if (!d.questoes) d.questoes = [];
    });

    console.log("Dados carregados com sucesso!");
  } catch (e) {
    console.error("Erro ao carregar dados da nuvem:", e);
  }
  renderAll();
}

// Salva uma disciplina específica
async function saveSubject(subject) {
  try {
    const discData = {
      id: subject.id,
      nome: subject.nome,
      cor: subject.cor,
      questoes: subject.questoes || []
    };
    await setDoc(doc(db, "disciplinas", subject.id), discData);
  } catch (e) {
    console.error("Erro ao salvar disciplina:", e);
  }
}

// Salva uma anotação individual
async function saveNote(note) {
  try {
    await setDoc(doc(db, "anotacoes", note.id), note);
  } catch (e) {
    console.error("Erro ao salvar anotação:", e);
    alert("Erro ao salvar a anotação na nuvem. Ela pode ser grande demais.");
  }
}

// Apaga uma anotação individual
async function deleteNoteFromCloud(noteId) {
  try {
    await deleteDoc(doc(db, "anotacoes", noteId));
  } catch (e) {
    console.error("Erro ao apagar anotação:", e);
  }
}

// Apaga uma disciplina inteira e suas notas
async function deleteSubjectFromCloud(subjectId) {
  try {
    await deleteDoc(doc(db, "disciplinas", subjectId));
    
    // Apaga também as anotações vinculadas
    const q = query(collection(db, "anotacoes"), where("subjectId", "==", subjectId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (dDoc) => {
      await deleteDoc(doc(db, "anotacoes", dDoc.id));
    });
  } catch (e) {
    console.error("Erro ao excluir disciplina:", e);
  }
}

loadStateFromFirebase();

function getActiveSubject(){
  return state.disciplinas.find(d => d.id === state.activeSubjectId) || null;
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "'");
}

/* =========================================================
   ELEMENTOS DA TELA
========================================================= */
const el = {
  searchSubject: document.getElementById("searchSubject"),
  searchQuestao: document.getElementById("searchQuestao"),
  searchConteudo: document.getElementById("searchConteudo"),
  
  tabList: document.getElementById("tabList"),
  viewEmpty: document.getElementById("view-empty"),
  viewSubject: document.getElementById("view-subject"),
  subjectName: document.getElementById("subjectName"),
  subjectEyebrow: document.getElementById("subjectEyebrow"),
  statQuestoes: document.getElementById("statQuestoes"),
  statAcerto: document.getElementById("statAcerto"),
  btnTimer: document.getElementById("btnTimer"),
  btnDeleteSubject: document.getElementById("btnDeleteSubject"),
  btnEditSubject: document.getElementById("btnEditSubject"),

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
   RENDER: SIDEBAR
========================================================= */
function renderTabs(){
  if (!el.tabList) return;
  el.tabList.innerHTML = "";
  
  const termoPesquisa = el.searchSubject ? el.searchSubject.value.toLowerCase() : "";

  const disciplinasFiltradas = state.disciplinas.filter(d => 
    d.nome.toLowerCase().includes(termoPesquisa)
  );

  disciplinasFiltradas.forEach(d => {
    const btn = document.createElement("button");
    btn.className = "tab" + (d.id === state.activeSubjectId ? " is-active" : "");
    btn.innerHTML = `<span class="swatch" style="background:${d.cor}"></span><span>${escapeHtml(d.nome)}</span>`;
    btn.addEventListener("click", () => {
      state.activeSubjectId = d.id;
      state.activeTab = "questoes";
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
    if (el.viewEmpty) el.viewEmpty.hidden = false;
    if (el.viewSubject) el.viewSubject.hidden = true;
    return;
  }
  if (el.viewEmpty) el.viewEmpty.hidden = true;
  if (el.viewSubject) el.viewSubject.hidden = false;

  if (el.subjectName) el.subjectName.textContent = subject.nome;
  if (el.subjectEyebrow) el.subjectEyebrow.textContent = "disciplina";
  
  if (el.statQuestoes) {
    const qCount = subject.questoes ? subject.questoes.length : 0;
    el.statQuestoes.textContent = `${qCount} questão${qCount===1?"":"es"}`;
  }

  if (el.statAcerto && subject.questoes) {
    const respondidas = subject.questoes.filter(q => state.respostas[q.id] !== undefined);
    const corretas = respondidas.filter(q => isRespostaCorreta(q, state.respostas[q.id]));
    el.statAcerto.textContent = respondidas.length
      ? `${Math.round(corretas.length / respondidas.length * 100)}% de acerto (${corretas.length}/${respondidas.length})`
      : "sem respostas ainda";
  }

  el.stripTabs.forEach(t => t.classList.toggle("is-active", t.dataset.panel === state.activeTab));
  if (el.panelQuestoes) el.panelQuestoes.hidden = state.activeTab !== "questoes";
  if (el.panelConteudo) el.panelConteudo.hidden = state.activeTab !== "conteudo";
  if (el.panelCadastrar) el.panelCadastrar.hidden = state.activeTab !== "cadastrar";

  renderQuestions(subject);
  renderNotes(subject);
}

/* =========================================================
   QUESTÕES: RENDERIZAÇÃO E PESQUISA
========================================================= */
function renderQuestions(subject){
  if (!el.questionList) return;
  const qList = subject.questoes || [];
  
  let lista = qList.filter(q => filtroAtivo === "todas" || q.tipo === filtroAtivo);
  const termoQuestao = el.searchQuestao ? el.searchQuestao.value.toLowerCase() : "";
  
  if (termoQuestao) {
    lista = lista.filter(q => q.enunciado.toLowerCase().includes(termoQuestao));
  }

  el.questionList.innerHTML = "";
  
  if (el.questoesEmptyHint) el.questoesEmptyHint.hidden = qList.length > 0;

  if(qList.length && lista.length === 0){
    const p = document.createElement("p");
    p.className = "hint-empty";
    p.textContent = "Nenhuma questão encontrada para esta pesquisa/filtro.";
    el.questionList.appendChild(p);
    return;
  }

  lista.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "q-card";
    card.style.setProperty("--card-color", subject.cor);

    const head = document.createElement("div");
    head.className = "q-head";
    const realIdx = qList.findIndex(item => item.id === q.id) + 1;
    head.innerHTML = `<span class="q-tag">QUESTÃO ${realIdx} · ${q.tipo === "certo_errado" ? "CERTO/ERRADO" : "OBJETIVA"}</span>`;
    
    const del = document.createElement("button");
    del.className = "q-del";
    del.textContent = "excluir";
    del.addEventListener("click", async () => {
      subject.questoes = subject.questoes.filter(x => x.id !== q.id);
      delete state.respostas[q.id];
      renderAll();
      await saveSubject(subject);
    });
    head.appendChild(del);
    card.appendChild(head);
    
    const enun = document.createElement("p");
    enun.className = "q-enunciado";
    enun.textContent = q.enunciado;
    card.appendChild(enun);

    const optionsWrap = document.createElement("div");
    optionsWrap.style.display = "flex";
    optionsWrap.style.flexDirection = "column";
    optionsWrap.style.gap = "8px";
    optionsWrap.style.marginTop = "16px";

    const respostaUsuario = state.respostas[q.id];
    const jaRespondida = respostaUsuario !== undefined;

    if (q.tipo === "certo_errado") {
      ["certo", "errado"].forEach(op => {
        const btn = document.createElement("button");
        btn.className = "btn-ghost"; 
        btn.style.textAlign = "left";
        btn.style.border = "1px solid #ccc";
        btn.textContent = op.charAt(0).toUpperCase() + op.slice(1); 
        
        if (jaRespondida) {
          btn.disabled = true; 
          if (op === q.correta) {
            btn.style.backgroundColor = "#e6fffa"; 
            btn.style.borderColor = "#38b259";
          } else if (respostaUsuario === op && respostaUsuario !== q.correta) {
            btn.style.backgroundColor = "#fff5f5"; 
            btn.style.borderColor = "#ff4d4d";
          }
        } else {
          btn.addEventListener("click", () => responderQuestao(q.id, op));
        }
        optionsWrap.appendChild(btn);
      });
    } 
    else if (q.tipo === "objetiva" && q.alternativas) {
      q.alternativas.forEach(alt => {
        const btn = document.createElement("button");
        btn.className = "btn-ghost";
        btn.style.textAlign = "left";
        btn.style.border = "1px solid #ccc";
        btn.textContent = alt.texto;

        if (jaRespondida) {
          btn.disabled = true;
          if (alt.id === q.corretaId) {
             btn.style.backgroundColor = "#e6fffa"; 
             btn.style.borderColor = "#38b259";
          } else if (respostaUsuario === alt.id && respostaUsuario !== q.corretaId) {
             btn.style.backgroundColor = "#fff5f5";
             btn.style.borderColor = "#ff4d4d";
          }
        } else {
          btn.addEventListener("click", () => responderQuestao(q.id, alt.id));
        }
        optionsWrap.appendChild(btn);
      });
    }
    
    card.appendChild(optionsWrap);

    if (jaRespondida && q.explicacao) {
      const exp = document.createElement("div");
      exp.style.marginTop = "16px";
      exp.style.padding = "12px";
      exp.style.backgroundColor = "#f8f9fa";
      exp.style.borderRadius = "8px";
      exp.style.fontSize = "0.9em";
      exp.innerHTML = `<strong>Comentário:</strong> ${q.explicacao}`;
      card.appendChild(exp);
    }

    el.questionList.appendChild(card);
  });
}

function responderQuestao(idQuestao, alternativaEscolhida) {
  if (!state.respostas) state.respostas = {};
  state.respostas[idQuestao] = alternativaEscolhida;
  renderAll(); 
}

function isRespostaCorreta(questao, respostaUsuario) {
  return questao.tipo === "certo_errado" 
    ? questao.correta === respostaUsuario 
    : questao.corretaId === respostaUsuario;
}

/* =========================================================
   MODAL DE DISCIPLINAS
========================================================= */
if (el.btnNewSubject) el.btnNewSubject.addEventListener("click", () => el.modalBackdrop.hidden = false);
if (el.btnNewSubjectEmpty) el.btnNewSubjectEmpty.addEventListener("click", () => el.modalBackdrop.hidden = false);
if (el.btnCancelSubject) el.btnCancelSubject.addEventListener("click", () => el.modalBackdrop.hidden = true);

if (el.subjectForm) {
  el.subjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = el.subjectNameInput.value.trim();
    if (!nome) return;

    const novaDisciplina = {id: uid(), nome: nome, cor: corSelecionada, questoes: [], notas: []};

    state.disciplinas.push(novaDisciplina);
    state.activeSubjectId = novaDisciplina.id;
    el.subjectNameInput.value = "";
    el.modalBackdrop.hidden = true;
    
    renderAll();
    await saveSubject(novaDisciplina);
  });
}

function renderColorPicker() {
  if (!el.colorPicker) return;
  el.colorPicker.innerHTML = ""; 
  
  COLOR_OPTIONS.forEach(cor => {
    const btnCor = document.createElement("button");
    btnCor.type = "button"; 
    btnCor.className = "color-swatch"; 
    btnCor.style.backgroundColor = cor;
    
    if (cor === corSelecionada) btnCor.classList.add("is-selected"); 
    
    btnCor.addEventListener("click", () => {
      corSelecionada = cor;
      Array.from(el.colorPicker.children).forEach(c => c.classList.remove("is-selected"));
      btnCor.classList.add("is-selected");
    });
    
    el.colorPicker.appendChild(btnCor);
  });
}
renderColorPicker();

/* =========================================================
   INTERAÇÕES DA INTERFACE
========================================================= */
if (el.stripTabs) {
  el.stripTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetPanel = tab.dataset.panel;
      if (targetPanel) {
        state.activeTab = targetPanel;
        renderAll(); 
      }
    });
  });
}

if (el.tipoQuestaoSeg) {
  const botoesTipo = el.tipoQuestaoSeg.querySelectorAll("button");
  botoesTipo.forEach(btn => {
    btn.addEventListener("click", () => {
      const texto = btn.textContent.toLowerCase();
      novoTipoQuestao = texto.includes("certo") ? "certo_errado" : "objetiva";
      
      botoesTipo.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      
      if (el.alternativasWrap && el.certoErradoWrap) {
        el.alternativasWrap.hidden = novoTipoQuestao === "certo_errado";
        el.certoErradoWrap.hidden = novoTipoQuestao !== "certo_errado";
      }
    });
  });
}

if (el.ceSeg) {
  const botoesRespCE = el.ceSeg.querySelectorAll("button");
  botoesRespCE.forEach(btn => {
    btn.addEventListener("click", () => {
      const texto = btn.textContent.toLowerCase();
      novaRespostaCE = texto.includes("certo") ? "certo" : "errado";
      
      botoesRespCE.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  });
}

if (el.filtroTipo) {
  const botoesFiltro = el.filtroTipo.querySelectorAll("button");
  botoesFiltro.forEach(btn => {
    btn.addEventListener("click", () => {
      const texto = btn.textContent.toLowerCase();
      if (texto.includes("todas")) filtroAtivo = "todas";
      else if (texto.includes("objetiva")) filtroAtivo = "objetiva"; 
      else if (texto.includes("certo")) filtroAtivo = "certo_errado";
      
      botoesFiltro.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      renderAll();
    });
  });
}

if (el.btnAddAlt && el.altList) {
  el.btnAddAlt.addEventListener("click", () => {
    const altId = uid(); 
    const row = document.createElement("div");
    row.className = "alt-row"; 
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.marginBottom = "8px";
    
    row.innerHTML = `
      <input type="radio" name="gabarito" value="${altId}" title="Marcar como correta">
      <input type="text" placeholder="Digite a alternativa..." style="flex: 1;" required>
      <button type="button" class="icon-btn danger" title="Remover alternativa">x</button>
    `;
    
    row.querySelector('.danger').addEventListener('click', () => row.remove());
    el.altList.appendChild(row);
  });
}

/* =========================================================
   CADASTRO: QUESTÃO
========================================================= */
if (el.questionForm) {
  el.questionForm.addEventListener("submit", async (e) => {
    e.preventDefault(); 
    const subject = getActiveSubject();
    if (!subject) return;

    const enunciado = el.qEnunciado ? el.qEnunciado.value.trim() : "";
    if (!enunciado) {
      alert("Por favor, digite o enunciado da questão.");
      return; 
    }

    const novaQuestao = {
      id: uid(),
      enunciado: enunciado,
      tipo: novoTipoQuestao,
      explicacao: el.qExplicacao ? el.qExplicacao.value.trim() : ""
    };

    if (novoTipoQuestao === "certo_errado") {
      novaQuestao.correta = novaRespostaCE;
    } else {
      const radios = el.altList.querySelectorAll('input[type="radio"]');
      const radioCorreto = Array.from(radios).find(r => r.checked);
      
      if (!radioCorreto) {
        alert("Por favor, marque a bolinha indicando qual é a alternativa correta.");
        return;
      }
      
      novaQuestao.corretaId = radioCorreto.value;
      novaQuestao.alternativas = [];
      
      const linhas = el.altList.querySelectorAll('.alt-row');
      linhas.forEach(linha => {
        const inputRadio = linha.querySelector('input[type="radio"]');
        const inputText = linha.querySelector('input[type="text"]');
        novaQuestao.alternativas.push({
          id: inputRadio.value,
          texto: inputText.value.trim()
        });
      });
    }

    if (!subject.questoes) subject.questoes = [];
    subject.questoes.push(novaQuestao);
    
    el.questionForm.reset();
    if (el.altList) el.altList.innerHTML = ""; 
    state.activeTab = "questoes";
    renderAll();
    
    await saveSubject(subject);
  });
}

if (el.btnResetQuiz) {
  el.btnResetQuiz.addEventListener("click", async () => {
    if(confirm("Tem certeza que deseja apagar todas as suas respostas desta disciplina?")) {
       const subject = getActiveSubject();
       if(subject && subject.questoes) {
         subject.questoes.forEach(q => delete state.respostas[q.id]);
         renderAll();
       }
    }
  });
}

/* =========================================================
   ANOTAÇÕES COM COMPRESSÃO WEBP (SALVAS EM ANOTAÇÕES SEPARADAS)
========================================================= */
let pendingBase64Images = []; 

// Função que compacta e converte sem perder tamanho original!
function compressImageToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        
        // Mantém as dimensões exatas da imagem original
        const width = img.width;
        const height = img.height;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Formato WebP com qualidade 0.7 para melhor leitura e tamanho leve
        const base64 = canvas.toDataURL("image/webp", 0.7);
        resolve(base64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

if (el.noteImagesInput) {
  el.noteImagesInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const base64 = await compressImageToBase64(file);
        pendingBase64Images.push(base64);
      }
    }
    renderImagePreviews();
  });
}

function renderImagePreviews() {
  if (!el.imagePreviewList) return;
  el.imagePreviewList.innerHTML = "";
  
  pendingBase64Images.forEach((src, index) => {
    const img = document.createElement("img");
    img.src = src;
    img.style.width = "60px";
    img.style.height = "60px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "4px";
    img.style.cursor = "pointer";
    img.title = "Clique para remover esta foto";
    
    img.addEventListener("click", () => {
      pendingBase64Images.splice(index, 1);
      renderImagePreviews();
    });
    
    el.imagePreviewList.appendChild(img);
  });
}

if (el.noteForm) {
  el.noteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const subject = getActiveSubject();
    if (!subject) return;

    const titulo = el.noteTitulo ? el.noteTitulo.value.trim() : "";
    const texto = el.noteTexto ? el.noteTexto.value.trim() : "";

    if (!titulo && !texto && pendingBase64Images.length === 0) return;

    // Salva a anotação como um DOCUMENTO SEPARADO no Firestore
    const novaNota = { 
      id: uid(), 
      subjectId: subject.id, 
      titulo, 
      texto, 
      imagens: pendingBase64Images 
    };

    if (!subject.notas) subject.notas = [];
    subject.notas.push(novaNota);

    el.noteForm.reset();
    pendingBase64Images = [];
    renderImagePreviews();
    renderAll();

    await saveNote(novaNota);
  });
}

function renderNotes(subject) {
  if (!el.noteList) return;
  el.noteList.innerHTML = "";
  
  let nList = subject.notas || [];
  
  const termoConteudo = el.searchConteudo ? el.searchConteudo.value.toLowerCase() : "";
  if (termoConteudo) {
    nList = nList.filter(n => 
      (n.titulo && n.titulo.toLowerCase().includes(termoConteudo)) || 
      (n.texto && n.texto.toLowerCase().includes(termoConteudo))
    );
  }
  
  if (el.notesEmptyHint) el.notesEmptyHint.hidden = nList.length > 0;

  nList.forEach(nota => {
    const card = document.createElement("div");
    card.className = "note-card";
    card.style.borderBottom = "1px solid #eaeaea";
    card.style.padding = "16px 0";
    card.style.marginBottom = "16px";

    if (nota.titulo) {
      const t = document.createElement("h3");
      t.textContent = nota.titulo;
      card.appendChild(t);
    }

    if (nota.texto) {
      const p = document.createElement("p");
      p.textContent = nota.texto;
      p.style.whiteSpace = "pre-wrap"; 
      card.appendChild(p);
    }

    if (nota.imagens && nota.imagens.length > 0) {
      const imgWrap = document.createElement("div");
      imgWrap.style.display = "flex";
      imgWrap.style.gap = "8px";
      imgWrap.style.flexWrap = "wrap";
      imgWrap.style.marginTop = "12px";

      nota.imagens.forEach(imgSrc => {
        const img = document.createElement("img");
        img.src = imgSrc;
        img.style.width = "100px";
        img.style.height = "100px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        img.style.cursor = "pointer";
        
        img.addEventListener("click", () => {
          if (el.lightboxBackdrop && el.lightboxImg) {
            el.lightboxImg.src = imgSrc;
            el.lightboxBackdrop.hidden = false;
          }
        });
        
        imgWrap.appendChild(img);
      });
      card.appendChild(imgWrap);
    }

    const delBtn = document.createElement("button");
    delBtn.textContent = "Apagar anotação";
    delBtn.className = "btn-ghost";
    delBtn.style.marginTop = "12px";
    delBtn.style.color = "red";
    delBtn.addEventListener("click", async () => {
       if(confirm("Tem certeza que deseja apagar essa anotação?")) {
         subject.notas = subject.notas.filter(n => n.id !== nota.id);
         renderAll();
         await deleteNoteFromCloud(nota.id);
       }
    });
    card.appendChild(delBtn);

    el.noteList.appendChild(card);
  });
}

if (el.lightboxClose) {
  el.lightboxClose.addEventListener("click", () => {
    if (el.lightboxBackdrop) el.lightboxBackdrop.hidden = true;
  });
}

/* =========================================================
   EVENTOS DE PESQUISA (DISCIPLINA, QUESTÃO E CONTEÚDO)
========================================================= */
if (el.searchSubject) {
  el.searchSubject.addEventListener("input", () => renderTabs());
}

if (el.searchQuestao) {
  el.searchQuestao.addEventListener("input", () => {
    const subject = getActiveSubject();
    if (subject) renderQuestions(subject);
  });
}

if (el.searchConteudo) {
  el.searchConteudo.addEventListener("input", () => {
    const subject = getActiveSubject();
    if (subject) renderNotes(subject);
  });
}

/* =========================================================
   EDIÇÃO E EXCLUSÃO DE DISCIPLINAS
========================================================= */
if (el.btnEditSubject) {
  el.btnEditSubject.addEventListener("click", async () => {
    const subject = getActiveSubject();
    if (!subject) return;

    const novoNome = prompt("Digite o novo nome para a disciplina:", subject.nome);
    if (novoNome !== null && novoNome.trim() !== "") {
      subject.nome = novoNome.trim();
      renderAll();
      await saveSubject(subject);
    }
  });
}

if (el.btnDeleteSubject) {
  el.btnDeleteSubject.addEventListener("click", async () => {
    const subject = getActiveSubject();
    if (!subject) return;

    if(confirm(`Tem certeza que deseja EXCLUIR a disciplina "${subject.nome}" e todo o seu conteúdo?`)) {
      state.disciplinas = state.disciplinas.filter(d => d.id !== subject.id);
      state.activeSubjectId = state.disciplinas.length ? state.disciplinas[0].id : null; 
      
      renderAll();
      await deleteSubjectFromCloud(subject.id);
    }
  });
}

/* =========================================================
   CRONÔMETRO DE ESTUDOS
========================================================= */
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

if (el.btnTimer) {
  el.btnTimer.addEventListener("click", () => {
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      el.btnTimer.style.color = "#ff4d4d";
      el.btnTimer.style.borderColor = "#ff4d4d";
    } else {
      isTimerRunning = true;
      el.btnTimer.style.color = "#38b259";
      el.btnTimer.style.borderColor = "#38b259";
      
      timerInterval = setInterval(() => {
        timerSeconds++;
        el.btnTimer.innerHTML = `⏱ ${formatTime(timerSeconds)}`;
      }, 1000);
    }
  });
  
  el.btnTimer.addEventListener("dblclick", () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerSeconds = 0;
    el.btnTimer.innerHTML = `⏱ 00:00:00`;
    el.btnTimer.style.color = "inherit";
    el.btnTimer.style.borderColor = "#ccc";
  });
}