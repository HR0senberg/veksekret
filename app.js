// ============================================
// PROJECT 1430 - GAME APPLICATION
// Interactive narrative about G.V. Kisunko
// ============================================

// CSS теперь подключается из styles.css (без инъекции через JavaScript)

window.addEventListener('DOMContentLoaded', () => {

    // Stable viewport unit for mobile browsers (prevents 100vh jumps when address bar shows/hides)
    const setVhUnit = () => {
        document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
    };
    setVhUnit();
    window.addEventListener('resize', setVhUnit);
    window.addEventListener('orientationchange', setVhUnit);

    // Глобальные горячие клавиши (помогает на защите): справка, Esc и т.п.
    initGlobalShortcuts();

    // Справка/управление (кнопка ❔ и клавиши H / ?)
    initHelpOverlay();

    const title = document.getElementById('titleTypewriter');
    const introTypewriter = typeWriter(title, 'ПРОЕКТ ПОЛУВЕКОВОЙ СЕКРЕТ', 150);
    initIntroSkip(introTypewriter);

    // Восстанавливаем настройки звука (localStorage)
    SoundManager.loadSettings();

    // Компактная панель звука: по умолчанию свернута и раскрывается по нажатию.
    initSoundPanel();

    // «Читать далее» для исторических фактов в полигоне
    initFactReadMore();

    SoundManager.play('menu');
    initKeyboardNavigation();
    // Автосейв квеста: обновляем кнопку "Продолжить" в меню
    updateQuestMenuButtons();
});

/**
 * Делает панель звука компактной: показывает только иконку,
 * а настройки раскрываются по нажатию.
 */


/**
 * Позволяет пропустить заставку (typewriter + задержку появления кнопок)
 * кликом или клавишей Enter/Space — удобно на защите.
 */
function initIntroSkip(typewriterController) {
    const loading = document.getElementById('loadingScreen');
    if (!loading) return;

    const menuButtons = document.getElementById('menuButtons');

    // Добавляем ненавязчивую подсказку (создаём динамически, чтобы не трогать HTML)
    let hint = document.getElementById('skipHint');
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'skipHint';
        hint.className = 'skip-hint';
        hint.textContent = '⏩ Нажмите Enter или кликните, чтобы пропустить';
        loading.appendChild(hint);

        // Появляется чуть позже, чтобы не отвлекать от эффекта печати
        setTimeout(() => {
            if (!loading.classList.contains('hidden')) {
                hint.classList.add('is-visible');
            }
        }, 1600);
    }

    const skip = () => {
        if (loading.classList.contains('hidden')) return;
        loading.classList.add('is-skipped');
        hint.classList.remove('is-visible');

        // Мгновенно допечатываем заголовок
        if (typewriterController && typeof typewriterController.finish === 'function') {
            typewriterController.finish();
        }

        // Снимаем задержки появления элементов (подстраховка)
        const subtitle = loading.querySelector('.subtitle-loading');
        if (subtitle) {
            subtitle.style.opacity = '1';
            subtitle.style.animation = 'none';
        }
        if (menuButtons) {
            menuButtons.style.opacity = '1';
            menuButtons.style.animation = 'none';
        }
    };

    // Клик по фону — пропуск. Клик по кнопке меню оставляем как есть.
    loading.addEventListener('click', (e) => {
        const isButton = e.target && e.target.closest && e.target.closest('button');
        if (isButton) return;
        skip();
    });

    // Enter/Space — пропуск
    document.addEventListener('keydown', (e) => {
        if (loading.classList.contains('hidden')) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            skip();
        }
    });
}
function initSoundPanel() {
    const controls = document.getElementById('soundControls') || document.querySelector('.sound-controls');
    if (!controls) return;

    const toggleBtn = document.getElementById('soundPanelToggle') || controls.querySelector('.sound-panel-toggle');
    const body = document.getElementById('soundPanelBody') || controls.querySelector('.sound-panel-body');

    // Если разметка старая — не ломаем, просто выходим.
    if (!toggleBtn || !body) return;

    // Свернуто по умолчанию
    controls.classList.remove('is-open');
    body.setAttribute('aria-hidden', 'true');

    const setOpen = (open) => {
        controls.classList.toggle('is-open', open);
        body.setAttribute('aria-hidden', open ? 'false' : 'true');
    };

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = controls.classList.contains('is-open');
        setOpen(!open);
    });

    // Клики внутри раскрытой панели не должны закрывать её
    body.addEventListener('click', (e) => e.stopPropagation());

    // Клик вне панели — сворачиваем
    document.addEventListener('click', (e) => {
        if (!controls.contains(e.target)) setOpen(false);
    });

    // Обновляем иконку в зависимости от состояния звука
    updateSoundPanelIcon();
    updateSoundToggleText();

    // Синхронизируем ползунок громкости с сохранённым значением
    const slider = controls.querySelector('.volume-slider');
    if (slider) {
        slider.value = String(Math.round(SoundManager.volume * 100));
        // Обновляем подпись (и ещё раз выставляем громкость на текущий трек)
        changeVolume(slider.value);
    }
}

function updateSoundPanelIcon() {
    const toggleBtn = document.getElementById('soundPanelToggle');
    if (!toggleBtn) return;
    toggleBtn.textContent = SoundManager.enabled ? '🔊' : '🔇';
}

function updateSoundToggleText() {
    const btn = document.getElementById('soundBtn');
    if (!btn) return;
    btn.innerHTML = SoundManager.enabled ? '🔊 ЗВУК: ВКЛ' : '🔇 ЗВУК: ВЫКЛ';
    btn.setAttribute('aria-pressed', SoundManager.enabled ? 'true' : 'false');
}

// =============================================
// Help / Controls overlay + global shortcuts
// =============================================

let helpOverlayEl = null;
let helpLastFocus = null;

function isHelpOpen(){
    return !!(helpOverlayEl && helpOverlayEl.classList.contains('is-open'));
}

// Tutorial overlay появится на Stage‑5, но проверка нужна уже сейчас
function isDefenseTutorialOpen(){
    const el = document.getElementById('defenseTutorial');
    return !!(el && el.classList.contains('is-open'));
}

function isAnyOverlayOpen(){
    return isHelpOpen() || isDefenseTutorialOpen() || (typeof isLightboxOpen === 'function' && isLightboxOpen());
}

function updateBodyScrollLock(){
    // Единая точка для блокировки скролла, чтобы оверлеи не конфликтовали
    const lock = isAnyOverlayOpen();
    document.body.classList.toggle('no-scroll', lock);
}

// =============================================
// Mode splash (сочный переход между режимами)
// =============================================

let modeSplashEl = null;
let modeSplashTimeoutId = null;

function ensureModeSplash(){
    if (modeSplashEl) return;

    modeSplashEl = document.createElement('div');
    modeSplashEl.id = 'modeSplash';
    modeSplashEl.className = 'mode-splash';
    modeSplashEl.setAttribute('aria-hidden', 'true');

    modeSplashEl.innerHTML = `
        <div class="mode-splash-inner">
            <div class="mode-splash-title" id="modeSplashTitle"></div>
            <div class="mode-splash-sub" id="modeSplashSub"></div>
        </div>
    `;

    document.body.appendChild(modeSplashEl);
}

function showModeSplash(title, subtitle = ''){
    // Если пользователь предпочитает минимум анимаций — не навязываем
    try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
    } catch (_) {}

    ensureModeSplash();
    if (!modeSplashEl) return;

    const t = document.getElementById('modeSplashTitle');
    const s = document.getElementById('modeSplashSub');
    if (t) t.textContent = title;
    if (s) s.textContent = subtitle;

    modeSplashEl.setAttribute('aria-hidden', 'false');
    // Перезапускаем анимацию, если нажали несколько раз подряд
    modeSplashEl.classList.remove('is-show');
    void modeSplashEl.offsetWidth;
    modeSplashEl.classList.add('is-show');

    if (modeSplashTimeoutId) clearTimeout(modeSplashTimeoutId);
    modeSplashTimeoutId = setTimeout(() => {
        if (!modeSplashEl) return;
        modeSplashEl.classList.remove('is-show');
        modeSplashEl.setAttribute('aria-hidden', 'true');
    }, 560);
}

function ensureHelpOverlay(){
    if (helpOverlayEl) return;

    helpOverlayEl = document.createElement('div');
    helpOverlayEl.id = 'helpOverlay';
    helpOverlayEl.className = 'help-overlay';
    helpOverlayEl.setAttribute('aria-hidden', 'true');

    helpOverlayEl.innerHTML = `
        <div class="help-backdrop" data-action="close"></div>
        <div class="help-dialog" role="dialog" aria-modal="true" aria-label="Справка и управление">
            <div class="help-header">
                <div>
                    <div class="help-title">Справка</div>
                    <div class="help-subtitle">Горячие клавиши и быстрый старт</div>
                </div>
                <button type="button" class="help-close" data-action="close" aria-label="Закрыть">✕</button>
            </div>

            <div class="help-grid">
                <div class="help-card">
                    <h3>Общее</h3>
                    <ul>
                        <li><kbd>H</kbd> / <kbd>?</kbd> — открыть/закрыть справку</li>
                        <li><kbd>Esc</kbd> — вернуться в меню</li>
                        <li>На заставке: <kbd>Enter</kbd> или <kbd>Space</kbd> — пропустить</li>
                        <li>В меню: <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> — быстрый запуск режимов</li>
                        <li><kbd>Shift</kbd>+<kbd>R</kbd> — сброс автосейва квеста</li>
                    </ul>
                </div>
                <div class="help-card">
                    <h3>Квест</h3>
                    <ul>
                        <li><kbd>←</kbd> / <kbd>↑</kbd> — предыдущая сцена</li>
                        <li><kbd>→</kbd> / <kbd>↓</kbd> / <kbd>Enter</kbd> / <kbd>Space</kbd> — следующая</li>
                        <li>Прогресс сохраняется автоматически — в меню появится «Продолжить»</li>
                    </ul>
                </div>
                <div class="help-card">
                    <h3>Полигон</h3>
                    <ul>
                        <li>Клик по карточке башни → клик по полю = поставить</li>
                        <li><kbd>N</kbd> — следующая волна (когда появилась кнопка)</li>
                        <li>«Читать далее» раскрывает исторический факт</li>
                    </ul>
                </div>
                <div class="help-card">
                    <h3>Галерея</h3>
                    <ul>
                        <li>Клик по фото — открыть просмотр</li>
                        <li><kbd>Esc</kbd> — закрыть просмотр</li>
                        <li><kbd>←</kbd>/<kbd>→</kbd> — листать в просмотре</li>
                    </ul>
                </div>
            </div>

            <div class="help-actions">
                <button type="button" class="help-action" id="helpShowTutorial" disabled>Показать обучение полигона</button>
                <button type="button" class="help-action" id="helpResetQuest">Сбросить прогресс квеста</button>
                <button type="button" class="help-action" data-action="close">Закрыть</button>
            </div>
        </div>
    `;

    document.body.appendChild(helpOverlayEl);

    helpOverlayEl.addEventListener('click', (e) => {
        const action = e.target && e.target.dataset ? e.target.dataset.action : null;
        if (action === 'close') {
            closeHelpOverlay();
        }
    });

    const tutBtn = helpOverlayEl.querySelector('#helpShowTutorial');
    if (tutBtn) {
        tutBtn.addEventListener('click', () => {
            // Обучение имеет смысл только в режиме полигона
            if (!gameState || gameState.mode !== 'defense') return;
            closeHelpOverlay();
            // Реальная реализация обучения появится в Stage‑5 (defense tutorial)
            if (typeof openDefenseTutorial === 'function') {
                openDefenseTutorial({ force: true });
            }
        });
    const resetBtn = helpOverlayEl.querySelector('#helpResetQuest');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const had = !!(getQuestProgress() && getQuestProgress().sceneId != null);
            clearQuestProgress();
            showAlert(had ? '✅ Прогресс квеста сброшен' : 'ℹ️ Нет сохранения квеста');

            // Если мы прямо сейчас в квесте — начинаем заново (ожидаемое поведение)
            if (gameState && gameState.mode === 'quest') {
                closeHelpOverlay(true);
                startQuest();
            }
        });
    }

    }
}

