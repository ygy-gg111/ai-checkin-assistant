'use client';

import {
  CopyOutlined,
  EllipsisOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined
} from '@ant-design/icons';
import {App, Button, Card, Col, DatePicker, Input, Row, Select, Space, Tag, Typography} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useState} from 'react';

import {GuestEmptyState} from '@/components/auth/guest-empty-state';
import {useAuth} from '@/hooks/use-auth';
import {useRouter} from '@/i18n/navigation';

const {Title, Paragraph, Text} = Typography;
const {Option} = Select;

interface HistoryItem {
  id: string;
  topicType: 'swimming' | 'study' | 'running' | 'daily';
  styleType: 'natural' | 'funny' | 'warm' | 'minimal';
  date: string;
  time: string;
  title: {zh: string; en: string};
  preview: {zh: string; en: string};
  fullContent: {zh: string; en: string};
  tags: string[];
}

export function HistoryRecords() {
  const t = useTranslations('History');
  const locale = useLocale();
  const router = useRouter();
  const {message} = App.useApp();
  const isEn = locale === 'en';
  const {isAuthenticated, status} = useAuth();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <GuestEmptyState
        icon={<FileTextOutlined />}
        titleKey="guest_historyTitle"
        descKey="guest_historyDesc"
      />
    );
  }

  // Mock Database Records
  const allRecords: HistoryItem[] = [
    {
      id: 'post-1',
      topicType: 'swimming',
      styleType: 'natural',
      date: '2026-07-05',
      time: '20:42',
      title: {
        zh: '下班后的 45 分钟，继续和水较劲',
        en: '45 minutes after work, still struggling with water'
      },
      preview: {
        zh: '今天是游泳打卡第 12 天，下班后还是去了泳池，主要练蛙泳腿……',
        en: 'Today is swim day 12. Headed to the pool after work, practiced breaststroke kick...'
      },
      fullContent: {
        zh: '今天是游泳打卡第 12 天。下班后还是去了泳池，主要练蛙泳腿。虽然还是不太走水，但比昨天轻松了一点。不励志，也不装自律，就当普通程序员给自己重启一下。#游泳打卡 #普通程序员 #下班后生活',
        en: 'Day 12 of swimming check-in. Headed to the pool after work, focused on breaststroke kicks. Not super fast, but felt lighter than yesterday. #Swimming #DeveloperLife #AfterWork'
      },
      tags: isEn ? ['#Swimming', '#DeveloperLife'] : ['#游泳打卡', '#普通程序员']
    },
    {
      id: 'post-2',
      topicType: 'study',
      styleType: 'minimal',
      date: '2026-07-04',
      time: '22:15',
      title: {
        zh: '今天没有逆袭，只是多学了半小时',
        en: 'No overnight success, just studied 30 mins more'
      },
      preview: {
        zh: '项目的登录逻辑终于理清楚了，先记下这个小进度，继续坚持学Next.js……',
        en: 'Finally sorted out the login logic, record this small step and keep learning Next.js...'
      },
      fullContent: {
        zh: '今天是学习记录第 8 天。下班后没有去刷手机，多学了半小时的 Next.js。没有逆袭，只是一点点积累。#学习记录 #持续学习 #提升自我',
        en: 'Day 8 of studying. Spent an extra 30 minutes on Next.js instead of scrolling my phone. Tiny progress counts. #Learning #SelfImprovement #CodeLife'
      },
      tags: isEn ? ['#Learning', '#CodeLife'] : ['#学习记录', '#做项目']
    },
    {
      id: 'post-3',
      topicType: 'running',
      styleType: 'funny',
      date: '2026-07-03',
      time: '19:28',
      title: {
        zh: '慢一点没关系，五公里还是跑完了',
        en: 'Slower pace is fine, finished my 5K anyway'
      },
      preview: {
        zh: '今天的配速不快，甚至中途还走了一段，但最后还是顺利冲过了终点线……',
        en: 'Pace was a bit slow today, even walked for a bit, but still pushed through...'
      },
      fullContent: {
        zh: '今天是跑步打卡第 5 天。虽然今天配速比较慢，但最终还是坚持跑完了5公里。慢一点没关系，关键是迈出那一步！#跑步打卡 #慢跑记录 #坚持运动',
        en: 'Day 5 of running. Pace was a bit slow today, but pushed through the 5K. Slow is better than not running at all! #Running #Workout #StayActive'
      },
      tags: isEn ? ['#Running', '#Workout'] : ['#跑步打卡', '#坚持运动']
    },
    {
      id: 'post-4',
      topicType: 'daily',
      styleType: 'warm',
      date: '2026-07-02',
      time: '16:06',
      title: {
        zh: '普通人的周末，也可以慢慢发光',
        en: 'An ordinary weekend can shine slowly too'
      },
      preview: {
        zh: '睡到自然醒，收拾房间，再给自己做一顿简单的饭，把节奏放慢下来……',
        en: 'Woke up naturally, cleaned the room, made a simple meal for myself, slow down...'
      },
      fullContent: {
        zh: '睡到自然醒，收拾房间，再给自己做一顿简单的饭，把节奏放慢下来。普通人的周末，没有宏大的计划，也可以很治愈。#周末日常 #慢生活 #治愈日常',
        en: 'Woke up naturally, tidied up, cooked a simple meal. No big plans, just curing. #WeekendVibes #SlowLife #Cozy'
      },
      tags: isEn ? ['#WeekendVibes', '#SlowLife'] : ['#周末日常', '#慢生活']
    }
  ];

  // Helper to translate topics
  const getLocalizedTopic = (type: string) => {
    switch (type) {
      case 'swimming': return isEn ? 'Swim' : '游泳';
      case 'study': return isEn ? 'Study' : '学习';
      case 'running': return isEn ? 'Run' : '跑步';
      case 'daily': return isEn ? 'Daily' : '日常';
      default: return type;
    }
  };

  // Filter Logic
  const filteredRecords = allRecords.filter((rec) => {
    const titleText = isEn ? rec.title.en : rec.title.zh;
    const contentText = isEn ? rec.fullContent.en : rec.fullContent.zh;
    const matchesSearch =
      titleText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contentText.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTopic = topicFilter === 'all' || rec.topicType === topicFilter;
    const matchesStyle = styleFilter === 'all' || rec.styleType === styleFilter;

    return matchesSearch && matchesTopic && matchesStyle;
  });

  const handleReset = () => {
    setSearchQuery('');
    setTopicFilter('all');
    setStyleFilter('all');
    setCurrentPage(1);
    message.info(t('reset'));
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(isEn ? 'Copied to clipboard!' : '已复制文案！');
    } catch {
      message.error(isEn ? 'Failed to copy' : '复制失败');
    }
  };

  const handleActionClick = (actionName: string, id: string) => {
    message.info(`${actionName} post: ${id}`);
  };

  // Cover gradient backgrounds per index
  const coverGradients = [
    'linear-gradient(145deg, #93c5fd, #c4b5fd)',
    'linear-gradient(145deg, #fdba74, #fda4af)',
    'linear-gradient(145deg, #86efac, #67e8f9)',
    'linear-gradient(145deg, #fde68a, #c4b5fd)',
  ];

  return (
    <div className="history-layout">
      {/* ── Filter Bar ── */}
      <section className="history-filter">
        {/* Search */}
        <div className="history-search">
          <SearchOutlined />
          <input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Topic Select */}
        <Select
          className="history-select"
          value={topicFilter}
          onChange={(val) => setTopicFilter(val)}
          variant="borderless"
          styles={{ popup: { root: { borderRadius: 10 } } }}
        >
          <Option value="all">{t('allTopics')}</Option>
          <Option value="swimming">{isEn ? 'Swim' : '游泳'}</Option>
          <Option value="study">{isEn ? 'Study' : '学习'}</Option>
          <Option value="running">{isEn ? 'Run' : '跑步'}</Option>
          <Option value="daily">{isEn ? 'Daily' : '日常'}</Option>
        </Select>

        {/* Style Select */}
        <Select
          className="history-select"
          value={styleFilter}
          onChange={(val) => setStyleFilter(val)}
          variant="borderless"
          styles={{ popup: { root: { borderRadius: 10 } } }}
        >
          <Option value="all">{t('allStyles')}</Option>
          <Option value="natural">{isEn ? 'Natural' : '真实自然'}</Option>
          <Option value="funny">{isEn ? 'Funny' : '轻松搞笑'}</Option>
          <Option value="warm">{isEn ? 'Warm' : '温暖治愈'}</Option>
          <Option value="minimal">{isEn ? 'Minimal' : '简短克制'}</Option>
        </Select>

        {/* Reset Button */}
        <Button
          className="history-btn-reset"
          onClick={handleReset}
        >
          {t('reset')}
        </Button>
      </section>

      {/* ── Table Card ── */}
      <section className="history-table-card">
        <div className="history-table-head">
          <span>{t('tableHeadContent')}</span>
          <span>{t('tableHeadTopic')}</span>
          <span>{t('tableHeadDate')}</span>
          <span>{t('tableHeadActions')}</span>
        </div>

        {filteredRecords.length > 0 ? (
          filteredRecords.map((rec, index) => (
            <article key={rec.id} className="history-item">
              {/* Content column */}
              <div className="history-post">
                <div
                  className="history-cover"
                  style={{background: coverGradients[index % coverGradients.length]}}
                />
                <div>
                  <h3>{isEn ? rec.title.en : rec.title.zh}</h3>
                  <div className="history-preview">{isEn ? rec.preview.en : rec.preview.zh}</div>
                </div>
              </div>

              {/* Topic column */}
              <div>
                <span className={`history-topic-tag ${rec.topicType}`}>
                  {getLocalizedTopic(rec.topicType)}
                </span>
              </div>

              {/* Date column */}
              <div className="history-date">
                {rec.date}
                <br />
                <span style={{color: '#94a3b8'}}>{rec.time}</span>
              </div>

              {/* Actions column */}
              <div className="history-actions-cell">
                <Button
                  className="history-mini-btn"
                  icon={<EyeOutlined />}
                  onClick={() => handleActionClick(t('viewDetail'), rec.id)}
                  title={t('viewDetail')}
                />
                <Button
                  className="history-mini-btn"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(isEn ? rec.fullContent.en : rec.fullContent.zh)}
                  title={t('copy')}
                />
                <Button
                  className="history-mini-btn"
                  icon={<EllipsisOutlined />}
                  onClick={() => handleActionClick(t('more'), rec.id)}
                  title={t('more')}
                />
              </div>
            </article>
          ))
        ) : (
          <div style={{padding: '50px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 14}}>
            {isEn ? 'No matching records found' : '没有找到匹配的记录'}
          </div>
        )}

        {/* Pagination */}
        <div className="history-pagination">
          <span>{t('totalRecords', {count: filteredRecords.length})}</span>
          <div className="history-pages-container">
            <Button className="history-page-btn">‹</Button>
            <Button className="history-page-btn active">1</Button>
            <Button className="history-page-btn">2</Button>
            <Button className="history-page-btn">3</Button>
            <Button className="history-page-btn">›</Button>
          </div>
        </div>
      </section>

      {/* ── Sidebar Right Column ── */}
      <aside className="history-side-panel">
        {/* Content Stats Card */}
        <Card className="history-table-card" styles={{body: {padding: 0}}}>
          <div className="history-card-head">
            <h2>{t('statistics')}</h2>
          </div>
          <div className="history-metrics-grid">
            <div className="history-metric-item">
              <small>{t('statTotal')}</small>
              <strong>36</strong>
            </div>
            <div className="history-metric-item">
              <small>{t('statMonthly')}</small>
              <strong>18</strong>
            </div>
            <div className="history-metric-item">
              <small>{t('statAvgWords')}</small>
              <strong>142</strong>
            </div>
            <div className="history-metric-item">
              <small>{t('statCopyRate')}</small>
              <strong>86%</strong>
            </div>
          </div>
        </Card>

        {/* Topic Distribution Card */}
        <Card className="history-table-card" styles={{body: {padding: 0}}}>
          <div className="history-card-head">
            <h2>{t('topicDistribution')}</h2>
          </div>
          <div className="history-distribution-panel">
            {/* Swim */}
            <div className="history-dist-row">
              <div className="history-dist-top">
                <span>{isEn ? 'Swim' : '游泳'}</span>
                <b>42%</b>
              </div>
              <div className="bar">
                <span style={{width: '42%', background: '#2563eb'}} />
              </div>
            </div>

            {/* Study */}
            <div className="history-dist-row">
              <div className="history-dist-top">
                <span>{isEn ? 'Study' : '学习'}</span>
                <b>28%</b>
              </div>
              <div className="bar">
                <span style={{width: '28%', background: '#ea580c'}} />
              </div>
            </div>

            {/* Run */}
            <div className="history-dist-row">
              <div className="history-dist-top">
                <span>{isEn ? 'Run' : '跑步'}</span>
                <b>18%</b>
              </div>
              <div className="bar">
                <span style={{width: '18%', background: '#059669'}} />
              </div>
            </div>

            {/* Daily */}
            <div className="history-dist-row">
              <div className="history-dist-top">
                <span>{isEn ? 'Daily' : '日常'}</span>
                <b>12%</b>
              </div>
              <div className="bar">
                <span style={{width: '12%', background: '#7c3aed'}} />
              </div>
            </div>
          </div>
        </Card>

        {/* Insights Card */}
        <div className="history-insight-box">
          <b>✦ {t('monthlySummary')}</b>
          {t('monthlySummaryText')}
        </div>
      </aside>
    </div>
  );
}
