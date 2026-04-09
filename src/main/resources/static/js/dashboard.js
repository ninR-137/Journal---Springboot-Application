const sidebar = document.getElementById('sidebar');
const dashboardShell = document.getElementById('dashboardShell');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const noteForm = document.getElementById('noteForm');
const noteIdInput = noteForm?.querySelector('input[name="noteId"]');
const pageInput = noteForm?.querySelector('input[name="page"]');
const titleInput = noteForm?.querySelector('input[name="title"]');
const contentInput = noteForm?.querySelector('textarea[name="content"]');
const autosaveStatus = document.getElementById('autosaveStatus');
const noteLimitInfo = document.getElementById('noteLimitInfo');
const notesScroll = document.querySelector('.notes-scroll');
const mobileSidebarQuery = window.matchMedia('(max-width: 900px)');
const SIDEBAR_STATE_KEY = 'journalSidebarCollapsed';
let pendingDeleteForm = null;
let autosaveTimer = null;
let autosaveController = null;

function getStoredSidebarState() {
    try {
        const storedValue = window.localStorage.getItem(SIDEBAR_STATE_KEY);
        return storedValue === null ? null : storedValue === 'true';
    } catch (error) {
        return null;
    }
}

function persistSidebarState(collapsed) {
    try {
        window.localStorage.setItem(SIDEBAR_STATE_KEY, String(collapsed));
    } catch (error) {
        // Ignore storage issues and keep the UI usable.
    }
}

function setSidebarCollapsed(collapsed, shouldPersist = true) {
    const isMobile = mobileSidebarQuery.matches;
    document.documentElement.dataset.sidebarState = collapsed ? 'collapsed' : 'expanded';
    sidebar.classList.toggle('collapsed', collapsed);
    dashboardShell.classList.toggle('sidebar-collapsed', collapsed || isMobile);
    sidebarOverlay.classList.toggle('active', isMobile && !collapsed);

    if (shouldPersist) {
        persistSidebarState(collapsed);
    }
}

function toggleSidebar(forceCollapsed) {
    const nextCollapsed = typeof forceCollapsed === 'boolean'
        ? forceCollapsed
        : !sidebar.classList.contains('collapsed');
    setSidebarCollapsed(nextCollapsed);
}

function syncSidebarForViewport(event) {
    const storedState = getStoredSidebarState();
    const nextCollapsed = storedState !== null ? storedState : event.matches;
    setSidebarCollapsed(nextCollapsed, false);
}

const initialSidebarState = getStoredSidebarState();
setSidebarCollapsed(initialSidebarState !== null ? initialSidebarState : mobileSidebarQuery.matches, false);
requestAnimationFrame(() => {
    dashboardShell.classList.add('sidebar-ready');
    sidebarOverlay.classList.add('ready');
});
mobileSidebarQuery.addEventListener('change', syncSidebarForViewport);
updateLimitInfo();

document.querySelectorAll('[data-delete-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        openDeleteModal(form);
    });
});

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
        if (pendingDeleteForm) {
            pendingDeleteForm.submit();
        }
    });
}

if (deleteModal) {
    deleteModal.addEventListener('click', (event) => {
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && deleteModal && !deleteModal.classList.contains('hidden')) {
        closeDeleteModal();
    }
});

if (noteForm && titleInput && contentInput) {
    noteForm.addEventListener('submit', () => {
        window.clearTimeout(autosaveTimer);
        setAutosaveStatus('Saving...', 'saving');
    });

    [titleInput, contentInput].forEach((input) => {
        input.addEventListener('input', queueAutosave);
    });
}