function initHelpOverlay(){
    ensureHelpOverlay();

    const btn = document.getElementById('helpBtn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleHelpOverlay();
        });
    }
}

function openHelpOverlay(){
    ensureHelpOverlay();
    if (!helpOverlayEl) return;

    helpLastFocus = document.activeElement;

    // Подстраиваем доступность кнопки обучения полигона
    const tutBtn = helpOverlayEl.querySelector('#helpShowTutorial');
    if (tutBtn) {
        tutBtn.disabled = !(gameState && gameState.mode === 'defense');
    }
    const resetBtn = helpOverlayEl.querySelector('#helpResetQuest');
    if (resetBtn) {
        const has = !!(getQuestProgress() && getQuestProgress().sceneId != null);
        resetBtn.disabled = !has;
    }

    helpOverlayEl.setAttribute('aria-hidden', 'false');
    helpOverlayEl.classList.add('is-open');
    updateBodyScrollLock();

    const closeBtn = helpOverlayEl.querySelector('.help-close');
    if (closeBtn) closeBtn.focus();
}

function closeHelpOverlay(force = false){
    if (!helpOverlayEl) return;
    helpOverlayEl.setAttribute('aria-hidden', 'true');
    helpOverlayEl.classList.remove('is-open');
    updateBodyScrollLock();

    if (!force && helpLastFocus && typeof helpLastFocus.focus === 'function') {
        try { helpLastFocus.focus(); } catch (_) {}
    }
}

function toggleHelpOverlay(){
    if (isHelpOpen()) closeHelpOverlay();
    else openHelpOverlay();
}

function isHelpHotkey(e){
    // Учитываем русскую раскладку: H на клавиатуре часто даёт «р»
    const k = e.key;
    return k === 'h' || k === 'H' || k === 'р' || k === 'Р' || k === '?' || k === '/';
}

function isNextWaveHotkey(e){
    // N на русской раскладке — это «т»
    const k = e.key;
    return k === 'n' || k === 'N' || k === 'т' || k === 'Т';
}

function initGlobalShortcuts(){
    if (initGlobalShortcuts._bound) return;
    initGlobalShortcuts._bound = true;

    document.addEventListener('keydown', (e) => {
        // 1) Если открыт какой-то модальный оверлей — приоритет ему
        if (isHelpOpen()) {
            if (e.key === 'Escape' || isHelpHotkey(e)) {
                e.preventDefault();
                closeHelpOverlay();
            }
            return;
        }

        if (isDefenseTutorialOpen()) {
            // Пока обучение открыто — закрываем его клавишами Esc/Enter/Space
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                closeDefenseTutorial({ complete: true, force: true });
            }
            return;
        }

        // 2) Открыть/закрыть справку
        if (isHelpHotkey(e)) {
            // Не мешаем вводу ползунка громкости
            const ae = document.activeElement;
            const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
            if (!typing) {
                e.preventDefault();
                toggleHelpOverlay();
                return;
            }
        }

        // 2.5) На заставке (в меню): быстрый запуск режимов — удобно на защите
        const introEl = document.getElementById('loadingScreen');
        const isOnIntro = introEl && !introEl.classList.contains('hidden');
        if (isOnIntro) {
            const ae = document.activeElement;
            const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
            if (!typing) {
                if (e.key === '1') {
                    e.preventDefault();
                    continueQuest();
                    return;
                }
                if (e.key === '2') {
                    e.preventDefault();
                    startDefense();
                    return;
                }
                if (e.key === '3') {
                    e.preventDefault();
                    startGallery();
                    return;
                }

                // Shift+R — сбросить автосейв квеста (только из меню, чтобы не нажать случайно)
                const isResetKey = (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К');
                if (isResetKey && e.shiftKey) {
                    e.preventDefault();
                    const had = !!(getQuestProgress() && getQuestProgress().sceneId != null);
                    clearQuestProgress();
                    showAlert(had ? '✅ Прогресс квеста сброшен' : 'ℹ️ Нет сохранения квеста');
                    return;
                }
            }
        }

        // 3) Быстрая клавиша следующей волны в полигоне
        if (gameState && gameState.mode === 'defense' && isNextWaveHotkey(e)) {
            const fact = document.getElementById('historicalFact');
            if (fact && !fact.classList.contains('hidden')) {
                e.preventDefault();
                nextWave();
                return;
            }
        }

        // 4) Esc — вернуться в меню (из любого режима)
        if (e.key === 'Escape') {
            const loading = document.getElementById('loadingScreen');
            const isOnIntro = loading && !loading.classList.contains('hidden');
            if (isOnIntro) return;

            if (gameState && gameState.mode) {
                e.preventDefault();
                returnToMenu();
            }
        }
    }, true);
}

// =============================================
// Defense tutorial overlay (первый запуск)
// =============================================

const DEFENSE_TUTORIAL_KEY = 'p1430_defense_tutorial_seen';
let defenseTutorialEl = null;
let defenseTutorialLastFocus = null;
let defenseTutorialOnDone = null;

function hasSeenDefenseTutorial(){
    try {
        return localStorage.getItem(DEFENSE_TUTORIAL_KEY) === '1';
    } catch (_) {
        return false;
    }
}

function markDefenseTutorialSeen(){
    try {
        localStorage.setItem(DEFENSE_TUTORIAL_KEY, '1');
    } catch (_) {
        // ignore
    }
}

function setDefenseTutorialHighlight(on){
    const panel = document.getElementById('towerPanel');
    const canvas = document.getElementById('gameCanvas');
    if (panel) panel.classList.toggle('tutorial-highlight', !!on);
    if (canvas) canvas.classList.toggle('tutorial-highlight', !!on);
}

function ensureDefenseTutorial(){
    if (defenseTutorialEl) return;

    defenseTutorialEl = document.createElement('div');
    defenseTutorialEl.id = 'defenseTutorial';
    defenseTutorialEl.className = 'tutorial-overlay';
    defenseTutorialEl.setAttribute('aria-hidden', 'true');

    defenseTutorialEl.innerHTML = `
        <div class="tutorial-backdrop" data-action="close"></div>
        <div class="tutorial-card" role="dialog" aria-modal="true" aria-label="Обучение полигону">
            <div class="tutorial-header">
                <div>
                    <div class="tutorial-title">Быстрый старт: Полигон</div>
                    <div class="tutorial-subtitle">30 секунд — и вы готовы показывать проект на защите</div>
                </div>
                <button type="button" class="tutorial-close" data-action="close" aria-label="Закрыть">✕</button>
            </div>

            <ol class="tutorial-steps">
                <li><strong>Выберите башню</strong> в панели справа (карточка подсветится).</li>
                <li><strong>Кликните по полю</strong>, чтобы установить башню.</li>
                <li>Башни нельзя ставить слишком близко — появится предупреждение.</li>
                <li>После волны появится исторический факт и кнопка <strong>«Следующая волна»</strong>.
                    Можно нажать <kbd>N</kbd>.</li>
            </ol>

            <div class="tutorial-actions">
                <button type="button" class="menu-btn tutorial-ok" data-action="ok">Понятно, поехали!</button>
            </div>
        </div>
    `;

    document.body.appendChild(defenseTutorialEl);

    defenseTutorialEl.addEventListener('click', (e) => {
        const action = e.target && e.target.dataset ? e.target.dataset.action : null;
        if (!action) return;
        if (action === 'close') {
            // Закрытие = продолжить (обучение только мешает игре)
            closeDefenseTutorial({ complete: true });
        }
        if (action === 'ok') {
            closeDefenseTutorial({ complete: true });
        }
    });
}

function openDefenseTutorial(options = {}){
    const { onDone, force = false } = options;
    if (!gameState || gameState.mode !== 'defense') return;

    if (!force && hasSeenDefenseTutorial()) {
        if (typeof onDone === 'function') onDone();
        return;
    }

    ensureDefenseTutorial();
    if (!defenseTutorialEl) return;

    defenseTutorialLastFocus = document.activeElement;
    defenseTutorialOnDone = (typeof onDone === 'function') ? onDone : null;

    defenseTutorialEl.setAttribute('aria-hidden', 'false');
    defenseTutorialEl.classList.add('is-open');
    setDefenseTutorialHighlight(true);
    updateBodyScrollLock();

    // Фокус на кнопке OK — удобно с клавиатуры
    const ok = defenseTutorialEl.querySelector('[data-action="ok"]');
    if (ok) ok.focus();
}

function closeDefenseTutorial(options = {}){
    const { complete = false, force = false } = options;
    if (!defenseTutorialEl || !isDefenseTutorialOpen()) {
        // Даже если элемента ещё нет — всё равно можем завершить волну
        if (complete && typeof defenseTutorialOnDone === 'function') {
            defenseTutorialOnDone();
            defenseTutorialOnDone = null;
        }
        return;
    }

    defenseTutorialEl.setAttribute('aria-hidden', 'true');
    defenseTutorialEl.classList.remove('is-open');
    setDefenseTutorialHighlight(false);
    updateBodyScrollLock();

    // Показываем один раз — дальше можно открыть из справки
    markDefenseTutorialSeen();

    if (complete && typeof defenseTutorialOnDone === 'function') {
        defenseTutorialOnDone();
        defenseTutorialOnDone = null;
    }

    if (!force && defenseTutorialLastFocus && typeof defenseTutorialLastFocus.focus === 'function') {
        try { defenseTutorialLastFocus.focus(); } catch (_) {}
    }
}

// Sound Manager
const SoundManager = {
    // Выключаем звук по умолчанию, так как в офлайн-версии могут отсутствовать mp3-файлы.
    enabled: false,
    volume: 0.5,
    currentTrack: null,

    storageKeys: {
        enabled: 'p1430_sound_enabled',
        volume: 'p1430_sound_volume'
    },

    loadSettings: function() {
        try {
            const en = localStorage.getItem(this.storageKeys.enabled);
            if (en !== null) this.enabled = (en === '1');
            const vol = localStorage.getItem(this.storageKeys.volume);
            if (vol !== null) {
                const v = parseFloat(vol);
                if (!Number.isNaN(v)) {
                    this.volume = Math.max(0, Math.min(1, v));
                }
            }
        } catch (_) {
            // localStorage может быть недоступен в некоторых окружениях
        }
    },

    saveSettings: function() {
        try {
            localStorage.setItem(this.storageKeys.enabled, this.enabled ? '1' : '0');
            localStorage.setItem(this.storageKeys.volume, String(this.volume));
        } catch (_) {
            // ignore
        }
    },

    config: {
        menu: 'musik/menu.mp3',
        quest: 'musik/quest.mp3',
        defense: 'musik/defense.mp3'
    },

    play: function(trackName) {
        if (!this.enabled || !this.config[trackName]) return;

        if (this.currentTrack) {
            this.currentTrack.pause();
        }

        this.currentTrack = new Audio(this.config[trackName]);
        this.currentTrack.volume = this.volume;
        this.currentTrack.loop = true;
        this.currentTrack.play().catch(e => console.log('Audio play failed:', e));
    },

    stop: function() {
        if (this.currentTrack) {
            this.currentTrack.pause();
            this.currentTrack = null;
        }
    },

    setVolume: function(vol) {
        this.volume = vol / 100;
        if (this.currentTrack) {
            this.currentTrack.volume = this.volume;
        }
        this.saveSettings();
    }
};

// Typewriter Effect
function typeWriter(element, text, speed = 100, callback) {
    let i = 0;
    let cancelled = false;
    element.textContent = '';

    function type() {
        if (cancelled) return;

        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else if (callback) {
            callback();
        }
    }

    type();

    // Контроллер для ускоренного завершения (используется для "пропуска" заставки)
    return {
        finish: () => {
            if (cancelled) return;
            cancelled = true;
            element.textContent = text;
            if (callback) callback();
        },
        cancel: () => {
            cancelled = true;
        }
    };
}

