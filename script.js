// 1. Importações do Firebase SDK via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
   ESTADO / PERSISTÊNCIA NA NUVEM
========================================================= */
const COLOR_OPTIONS = ["#E9C25E","#4F9A6E","#C85A42","#5B84B1","#8C6FB0","#3D9A9A","#B27C3D","#6E7B4A"];

function uid(){ return Math.random().toString(36).slice(2, 10); }

// Estrutura de estado inicial padrão
let state = { disciplinas: [], activeSubjectId: null, activeTab: "questoes", respostas: {} };

// Salvar dados no Firestore
async function saveState() {
  try {
    await setDoc(doc(db, "usuarios", "dados_estudos"), state);
    console.log("Dados sincronizados com o Firebase!");
  } catch (e) {
    console.error("Erro ao salvar dados na nuvem:", e);
  }
}

// Carregar dados do Firestore
async function loadStateFromFirebase() {
  try {
    const docRef = doc(db, "usuarios", "dados_estudos");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      state = docSnap.data();
      console.log("Dados carregados da nuvem com sucesso!");
    } else {
      console.log("Nenhum dado encontrado. Iniciando banco vazio.");
    }
  } catch (e) {
    console.error("Erro ao carregar dados da nuvem:", e);
  }
  renderAll();
}

// Chama o carregamento inicial assim que o site abrir
loadStateFromFirebase();

function getActiveSubject(){
  return state.disciplinas.find(d => d.id === state.activeSubjectId) || null;
}

// Auxiliar para evitar problemas de segurança com strings injetadas no HTML
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
  if (!el.tabList) return;
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

  // CÁLCULO DE ACERTOS CORRIGIDO
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
   QUESTÕES: LÓGICA DE RENDERIZAÇÃO E RESPOSTAS
========================================================= */
function renderQuestions(subject){
  if (!el.questionList) return;
  const qList = subject.questoes || [];
  const lista = qList.filter(q => filtroAtivo === "todas" || q.tipo === filtroAtivo);
  el.questionList.innerHTML = "";
  
  if (el.questoesEmptyHint) el.questoesEmptyHint.hidden = qList.length > 0;

  if(qList.length && lista.length === 0){
    const p = document.createElement("p");
    p.className = "hint-empty";
    p.textContent = "Nenhuma questão neste filtro.";
    el.questionList.appendChild(p);
    return;
  }

  lista.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "q-card";
    card.style.setProperty("--card-color", subject.cor);

    // 1. CABEÇALHO
    const head = document.createElement("div");
    head.className = "q-head";
    head.innerHTML = `<span class="q-tag">QUESTÃO ${idx+1} · ${q.tipo === "certo_errado" ? "CERTO/ERRADO" : "OBJETIVA"}</span>`;
    
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
    
    // 2. ENUNCIADO
    const enun = document.createElement("p");
    enun.className = "q-enunciado";
    enun.textContent = q.enunciado;
    card.appendChild(enun);

    // 3. ALTERNATIVAS PARA RESPONDER
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

    // 4. EXPLICAÇÃO
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

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */
function responderQuestao(idQuestao, alternativaEscolhida) {
  if (!state.respostas) {
    state.respostas = {};
  }
  
  state.respostas[idQuestao] = alternativaEscolhida;
  
  if (typeof saveState === "function") saveState();
  if (typeof renderAll === "function") renderAll(); 
}

function isRespostaCorreta(questao, respostaUsuario) {
  if (questao.tipo === "certo_errado") {
    return questao.correta === respostaUsuario;
  } else {
    return questao.corretaId === respostaUsuario;
  }
}

/* =========================================================
   MODAL DE DISCIPLINAS
========================================================= */
if (el.btnNewSubject) el.btnNewSubject.addEventListener("click", () => el.modalBackdrop.hidden = false);
if (el.btnNewSubjectEmpty) el.btnNewSubjectEmpty.addEventListener("click", () => el.modalBackdrop.hidden = false);
if (el.btnCancelSubject) el.btnCancelSubject.addEventListener("click", () => el.modalBackdrop.hidden = true);

if (el.subjectForm) {
  el.subjectForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = el.subjectNameInput.value.trim();
    if (!nome) return;

    const novaDisciplina = {id: uid(), nome: nome, cor: corSelecionada, questoes: [], notas: []};

    state.disciplinas.push(novaDisciplina);
    state.activeSubjectId = novaDisciplina.id;
    el.subjectNameInput.value = "";
    el.modalBackdrop.hidden = true;
    
    saveState();
    renderAll();
  });
}

/* =========================================================
   RENDER: SELETOR DE CORES
========================================================= */
function renderColorPicker() {
  if (!el.colorPicker) return;
  el.colorPicker.innerHTML = ""; 
  
  COLOR_OPTIONS.forEach(cor => {
    const btnCor = document.createElement("button");
    btnCor.type = "button"; 
    btnCor.className = "color-swatch"; 
    btnCor.style.backgroundColor = cor;
    
    if (cor === corSelecionada) {
      btnCor.classList.add("is-selected"); 
    }
    
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
   INTERAÇÃO: ABAS INTERNAS
========================================================= */
if (el.stripTabs) {
  el.stripTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetPanel = tab.dataset.panel;
      if (targetPanel) {
        state.activeTab = targetPanel;
        saveState(); 
        renderAll(); 
      }
    });
  });
}

