// 三年级字词学习应用
class VocabularyApp {
    constructor() {
        this.words = [];
        this.filteredWords = [];
        this.favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
        this.learnedWords = new Set(JSON.parse(localStorage.getItem('learnedWords') || '[]'));
        this.quizResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
        this.currentPage = 'browse';
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.notionConfig = this.loadNotionConfig();

        // 测验相关
        this.quizData = {
            questions: [],
            currentIndex: 0,
            score: 0,
            selectedCount: 5
        };

        this.init();
    }

    // 初始化应用
    async init() {
        this.setupEventListeners();
        await this.loadWords();
        this.updateStats();
        this.renderWords();
    }

    // 加载 Notion 配置
    loadNotionConfig() {
        return {
            token: localStorage.getItem('notionToken') || '',
            databaseId: localStorage.getItem('databaseId') || ''
        };
    }

    // 保存 Notion 配置
    saveNotionConfig(token, databaseId) {
        localStorage.setItem('notionToken', token);
        localStorage.setItem('databaseId', databaseId);
        this.notionConfig = { token, databaseId };
    }

    // 从 Notion 加载字词数据
    async loadWords() {
        // 检查是否配置了 Notion
        if (!this.notionConfig.token || !this.notionConfig.databaseId) {
            // 使用示例数据
            this.words = this.getSampleWords();
            this.filteredWords = [...this.words];
            this.updateLastUpdateTime();
            return;
        }

        try {
            const response = await fetch(`https://api.notion.com/v1/databases/${this.notionConfig.databaseId}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.notionConfig.token}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                throw new Error('Failed to fetch from Notion');
            }

            const data = await response.json();
            this.words = this.parseNotionData(data.results);
            this.filteredWords = [...this.words];
            this.updateLastUpdateTime();

        } catch (error) {
            console.error('Error loading from Notion:', error);
            // 如果加载失败，使用示例数据
            this.words = this.getSampleWords();
            this.filteredWords = [...this.words];
            this.showMessage('无法从 Notion 加载数据，使用示例数据', 'error');
        }
    }

    // 解析 Notion 数据
    parseNotionData(results) {
        return results.map((page, index) => {
            const props = page.properties;
            return {
                id: page.id,
                word: this.getNotionText(props['字词'] || props['Word'] || props['word']),
                pinyin: this.getNotionText(props['拼音'] || props['Pinyin'] || props['pinyin']),
                definition: this.getNotionText(props['释义'] || props['Definition'] || props['definition']),
                example: this.getNotionText(props['例句'] || props['Example'] || props['example']),
                difficulty: this.getNotionSelect(props['难度'] || props['Difficulty'] || props['difficulty'])
            };
        });
    }

    // 获取 Notion 文本字段
    getNotionText(property) {
        if (!property) return '';

        if (property.title && property.title.length > 0) {
            return property.title[0].plain_text || '';
        }
        if (property.rich_text && property.rich_text.length > 0) {
            return property.rich_text[0].plain_text || '';
        }
        return '';
    }

    // 获取 Notion 选择字段
    getNotionSelect(property) {
        if (!property || !property.select) return '';
        return property.select.name || '';
    }

    // 获取示例数据
    getSampleWords() {
        return [
            { id: 1, word: '欢快', pinyin: 'huān kuài', definition: '形容高兴、愉快的样子', example: '孩子们在操场上欢快地玩耍。', difficulty: '简单' },
            { id: 2, word: '宁静', pinyin: 'níng jìng', definition: '安静、平静', example: '夜晚的湖面显得格外宁静。', difficulty: '中等' },
            { id: 3, word: '勤奋', pinyin: 'qín fèn', definition: '努力学习或工作，不懈怠', example: '小明是个勤奋的学生，总是认真完成作业。', difficulty: '简单' },
            { id: 4, word: '观察', pinyin: 'guān chá', definition: '仔细看，注意事物的变化', example: '我们要学会观察身边的事物。', difficulty: '中等' },
            { id: 5, word: '珍惜', pinyin: 'zhēn xī', definition: '重视、爱惜', example: '我们要珍惜时间，好好学习。', difficulty: '中等' },
            { id: 6, word: '美丽', pinyin: 'měi lì', definition: '好看、漂亮', example: '春天的花园真美丽！', difficulty: '简单' },
            { id: 7, word: '温暖', pinyin: 'wēn nuǎn', definition: '不冷不热，感觉舒适', example: '妈妈的怀抱总是那么温暖。', difficulty: '简单' },
            { id: 8, word: '聪明', pinyin: 'cōng míng', definition: '智力发达，反应快', example: '她是一个聪明的女孩。', difficulty: '简单' },
            { id: 9, word: '诚实', pinyin: 'chéng shí', definition: '说话做事真实不虚假', example: '做人要诚实，不能说谎。', difficulty: '中等' },
            { id: 10, word: '勇敢', pinyin: 'yǒng gǎn', definition: '不怕危险和困难', example: '消防员叔叔非常勇敢。', difficulty: '简单' },
            { id: 11, word: '愉快', pinyin: 'yú kuài', definition: '快乐、高兴', example: '我们度过了愉快的一天。', difficulty: '简单' },
            { id: 12, word: '友好', pinyin: 'yǒu hǎo', definition: '亲近和睦', example: '同学之间要友好相处。', difficulty: '简单' }
        ];
    }

    // 设置事件监听
    setupEventListeners() {
        // 导航按钮
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchPage(btn.dataset.page));
        });

        // 搜索
        document.getElementById('searchBtn').addEventListener('click', () => this.search());
        document.getElementById('searchInput').addEventListener('input', (e) => {
            if (e.target.value === '') {
                this.searchQuery = '';
                this.applyFilters();
            }
        });
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.search();
        });

        // 过滤按钮
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });

        // 测验设置
        document.querySelectorAll('.quiz-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.quizData.selectedCount = btn.dataset.count === 'all' ? this.words.length : parseInt(btn.dataset.count);
            });
        });

        document.getElementById('startQuizBtn').addEventListener('click', () => this.startQuiz());

        // 收藏管理
        document.getElementById('clearFavoritesBtn').addEventListener('click', () => this.clearFavorites());

        // 设置页面
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('testConnectionBtn').addEventListener('click', () => this.testNotionConnection());
        document.getElementById('resetProgressBtn').addEventListener('click', () => this.resetProgress());
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());

        // 从本地存储加载设置
        if (this.notionConfig.token) {
            document.getElementById('notionToken').value = this.notionConfig.token;
        }
        if (this.notionConfig.databaseId) {
            document.getElementById('databaseId').value = this.notionConfig.databaseId;
        }

        // 模态框关闭
        document.querySelector('.close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('wordModal').addEventListener('click', (e) => {
            if (e.target.id === 'wordModal') this.closeModal();
        });
    }

    // 切换页面
    switchPage(page) {
        // 更新导航按钮
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === page) {
                btn.classList.add('active');
            }
        });

        // 更新页面内容
        document.querySelectorAll('.page-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${page}-page`).classList.add('active');

        this.currentPage = page;

        // 根据页面加载内容
        if (page === 'review') {
            this.renderFavorites();
        }
    }

    // 搜索
    search() {
        this.searchQuery = document.getElementById('searchInput').value.toLowerCase();
        this.applyFilters();
    }

    // 设置过滤器
    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
        this.applyFilters();
    }