// Quest Data
// Список сцен наполняется:
// 1) из scenes.json (если страница запущена через http/https),
// 2) либо используется встроенный локальный набор ниже (fallback для офлайн/file://).
let questScenes = [];

const finalScreen = {
    title: 'ПРОЕКТ ЗАВЕРШЁН',
    content: `Проект «ПОЛУВЕКОВОЙ СЕКРЕТ» завершен. Ты много узнал о Г.В. Кисунько и теперь можешь рассказать другим об этом удивительном человеке.<br><br>Его жизнь - это пример беззаветного служения Отечеству, научного гения и человеческого мужества.<br><br><strong class="final-accent">Спасибо за прохождение Проекта ПОЛУВЕКОВОЙ СЕКРЕТ!</strong>`,
    // Локальная картинка — проект должен стабильно работать офлайн
    photo: 'img/kisunko_teacher.jpg',
    photoCaption: 'Фото: Г.В. Кисунько (портрет)'
};

// --- Встроенные локальные сцены ---
// Перезаписываем questScenes локальными данными, чтобы заменить внешние изображения на локальные
// и корректно менять фотографии между сценами. Эта структура соответствует содержимому scenes.json.
questScenes = [
  {id: 1, title: "СЦЕНА 1: ЗАПУСК АРХИВА", dialog: [{speaker:"archive",text:"Добро пожаловать в проект \"ПОЛУВЕКОВОЙ СЕКРЕТ\". Ты - школьник и тебе поручили узнать правду о человеке, оружие которого \"попало в муху в космосе\". Готов начать исследование?"},{speaker:"student",text:"Звучит круто! А кто этот человек?"},{speaker:"archive",text:"Григорий Васильевич Кисунько - советский учёный и генеральный конструктор первой отечественной системы противоракетной обороны."}], buttonText:"Да, запускай архив.", photo:"img/kisunko_teacher.jpg", photoCaption:"Фото: Г.В. Кисунько, портрет", next:2},
  {id: 2, title: "СЦЕНА 2: РОЖДЕНИЕ И ПРОИСХОЖДЕНИЕ", dialog: [{speaker:"archive",text:"Запись первая. 20 июля 1918 года в селе Бельманка Запорожской области в крестьянской семье рождается мальчик Гриша."},{speaker:"archive",text:"В 1938 году семью раскулачивают, а отца по ложному доносу арестовывают и расстреливают как \"врага народа\"."},{speaker:"student",text:"Как он вообще мог учиться после такого?"},{speaker:"archive",text:"Учился. Да ещё как!"}], buttonText:"Как он вообще смог?", photo:"img/kisunko_school.jpg", photoCaption:"Фото: Юный Григорий Кисунько", next:3},
  {id: 3, title: "СЦЕНА 3: УЧЁБА В ЛУГАНСКОМ ПЕДИНСТИТУТЕ", dialog: [{speaker:"archive",text:"Сначала Григорий обучается на физико-математическом факультете Луганского педагогического института, который заканчивает в 1938 году с отличием."},{speaker:"student",text:"С таким бэкграундом семьи - это просто подвиг!"},{speaker:"archive",text:"Скорее всего упорство и вера в себя."}], buttonText:"Далее в аспирантуру?", photo:"img/kisunko_student.jpg", photoCaption:"Фото: Студент Луганского пединститута", next:4},
  {id: 4, title: "СЦЕНА 4: АСПИРАНТУРА И ЗАЩИТА", dialog: [{speaker:"archive",text:"Далее Григорий Васильевич продолжает учебу в аспирантуре Ленинградского пединститута на кафедре теоретической физики."},{speaker:"archive",text:"А 17 июня 1941 года защищает диссертацию и становится кандидатом физико-математических наук."},{speaker:"student",text:"Защититься за четыре дня до войны?! Во судьба!"},{speaker:"archive",text:"Да. За четыре дня до войны. Но его знания теоретической физики вскоре очень пригодятся."}], buttonText:"Что же дальше?", photo:"img/kisunko_teacher.jpg", photoCaption:"Фото: Аспирант в Ленинграде", next:5},
  {id: 5, title: "СЦЕНА 5: ДОБРОВОЛЕЦ ОПОЛЧЕНИЯ", dialog: [{speaker:"archive",text:"1941 год. Война. Он не прячется в лаборатории, хотя мог уехать с семьей в глубокий тыл по распределению."},{speaker:"archive",text:"Он записывается добровольцем в Ленинградскую Армию Народного ополчения. Звание — рядовой."},{speaker:"student",text:"Учёный и сразу рядовым на фронт?"},{speaker:"archive",text:"Иначе Григорий Васильевич поступить не мог. Позже он напишет семье, что долг защитить Родину был для него превыше всего."}], buttonText:"Куда его направят?", photo:"img/kisunko_soldier.jpg", photoCaption:"Фото: Рядовой ополчения, 1941", next:6},
  {id: 6, title: "СЦЕНА 6: ВОЕННОЕ УЧИЛИЩЕ ВНОС", dialog: [{speaker:"archive",text:"Вскоре из ополчения был направлен на учебу в Военное училище Воздушного наблюдения, оповещения и связи (ВНОС)."},{speaker:"archive",text:"Февраль 1942 года. Там он учится ловить вражеские самолеты радиолокатором."},{speaker:"student",text:"Радары в 1942? Уже были?"},{speaker:"archive",text:"Да, советские радиолокаторы, достаточно простые, но свои задачи решали."}], buttonText:"И стал офицером?", photo:"img/kisunko_soldier.jpg", photoCaption:"Фото: Курсант ВНОС, 1942", next:7},
  {id: 7, title: "СЦЕНА 7: КОМАНДИР ВЗВОДА, 337-Й БАТАЛЬОН ПВО", dialog: [{speaker:"archive",text:"Февраль 1942. Лейтенант Кисунько командует взводом личного состава радиолокационной станции."},{speaker:"archive",text:"337-й Отдельный радиобатальон ВНОС Особой Московской армии ПВО."},{speaker:"archive",text:"Он отвечает за радары, защищающие Москву от авиации Люфтваффе. Лейтенант Кисунько служит на одной из трёх радиолокационных станций слежения, подаренных английским премьер-министром Уинстоном Черчиллем лично Сталину."},{speaker:"student",text:"Значит, его работа помогала защищать столицу?"},{speaker:"archive",text:"Безусловно. Каждый день. Каждую ночь налётов."}], buttonText:"Что было дальше?", photo:"img/kisunko_soldier.jpg", photoCaption:"Фото: Командир взвода, 1943", next:8},
  {id: 8, title: "СЦЕНА 8: ПРЕПОДАВАТЕЛЬ ВОЕННОЙ АКАДЕМИИ", dialog: [{speaker:"archive",text:"Конец войны. Его переводят преподавателем в Военную академию связи имени Будённого."},{speaker:"archive",text:"Декабрь 1944 года. Он обучает офицеров теории радиолокации."},{speaker:"archive",text:"Заместитель начальника кафедры. Его лекции — база для будущих инженеров-радиотехников."},{speaker:"student",text:"С фронта и сразу на кафедру?"},{speaker:"archive",text:"По приказу И.В. Сталина! Его знания были нужнее в аудитории. Он готовил новое поколение защитников Отечества."}], buttonText:"Идём дальше", photo:"img/kisunko_teacher.jpg", photoCaption:"Фото: Преподаватель академии, 1945", next:9},
  {id: 9, title: "СЦЕНА 9: ПЕРЕХОД В КБ-1", dialog: [{speaker:"archive",text:"Октябрь 1950 — КБ-1. Специальное конструкторское бюро под Москвой."},{speaker:"archive",text:"Начальник сектора. Затем начальник отдела разработки радиотехнических систем."},{speaker:"student",text:"То есть, он переходит в оружейники?"},{speaker:"archive",text:"Не в оружейники — в разработчики оборонительного вооружения. Ракеты против вражеских ракет."}], buttonText:"Какие ракеты?", photo:"img/kisunko_teacher.jpg", photoCaption:"Фото: КБ‑1, 1953", next:10},
  {id: 10, title: "СЦЕНА 10: ЗЕНИТНЫЕ СИСТЕМЫ «С-25» и «С-75»", dialog: [{speaker:"archive",text:"«С‑25» (Беркут) — первая советская зенитно‑ракетная система, рассчитанная на одновременный налёт тысячи самолётов."},{speaker:"archive",text:"Вокруг Москвы создаётся кольцо их позиций. Защита столицы от американских бомбардировщиков."},{speaker:"archive",text:"«С‑75» — ещё более совершенный мобильный зенитно‑ракетный комплекс, развёртывается по всей территории СССР."},{speaker:"student",text:"Советский щит над столицей?"},{speaker:"archive",text:"Именно. Первый настоящий щит противосамолётной обороны."}], photo:"img/rocket.jpg", photoCaption:"Фото: РЛС систем С‑25/С‑75", choices:[{text:"Узнать о награждении",next:11},{text:"Перейти к созданию системы ‘А’",next:12}]},
  {id: 11, title: "СЦЕНА 11: ГЕРОЙ СОЦИАЛИСТИЧЕСКОГО ТРУДА", dialog: [{speaker:"archive",text:"1956 год. За разработку системы С‑25 Григорий Васильевич удостоен звания Героя Социалистического Труда."},{speaker:"archive",text:"Это высшая трудовая награда СССР."},{speaker:"student",text:"То есть, советский аналог Нобеля? Это уже вершина карьеры?"},{speaker:"archive",text:"Для многих — да. Но для него — начало пути в бессмертие!"}], buttonText:"Что дальше?", photo:"img/home_door.jpg", photoCaption:"Фото: Медаль Героя Соцтруда", next:12},
  {id: 12, title: "СЦЕНА 12: СИСТЕМА ‘А’ — НОВОЕ ЗАДАНИЕ", dialog: [{speaker:"archive",text:"3 февраля 1956 года. Постановление ЦК КПСС и Совета Министров СССР."},{speaker:"archive",text:"Создание экспериментального комплекса противоракетной обороны — системы ‘А’."},{speaker:"archive",text:"Главный конструктор — Григорий Васильевич Кисунько."},{speaker:"student",text:"Противоракетной? Ракета против ракеты?"},{speaker:"archive",text:"Да. Впервые в мире. Никто никогда этого не делал."}], buttonText:"Дальше…", photo:"img/system_A.jpg", photoCaption:"Фото: Система ‘А’ — экспериментальный комплекс", next:13},
  {id: 13, title: "СЦЕНА 13: ПЕРВЫЙ ПЕРЕХВАТ", dialog: [{speaker:"archive",text:"4 марта 1961 года. Полигон Сары‑Шаган, озеро Балхаш."},{speaker:"archive",text:"Советская ракета‑перехватчик впервые в мире сбивает баллистическую ракету на встречном курсе."},{speaker:"student",text:"То самое ‘попали в муху в космосе’?"},{speaker:"archive",text:"Именно. Этот запуск навсегда вошёл в историю мировой противоракетной обороны."}], buttonText:"Финал?", photo:"img/rocket_launch.jpg", photoCaption:"Фото: Пуск ракеты на полигоне Сары‑Шаган", next:14},
  {id: 14, title: "СЦЕНА 14: НАСЛЕДИЕ И ПАМЯТЬ", dialog: [{speaker:"archive",text:"Григорий Васильевич создал основу для будущих поколений противоракетных систем: А‑35, А‑135 и далее."},{speaker:"archive",text:"Его работы позволили защитить небо над Москвой и всей страной."},{speaker:"student",text:"Вот это история!"},{speaker:"archive",text:"Теперь ты знаешь, как ‘попасть в муху в космосе’."}], buttonText:"Вернуться в меню", photo:"img/home_door.jpg", photoCaption:"Фото: Памятник Г.В. Кисунько", next:null}
];

