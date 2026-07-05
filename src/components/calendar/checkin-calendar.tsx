'use client';

import {
  CalendarOutlined,
  FireOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  RiseOutlined,
  StarOutlined,
  SyncOutlined
} from '@ant-design/icons';
import {Button, Card, Col, Row, Tag, Typography} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useState} from 'react';

import {useRouter} from '@/i18n/navigation';

const {Title, Paragraph, Text} = Typography;

interface RecordItem {
  id: string;
  topic: string;
  topicType: 'swimming' | 'study' | 'running';
  time: string;
  title: string;
  tags: string[];
}

interface CalendarDay {
  dayNum: number;
  isMuted?: boolean;
  hasCheck?: boolean;
  events?: {text: string; type: 'swimming' | 'study' | 'running'}[];
  records?: RecordItem[];
}

export function CheckinCalendar() {
  const t = useTranslations('Calendar');
  const tDash = useTranslations('Dashboard');
  const locale = useLocale();
  const router = useRouter();
  const isEn = locale === 'en';

  // Mock initial selected date: July 5, 2026
  const [selectedDayNum, setSelectedDayNum] = useState<number>(5);
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(7);

  // Stats
  const stats = [
    {label: t('statMonthlyCheckins'), value: `18 ${tDash('timeUnit')}`, icon: <RiseOutlined />},
    {label: t('statStreak'), value: `12 ${tDash('dayUnit')}`, icon: <FireOutlined style={{color: '#f59e0b'}} />},
    {label: t('statLongestStreak'), value: `21 ${tDash('dayUnit')}`, icon: <StarOutlined style={{color: '#ea580c'}} />},
    {label: t('statMonthlyGenerated'), value: `24 ${tDash('postUnit')}`, icon: <SyncOutlined style={{color: '#8b5cf6'}} />},
  ];

  // Mock database records mapped to calendar days (localized based on current language)
  const mockDailyRecords: Record<number, RecordItem[]> = {
    1: [
      {
        id: 'rec-1',
        topic: isEn ? 'Swim · Day 8' : '游泳 · Day 8',
        topicType: 'swimming',
        time: '20:15',
        title: isEn ? 'Swimming Check-in: Breaststroke kick practice' : '游泳打卡：蛙泳手腿配合练习',
        tags: isEn ? ['#Swimming', '#Checkin'] : ['#游泳', '#打卡']
      }
    ],
    2: [
      {
        id: 'rec-2',
        topic: isEn ? 'Learning' : '学习',
        topicType: 'study',
        time: '22:30',
        title: isEn ? 'Learning: Deep dive into Next.js App Router' : '学习：Next.js App Router 深入解析',
        tags: isEn ? ['#Frontend', '#Learning'] : ['#前端', '#学习']
      }
    ],
    3: [
      {
        id: 'rec-3',
        topic: isEn ? 'Running' : '跑步',
        topicType: 'running',
        time: '07:10',
        title: isEn ? 'Morning Run 5K: Maintain breathing pace' : '晨跑 5km：保持呼吸节奏',
        tags: isEn ? ['#Running', '#SelfDiscipline'] : ['#跑步', '#自律']
      }
    ],
    4: [
      {
        id: 'rec-4',
        topic: isEn ? 'Swim · Day 11' : '游泳 · Day 11',
        topicType: 'swimming',
        time: '20:30',
        title: isEn ? 'Swimming Check-in: Tried short distance freestyle' : '游泳打卡：尝试短距离自由泳',
        tags: isEn ? ['#Swimming', '#Daily'] : ['#游泳', '#日常']
      }
    ],
    5: [
      {
        id: 'rec-5-1',
        topic: isEn ? 'Swim · Day 12' : '游泳 · Day 12',
        topicType: 'swimming',
        time: '20:42',
        title: t('swimmingTitle'),
        tags: isEn ? ['#SwimmingCheckin', '#DeveloperLife'] : ['#游泳打卡', '#普通程序员']
      },
      {
        id: 'rec-5-2',
        topic: isEn ? 'Learning' : '学习',
        topicType: 'study',
        time: '22:10',
        title: t('studyTitle'),
        tags: isEn ? ['#LearningRecord', '#BuildProjects'] : ['#学习记录', '#做项目']
      }
    ],
    7: [
      {
        id: 'rec-7',
        topic: isEn ? 'Swim · Day 13' : '游泳 · Day 13',
        topicType: 'swimming',
        time: '19:40',
        title: isEn ? 'Swimming Check-in: Pool was crowded, slow swam 1000m' : '游泳打卡：泳池人有点多，慢游了1000米',
        tags: isEn ? ['#AfterWork', '#Workout'] : ['#下班日常', '#运动']
      }
    ],
    9: [
      {
        id: 'rec-9',
        topic: isEn ? 'Learning' : '学习',
        topicType: 'study',
        time: '21:50',
        title: isEn ? 'Learning: Advanced Zustand state management' : '学习：Zustand 状态管理进阶',
        tags: isEn ? ['#Frontend', '#React'] : ['#前端开发', '#React']
      }
    ],
    10: [
      {
        id: 'rec-10',
        topic: isEn ? 'Running' : '跑步',
        topicType: 'running',
        time: '21:15',
        title: isEn ? 'Running: Evening jog for 40 minutes' : '跑步：晚间慢跑 40 分钟',
        tags: isEn ? ['#NightRun', '#Exercise'] : ['#夜跑', '#锻炼']
      }
    ],
    12: [
      {
        id: 'rec-12',
        topic: isEn ? 'Swim · Day 16' : '游泳 · Day 16',
        topicType: 'swimming',
        time: '20:20',
        title: isEn ? 'Swimming Check-in: Focus on stroke efficiency' : '游泳打卡：专注划水效率，感觉不错',
        tags: isEn ? ['#SwimmingCheckin', '#Persistence'] : ['#游泳打卡', '#坚持']
      }
    ],
    14: [
      {
        id: 'rec-14',
        topic: isEn ? 'Swim · Day 17' : '游泳 · Day 17',
        topicType: 'swimming',
        time: '20:10',
        title: isEn ? 'Swimming Check-in: Challenge continuous breaststroke 500m' : '游泳打卡：挑战不间断蛙泳 500 米',
        tags: isEn ? ['#ChallengeSelf', '#Workout'] : ['#挑战自我', '#运动']
      }
    ],
    16: [
      {
        id: 'rec-16',
        topic: isEn ? 'Learning' : '学习',
        topicType: 'study',
        time: '22:00',
        title: isEn ? 'Learning: TypeScript advanced type system study' : '学习：TypeScript 高级类型系统学习',
        tags: isEn ? ['#Learning', '#TS'] : ['#学习', '#TS']
      }
    ],
    17: [
      {
        id: 'rec-17',
        topic: isEn ? 'Swim · Day 18' : '游泳 · Day 18',
        topicType: 'swimming',
        time: '20:30',
        title: isEn ? 'Swimming Check-in: Practiced treading water skills' : '游泳打卡：练习踩水技巧',
        tags: isEn ? ['#Swimming', '#Skills'] : ['#游泳', '#技能']
      }
    ],
    19: [
      {
        id: 'rec-19',
        topic: isEn ? 'Running' : '跑步',
        topicType: 'running',
        time: '08:00',
        title: isEn ? 'Running: Weekend aerobic endurance jog 6km' : '跑步：周末有氧耐力慢跑 6km',
        tags: isEn ? ['#WeekendRun', '#Health'] : ['#周末晨跑', '#健康']
      }
    ],
    21: [
      {
        id: 'rec-21',
        topic: isEn ? 'Swim · Day 20' : '游泳 · Day 20',
        topicType: 'swimming',
        time: '20:45',
        title: isEn ? 'Swimming Check-in: Day 20 milestone! Finished 1500m' : '游泳打卡：第20天里程碑！蛙泳 1500 米完成',
        tags: isEn ? ['#Milestone', '#Breaststroke'] : ['#打卡里程碑', '#蛙泳']
      }
    ],
    24: [
      {
        id: 'rec-24',
        topic: isEn ? 'Learning' : '学习',
        topicType: 'study',
        time: '22:15',
        title: isEn ? 'Learning: Read architecture design book for 45 minutes' : '学习：系统阅读 45 分钟架构设计书',
        tags: isEn ? ['#Architecture', '#Reading'] : ['#架构设计', '#读书记录']
      }
    ],
  };

  // Helper to map record list to event items in calendar grid
  const getEventsForDay = (day: number) => {
    const records = mockDailyRecords[day];
    if (!records) return undefined;
    return records.map((r) => {
      let text = r.topic;
      if (r.topicType === 'swimming') text = t('swimmingDay', {day: r.topic.replace(/\D/g, '') || '12'});
      if (r.topicType === 'study') text = t('studyLabel');
      if (r.topicType === 'running') text = t('runningLabel', {info: r.title.includes('5km') ? '5km' : r.title.includes('6km') ? '6km' : '慢跑'});

      return {
        text,
        type: r.topicType,
      };
    });
  };

  // Generate grid days for July 2026
  // July 1st, 2026 is a Wednesday. We have 2 muted days at start (29, 30 of June).
  // July has 31 days. 31 + 2 = 33 days. We need 2 muted days at end (1, 2 of August) to make 35 grid cells (5 full weeks).
  const generateDays = (): CalendarDay[] => {
    const daysList: CalendarDay[] = [];

    // June muted days (29, 30)
    daysList.push({dayNum: 29, isMuted: true});
    daysList.push({dayNum: 30, isMuted: true});

    // July days (1 to 31)
    for (let d = 1; d <= 31; d++) {
      const records = mockDailyRecords[d];
      daysList.push({
        dayNum: d,
        hasCheck: !!records && records.length > 0,
        events: getEventsForDay(d),
        records: records,
      });
    }

    // August muted days (1, 2)
    daysList.push({dayNum: 1, isMuted: true});
    daysList.push({dayNum: 2, isMuted: true});

    return daysList;
  };

  const calendarDays = generateDays();
  const selectedDayData = calendarDays.find((d) => !d.isMuted && d.dayNum === selectedDayNum);
  const selectedRecords = selectedDayData?.records || [];

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
                const isToday = !day.isMuted && day.dayNum === 5; // July 5, 2026 is mocked as today

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
                        if (ev.type === 'running') badgeColorClass = ' green';

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