    // 应用过滤器
    applyFilters() {
        this.filteredWords = this.words.filter(word => {
            // 搜索过滤
            if (this.searchQuery) {
                const matchesSearch =
                    word.word.toLowerCase().includes(this.searchQuery) ||
                    word.pinyin.toLowerCase().includes(this.searchQuery) ||
                    word.definition.toLowerCase().includes(this.searchQuery);
                if (!matchesSearch) return false;
            }

            // 状态过滤
            switch (this.currentFilter) {
                case 'learned':
                    return this.learnedWords.has(word.id);
                case 'unlearned':
                    return !this.learnedWords.has(word.id);
                case 'favorites':
                    return this.favorites.has(word.id);
                default:
                    return true;
            }
        });

        this.renderWords();
    }

    // 渲染字词列表
    renderWords() {
        const container = document.getElementById('wordList');

        if (this.filteredWords.length === 0) {
            container.innerHTML = '<div class="empty-state">没有找到字词</div>';
            return;
        }

        container.innerHTML = this.filteredWords.map(word => `
            <div class="word-card ${this.learnedWords.has(word.id) ? 'learned' : ''} ${this.favorites.has(word.id) ? 'favorite' : ''}"
                 data-id="${word.id}">
                <div class="word-card-header">
                    <div class="word-title">${word.word}</div>
                    <div class="word-badges">
                        ${this.learnedWords.has(word.id) ? '<span class="badge badge-learned">已学</span>' : ''}
                        ${this.favorites.has(word.id) ? '<span class="badge badge-favorite">★</span>' : ''}
                    </div>
                </div>
                <div class="word-pinyin">${word.pinyin}</div>
                <div class="word-definition">${word.definition}</div>
                <div class="word-actions">
                    <button class="btn-small btn-favorite" onclick="app.toggleFavorite(${word.id})">
                        ${this.favorites.has(word.id) ? '取消收藏' : '收藏'}
                    </button>
                    <button class="btn-small btn-learned" onclick="app.toggleLearned(${word.id})">
                        ${this.learnedWords.has(word.id) ? '未学习' : '已学习'}
                    </button>
                    <button class="btn-small" onclick="app.showWordDetail(${word.id})" style="background: #667eea; color: white;">
                        详情
                    </button>
                </div>
            </div>
        `).join('');
    }