// Tower Defense Data - обновленные названия
const towerTypes = [
    {
        name: 'РЛС "ДУНАЙ-2"',
        range: 280,
        damage: 15,
        firerate: 1.0,
        cost: 600,
        color: '#C9B07A',
        icon: '📡',
        description: 'Мощная РЛС дальнего обнаружения',
        history: 'Дальность обнаружения >1000 км, цифровая ЭВМ 40 тыс. операций/сек'
    },
    {
        name: 'РЛС НАВЕДЕНИЯ',
        range: 180,
        damage: 30,
        firerate: 2.2,
        cost: 400,
        color: '#D8C3A5',
        icon: '🎯',
        description: 'Точное сопровождение целей',
        history: 'Обеспечивал точное наведение противоракет'
    },
    {
        name: 'ПУ В-1000',
        range: 120,
        damage: 65,
        firerate: 0.4,
        cost: 500,
        color: '#8C4A3B',
        icon: '🚀',
        description: 'Пусковая установка противоракет',
        history: 'Противоракета системы "А" (П.Д. Грушин)'
    }
];

const historicalFacts = [
    {
        title: 'ФАКТ: ПЕРВЫЙ ПЕРЕХВАТ',
        content: '4 марта 1961 года система "А" впервые в мире уничтожила баллистическую ракету на дальности свыше 1000 км. Это был триумф советской науки.'
    },
    {
        title: 'ФАКТ: ПОЛИГОН САРЫ-ШАГАН',
        content: 'Расположен на озере Балхаш в пустыне Бетпак-Дала (Казахстан). Площадь полигона - тысячи квадратных километров. Секретный объект до 1990-х годов.'
    },
    {
        title: 'ФАКТ: СИСТЕМА А-35',
        content: 'Боевая система ПРО Москвы. Два кольца развёртывания радиусом 65 и 90 км. Принята на вооружение в 1972-1974 годах. Модернизирована в А-135.'
    },
    {
        title: 'ФАКТ: ЛЕНИНСКАЯ ПРЕМИЯ',
        content: '1966 год - Г.В. Кисунько присуждена Ленинская премия за создание системы "А" и фундаментальные исследования в области противоракетной обороны.'
    }
];

// Game State
let gameState = {
    mode: null,
    currentChapter: 0,
    health: 100,
    resources: 1500,
    wave: 1,
    towers: [],
    enemies: [],
    // Визуальные эффекты (вспышки, маркеры, частицы) и снаряды/анимации выстрелов
    effects: [],
    projectiles: [],
    _lastFrameTime: 0,
    selectedTower: null,
    gameLoop: null,
    enemiesRemaining: 0,
    keyboardNavigation: true,
    // Хранит идентификаторы таймаутов спавна врагов, чтобы их можно было отменить при выходе из режима
    spawnTimeouts: []
};

// =============================================
// Quest progress (autosave) — localStorage
// =============================================

const QUEST_PROGRESS_KEY = 'p1430_quest_progress_v1';

function getQuestProgress(){
    try {
        const raw = localStorage.getItem(QUEST_PROGRESS_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || data.sceneId == null) return null;
        return data;
    } catch (_) {
        return null;
    }
}

function formatQuestProgressNote(progress){
    if (!progress || progress.sceneId == null) return '';
    const id = progress.sceneId;
    const title = (progress.title || '').replace(/\s+/g,' ').trim();
    if (title) {
        const cleaned = title.replace(/^СЦЕНА\s*\d+\s*:\s*/i,'').trim();
        return `Сохранено: СЦЕНА ${id}${cleaned ? ' — ' + cleaned : ''}`;
    }
    return `Сохранено: СЦЕНА ${id}`;
}

function updateQuestMenuButtons(){
    const mainBtn = document.getElementById('questMainBtn');
    const restartBtn = document.getElementById('questRestartBtn');
    const noteEl = document.getElementById('questProgressNote');

    if (!mainBtn) return;

    const progress = getQuestProgress();
    const has = !!(progress && progress.sceneId != null);

    mainBtn.textContent = has ? 'ПРОДОЛЖИТЬ КВЕСТ' : 'ТЕКСТОВЫЙ КВЕСТ';

    if (restartBtn) {
        restartBtn.classList.toggle('hidden', !has);
    }
    if (noteEl) {
        if (has) {
            noteEl.textContent = formatQuestProgressNote(progress);
            noteEl.classList.remove('hidden');
        } else {
            noteEl.textContent = '';
            noteEl.classList.add('hidden');
        }
    }
}

function saveQuestProgress(scene){
    if (!scene || scene.id == null) return;
    // Не пишем в хранилище одно и то же подряд
    if (saveQuestProgress._lastId === scene.id) return;
    saveQuestProgress._lastId = scene.id;

    try {
        const payload = {
            sceneId: scene.id,
            title: scene.title || '',
            savedAt: Date.now()
        };
        localStorage.setItem(QUEST_PROGRESS_KEY, JSON.stringify(payload));
    } catch (_) {
        // ignore
    }

    updateQuestMenuButtons();
}

function clearQuestProgress(){
    saveQuestProgress._lastId = null;
    try { localStorage.removeItem(QUEST_PROGRESS_KEY); } catch (_) {}
    updateQuestMenuButtons();
}

// Keyboard Navigation Function
function initKeyboardNavigation() {
    document.addEventListener('keydown', handleKeyPress);
}

function handleKeyPress(event) {
    // Если событие уже обработано (например, справкой) — не дублируем
    if (event.defaultPrevented) return;
    // Когда открыт модальный оверлей — навигацию квеста блокируем
    if (isAnyOverlayOpen()) return;
    if (gameState.mode !== 'quest' || !gameState.keyboardNavigation) return;

    switch(event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
            event.preventDefault();
            navigateToPreviousChapter();
            break;

        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'Enter':
            event.preventDefault();
            navigateToNextChapter();
            break;

        case 'Escape':
            event.preventDefault();
            returnToMenu();
            break;
    }
}

function navigateToPreviousChapter() {
    if (gameState.currentChapter > 0) {
        gameState.currentChapter--;
        showChapter();
        showNavigationHint('← Предыдущая сцена');
    }
}

function navigateToNextChapter() {
    const currentScene = questScenes[gameState.currentChapter];

    // Если у сцены есть варианты выбора, по умолчанию переходим по первому варианту
    if (currentScene.choices && currentScene.choices.length > 0) {
        const nextId = currentScene.choices[0].next;
        goToChapterById(nextId);
        showNavigationHint('Следующая сцена →');
        return;
    }

    // Если указано поле next как null или undefined, считаем, что это финал
    if (currentScene.next === null || currentScene.next === undefined || currentScene.next === 'final') {
        showFinalScreen();
    } else {
        // Найдём индекс следующей сцены по id
        goToChapterById(currentScene.next);
        showNavigationHint('Следующая сцена →');
    }
}

function showNavigationHint(text) {
    let hint = document.getElementById('navigationHint');

    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'navigationHint';
        hint.className = 'navigation-hint';
        hint.setAttribute('role', 'status');
        hint.setAttribute('aria-live', 'polite');
        document.body.appendChild(hint);
    }

    hint.textContent = text;
    hint.classList.add('is-visible');

    // Не плодим таймеры: если подсказка уже показывалась — переиспользуем
    if (showNavigationHint._timeoutId) {
        clearTimeout(showNavigationHint._timeoutId);
    }
    showNavigationHint._timeoutId = setTimeout(() => {
        const el = document.getElementById('navigationHint');
        if (el) el.classList.remove('is-visible');
    }, 1400);
}

// UI Functions

// =============================================
// Quest internal scale (адаптивная метрика квеста)
// =============================================
const QUEST_REF_WIDTH = 820;
let questScaleResizeHandler = null;
function computeQuestScale(){
    const qm = document.getElementById('questMode');
    if (!qm) return 1;
    const w = qm.clientWidth || window.innerWidth;
    const s = Math.max(0.85, Math.min(1.15, w / QUEST_REF_WIDTH));
    document.documentElement.style.setProperty('--qs', s.toFixed(3));
    return s;
}
function bindQuestScale(){
    computeQuestScale();
    // Не накапливаем обработчики при повторном входе в квест
    if (questScaleResizeHandler) return;
    questScaleResizeHandler = () => {
        if (gameState && gameState.mode === 'quest') {
            computeQuestScale();
            updateQuestFloatingNavPadding();
        }
    };
    window.addEventListener('resize', questScaleResizeHandler);
}

function unbindQuestScale(){
    if (!questScaleResizeHandler) return;
    window.removeEventListener('resize', questScaleResizeHandler);
    questScaleResizeHandler = null;
}

function continueQuest() {
    // Запускаем квест либо продолжаем с последнего сохранения.
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('app').classList.add('active');
    document.getElementById('questMode').classList.remove('hidden');
    gameState.mode = 'quest';
    gameState.keyboardNavigation = true;

    const progress = getQuestProgress();
    const subtitle = (progress && progress.sceneId != null)
        ? `Продолжение: сцена ${progress.sceneId}`
        : 'Запускаю архив…';

    showModeSplash('ТЕКСТОВЫЙ КВЕСТ', subtitle);

    SoundManager.stop();
    SoundManager.play('quest');

    const startFromSaved = () => {
        let startIndex = 0;
        const p = getQuestProgress();
        if (p && p.sceneId != null) {
            const idx = questScenes.findIndex(sc => sc.id === p.sceneId);
            if (idx >= 0) startIndex = idx;
            else clearQuestProgress();
        }
        gameState.currentChapter = startIndex;
        showChapter(startIndex);
        document.body.classList.add('quest-scale-active');
        bindQuestScale();
    };

    // Загружаем сцены, затем отображаем сохранённую или первую
    loadScenes().then(startFromSaved).catch(startFromSaved);
}

function restartQuest() {
    // Полный рестарт квеста с первой сцены (удобно на защите)
    clearQuestProgress();
    startQuest();
}

function startQuest() {
     // Старт с нуля: очищаем автосейв и начинаем с первой сцены.
    clearQuestProgress();

    // Запускаем режим квеста. Предварительно загружаем данные сцен из внешнего файла.
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('app').classList.add('active');
    document.getElementById('questMode').classList.remove('hidden');
    gameState.mode = 'quest';
    gameState.keyboardNavigation = true;

    showModeSplash('ТЕКСТОВЫЙ КВЕСТ', 'Запускаю архив…');

    SoundManager.stop();
    SoundManager.play('quest');

    // Загружаем сцены, затем отображаем первую
    loadScenes().then(() => {
        gameState.currentChapter = 0;
        showChapter(0);
        document.body.classList.add('quest-scale-active');
        bindQuestScale();
        // Навигационные кнопки теперь встроены в сами сцены (через кнопку "Вперёд" или выбор).
        // Поэтому мы не добавляем внешнюю панель навигации, чтобы избежать дублирования.
    }).catch(() => {
        // если загрузка не удалась, используем встроенные сцены
        gameState.currentChapter = 0;
        showChapter(0);
        document.body.classList.add('quest-scale-active');
        bindQuestScale();
        // Навигационные кнопки теперь встроены в сами сцены (через кнопку "Вперёд" или выбор).
        // Поэтому мы не добавляем внешнюю панель навигации, чтобы избежать дублирования.
    });
}

function startDefense() {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('app').classList.add('active');
    document.getElementById('defenseMode').classList.remove('hidden');
    gameState.mode = 'defense';
    gameState.keyboardNavigation = false;

    showModeSplash('ПОЛИГОН ИСПЫТАНИЙ', 'Запуск симуляции…');

    SoundManager.stop();
    SoundManager.play('defense');

    initDefenseGame();
}


function updateQuestFloatingNavPadding(){
    const qc = document.getElementById('questContainer');
    if (!qc) return;
    // Если содержимое квеста скроллится, добавляем небольшой нижний отступ,
    // чтобы последние строки не перекрывались плавающими кнопками.
    const needsPadding = qc.scrollHeight > (qc.clientHeight + 6);
    qc.classList.toggle('has-floating-nav', needsPadding);
}

