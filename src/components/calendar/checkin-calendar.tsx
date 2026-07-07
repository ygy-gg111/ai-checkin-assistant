'use client';

import {
  CalendarOutlined,
  FireOutlined,
  LeftOutlined,
  RightOutlined,
  RiseOutlined,
  StarOutlined,
  SyncOutlined
} from '@ant-design/icons';
import {Button, Card} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useState} from 'react';

import {GuestEmptyState} from '@/components/auth/guest-empty-state';
import {useAuth} from '@/hooks/use-auth';
import {useRouter} from '@/i18n/navigation';

interface RecordItem {
  id: string;
  topic: string;
  topicType: TopicType;
  time: string;
  title: string;
  tags: string[];
}

type TopicType = 'swimming' | 'study' | 'running' | 'daily';

interface CalendarDay {
  dayNum: number;
  isMuted?: boolean;
  hasCheck?: boolean;
  events?: {text: string; type: TopicType}[];
  records?: RecordItem[];
}

interface CalendarApiDay {
  date: string;
  checked: boolean;
  count: number;
  topics: string[];
}

export function CheckinCalendar() {
  const t = useTranslations('Calendar');
  const tDash = useTranslations('Dashboard');
  const locale = useLocale();
  const router = useRouter();
  const isEn = locale === 'en';
  const {isAuthenticated, status} = useAuth();

  const initialDate = new Date();
  const [selectedDayNum, setSelectedDayNum] = useState<number>(initialDate.getDate());
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth() + 1);
  const [monthDays, setMonthDays] = useState<CalendarApiDay[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<RecordItem[]>([]);

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    async function loadMonth() {
      try {
        const params = new URLSearchParams({
          year: String(currentYear),
          month: String(currentMonth),
        });
        const response = await fetch(`/api/calendar?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load calendar: ${response.status}`);
        }
        const payload = await response.json() as {data: {days: CalendarApiDay[]}};
        setMonthDays(payload.data.days);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setMonthDays([]);
      }
    }

    void loadMonth();

    return () => controller.abort();
  }, [currentMonth, currentYear, isAuthenticated, status]);

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();
    const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDayNum).padStart(2, '0')}`;

    async function loadDay() {
      try {
        const response = await fetch(`/api/calendar/day?date=${date}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load calendar day: ${response.status}`);
        }
        const payload = await response.json() as {
          data: {
            list: {
              id: string;
              topic: string;
              topicType?: string;
              dayCount: number | null;
              title: string;
              tags: string[];
              time: string;
            }[];
          };
        };
        setSelectedRecords(payload.data.list.map((item) => ({
          id: item.id,
          topic: formatRecordTopic(item.topicType ?? item.topic, item.dayCount),
          topicType: normalizeTopicType(item.topicType ?? item.topic),
          time: item.time,
          title: item.title,
          tags: item.tags,
        })));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setSelectedRecords([]);
      }
    }

    void loadDay();

    return () => controller.abort();
  }, [currentMonth, currentYear, isAuthenticated, selectedDayNum, status]);

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <GuestEmptyState
        icon={<CalendarOutlined />}
        titleKey="guest_calendarTitle"
        descKey="guest_calendarDesc"
      />
    );
  }

  // Stats
  const monthlyCheckins = monthDays.reduce((sum, day) => sum + day.count, 0);
  const stats = [
    {label: t('statMonthlyCheckins'), value: `${monthlyCheckins} ${tDash('timeUnit')}`, icon: <RiseOutlined />},
    {label: t('statStreak'), value: `12 ${tDash('dayUnit')}`, icon: <FireOutlined style={{color: '#f59e0b'}} />},
    {label: t('statLongestStreak'), value: `21 ${tDash('dayUnit')}`, icon: <StarOutlined style={{color: '#ea580c'}} />},
    {label: t('statMonthlyGenerated'), value: `${monthlyCheckins} ${tDash('postUnit')}`, icon: <SyncOutlined style={{color: '#8b5cf6'}} />},
  ];

  const monthDayMap = new Map(monthDays.map((day) => [day.date, day]));

  const generateDays = (): CalendarDay[] => {
    const daysList: CalendarDay[] = [];
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const leadingMutedCount = (firstDay.getDay() + 6) % 7;
    const previousMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();

    for (let i = leadingMutedCount; i > 0; i--) {
      daysList.push({dayNum: previousMonthDays - i + 1, isMuted: true});
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayStats = monthDayMap.get(date);
      daysList.push({
        dayNum: d,
        hasCheck: !!dayStats?.checked,
        events: dayStats?.topics.map((topic) => ({
          text: formatRecordTopic(topic),
          type: normalizeTopicType(topic),
        })),
      });
    }

    const trailingMutedCount = (7 - (daysList.length % 7)) % 7;
    for (let d = 1; d <= trailingMutedCount; d++) {
      daysList.push({dayNum: d, isMuted: true});
    }

    return daysList;
  };

  const calendarDays = generateDays();

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleMonthText = () => {
    const monthsCN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const monthsEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthVal = isEn ? monthsEN[currentMonth - 1] : monthsCN[currentMonth - 1];
    
    return t('yearMonthFormat', {year: currentYear, month: monthVal});
  };

  const getFormattedDateFull = (day: number) => {
    const monthsCN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const monthsEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthVal = isEn ? monthsEN[currentMonth - 1] : monthsCN[currentMonth - 1];
    
    return t('dateFormatFull', {year: currentYear, month: monthVal, day});
  };

  const handleDaySelect = (day: CalendarDay) => {
    if (day.isMuted) return;
    setSelectedDayNum(day.dayNum);
  };

  return (
    <div className="calendar-wrap">
      {/* Stats Row */}
      <section className="calendar-stats">
        {stats.map((s, idx) => (
          <div key={idx} className="calendar-stat">
            <span>{s.icon}</span>
            <small>{s.label}</small>
            <strong>{s.value}</strong>
          </div>
        ))}
      </section>

      {/* Main Grid Content */}
      <div className="calendar-layout">
        {/* Left Side: Calendar Card */}
        <section className="calendar-card">
          {/* Header */}
          <div className="calendar-header-bar">
            <div className="calendar-month-nav">
              <button className="calendar-arrow-btn" onClick={handlePrevMonth}><LeftOutlined style={{fontSize: 12}} /></button>
              <h2>{handleMonthText()}</h2>
              <button className="calendar-arrow-btn" onClick={handleNextMonth}><RightOutlined style={{fontSize: 12}} /></button>
            </div>
            <div className="calendar-legend">
              <span className="calendar-legend-item">
                <i className="calendar-dot" />
                {t('legendChecked')}
              </span>
              <span className="calendar-legend-item">
                <i className="calendar-dot" style={{background: '#10b981'}} />
                {t('legendMultiTopic')}
              </span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid-container">
            <div className="calendar-week-header">
              <span>{t('mon')}</span>
              <span>{t('tue')}</span>
              <span>{t('wed')}</span>
              <span>{t('thu')}</span>
              <span>{t('fri')}</span>
              <span>{t('sat')}</span>
              <span>{t('sun')}</span>
            </div>
            <div className="calendar-days-grid">
              {calendarDays.map((day, index) => {
                const isSelected = !day.isMuted && day.dayNum === selectedDayNum;
                const now = new Date();
                const isToday = !day.isMuted &&
                  currentYear === now.getFullYear() &&
                  currentMonth === now.getMonth() + 1 &&
                  day.dayNum === now.getDate();

                // Determine dot/badge logic
                const hasMultiTopics = day.events && day.events.length > 1;

                let cellClasses = 'calendar-day-cell';
                if (day.isMuted) cellClasses += ' calendar-day-muted';
                if (isToday) cellClasses += ' calendar-day-today';
                if (isSelected) cellClasses += ' calendar-day-selected';

                return (
                  <div
                    key={index}
                    className={cellClasses}
                    onClick={() => handleDaySelect(day)}
                  >
                    <span className={`calendar-day-number${isToday ? ' calendar-today-number' : ''}`}>
                      {day.dayNum}
                    </span>
                    {day.hasCheck && (
                      <span
                        className="calendar-check-mark"
                        style={hasMultiTopics ? {color: '#10b981'} : {}}
                      >
                        ✓
                      </span>
                    )}

                    <div className="calendar-day-tags">
                      {day.events?.map((ev, evIdx) => {
                        let badgeColorClass = '';
                        if (ev.type === 'study') badgeColorClass = ' orange';
                        if (ev.type === 'running' || ev.type === 'daily') badgeColorClass = ' green';

                        return (
                          <span key={evIdx} className={`calendar-event${badgeColorClass}`}>
                            {ev.text}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Side: Day Details Panel */}
        <aside style={{display: 'flex', flexDirection: 'column', gap: 18}}>
          <Card className="calendar-card calendar-detail-panel" styles={{body: {padding: 0}}}>
            {/* Detail Head */}
            <div className="calendar-detail-head">
              <small>{t('selectedDate')}</small>
              <h2>{getFormattedDateFull(selectedDayNum)}</h2>
              <p>
                {t('completedCheckinsCount', {count: selectedRecords.length})}
              </p>
            </div>

            {/* Records List */}
            <div className="calendar-detail-list">
              {selectedRecords.length > 0 ? (
                selectedRecords.map((rec) => (
                  <article key={rec.id} className="calendar-record-card">
                    <div className="calendar-record-top">
                      <span className={`calendar-record-topic-tag ${rec.topicType}`}>
                        {rec.topic}
                      </span>
                      <span style={{color: '#94a3b8', fontSize: 11}}>{rec.time}</span>
                    </div>
                    <h3>{rec.title}</h3>
                    <div className="calendar-record-tags">
                      {rec.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <Button className="calendar-record-view-btn">
                      {t('viewDetail')}
                    </Button>
                  </article>
                ))
              ) : (
                <div style={{padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: 13}}>
                  <CalendarOutlined style={{fontSize: 24, display: 'block', margin: '0 auto 8px', opacity: 0.5}} />
                  {t('noRecords')}
                </div>
              )}
            </div>

            <Button
              className="calendar-add-btn"
              onClick={() => router.push('/create')}
            >
              {t('addCheckinForDay')}
            </Button>
          </Card>

          {/* Flame streak stats */}
          <div className="calendar-streak-banner">
            <span className="calendar-flame-icon">🔥</span>
            <div>
              <b>{t('streakTitle', {days: 12})}</b>
              <span>{t('streakHelp')}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function normalizeTopicType(topic: string): TopicType {
  if (topic === 'swimming' || topic === 'study' || topic === 'running' || topic === 'daily') {
    return topic;
  }

  return 'daily';
}

function formatRecordTopic(topic: string, dayCount?: number | null) {
  const normalized = normalizeTopicType(topic);
  if (normalized === 'swimming') {
    return dayCount ? `游泳 · Day ${dayCount}` : '游泳';
  }
  if (normalized === 'running') {
    return dayCount ? `跑步 · Day ${dayCount}` : '跑步';
  }
  if (normalized === 'study') {
    return '学习';
  }

  return '日常';
}

