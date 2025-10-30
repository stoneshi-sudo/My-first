// 币安汇率计算器
class CryptoConverter {
    constructor() {
        this.cryptoPrices = {};
        this.fiatRates = {};
        this.top50Cryptos = [];
        this.init();
    }

    // 初始化
    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.convert();
        // 每30秒更新一次数据
        setInterval(() => this.loadData(), 30000);
    }

    // 设置事件监听
    setupEventListeners() {
        document.getElementById('convertBtn').addEventListener('click', () => this.convert());
        document.getElementById('fromAmount').addEventListener('input', () => this.convert());
        document.getElementById('fromCurrency').addEventListener('change', () => this.convert());
        document.getElementById('toCurrency').addEventListener('change', () => this.convert());
        document.getElementById('swapBtn').addEventListener('click', () => this.swap());

        // 按回车键自动转换
        document.getElementById('fromAmount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.convert();
                // 可选：转换后移除输入框焦点，提供视觉反馈
                e.target.blur();
            }
        });
    }

    // 加载所有数据
    async loadData() {
        try {
            await Promise.all([
                this.loadCryptoPrices(),
                this.loadFiatRates()
            ]);
            this.updateLastUpdateTime();
            // 数据加载完成后，自动执行一次转换
            this.convert();
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('数据加载失败，请刷新页面重试');
        }
    }

    // 从币安API加载加密货币价格
    async loadCryptoPrices() {
        try {
            // 获取所有交易对价格（以USDT计价）
            const response = await fetch('https://api.binance.com/api/v3/ticker/price');
            const data = await response.json();

            // 获取24小时价格变化
            const statsResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            const statsData = await statsResponse.json();

            // 创建统计数据映射
            const statsMap = {};
            statsData.forEach(item => {
                statsMap[item.symbol] = {
                    priceChange: parseFloat(item.priceChange),
                    priceChangePercent: parseFloat(item.priceChangePercent),
                    volume: parseFloat(item.volume),
                    quoteVolume: parseFloat(item.quoteVolume)
                };
            });

            // 创建价格映射（所有USDT交易对）
            const priceMap = {};
            data.forEach(item => {
                if (item.symbol.endsWith('USDT')) {
                    const symbol = item.symbol.replace('USDT', '');
                    priceMap[symbol] = parseFloat(item.price);
                }
            });

            // 筛选USDT交易对
            const usdtPairs = data.filter(item => item.symbol.endsWith('USDT'));

            // 按交易量排序获取Top 50
            const sortedPairs = usdtPairs
                .filter(item => statsMap[item.symbol] && statsMap[item.symbol].quoteVolume > 0)
                .sort((a, b) => (statsMap[b.symbol]?.quoteVolume || 0) - (statsMap[a.symbol]?.quoteVolume || 0))
                .slice(0, 50);

            // 保存价格数据
            this.cryptoPrices = {};
            this.top50Cryptos = [];

            // 确保热门币种始终被加载
            const mustHaveCoins = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE'];
            mustHaveCoins.forEach(coin => {
                if (priceMap[coin]) {
                    this.cryptoPrices[coin] = priceMap[coin];
                    console.log(`已加载热门币种: ${coin} = $${priceMap[coin]}`);
                }
            });

            // 添加USDT本身
            this.cryptoPrices['USDT'] = 1;

            sortedPairs.forEach(item => {
                const symbol = item.symbol.replace('USDT', '');
                const price = parseFloat(item.price);
                this.cryptoPrices[symbol] = price;
                this.top50Cryptos.push({
                    symbol: symbol,
                    price: price,
                    stats: statsMap[item.symbol]
                });
            });

            console.log(`成功加载 ${Object.keys(this.cryptoPrices).length} 种加密货币价格`);

            // 更新下拉菜单
            this.updateCryptoDropdowns();

            // 更新市场信息
            this.updateMarketInfo();

        } catch (error) {
            console.error('加载加密货币价格失败:', error);
            throw error;
        }
    }

    // 加载法币汇率
    async loadFiatRates() {
        try {
            // 使用免费的汇率API (以USD为基准)
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await response.json();

            this.fiatRates = data.rates;
            this.fiatRates['USD'] = 1; // 确保USD存在

        } catch (error) {
            console.error('加载法币汇率失败:', error);
            // 如果API失败，使用备用汇率
            this.fiatRates = {
                'USD': 1,
                'EUR': 0.92,
                'CNY': 7.24,
                'JPY': 149.50,
                'GBP': 0.79,
                'KRW': 1320,
                'AUD': 1.52,
                'CAD': 1.36,
                'CHF': 0.88,
                'HKD': 7.82,
                'SGD': 1.34,
                'RUB': 92,
                'INR': 83,
                'BRL': 4.97,
                'ZAR': 18.50,
                'TRY': 28.50,
                'MXN': 17.20,
                'IDR': 15600,
                'THB': 35.50,
                'VND': 24500
            };
        }
    }

    // 更新加密货币下拉菜单
    updateCryptoDropdowns() {
        const cryptoGroup1 = document.getElementById('cryptoGroup');
        const cryptoGroup2 = document.getElementById('cryptoGroup2');

        // 清空现有选项
        cryptoGroup1.innerHTML = '';
        cryptoGroup2.innerHTML = '';

        // 添加Top 50加密货币（排除前5个热门的）
        const hotCoins = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL'];
        this.top50Cryptos
            .filter(crypto => !hotCoins.includes(crypto.symbol))
            .forEach(crypto => {
                const option1 = document.createElement('option');
                option1.value = crypto.symbol;
                option1.textContent = `${crypto.symbol} - $${this.formatPrice(crypto.price)}`;
                cryptoGroup1.appendChild(option1);

                const option2 = document.createElement('option');
                option2.value = crypto.symbol;
                option2.textContent = `${crypto.symbol} - $${this.formatPrice(crypto.price)}`;
                cryptoGroup2.appendChild(option2);
            });
    }

    // 更新市场信息
    updateMarketInfo() {
        const marketInfo = document.getElementById('marketInfo');

        if (this.top50Cryptos.length === 0) {
            marketInfo.innerHTML = '<p>暂无市场数据</p>';
            return;
        }

        let html = '';
        // 显示前5个加密货币
        this.top50Cryptos.slice(0, 5).forEach(crypto => {
            const changeClass = crypto.stats.priceChangePercent >= 0 ? 'positive' : 'negative';
            const changeSymbol = crypto.stats.priceChangePercent >= 0 ? '+' : '';
            html += `
                <div class="market-item">
                    <div>
                        <div class="label">${crypto.symbol}/USDT</div>
                        <div class="value">$${this.formatPrice(crypto.price)}</div>
                    </div>
                    <div class="${changeClass}" style="text-align: right;">
                        <div style="font-size: 0.875rem;">${changeSymbol}${crypto.stats.priceChangePercent.toFixed(2)}%</div>
                        <div style="font-size: 0.75rem; opacity: 0.7;">24h</div>
                    </div>
                </div>
            `;
        });

        marketInfo.innerHTML = html;
    }

    // 格式化价格显示
    formatPrice(price) {
        if (price >= 1000) {
            return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
        } else if (price >= 1) {
            return price.toFixed(4);
        } else if (price >= 0.0001) {
            return price.toFixed(6);
        } else {
            return price.toFixed(8);
        }
    }

    // 判断是否为加密货币
    isCrypto(currency) {
        return this.cryptoPrices.hasOwnProperty(currency);
    }

    // 判断是否为法币
    isFiat(currency) {
        return this.fiatRates.hasOwnProperty(currency);
    }

    // 获取货币的USD价格
    getPriceInUSD(currency, amount = 1) {
        if (this.isCrypto(currency)) {
            // 加密货币，直接返回USDT价格
            const price = this.cryptoPrices[currency];
            console.log(`${currency} (加密) 价格: $${price}, 数量: ${amount}, USD总额: $${price * amount}`);
            return price * amount;
        } else if (this.isFiat(currency)) {
            // 法币，转换为USD
            const rate = this.fiatRates[currency];
            const usdAmount = amount / rate;
            console.log(`${currency} (法币) 汇率: ${rate}, 数量: ${amount}, USD总额: $${usdAmount}`);
            return usdAmount;
        }
        console.log(`未知货币: ${currency}`);
        return 0;
    }

    // 从USD价格转换为目标货币
    convertFromUSD(usdAmount, targetCurrency) {
        if (this.isCrypto(targetCurrency)) {
            // 转换为加密货币
            const price = this.cryptoPrices[targetCurrency];
            const result = usdAmount / price;
            console.log(`USD $${usdAmount} -> ${targetCurrency} (加密): ${result} (价格: $${price})`);
            return result;
        } else if (this.isFiat(targetCurrency)) {
            // 转换为法币
            const rate = this.fiatRates[targetCurrency];
            const result = usdAmount * rate;
            console.log(`USD $${usdAmount} -> ${targetCurrency} (法币): ${result} (汇率: ${rate})`);
            return result;
        }
        console.log(`未知目标货币: ${targetCurrency}`);
        return 0;
    }

    // 执行转换
    convert() {
        const fromAmount = parseFloat(document.getElementById('fromAmount').value) || 0;
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;

        if (fromAmount === 0) {
            document.getElementById('toAmount').value = '0';
            this.updateRateInfo(fromCurrency, toCurrency, 0);
            return;
        }

        // 检查数据是否已加载
        if (Object.keys(this.cryptoPrices).length === 0 || Object.keys(this.fiatRates).length === 0) {
            console.log('数据还在加载中...');
            return;
        }

        try {
            // 第一步：转换为USD
            const usdAmount = this.getPriceInUSD(fromCurrency, fromAmount);

            if (usdAmount === 0) {
                console.error('无法获取源货币价格:', fromCurrency);
                this.showError(`无法获取 ${fromCurrency} 的价格，请稍后重试`);
                return;
            }

            // 第二步：从USD转换为目标货币
            const result = this.convertFromUSD(usdAmount, toCurrency);

            if (result === 0) {
                console.error('无法转换到目标货币:', toCurrency);
                this.showError(`无法转换到 ${toCurrency}，请稍后重试`);
                return;
            }

            // 显示结果
            document.getElementById('toAmount').value = this.formatPrice(result);

            // 更新汇率信息
            const rate = result / fromAmount;
            this.updateRateInfo(fromCurrency, toCurrency, rate);

        } catch (error) {
            console.error('转换失败:', error);
            this.showError('转换失败，请检查货币是否支持');
        }
    }

    // 更新汇率信息显示
    updateRateInfo(from, to, rate) {
        const rateInfo = document.getElementById('rateInfo');
        rateInfo.innerHTML = `
            <div class="rate-display">
                1 ${from} = <span class="rate-value">${this.formatPrice(rate)}</span> ${to}
            </div>
        `;
    }

    // 交换货币
    swap() {
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;
        const fromAmount = document.getElementById('fromAmount').value;
        const toAmount = document.getElementById('toAmount').value;

        document.getElementById('fromCurrency').value = toCurrency;
        document.getElementById('toCurrency').value = fromCurrency;
        document.getElementById('fromAmount').value = toAmount || fromAmount;

        this.convert();
    }

    // 更新最后更新时间
    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN');
        document.getElementById('lastUpdate').textContent = timeString;
    }

    // 显示错误信息
    showError(message) {
        const rateInfo = document.getElementById('rateInfo');
        rateInfo.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new CryptoConverter();
});
