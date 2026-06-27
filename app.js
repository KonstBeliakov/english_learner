/**
 * English Mix — main application
 * Screens: LevelSelect -> TextSelect -> Reading
 */
(function () {
    'use strict';

    // ===================== STATE =====================
    const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const STORAGE_KEY = 'english_mix_level';

    let currentLevel = null;
    let currentBook = null;
    let allWordElements = [];

    // ===================== DOM refs =====================
    const $ = function (id) { return document.getElementById(id); };

    const levelScreen = $('levelScreen');
    const textScreen = $('textScreen');
    const readingScreen = $('readingScreen');

    const levelCards = document.querySelectorAll('.level-card');
    const levelConfirmBtn = $('levelConfirmBtn');
    const levelLabel = $('levelLabel');
    const bookList = $('bookList');
    const backToLevelBtn = $('backToLevelBtn');

    const readingSubtitle = $('readingSubtitle');
    const textContentEl = $('textContent');
    const showTranslationBtn = $('showTranslationBtn');
    const resetBtn = $('resetBtn');
    const backToBooksBtn = $('backToBooksBtn');
    const tooltipEl = $('tooltip');
    const tooltipTranslation = $('tooltipTranslation');
    const tooltipOriginal = $('tooltipOriginal');

    // ===================== Screen switching =====================
    function showScreen(screenId) {
        levelScreen.classList.add('hidden');
        textScreen.classList.add('hidden');
        readingScreen.classList.add('hidden');
        document.getElementById(screenId).classList.remove('hidden');
    }

    // ===================== LEVEL SELECTION =====================
    function initLevelScreen() {
        var saved = localStorage.getItem(STORAGE_KEY);
        levelCards.forEach(function (card) {
            card.classList.remove('selected');
            var lvl = card.getAttribute('data-level');
            if (saved && lvl === saved) {
                card.classList.add('selected');
                levelConfirmBtn.disabled = false;
                currentLevel = saved;
            }
        });

        levelCards.forEach(function (card) {
            card.addEventListener('click', function () {
                levelCards.forEach(function (c) { c.classList.remove('selected'); });
                this.classList.add('selected');
                currentLevel = this.getAttribute('data-level');
                levelConfirmBtn.disabled = false;
            });
        });

        levelConfirmBtn.addEventListener('click', function () {
            if (currentLevel) {
                localStorage.setItem(STORAGE_KEY, currentLevel);
                initTextScreen(currentLevel);
            }
        });
    }

    // ===================== TEXT SELECTION =====================
    function initTextScreen(level) {
        levelLabel.textContent = level;
        showScreen('textScreen');
        loadBooks(function (books) {
            renderBookList(books);
        });
    }

    function loadBooks(callback) {
        var books = [];
        if (typeof BOOKS_DATA !== 'undefined') {
            BOOKS_DATA.forEach(function (data, i) {
                books.push({
                    id: data.id || 'book_' + i,
                    title: data.title || data.book || 'Unknown',
                    author: data.author || '',
                    dataIndex: i
                });
            });
        }
        callback(books);
    }

    function renderBookList(books) {
        bookList.innerHTML = '';
        if (books.length === 0) {
            bookList.innerHTML = '<p class="empty-msg">Пока нет книг для этого уровня.</p>';
            return;
        }
        books.forEach(function (book) {
            var card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML =
                '<div class="book-title">' + escapeHtml(book.title) + '</div>' +
                '<div class="book-author">' + escapeHtml(book.author) + '</div>';
            card.addEventListener('click', function () {
                loadBook(book);
            });
            bookList.appendChild(card);
        });
    }

    function loadBook(book) {
        currentBook = book;
        readingSubtitle.textContent = book.title + ' (' + currentLevel + ')';

        var data = null;
        if (typeof BOOKS_DATA !== 'undefined' && book.dataIndex !== undefined) {
            data = BOOKS_DATA[book.dataIndex];
        }

        if (data) {
            showReadingScreen(data);
        } else {
            readingSubtitle.textContent = 'Ошибка: книга не найдена';
        }
    }

    // ===================== READING SCREEN =====================
    function showReadingScreen(textData) {
        showScreen('readingScreen');
        textContentEl.innerHTML = '';
        allWordElements = [];

        if (!textData.paragraphs || textData.paragraphs.length === 0) {
            textContentEl.innerHTML = '<p class="empty-msg">Текст пуст.</p>';
            return;
        }

        textData.paragraphs.forEach(function (para) {
            var pEl = document.createElement('p');
            pEl.innerHTML = buildParagraphHTML(para);
            textContentEl.appendChild(pEl);
        });

        allWordElements = Array.from(textContentEl.querySelectorAll('.eng-word'));

        allWordElements.forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleWordTranslation(el);
            });
            el.addEventListener('mouseenter', function (e) {
                showTooltip(el, e);
            });
            el.addEventListener('mouseleave', function () {
                hideTooltip();
            });
        });
    }

    // ===================== PARAGRAPH BUILDER =====================
    function buildParagraphHTML(para) {
        var ru = para.ru;
        var words = para.words || [];
        if (words.length === 0) return ru;

        var sorted = words.slice().sort(function (a, b) {
            return b.en.length - a.en.length;
        });

        var result = ru;
        sorted.forEach(function (w) {
            var escaped = escapeRegExp(w.ru);
            var regex = new RegExp(escaped, 'gi');
            var replacement = '<span class="eng-word" data-en="' + escapeAttr(w.en) + '" data-ru="' + escapeAttr(w.ru) + '">' + w.en + '</span>';
            result = result.replace(regex, replacement);
        });
        return result;
    }

    function toggleWordTranslation(el) {
        el.classList.toggle('translated');
    }

    function showAllTranslations() {
        allWordElements.forEach(function (el) {
            el.classList.add('translated');
        });
    }

    // ===================== TOOLTIP =====================
    function showTooltip(el, e) {
        var en = el.getAttribute('data-en');
        var ru = el.getAttribute('data-ru');
        tooltipTranslation.textContent = en + ' \u2014 ' + ru;
        tooltipOriginal.textContent = '\u041D\u0430\u0436\u043C\u0438, \u0447\u0442\u043E\u0431\u044B ' +
            (el.classList.contains('translated') ? '\u0441\u043A\u0440\u044B\u0442\u044C' : '\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C') +
            ' \u043F\u0435\u0440\u0435\u0432\u043E\u0434';
        tooltipEl.classList.remove('hidden');
        tooltipEl.style.left = e.clientX + 12 + 'px';
        tooltipEl.style.top = e.clientY + 12 + 'px';
    }

    function hideTooltip() {
        tooltipEl.classList.add('hidden');
    }

    // ===================== HELPERS =====================
    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function escapeAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ===================== EVENT BINDINGS =====================
    function bindEvents() {
        showTranslationBtn.addEventListener('click', showAllTranslations);
        resetBtn.addEventListener('click', function () {
            if (currentBook) {
                loadBook(currentBook);
            }
        });
        backToLevelBtn.addEventListener('click', function () {
            initLevelScreen();
            showScreen('levelScreen');
        });
        backToBooksBtn.addEventListener('click', function () {
            if (currentLevel) {
                initTextScreen(currentLevel);
            }
        });
        document.addEventListener('mousemove', function (e) {
            tooltipEl.style.left = e.clientX + 12 + 'px';
            tooltipEl.style.top = e.clientY + 12 + 'px';
        });
    }

    // ===================== INIT =====================
    function init() {
        bindEvents();
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved && LEVELS.indexOf(saved) !== -1) {
            currentLevel = saved;
            initTextScreen(saved);
        } else {
            showScreen('levelScreen');
            initLevelScreen();
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();

