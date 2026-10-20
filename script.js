const STORAGE_KEY = 'jardimCheck.inspections.v1';

const sectors = [
  {
    id: 'producao',
    name: 'Área de Produção / Massas',
    questions: [
      'As superfícies de trabalho e utensílios estão limpos e organizados?',
      'Os manipuladores utilizam toucas, luvas e uniformes limpos?',
      'As matérias-primas estão armazenadas em recipientes fechados e identificados?',
      'Os alimentos em preparo estão protegidos contra contaminação?',
      'O ambiente apresenta boa ventilação e ausência de resíduos?',
      'Os produtos de limpeza estão armazenados separadamente dos alimentos?',
      'As embalagens e rótulos estão em boas condições e legíveis?',
    ]
  },
  {
    id: 'confeitaria',
    name: 'Confeitaria',
    questions: [
      'As bancadas e ferramentas da confeitaria estão higienizadas corretamente?',
      'Os ingredientes e coberturas estão protegidos e sem contaminação?',
      'Os produtos decorados estão identificados com data de validade ou validade do lote?',
      'Os utensílios estão armazenados em local limpo e organizado?',
      'As mãos e equipamentos são higienizados antes da produção?',
      'Há controle adequado de prazos e retrabalho de produtos?',
      'As áreas de descanso e apoio apresentam higiene satisfatória?',
    ]
  },
  {
    id: 'deposito',
    name: 'Depósito de Secos / Ingredientes',
    questions: [
      'Os produtos estão armazenados em prateleiras limpas e organizadas?',
      'Há controle de validade e identificação dos ingredientes?',
      'Os sacos e embalagens estão fechados, sem sinais de umidade ou contaminação?',
      'Os itens estão afastados do chão e protegidos de insetos?',
      'O local apresenta boa ventilação e conservação estrutural?',
      'As embalagens de produtos de limpeza estão separadas dos alimentos?',
      'O estoque está organizado para facilitar a rotação de produtos?',
    ]
  },
  {
    id: 'vendas',
    name: 'Área de Vendas / Balcão',
    questions: [
      'O balcão e as superfícies de contato estão limpos e livres de resíduos?',
      'Os produtos expostos estão protegidos e com embalagem adequada?',
      'Há controle de temperatura e condições adequadas para os itens expostos?',
      'O lixo está acondicionado em recipiente adequado e com tampa quando necessário?',
      'Os atendentes apresentam higiene pessoal adequada e uniforme limpo?',
      'Os produtos com validade próxima estão identificados corretamente?',
      'A área de atendimento está organizada e segura para clientes e funcionários?',
    ]
  },
  {
    id: 'higiene',
    name: 'Higiene Pessoal e Instalações',
    questions: [
      'Os manipuladores utilizam toucas, uniforme e calçado adequados?',
      'As instalações sanitárias estão limpas, abastecidas e em bom estado?',
      'Existem dispensadores de sabonete e papel toalha em funcionamento?',
      'Os produtos de limpeza e desinfecção são armazenados em local apropriado?',
      'As janelas, paredes e pisos apresentam manutenção e conservação adequadas?',
      'Há controle de resíduos e coleta periódica do lixo?',
      'A empresa mantém boas condições de higiene e organização geral?',
    ]
  }
];

const optionMeta = {
  conforme: { label: 'Conforme', icon: '✓' },
  naoConforme: { label: 'Não Conforme', icon: '!' },
  naoAplica: { label: 'Não se aplica', icon: '—' }
};

const app = {
  inspections: loadInspections(),
  currentInspection: null,
  currentStep: 0,
  selectedInspectionId: null
};

window.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  bindGlobalEvents();
  renderSectorOptions();
  renderDashboard();
  renderHistory();
  setDefaultDate();
  bindPwaInstall();
  showView('dashboard');
}

function bindGlobalEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      showView(view);
    });
  });

  document.getElementById('startInspectionBtn').addEventListener('click', () => showView('newInspection'));

  document.getElementById('newInspectionForm').addEventListener('submit', (event) => {
    event.preventDefault();
    startNewInspection();
  });

  document.getElementById('prevQuestion').addEventListener('click', () => {
    if (!app.currentInspection) return;
    if (app.currentStep > 0) {
      app.currentStep -= 1;
      renderInspectionView();
    }
  });

  document.getElementById('nextQuestion').addEventListener('click', () => {
    if (!app.currentInspection) return;
    const sector = getCurrentSector();
    const currentQuestion = sector.questions[app.currentStep];
    const answer = findAnswer(app.currentInspection, { id: generateQuestionId(currentQuestion) });

    if (!answer || !answer.value) {
      showToast('Responda a pergunta atual antes de continuar.');
      return;
    }

    if (answer.value === 'naoConforme' && !answer.evidence) {
      showToast('É obrigatório anexar uma evidência fotográfica para a não conformidade.');
      return;
    }

    if (app.currentStep < sector.questions.length - 1) {
      app.currentStep += 1;
      renderInspectionView();
      return;
    }

    finalizeInspection();
  });

  document.getElementById('resultContent').addEventListener('click', (event) => {
    const printButton = event.target.closest('[data-print-report]');
    if (printButton) window.print();
  });

  document.getElementById('resultContent').addEventListener('input', (event) => {
    const actionId = event.target.dataset.actionId;
    const field = event.target.dataset.field;
    if (!actionId || !field) return;

    const inspection = app.inspections.find((item) => item.id === app.selectedInspectionId);
    if (!inspection) return;

    const action = inspection.actionPlan.find((item) => item.id === actionId);
    if (!action) return;

    action[field] = event.target.value;
    saveInspections();
  });

  document.getElementById('resultContent').addEventListener('change', (event) => {
    const actionId = event.target.dataset.actionId;
    const field = event.target.dataset.field;
    if (!actionId || !field) return;

    const inspection = app.inspections.find((item) => item.id === app.selectedInspectionId);
    if (!inspection) return;

    const action = inspection.actionPlan.find((item) => item.id === actionId);
    if (!action) return;

    action[field] = event.target.value;
    saveInspections();
  });

  document.getElementById('historyList').addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-open-id]');
    if (openButton) {
      openInspection(openButton.dataset.openId);
      return;
    }

    const deleteButton = event.target.closest('[data-delete-id]');
    if (deleteButton) {
      removeInspection(deleteButton.dataset.deleteId);
    }
  });

  document.getElementById('recentHistoryList').addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-open-id]');
    if (openButton) openInspection(openButton.dataset.openId);
  });

  document.getElementById('inspectionView').addEventListener('click', (event) => {
    const optionButton = event.target.closest('.option-btn');
    if (!optionButton) return;

    const value = optionButton.dataset.value;
    const questionId = optionButton.dataset.questionId;
    const inspection = app.currentInspection;
    if (!inspection) return;

    const answer = findAnswer(inspection, { id: questionId });
    if (!answer) return;

    answer.value = value;
    if (value !== 'naoConforme') answer.evidence = '';

    renderInspectionView();
  });

  document.getElementById('inspectionView').addEventListener('change', async (event) => {
    const fileInput = event.target.closest('[data-question-file]');
    if (!fileInput) return;

    const file = fileInput.files[0];
    if (!file) return;

    try {
      const resized = await resizeImage(file);
      const inspection = app.currentInspection;
      if (!inspection) return;

      const answer = findAnswer(inspection, { id: fileInput.dataset.questionFile });
      if (!answer) return;

      answer.evidence = resized;
      renderInspectionView();
      showToast('Evidência anexada com sucesso.');
    } catch (error) {
      showToast('Não foi possível anexar a foto. Tente outra imagem.');
    }
  });

  document.getElementById('resultContent').addEventListener('change', async (event) => {
    const fileInput = event.target.closest('[data-evidence-id]');
    if (!fileInput) return;

    const file = fileInput.files[0];
    if (!file) return;

    try {
      const imageData = await resizeImage(file);
      const inspection = app.inspections.find((item) => item.id === app.selectedInspectionId);
      if (!inspection) return;
      const action = inspection.actionPlan.find((item) => item.id === fileInput.dataset.evidenceId);
      if (!action) return;

      action.evidence = imageData;
      saveInspections();
      renderResult(inspection.id);
      showToast('Evidência da ação atualizada com sucesso.');
    } catch (error) {
      showToast('Não foi possível processar a imagem. Tente outra foto.');
    }
  });
}

