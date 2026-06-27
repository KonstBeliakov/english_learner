(function () {
    'use strict';

    // --- DOM refs ---
    const textContentEl = document.getElementById('textContent');
    const textSelectEl = document.getElementById('textSelect');
    const showTranslationBtn = document.getElementById('showTranslationBtn');
    const resetBtn = document.getElementById('resetBtn');
    const tooltipEl = document.getElementById('tooltip');
    const tooltipTranslation = document.getElementById('tooltipTranslation');
    const tooltipOriginal = document.getElementById('tooltipOriginal');

    // --- State ---
    let currentTextId = null;
    let allWordElements = [];

    // --- Init ---
    function init() {
        populateSelect();
        bindEvents();
        loadText(TEXTS[0].id);
    }

    // --- Populate select ---
    function populateSelect() {
        TEXTS.forEach(function (t) {
            var opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.title;
            textSelectEl.appendChild(opt);
        });
    }

    // --- Bind events ---
    function bindEvents() {
        textSelectEl.addEventListener('change', function () {
            loadText(this.value);
        });

        showTranslationBtn.addEventListener('click', showAllTranslations);
        resetBtn.addEventListener('click', function () {
            loadText(currentTextId);
        });

        document.addEventListener('mousemove', function (e) {
            tooltipEl.style.left = e.clientX + 12 + 'px';
            tooltipEl.style.top = e.clientY + 12 + 'px';
        });
    }

    // --- Load text ---
    function loadText(id) {
        currentTextId = id;
        var textData = TEXTS.find(function (t) { return t.id === id; });
        if (!textData) return;

        textContentEl.innerHTML = '';
        allWordElements = [];

        textData.paragraphs.forEach(function (para) {
            var pEl = document.createElement('p');
            pEl.innerHTML = buildParagraphHTML(para);
            textContentEl.appendChild(pEl);
        });

        // Collect all .eng-word elements
        allWordElements = Array.from(textContentEl.querySelectorAll('.eng-word'));

        // Bind click/hover to each word
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

        // Reset select
        textSelectEl.value = id;
    }

    // --- Build paragraph HTML ---
    function buildParagraphHTML(para) {
        var ru = para.ru;
        var words = para.words;

        // Sort words by length descending to match longer phrases first
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

    // --- Toggle single word ---
    function toggleWordTranslation(el) {
        el.classList.toggle('translated');
    }

    // --- Show all translations ---
    function showAllTranslations() {
        allWordElements.forEach(function (el) {
            el.classList.add('translated');
        });
    }

    // --- Tooltip ---
    function showTooltip(el, e) {
        var en = el.getAttribute('data-en');
        var ru = el.getAttribute('data-ru');
        tooltipTranslation.textContent = en + ' \u2014 ' + ru;
        tooltipOriginal.textContent = '\u041D\u0430\u0436\u043C\u0438, \u0447\u0442\u043E\u0431\u044B ' + (el.classList.contains('translated') ? '\u0441\u043A\u0440\u044B\u0442\u044C' : '\u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C') + ' \u043F\u0435\u0440\u0435\u0432\u043E\u0434';
        tooltipEl.classList.remove('hidden');

        // Position
        tooltipEl.style.left = e.clientX + 12 + 'px';
        tooltipEl.style.top = e.clientY + 12 + 'px';
    }

    function hideTooltip() {
        tooltipEl.classList.add('hidden');
    }

    // --- Helpers ---
    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function escapeAttr(str) {
        return str.replace(/"/g, '"').replace(/'/g, '&#39;').replace(/</g, '<').replace(/>/g, '>');
    }

    // --- Start ---
    document.addEventListener('DOMContentLoaded', init);
})();
