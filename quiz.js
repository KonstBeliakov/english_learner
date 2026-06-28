'use strict';

// ===== SOUND MANAGER =====
/**
 * English Mix — Quiz & Rating module
 * Sound effects, quiz logic, rating storage
 */
    // ===================== SOUND MANAGER =====================
    const SoundManager = {
        _ctx: null,
        _init() {
            if (!this._ctx) {
                this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
        },
        _play(freq, duration, type = 'sine', volume = 0.3) {
            try {
                this._init();
                const osc = this._ctx.createOscillator();
                const gain = this._ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this._ctx.currentTime);
                gain.gain.setValueAtTime(volume, this._ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(this._ctx.destination);
                osc.start();
                osc.stop(this._ctx.currentTime + duration);
            } catch (e) {
                // Audio not available
            }
        },
        correct() {
            this._play(523.25, 0.15, 'sine', 0.3);
            setTimeout(() => this._play(659.25, 0.15, 'sine', 0.3), 100);
            setTimeout(() => this._play(783.99, 0.25, 'sine', 0.3), 200);
        },
        wrong() {
            this._play(200, 0.3, 'sawtooth', 0.2);
            setTimeout(() => this._play(150, 0.4, 'sawtooth', 0.2), 150);
        },
        select() {
            this._play(440, 0.08, 'sine', 0.15);
        },
        levelComplete() {
            const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];
            notes.forEach((freq, i) => {
                setTimeout(() => this._play(freq, 0.2, 'sine', 0.25), i * 120);
            });
        },
        levelFailed() {
            this._play(300, 0.3, 'square', 0.15);
            setTimeout(() => this._play(250, 0.3, 'square', 0.15), 200);
            setTimeout(() => this._play(200, 0.5, 'square', 0.15), 400);
        }
    };

    // ===================== QUIZ =====================
    let quizIndex = 0;
    let quizCorrect = 0;
    let quizAnswered = false;

    function startQuiz() {
        if (!currentTextData) return;

        quizWords = collectQuizWords(currentTextData);
        if (quizWords.length === 0) {
            alert('\u0412 \u044D\u0442\u043E\u043C \u0442\u0435\u043A\u0441\u0442\u0435 \u043D\u0435\u0442 \u0441\u043B\u043E\u0432 \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438.');
            return;
        }

        quizIndex = 0;
        quizCorrect = 0;
        quizAnswered = false;
        showScreen('quizScreen');
        showQuizWord();
    }

    function showQuizWord() {
        if (quizIndex >= quizWords.length) {
            finishQuiz();
            return;
        }

        var qw = quizWords[quizIndex];
        quizAnswered = false;

        var total = quizWords.length;
        var num = quizIndex + 1;
        document.getElementById('quizProgress').textContent = '' + num + ' / ' + total;
        document.getElementById('quizWord').textContent = qw.en;

        var options = generateOptions(qw);
        var optDiv = document.getElementById('quizOptions');
        optDiv.innerHTML = '';

        options.forEach(function (opt) {
            var btn = document.createElement('button');
            btn.className = 'quiz-option-btn';
            btn.textContent = opt;
            btn.addEventListener('click', function () {
                if (quizAnswered) return;
                quizAnswered = true;
                handleAnswer(btn, opt, qw.ru);
            });
            optDiv.appendChild(btn);
        });
    }

    function handleAnswer(clickedBtn, selected, correctRu) {
        var allBtns = document.querySelectorAll('.quiz-option-btn');

        // Disable all buttons
        allBtns.forEach(function (b) { b.disabled = true; });

        var isCorrect = (selected === correctRu);
        if (isCorrect) {
            SoundManager.correct();
            quizCorrect++;
            clickedBtn.classList.add('correct');
        } else {
            SoundManager.wrong();
            clickedBtn.classList.add('incorrect');
            // Highlight the correct answer
            allBtns.forEach(function (b) {
                if (b.textContent === correctRu) {
                    b.classList.add('correct');
                }
            });
        }

        // Auto-advance after a short delay
        setTimeout(function () {
            quizIndex++;
            showQuizWord();
        }, 800);
    }

    function finishQuiz() {
        var total = quizWords.length;
        var correct = quizCorrect;

        // Save reading progress
        if (currentBook && currentBookData) {
            saveProgress(currentBook.id, currentChapter);
        }

        saveRating(total, correct);

        resultSubtitle.textContent = total + ' с\u043B\u043E\u0432, ' + currentLevel;
        resultScore.textContent = correct + ' / ' + total;
        var pct = total > 0 ? Math.round(correct / total * 100) : 0;
        resultPct.textContent = pct + '%';

        displayRating();
        showScreen('resultScreen');
    }

    function collectQuizWords(textData) {
        var seen = {};
        var result = [];
        if (textData.paragraphs) {
            textData.paragraphs.forEach(function (p) {
                if (p.words) {
                    p.words.forEach(function (w) {
                        var key = w.en + '|' + w.ru;
                        if (!seen[key]) {
                            seen[key] = true;
                            result.push({ en: w.en, ru: w.ru });
                        }
                    });
                }
            });
        }
        return result;
    }

    function generateOptions(qw) {
        var allRu = ['вариант 1', 'вариант 2', 'вариант 3'];  // fallbacks
        if (currentTextData && currentTextData.paragraphs) {
            currentTextData.paragraphs.forEach(function (p) {
                if (p.words) {
                    p.words.forEach(function (w) {
                        if (w.ru !== qw.ru) allRu.push(w.ru);
                    });
                }
            });
        }

        var uniqueRu = [];
        var seen = {};
        allRu.forEach(function (r) {
            if (!seen[r]) { seen[r] = true; uniqueRu.push(r); }
        });

        shuffleArray(uniqueRu);
        var distractors = uniqueRu.slice(0, 3);
        while (distractors.length < 3) {
            distractors.push('(\u0432\u0430\u0440\u0438\u0430\u043D\u0442 ' + (distractors.length + 1) + ')');
        }

        var options = [qw.ru].concat(distractors);
        shuffleArray(options);
        return options;
    }

    function shuffleArray(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }    // ===================== RATING =====================
    function saveRating(total, correct) {
        var key = 'english_mix_rating';
        var data = {};
        try {
            data = JSON.parse(localStorage.getItem(key)) || {};
        } catch(e) { data = {}; }

        data.quizzes = (data.quizzes || 0) + 1;
        data.totalQuestions = (data.totalQuestions || 0) + total;
        data.correctAnswers = (data.correctAnswers || 0) + correct;

        localStorage.setItem(key, JSON.stringify(data));
    }

    function displayRating() {
        var key = 'english_mix_rating';
        var data = {};
        try {
            data = JSON.parse(localStorage.getItem(key)) || {};
        } catch(e) { data = {}; }

        var quizzes = data.quizzes || 0;
        var totalQ = data.totalQuestions || 0;
        var correct = data.correctAnswers || 0;
        var pct = totalQ > 0 ? Math.round(correct / totalQ * 100) : 0;

        ratingQuizzes.textContent = quizzes;
        ratingTotal.textContent = totalQ;
        ratingCorrect.textContent = correct;
        ratingPct.textContent = pct + '%';
    }

    function bindEvents() {
        showTranslationBtn.addEventListener('click', showAllTranslations);
        resetBtn.addEventListener('click', function () {
            if (currentBookData && currentBook) {
                showChapter(currentBook, currentBookData, currentChapter);
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
        backToBookListBtn.addEventListener('click', function () {
            if (currentLevel) {
                initTextScreen(currentLevel);
            }
        });
        finishBtn.addEventListener('click', startQuiz);
        quizBackBtn.addEventListener('click', function () {
            if (currentLevel && currentBookData) {
                if (currentBookData.chapters.length > 1) {
                    showChapterSelection(currentBook, currentBookData);
                } else {
                    initTextScreen(currentLevel);
                }
            }
        });
        resultBackBtn.addEventListener('click', function () {
            if (currentLevel && currentBookData) {
                if (currentBookData.chapters.length > 1) {
                    showChapterSelection(currentBook, currentBookData);
                } else {
                    initTextScreen(currentLevel);
                }
            }
        });
        document.addEventListener('mousemove', function (e) {
            tooltipEl.style.left = e.clientX + 12 + 'px';
            tooltipEl.style.top = e.clientY + 12 + 'px';
        });
    }