function openDeleteModal(form) {
    pendingDeleteForm = form;
    deleteModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeDeleteModal() {
    pendingDeleteForm = null;
    deleteModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function setAutosaveStatus(message, state = '') {
    if (!autosaveStatus) {
        return;
    }

    autosaveStatus.textContent = message;
    autosaveStatus.className = `autosave-status autosave-status-floating${state ? ` ${state}` : ''}`;
}

function queueAutosave() {
    if (!noteForm || !titleInput || !contentInput) {
        return;
    }

    updateLimitInfo();
    setAutosaveStatus('Unsaved changes');
    window.clearTimeout(autosaveTimer);

    autosaveTimer = window.setTimeout(() => {
        autosaveNote();
    }, 800);
}

async function autosaveNote() {
    if (!noteForm) {
        return;
    }

    const formData = new FormData(noteForm);
    const noteId = noteIdInput?.value?.trim();
    const title = String(formData.get('title') ?? '').trim();
    const content = String(formData.get('content') ?? '');

    if (!noteId && !title && !content.trim()) {
        setAutosaveStatus('Autosave ready');
        return;
    }

    if (autosaveController) {
        autosaveController.abort();
    }

    autosaveController = new AbortController();
    setAutosaveStatus('Saving...', 'saving');

    try {
        const response = await fetch(noteForm.dataset.autosaveUrl, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            signal: autosaveController.signal
        });

        const data = await response.json();
        if (!response.ok || data.success === false) {
            throw new Error(data.message || 'Autosave failed');
        }

        if (data.skipped) {
            setAutosaveStatus('Autosave ready');
            return;
        }

        if (noteIdInput && data.noteId) {
            noteIdInput.value = data.noteId;
        }

        updateBrowserUrl(data.noteId);
        updateSidebarNote(data.noteId, data.title || title, data.content || content);
        updateLimitInfo();
        setAutosaveStatus('Saved', 'saved');
    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }

        setAutosaveStatus(error.message || 'Autosave failed', 'error');
    }
}

function updateLimitInfo() {
    if (!noteLimitInfo || !contentInput) {
        return;
    }

    const limit = Number(contentInput.dataset.maxlength || contentInput.maxLength || 0);
    if (!limit) {
        noteLimitInfo.textContent = '';
        return;
    }

    const used = contentInput.value.length;
    const remaining = limit - used;
    noteLimitInfo.textContent = `${used.toLocaleString()} / ${limit.toLocaleString()} characters`;
    noteLimitInfo.className = 'note-limit-info';

    if (remaining <= 0) {
        noteLimitInfo.classList.add('limit-reached');
    } else if (remaining <= Math.max(200, Math.round(limit * 0.1))) {
        noteLimitInfo.classList.add('warning');
    }
}

function updateBrowserUrl(noteId) {
    if (!noteId) {
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('noteId', noteId);
    url.searchParams.delete('newNote');
    window.history.replaceState({}, '', url);
}

function updateSidebarNote(noteId, title, content) {
    if (!notesScroll || !noteId) {
        return;
    }

    let noteLink = notesScroll.querySelector(`[data-note-id="${noteId}"]`);
    if (!noteLink) {
        noteLink = document.createElement('a');
        noteLink.className = 'note-link active';
        noteLink.dataset.noteId = noteId;
        noteLink.innerHTML = '<div class="note-link-title"></div><div class="note-link-preview"></div>';
        notesScroll.prepend(noteLink);
        notesScroll.querySelector('.empty-sidebar')?.remove();
    }

    const page = pageInput?.value ?? '0';
    noteLink.href = `/dashboard?page=${page}&noteId=${noteId}`;
    noteLink.querySelector('.note-link-title').textContent = title && title.trim() ? title.trim() : 'Untitled note';
    noteLink.querySelector('.note-link-preview').textContent = buildPreview(content);

    notesScroll.querySelectorAll('.note-link').forEach((link) => {
        link.classList.toggle('active', link === noteLink);
    });
}

function buildPreview(content) {
    const text = String(content ?? '').replace(/\s+/g, ' ').trim();
    if (!text) {
        return 'No content yet';
    }
    return text.length > 70 ? `${text.slice(0, 67)}...` : text;
}

