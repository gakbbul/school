import React, { useState, useEffect } from 'react';

// API 키 및 URL
// 나이스 교육정보 개방포털 API 키
const NEIS_API_KEY = "2ab5d56a9a7a4baeba5b12519dd6369b";
const NEIS_API_URL = "https://open.neis.go.kr/hub/";

// Open-Meteo API URL
const WEATHER_API_URL_FORECAST = "https://api.open-meteo.com/v1/forecast";

const App = () => {
  const [schoolInfo, setSchoolInfo] = useState({
    name: '',
    code: '',
    regionCode: '',
    regionName: '',
    grade: '',
    class: '',
  });
  
  const [view, setView] = useState('main'); // 'main' 또는 'settings'
  const [customTimetable, setCustomTimetable] = useState({});

  const [date, setDate] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [meal, setMeal] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // 로컬 스토리지에서 학교 정보와 시간표 로드
  useEffect(() => {
    const savedSchoolInfo = localStorage.getItem('schoolInfo');
    if (savedSchoolInfo) {
      setSchoolInfo(JSON.parse(savedSchoolInfo));
    }
    const savedTimetable = localStorage.getItem('customTimetable');
    if (savedTimetable) {
      setCustomTimetable(JSON.parse(savedTimetable));
    }
  }, []);

  // 학교 정보 또는 날짜가 변경될 때마다 데이터(급식, 시간표, 날씨)를 불러옴
  useEffect(() => {
    // 학교 코드가 설정되어 있을 때만 데이터 로드
    if (schoolInfo.code && schoolInfo.regionCode) {
      fetchData();
    }
  }, [schoolInfo, date]);

  // WMO 날씨 코드를 한글로 변환
  const getWeatherDescription = (code) => {
    switch (code) {
      case 0: return '맑음';
      case 1: return '주로 맑음';
      case 2: return '부분적으로 흐림';
      case 3: return '흐림';
      case 45: case 48: return '안개';
      case 51: case 53: case 55: return '이슬비';
      case 56: case 57: return '어는 이슬비';
      case 61: case 63: case 65: return '비';
      case 66: case 67: return '어는 비';
      case 71: case 73: case 75: return '눈';
      case 77: return '눈송이';
      case 80: case 81: case 82: return '소나기';
      case 85: case 86: return '눈 소나기';
      case 95: return '천둥 번개';
      case 96: case 99: return '우박을 동반한 천둥 번개';
      default: return '정보 없음';
    }
  };
  
  /**
   * 2024년부터 2028년까지의 주요 음력 공휴일 및 대체 공휴일 (양력 날짜 기준)을 반환하는 함수.
   * 복잡한 음력 및 대체 공휴일 계산을 피하기 위해 미리 정의된 데이터를 사용합니다.
   * @param {number} year 확인할 연도
   * @returns {Array<Object>} 해당 연도의 음력/대체 공휴일 목록 (양력 월, 일 포함)
   */
  const getLunarHolidaysForYear = (year) => {
    // { month: solar_month, day: solar_day, name: "holiday_name" }
    const lunarHolidaysMap = {
      2024: [
        { month: 2, day: 9, name: "설날 연휴" },
        { month: 2, day: 10, name: "설날" },
        { month: 2, day: 11, name: "설날 연휴" },
        { month: 5, day: 15, name: "부처님 오신 날" },
        { month: 9, day: 16, name: "추석 연휴" },
        { month: 9, day: 17, name: "추석" },
        { month: 9, day: 18, name: "추석 연휴" },
      ],
      2025: [
        { month: 1, day: 28, name: "설날 연휴" },
        { month: 1, day: 29, name: "설날" },
        { month: 1, day: 30, name: "설날 연휴" },
        { month: 6, day: 1, name: "부처님 오신 날" },
        { month: 6, day: 2, name: "대체 공휴일 (부처님 오신 날)" }, // 2025/6/1 일요일 대체 휴일
        { month: 10, day: 5, name: "추석 연휴" },
        { month: 10, day: 6, name: "추석" },
        { month: 10, day: 7, name: "추석 연휴" },
        { month: 10, day: 8, name: "대체 공휴일 (추석)" }, // 2025/10/5 일요일 대체 휴일
      ],
      2026: [
        { month: 2, day: 16, name: "설날 연휴" },
        { month: 2, day: 17, name: "설날" },
        { month: 2, day: 18, name: "설날 연휴" },
        { month: 5, day: 25, name: "부처님 오신 날" },
        { month: 9, day: 25, name: "추석 연휴" },
        { month: 9, day: 26, name: "추석" },
        { month: 9, day: 27, name: "추석 연휴" },
        { month: 9, day: 28, name: "대체 공휴일 (추석)" }, // 2026/9/26 토요일 대체 휴일
      ],
      2027: [
        { month: 2, day: 8, name: "설날 연휴" },
        { month: 2, day: 9, name: "설날" },
        { month: 2, day: 10, name: "설날 연휴" },
        { month: 5, day: 15, name: "부처님 오신 날" },
        { month: 5, day: 17, name: "대체 공휴일 (부처님 오신 날)" }, // 2027/5/15 토요일 대체 휴일
        { month: 9, day: 15, name: "추석 연휴" },
        { month: 9, day: 16, name: "추석" },
        { month: 9, day: 17, name: "추석 연휴" },
      ],
      2028: [
        { month: 1, day: 25, name: "설날 연휴" },
        { month: 1, day: 26, name: "설날" },
        { month: 1, day: 27, name: "설날 연휴" },
        { month: 5, day: 12, name: "부처님 오신 날" },
        { month: 10, day: 2, name: "추석 연휴" },
        { month: 10, day: 3, name: "추석 (개천절 중복)" }, // 2028/10/3 개천절과 중복
        { month: 10, day: 4, name: "추석 연휴" },
        { month: 10, day: 5, name: "대체 공휴일 (추석)" }, // 2028/10/3 중복 대체 휴일
      ]
    };

    return lunarHolidaysMap[year] || [];
  };

  /**
   * 대한민국 법정 공휴일 (고정 및 음력 공휴일)을 확인하는 함수.
   * 급식/시간표 정보보다 공휴일 정보를 우선 표시하기 위해 사용됩니다.
   * @param {Date} d 확인할 날짜
   * @returns {string | false} 공휴일 이름 또는 false
   */
  const isPublicHoliday = (d) => {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    // 1. 고정된 주요 공휴일 목록
    const fixedHolidays = [
        { month: 1, day: 1, name: "신정" },       // 1월 1일
        { month: 3, day: 1, name: "삼일절" },     // 3월 1일
        { month: 5, day: 5, name: "어린이날" },   // 5월 5일
        // 어린이날 대체 공휴일 (5월 5일이 토/일/다른 공휴일과 겹칠 경우 다음 비공휴일)
        { month: 5, day: 6, name: "대체 공휴일 (어린이날)" }, // 2024/5/5가 일요일이므로 5/6 대체 휴일 (고정적으로 추가)
        { month: 6, day: 6, name: "현충일" },     // 6월 6일
        { month: 8, day: 15, name: "광복절" },    // 8월 15일
        { month: 10, day: 3, name: "개천절" },    // 10월 3일
        { month: 10, day: 9, name: "한글날" },    // 10월 9일
        { month: 12, day: 25, name: "성탄절" },   // 12월 25일
    ];

    let holiday = fixedHolidays.find(h => h.month === month && h.day === day);
    if (holiday) return holiday.name;

    // 2. 음력 기반 및 대체 공휴일 (양력 변환 날짜 사용)
    const lunarHolidays = getLunarHolidaysForYear(year);
    holiday = lunarHolidays.find(h => h.month === month && h.day === day);
    if (holiday) return holiday.name;
    
    // 3. 임시 공휴일이나 기타 공휴일은 API에서 가져오는 것이 아니므로 여기서는 제외하고,
    // 데이터가 없으면 '정보 없음'으로 표시되도록 처리합니다.

    return false;
  };

  // API 데이터 가져오기
  const fetchData = async () => {
    setIsLoading(true);

    // 공휴일인 경우 API 요청을 하지 않고 로딩 상태를 해제합니다.
    if (isPublicHoliday(date) || isWeekend(date)) {
        setWeather(null); // 주말/공휴일에는 날씨 정보는 표시, 급식/시간표는 비움
        setMeal(null);
        setTimetable(null);
    }
    
    try {
      // 날씨 데이터 (Open-Meteo)
      let forecastForSelectedDay = null;
      // 학교 지역명으로 위도/경도 검색
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${schoolInfo.regionName}&count=1&language=ko&format=json`);
      const geoData = await geoResponse.json();
      if (geoData.results && geoData.results.length > 0) {
        const latitude = geoData.results[0].latitude;
        const longitude = geoData.results[0].longitude;
        // 7일치 날씨 예보 데이터 요청
        const weatherResponse = await fetch(`${WEATHER_API_URL_FORECAST}?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=7`);
        const weatherData = await weatherResponse.json();
        if (weatherData.daily) {
          const selectedDateStr = formatDate(date);
          const dateIndex = weatherData.daily.time.findIndex(time => time.startsWith(selectedDateStr));
          if (dateIndex !== -1) {
            forecastForSelectedDay = {
                temp_min: weatherData.daily.temperature_2m_min[dateIndex],
                temp_max: weatherData.daily.temperature_2m_max[dateIndex],
                weather_code: weatherData.daily.weather_code[dateIndex],
                precipitation_probability: weatherData.daily.precipitation_probability_max[dateIndex]
            };
          }
        }
      }
      setWeather(forecastForSelectedDay);

      // 공휴일/주말이 아닌 경우에만 급식/시간표 요청
      if (!isPublicHoliday(date) && !isWeekend(date)) {
        // 급식 데이터 (나이스 API)
        const neisFormattedDate = formatDateForNeis(date);
        const mealResponse = await fetch(`${NEIS_API_URL}mealServiceDietInfo?key=${NEIS_API_KEY}&type=json&pSize=100&ATPT_OFCDC_SC_CODE=${schoolInfo.regionCode}&SD_SCHUL_CODE=${schoolInfo.code}&MLSV_YMD=${neisFormattedDate}`);
        const mealData = await mealResponse.json();
        setMeal(mealData.mealServiceDietInfo?.[1]?.row || null);

        // 시간표 데이터 (사용자 설정 우선, 없으면 나이스 API)
        const dayOfWeek = getDayName(date);
        if (customTimetable[dayOfWeek] && customTimetable[dayOfWeek].some(item => item)) {
          // 사용자 설정 시간표가 있으면 해당 데이터를 사용
          setTimetable(customTimetable[dayOfWeek].map((subject, index) => ({
            PERIO: index + 1,
            ITRT_CNTNT: subject
          })));
        } else {
          // 없으면 나이스 API 호출
          const timetableResponse = await fetch(`${NEIS_API_URL}elsTimetable?key=${NEIS_API_KEY}&type=json&pSize=100&ATPT_OFCDC_SC_CODE=${schoolInfo.regionCode}&SD_SCHUL_CODE=${schoolInfo.code}&AY=${date.getFullYear()}&SEM=${getSemester(date)}&ALL_TI_YMD=${neisFormattedDate}&GRADE=${schoolInfo.grade}&CLASS_NM=${schoolInfo.class}`);
          const timetableData = await timetableResponse.json();
          setTimetable(timetableData.elsTimetable?.[1]?.row || null);
        }
      }

    } catch (error) {
      console.error("API 데이터 로딩 중 오류 발생:", error);
      setMeal(null);
      setTimetable(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 날짜 형식 변환 (YYYY-MM-DD, Open-Meteo용)
  const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // 날짜 형식 변환 (YYYYMMDD, 나이스 API용)
  const formatDateForNeis = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  // 현재 학기 계산
  const getSemester = (d) => {
    const month = d.getMonth() + 1;
    return (month >= 3 && month <= 7) ? '1' : '2';
  };

  // 날짜 이동
  const handleDateChange = (days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    setDate(newDate);
  };

  // 오늘 날짜로 이동
  const goToToday = () => {
    setDate(new Date());
  };

  // 학교 검색 API 호출
  const handleSchoolSearch = async () => {
    if (!searchQuery) return;
    try {
      const response = await fetch(`${NEIS_API_URL}schoolInfo?key=${NEIS_API_KEY}&type=json&pSize=100&SCHUL_NM=${searchQuery}`);
      const data = await response.json();
      setSearchResults(data.schoolInfo?.[1]?.row || []);
    } catch (error) {
      console.error("학교 검색 중 오류 발생:", error);
      setSearchResults([]);
    }
  };

  // 설정 저장
  const saveSettings = () => {
    localStorage.setItem('schoolInfo', JSON.stringify(schoolInfo));
    localStorage.setItem('customTimetable', JSON.stringify(customTimetable));
    setView('main');
    fetchData(); // 설정 저장 후 데이터 재호출
  };

  // 요일 이름 가져오기
  const getDayName = (d) => {
    return ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  };

  // 주말 여부 확인
  const isWeekend = (d) => {
    const day = d.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  };

  const isRain = (code) => [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code);
  const isSnow = (code) => [71, 73, 75, 85, 86].includes(code);

  const handleTimetableChange = (day, period, value) => {
    setCustomTimetable(prev => {
      const newDayTimetable = [...(prev[day] || [])];
      
      // 입력하려는 교시까지 배열 길이를 늘립니다.
      while (newDayTimetable.length < period) {
        newDayTimetable.push('');
      }
      
      newDayTimetable[period - 1] = value;

      return {
        ...prev,
        [day]: newDayTimetable
      };
    });
  };

  const getTimetableRows = () => {
    const maxPeriod = Math.max(8, ...Object.values(customTimetable).map(day => day.length).filter(len => len > 0));
    return Array.from({ length: maxPeriod }, (_, i) => i + 1);
  };

  const getCombinedText = () => {
    // 날씨 정보는 주말에도 가져올 수 있으므로, 정보 없음 처리
    const dateText = `날씨: ${weather ? `${Math.round(weather.temp_max)}°/${Math.round(weather.temp_min)}°` : '정보 없음'}`;
    
    // 급식/시간표는 데이터가 없을 때만 '정보 없음'을 포함
    const mealText = `급식메뉴: ${meal && meal.length > 0 ? meal[0].DDISH_NM.split('<br/>').map(item => item.replace(/\((.*?)\)/g, '').trim()).join(', ') : '정보 없음'}`;
    const timetableText = `시간표: ${timetable && timetable.length > 0 ? timetable.filter(item => item.ITRT_CNTNT).map(item => item.ITRT_CNTNT).join(' ') : '정보 없음'}`;
    
    return `${dateText}\n\n${mealText}\n\n${timetableText}`;
  };
  
  const handleCopy = () => {
    const combinedText = getCombinedText();
    const tempElement = document.createElement('textarea');
    tempElement.value = combinedText;
    document.body.appendChild(tempElement);
    tempElement.select();
    document.execCommand('copy');
    document.body.removeChild(tempElement);
    // 사용자에게 복사 완료 메시지를 표시할 수 있음
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${schoolInfo.name} ${schoolInfo.grade}학년 ${schoolInfo.class}반 정보`,
        text: getCombinedText(),
      }).catch((error) => console.log('공유 실패', error));
    } else {
      // 대안 (예: 복사 버튼 안내)
      console.log('웹 공유 API를 지원하지 않는 환경입니다.');
    }
  };
  

  // 메인 화면
  if (view === 'main') {
    const isSchoolSet = schoolInfo.code && schoolInfo.regionCode;
    const todayIsWeekend = isWeekend(date);
    const holidayName = isPublicHoliday(date); // 고정 및 음력 공휴일 이름 (없으면 false)
    const isHoliday = !!holidayName; // 공휴일 여부
    
    // 공휴일/주말이 아니면서 데이터가 있는지 확인
    const isRegularWorkingDay = !todayIsWeekend && !isHoliday;
    const hasData = isRegularWorkingDay && (meal || timetable);

    return (
      <div className="min-h-screen p-4 flex flex-col items-center bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-300 font-noto-kr">
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100..900&display=swap');
            .font-noto-kr {
              font-family: 'Noto Sans KR', sans-serif;
            }
          `}
        </style>
        
        {/* 헤더 */}
        <header className="w-full max-w-lg mb-6 pt-12 relative">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-bold">시간표 급식표 조회</h1>
            <button
              onClick={() => setView('settings')}
              className="text-2xl text-current focus:outline-none"
              aria-label="설정"
            >
              &#9881;
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {schoolInfo.name ? `${schoolInfo.name} ${schoolInfo.grade}학년 ${schoolInfo.class}반` : '학교를 선택하세요'}
          </p>
        </header>

        {isSchoolSet ? (
          <>
            {/* 날짜 네비게이션 */}
            <div className="w-full max-w-lg flex justify-between items-center p-4 mb-6 rounded-2xl bg-white dark:bg-gray-800 shadow-md">
              <button
                onClick={() => handleDateChange(-1)}
                className="text-lg text-gray-600 dark:text-gray-300 focus:outline-none"
              >
                &lt;
              </button>
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold">
                  {`${date.getMonth() + 1}월 ${date.getDate()}일`}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {`${getDayName(date)}요일`}
                  {date.toDateString() === new Date().toDateString() && (
                    <button
                      onClick={goToToday}
                      className="ml-2 text-blue-500 hover:underline focus:outline-none"
                    >
                      오늘
                    </button>
                  )}
                </span>
              </div>
              <button
                onClick={() => handleDateChange(1)}
                className="text-lg text-gray-600 dark:text-gray-300 focus:outline-none"
              >
                &gt;
              </button>
            </div>
            
            {/* 로딩 중 메시지 */}
            {isLoading && (
               <div className="w-full max-w-lg p-6 mb-4 rounded-2xl bg-white dark:bg-gray-800 shadow-md flex justify-center items-center h-40">
                  <p className="text-lg text-blue-500 dark:text-blue-400">정보 로딩 중...</p>
               </div>
            )}

            {/* 1. 휴일/공휴일 메시지 (최우선) */}
            {!isLoading && (todayIsWeekend || isHoliday) && (
              <div 
                className={`w-full max-w-lg p-8 mb-6 rounded-2xl shadow-xl border-4 ${
                  isHoliday ? 'bg-red-100 dark:bg-red-900 border-red-500 dark:border-red-400' : 
                  'bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-400'
                }`}
              >
                <h2 className="text-3xl font-bold text-center">
                  {isHoliday ? `공휴일 (${holidayName})` : '휴일 (토/일요일)'}
                </h2>
                {!isHoliday && (
                    <p className="text-center text-blue-500 dark:text-blue-300 mt-2">
                        (시간표와 급식 정보는 제공되지 않습니다)
                    </p>
                )}
              </div>
            )}
            
            {/* 2. 데이터 없음 메시지 (주말/명시적 공휴일이 아니면서 데이터가 없는 경우) */}
            {!isLoading && isRegularWorkingDay && !hasData && (
              <div className="w-full max-w-lg p-8 mb-6 rounded-2xl bg-yellow-100 dark:bg-yellow-900 shadow-xl border-4 border-yellow-500 dark:border-yellow-400">
                <h2 className="text-3xl font-bold text-center text-yellow-700 dark:text-yellow-200">
                  정보 없음
                </h2>
                <p className="text-center text-yellow-500 dark:text-yellow-300 mt-2">
                  (선택된 날짜의 시간표/급식 정보가 없습니다. 변동 공휴일이나 휴교일일 수 있습니다.)
                </p>
              </div>
            )}

            {/* 단톡 공유 항목 - 일반 평일이면서 데이터가 있는 경우에만 표시 */}
            {!isLoading && isRegularWorkingDay && hasData && (
              <div className="w-full max-w-lg p-6 mb-4 rounded-2xl bg-white dark:bg-gray-800 shadow-md">
                <h2 className="text-lg font-semibold mb-2">
                  {`${schoolInfo.grade}학년 ${schoolInfo.class}반`}
                </h2>
                <div className="whitespace-pre-line text-base mb-4">
                  {getCombinedText()}
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 rounded-2xl bg-gray-200 dark:bg-gray-700 text-sm font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                  >
                    복사하기
                  </button>
                  <button
                    onClick={handleShare}
                    className="px-4 py-2 rounded-2xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-colors duration-200"
                  >
                    공유하기
                  </button>
                </div>
              </div>
            )}

            {/* 날씨 정보 카드 (항상 표시) */}
            <div className="w-full max-w-lg p-6 mb-4 rounded-2xl bg-white dark:bg-gray-800 shadow-md">
              <h2 className="text-lg font-semibold mb-2">날씨</h2>
              {isLoading ? (
                <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
              ) : weather && weather.weather_code !== undefined ? (
                <div className="flex items-center space-x-4">
                  <p className="text-xl font-bold">
                    {`${Math.round(weather.temp_max)}°/${Math.round(weather.temp_min)}°`}
                    {isRain(weather.weather_code) && weather.precipitation_probability > 0 && (
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                        (비, {weather.precipitation_probability}%)
                      </span>
                    )}
                    {isSnow(weather.weather_code) && (
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                        (눈)
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">날씨 정보를 불러올 수 없습니다. (7일치 예보만 제공)</p>
              )}
            </div>

            {/* 시간표 정보 카드 - 일반 평일이면서 데이터가 있을 때만 표시 */}
            {!isLoading && isRegularWorkingDay && timetable && timetable.length > 0 && (
              <div className="w-full max-w-lg p-6 mb-4 rounded-2xl bg-white dark:bg-gray-800 shadow-md">
                <h2 className="text-lg font-semibold mb-2">시간표</h2>
                {/* 로딩 체크는 이미 상위에서 했음 */}
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {timetable.filter(item => item.ITRT_CNTNT).map((item, index) => (
                    <li key={index} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-center text-sm">
                      <span className="font-bold">{item.PERIO}교시:</span> {item.ITRT_CNTNT}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 급식 정보 카드 - 일반 평일이면서 데이터가 있을 때만 표시 */}
            {!isLoading && isRegularWorkingDay && meal && meal.length > 0 && (
              <div className="w-full max-w-lg p-6 mb-4 rounded-2xl bg-white dark:bg-gray-800 shadow-md">
                <h2 className="text-lg font-semibold mb-2">급식표</h2>
                {/* 로딩 체크는 이미 상위에서 했음 */}
                <ul>
                  {meal[0].DDISH_NM.split('<br/>').map((item, index) => (
                    <li key={index} className="py-1 text-gray-700 dark:text-gray-200">
                      {item.replace(/\((.*?)\)/g, '').trim()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="w-full max-w-lg p-6 mb-4 rounded-2xl bg-white dark:bg-gray-800 shadow-md flex justify-center items-center h-48">
            <p className="text-lg text-gray-500 dark:text-gray-400 text-center">
              설정에서 정보를 입력해주세요.
            </p>
          </div>
        )}
      </div>
    );
  }

  // 설정 화면
  return (
    <div className="min-h-screen p-4 flex flex-col items-center bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white transition-colors duration-300 font-noto-kr">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100..900&display=swap');
          .font-noto-kr {
            font-family: 'Noto Sans KR', sans-serif;
          }
        `}
      </style>
      <div className="w-full max-w-4xl p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-lg relative">
        <h1 className="text-2xl font-bold mb-6">학교 설정 및 시간표 편집</h1>
        <div className="flex flex-col md:flex-row gap-8">
          {/* 좌측: 학교 정보 설정 */}
          <div className="w-full md:w-1/3 space-y-4">
            {/* 학교 검색 */}
            <div>
              <label className="block text-sm font-semibold mb-2">학교명</label>
              <div className="flex whitespace-nowrap">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="학교를 검색하세요"
                  className="w-full px-4 py-3 rounded-l-2xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                />
                <button
                  onClick={handleSchoolSearch}
                  className="px-6 py-3 rounded-r-2xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors duration-200"
                >
                  검색
                </button>
              </div>
              <ul className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-gray-300 dark:border-gray-600">
                {searchResults.map((school) => (
                  <li
                    key={school.SD_SCHUL_CODE}
                    onClick={() => {
                      setSchoolInfo({
                        ...schoolInfo,
                        name: school.SCHUL_NM,
                        code: school.SD_SCHUL_CODE,
                        regionCode: school.ATPT_OFCDC_SC_CODE,
                        regionName: school.LCTN_SC_NM,
                      });
                      setSearchResults([]);
                    }}
                    className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    {school.SCHUL_NM}
                  </li>
                ))}
              </ul>
            </div>

            {/* 학년 선택 */}
            <div>
              <label className="block text-sm font-semibold mb-2">학년</label>
              <select
                value={schoolInfo.grade}
                onChange={(e) => setSchoolInfo({ ...schoolInfo, grade: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <option value="">학년을 선택하세요</option>
                {[1, 2, 3].map((grade) => (
                  <option key={grade} value={grade}>{grade}학년</option>
                ))}
              </select>
            </div>

            {/* 반 선택 */}
            <div>
              <label className="block text-sm font-semibold mb-2">반</label>
              <select
                value={schoolInfo.class}
                onChange={(e) => setSchoolInfo({ ...schoolInfo, class: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <option value="">반을 선택하세요</option>
                {[...Array(20).keys()].map(i => (
                  <option key={i + 1} value={i + 1}>{i + 1}반</option>
                ))}
              </select>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              * 학교 정보는 나이스 교육정보 개방포털에서 제공됩니다.
            </p>
          </div>

          {/* 우측: 시간표 편집 */}
          <div className="w-full md:w-2/3">
            <h3 className="text-lg font-semibold mb-4">시간표 직접 입력</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <th className="px-2 py-2 text-center">교시</th>
                    {['월', '화', '수', '목', '금'].map(day => (
                      <th key={day} className="px-2 py-2 text-center">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getTimetableRows().map(period => {
                    return (
                      <tr key={period} className="border-b border-gray-300 dark:border-gray-600">
                        <td className="px-2 py-2 text-center font-bold">{period}</td>
                        {['월', '화', '수', '목', '금'].map(day => (
                          <td key={day} className="px-2 py-2">
                            <input
                              type="text"
                              value={(customTimetable[day] && customTimetable[day][period - 1]) || ''}
                              onChange={(e) => handleTimetableChange(day, period, e.target.value)}
                              className="w-full px-2 py-1 text-center rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-8">
          <button
            onClick={() => setView('main')}
            className="px-6 py-3 rounded-2xl bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white font-bold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            취소
          </button>
          <button
            onClick={saveSettings}
            className="px-6 py-3 rounded-2xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors duration-200"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