function addNavigationButtons() {
    const container = document.getElementById('questContainer');
    if (!container) return;

    let navButtons = document.getElementById('navButtons');

    if (!navButtons) {
        navButtons = document.createElement('div');
        navButtons.id = 'navButtons';
        navButtons.className = 'nav-floating';

        const prevButton = document.createElement('button');
        prevButton.type = 'button';
        prevButton.className = 'nav-icon-btn nav-prev';
        prevButton.innerHTML = '◀';
        prevButton.setAttribute('aria-label', 'Назад');
        prevButton.setAttribute('title', 'Назад');
        prevButton.dataset.tip = 'Назад';
        prevButton.onclick = navigateToPreviousChapter;

        const nextButton = document.createElement('button');
        nextButton.type = 'button';
        nextButton.className = 'nav-icon-btn nav-next';
        nextButton.innerHTML = '▶';
        nextButton.setAttribute('aria-label', 'Вперёд');
        nextButton.setAttribute('title', 'Вперёд');
        nextButton.dataset.tip = 'Вперёд';
        nextButton.onclick = navigateToNextChapter;

        const press = (btn) => {
            if (btn.disabled) return;
            btn.style.transform = 'translateY(1px) scale(0.97)';
        };
        const release = (btn) => {
            btn.style.transform = 'translateY(0) scale(1)';
        };

        [prevButton, nextButton].forEach((btn) => {
            btn.addEventListener('pointerdown', () => press(btn));
            btn.addEventListener('pointerup', () => release(btn));
            btn.addEventListener('pointercancel', () => release(btn));
            btn.addEventListener('pointerleave', () => release(btn));
        });

        navButtons.appendChild(prevButton);
        navButtons.appendChild(nextButton);
        container.appendChild(navButtons);
    }

    updateNavigationButtons();
}

function returnToMenu() {
    document.body.classList.remove('quest-scale-active');
    document.documentElement.style.setProperty('--qs','1');
    // Снимаем обработчик ресайза квеста, чтобы не накапливать слушатели
    unbindQuestScale();

    // Закрываем модальные оверлеи (если они открыты)
    closeLightbox(true);
    closeHelpOverlay(true);
    const tut = document.getElementById('defenseTutorial');
    if (tut) {
        tut.classList.remove('is-open');
        tut.setAttribute('aria-hidden', 'true');
    }
    // На всякий случай снимаем подсветку элементов обучения
    if (typeof setDefenseTutorialHighlight === 'function') {
        setDefenseTutorialHighlight(false);
    }
    updateBodyScrollLock();
    document.getElementById('app').classList.remove('active');
    document.getElementById('questMode').classList.add('hidden');
    document.getElementById('defenseMode').classList.add('hidden');
    const galleryModeEl = document.getElementById('galleryMode');
    if (galleryModeEl) galleryModeEl.classList.add('hidden');
    document.getElementById('loadingScreen').classList.remove('hidden');

    if (gameState.gameLoop) {
        cancelAnimationFrame(gameState.gameLoop);
    }

    const hint = document.getElementById('navigationHint');
    if (hint) hint.remove();

    if (showNavigationHint._timeoutId) {
        clearTimeout(showNavigationHint._timeoutId);
        showNavigationHint._timeoutId = null;
    }

    const navButtons = document.getElementById('navButtons');
    if (navButtons) navButtons.remove();

    // Перед возвратом в меню отменяем все таймеры спавна и очищаем обработчик клика на канвасе
    if (Array.isArray(gameState.spawnTimeouts)) {
        gameState.spawnTimeouts.forEach(id => clearTimeout(id));
    }
    const canvasEl = document.getElementById('gameCanvas');
    if (canvasEl) {
        canvasEl.onclick = null;
    }

    // Снимаем обработчик ресайза канваса, чтобы не накапливать слушатели
    if (gameState && gameState._defenseResizeHandler) {
        window.removeEventListener('resize', gameState._defenseResizeHandler);
    }

    gameState = {
        mode: null,
        currentChapter: 0,
        health: 100,
        resources: 1500,
        wave: 1,
        towers: [],
        enemies: [],
        effects: [],
        projectiles: [],
        _lastFrameTime: 0,
        selectedTower: null,
        gameLoop: null,
        enemiesRemaining: 0,
        keyboardNavigation: true,
        spawnTimeouts: []
    };

    // Обновляем меню квеста (кнопка «Продолжить» / «Начать заново»)
    updateQuestMenuButtons();

    SoundManager.stop();
    SoundManager.play('menu');
}

function showChapter(index) {
    // Если передан индекс, переходим к нему
    if (typeof index === 'number') {
        gameState.currentChapter = index;
    }

    const scene = questScenes[gameState.currentChapter];
    const container = document.getElementById('questContainer');
    if (!scene || !container) return;

    // Собираем диалог (музейная экспозиция + диалоговая подача)
    let dialogHTML = '';
    if (scene.dialog && Array.isArray(scene.dialog)) {
        scene.dialog.forEach((line, i) => {
            const isArchive = line.speaker === 'archive';
            const speakerName = isArchive ? 'АРХИВ' : 'ШКОЛЬНИК';
            const speakerClass = isArchive ? 'speaker-archive' : 'speaker-student';
            const lineClass = isArchive ? 'dialog-archive' : 'dialog-student';
            const icon = isArchive ? '📜' : '🎒';
            const delay = Math.min(700, i * 60);

            dialogHTML += `
                <div class="dialog-line ${lineClass}" style="--delay:${delay}ms">
                    <div class="speaker ${speakerClass}">
                        <span class="speaker-icon">${icon}</span>
                        <span class="speaker-name">${speakerName}</span>
                    </div>
                    <div class="dialog-text">${line.text}</div>
                </div>
            `;
        });
    }

    // Формируем кнопки выбора или кнопку продолжения
    let choiceButtonsHTML = '';
    if (scene.choices && Array.isArray(scene.choices)) {
        scene.choices.forEach(choice => {
            choiceButtonsHTML += `
                <button type="button" class="choice-btn" onclick="goToChapterById(${choice.next})">
                    <span class="btn-icon">▶</span>
                    <span class="btn-text">${choice.text}</span>
                </button>
            `;
        });
    } else if (scene.buttonText) {
        // Для обычных сцен с единственной кнопкой «Следующая сцена» не создаём внутреннюю кнопку,
        // чтобы навигация осуществлялась через общую панель навигации.
        choiceButtonsHTML = '';
    }

    const total = questScenes.length || 1;
    const currentNumber = scene.id || gameState.currentChapter + 1;
    const progressPercent = Math.min(100, ((gameState.currentChapter + 1) / total) * 100);

    // Пытаемся вытащить год из текста сцены (если встречается)
    const combinedText = (scene.dialog || []).map(l => (l && l.text) ? l.text : '').join(' ');
    const yearMatch = combinedText.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? yearMatch[1] : '';

    // Чипы метаданных (как музейная табличка)
    let metaChips = '';
    if (year) metaChips += `<span class="meta-chip">${year}</span>`;
    metaChips += `<span class="meta-chip">АРХИВ 1430</span>`;
    metaChips += `<span class="meta-chip meta-chip--scene">СЦЕНА ${currentNumber}/${total}</span>`;

    container.innerHTML = `
        <div class="chapter chapter--museum">
            <div class="chapter-header">
                <div class="chapter-kicker">ИНТЕРАКТИВНАЯ ЭКСПОЗИЦИЯ</div>
                <div class="chapter-meta">${metaChips}</div>
                <h1 class="chapter-title">${scene.title}</h1>
                <div class="chapter-progress">
                    <div class="progress-bar" style="width: ${progressPercent}%"></div>
                </div>
            </div>

            <div class="chapter-body">
                <div class="chapter-media">
                    <div class="photo-container">
                        <img src="${scene.photo}" alt="${scene.title}" class="chapter-photo" />
                        <div class="photo-overlay"></div>
                    </div>
                    <p class="photo-caption">${scene.photoCaption || ''}</p>
                </div>

                <div class="chapter-content">${dialogHTML}</div>
            </div>

            <div class="choice-buttons">
                ${choiceButtonsHTML}
            </div>
        </div>
    `;

    // Добавляем навигационную панель для управления переходами по сценам
    addNavigationButtons();
    // Автосейв прогресса квеста
    saveQuestProgress(scene);
    container.scrollTop = 0;
    requestAnimationFrame(updateQuestFloatingNavPadding);
}


function updateNavigationButtons() {
    const navButtons = document.getElementById('navButtons');
    if (!navButtons) return;

    const prevButton = navButtons.querySelector('.nav-prev') || navButtons.querySelector('button:first-child');
    const nextButton = navButtons.querySelector('.nav-next') || navButtons.querySelector('button:last-child');

    // Назад: отключаем на первой сцене
    const isFirst = gameState.currentChapter === 0;
    if (prevButton) {
        prevButton.disabled = isFirst;
        prevButton.classList.toggle('is-disabled', isFirst);
    }

    // Вперёд: на финальной сцене показываем "🏁"
    const currentScene = questScenes[gameState.currentChapter];
    // Финал считаем и при next: null/undefined (как в scenes.json), и при next: 'final' (старый формат)
    const isFinal = !!currentScene && (currentScene.next == null || currentScene.next === 'final');

    if (nextButton) {
        if (isFinal) {
            nextButton.innerHTML = '🏁';
            nextButton.dataset.tip = 'Завершить';
            nextButton.title = 'Завершить';
            nextButton.setAttribute('aria-label', 'Завершить');
        } else {
            nextButton.innerHTML = '▶';
            nextButton.dataset.tip = 'Вперёд';
            nextButton.title = 'Вперёд';
            nextButton.setAttribute('aria-label', 'Вперёд');
        }
    }
}

function showFinalScreen() {
    // Финал = квест завершён, прогресс больше не нужен
    clearQuestProgress();
    const container = document.getElementById('questContainer');

    container.innerHTML = `
        <div class="final-screen">
            <div class="final-header">
                <h1 class="final-title">${finalScreen.title}</h1>
                <div class="final-icon">🏆</div>
            </div>
            <div class="photo-container">
                <img src="${finalScreen.photo}" alt="Final" class="chapter-photo" />
                <div class="photo-overlay final"></div>
            </div>
            <p class="photo-caption">${finalScreen.photoCaption}</p>
            <div class="final-content">${finalScreen.content}</div>
            <button type="button" class="return-menu-btn" onclick="returnToMenu()">
                <span class="btn-icon">🏠</span>
                <span class="btn-text">ВЕРНУТЬСЯ В ГЛАВНОЕ МЕНЮ</span>
            </button>
        </div>
    `;

    const navButtons = document.getElementById('navButtons');
    if (navButtons) navButtons.remove();

    container.scrollTop = 0;
}

function nextChapter() {
    navigateToNextChapter();
}

// =============================================
// Загрузка сцен из внешнего JSON-файла
// =============================================