/* =========================================================
   INTERAÇÃO: SELETOR DE TIPO DE QUESTÃO (Cadastrar)
========================================================= */
if (el.tipoQuestaoSeg) {
  const botoesTipo = el.tipoQuestaoSeg.querySelectorAll("button");
  
  botoesTipo.forEach(btn => {
    btn.addEventListener("click", () => {
      const texto = btn.textContent.toLowerCase();
      novoTipoQuestao = texto.includes("certo") ? "certo_errado" : "objetiva";
      
      botoesTipo.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      
      if (el.alternativasWrap && el.certoErradoWrap) {
        if (novoTipoQuestao === "certo_errado") {
          el.alternativasWrap.hidden = true;
          el.certoErradoWrap.hidden = false;
        } else {
          el.alternativasWrap.hidden = false;
          el.certoErradoWrap.hidden = true;
        }
      }
    });
  });
}

/* =========================================================
   INTERAÇÃO: ESCOLHER A RESPOSTA "CERTO" OU "ERRADO"
========================================================= */
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

/* =========================================================
   INTERAÇÃO: FILTROS DE QUESTÕES
========================================================= */
if (el.filtroTipo) {
  const botoesFiltro = el.filtroTipo.querySelectorAll("button");
  
  botoesFiltro.forEach(btn => {
    btn.addEventListener("click", () => {
      const texto = btn.textContent.toLowerCase();
      
      if (texto.includes("todas")) {
        filtroAtivo = "todas";
      } else if (texto.includes("objetiva")) {
        filtroAtivo = "objetiva"; 
      } else if (texto.includes("certo")) {
        filtroAtivo = "certo_errado";
      }
      
      botoesFiltro.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      renderAll();
    });
  });
}

/* =========================================================
   INTERAÇÃO: ADICIONAR ALTERNATIVAS
========================================================= */
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
    
    row.querySelector('.danger').addEventListener('click', () => {
      row.remove();
    });
    
    el.altList.appendChild(row);
  });
}

/* =========================================================
   CADASTRO: SALVAR NOVA QUESTÃO
========================================================= */
if (el.questionForm) {
  el.questionForm.addEventListener("submit", (e) => {
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
    
    saveState();
    
    el.questionForm.reset();
    if (el.altList) el.altList.innerHTML = ""; 
    state.activeTab = "questoes";
    renderAll();
  });
}

/* =========================================================
   BÔNUS: REINICIAR RESPOSTAS
========================================================= */
if (el.btnResetQuiz) {
  el.btnResetQuiz.addEventListener("click", () => {
    if(confirm("Tem certeza que deseja apagar todas as suas respostas desta disciplina?")) {
       const subject = getActiveSubject();
       if(subject && subject.questoes) {
         subject.questoes.forEach(q => {
           delete state.respostas[q.id];
         });
         saveState();
         renderAll();
       }
    }
  });
}

/* =========================================================
   CADASTRO E RENDER: ANOTAÇÕES E IMAGENS
========================================================= */
let pendingImages = []; // Guarda as fotos temporariamente antes de salvar

// 1. Processar a foto quando você clica em "Adicionar imagens"
if (el.noteImagesInput) {
  el.noteImagesInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        pendingImages.push(event.target.result); // Transforma em Base64
        renderImagePreviews();
      };
      reader.readAsDataURL(file);
    });
  });
}

// 2. Mostrar miniatura da foto antes de salvar (se houver a div no HTML)
function renderImagePreviews() {
  if (!el.imagePreviewList) return;
  el.imagePreviewList.innerHTML = "";
  
  pendingImages.forEach((imgSrc, index) => {
    const img = document.createElement("img");
    img.src = imgSrc;
    img.style.width = "60px";
    img.style.height = "60px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "4px";
    img.style.cursor = "pointer";
    img.title = "Clique para remover esta foto";
    
    img.addEventListener("click", () => {
      pendingImages.splice(index, 1);
      renderImagePreviews();
    });
    
    el.imagePreviewList.appendChild(img);
  });
}

// 3. Salvar a anotação ao clicar em "Salvar anotação"
if (el.noteForm) {
  el.noteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const subject = getActiveSubject();
    if (!subject) return;

    const titulo = el.noteTitulo ? el.noteTitulo.value.trim() : "";
    const texto = el.noteTexto ? el.noteTexto.value.trim() : "";

    // Se não tiver título, nem texto, nem imagem, não salva
    if (!titulo && !texto && pendingImages.length === 0) return; 

    const novaNota = {
      id: uid(),
      titulo: titulo,
      texto: texto,
      imagens: [...pendingImages]
    };

    if (!subject.notas) subject.notas = [];
    subject.notas.push(novaNota);
    
    saveState();
    
    // Limpar o formulário para a próxima
    el.noteForm.reset();
    pendingImages = [];
    renderImagePreviews();
    renderAll();
  });
}

// 4. Exibir as anotações e fotos salvas na tela
function renderNotes(subject) {
  if (!el.noteList) return;
  el.noteList.innerHTML = "";
  const nList = subject.notas || [];
  
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
      p.style.whiteSpace = "pre-wrap"; // Mantém as quebras de linha que você digitar
      card.appendChild(p);
    }

    // Se houver imagens salvas, desenha elas
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
        
        // Clicar para ampliar a imagem
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

    // Botão de deletar a anotação
    const delBtn = document.createElement("button");
    delBtn.textContent = "Apagar anotação";
    delBtn.className = "btn-ghost";
    delBtn.style.marginTop = "12px";
    delBtn.style.color = "red";
    delBtn.addEventListener("click", () => {
       if(confirm("Tem certeza que deseja apagar essa anotação?")) {
         subject.notas = subject.notas.filter(n => n.id !== nota.id);
         saveState();
         renderAll();
       }
    });
    card.appendChild(delBtn);

    el.noteList.appendChild(card);
  });
}

// Fechar a imagem ampliada (Lightbox)
if (el.lightboxClose) {
  el.lightboxClose.addEventListener("click", () => {
    if (el.lightboxBackdrop) el.lightboxBackdrop.hidden = true;
  });
}