function bindPwaInstall() {
  let deferredPrompt = null;
  const installBtn = document.getElementById('installBtn');

  if (!installBtn) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installBtn.classList.remove('hidden-install');
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      showToast('Instalação disponível apenas em navegador compatível com PWA.');
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.add('hidden-install');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

function showView(viewName) {
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === `${viewName}View`);
    view.classList.toggle('hidden', view.id !== `${viewName}View`);
  });

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === viewName);
  });
}

function renderSectorOptions() {
  const select = document.getElementById('sectorSelect');
  if (!select) return;

  select.innerHTML = sectors
    .map((sector) => `<option value="${sector.id}">${sector.name}</option>`)
    .join('');
}

function renderDashboard() {
  const recentInspections = [...app.inspections]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const total = app.inspections.length;
  const average = total > 0
    ? app.inspections.reduce((sum, inspection) => sum + (inspection.summary?.percentual ?? 0), 0) / total
    : 0;
  const pending = app.inspections.reduce((sum, inspection) => {
    const summary = inspection.summary ?? calculateSummary(inspection);
    return sum + summary.naoConforme;
  }, 0);

  document.getElementById('totalInspections').textContent = total;
  document.getElementById('avgIndex').textContent = `${Math.round(average)}%`;
  document.getElementById('pendingItems').textContent = pending;

  const recentList = document.getElementById('recentHistoryList');
  if (!recentList) return;

  if (!recentInspections.length) {
    recentList.innerHTML = '<div class="empty-state">Ainda não há inspeções registradas. Inicie a primeira visita.</div>';
    return;
  }

  recentList.innerHTML = recentInspections
    .map((inspection) => {
      const summary = inspection.summary ?? calculateSummary(inspection);
      return `
        <article class="history-item">
          <div class="history-item-header">
            <h3>${inspection.sectorName}</h3>
            <span class="result-pill ${getLevelClass(summary.percentual)}">
              ${summary.percentual === null ? 'N/C' : `${Math.round(summary.percentual)}%`}
            </span>
          </div>
          <div class="meta-row">
            <span>${formatDate(inspection.date)}</span>
            <span>Resp.: ${inspection.responsible}</span>
            <span>Resultado: ${getResultLabel(summary.percentual)}</span>
          </div>
          <div class="history-actions">
            <button class="view-btn" type="button" data-open-id="${inspection.id}">Detalhes</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;

  const inspections = [...app.inspections].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!inspections.length) {
    historyList.innerHTML = '<div class="empty-state">Nenhuma inspeção salva no histórico ainda.</div>';
    return;
  }

  historyList.innerHTML = inspections
    .map((inspection) => {
      const summary = inspection.summary ?? calculateSummary(inspection);
      return `
        <article class="history-card">
          <div class="history-card-head">
            <h3>${inspection.sectorName}</h3>
            <span class="result-pill ${getLevelClass(summary.percentual)}">
              ${summary.percentual === null ? 'N/C' : `${Math.round(summary.percentual)}%`}
            </span>
          </div>
          <div class="meta-row">
            <span>${formatDate(inspection.date)}</span>
            <span>Responsável: ${inspection.responsible}</span>
          </div>
          <div class="history-actions">
            <button class="view-btn" type="button" data-open-id="${inspection.id}">Visualizar</button>
            <button class="delete-btn" type="button" data-delete-id="${inspection.id}">Excluir</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function setDefaultDate() {
  const dateField = document.getElementById('inspectionDate');
  if (dateField) dateField.value = new Date().toISOString().split('T')[0];
}

function startNewInspection() {
  const sectorSelect = document.getElementById('sectorSelect');
  const responsible = document.getElementById('responsibleInput').value.trim();
  const date = document.getElementById('inspectionDate').value;

  if (!sectorSelect.value || !responsible || !date) {
    showToast('Preencha setor, responsável e data antes de iniciar a inspeção.');
    return;
  }

  const sector = sectors.find((item) => item.id === sectorSelect.value);
  if (!sector) {
    showToast('Setor inválido.');
    return;
  }

  app.currentInspection = {
    id: generateId(),
    sectorId: sector.id,
    sectorName: sector.name,
    responsible,
    date,
    createdAt: new Date().toISOString(),
    finalized: false,
    answers: sector.questions.map((question) => ({
      questionId: generateQuestionId(question),
      questionText: question,
      value: '',
      evidence: ''
    })),
    actionPlan: [],
    summary: null
  };

  app.currentStep = 0;
  renderInspectionView();
  showView('inspection');
}

function renderInspectionView() {
  const inspection = app.currentInspection;
  if (!inspection) return;

  const sector = getCurrentSector();
  const question = sector.questions[app.currentStep];
  const answer = findAnswer(inspection, { id: generateQuestionId(question) });
  const progress = ((app.currentStep + 1) / sector.questions.length) * 100;

  document.getElementById('inspectionSectorLabel').textContent = sector.name;
  document.getElementById('inspectionTitle').textContent = 'Checklist do setor';
  document.getElementById('inspectionResponsibleBadge').textContent = inspection.responsible;
  document.getElementById('questionProgressText').textContent = `Pergunta ${app.currentStep + 1} de ${sector.questions.length}`;
  document.getElementById('questionPercentText').textContent = `${Math.round(progress)}%`;
  document.getElementById('inspectionProgressBar').style.width = `${progress}%`;

  const questionMarkup = `
    <h3 class="question-title">${question}</h3>
    <div class="option-grid">
      ${Object.entries(optionMeta)
        .map(([value, meta]) => `
          <button
            class="option-btn ${answer && answer.value === value ? 'selected' : ''}"
            type="button"
            data-value="${value}"
            data-question-id="${generateQuestionId(question)}"
          >
            <span class="icon">${meta.icon}</span>
            <strong>${meta.label}</strong>
          </button>
        `)
        .join('')}
    </div>
    ${answer && answer.value === 'naoConforme' ? `
      <div class="file-upload-box">
        <h3>Evidência fotográfica obrigatória</h3>
        <small>Selecione uma foto da câmera ou da galeria para essa não conformidade.</small>
        <div class="upload-actions">
          <label class="upload-label" for="photo-${generateQuestionId(question)}">Anexar foto</label>
          <input
            id="photo-${generateQuestionId(question)}"
            type="file"
            accept="image/*"
            capture="environment"
            data-question-file="${generateQuestionId(question)}"
          />
        </div>
        ${answer.evidence ? `
          <div class="preview-frame">
            <img src="${answer.evidence}" alt="Pré-visualização da evidência" />
          </div>
        ` : ''}
      </div>
    ` : ''}
  `;

  document.getElementById('questionCard').innerHTML = questionMarkup;
  document.getElementById('prevQuestion').disabled = app.currentStep === 0;
  document.getElementById('nextQuestion').textContent =
    app.currentStep === sector.questions.length - 1 ? 'Finalizar inspeção' : 'Próxima';
}

function findAnswer(inspection, question) {
  const questionId = question.id || generateQuestionId(question);
  return inspection.answers.find((answer) => answer.questionId === questionId);
}

function getCurrentSector() {
  return sectors.find((sector) => sector.id === app.currentInspection?.sectorId) || sectors[0];
}

function finalizeInspection() {
  if (!app.currentInspection) return;

  const validationMessage = validateInspection(app.currentInspection);
  if (validationMessage) {
    showToast(validationMessage);
    return;
  }

  const summary = calculateSummary(app.currentInspection);
  app.currentInspection.summary = summary;
  app.currentInspection.finalized = true;
  app.currentInspection.actionPlan = generateActionPlan(app.currentInspection);

  app.inspections.push(app.currentInspection);
  saveInspections();
  app.selectedInspectionId = app.currentInspection.id;
  renderDashboard();
  renderHistory();
  renderResult(app.currentInspection.id);
  showView('result');
}

function validateInspection(inspection) {
  for (const answer of inspection.answers) {
    if (!answer.value) {
      return 'Todas as perguntas devem ser respondidas antes de finalizar a inspeção.';
    }

    if (answer.value === 'naoConforme' && !answer.evidence) {
      return 'Existe uma não conformidade sem evidência fotográfica. Anexe uma imagem antes de finalizar.';
    }
  }

  return '';
}

function calculateSummary(inspection) {
  const sector = getSectorById(inspection.sectorId);
  let conforme = 0;
  let naoConforme = 0;
  let naoAplicavel = 0;

  inspection.answers.forEach((answer) => {
    const question = sector.questions.find((item) => generateQuestionId(item) === answer.questionId);
    if (!question) return;

    if (answer.value === 'conforme') conforme += 1;
    if (answer.value === 'naoConforme') naoConforme += 1;
    if (answer.value === 'naoAplica') naoAplicavel += 1;
  });

  const aplicaveis = conforme + naoConforme;
  const percentual = aplicaveis === 0 ? null : (conforme / aplicaveis) * 100;

  return { conforme, naoConforme, naoAplicavel, aplicaveis, percentual };
}

function generateActionPlan(inspection) {
  const actionPlan = [];

  inspection.answers.forEach((answer) => {
    if (answer.value !== 'naoConforme') return;

    const questionText = answer.questionText || getQuestionById(inspection.sectorId, answer.questionId)?.text || 'Item não conforme';
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    actionPlan.push({
      id: generateId(),
      problem: questionText,
      action: buildActionSuggestion(questionText),
      responsible: '',
      dueDate: dueDate.toISOString().split('T')[0],
      howToSolve: '',
      evidence: answer.evidence || '',
      status: 'Pendente'
    });
  });

  return actionPlan;
}

function buildActionSuggestion(questionText) {
  const normalized = questionText.toLowerCase();

  if (normalized.includes('validade') || normalized.includes('prazo') || normalized.includes('identific')) {
    return 'identificar e rotular corretamente os produtos com data de validade e lote.';
  }
  if (normalized.includes('lixo') || normalized.includes('recipiente') || normalized.includes('tampa')) {
    return 'substituir ou adequar o recipiente de resíduos e garantir a coleta correta.';
  }
  if (normalized.includes('sabonete') || normalized.includes('papel toalha') || normalized.includes('dispens')) {
    return 'reabastecer os dispensadores e verificar a disponibilidade de materiais de higiene.';
  }
  if (normalized.includes('limpo') || normalized.includes('sujo') || normalized.includes('higien')) {
    return 'realizar a higienização adequada das superfícies, utensílios e áreas de trabalho.';
  }
  if (normalized.includes('uniforme') || normalized.includes('touca') || normalized.includes('manipul')) {
    return 'orientar e reforçar o uso correto de toucas, uniformes e higiene pessoal.';
  }
  if (normalized.includes('armazen')) {
    return 'organizar e readequar o armazenamento dos produtos de forma segura e conforme às normas.';
  }

  return 'implementar a correção imediata do problema e registrar a ação adotada.';
}

function renderResult(inspectionId) {
  const inspection = app.inspections.find((item) => item.id === inspectionId);
  if (!inspection) return;

  app.selectedInspectionId = inspectionId;
  const summary = inspection.summary ?? calculateSummary(inspection);
  const scoreColor = getResultCardClass(summary.percentual);

  const resultMarkup = `
    <div class="result-shell">
      <section class="panel card result-section">
        <div class="inspection-header-card">
          <div>
            <p class="eyebrow alt">Relatório da inspeção</p>
            <h3>${inspection.sectorName}</h3>
          </div>
          <button class="primary-btn compact" data-print-report="true" type="button">Imprimir / PDF</button>
        </div>

        <div class="result-summary">
          <div class="score-card ${scoreColor}">
            <span class="eyebrow">Índice de conformidade</span>
            <span class="score-value">${summary.percentual === null ? 'N/C' : `${Math.round(summary.percentual)}%`}</span>
            <div class="score-sub">${summary.percentual === null ? 'Não foi possível calcular.' : getResultLabel(summary.percentual)}</div>
          </div>

          <div class="summary-cards">
            <div class="summary-mini"><small>Conformes</small><strong>${summary.conforme}</strong></div>
            <div class="summary-mini"><small>Não conformes</small><strong>${summary.naoConforme}</strong></div>
            <div class="summary-mini"><small>Não aplicáveis</small><strong>${summary.naoAplicavel}</strong></div>
            <div class="summary-mini"><small>Aplicáveis</small><strong>${summary.aplicaveis}</strong></div>
          </div>
        </div>
      </section>

      <section class="panel card result-section">
        <div class="inspection-header-card">
          <div>
            <p class="eyebrow alt">Dados gerais</p>
            <h3>Padaria e Confeitaria Jardim</h3>
          </div>
        </div>

        <div class="detail-list">
          <div class="detail-item"><span>Setor</span><strong>${inspection.sectorName}</strong></div>
          <div class="detail-item"><span>Responsável</span><strong>${inspection.responsible}</strong></div>
          <div class="detail-item"><span>Data</span><strong>${formatDate(inspection.date)}</strong></div>
          <div class="detail-item"><span>Status</span><strong>${inspection.finalized ? 'Finalizada' : 'Em elaboração'}</strong></div>
        </div>
      </section>

      <section class="panel card result-section">
        <div class="inspection-header-card">
          <div>
            <p class="eyebrow alt">Resumo das respostas</p>
            <h3>Lista de itens avaliados</h3>
          </div>
        </div>

        <div class="answer-list">
          ${inspection.answers.map((answer) => {
            const label = answer.value === 'conforme' ? 'conforme' : answer.value === 'naoConforme' ? 'nao-conforme' : 'nao-aplica';
            const questionText = answer.questionText || getQuestionText(inspection.sectorId, answer.questionId);
            return `
              <div class="answer-item">
                <div class="answer-item-header">
                  <strong>${questionText}</strong>
                  <span class="tag ${label}">
                    ${label === 'conforme' ? 'Conforme' : label === 'nao-conforme' ? 'Não conforme' : 'Não se aplica'}
                  </span>
                </div>
                ${answer.evidence ? `<img class="nonconformity-photo" src="${answer.evidence}" alt="Evidência da não conformidade" />` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <section class="panel card result-section">
        <div class="inspection-header-card">
          <div>
            <p class="eyebrow alt">Plano de ação</p>
            <h3>5W2H simplificado</h3>
          </div>
        </div>

        <div class="action-plan-list">
          ${inspection.actionPlan.length
            ? inspection.actionPlan.map((action) => `
              <article class="action-card">
                <div class="action-card-header">
                  <h4>${action.problem}</h4>
                  <span class="status-badge ${getStatusClass(action.status, action.dueDate)}">${action.status}</span>
                </div>

                <div class="action-grid">
                  <div class="field-row full">
                    <label>Problema identificado</label>
                    <input type="text" value="${escapeHtml(action.problem)}" disabled />
                  </div>

                  <div class="field-row full">
                    <label>O que fazer</label>
                    <input data-action-id="${action.id}" data-field="action" type="text" value="${escapeHtml(action.action)}" />
                  </div>

                  <div class="field-row">
                    <label>Responsável</label>
                    <input data-action-id="${action.id}" data-field="responsible" type="text" value="${escapeHtml(action.responsible || '')}" />
                  </div>

                  <div class="field-row">
                    <label>Prazo</label>
                    <input data-action-id="${action.id}" data-field="dueDate" type="date" value="${action.dueDate || ''}" />
                  </div>

                  <div class="field-row full">
                    <label>Como resolver</label>
                    <textarea data-action-id="${action.id}" data-field="howToSolve" placeholder="Descreva como a ação será executada.">${escapeHtml(action.howToSolve || '')}</textarea>
                  </div>

                  <div class="field-row full">
                    <label>Status</label>
                    <select data-action-id="${action.id}" data-field="status" class="status-select">
                      ${['Pendente', 'Em andamento', 'Concluído']
                        .map((status) => `<option value="${status}" ${action.status === status ? 'selected' : ''}>${status}</option>`)
                        .join('')}
                    </select>
                  </div>
                </div>

                ${action.evidence ? `<img src="${action.evidence}" class="action-evidence" alt="Evidência da correção" />` : ''}
              </article>
            `).join('')
            : '<div class="empty-state">Nenhuma não conformidade foi identificada nesta inspeção.</div>'
          }
        </div>
      </section>
    </div>
  `;

  document.getElementById('resultContent').innerHTML = resultMarkup;
}

function openInspection(id) {
  const inspection = app.inspections.find((item) => item.id === id);
  if (!inspection) return;

  app.selectedInspectionId = id;
  renderResult(id);
  showView('result');
}

function removeInspection(id) {
  const confirmed = window.confirm('Deseja realmente excluir esta inspeção do histórico?');
  if (!confirmed) return;

  app.inspections = app.inspections.filter((inspection) => inspection.id !== id);
  saveInspections();
  renderDashboard();
  renderHistory();

  if (app.selectedInspectionId === id) {
    app.selectedInspectionId = null;
    document.getElementById('resultContent').innerHTML = '<div class="empty-state">Selecione uma inspeção para visualizar o relatório.</div>';
  }

  showView('history');
  showToast('Inspeção excluída com sucesso.');
}

function saveInspections() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app.inspections));
  } catch (error) {
    showToast('Não foi possível salvar no navegador. Pode haver pouco espaço disponível no armazenamento local.');
  }
}

function loadInspections() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) return [];
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

function formatDate(dateString) {
  if (!dateString) return '--';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function generateId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function generateQuestionId(questionText) {
  return String(questionText).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getSectorById(id) {
  return sectors.find((sector) => sector.id === id) || sectors[0];
}

function getQuestionById(sectorId, questionId) {
  const sector = getSectorById(sectorId);
  const question = sector.questions.find((item) => generateQuestionId(item) === questionId);
  return question ? { id: questionId, text: question } : null;
}

function getQuestionText(sectorId, questionId) {
  const question = getQuestionById(sectorId, questionId);
  return question ? question.text : 'Pergunta desconhecida';
}

function getResultCardClass(percentual) {
  if (percentual === null) return 'neutral';
  if (percentual > 80) return 'success';
  if (percentual >= 60) return 'warning';
  return 'danger';
}

function getResultLabel(percentual) {
  if (percentual === null) return 'Não foi possível calcular';
  if (percentual > 80) return 'Conformidade adequada';
  if (percentual >= 60) return 'Conformidade moderada';
  return 'Atenção necessária';
}

function getLevelClass(percentual) {
  if (percentual === null) return 'medium';
  if (percentual > 80) return 'high';
  if (percentual >= 60) return 'medium';
  return 'low';
}

function getStatusClass(status, dueDate = null) {
  const normalized = (status || '').toLowerCase();

  if (normalized.includes('conclu')) return 'concluido';
  if (normalized.includes('andamento')) return 'andamento';
  if (dueDate) {
    const parsedDueDate = new Date(dueDate);
    const today = new Date();
    if (parsedDueDate < today && normalized.includes('pendente')) return 'atrasado';
  }
  return 'pendente';
}

function escapeHtml(text) {
  const value = String(text ?? '');
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function resizeImage(file) {
  const imageSource = await fileToDataUrl(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / image.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    image.onerror = () => reject(new Error('Erro ao carregar a imagem'));
    image.src = imageSource;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