async function loadScenes() {
    // Чтобы не загружать файл несколько раз, запоминаем результат
    if (loadScenes.loaded) return questScenes;

    // Если страница открыта как file://, fetch('scenes.json') часто блокируется браузером.
    // В таком режиме просто используем встроенные сцены и не спамим ошибками в консоль.
    try {
        if (location && location.protocol === 'file:') {
            loadScenes.loaded = true;
            return questScenes;
        }
    } catch (_) {
        // На всякий случай: если location недоступен, продолжаем обычную попытку загрузки.
    }
    try {
        const response = await fetch('scenes.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        questScenes = data;
        loadScenes.loaded = true;
    } catch (e) {
        console.warn('Не удалось загрузить scenes.json — используем встроенные сцены.', e);
        // В случае ошибки оставляем встроенный набор сцен и помечаем как загруженный,
        // чтобы не повторять попытку и не плодить одинаковые сообщения.
        loadScenes.loaded = true;
    }
    return questScenes;
}

// Переход к сцене по её идентификатору (id)
function goToChapterById(id) {
    const index = questScenes.findIndex(sc => sc.id === id);
    if (index >= 0) {
        gameState.currentChapter = index;
        showChapter(index);
    }
}

// =============================================
// Галерея изображений
// =============================================

function startGallery() {
    // Переключаем отображение: показываем приложение и галерею
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('app').classList.add('active');
    document.getElementById('questMode').classList.add('hidden');
    document.getElementById('defenseMode').classList.add('hidden');
    document.getElementById('galleryMode').classList.remove('hidden');
    gameState.mode = 'gallery';
    showModeSplash('ГАЛЕРЕЯ', 'Открываю архив фото…');
    // В галерее проигрываем музыку меню
    SoundManager.stop();
    SoundManager.play('menu');
    buildGallery();
}

// Список изображений и подписей для галереи
const galleryImages = [
    { src: 'img/kisunko_school.jpg', caption: 'Юный Григорий' },
    { src: 'img/kisunko_student.jpg', caption: 'Студент' },
    { src: 'img/kisunko_soldier.jpg', caption: 'Рядовой ополчения' },
    { src: 'img/kisunko_teacher.jpg', caption: 'Преподаватель' },
    { src: 'img/rocket.jpg', caption: 'С-25/С-75' },
    { src: 'img/system_A.jpg', caption: 'Система “А”' },
    { src: 'img/rocket_launch.jpg', caption: 'Пуск ракеты' },
    { src: 'img/home_door.jpg', caption: 'Памятник' }
];

function buildGallery() {
    const container = document.getElementById('galleryContainer');
    if (!container) return;
    container.innerHTML = '';

    galleryImages.forEach((item, idx) => {
        // Делаем карточку кнопкой: и кликается, и фокусируется с клавиатуры
        const wrapper = document.createElement('button');
        wrapper.type = 'button';
        wrapper.className = 'gallery-item';
        wrapper.dataset.index = String(idx);
        wrapper.setAttribute('aria-label', item.caption);
        wrapper.addEventListener('click', () => openLightbox(idx));

        const img = document.createElement('img');
        img.src = item.src;
        img.alt = item.caption;
        img.loading = 'lazy';
        img.decoding = 'async';

        const caption = document.createElement('div');
        caption.className = 'gallery-caption';
        caption.textContent = item.caption;

        wrapper.appendChild(img);
        wrapper.appendChild(caption);
        container.appendChild(wrapper);
    });
}

// ===============================
// Gallery Lightbox (эффектно на защите ✨)
// ===============================
let lightboxOverlay = null;
let lightboxIndex = 0;
let lightboxLastFocus = null;

function ensureLightbox() {
    if (lightboxOverlay) return;

    lightboxOverlay = document.createElement('div');
    lightboxOverlay.id = 'lightboxOverlay';
    lightboxOverlay.className = 'lightbox-overlay';
    lightboxOverlay.setAttribute('aria-hidden', 'true');

    lightboxOverlay.innerHTML = `
        <div class="lightbox-backdrop" data-action="close"></div>
        <div class="lightbox-dialog" role="dialog" aria-modal="true" aria-label="Просмотр изображения">
            <button type="button" class="lightbox-close" data-action="close" aria-label="Закрыть">✕</button>
            <button type="button" class="lightbox-nav lightbox-prev" data-action="prev" aria-label="Предыдущее">◀</button>
            <img class="lightbox-image" id="lightboxImage" alt="" />
            <button type="button" class="lightbox-nav lightbox-next" data-action="next" aria-label="Следующее">▶</button>
            <div class="lightbox-caption" id="lightboxCaption"></div>
        </div>
    `;

    document.body.appendChild(lightboxOverlay);

    // Клики по фону/кнопкам
    lightboxOverlay.addEventListener('click', (e) => {
        const action = e.target && e.target.dataset ? e.target.dataset.action : null;
        if (action === 'close') {
            closeLightbox();
            return;
        }
        if (action === 'prev') {
            stepLightbox(-1);
            return;
        }
        if (action === 'next') {
            stepLightbox(1);
            return;
        }
    });

    // Клавиатура: Esc / ← / →
    document.addEventListener('keydown', (e) => {
        if (e.defaultPrevented) return;
        if (!isLightboxOpen()) return;
        // Если поверх открыт другой диалог — не реагируем
        if (isHelpOpen() || isDefenseTutorialOpen()) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            stepLightbox(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            stepLightbox(1);
        }
    });
}

function isLightboxOpen() {
    return !!(lightboxOverlay && lightboxOverlay.classList.contains('is-open'));
}

function openLightbox(index) {
    ensureLightbox();
    lightboxLastFocus = document.activeElement;
    lightboxIndex = Math.max(0, Math.min(galleryImages.length - 1, index));
    updateLightbox();

    lightboxOverlay.setAttribute('aria-hidden', 'false');
    lightboxOverlay.classList.add('is-open');
    updateBodyScrollLock();

    const closeBtn = lightboxOverlay.querySelector('.lightbox-close');
    if (closeBtn) closeBtn.focus();
}

function updateLightbox() {
    if (!lightboxOverlay) return;
    const img = document.getElementById('lightboxImage');
    const cap = document.getElementById('lightboxCaption');
    const item = galleryImages[lightboxIndex];
    if (!item) return;

    if (img) {
        img.src = item.src;
        img.alt = item.caption;
    }
    if (cap) cap.textContent = item.caption;
}

function stepLightbox(delta) {
    if (!galleryImages.length) return;
    lightboxIndex = (lightboxIndex + delta) % galleryImages.length;
    if (lightboxIndex < 0) lightboxIndex = galleryImages.length - 1;
    updateLightbox();
}

function closeLightbox(force = false) {
    if (!lightboxOverlay) return;

    lightboxOverlay.setAttribute('aria-hidden', 'true');
    lightboxOverlay.classList.remove('is-open');
    updateBodyScrollLock();

    if (!force && lightboxLastFocus && typeof lightboxLastFocus.focus === 'function') {
        try { lightboxLastFocus.focus(); } catch (_) {}
    }
}

// =============================================
// Canvas resize helpers (адаптивность "Полигона")
// =============================================

/**
 * Синхронизирует внутреннее разрешение canvas с его CSS‑размерами.
 * Это устраняет "мыло", корректирует масштаб и делает размещение башен
 * совпадающим с визуальным размером поля.
 */
function syncCanvasToCssSize(canvas) {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor(rect.height));
    if (!cssW || !cssH) return;

    if (canvas.width === cssW && canvas.height === cssH) return;

    const prevW = canvas.width || cssW;
    const prevH = canvas.height || cssH;

    // Масштабируем координаты уже размещённых объектов (чтобы они не "скакали" при ресайзе)
    if (gameState && gameState.mode === 'defense') {
        const sx = cssW / prevW;
        const sy = cssH / prevH;

        if (Array.isArray(gameState.towers)) {
            gameState.towers.forEach(t => {
                t.x *= sx;
                t.y *= sy;
            });
        }
        if (Array.isArray(gameState.enemies)) {
            gameState.enemies.forEach(e => {
                e.x *= sx;
                e.y *= sy;
            });
        }

        // Короткоживущие эффекты и снаряды лучше сбросить при изменении масштаба
        // (они быстро восстановятся, но не будут выглядеть "сломано").
        gameState.effects = [];
        gameState.projectiles = [];
    }

    canvas.width = cssW;
    canvas.height = cssH;
}

/**
 * Подписка на resize для поля "Полигона" с мягким дебаунсом.
 */
function attachDefenseResizeHandler(canvas) {
    // Если ранее уже подписывались — снимаем, чтобы не плодить обработчики
    if (gameState && gameState._defenseResizeHandler) {
        window.removeEventListener('resize', gameState._defenseResizeHandler);
    }

    let t = null;
    const handler = () => {
        if (!gameState || gameState.mode !== 'defense') return;
        if (t) clearTimeout(t);
        t = setTimeout(() => syncCanvasToCssSize(canvas), 120);
    };

    if (gameState) gameState._defenseResizeHandler = handler;
    window.addEventListener('resize', handler, { passive: true });
}

// Tower Defense Game
function initDefenseGame() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Подготовка контейнеров визуальных эффектов (снаряды, вспышки, маркеры)
    gameState.effects = [];
    gameState.projectiles = [];
    gameState._lastFrameTime = Date.now();

    // Подгоняем canvas под реальные CSS‑размеры (важно для корректного масштаба/клика)
    syncCanvasToCssSize(canvas);
    // Доп. синхронизация после первого кадра — на некоторых устройствах layout вычисляется не сразу
    requestAnimationFrame(() => syncCanvasToCssSize(canvas));
    attachDefenseResizeHandler(canvas);

    // Обновляем заголовок
    const defenseTitle = document.querySelector('.defense-title');
    if (defenseTitle) {
        defenseTitle.textContent = 'СИМУЛЯЦИЯ ЗАЩИТЫ ПОЛИГОНА';
    }

    // Обновляем информационную панель
    document.getElementById('wave').textContent = gameState.wave;
    document.getElementById('health').textContent = gameState.health;
    document.getElementById('resources').textContent = gameState.resources;

    // Улучшенная панель выбора башен
    const panel = document.getElementById('towerPanel');
    panel.innerHTML = '';

    towerTypes.forEach((tower, index) => {
        const card = document.createElement('div');
        card.className = 'tower-card';
        card.innerHTML = `
            <div class="tower-header">
                <div class="tower-icon">${tower.icon}</div>
                <div class="tower-name">${tower.name}</div>
            </div>
            <div class="tower-stats">
                <div class="stat">
                    <span class="stat-label">📏 Дальность:</span>
                    <span class="stat-value">${tower.range}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">💥 Урон:</span>
                    <span class="stat-value">${tower.damage}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">⚡ Скорость:</span>
                    <span class="stat-value">${tower.firerate.toFixed(1)}/сек</span>
                </div>
            </div>
            <div class="tower-history">${tower.history}</div>
            <div class="tower-cost">💰 ${tower.cost} ресурсов</div>
        `;
        card.onclick = () => selectTower(index);
        panel.appendChild(card);
    });

    // Снимаем предыдущий обработчик клика (если он был) и назначаем новый.
    canvas.onclick = null;
    canvas.onclick = (e) => {
        if (gameState.selectedTower === null) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        placeTower(x, y);
    };

    // Отрисовку запускаем сразу (поле видно), а волну — после обучения (если оно нужно)
    gameLoop(ctx, canvas);

    let waveStarted = false;
    const beginWave = () => {
        if (waveStarted) return;
        waveStarted = true;
        startWave();
    };

    // Обучение показывается только при первом запуске — дальше его можно открыть из справки
    openDefenseTutorial({ onDone: beginWave });
}

function selectTower(index) {
    gameState.selectedTower = index;

    document.querySelectorAll('.tower-card').forEach((card, i) => {
        if (i === index) {
            card.classList.add('selected');
            card.style.transform = 'scale(1.05)';
            card.style.boxShadow = '0 0 25px rgba(201, 176, 122, 0.4)';
        } else {
            card.classList.remove('selected');
            card.style.transform = 'scale(1)';
            card.style.boxShadow = 'none';
        }
    });
}

function placeTower(x, y) {
    const towerType = towerTypes[gameState.selectedTower];

    if (gameState.resources < towerType.cost) {
        showAlert('⚠️ Недостаточно ресурсов!');
        return;
    }

    const tooClose = gameState.towers.some(t => {
        const dist = Math.sqrt((t.x - x) ** 2 + (t.y - y) ** 2);
        return dist < 50;
    });

    if (tooClose) {
        showAlert('🚫 Слишком близко к другой башне!');
        return;
    }

    gameState.towers.push({
        x: x,
        y: y,
        type: gameState.selectedTower,
        lastFire: 0,
        rotation: 0
    });

    gameState.resources -= towerType.cost;
    document.getElementById('resources').textContent = gameState.resources;

    gameState.selectedTower = null;
    document.querySelectorAll('.tower-card').forEach(card => {
        card.classList.remove('selected');
        card.style.transform = 'scale(1)';
        card.style.boxShadow = 'none';
    });
}

function showAlert(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2000);
}

