import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown, ArrowUp, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain,
  CloudSnow, CloudSun, Droplets, LoaderCircle, MapPin, RefreshCw, Search, Star,
  Sun, Thermometer, Wind, X,
} from 'lucide-react'

type City = { id: string; name: string; region: string; lat: number; lon: number }
type Forecast = {
  current: { temperature_2m: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number; time: string }
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] }
}
type WeatherInfo = { label: string; icon: typeof Sun; sky: string }

const cities: City[] = [
  { id: 'hanoi', name: 'Hà Nội', region: 'Miền Bắc', lat: 21.0285, lon: 105.8542 },
  { id: 'haiphong', name: 'Hải Phòng', region: 'Miền Bắc', lat: 20.8449, lon: 106.6881 },
  { id: 'hue', name: 'Huế', region: 'Miền Trung', lat: 16.4637, lon: 107.5909 },
  { id: 'danang', name: 'Đà Nẵng', region: 'Miền Trung', lat: 16.0544, lon: 108.2022 },
  { id: 'nhatrang', name: 'Nha Trang', region: 'Miền Trung', lat: 12.2388, lon: 109.1967 },
  { id: 'dalat', name: 'Đà Lạt', region: 'Tây Nguyên', lat: 11.9404, lon: 108.4583 },
  { id: 'hcmc', name: 'TP. Hồ Chí Minh', region: 'Miền Nam', lat: 10.8231, lon: 106.6297 },
  { id: 'cantho', name: 'Cần Thơ', region: 'Miền Nam', lat: 10.0452, lon: 105.7469 },
]

function getWeather(code: number): WeatherInfo {
  if (code === 0) return { label: 'Trời quang', icon: Sun, sky: 'sunny' }
  if (code === 1) return { label: 'Ít mây', icon: CloudSun, sky: 'sunny' }
  if (code === 2) return { label: 'Mây rải rác', icon: CloudSun, sky: 'cloudy' }
  if (code === 3) return { label: 'Nhiều mây', icon: Cloud, sky: 'cloudy' }
  if ([45, 48].includes(code)) return { label: 'Sương mù', icon: CloudFog, sky: 'cloudy' }
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Mưa phùn', icon: CloudDrizzle, sky: 'rainy' }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Có mưa', icon: CloudRain, sky: 'rainy' }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Có tuyết', icon: CloudSnow, sky: 'cloudy' }
  if ([95, 96, 99].includes(code)) return { label: 'Có dông', icon: CloudLightning, sky: 'stormy' }
  return { label: 'Đang cập nhật', icon: Cloud, sky: 'cloudy' }
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
}
function toDisplay(value: number, unit: 'C' | 'F') {
  return Math.round(unit === 'C' ? value : value * 9 / 5 + 32)
}
function formatUpdated(time: string) {
  const date = new Date(`${time}:00+07:00`)
  if (Number.isNaN(date.getTime())) return time
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(date)
}
function formatDay(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('vi-VN', options).format(new Date(`${date}T12:00:00`))
}

