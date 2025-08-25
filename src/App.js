import React, { useState, useEffect } from 'react';
// Recharts 컴포넌트들을 직접 임포트합니다.
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
// Tailwind CSS를 위한 외부 스크립트 (개발 환경에서는 npm 설치 후 사용)
// <script src="https://cdn.tailwindcss.com"></script>

function App() {
  // 각 국가에 대한 정보와 국기 이미지 URL 추가 (flagcdn.com 사용)
  const countries = [
    { name: '미국', currency: 'USD', flagUrl: 'https://flagcdn.com/w160/us.png' },
    { name: '일본', currency: 'JPY', flagUrl: 'https://flagcdn.com/w160/jp.png' },
    { name: '유럽', currency: 'EUR', flagUrl: 'https://flagcdn.com/w160/eu.png' }, // 유럽연합 국기
    { name: '영국', currency: 'GBP', flagUrl: 'https://flagcdn.com/w160/gb.png' },
    { name: '캐나다', currency: 'CAD', flagUrl: 'https://flagcdn.com/w160/ca.png' },
    { name: '중국', currency: 'CNY', flagUrl: 'https://flagcdn.com/w160/cn.png' },
    { name: '태국', currency: 'THB', flagUrl: 'https://flagcdn.com/w160/th.png' },
    { name: '베트남', currency: 'VND', flagUrl: 'https://flagcdn.com/w160/vn.png' },
    { name: '호주', currency: 'AUD', flagUrl: 'https://flagcdn.com/w160/au.png' },
    { name: '스위스', currency: 'CHF', flagUrl: 'https://flagcdn.com/w160/ch.png' },
    { name: '싱가포르', currency: 'SGD', flagUrl: 'https://flagcdn.com/w160/sg.png' },
    { name: '홍콩', currency: 'HKD', flagUrl: 'https://flagcdn.com/w160/hk.png' },
    // 필요에 따라 더 많은 국가를 추가할 수 있습니다.
  ];

  const [selectedCountry, setSelectedCountry] = useState('');
  const [currentExchangeRate, setCurrentExchangeRate] = useState(null);
  const [historicalPeriod, setHistoricalPeriod] = useState(1); // 환율 추이 기본값 1개월
  const [predictionPeriod, setPredictionPeriod] = useState(1); // 환율 예측 기본값 1개월

  const [currencyInfo, setCurrencyInfo] = useState({
    currentRate: 'N/A',
    historicalDescription: 'N/A', // 과거 추이 설명
    historicalData: [], // 과거 추이 그래프 데이터
    predictionDescription: 'N/A', // 미래 예측 설명
    predictionData: [], // 미래 예측 그래프 데이터
    optimalExchangeDate: 'N/A', // 최적 환전 시점 날짜
    optimalExchangeRate: 'N/A', // 최적 환전 시점 환율
  });

  const [globalLoading, setGlobalLoading] = useState(false);
  const [historicalLoading, setHistoricalLoading] = useState(false); // 과거 추이 그래프 개별 로딩
  const [predictionLoading, setPredictionLoading] = useState(false); // 미래 예측 그래프 개별 로딩

  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Firebase 초기화 및 인증 설정
    const initializeFirebase = async () => {
      try {
        // process가 정의되어 있는지 먼저 확인하여 ReferenceError 방지
        const firebaseConfig = (typeof process !== 'undefined' && process.env.REACT_APP_FIREBASE_CONFIG)
          ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG)
          : null;
        // __initial_auth_token은 Canvas 환경에서만 사용되므로, 배포 환경에서는 익명 인증을 사용합니다.
        // const initialAuthToken = (typeof process !== 'undefined' && process.env.REACT_APP_INITIAL_AUTH_TOKEN)
        //   ? process.env.REACT_APP_INITIAL_AUTH_TOKEN
        //   : null;

        if (firebaseConfig) {
          const { initializeApp } = await import('firebase/app');
          const { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } = await import('firebase/auth');
          const { getFirestore } = await import('firebase/firestore');

          const app = initializeApp(firebaseConfig);
          const firestoreDb = getFirestore(app);
          const firebaseAuth = getAuth(app);

          setDb(firestoreDb);
          setAuth(firebaseAuth);

          onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
              setUserId(user.uid);
            } else {
              // Canvas 외 환경에서는 익명 인증을 사용합니다.
              await signInAnonymously(firebaseAuth);
            }
          });
        }
      } catch (error) {
        console.error("Error initializing Firebase:", error);
        setErrorMessage("Firebase 초기화 중 오류가 발생했습니다.");
      }
    };

    initializeFirebase();
  }, []);

  // 환율 추이 데이터 생성 함수 (과거 데이터)
  const generateHistoricalData = (baseRate, periodInMonths) => {
    const data = [];
    const numDays = periodInMonths * 30;
    let rates = [];

    rates[numDays - 1] = baseRate;

    for (let i = numDays - 2; i >= 0; i--) {
      let prevRate = rates[i + 1] + (Math.random() - 0.5) * (baseRate * 0.005);
      prevRate = Math.max(prevRate, baseRate * 0.8);
      prevRate = Math.min(prevRate, baseRate * 1.2);
      rates[i] = prevRate;
    }

    for (let i = 0; i < numDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (numDays - 1 - i));
      data.push({
        date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        rate: parseFloat(rates[i].toFixed(2)),
      });
    }
    return data;
  };

  // 환율 예측 데이터 생성 함수 (미래 데이터)
  const generatePredictionData = (currentRate, periodInMonths) => {
    const data = [];
    let predictedRate = currentRate;
    const today = new Date();
    const numDays = periodInMonths * 30;

    for (let i = 0; i <= numDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      data.push({
        date: date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\s/g, '').replace(/(\d{4})년(\d{2})월(\d{2})일/, '$1-$2-$3'),
        rate: parseFloat(predictedRate.toFixed(2)),
      });
      predictedRate += (Math.random() - 0.5) * (currentRate * 0.003);
      predictedRate = Math.max(predictedRate, currentRate * 0.95);
      predictedRate = Math.min(predictedRate, currentRate * 1.05);
    }
    return data;
  };

  // Gemini API를 호출하여 환율 데이터를 가져오는 함수
  const fetchExchangeRate = async (fromCurrency, toCurrency, retries = 3) => {
    const prompt = `Convert 1 ${fromCurrency} to ${toCurrency}. Just provide the numerical exchange rate, no text or explanation.`;
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 429 && retries > 0) {
          const delay = Math.pow(2, 3 - retries) * 1000 + Math.random() * 1000;
          await new Promise(res => setTimeout(res, delay));
          return fetchExchangeRate(fromCurrency, toCurrency, retries - 1);
        }
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        const rate = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (isNaN(rate)) {
          throw new Error("Failed to parse exchange rate from API response.");
        }
        return rate;
      } else {
        throw new Error("No exchange rate found in API response.");
      }
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      throw error;
    }
  };

  // 과거 추이 그래프 데이터만 업데이트하는 함수
  const updateHistoricalGraphOnly = async (baseRate, period) => {
    setHistoricalLoading(true);
    try {
      const data = generateHistoricalData(baseRate, period);
      const firstRate = data[0]?.rate;
      const lastRate = data[data.length - 1]?.rate;
      let description = '';
      if (firstRate && lastRate) {
        const percentageChange = ((lastRate - firstRate) / firstRate * 100).toFixed(2);
        description = lastRate >= firstRate ?
          `지난 ${period}개월간 ${percentageChange}% 상승` :
          `지난 ${period}개월간 ${Math.abs(percentageChange)}% 하락`;
      }
      setCurrencyInfo(prev => ({
        ...prev,
        historicalData: data,
        historicalDescription: description,
      }));
    } catch (error) {
      console.error("Error updating historical graph data:", error);
      setErrorMessage("과거 환율 추이 데이터를 불러오는 데 실패했습니다.");
    } finally {
      setHistoricalLoading(false);
    }
  };

  // 미래 예측 그래프 데이터만 업데이트하는 함수
  const updatePredictionGraphOnly = async (baseRate, period) => {
    setPredictionLoading(true);
    try {
      const data = generatePredictionData(baseRate, period);
      const description = `향후 ${period}개월 AI 환율 예측`;

      let minRate = Infinity;
      let optimalDate = 'N/A';
      if (data.length > 0) {
        data.forEach(item => {
          if (item.rate < minRate) {
            minRate = item.rate;
            optimalDate = item.date;
          }
        });
      }

      setCurrencyInfo(prev => ({
        ...prev,
        predictionData: data,
        predictionDescription: description,
        optimalExchangeDate: optimalDate,
        optimalExchangeRate: minRate !== Infinity ? minRate.toFixed(2) : 'N/A',
      }));
    } catch (error) {
      console.error("Error updating prediction graph data:", error);
      setErrorMessage("미래 환율 예측 데이터를 불러오는 데 실패했습니다.");
    } finally {
      setPredictionLoading(false);
    }
  };

  // 모든 환율 및 국가 데이터를 가져오는 초기 함수 (국가 변경 시 호출)
  const fetchAllCurrencyData = async (country, initialHistoricalPeriod, initialPredictionPeriod) => {
    if (!country) {
      setCurrencyInfo({
        currentRate: 'N/A',
        historicalDescription: 'N/A',
        historicalData: [],
        predictionDescription: 'N/A',
        predictionData: [],
        optimalExchangeDate: 'N/A',
        optimalExchangeRate: 'N/A',
      });
      return;
    }

    setGlobalLoading(true);
    setErrorMessage('');

    try {
      // 1. 현재 환율 가져오기
      let latestRate;
      if (country === 'JPY') {
        const ratePer1JPY = await fetchExchangeRate(country, 'KRW');
        latestRate = ratePer1JPY * 100;
      } else {
        latestRate = await fetchExchangeRate(country, 'KRW');
      }
      setCurrentExchangeRate(latestRate);

      // 2. 과거 추이 데이터 생성
      const historicalData = generateHistoricalData(latestRate, initialHistoricalPeriod);
      const firstHistoricalRate = historicalData[0]?.rate;
      const lastHistoricalRate = historicalData[historicalData.length - 1]?.rate;
      let historicalDescription = '';
      if (firstHistoricalRate && lastHistoricalRate) {
        const percentageChange = ((lastHistoricalRate - firstHistoricalRate) / firstHistoricalRate * 100).toFixed(2);
        historicalDescription = lastHistoricalRate >= firstHistoricalRate ?
          `지난 ${initialHistoricalPeriod}개월간 ${percentageChange}% 상승` :
          `지난 ${initialHistoricalPeriod}개월간 ${Math.abs(percentageChange)}% 하락`;
      }

      // 3. 미래 예측 데이터 생성
      const predictionData = generatePredictionData(latestRate, initialPredictionPeriod);
      const predictionDescription = `향후 ${initialPredictionPeriod}개월 AI 환율 예측`;

      // 최저 환율 시점 찾기
      let minRate = Infinity;
      let optimalDate = 'N/A';
      if (predictionData.length > 0) {
        predictionData.forEach(item => {
          if (item.rate < minRate) {
            minRate = item.rate;
            optimalDate = item.date;
          }
        });
      }

      setCurrencyInfo({
        currentRate: `1 ${country === 'JPY' ? '100 JPY' : country} = ${latestRate.toFixed(2)} KRW`,
        historicalDescription: historicalDescription,
        historicalData: historicalData,
        predictionDescription: predictionDescription,
        predictionData: predictionData,
        optimalExchangeDate: optimalDate,
        optimalExchangeRate: minRate !== Infinity ? minRate.toFixed(2) : 'N/A',
      });
    } catch (error) {
      console.error("Failed to fetch or process currency/country data:", error);
      setErrorMessage("정보를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setCurrencyInfo({
        currentRate: 'N/A',
        historicalDescription: 'N/A',
        historicalData: [],
        predictionDescription: 'N/A',
        predictionData: [],
        optimalExchangeDate: 'N/A',
        optimalExchangeRate: 'N/A',
      });
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleCountrySelectClick = (countryCurrency) => {
    setSelectedCountry(countryCurrency);
    setHistoricalPeriod(1);
    setPredictionPeriod(1);
    fetchAllCurrencyData(countryCurrency, 1, 1);
  };

  const handleHistoricalPeriodChange = (event) => {
    const newPeriod = parseInt(event.target.value, 10);
    setHistoricalPeriod(newPeriod);
    if (selectedCountry && currentExchangeRate) {
      updateHistoricalGraphOnly(currentExchangeRate, newPeriod);
    }
  };

  const handlePredictionPeriodChange = (event) => {
    const newPeriod = parseInt(event.target.value, 10);
    setPredictionPeriod(newPeriod);
    if (selectedCountry && currentExchangeRate) {
      updatePredictionGraphOnly(currentExchangeRate, newPeriod);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-gray-200 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-4xl space-y-8 animate-fade-in-up">
        <h1 className="text-4xl font-extrabold text-center text-gray-800 tracking-tight">
          <span role="img" aria-label="money bags" className="mr-2">💰</span>
          환율 정보
        </h1>

        {/* 국가 선택 UI (국기 이미지 및 명칭) */}
        <div className="space-y-4">
          <label className="block text-gray-700 text-lg font-semibold mb-2 text-center">
            여행할 국가를 선택하세요:
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 justify-items-center">
            {countries.map((country) => (
              <div
                key={country.currency}
                className={`flex flex-col items-center p-2 rounded-xl cursor-pointer transition duration-200 ease-in-out transform hover:scale-105 shadow-md
                  ${selectedCountry === country.currency ? 'bg-slate-200 border-2 border-slate-500' : 'bg-gray-100 border border-gray-200'}
                `}
                onClick={() => handleCountrySelectClick(country.currency)}
              >
                <img
                  src={country.flagUrl}
                  alt={`${country.name} 국기`}
                  className="w-16 h-12 object-cover rounded-md border border-gray-300"
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/64x48/cccccc/000000?text=${country.flag}`; }}
                />
                <span className="text-sm font-medium text-gray-800 mt-1 text-center">{country.name}</span>
              </div>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative" role="alert">
            <strong className="font-bold">오류:</strong>
            <span className="block sm:inline ml-2">{errorMessage}</span>
          </div>
        )}

        {globalLoading && (!historicalLoading && !predictionLoading) ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-slate-500"></div>
            <p className="ml-4 text-gray-600 text-lg">정보를 불러오는 중...</p>
          </div>
        ) : (
          selectedCountry ? (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-800 text-center">
                {countries.find(c => c.currency === selectedCountry)?.name || selectedCountry} ({countries.find(c => c.currency === selectedCountry)?.currency || selectedCountry})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 현재 환율 */}
                <div className="bg-blue-50 p-6 rounded-2xl shadow-md border border-blue-200 flex flex-col justify-between transform transition duration-300 hover:scale-105 hover:shadow-lg col-span-1 md:col-span-2">
                  <h3 className="text-xl font-semibold text-blue-800 mb-3 flex items-center">
                    <span role="img" aria-label="money" className="mr-2 text-2xl">💰</span> 현재 환율
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 leading-snug">{currencyInfo.currentRate}</p>
                  <p className="text-sm text-gray-600 mt-2">변동성 및 시장 상황에 따라 달라질 수 있습니다.</p>
                </div>

                {/* 환율 추이 그래프 (과거 데이터) */}
                <div className="bg-emerald-50 p-6 rounded-2xl shadow-md border border-emerald-200 flex flex-col justify-between transform transition duration-300 hover:scale-105 hover:shadow-lg col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-emerald-800 flex items-center">
                      <span role="img" aria-label="chart up" className="mr-2 text-2xl">📈</span> 환율 추이
                    </h3>
                    <div className="relative">
                      <select
                        value={historicalPeriod}
                        onChange={handleHistoricalPeriodChange}
                        className="block appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-transparent cursor-pointer text-sm shadow-sm"
                      >
                        <option value={1}>1개월</option>
                        <option value={3}>3개월</option>
                        <option value={6}>6개월</option>
                        <option value={9}>9개월</option>
                        <option value={12}>12개월</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9l4.95 4.95z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  {historicalLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                      <p className="ml-4 text-gray-600 text-sm">데이터 불러오는 중...</p>
                    </div>
                  ) : LineChart && currencyInfo.historicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={currencyInfo.historicalData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="date"
                          interval={Math.floor(currencyInfo.historicalData.length / 5)}
                          tickFormatter={(tick) => tick}
                          angle={-15}
                          textAnchor="end"
                          height={40}
                        />
                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                        <Tooltip
                          formatter={(value) => `${value} KRW`}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Line type="monotone" dataKey="rate" stroke="#34D399" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-lg text-gray-600">추이 데이터를 불러오는 중...</p>
                  )}
                  <p className="text-sm text-gray-600 mt-2">{currencyInfo.historicalDescription}</p>
                </div>

                {/* 환율 예측 그래프 (미래 데이터) */}
                <div className="bg-rose-50 p-6 rounded-2xl shadow-md border border-rose-200 flex flex-col justify-between transform transition duration-300 hover:scale-105 hover:shadow-lg col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-rose-800 flex items-center">
                      <span role="img" aria-label="rocket" className="mr-2 text-2xl">🚀</span> 환율 예측 (AI 기반)
                    </h3>
                    <div className="relative">
                      <select
                        value={predictionPeriod}
                        onChange={handlePredictionPeriodChange}
                        className="block appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-1 focus:ring-rose-400 focus:border-transparent cursor-pointer text-sm shadow-sm"
                      >
                        <option value={1}>1개월</option>
                        <option value={3}>3개월</option>
                        <option value={6}>6개월</option>
                        <option value={9}>9개월</option>
                        <option value={12}>12개월</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9l4.95 4.95z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  {predictionLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                      <p className="ml-4 text-gray-600 text-sm">데이터 불러오는 중...</p>
                    </div>
                  ) : LineChart && currencyInfo.predictionData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={currencyInfo.predictionData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis
                            dataKey="date"
                            interval={Math.floor(currencyInfo.predictionData.length / 5)}
                            tickFormatter={(tick) => {
                                if (typeof tick === 'string' && tick.includes('-')) {
                                    const dateParts = tick.split('-');
                                    return `${dateParts[1]}-${dateParts[2]}`;
                                }
                                return tick;
                            }}
                            angle={-15}
                            textAnchor="end"
                            height={40}
                          />
                          <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                          <Tooltip
                            formatter={(value) => `${value} KRW`}
                            labelFormatter={(label) => `날짜: ${label}`}
                          />
                          <Line type="monotone" dataKey="rate" stroke="#F43F5E" strokeWidth={2} dot={true} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                      {currencyInfo.optimalExchangeDate !== 'N/A' && (
                        <div className="mt-4 text-center bg-amber-100 p-3 rounded-lg border border-amber-400">
                          <p className="text-lg font-semibold text-amber-800">
                            가장 저렴하게 환전할 수 있는 시점:
                          </p>
                          <p className="text-xl font-bold text-amber-900 mt-1">
                            {currencyInfo.optimalExchangeDate} ({currencyInfo.optimalExchangeRate} KRW)
                          </p>
                          <p className="text-sm text-amber-600 mt-1">
                            (AI 예측 기반이며, 실제와 다를 수 있습니다.)
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-lg text-gray-600">예측 데이터를 불러오는 중...</p>
                  )}
                  <p className="text-sm text-gray-600 mt-2">{currencyInfo.predictionDescription}</p>
                </div>
              </div>
            </div>
          ) : null
        )}
        {userId && (
          <p className="text-center text-sm text-gray-500 mt-4">
            사용자 ID: {userId}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