function startWave() {
    const numEnemies = 3 + gameState.wave * 2;
    gameState.enemiesRemaining = numEnemies;

    // Перед запуском новой волны отменяем все отложенные таймеры спавна из предыдущей волны
    if (Array.isArray(gameState.spawnTimeouts)) {
        gameState.spawnTimeouts.forEach(id => clearTimeout(id));
        gameState.spawnTimeouts = [];
    }

    for (let i = 0; i < numEnemies; i++) {
        const timeoutId = setTimeout(() => {
            gameState.enemies.push({
                x: -50,
                y: 100 + Math.random() * 400,
                speed: 1.2 + gameState.wave * 0.15,
                health: 60 + gameState.wave * 12,
                maxHealth: 60 + gameState.wave * 12,
                type: Math.floor(Math.random() * 3)
            });
        }, i * 800);
        // Сохраняем идентификатор таймера для последующего удаления
        if (Array.isArray(gameState.spawnTimeouts)) {
            gameState.spawnTimeouts.push(timeoutId);
        }
    }
}

function nextWave() {
    document.getElementById('historicalFact').classList.add('hidden');
    // Сбрасываем состояние «Читать далее» для факта
    if (window.FactReadMore && typeof window.FactReadMore.collapse === 'function') {
        window.FactReadMore.collapse();
    }
    gameState.wave++;
    document.getElementById('wave').textContent = gameState.wave;
    startWave();
}

/**
 * «Умная плотность» для блока исторического факта: текст по умолчанию
 * свёрнут и раскрывается по кнопке «Читать далее». Если текст короткий
 * и помещается целиком — кнопка скрывается.
 */
function initFactReadMore() {
    const toggle = document.getElementById('factToggle');
    const content = document.getElementById('factContent');
    if (!toggle || !content) return;

    const setExpanded = (expanded) => {
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggle.textContent = expanded ? 'Свернуть' : 'Читать далее';
        content.classList.toggle('fact-collapsed', !expanded);
    };

    const refresh = () => {
        // По умолчанию держим компактно
        setExpanded(false);
        // Дадим браузеру применить высоты/кламп
        requestAnimationFrame(() => {
            const full = content.scrollHeight;
            const visible = content.clientHeight;
            const hasMore = full > visible + 4;

            toggle.style.display = hasMore ? 'inline-flex' : 'none';
            if (!hasMore) {
                // Если текста мало — показываем полностью и не отвлекаем кнопкой
                content.classList.remove('fact-collapsed');
            }
        });
    };

    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        setExpanded(!expanded);
    });

    // Экспортируем наружу, чтобы вызывать при показе факта
    window.FactReadMore = {
        refresh,
        collapse: () => {
            setExpanded(false);
            toggle.style.display = 'inline-flex';
        }
    };

    // На ресайзах пересчитываем: чтобы на планшетах/при изменении окна
    // «читать далее» появлялось/исчезало корректно.
    let t;
    window.addEventListener('resize', () => {
        clearTimeout(t);
        t = setTimeout(() => {
            const factBox = document.getElementById('historicalFact');
            if (factBox && !factBox.classList.contains('hidden')) {
                refresh();
            }
        }, 120);
    });
}

// ------------------------------------------------------------
// ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ДЛЯ ПОЛИГОНА
// вспышки, маркеры целей, анимации выстрелов/снарядов
// ------------------------------------------------------------

function hexToRgb(hex) {
    if (!hex) return { r: 255, g: 255, b: 255 };
    let h = String(hex).trim();
    if (h.startsWith('#')) h = h.slice(1);
    if (h.length === 3) {
        h = h.split('').map(c => c + c).join('');
    }
    // На случай если в цвете уже есть альфа (например #RRGGBBAA) — обрежем до 6 символов.
    if (h.length > 6) h = h.slice(0, 6);
    const num = parseInt(h, 16);
    if (Number.isNaN(num)) return { r: 255, g: 255, b: 255 };
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function rgba(rgb, a) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function pushEffect(effect) {
    if (!Array.isArray(gameState.effects)) gameState.effects = [];
    gameState.effects.push(effect);
    // Ограничиваем размер массива эффектов, чтобы не падал FPS на слабых устройствах
    const limit = 260;
    if (gameState.effects.length > limit) {
        gameState.effects.splice(0, gameState.effects.length - limit);
    }
}

function pushProjectile(p) {
    if (!Array.isArray(gameState.projectiles)) gameState.projectiles = [];
    gameState.projectiles.push(p);
    const limit = 60;
    if (gameState.projectiles.length > limit) {
        gameState.projectiles.splice(0, gameState.projectiles.length - limit);
    }
}

function spawnSparks(x, y, rgb, now, count = 10) {
    for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 70 + Math.random() * 160;
        pushEffect({
            kind: 'particle',
            x,
            y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            rgb,
            t0: now,
            duration: 260 + Math.random() * 220,
            size: 1.2 + Math.random() * 2.4
        });
    }
}

function spawnSmokePuff(x, y, now, strength = 1) {
    // Лёгкий дымовой клуб (серо‑голубой), чтобы не перегружать FPS.
    // Слегка дрейфует вверх и в сторону.
    const ang = (-Math.PI / 2) + (Math.random() - 0.5) * 1.0;
    const sp = (12 + Math.random() * 26) * strength;
    const driftX = Math.cos(ang) * sp;
    const driftY = Math.sin(ang) * sp;
    pushEffect({
        kind: 'smoke',
        x,
        y,
        vx: driftX,
        vy: driftY,
        t0: now,
        duration: 950 + Math.random() * 450,
        r0: 6 + Math.random() * 6,
        r1: 22 + Math.random() * 18,
        a0: 0.22 + Math.random() * 0.10
    });
}

function spawnLaserShot(tower, enemy, towerType, now) {
    const rgb = hexToRgb(towerType.color);
    // Импульс/луч
    pushEffect({ kind: 'laser', x1: tower.x, y1: tower.y, x2: enemy.x, y2: enemy.y, rgb, t0: now, duration: 140, width: 4 });
    // Вспышки
    pushEffect({ kind: 'muzzle', x: tower.x, y: tower.y, rgb, t0: now, duration: 120, radius: 20 });
    pushEffect({ kind: 'hit', x: enemy.x, y: enemy.y, rgb, t0: now, duration: 220, radius: 12 });
    // Маркер цели
    pushEffect({ kind: 'target', x: enemy.x, y: enemy.y, rgb, t0: now, duration: 260, radius: 22 });
    // Искры
    spawnSparks(enemy.x, enemy.y, { r: 255, g: 255, b: 255 }, now, 8);
    spawnSparks(enemy.x, enemy.y, rgb, now, 6);
}

function spawnMissile(tower, enemy, towerType, now) {
    const rgb = hexToRgb(towerType.color);
    const dx = (enemy.x - tower.x);
    const dy = (enemy.y - tower.y);
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 560; // px/сек
    const life = Math.min(1600, (dist / speed) * 1000 + 250);

    pushProjectile({
        kind: 'missile',
        x: tower.x,
        y: tower.y,
        tx: enemy.x,
        ty: enemy.y,
        target: enemy,
        speed,
        rgb,
        damage: towerType.damage,
        t0: now,
        life
    });

    // Вспышка пуска + маркер цели
    pushEffect({ kind: 'muzzle', x: tower.x, y: tower.y, rgb, t0: now, duration: 140, radius: 22 });
    pushEffect({ kind: 'target', x: enemy.x, y: enemy.y, rgb, t0: now, duration: 240, radius: 22 });
}