    // 显示字词详情
    showWordDetail(wordId) {
        const word = this.words.find(w => w.id === wordId);
        if (!word) return;

        const modal = document.getElementById('wordModal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <div class="modal-word-title">${word.word}</div>
            <div class="modal-word-pinyin">${word.pinyin}</div>
            <div class="modal-word-detail">
                <strong>释义：</strong>
                <p>${word.definition}</p>
            </div>
            <div class="modal-word-detail">
                <strong>例句：</strong>
                <p>${word.example}</p>
            </div>
            ${word.difficulty ? `
                <div class="modal-word-detail">
                    <strong>难度：</strong>
                    <p>${word.difficulty}</p>
                </div>
            ` : ''}
            <div class="modal-actions">
                <button onclick="app.toggleFavorite(${word.id}); app.closeModal(); app.showWordDetail(${word.id});"
                        style="background: #FFE66D; color: #2D3436;">
                    ${this.favorites.has(word.id) ? '取消收藏 ★' : '收藏 ☆'}
                </button>
                <button onclick="app.toggleLearned(${word.id}); app.closeModal(); app.showWordDetail(${word.id});"
                        style="background: #95E1D3; color: white;">
                    ${this.learnedWords.has(word.id) ? '标记未学习' : '标记已学习'}
                </button>
            </div>
        `;

        modal.classList.add('active');
    }

    // 关闭模态框
    closeModal() {
        document.getElementById('wordModal').classList.remove('active');
    }

    // 切换收藏
    toggleFavorite(wordId) {
        if (this.favorites.has(wordId)) {
            this.favorites.delete(wordId);
        } else {
            this.favorites.add(wordId);
        }
        localStorage.setItem('favorites', JSON.stringify([...this.favorites]));
        this.renderWords();
        this.renderFavorites();
        this.updateStats();
    }

    // 切换学习状态
    toggleLearned(wordId) {
        if (this.learnedWords.has(wordId)) {
            this.learnedWords.delete(wordId);
        } else {
            this.learnedWords.add(wordId);
        }
        localStorage.setItem('learnedWords', JSON.stringify([...this.learnedWords]));
        this.renderWords();
        this.updateStats();
    }

    // 渲染收藏列表
    renderFavorites() {
        const container = document.getElementById('favoritesList');
        const favoriteWords = this.words.filter(w => this.favorites.has(w.id));

        if (favoriteWords.length === 0) {
            container.innerHTML = '<div class="empty-state">还没有收藏的字词哦！</div>';
            return;
        }

        container.innerHTML = favoriteWords.map(word => `
            <div class="word-card favorite ${this.learnedWords.has(word.id) ? 'learned' : ''}" data-id="${word.id}">
                <div class="word-card-header">
                    <div class="word-title">${word.word}</div>
                    <div class="word-badges">
                        ${this.learnedWords.has(word.id) ? '<span class="badge badge-learned">已学</span>' : ''}
                        <span class="badge badge-favorite">★</span>
                    </div>
                </div>
                <div class="word-pinyin">${word.pinyin}</div>
                <div class="word-definition">${word.definition}</div>
                <div class="word-actions">
                    <button class="btn-small btn-favorite" onclick="app.toggleFavorite(${word.id})">取消收藏</button>
                    <button class="btn-small btn-learned" onclick="app.toggleLearned(${word.id})">
                        ${this.learnedWords.has(word.id) ? '未学习' : '已学习'}
                    </button>
                    <button class="btn-small" onclick="app.showWordDetail(${word.id})" style="background: #667eea; color: white;">
                        详情
                    </button>
                </div>
            </div>
        `).join('');
    }

    // 清空收藏
    clearFavorites() {
        if (confirm('确定要清空所有收藏吗？')) {
            this.favorites.clear();
            localStorage.setItem('favorites', JSON.stringify([]));
            this.renderFavorites();
            this.renderWords();
            this.updateStats();
        }
    }

    // 开始测验
    startQuiz() {
        if (this.words.length === 0) {
            alert('没有可用的字词进行测验！');
            return;
        }

        const count = Math.min(this.quizData.selectedCount, this.words.length);

        // 随机选择字词
        const shuffled = [...this.words].sort(() => Math.random() - 0.5);
        const selectedWords = shuffled.slice(0, count);

        // 生成问题
        this.quizData.questions = selectedWords.map(word => {
            // 随机决定问题类型
            const questionType = Math.random() > 0.5 ? 'definition' : 'pinyin';

            // 生成错误选项
            const wrongAnswers = this.words
                .filter(w => w.id !== word.id)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(w => questionType === 'definition' ? w.definition : w.pinyin);

            const correctAnswer = questionType === 'definition' ? word.definition : word.pinyin;
            const answers = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

            return {
                word: word.word,
                type: questionType,
                question: questionType === 'definition'
                    ? `"${word.word}" 的意思是？`
                    : `"${word.word}" 的拼音是？`,
                answers: answers,
                correctAnswer: correctAnswer,
                userAnswer: null
            };
        });

        this.quizData.currentIndex = 0;
        this.quizData.score = 0;

        this.renderQuizQuestion();
    }

    // 渲染测验问题
    renderQuizQuestion() {
        const container = document.getElementById('quizContent');
        const question = this.quizData.questions[this.quizData.currentIndex];
        const total = this.quizData.questions.length;
        const current = this.quizData.currentIndex + 1;

        document.getElementById('currentQuestion').textContent = current;
        document.getElementById('totalQuestions').textContent = total;
        document.getElementById('quizScore').textContent = this.quizData.score;
        document.getElementById('progressFill').style.width = `${(current / total) * 100}%`;

        container.innerHTML = `
            <div class="quiz-question">
                <div class="question-text">${question.question}</div>
                <div class="quiz-answers">
                    ${question.answers.map((answer, index) => `
                        <button class="answer-btn" onclick="app.selectAnswer('${answer}', ${index})">
                            ${answer}
                        </button>
                    `).join('')}
                </div>
                <div class="quiz-navigation">
                    <button class="btn-quiz-nav" onclick="app.previousQuestion()" ${current === 1 ? 'disabled' : ''}>
                        上一题
                    </button>
                    <button class="btn-quiz-nav" onclick="app.nextQuestion()" id="nextBtn" disabled>
                        ${current === total ? '完成' : '下一题'}
                    </button>
                </div>
            </div>
        `;
    }

    // 选择答案
    selectAnswer(answer, index) {
        const question = this.quizData.questions[this.quizData.currentIndex];
        question.userAnswer = answer;

        // 更新UI
        document.querySelectorAll('.answer-btn').forEach((btn, i) => {
            btn.classList.remove('selected', 'correct', 'incorrect');
            if (i === index) {
                btn.classList.add('selected');
            }
        });

        // 启用下一题按钮
        document.getElementById('nextBtn').disabled = false;
    }

    // 下一题
    nextQuestion() {
        const question = this.quizData.questions[this.quizData.currentIndex];

        // 检查答案
        if (question.userAnswer === question.correctAnswer) {
            this.quizData.score++;
        }

        // 显示正确/错误
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.disabled = true;
            if (btn.textContent.trim() === question.correctAnswer) {
                btn.classList.add('correct');
            } else if (btn.classList.contains('selected') && btn.textContent.trim() !== question.correctAnswer) {
                btn.classList.add('incorrect');
            }
        });

        setTimeout(() => {
            if (this.quizData.currentIndex < this.quizData.questions.length - 1) {
                this.quizData.currentIndex++;
                this.renderQuizQuestion();
            } else {
                this.showQuizResult();
            }
        }, 1500);
    }

    // 上一题
    previousQuestion() {
        if (this.quizData.currentIndex > 0) {
            this.quizData.currentIndex--;
            this.renderQuizQuestion();
        }
    }

    // 显示测验结果
    showQuizResult() {
        const container = document.getElementById('quizContent');
        const total = this.quizData.questions.length;
        const score = this.quizData.score;
        const percentage = Math.round((score / total) * 100);

        // 保存结果
        this.quizResults.push({
            date: new Date().toISOString(),
            score: score,
            total: total,
            percentage: percentage
        });
        localStorage.setItem('quizResults', JSON.stringify(this.quizResults));

        // 更新统计
        this.updateStats();

        let emoji = '🎉';
        let message = '太棒了！';
        if (percentage < 60) {
            emoji = '📚';
            message = '继续加油！';
        } else if (percentage < 80) {
            emoji = '👍';
            message = '做得不错！';
        }

        container.innerHTML = `
            <div class="quiz-result">
                <div class="result-emoji">${emoji}</div>
                <div class="result-score">${score} / ${total}</div>
                <div class="result-message">${message} 正确率 ${percentage}%</div>
                <button class="start-quiz-btn" onclick="app.switchPage('browse')">返回学习</button>
                <button class="start-quiz-btn" onclick="location.reload()" style="background: #4ECDC4; margin-top: 10px;">
                    再来一次
                </button>
            </div>
        `;

        // 重置进度显示
        document.getElementById('currentQuestion').textContent = total;
        document.getElementById('quizScore').textContent = score;
        document.getElementById('progressFill').style.width = '100%';
    }

    // 保存设置
    async saveSettings() {
        const token = document.getElementById('notionToken').value.trim();
        const databaseId = document.getElementById('databaseId').value.trim();

        if (!token || !databaseId) {
            this.showMessage('请填写完整的配置信息', 'error');
            return;
        }

        this.saveNotionConfig(token, databaseId);
        this.showMessage('配置已保存！', 'success');

        // 重新加载数据
        await this.loadWords();
        this.renderWords();
        this.updateStats();
    }

    // 测试 Notion 连接
    async testNotionConnection() {
        const token = document.getElementById('notionToken').value.trim();
        const databaseId = document.getElementById('databaseId').value.trim();

        if (!token || !databaseId) {
            this.showMessage('请先填写配置信息', 'error');
            return;
        }

        this.showMessage('正在测试连接...', 'success');

        try {
            const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Notion-Version': '2022-06-28'
                }
            });

            if (response.ok) {
                this.showMessage('连接成功！✅', 'success');
            } else {
                this.showMessage('连接失败，请检查配置 ❌', 'error');
            }
        } catch (error) {
            this.showMessage('连接失败：' + error.message, 'error');
        }
    }

    // 重置进度
    resetProgress() {
        if (confirm('确定要重置所有学习进度吗？这将清除已学习记录、收藏和测验结果。')) {
            this.learnedWords.clear();
            this.favorites.clear();
            this.quizResults = [];
            localStorage.removeItem('learnedWords');
            localStorage.removeItem('favorites');
            localStorage.removeItem('quizResults');
            this.updateStats();
            this.renderWords();
            this.renderFavorites();
            this.showMessage('进度已重置', 'success');
        }
    }

    // 导出数据
    exportData() {
        const data = {
            learnedWords: [...this.learnedWords],
            favorites: [...this.favorites],
            quizResults: this.quizResults,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocabulary-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showMessage('数据已导出！', 'success');
    }

    // 更新统计信息
    updateStats() {
        document.getElementById('totalWords').textContent = this.words.length;
        document.getElementById('learnedWords').textContent = this.learnedWords.size;

        // 计算正确率
        if (this.quizResults.length > 0) {
            const totalScore = this.quizResults.reduce((sum, r) => sum + r.score, 0);
            const totalQuestions = this.quizResults.reduce((sum, r) => sum + r.total, 0);
            const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
            document.getElementById('accuracy').textContent = accuracy + '%';
        } else {
            document.getElementById('accuracy').textContent = '0%';
        }
    }

    // 更新最后更新时间
    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleString('zh-CN');
        document.getElementById('lastUpdate').textContent = timeString;
    }

    // 显示消息
    showMessage(message, type) {
        const statusEl = document.getElementById('connectionStatus');
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;

        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'status-message';
        }, 3000);
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new VocabularyApp();
});
