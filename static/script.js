/**
 * VoiceMate AI — Commercial Platform Controller (ElevenLabs/Linear Style)
 * Connects to verified real backend endpoints:
 *   - GET  /api/config-status
 *   - POST /api/transcribe
 *   - POST /api/synthesize
 *   - POST /api/ask
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  /* ------------------------------------------------------------------------
     1. Navigation & View Routing State Machine
     ------------------------------------------------------------------------ */
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const viewPanes = document.querySelectorAll('.content-viewport .view-pane');
  const breadcrumbCurrent = document.getElementById('header-breadcrumb-title');
  const mobileMenuBtn = document.getElementById('btn-toggle-sidebar');
  const sidebar = document.getElementById('app-sidebar');

  const viewTitles = {
    overview: 'Overview',
    studio: 'Speech Studio (STT)',
    assistant: 'AI Assistant (Evon 30B)',
    generator: 'Voice Generator (TTS)',
    history: 'Activity History',
    settings: 'Settings'
  };

  function switchView(targetView) {
    if (!viewTitles[targetView]) targetView = 'overview';

    // Update Nav buttons
    navItems.forEach(item => {
      if (item.dataset.view === targetView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update View Panes
    viewPanes.forEach(pane => {
      if (pane.id === `view-${targetView}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Update Breadcrumb
    breadcrumbCurrent.textContent = viewTitles[targetView];

    // Close mobile drawer if open
    if (sidebar) sidebar.classList.remove('open');

    // Re-render icons if view switched
    if (window.lucide) window.lucide.createIcons();
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      if (view) switchView(view);
    });
  });

  // Data-navigate anchors inside cards
  document.querySelectorAll('[data-navigate]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.navigate;
      if (view) switchView(view);
    });
  });

  // Mobile menu toggle
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Quick action buttons in Hero
  const btnStartVoice = document.getElementById('btn-start-voice-session');
  if (btnStartVoice) {
    btnStartVoice.addEventListener('click', () => switchView('studio'));
  }
  const btnQuickTts = document.getElementById('btn-quick-tts-nav');
  if (btnQuickTts) {
    btnQuickTts.addEventListener('click', () => switchView('generator'));
  }

  /* ------------------------------------------------------------------------
     2. Session Activity Store
     ------------------------------------------------------------------------ */
  let sessionLog = [];

  function addSessionEvent(type, title, preview, status = 'success') {
    const event = {
      id: Date.now(),
      type, // 'stt', 'tts', 'ai'
      title,
      preview: preview || '',
      status,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString()
    };
    sessionLog.unshift(event);
    updateHistoryDisplays();
  }

  function updateHistoryDisplays() {
    // Update badge count
    const badge = document.getElementById('sidebar-history-count');
    if (badge) badge.textContent = sessionLog.length;

    // Update Overview recent preview
    const overviewList = document.getElementById('overview-recent-list');
    if (overviewList) {
      if (sessionLog.length === 0) {
        overviewList.innerHTML = `
          <p style="text-align: center; padding: 32px 0; color: var(--text-tertiary); font-style: italic;">
            No operations recorded yet in this session. Start by transcribing audio or synthesizing speech.
          </p>`;
      } else {
        const top3 = sessionLog.slice(0, 3);
        overviewList.innerHTML = top3.map(item => `
          <div class="history-item-row" style="padding: 12px 0;">
            <div class="history-left">
              <span class="history-badge ${item.type}">${item.type.toUpperCase()}</span>
              <div>
                <div style="font-size: 13.5px; font-weight: 600; color: var(--text-primary);">${escapeHtml(item.title)}</div>
                <div style="font-size: 12px; color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400px;">
                  ${escapeHtml(item.preview)}
                </div>
              </div>
            </div>
            <div style="font-size: 11.5px; color: var(--text-tertiary); font-family: var(--font-mono);">${item.timestamp}</div>
          </div>
        `).join('');
      }
    }

    // Update Full History View
    const fullList = document.getElementById('full-history-list');
    if (fullList) {
      if (sessionLog.length === 0) {
        fullList.innerHTML = `
          <p style="text-align: center; padding: 48px 0; color: var(--text-tertiary); font-style: italic;">
            Activity history is empty. Operations from Speech Studio, Voice Generator, and AI Assistant will be logged here.
          </p>`;
      } else {
        fullList.innerHTML = sessionLog.map(item => `
          <div class="history-item-row">
            <div class="history-left">
              <span class="history-badge ${item.type}">${item.type.toUpperCase()}</span>
              <div>
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">
                  ${escapeHtml(item.title)}
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); max-width: 700px; line-height: 1.5;">
                  ${escapeHtml(item.preview)}
                </div>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <span style="font-size: 11px; padding: 2px 8px; border-radius: var(--radius-full); background: rgba(16, 185, 129, 0.12); color: var(--accent-emerald); font-weight: 600;">
                ${item.status.toUpperCase()}
              </span>
              <div style="font-size: 11.5px; color: var(--text-tertiary); font-family: var(--font-mono); margin-top: 4px;">
                ${item.timestamp}
              </div>
            </div>
          </div>
        `).join('');
      }
    }
  }

  const btnClearHistory = document.getElementById('btn-clear-all-history');
  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
      sessionLog = [];
      updateHistoryDisplays();
      showToast('Session history cleared');
    });
  }

  /* ------------------------------------------------------------------------
     3. API Connectivity & Configuration Detection
     ------------------------------------------------------------------------ */
  async function loadConfigStatus() {
    const sidebarDot = document.getElementById('sidebar-status-dot');
    const sidebarText = document.getElementById('sidebar-status-text');
    const headerPill = document.getElementById('header-api-pill');
    const headerStatusLabel = document.getElementById('header-api-status-label');
    const settingsAuthDot = document.getElementById('settings-auth-dot');
    const settingsAuthText = document.getElementById('settings-auth-text');
    const overviewPrismaBadge = document.getElementById('overview-prisma-badge');
    const overviewTimbreBadge = document.getElementById('overview-timbre-badge');
    const overviewEvonBadge = document.getElementById('overview-evon-badge');

    try {
      const res = await fetch('/api/config-status');
      const data = await res.json();

      if (data.gnani_api_key_configured) {
        // Connected state
        sidebarDot.classList.add('active');
        sidebarText.textContent = 'Gnani API Connected';

        headerPill.classList.add('connected');
        headerStatusLabel.textContent = 'API Gateway: Online';

        if (settingsAuthDot) settingsAuthDot.classList.add('active');
        if (settingsAuthText) settingsAuthText.textContent = 'Authenticated (GNANI_API_KEY Active in .env)';

        // Prisma Badge
        if (overviewPrismaBadge) {
          overviewPrismaBadge.className = 'model-status-tag connected';
          overviewPrismaBadge.innerHTML = '<span class="status-dot active"></span> Live (api.vachana.ai)';
        }

        // Timbre Badge
        if (overviewTimbreBadge) {
          overviewTimbreBadge.className = 'model-status-tag connected';
          overviewTimbreBadge.innerHTML = '<span class="status-dot active"></span> Live (api.vachana.ai)';
        }
      } else {
        // Missing key state
        sidebarDot.classList.remove('active');
        sidebarText.textContent = 'API Key Missing';

        headerPill.classList.remove('connected');
        headerStatusLabel.textContent = 'API Key Required in .env';

        if (settingsAuthDot) settingsAuthDot.classList.remove('active');
        if (settingsAuthText) settingsAuthText.textContent = 'Missing API Key in .env file';

        if (overviewPrismaBadge) {
          overviewPrismaBadge.className = 'model-status-tag missing';
          overviewPrismaBadge.innerHTML = '<span class="status-dot"></span> Missing Key';
        }
        if (overviewTimbreBadge) {
          overviewTimbreBadge.className = 'model-status-tag missing';
          overviewTimbreBadge.innerHTML = '<span class="status-dot"></span> Missing Key';
        }
      }

      // AI Assistant State
      const aiInfo = data.models && data.models.ai_assistant;
      const aiConnected = aiInfo && aiInfo.status.includes('Ready');
      if (overviewEvonBadge) {
        if (aiConnected) {
          overviewEvonBadge.className = 'model-status-tag connected';
          overviewEvonBadge.innerHTML = `<span class="status-dot active"></span> Live (${aiInfo.provider || 'Groq'})`;
          const endpointSmall = document.getElementById('overview-evon-endpoint');
          if (endpointSmall) endpointSmall.textContent = `Model: ${aiInfo.model || 'Groq'}`;
        } else {
          overviewEvonBadge.className = 'model-status-tag missing';
          overviewEvonBadge.innerHTML = '<span class="status-dot"></span> Missing API Key';
        }
      }

    } catch (err) {
      console.error('Config fetch failed:', err);
      sidebarText.textContent = 'Gateway Offline';
      headerStatusLabel.textContent = 'API Unreachable';
    }
  }

  loadConfigStatus();

  /* ------------------------------------------------------------------------
     4. Speech Studio (Gnani Prisma STT)
     ------------------------------------------------------------------------ */
  const studioAudioInput = document.getElementById('studio-audio-input');
  const studioDropzone = document.getElementById('studio-dropzone');
  const studioFileCard = document.getElementById('studio-file-card');
  const studioFileName = document.getElementById('studio-file-name');
  const studioFileSize = document.getElementById('studio-file-size');
  const studioRemoveFileBtn = document.getElementById('btn-studio-remove-file');
  const studioPreviewContainer = document.getElementById('studio-audio-preview-container');
  const studioAudioPreview = document.getElementById('studio-audio-preview');

  const studioModelSelect = document.getElementById('studio-model');
  const studioLangSelect = document.getElementById('studio-lang');
  const studioFormatSelect = document.getElementById('studio-format');
  const studioKeytermsInput = document.getElementById('studio-keyterms');
  const btnStudioTranscribe = document.getElementById('btn-studio-transcribe');

  const studioTranscriptDisplay = document.getElementById('studio-transcript-display');
  const studioTranscriptEdit = document.getElementById('studio-transcript-edit');
  const studioResultDot = document.getElementById('studio-result-dot');
  const studioResultStatusText = document.getElementById('studio-result-status-text');
  const studioResultMeta = document.getElementById('studio-result-meta');

  const btnStudioToggleEdit = document.getElementById('btn-studio-toggle-edit');
  const btnStudioRevert = document.getElementById('btn-studio-revert');
  const btnStudioCopy = document.getElementById('btn-studio-copy');
  const btnStudioDownload = document.getElementById('btn-studio-download');
  const btnStudioToAi = document.getElementById('btn-studio-to-ai');
  const btnStudioToTts = document.getElementById('btn-studio-to-tts');

  let selectedAudioFile = null;
  let rawApiTranscription = '';
  let isEditingTranscript = false;

  // Drag and drop events
  ['dragenter', 'dragover'].forEach(name => {
    studioDropzone.addEventListener(name, (e) => {
      e.preventDefault();
      studioDropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    studioDropzone.addEventListener(name, (e) => {
      e.preventDefault();
      studioDropzone.classList.remove('drag-active');
    });
  });

  studioDropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) setStudioAudioFile(files[0]);
  });

  studioDropzone.addEventListener('click', () => {
    studioAudioInput.click();
  });

  studioAudioInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) setStudioAudioFile(e.target.files[0]);
  });

  function setStudioAudioFile(file) {
    const valid = ['wav', 'mp3', 'ogg', 'flac', 'm4a', 'webm'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!valid.includes(ext)) {
      alert(`Invalid format: .${ext}. Please provide a WAV, MP3, OGG, FLAC, M4A, or WEBM audio file.`);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('File exceeds maximum size of 25 MB.');
      return;
    }

    selectedAudioFile = file;
    studioFileName.textContent = file.name;
    studioFileSize.textContent = formatBytes(file.size);
    studioFileCard.style.display = 'flex';
    btnStudioTranscribe.disabled = false;

    // Object URL for audio preview player
    const objectUrl = URL.createObjectURL(file);
    studioAudioPreview.src = objectUrl;
    studioPreviewContainer.style.display = 'block';

    studioResultStatusText.textContent = 'Audio ready for transcription';
    studioResultDot.style.background = 'var(--accent-cyan)';
    if (window.lucide) window.lucide.createIcons();
  }

  studioRemoveFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedAudioFile = null;
    studioAudioInput.value = '';
    studioFileCard.style.display = 'none';
    studioPreviewContainer.style.display = 'none';
    studioAudioPreview.src = '';
    btnStudioTranscribe.disabled = true;
    studioResultStatusText.textContent = 'Awaiting audio input';
    studioResultDot.style.background = 'var(--text-tertiary)';
  });

  btnStudioTranscribe.addEventListener('click', async () => {
    if (!selectedAudioFile) return;

    btnStudioTranscribe.disabled = true;
    btnStudioTranscribe.innerHTML = `<span class="spinner-linear"></span><span>Transcribing with Prisma...</span>`;
    
    studioResultDot.style.background = 'var(--accent-amber)';
    studioResultStatusText.textContent = 'Streaming audio to Gnani Prisma API...';
    studioTranscriptDisplay.className = 'transcript-viewport';
    studioTranscriptDisplay.textContent = 'Transcribing audio...';

    studioTranscriptEdit.style.display = 'none';
    studioTranscriptDisplay.style.display = 'block';
    isEditingTranscript = false;
    btnStudioToggleEdit.style.display = 'none';
    btnStudioRevert.style.display = 'none';

    const formData = new FormData();
    formData.append('audio', selectedAudioFile);
    formData.append('model', studioModelSelect.value);
    formData.append('language_code', studioLangSelect.value);
    formData.append('format', studioFormatSelect.value);
    if (studioKeytermsInput.value.trim()) {
      formData.append('keyterms', studioKeytermsInput.value.trim());
    }

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        rawApiTranscription = data.transcript || '(No speech recognized)';
        studioTranscriptDisplay.textContent = rawApiTranscription;
        studioTranscriptEdit.value = rawApiTranscription;

        const lang = data.detected_language ? data.detected_language.toUpperCase() : 'DETECTED';
        studioResultDot.style.background = 'var(--accent-emerald)';
        studioResultStatusText.textContent = `Completed • ${data.model} [${lang}]`;
        
        studioResultMeta.textContent = `Latency: ${data.end_to_end_latency ? data.end_to_end_latency.toFixed(2) + 's' : 'Realtime'} • Bytes: ${formatBytes(data.file_size_bytes)}`;

        // Reveal actions
        btnStudioToggleEdit.style.display = 'inline-flex';
        btnStudioCopy.style.display = 'inline-flex';
        btnStudioDownload.style.display = 'inline-flex';
        btnStudioToAi.style.display = 'inline-flex';
        btnStudioToTts.style.display = 'inline-flex';

        addSessionEvent('stt', `Transcribed ${selectedAudioFile.name}`, rawApiTranscription, 'success');
      } else {
        const err = data.error || 'Transcription failed.';
        studioResultDot.style.background = 'var(--accent-rose)';
        studioResultStatusText.textContent = 'Prisma Error';
        studioTranscriptDisplay.innerHTML = `<span style="color: var(--accent-rose);">Error: ${escapeHtml(err)}</span>`;
        studioResultMeta.textContent = `Status: ${data.status_code || 400}`;
      }
    } catch (err) {
      studioResultDot.style.background = 'var(--accent-rose)';
      studioResultStatusText.textContent = 'Network Error';
      studioTranscriptDisplay.innerHTML = `<span style="color: var(--accent-rose);">Network error communicating with server: ${escapeHtml(err.message)}</span>`;
    } finally {
      btnStudioTranscribe.disabled = false;
      btnStudioTranscribe.innerHTML = `<i data-lucide="sparkles" style="width: 15px; height: 15px;"></i><span>Transcribe Audio with Prisma</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Edit / Revert Toggle
  btnStudioToggleEdit.addEventListener('click', () => {
    isEditingTranscript = !isEditingTranscript;
    if (isEditingTranscript) {
      studioTranscriptEdit.value = studioTranscriptDisplay.textContent;
      studioTranscriptDisplay.style.display = 'none';
      studioTranscriptEdit.style.display = 'block';
      studioTranscriptEdit.focus();
      btnStudioToggleEdit.innerHTML = `<i data-lucide="check" style="width:13px;height:13px;"></i><span>Save</span>`;
      btnStudioRevert.style.display = 'inline-flex';
    } else {
      studioTranscriptDisplay.textContent = studioTranscriptEdit.value;
      studioTranscriptEdit.style.display = 'none';
      studioTranscriptDisplay.style.display = 'block';
      btnStudioToggleEdit.innerHTML = `<i data-lucide="edit-3" style="width:13px;height:13px;"></i><span>Edit</span>`;
      if (studioTranscriptDisplay.textContent !== rawApiTranscription) {
        studioResultStatusText.textContent = 'Edited (Original Preserved)';
        btnStudioRevert.style.display = 'inline-flex';
      } else {
        btnStudioRevert.style.display = 'none';
      }
    }
    if (window.lucide) window.lucide.createIcons();
  });

  btnStudioRevert.addEventListener('click', () => {
    studioTranscriptDisplay.textContent = rawApiTranscription;
    studioTranscriptEdit.value = rawApiTranscription;
    if (isEditingTranscript) {
      studioTranscriptEdit.style.display = 'none';
      studioTranscriptDisplay.style.display = 'block';
      isEditingTranscript = false;
      btnStudioToggleEdit.innerHTML = `<i data-lucide="edit-3" style="width:13px;height:13px;"></i><span>Edit</span>`;
    }
    btnStudioRevert.style.display = 'none';
    studioResultStatusText.textContent = 'Reverted to API Output';
    showToast('Reverted to original Prisma API transcription');
    if (window.lucide) window.lucide.createIcons();
  });

  function getActiveStudioTranscript() {
    return isEditingTranscript ? studioTranscriptEdit.value : studioTranscriptDisplay.textContent;
  }

  btnStudioCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(getActiveStudioTranscript());
    showToast('Copied transcript to clipboard');
  });

  btnStudioDownload.addEventListener('click', () => {
    const text = getActiveStudioTranscript();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded transcript file');
  });

  btnStudioToAi.addEventListener('click', () => {
    const text = getActiveStudioTranscript();
    if (!text) return;
    switchView('assistant');
    const chatInput = document.getElementById('chat-user-input');
    if (chatInput) {
      chatInput.value = text;
      chatInput.focus();
    }
  });

  btnStudioToTts.addEventListener('click', () => {
    const text = getActiveStudioTranscript();
    if (!text) return;
    switchView('generator');
    const ttsInput = document.getElementById('tts-text-input');
    if (ttsInput) {
      ttsInput.value = text;
      updateTtsCharCounter();
      ttsInput.focus();
    }
  });

  /* ------------------------------------------------------------------------
     5. AI Assistant (Conversational Assistant + Voice Response System)
     ------------------------------------------------------------------------ */
  const chatThread = document.getElementById('chat-thread');
  const chatEmptyState = document.getElementById('chat-empty-state');
  const chatUserInput = document.getElementById('chat-user-input');
  const btnChatSend = document.getElementById('btn-chat-send');
  const btnChatClear = document.getElementById('btn-chat-clear');
  
  // Specific IDs requested by user
  const voiceResponsesToggle = document.getElementById('voice-responses-toggle') || document.getElementById('chk-voice-responses');
  const voiceAutoplayToggle = document.getElementById('voice-autoplay-toggle') || document.getElementById('chk-auto-play');
  const voiceSpeakerSelect = document.getElementById('voice-speaker-select') || document.getElementById('composer-voice-select');

  // Load and persist user voice preferences via localStorage
  const PREF_KEY_VOICE_RESPONSES = 'voicemate_pref_voice_responses';
  const PREF_KEY_AUTO_PLAY = 'voicemate_pref_auto_play';
  const PREF_KEY_VOICE = 'voicemate_pref_voice';

  if (voiceResponsesToggle) {
    const savedVoicePref = localStorage.getItem(PREF_KEY_VOICE_RESPONSES);
    if (savedVoicePref !== null) {
      voiceResponsesToggle.checked = savedVoicePref === 'true';
    }
    voiceResponsesToggle.addEventListener('change', () => {
      localStorage.setItem(PREF_KEY_VOICE_RESPONSES, voiceResponsesToggle.checked);
    });
  }

  if (voiceAutoplayToggle) {
    const savedAutoPlay = localStorage.getItem(PREF_KEY_AUTO_PLAY);
    if (savedAutoPlay !== null) {
      voiceAutoplayToggle.checked = savedAutoPlay === 'true';
    }
    voiceAutoplayToggle.addEventListener('change', () => {
      localStorage.setItem(PREF_KEY_AUTO_PLAY, voiceAutoplayToggle.checked);
    });
  }

  if (voiceSpeakerSelect) {
    const savedVoice = localStorage.getItem(PREF_KEY_VOICE);
    if (savedVoice) {
      voiceSpeakerSelect.value = savedVoice;
    }
    voiceSpeakerSelect.addEventListener('change', () => {
      localStorage.setItem(PREF_KEY_VOICE, voiceSpeakerSelect.value);
    });
  }

  // Conversational history state (array of {role: 'user'|'assistant', content: string})
  let chatHistory = [];
  let currentlyPlayingAudio = null;

  // Suggestion card clicks
  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      if (prompt) {
        chatUserInput.value = prompt;
        chatUserInput.focus();
      }
    });
  });

  btnChatSend.addEventListener('click', () => dispatchChatMessage());

  chatUserInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      dispatchChatMessage();
    }
  });

  async function dispatchChatMessage() {
    const prompt = chatUserInput.value.trim();
    if (!prompt) return;

    if (chatEmptyState) chatEmptyState.style.display = 'none';

    // Append User Bubble and track in conversation history
    appendChatMessage('user', prompt);
    chatHistory.push({ role: 'user', content: prompt });
    chatUserInput.value = '';

    // Append AI Message Container with initial thinking state
    const aiBubbleId = `ai-msg-${Date.now()}`;
    appendChatMessage('ai', 'Thinking...', aiBubbleId, true);

    btnChatSend.disabled = true;
    btnChatSend.innerHTML = `<span class="spinner-linear"></span><span>Thinking...</span>`;

    const shouldGenerateVoice = voiceResponsesToggle ? voiceResponsesToggle.checked : true;
    const shouldAutoPlay = voiceAutoplayToggle ? voiceAutoplayToggle.checked : true;
    const selectedVoice = voiceSpeakerSelect ? voiceSpeakerSelect.value : 'Avinash';

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history: chatHistory.slice(0, -1), // send previous turns for conversational continuity
          generate_voice: shouldGenerateVoice,
          voice: selectedVoice
        })
      });

      const data = await res.json();
      const bubbleEl = document.getElementById(aiBubbleId);

      if (res.ok && data.success) {
        const textResponse = data.response;
        // Track assistant answer in conversation context
        chatHistory.push({ role: 'assistant', content: textResponse });

        if (bubbleEl) {
          bubbleEl.style.color = 'var(--text-primary)';
          bubbleEl.textContent = textResponse;

          // If voice was requested, render interactive voice answer controls directly below the text bubble
          if (shouldGenerateVoice) {
            const messageContainer = bubbleEl.closest('.chat-message') || bubbleEl.parentElement;
            if (data.audio && data.audio.url) {
              renderVoiceAnswerPlayer(messageContainer, data.audio.url, data.audio.voice || selectedVoice, shouldAutoPlay);
            } else if (data.audio && data.audio.error) {
              const errBadge = document.createElement('div');
              errBadge.className = 'voice-generating-indicator';
              errBadge.style.color = 'var(--accent-rose)';
              errBadge.style.borderColor = 'rgba(244, 63, 94, 0.3)';
              errBadge.style.background = 'rgba(244, 63, 94, 0.1)';
              errBadge.innerHTML = `<i data-lucide="alert-circle" style="width:12px;height:12px;"></i><span>Voice synthesis error: ${escapeHtml(data.audio.error)}</span>`;
              messageContainer.appendChild(errBadge);
            }
          }
        }
        addSessionEvent('ai', `Prompt: "${prompt.slice(0, 36)}..."`, textResponse, 'success');
      } else {
        const errMsg = data.error || 'AI Assistant inference error.';
        if (bubbleEl) {
          bubbleEl.innerHTML = `
            <div style="color: var(--accent-rose); font-weight: 600; margin-bottom: 4px;">Assistant Error</div>
            <div style="color: var(--text-secondary); line-height: 1.5;">${escapeHtml(errMsg)}</div>
          `;
        }
        addSessionEvent('ai', `Prompt: "${prompt.slice(0, 36)}..."`, errMsg, 'error');
      }
    } catch (err) {
      const bubbleEl = document.getElementById(aiBubbleId);
      if (bubbleEl) {
        bubbleEl.innerHTML = `<span style="color: var(--accent-rose);">Error communicating with AI assistant route: ${escapeHtml(err.message)}</span>`;
      }
    } finally {
      btnChatSend.disabled = false;
      btnChatSend.innerHTML = `<i data-lucide="send" style="width: 14px; height: 14px;"></i><span>Send</span>`;
      if (window.lucide) window.lucide.createIcons();
      chatThread.scrollTop = chatThread.scrollHeight;
    }
  }

  function renderVoiceAnswerPlayer(parentBubble, audioUrl, voiceName, allowAutoPlay = true) {
    const playerCard = document.createElement('div');
    playerCard.className = 'ai-voice-player-card';

    const audioObj = new Audio(audioUrl);

    playerCard.innerHTML = `
      <div class="ai-voice-header">
        <span style="display:flex; align-items:center; gap:6px;">
          <i data-lucide="volume-2" style="width:13px;height:13px;color:var(--accent-primary);"></i>
          <span>Voice Response (${voiceName} • Timbre)</span>
        </span>
        <span class="voice-audio-status" style="font-size:11px; color:var(--accent-emerald);">Voice Ready</span>
      </div>
      <div class="ai-voice-controls">
        <button class="btn-voice-ctrl" title="Play Voice Response">
          <i data-lucide="play" style="width:14px;height:14px;"></i>
        </button>
        <button class="btn-ghost btn-replay-ctrl" title="Replay Voice Response" style="padding: 6px 8px; border-radius: 50%; width: 30px; height: 30px;">
          <i data-lucide="rotate-ccw" style="width:13px;height:13px;"></i>
        </button>
        <div class="voice-progress-container">
          <div class="voice-progress-bar">
            <div class="voice-progress-fill"></div>
          </div>
          <div class="voice-time-display">
            <span class="time-curr">0:00</span>
            <span class="time-dur">0:00</span>
          </div>
        </div>
      </div>
    `;

    parentBubble.appendChild(playerCard);

    const playBtn = playerCard.querySelector('.btn-voice-ctrl');
    const replayBtn = playerCard.querySelector('.btn-replay-ctrl');
    const statusText = playerCard.querySelector('.voice-audio-status');
    const progressBar = playerCard.querySelector('.voice-progress-bar');
    const progressFill = playerCard.querySelector('.voice-progress-fill');
    const timeCurr = playerCard.querySelector('.time-curr');
    const timeDur = playerCard.querySelector('.time-dur');

    function formatSecs(s) {
      if (!s || isNaN(s)) return '0:00';
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    }

    audioObj.addEventListener('loadedmetadata', () => {
      timeDur.textContent = formatSecs(audioObj.duration);
    });

    audioObj.addEventListener('timeupdate', () => {
      if (audioObj.duration) {
        const pct = (audioObj.currentTime / audioObj.duration) * 100;
        progressFill.style.width = `${pct}%`;
        timeCurr.textContent = formatSecs(audioObj.currentTime);
      }
    });

    audioObj.addEventListener('ended', () => {
      playBtn.innerHTML = `<i data-lucide="play" style="width:14px;height:14px;"></i>`;
      statusText.textContent = 'Voice Finished';
      if (window.lucide) window.lucide.createIcons();
    });

    audioObj.addEventListener('play', () => {
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audioObj) {
        currentlyPlayingAudio.pause();
      }
      currentlyPlayingAudio = audioObj;
      playBtn.innerHTML = `<i data-lucide="pause" style="width:14px;height:14px;"></i>`;
      statusText.textContent = 'Speaking...';
      if (window.lucide) window.lucide.createIcons();
    });

    audioObj.addEventListener('pause', () => {
      if (!audioObj.ended) {
        playBtn.innerHTML = `<i data-lucide="play" style="width:14px;height:14px;"></i>`;
        statusText.textContent = 'Paused';
        if (window.lucide) window.lucide.createIcons();
      }
    });

    playBtn.addEventListener('click', () => {
      if (audioObj.paused || audioObj.ended) {
        if (audioObj.ended) audioObj.currentTime = 0;
        audioObj.play().catch(e => {
          console.warn('Audio playback blocked:', e);
          statusText.textContent = 'Click to Play';
        });
      } else {
        audioObj.pause();
      }
    });

    replayBtn.addEventListener('click', () => {
      audioObj.currentTime = 0;
      audioObj.play().catch(e => console.warn('Replay playback blocked:', e));
    });

    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      if (audioObj.duration) {
        audioObj.currentTime = pos * audioObj.duration;
      }
    });

    // Auto-play handling with fallback
    if (allowAutoPlay) {
      statusText.textContent = 'Autoplaying Voice...';
      audioObj.play().catch(() => {
        // Autoplay blocked by browser policy
        statusText.textContent = 'Voice Ready • Click to Play';
        playBtn.innerHTML = `<i data-lucide="play" style="width:14px;height:14px;"></i>`;
        if (window.lucide) window.lucide.createIcons();
      });
    } else {
      statusText.textContent = 'Voice Ready • Click to Play';
    }

    if (window.lucide) window.lucide.createIcons();
  }

  function appendChatMessage(sender, content, id = null, isPending = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;

    const msgRow = document.createElement('div');
    msgRow.className = 'chat-message-row';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? 'U' : 'E';

    // Bubble holds the text content
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    if (id) bubble.id = id;
    if (isPending) bubble.style.color = 'var(--text-tertiary)';
    bubble.textContent = content;

    msgRow.appendChild(avatar);
    msgRow.appendChild(bubble);
    msgDiv.appendChild(msgRow);
    chatThread.appendChild(msgDiv);
    chatThread.scrollTop = chatThread.scrollHeight;
    return msgDiv;
  }

  if (btnChatClear) {
    btnChatClear.addEventListener('click', () => {
      if (currentlyPlayingAudio) {
        currentlyPlayingAudio.pause();
        currentlyPlayingAudio = null;
      }
      chatHistory = [];
      chatThread.innerHTML = '';
      if (chatEmptyState) {
        chatThread.appendChild(chatEmptyState);
        chatEmptyState.style.display = 'block';
      }
      showToast('Cleared conversation history');
    });
  }

  /* ------------------------------------------------------------------------
     6. Voice Generator (Gnani Timbre TTS)
     ------------------------------------------------------------------------ */
  const ttsTextInput = document.getElementById('tts-text-input');
  const ttsCharCounter = document.getElementById('tts-char-counter');
  const ttsModelSelect = document.getElementById('tts-model-select');
  const ttsSpeedSlider = document.getElementById('tts-speed-slider');
  const ttsSpeedLabel = document.getElementById('tts-speed-label');
  const voiceCatalogGrid = document.getElementById('voice-catalog-grid');
  const btnGenerateSpeech = document.getElementById('btn-generate-speech');

  const ttsPlayerPlaceholder = document.getElementById('tts-player-placeholder');
  const ttsActiveAudioBox = document.getElementById('tts-active-audio-box');
  const ttsAudioElement = document.getElementById('tts-audio-element');
  const btnDownloadTtsAudio = document.getElementById('btn-download-tts-audio');
  const metaTtsVoice = document.getElementById('meta-tts-voice');

  // Timbre v3.0 & v2.5 Voice Catalog
  const voiceCatalog = [
    { name: 'Avinash', lang: 'English / Multilingual', gender: 'M', default: true },
    { name: 'Chetana', lang: 'English / Multilingual', gender: 'F' },
    { name: 'Lakshmi', lang: 'English / Multilingual', gender: 'F' },
    { name: 'Devansh', lang: 'English / Multilingual', gender: 'M' },
    { name: 'Prakash', lang: 'English / Multilingual', gender: 'M' },
    { name: 'Shivani', lang: 'English / Multilingual', gender: 'F' },
    { name: 'Pranav', lang: 'Standard (v2.5)', gender: 'M' },
    { name: 'Nalini', lang: 'Standard (v2.5)', gender: 'F' }
  ];

  let selectedVoice = 'Avinash';

  function renderVoiceCatalog() {
    if (!voiceCatalogGrid) return;
    voiceCatalogGrid.innerHTML = voiceCatalog.map(v => `
      <div class="voice-card ${v.name === selectedVoice ? 'selected' : ''}" data-voice="${v.name}">
        <div class="voice-card-left">
          <div class="voice-avatar-dot">${v.gender}</div>
          <div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${v.name}</div>
            <div style="font-size: 11px; color: var(--text-tertiary);">${v.lang}</div>
          </div>
        </div>
        ${v.name === selectedVoice ? '<i data-lucide="check" style="width:14px;height:14px;color:var(--accent-primary);"></i>' : ''}
      </div>
    `).join('');

    voiceCatalogGrid.querySelectorAll('.voice-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedVoice = card.dataset.voice;
        if (metaTtsVoice) metaTtsVoice.textContent = selectedVoice;
        renderVoiceCatalog();
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  renderVoiceCatalog();

  function updateTtsCharCounter() {
    if (ttsCharCounter && ttsTextInput) {
      ttsCharCounter.textContent = `${ttsTextInput.value.length} characters`;
    }
  }

  if (ttsTextInput) {
    ttsTextInput.addEventListener('input', updateTtsCharCounter);
  }

  if (ttsSpeedSlider) {
    ttsSpeedSlider.addEventListener('input', (e) => {
      if (ttsSpeedLabel) ttsSpeedLabel.textContent = `${e.target.value}x`;
    });
  }

  if (btnGenerateSpeech) {
    btnGenerateSpeech.addEventListener('click', async () => {
      const text = ttsTextInput.value.trim();
      if (!text) {
        alert('Please enter text to synthesize into speech.');
        return;
      }

      btnGenerateSpeech.disabled = true;
      btnGenerateSpeech.innerHTML = `<span class="spinner-linear"></span><span>Synthesizing with Timbre...</span>`;

      try {
        const response = await fetch('/api/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: selectedVoice,
            model: ttsModelSelect.value,
            speed: parseFloat(ttsSpeedSlider.value)
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          ttsPlayerPlaceholder.style.display = 'none';
          ttsActiveAudioBox.style.display = 'block';

          ttsAudioElement.src = data.url;
          btnDownloadTtsAudio.href = data.url;
          btnDownloadTtsAudio.download = data.filename;

          ttsAudioElement.play().catch(() => {});

          addSessionEvent('tts', `Synthesized speech (${data.voice})`, text, 'success');
          showToast(`Generated speech with ${data.voice}`);
        } else {
          alert('Timbre Error: ' + (data.error || 'Speech synthesis failed.'));
        }
      } catch (err) {
        alert('Network error connecting to Timbre endpoint: ' + err.message);
      } finally {
        btnGenerateSpeech.disabled = false;
        btnGenerateSpeech.innerHTML = `<i data-lucide="play-circle" style="width: 16px; height: 16px;"></i><span>Synthesize Speech (Timbre)</span>`;
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  /* ------------------------------------------------------------------------
     7. Utilities & Toast Notifications
     ------------------------------------------------------------------------ */
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(msg) {
    const existing = document.getElementById('app-active-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'app-active-toast';
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 28px;
      background: var(--surface-main);
      border: 1px solid var(--border-focus);
      color: var(--text-primary);
      padding: 10px 18px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 500;
      box-shadow: var(--shadow-lg);
      z-index: 9999;
      animation: fadeIn 150ms ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  }
});
