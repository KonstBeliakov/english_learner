/**
 * English Mix — main application
 * Screens: LevelSelect -> TextSelect -> Reading
 */


    // ===================== STATE =====================
    const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const STORAGE_KEY = 'english_mix_level';

    let currentLevel = null;
    let currentBook = null;
    let allWordElements = [];
    let quizWords = [];
    let currentTextData = null;
    let currentBookData = null;
    let currentChapter = 0;

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
    const finishBtn = $('finishBtn');
    const tooltipEl = $('tooltip');
    const tooltipTranslation = $('tooltipTranslation');
    const tooltipOriginal = $('tooltipOriginal');
    const quizScreen = $('quizScreen');
    const quizSubtitle = $('quizSubtitle');
    const quizBackBtn = $('quizBackBtn');
    const resultScreen = $('resultScreen');
    const resultSubtitle = $('resultSubtitle');
    const resultScore = $('resultScore');
    const resultPct = $('resultPct');
    const ratingQuizzes = $('ratingQuizzes');
    const ratingTotal = $('ratingTotal');
    const ratingCorrect = $('ratingCorrect');
    const ratingPct = $('ratingPct');
    const resultBackBtn = $('resultBackBtn');
    const chapterScreen = $('chapterScreen');
    const chapterSubtitle = $('chapterSubtitle');
    const chapterList = $('chapterList');
    const backToBookListBtn = $('backToBookListBtn');

    // ===================== Screen switching =====================
    function showScreen(screenId) {
        levelScreen.classList.add('hidden');
        textScreen.classList.add('hidden');
        readingScreen.classList.add('hidden');
        chapterScreen.classList.add('hidden');
        quizScreen.classList.add('hidden');
        resultScreen.classList.add('hidden');
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
            var data = null;
            if (typeof BOOKS_DATA !== 'undefined' && book.dataIndex !== undefined) {
                data = BOOKS_DATA[book.dataIndex];
            }
            var chCount = data ? data.chapters.length : 0;

            var progress = getProgress(book.id);
            var lastCh = progress.lastChapter || 0;

            var card = document.createElement('div');
            card.className = 'book-card';
            var info = '<div class="book-title">' + escapeHtml(book.title) + '</div>' +
                '<div class="book-author">' + escapeHtml(book.author) + '</div>';
            if (chCount > 1) {
                info += '<div class="book-chapters">' + chCount + ' глав</div>';
            }
            if (lastCh > 0) {
                info += '<div class="book-progress">Прочитано глав: ' + lastCh + '/' + chCount + '</div>';
                info += '<div class="book-continue">Продолжить (глава ' + (lastCh + 1) + ') →</div>';
            }
            card.innerHTML = info;
            card.addEventListener('click', function () {
                loadBook(book);
            });
            bookList.appendChild(card);
        });
    }

    function loadBook(book) {
        currentBook = book;

        var data = null;
        if (typeof BOOKS_DATA !== 'undefined' && book.dataIndex !== undefined) {
            data = BOOKS_DATA[book.dataIndex];
        }

        if (!data) {
            readingSubtitle.textContent = 'Ошибка: книга не найдена';
            return;
        }

        currentBookData = data;

        if (data.chapters.length > 1) {
            showChapterSelection(book, data);
        } else {
            // Single chapter: go directly to reading
            currentChapter = 0;
            showChapter(book, data, 0);
        }
    }

    function showChapterSelection(book, data) {
        chapterSubtitle.textContent = book.title + ' (' + currentLevel + ')';
        chapterList.innerHTML = '';

        var progress = getProgress(book.id);

        data.chapters.forEach(function (ch, idx) {
            var isCompleted = progress.completed && progress.completed['ch_' + idx];
            var card = document.createElement('div');
            card.className = 'book-card';
            var status = isCompleted ? ' ✅' : '';
            card.innerHTML = '<div class="book-title">' + escapeHtml(ch.title) + status + '</div>';
            card.addEventListener('click', function () {
                currentChapter = idx;
                showChapter(book, data, idx);
            });
            chapterList.appendChild(card);
        });

        showScreen('chapterScreen');
        window.scrollTo(0, 0);
    }

    function showChapter(book, data, chapterIndex) {
        currentChapter = chapterIndex;
        readingSubtitle.textContent = data.chapters[chapterIndex].title + ' (' + currentLevel + ')';

        // Build a chapter-only object for showReadingScreen
        var chapterData = {
            paragraphs: data.chapters[chapterIndex].paragraphs
        };
        showReadingScreen(chapterData);
    }

    // ===================== READING SCREEN =====================
    function showReadingScreen(textData) {
        currentTextData = textData;
        showScreen('readingScreen');
        window.scrollTo(0, 0);
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
            var letters = "\u0430-\u044f\u0451\u0410-\u042f\u0401a-zA-Z";
            var regex = new RegExp("(?<![" + letters + "])" + escaped + "(?![" + letters + "])", "gi");
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

    function getProgress(bookId) {
        var key = 'progress_' + bookId;
        try {
            return JSON.parse(localStorage.getItem(key)) || { lastChapter: 0, completed: {} };
        } catch(e) { return { lastChapter: 0, completed: {} }; }
    }

    function saveProgress(bookId, chapterIndex) {
        var key = 'progress_' + bookId;
        var data = getProgress(bookId);
        data.lastChapter = Math.max(data.lastChapter, chapterIndex + 1);
        data.completed['ch_' + chapterIndex] = true;
        localStorage.setItem(key, JSON.stringify(data));
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ===================== EVENT BINDINGS =====================


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

