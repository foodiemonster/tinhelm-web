// ScaffoldingAgent: initial script for Tin Helm Web
// This will serve as the entry point for future game logic

document.addEventListener('DOMContentLoaded', () => {
    console.log('Tin Helm Web scaffold loaded');

    updateUIFromState();

    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');

    if (!supportsLocalStorage()) {
        if (saveBtn) saveBtn.disabled = true;
        if (loadBtn) loadBtn.disabled = true;
        return;
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveGame();
            if (loadBtn) loadBtn.disabled = false;
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            if (!loadGame()) {
                alert('No saved game found.');
            }
        });
        if (!localStorage.getItem('tinhelm-save')) {
            loadBtn.disabled = true;
        }
    }
});
