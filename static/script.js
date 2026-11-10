document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const audioFileInput = document.getElementById('audio-file-input');
  const dropzone = document.getElementById('dropzone');
  const selectedFileBadge = document.getElementById('selected-file-badge');
  const selectedFileName = document.getElementById('selected-file-name');
  const selectedFileSize = document.getElementById('selected-file-size');
  const removeFileBtn = document.getElementById('btn-remove-file');
  const btnTranscribe = document.getElementById('btn-transcribe');
  const prismaModelSelect = document.getElementById('prisma-model');
  const prismaLangSelect = document.getElementById('prisma-lang');
  const prismaFormatSelect = document.getElementById('prisma-format');
  const prismaKeytermsInput = document.getElementById('prisma-keyterms');
  const sttWaveform = document.getElementById('stt-waveform');
  const transcriptOutput = document.getElementById('transcript-output');
  const transcriptEditInput = document.getElementById('transcript-edit-input');
  const btnToggleEdit = document.getElementById('btn-toggle-edit');
  const btnRevertOriginal = document.getElementById('btn-revert-original');
  const transcriptStatus = document.getElementById('transcript-status');
  const btnCopyTranscript = document.getElementById('btn-copy-transcript');
  const btnDownloadTranscript = document.getElementById('btn-download-transcript');
  const btnSendToAi = document.getElementById('btn-send-to-ai');
  const btnSendToTts = document.getElementById('btn-send-to-tts');

  // AI Elements
  const aiPromptInput = document.getElementById('ai-prompt-input');
  const btnAskAi = document.getElementById('btn-ask-ai');
  const aiResponseOutput = document.getElementById('ai-response-output');
  const aiStatus = document.getElementById('ai-status');
  const btnCopyAiResponse = document.getElementById('btn-copy-ai');
  const btnAiToTts = document.getElementById('btn-ai-to-tts');

  // TTS Elements
  const ttsTextInput = document.getElementById('tts-text-input');
  const timbreVoiceSelect = document.getElementById('timbre-voice');
  const timbreModelSelect = document.getElementById('timbre-model');
  const timbreSpeedInput = document.getElementById('timbre-speed');
  const timbreSpeedVal = document.getElementById('timbre-speed-val');
  const btnSynthesize = document.getElementById('btn-synthesize');
  const ttsAudioPlayer = document.getElementById('tts-audio-player');
  const ttsPlayerContainer = document.getElementById('tts-player-container');
  const ttsDownloadLink = document.getElementById('tts-download-link');
  const ttsStatus = document.getElementById('tts-status');
  const ttsWaveform = document.getElementById('tts-waveform');

  // Config & Activity Elements
  const apiKeyAlert = document.getElementById('api-key-alert');
  const apiStatusDot = document.getElementById('api-status-dot');
  const apiStatusText = document.getElementById('api-status-text');
  const activityList = document.getElementById('activity-list');
  const clearHistoryBtn = document.getElementById('btn-clear-history');

  let selectedFile = null;
  let sessionHistory = [];
  let rawApiTranscript = '';
  let isEditingTranscript = false;

  // Check API Configuration on Load
  checkConfigStatus();

  async function checkConfigStatus() {
    try {
      const res = await fetch('/api/config-status');
      const data = await res.json();
      if (data.gnani_api_key_configured) {
        apiKeyAlert.style.display = 'none';
        apiStatusDot.classList.add('active');
        apiStatusText.textContent = 'Gnani API Connected';
      } else {
        apiKeyAlert.style.display = 'flex';
        apiStatusDot.classList.remove('active');
        apiStatusText.textContent = 'API Key Missing (.env)';
      }
    } catch (err) {
      console.error('Failed to verify config status:', err);
    }
  }

  // Drag and Drop Handling
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  });

  dropzone.addEventListener('click', () => {
    audioFileInput.click();
  });

  audioFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  });

  function handleFileSelection(file) {
    const validExtensions = ['wav', 'mp3', 'ogg', 'flac', 'm4a', 'webm'];
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      alert(`Unsupported audio format: .${ext}. Please select a WAV, MP3, OGG, FLAC, M4A, or WEBM audio file.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25 MB limit.');
      return;
    }

    selectedFile = file;
    selectedFileName.textContent = file.name;
    selectedFileSize.textContent = formatBytes(file.size);
    selectedFileBadge.style.display = 'flex';
    btnTranscribe.disabled = false;
  }

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSelectedFile();
  });

  function clearSelectedFile() {
    selectedFile = null;
    audioFileInput.value = '';
    selectedFileBadge.style.display = 'none';
    btnTranscribe.disabled = true;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Speech-to-Text Action
  btnTranscribe.addEventListener('click', async () => {
    if (!selectedFile) return;

    btnTranscribe.disabled = true;
    btnTranscribe.innerHTML = '<span class="spinner"></span> Transcribing with Prisma...';
    sttWaveform.classList.add('active');
    transcriptOutput.innerHTML = '<span class="result-placeholder">Transcribing audio via Gnani Prisma API...</span>';
    transcriptEditInput.style.display = 'none';
    transcriptOutput.style.display = 'block';
    isEditingTranscript = false;
    btnToggleEdit.style.display = 'none';
    btnRevertOriginal.style.display = 'none';
    transcriptStatus.innerHTML = '<span class="status-badge-inline info">Processing</span>';

    const formData = new FormData();
    formData.append('audio', selectedFile);
    formData.append('model', prismaModelSelect.value);
    formData.append('language_code', prismaLangSelect.value);
    formData.append('format', prismaFormatSelect.value);
    if (prismaKeytermsInput.value.trim()) {
      formData.append('keyterms', prismaKeytermsInput.value.trim());
    }

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        rawApiTranscript = data.transcript || '(No speech recognized)';
        transcriptOutput.textContent = rawApiTranscript;
        transcriptEditInput.value = rawApiTranscript;

        const langDisplay = data.detected_language ? data.detected_language.toUpperCase() : 'DETECTED';
        transcriptStatus.innerHTML = `<span class="status-badge-inline success">Prisma Success • Lang: ${langDisplay}</span>`;
        
        btnCopyTranscript.style.display = 'inline-flex';
        btnDownloadTranscript.style.display = 'inline-flex';
        btnToggleEdit.style.display = 'inline-flex';
        btnSendToAi.style.display = 'inline-flex';
        btnSendToTts.style.display = 'inline-flex';

        addActivityItem({
          type: 'STT (Prisma)',
          title: `Transcribed "${selectedFile.name}" [${langDisplay}]`,
          content: rawApiTranscript,
          time: new Date().toLocaleTimeString()
        });
      } else {
        const errMsg = data.error || 'Failed to transcribe audio.';
        transcriptOutput.innerHTML = `<span style="color: var(--accent-rose); font-weight: 500;">❌ ${escapeHtml(errMsg)}</span>`;
        transcriptStatus.innerHTML = '<span class="status-badge-inline error">Error</span>';
      }
    } catch (err) {
      transcriptOutput.innerHTML = `<span style="color: var(--accent-rose);">❌ Connection Error: ${escapeHtml(err.message)}</span>`;
      transcriptStatus.innerHTML = '<span class="status-badge-inline error">Failed</span>';
    } finally {
      btnTranscribe.disabled = false;
      btnTranscribe.innerHTML = `
        <svg style="width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
        Convert Speech to Text (Prisma)
      `;
      sttWaveform.classList.remove('active');
    }
  });

  // Transcript Edit & Revert Handlers
  btnToggleEdit.addEventListener('click', () => {
    isEditingTranscript = !isEditingTranscript;
    if (isEditingTranscript) {
      transcriptEditInput.value = transcriptOutput.textContent;
      transcriptOutput.style.display = 'none';
      transcriptEditInput.style.display = 'block';
      transcriptEditInput.focus();
      btnToggleEdit.textContent = '💾 Save Edit';
      btnRevertOriginal.style.display = 'inline-flex';
    } else {
      transcriptOutput.textContent = transcriptEditInput.value;
      transcriptEditInput.style.display = 'none';
      transcriptOutput.style.display = 'block';
      btnToggleEdit.textContent = '✏️ Edit';
      if (transcriptOutput.textContent !== rawApiTranscript) {
        btnRevertOriginal.style.display = 'inline-flex';
        transcriptStatus.innerHTML = `<span class="status-badge-inline info">Edited (Original Preserved)</span>`;
      } else {
        btnRevertOriginal.style.display = 'none';
      }
    }
  });

  btnRevertOriginal.addEventListener('click', () => {
    transcriptOutput.textContent = rawApiTranscript;
    transcriptEditInput.value = rawApiTranscript;
    if (isEditingTranscript) {
      transcriptEditInput.style.display = 'none';
      transcriptOutput.style.display = 'block';
      isEditingTranscript = false;
      btnToggleEdit.textContent = '✏️ Edit';
    }
    btnRevertOriginal.style.display = 'none';
    transcriptStatus.innerHTML = `<span class="status-badge-inline success">Reverted to Original API Output</span>`;
    showToast('Reverted to original Prisma API transcription!');
  });

  // Download Transcript
  btnDownloadTranscript.addEventListener('click', () => {
    const textToSave = isEditingTranscript ? transcriptEditInput.value : transcriptOutput.textContent;
    if (!textToSave) return;
    const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Transcript downloaded as .txt!');
  });

  function getActiveTranscript() {
    return isEditingTranscript ? transcriptEditInput.value : transcriptOutput.textContent;
  }

  // Transfer STT to AI / TTS
  btnSendToAi.addEventListener('click', () => {
    aiPromptInput.value = getActiveTranscript();
    aiPromptInput.scrollIntoView({ behavior: 'smooth' });
    aiPromptInput.focus();
  });

  btnSendToTts.addEventListener('click', () => {
    ttsTextInput.value = getActiveTranscript();
    ttsTextInput.scrollIntoView({ behavior: 'smooth' });
    ttsTextInput.focus();
  });

  btnCopyTranscript.addEventListener('click', () => {
    navigator.clipboard.writeText(getActiveTranscript());
    showToast('Transcript copied to clipboard!');
  });

  // AI Reasoning Action (Evon 30B)
  btnAskAi.addEventListener('click', async () => {
    const prompt = aiPromptInput.value.trim();
    if (!prompt) {
      alert('Please enter a question or topic for the AI Assistant.');
      return;
    }

    btnAskAi.disabled = true;
    btnAskAi.innerHTML = '<span class="spinner"></span> Thinking...';
    aiResponseOutput.innerHTML = '<span class="result-placeholder">Consulting Evon 30B reasoning model...</span>';
    aiStatus.innerHTML = '<span class="status-badge-inline info">Processing</span>';

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        aiResponseOutput.textContent = data.response;
        aiStatus.innerHTML = `<span class="status-badge-inline success">Completed • ${data.model}</span>`;
        btnCopyAiResponse.style.display = 'inline-flex';
        btnAiToTts.style.display = 'inline-flex';

        addActivityItem({
          type: 'AI (Evon 30B)',
          title: `Prompt: "${prompt.slice(0, 40)}..."`,
          content: data.response,
          time: new Date().toLocaleTimeString()
        });
      } else {
        const errMsg = data.error || 'Failed to query AI reasoning model.';
        aiResponseOutput.innerHTML = `<span style="color: var(--accent-rose); font-weight: 500;">⚠️ ${escapeHtml(errMsg)}</span>`;
        aiStatus.innerHTML = '<span class="status-badge-inline error">Status Info</span>';
      }
    } catch (err) {
      aiResponseOutput.innerHTML = `<span style="color: var(--accent-rose);">❌ Connection error: ${escapeHtml(err.message)}</span>`;
      aiStatus.innerHTML = '<span class="status-badge-inline error">Failed</span>';
    } finally {
      btnAskAi.disabled = false;
      btnAskAi.innerHTML = `
        <svg style="width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        Generate Response (Evon 30B)
      `;
    }
  });

  btnCopyAiResponse.addEventListener('click', () => {
    navigator.clipboard.writeText(aiResponseOutput.textContent);
    showToast('AI response copied to clipboard!');
  });

  btnAiToTts.addEventListener('click', () => {
    ttsTextInput.value = aiResponseOutput.textContent;
    ttsTextInput.scrollIntoView({ behavior: 'smooth' });
    ttsTextInput.focus();
  });

  // TTS Speed display
  timbreSpeedInput.addEventListener('input', (e) => {
    timbreSpeedVal.textContent = `${e.target.value}x`;
  });

  // Text-to-Speech Action (Timbre)
  btnSynthesize.addEventListener('click', async () => {
    const text = ttsTextInput.value.trim();
    if (!text) {
      alert('Please enter or paste text to convert to speech.');
      return;
    }

    btnSynthesize.disabled = true;
    btnSynthesize.innerHTML = '<span class="spinner"></span> Synthesizing with Timbre...';
    ttsWaveform.classList.add('active');
    ttsStatus.innerHTML = '<span class="status-badge-inline info">Generating Audio</span>';

    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: timbreVoiceSelect.value,
          model: timbreModelSelect.value,
          speed: parseFloat(timbreSpeedInput.value)
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        ttsAudioPlayer.src = data.url;
        ttsDownloadLink.href = data.url;
        ttsDownloadLink.download = data.filename;
        ttsPlayerContainer.style.display = 'flex';
        ttsStatus.innerHTML = `<span class="status-badge-inline success">Success • ${data.voice} (${data.model})</span>`;
        ttsAudioPlayer.play().catch(() => {}); // autoplays if user engaged

        addActivityItem({
          type: 'TTS (Timbre)',
          title: `Synthesized speech with ${data.voice}`,
          content: text,
          time: new Date().toLocaleTimeString()
        });
      } else {
        const errMsg = data.error || 'Failed to synthesize speech.';
        ttsStatus.innerHTML = `<span class="status-badge-inline error">Error: ${escapeHtml(errMsg)}</span>`;
      }
    } catch (err) {
      ttsStatus.innerHTML = `<span class="status-badge-inline error">Connection error: ${escapeHtml(err.message)}</span>`;
    } finally {
      btnSynthesize.disabled = false;
      btnSynthesize.innerHTML = `
        <svg style="width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        Convert Text to Speech (Timbre)
      `;
      ttsWaveform.classList.remove('active');
    }
  });

  // Recent Activity Helper
  function addActivityItem(item) {
    sessionHistory.unshift(item);
    renderActivityList();
  }

  function renderActivityList() {
    if (sessionHistory.length === 0) {
      activityList.innerHTML = '<span class="result-placeholder">No activity recorded in this session.</span>';
      return;
    }

    activityList.innerHTML = sessionHistory.map(item => `
      <div class="activity-item">
        <div class="activity-header">
          <span style="font-weight:700; color:var(--accent-purple-light);">${escapeHtml(item.type)}</span>
          <span>${item.time}</span>
        </div>
        <div style="font-weight:600; font-size:0.85rem;">${escapeHtml(item.title)}</div>
        <div class="activity-text">${escapeHtml(item.content)}</div>
      </div>
    `).join('');
  }

  clearHistoryBtn.addEventListener('click', () => {
    sessionHistory = [];
    renderActivityList();
  });

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.backgroundColor = '#8b5cf6';
    toast.style.color = '#fff';
    toast.style.padding = '10px 18px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    toast.style.zIndex = '9999';
    toast.style.fontSize = '0.88rem';
    toast.style.fontWeight = '600';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }
});