export default function App() {
  const [selected, setSelected] = useState<City | null>(null)
  const [weatherByCity, setWeatherByCity] = useState<Record<string, Forecast>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle')
  const [error, setError] = useState('')
  const [unit, setUnit] = useState<'C' | 'F'>('C')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('vietnam-weather-favorites') || '[]') as string[] } catch { return [] }
  })
  const [retryKey, setRetryKey] = useState(0)

  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])
  useEffect(() => {
    if (!selected) { setStatus('idle'); return }
    const cached = weatherByCity[selected.id]
    if (cached && retryKey === 0) { setStatus('ready'); return }
    const controller = new AbortController()
    setStatus('loading')
    setError('')
    const params = new URLSearchParams({
      latitude: String(selected.lat), longitude: String(selected.lon),
      current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      timezone: 'Asia/Ho_Chi_Minh', forecast_days: '7',
    })
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Máy chủ thời tiết phản hồi lỗi (${response.status}).`)
        return await response.json() as Forecast
      })
      .then((data) => {
        setWeatherByCity((previous) => ({ ...previous, [selected.id]: data }))
        setStatus('ready')
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Không thể tải dữ liệu thời tiết. Vui lòng thử lại.')
        setStatus('error')
      })
    return () => controller.abort()
  }, [selected, retryKey])

  const visibleCities = useMemo(() => {
    const term = normalize(query.trim())
    return cities.filter((city) => !term || normalize(`${city.name} ${city.region}`).includes(term))
  }, [query])
  const weather = selected ? weatherByCity[selected.id] : undefined
  const currentWeather = weather ? getWeather(weather.current.weather_code) : null
  const CurrentIcon = currentWeather?.icon ?? CloudSun
  const toggleFavorite = (id: string) => {
    setFavorites((previous) => {
      const next = previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
      localStorage.setItem('vietnam-weather-favorites', JSON.stringify(next))
      return next
    })
  }

  return (
    <div className={`app-shell ${currentWeather?.sky ?? 'sunny'}`}>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Thời tiết Việt Nam">
          <span className="brand-mark"><Sun size={21} strokeWidth={1.8} /></span>
          <span className="brand-text">mây<span>.</span></span>
        </a>
        <div className="topbar-meta"><span className="live-dot" /> DỮ LIỆU THỜI TIẾT TRỰC TIẾP <span className="meta-divider" /> Open-Meteo</div>
        <div className="unit-switch" aria-label="Chọn đơn vị nhiệt độ">
          <button className={unit === 'C' ? 'active' : ''} onClick={() => setUnit('C')} aria-pressed={unit === 'C'}>°C</button>
          <button className={unit === 'F' ? 'active' : ''} onClick={() => setUnit('F')} aria-pressed={unit === 'F'}>°F</button>
        </div>
      </header>

      <main id="top" className="dashboard">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <div><p className="eyebrow">KHÁM PHÁ</p><h1>Thành phố</h1></div>
            <span className="city-count">08</span>
          </div>
          <label className="search-box">
            <Search size={17} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm thành phố..." aria-label="Tìm thành phố" />
            {query && <button className="clear-search" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm"><X size={14} /></button>}
            {!query && <kbd>⌘ K</kbd>}
          </label>
          <div className="city-list">
            {visibleCities.length ? visibleCities.map((city) => {
              const chosen = selected?.id === city.id
              const favorite = favorites.includes(city.id)
              const cached = weatherByCity[city.id]
              const cityWeather = cached ? getWeather(cached.current.weather_code) : null
              const CityIcon = cityWeather?.icon ?? MapPin
              return <div className={`city-row ${chosen ? 'selected' : ''}`} key={city.id}>
                <button className="city-select" onClick={() => { setSelected(city); setRetryKey(0) }} aria-current={chosen ? 'true' : undefined}>
                  <span className="city-icon"><CityIcon size={18} strokeWidth={1.8} /></span>
                  <span className="city-copy"><span className="city-name">{city.name}</span><span className="city-region">{city.region}</span></span>
                  {cached && <span className="city-temp">{toDisplay(cached.current.temperature_2m, unit)}°</span>}
                </button>
                <button className={`favorite-btn ${favorite ? 'favorited' : ''}`} aria-label={favorite ? `Bỏ yêu thích ${city.name}` : `Yêu thích ${city.name}`} aria-pressed={favorite} onClick={() => toggleFavorite(city.id)}><Star size={15} fill={favorite ? 'currentColor' : 'none'} /></button>
              </div>
            }) : <div className="no-cities">Không tìm thấy thành phố phù hợp.</div>}
          </div>
          <div className="sidebar-foot"><span className="source-mark">✳</span><span><strong>Open-Meteo</strong><br />Dự báo mở, cập nhật liên tục</span></div>
        </aside>

        <section className="content" aria-live="polite">
          {!selected ? <div className="welcome-card">
            <div className="welcome-copy"><span className="pill"><span className="live-dot" /> DỰ BÁO THỜI TIẾT</span><h2>Bầu trời hôm nay<br /><em>trông thế nào?</em></h2><p>Chọn một thành phố để khám phá thời tiết hiện tại và dự báo 7 ngày.</p>
              <div className="welcome-hint"><span className="hint-icon"><MapPin size={17} /></span><span>Chọn địa điểm từ danh sách<br /><small>8 thành phố trên khắp Việt Nam</small></span></div>
            </div><div className="welcome-art"><div className="sun-disc" /><div className="cloud-shape cloud-back" /><div className="cloud-shape cloud-front" /><div className="art-spark spark-a">✳</div><div className="art-spark spark-b">✦</div><div className="art-label">VIỆT NAM · 2026</div></div>
          </div> : <>
            <div className="content-title">
              <div><p className="eyebrow">THỜI TIẾT TẠI</p><h2><MapPin size={19} /> {selected.name}</h2></div>
              {status === 'ready' && <button className="refresh-btn" aria-label="Cập nhật thời tiết" onClick={() => setRetryKey((key) => key + 1)}><RefreshCw size={15} /> Cập nhật</button>}
            </div>
            {status === 'loading' && <div className="state-card loading-state"><span className="loader-orb"><LoaderCircle size={26} /></span><div><h3>Đang xem tình hình bầu trời</h3><p>Đang lấy dữ liệu mới nhất cho {selected.name}...</p></div><div className="skeleton-line" /></div>}
            {status === 'error' && <div className="state-card error-state"><span className="error-mark">!</span><div><h3>Chưa thể tải dự báo</h3><p>{error || 'Đã có lỗi khi kết nối tới dịch vụ thời tiết.'}</p><button className="retry-btn" onClick={() => setRetryKey((key) => key + 1)}><RefreshCw size={15} /> Thử lại</button></div></div>}
            {status === 'ready' && weather && currentWeather && <>
              <section className="current-card">
                <div className="current-main"><div className="current-caption"><span className="live-dot" /> THỜI TIẾT HIỆN TẠI <span className="current-time">Cập nhật lúc {formatUpdated(weather.current.time)}</span></div>
                  <div className="current-reading"><div className="temperature">{toDisplay(weather.current.temperature_2m, unit)}<span>°</span></div><div className="condition-wrap"><div className="big-weather-icon"><CurrentIcon size={54} strokeWidth={1.35} /></div><div><div className="condition">{currentWeather.label}</div><div className="feels">Ngoài trời hôm nay</div></div></div></div>
                </div>
                <div className="current-details"><div className="detail-item"><span className="detail-icon humidity"><Droplets size={17} /></span><span><small>Độ ẩm</small><strong>{weather.current.relative_humidity_2m}<i>%</i></strong></span></div><div className="detail-item"><span className="detail-icon wind"><Wind size={17} /></span><span><small>Tốc độ gió</small><strong>{Math.round(weather.current.wind_speed_10m)}<i> km/h</i></strong></span></div><div className="detail-item"><span className="detail-icon feels-icon"><Thermometer size={17} /></span><span><small>Nhiệt độ</small><strong>{toDisplay(weather.current.temperature_2m, unit)}<i>°{unit}</i></strong></span></div></div>
                <div className="card-glow" />
              </section>
              <section className="forecast-section">
                <div className="section-title"><div><p className="eyebrow">LÊN KẾ HOẠCH CHO TUẦN</p><h3>Dự báo 7 ngày</h3></div><span className="forecast-note"><span className="legend-high"><ArrowUp size={12} /></span> Cao nhất <span className="legend-low"><ArrowDown size={12} /></span> Thấp nhất</span></div>
                <div className="forecast-grid">{weather.daily.time.map((date, index) => {
                  const dayWeather = getWeather(weather.daily.weather_code[index])
                  const DayIcon = dayWeather.icon
                  const isToday = index === 0
                  return <article className={`day-card ${isToday ? 'today' : ''}`} key={date}>
                    <div className="day-name">{isToday ? 'Hôm nay' : formatDay(date, { weekday: 'short' })}</div><div className="day-date">{formatDay(date, { day: '2-digit', month: '2-digit' })}</div>
                    <div className={`day-icon ${dayWeather.sky}`}><DayIcon size={26} strokeWidth={1.7} /></div><div className="day-condition">{dayWeather.label}</div>
                    <div className="day-temperatures"><strong><ArrowUp size={12} />{toDisplay(weather.daily.temperature_2m_max[index], unit)}°</strong><span><ArrowDown size={12} />{toDisplay(weather.daily.temperature_2m_min[index], unit)}°</span></div>
                  </article>
                })}</div>
              </section>
              <footer className="content-footer"><span>Thời tiết có thể thay đổi trong ngày.</span><span>Nguồn dữ liệu: <strong>Open-Meteo</strong></span></footer>
            </>}
          </>}
        </section>
      </main>
      <footer className="page-footer">Được tạo với <span>✳</span> cho những ngày đẹp trời <span className="footer-right">THỜI TIẾT VIỆT NAM</span></footer>
    </div>
  )
}