function drawMissile(ctx, p, dx, dy, now) {
    const ang = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);

    // корпус
    ctx.shadowBlur = 10;
    ctx.shadowColor = rgba(p.rgb, 0.85);
    ctx.fillStyle = rgba(p.rgb, 0.95);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, 5);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, -5);
    ctx.closePath();
    ctx.fill();

    // пламя (мерцает)
    const flicker = 3 + Math.sin(now / 45) * 2;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 180, 80, 0.95)';
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-14 - flicker, 3);
    ctx.lineTo(-12 - flicker, 0);
    ctx.lineTo(-14 - flicker, -3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function updateAndRenderCombatFX(ctx, now, dtMs) {
    const dt = Math.min(34, Math.max(0, dtMs || 16));
    const dtSec = dt / 1000;

    // --- Projectiles (анимации выстрелов) ---
    if (!Array.isArray(gameState.projectiles)) gameState.projectiles = [];
    const keptProjectiles = [];
    for (const p of gameState.projectiles) {
        const age = now - p.t0;
        if (age > p.life) continue;

        // Если цель жива — делаем лёгкое наведение (плавно обновляем координату цели)
        if (p.target && p.target.health > 0) {
            p.tx = p.target.x;
            p.ty = p.target.y;
        }

        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const step = p.speed * dtSec;

        if (dist <= step) {
            // попадание
            p.x = p.tx;
            p.y = p.ty;

            if (p.damage && p.target && p.target.health > 0) {
                p.target.health -= p.damage;
            }

            // вспышка/взрыв
            pushEffect({ kind: 'explosion', x: p.x, y: p.y, rgb: p.rgb, t0: now, duration: 260, radius: 34 });
            // кольцевая ударная волна
            pushEffect({ kind: 'shockwave', x: p.x, y: p.y, rgb: p.rgb, t0: now, duration: 560, r0: 6, r1: 92, width: 3 });
            pushEffect({ kind: 'hit', x: p.x, y: p.y, rgb: p.rgb, t0: now, duration: 220, radius: 14 });
            pushEffect({ kind: 'target', x: p.x, y: p.y, rgb: p.rgb, t0: now, duration: 200, radius: 20 });
            spawnSparks(p.x, p.y, { r: 255, g: 255, b: 255 }, now, 10);
            spawnSparks(p.x, p.y, p.rgb, now, 10);
            // лёгкий дым после взрыва
            for (let s = 0; s < 4; s++) spawnSmokePuff(p.x, p.y, now, 1.1);
            continue;
        }

        // движение
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;

        // лёгкий след
        if (Math.random() < 0.55) {
            pushEffect({ kind: 'trail', x: p.x, y: p.y, rgb: p.rgb, t0: now, duration: 220, radius: 10 });
        }

        // дымовой след (редко, чтобы не перегружать)
        if (Math.random() < 0.18) {
            // чуть смещаем клуб назад по направлению полёта
            const backX = p.x - (dx / dist) * 10;
            const backY = p.y - (dy / dist) * 10;
            spawnSmokePuff(backX, backY, now, 1);
        }
        // рисуем ракету
        drawMissile(ctx, p, dx, dy, now);

        keptProjectiles.push(p);
    }
    gameState.projectiles = keptProjectiles;

    // --- Effects (вспышки/лучи/маркеры/частицы) ---
    if (!Array.isArray(gameState.effects)) gameState.effects = [];
    const kept = [];
    for (const e of gameState.effects) {
        const age = now - e.t0;
        const p = age / e.duration;
        if (p >= 1) continue;

        if (e.kind === 'laser') {
            const a = 1 - p;
            ctx.save();
            ctx.globalAlpha = 0.9 * a;
            ctx.lineWidth = (e.width || 4) * (0.8 + 0.4 * a);
            ctx.strokeStyle = rgba(e.rgb, 1);
            ctx.shadowBlur = 18 * a;
            ctx.shadowColor = rgba(e.rgb, 0.95);
            ctx.setLineDash([14, 18]);
            ctx.lineDashOffset = -age / 12;
            ctx.beginPath();
            ctx.moveTo(e.x1, e.y1);
            ctx.lineTo(e.x2, e.y2);
            ctx.stroke();
            ctx.setLineDash([]);
            // яркое ядро
            ctx.globalAlpha = 0.25 * a;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(e.x1, e.y1);
            ctx.lineTo(e.x2, e.y2);
            ctx.stroke();
            ctx.restore();
        } else if (e.kind === 'muzzle') {
            const a = 1 - p;
            const r = (e.radius || 18) * (0.65 + p);
            ctx.save();
            ctx.globalAlpha = 0.95 * a;
            const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
            g.addColorStop(0, rgba(e.rgb, 0.9 * a));
            g.addColorStop(0.6, rgba(e.rgb, 0.25 * a));
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (e.kind === 'trail') {
            const a = 1 - p;
            const r = (e.radius || 8) * (0.7 + p * 0.7);
            ctx.save();
            ctx.globalAlpha = 0.35 * a;
            ctx.fillStyle = rgba(e.rgb, 0.8);
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (e.kind === 'hit') {
            const a = 1 - p;
            const r = (e.radius || 10) * (0.7 + 1.2 * p);
            ctx.save();
            ctx.globalAlpha = 0.9 * a;
            ctx.strokeStyle = rgba(e.rgb, 0.95);
            ctx.lineWidth = 2;
            ctx.shadowBlur = 12 * a;
            ctx.shadowColor = rgba(e.rgb, 0.95);
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.25 * a;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(e.x, e.y, 2 + 4 * (1 - p), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (e.kind === 'explosion') {
            const a = 1 - p;
            const r = (e.radius || 28) * (0.6 + 1.1 * p);
            ctx.save();
            ctx.globalAlpha = 0.75 * a;
            const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
            g.addColorStop(0, 'rgba(255,240,210,0.95)');
            g.addColorStop(0.2, 'rgba(255,180,80,0.75)');
            g.addColorStop(0.55, rgba(e.rgb, 0.35 * a));
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (e.kind === 'shockwave') {
            // Кольцевая ударная волна: расширяется и истончается
            const a = 1 - p;
            const r = (e.r0 || 4) + ((e.r1 || 90) - (e.r0 || 4)) * p;
            const w = (e.width || 3) * (0.9 + (1 - p) * 0.6);
            ctx.save();
            ctx.globalAlpha = 0.55 * a;
            ctx.strokeStyle = rgba(e.rgb, 0.95);
            ctx.lineWidth = w;
            ctx.shadowBlur = 18 * a;
            ctx.shadowColor = rgba(e.rgb, 0.6);
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.stroke();
            // Внутреннее полупрозрачное кольцо
            ctx.globalAlpha = 0.18 * a;
            ctx.shadowBlur = 0;
            ctx.lineWidth = Math.max(1, w - 1);
            ctx.beginPath();
            ctx.arc(e.x, e.y, r * 0.92, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (e.kind === 'smoke') {
            // Дым: мягкий туман с ростом радиуса и дрейфом
            const a = (e.a0 || 0.22) * (1 - p);
            const r = (e.r0 || 8) + ((e.r1 || 36) - (e.r0 || 8)) * p;
            const x = e.x + (e.vx || 0) * (age / 1000);
            const y = e.y + (e.vy || 0) * (age / 1000);
            ctx.save();
            ctx.globalAlpha = a;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(220,230,240,0.55)');
            g.addColorStop(0.55, 'rgba(140,160,180,0.25)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (e.kind === 'target') {
            const a = 1 - p;
            const r = (e.radius || 20) * (0.95 + 0.05 * Math.sin(age / 60));
            const rot = age / 220;
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(rot);
            ctx.globalAlpha = 0.75 * a;
            ctx.strokeStyle = rgba(e.rgb, 0.95);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
            // крестик
            ctx.beginPath();
            ctx.moveTo(-r - 6, 0);
            ctx.lineTo(-r + 6, 0);
            ctx.moveTo(r - 6, 0);
            ctx.lineTo(r + 6, 0);
            ctx.moveTo(0, -r - 6);
            ctx.lineTo(0, -r + 6);
            ctx.moveTo(0, r - 6);
            ctx.lineTo(0, r + 6);
            ctx.stroke();
            // дуги
            ctx.globalAlpha = 0.35 * a;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0.25, 1.0);
            ctx.stroke();
            ctx.restore();
        } else if (e.kind === 'particle') {
            // частицы обновляем по dt
            const a = 1 - p;
            e.x += (e.vx || 0) * dtSec;
            e.y += (e.vy || 0) * dtSec;
            e.vx *= 0.88;
            e.vy *= 0.88;
            ctx.save();
            ctx.globalAlpha = 0.9 * a;
            ctx.fillStyle = rgba(e.rgb, 0.95);
            ctx.shadowBlur = 8 * a;
            ctx.shadowColor = rgba(e.rgb, 0.8);
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size || 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        kept.push(e);
    }
    gameState.effects = kept;
}

function gameLoop(ctx, canvas) {
    // Время кадра (нужно для анимаций и чтобы эффекты были одинаковыми на разных FPS)
    const now = Date.now();
    const dt = Math.min(34, now - (gameState._lastFrameTime || now));
    gameState._lastFrameTime = now;

    // Очистка с улучшенным фоном
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рисуем звёздное небо
    drawStars(ctx, canvas);

    // Рисуем сетку полигона
    ctx.strokeStyle = 'rgba(201, 176, 122, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 10]);

    for (let x = 0; x < canvas.width; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    ctx.setLineDash([]);

    // Рисуем башни с улучшенной графикой
    gameState.towers.forEach(tower => {
        const towerType = towerTypes[tower.type];

        // Обновляем вращение радара
        if (tower.type === 0) { // Только для РЛС
            tower.rotation += 0.02;
        }

        // Круг дальности
        ctx.strokeStyle = towerType.color + '44';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, towerType.range, 0, Math.PI * 2);
        ctx.stroke();

        // Для РЛС добавим «луч обзора» (слабый музейный эффект, недорогой по FPS)
        if (tower.type === 0) {
            const rgb = hexToRgb(towerType.color);
            ctx.save();
            ctx.translate(tower.x, tower.y);
            ctx.rotate(tower.rotation);
            const sweepLen = Math.min(220, towerType.range);
            const grad = ctx.createLinearGradient(0, 0, sweepLen, 0);
            grad.addColorStop(0, rgba(rgb, 0));
            grad.addColorStop(0.15, rgba(rgb, 0.08));
            grad.addColorStop(1, rgba(rgb, 0.0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(sweepLen, -18);
            ctx.lineTo(sweepLen, 18);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Пульсирующий внутренний круг
        const pulseSize = Math.sin(Date.now() / 500) * 5 + 25;
        ctx.fillStyle = towerType.color + '77';
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();

        // Рисуем башню
        ctx.fillStyle = towerType.color;
        ctx.beginPath();

        if (tower.type === 0) { // РЛС - вращающаяся антенна
            ctx.save();
            ctx.translate(tower.x, tower.y);
            ctx.rotate(tower.rotation);

            // Основание
            ctx.fillRect(-12, -12, 24, 24);

            // Антенна
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(-20, 0);
            ctx.lineTo(20, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        } else if (tower.type === 1) { // РЛС наведения
            // Основание
            ctx.fillRect(tower.x - 15, tower.y - 15, 30, 30);

            // Антенна
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(tower.x - 5, tower.y - 25, 10, 40);
        } else { // Пусковая установка
            // Платформа
            ctx.fillRect(tower.x - 20, tower.y - 10, 40, 20);

            // Ракета
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(tower.x - 5, tower.y - 25, 10, 30);
        }

        // Иконка башни
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(towerType.icon, tower.x, tower.y);
    });

    // Обновляем и рисуем врагов
    gameState.enemies = gameState.enemies.filter(enemy => {
        enemy.x += enemy.speed;

        if (enemy.x > canvas.width) {
            gameState.health -= 15;
            document.getElementById('health').textContent = gameState.health;
            gameState.enemiesRemaining--;

            if (gameState.health <= 0) {
                setTimeout(() => {
                    alert('🚨 ПОЛИГОН ЗАХВАЧЕН!\nСистема защиты нарушена.');
                    returnToMenu();
                }, 100);
            }

            return false;
        }

        if (enemy.health <= 0) {
            gameState.resources += 75;
            document.getElementById('resources').textContent = gameState.resources;
            gameState.enemiesRemaining--;
            return false;
        }

        // Рисуем врага
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        const enemyColors = ['#B86B5F', '#FFA500', '#FF4444'];
        ctx.fillStyle = enemyColors[enemy.type];

        // Форма врага (ракета)
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(-8, 8);
        ctx.lineTo(0, 4);
        ctx.lineTo(8, 8);
        ctx.closePath();
        ctx.fill();

        // Огонь из двигателя
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(-4, 8);
        ctx.lineTo(0, 16);
        ctx.lineTo(4, 8);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Полоска здоровья
        const healthPercent = enemy.health / enemy.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x - 15, enemy.y - 25, 40, 6);
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFA500' : '#FF4444';
        ctx.fillRect(enemy.x - 15, enemy.y - 25, 40 * healthPercent, 6);

        return true;
    });

    // Стрельба башен
    const currentTime = now;
    gameState.towers.forEach(tower => {
        const towerType = towerTypes[tower.type];
        const fireDelay = 1000 / towerType.firerate;

        if (currentTime - tower.lastFire < fireDelay) return;

        let closestEnemy = null;
        let closestDist = Infinity;

        gameState.enemies.forEach(enemy => {
            const dist = Math.sqrt((enemy.x - tower.x) ** 2 + (enemy.y - tower.y) ** 2);
            if (dist <= towerType.range && dist < closestDist) {
                closestEnemy = enemy;
                closestDist = dist;
            }
        });

        if (closestEnemy) {
            // Новые визуальные эффекты:
            // - вспышка/маркер цели/частицы
            // - анимированный снаряд (для ПУ В-1000) или лазерный импульс (для РЛС)
            if (tower.type === 2) {
                // Пусковая установка: анимируем ракету и наносим урон при попадании
                spawnMissile(tower, closestEnemy, towerType, currentTime);
            } else {
                // РЛС/РЛС наведения: быстрый импульс
                spawnLaserShot(tower, closestEnemy, towerType, currentTime);
                closestEnemy.health -= towerType.damage;
            }
            tower.lastFire = currentTime;
        }
    });

    // Рисуем и обновляем визуальные эффекты поверх врагов
    updateAndRenderCombatFX(ctx, currentTime, dt);

    if (gameState.enemiesRemaining === 0 && gameState.enemies.length === 0) {
        const factIndex = (gameState.wave - 1) % historicalFacts.length;
        const fact = historicalFacts[factIndex];

        document.getElementById('factTitle').textContent = fact.title;
        const factContentEl = document.getElementById('factContent');
        if (factContentEl) factContentEl.textContent = fact.content;
        document.getElementById('historicalFact').classList.remove('hidden');

        // Обновляем «Читать далее»: компактно по умолчанию + скрыть кнопку, если текст короткий
        if (window.FactReadMore && typeof window.FactReadMore.refresh === 'function') {
            window.FactReadMore.refresh();
        }
    }

    gameState.gameLoop = requestAnimationFrame(() => gameLoop(ctx, canvas));
}

function drawStars(ctx, canvas) {
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 50; i++) {
        const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(i * 67.89) * 0.5 + 0.5) * canvas.height;
        const size = Math.sin(Date.now() / 1000 + i) * 0.5 + 1.5;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Sound Controls
function getTrackForMode(mode) {
    if (mode === 'quest') return 'quest';
    if (mode === 'defense') return 'defense';
    // Меню/галерея/неизвестный режим — используем музыку меню
    return 'menu';
}

function toggleSound() {
    SoundManager.enabled = !SoundManager.enabled;

    if (SoundManager.enabled) {
        SoundManager.play(getTrackForMode(gameState && gameState.mode));
    } else {
        SoundManager.stop();
    }

    SoundManager.saveSettings();
    updateSoundToggleText();
    updateSoundPanelIcon();
}


function changeVolume(value) {
    SoundManager.setVolume(value);
    // Не меняем текст кнопки на проценты, чтобы панель выглядела аккуратно.
    // При желании можно показывать проценты рядом с лейблом.
    const label = document.querySelector('.sound-controls .volume-control label');
    if (label) label.textContent = `Громкость: ${Math.round(value)}%`;
}

// Prevent context menu
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
});

// (Стили блока исторического факта вынесены в styles.css)
// === END UI COMPACT OVERLAY FOR DEFENSE FACT ===
