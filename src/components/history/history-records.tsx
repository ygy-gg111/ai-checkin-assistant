'use client';

import {
  CopyOutlined,
  EllipsisOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined
} from '@ant-design/icons';
import {App, Button, Card, Select} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useState} from 'react';

import {GuestEmptyState} from '@/components/auth/guest-empty-state';
import {useAuth} from '@/hooks/use-auth';

const {Option} = Select;

interface HistoryItem {
  id: string;
  topic: string;
  topicType?: string;
  style?: string;
  styleType?: string;
  date: string;
  time: string;
  title: string;
  preview?: string;
  contentPreview?: string;
  content?: string;
  tags: string[];
  coverImage?: string | null;
}

type HistoryApiData = {
  list: HistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export function HistoryRecords() {
  const t = useTranslations('History');
  const locale = useLocale();
  const {message} = App.useApp();
  const isEn = locale === 'en';
  const {isAuthenticated, status} = useAuth();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [records, setRecords] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    async function loadRecords() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: '10',
        });
        if (searchQuery.trim()) {
          params.set('keyword', searchQuery.trim());
        }
        if (topicFilter !== 'all') {
          params.set('topic', topicFilter);
        }
        if (styleFilter !== 'all') {
          params.set('style', styleFilter);
        }

        const response = await fetch(`/api/posts?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load history: ${response.status}`);
        }

        const payload = await response.json() as {data: HistoryApiData};
        setRecords(payload.data.list);
        setTotal(payload.data.pagination.total);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        message.error(isEn ? 'Failed to load records' : '历史记录加载失败');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecords();

    return () => controller.abort();
  }, [currentPage, isAuthenticated, isEn, message, searchQuery, status, styleFilter, topicFilter]);

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <GuestEmptyState
        icon={<FileTextOutlined />}
        titleKey="guest_historyTitle"
        descKey="guest_historyDesc"
      />
    );
  }

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
    message.info(`${actionName}: ${id}`);
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

        {records.length > 0 ? (
          records.map((rec, index) => (
            <article key={rec.id} className="history-item">
              {/* Content column */}
              <div className="history-post">
                <div
                  className="history-cover"
                  style={rec.coverImage
                    ? {backgroundImage: `url(${rec.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center'}
                    : {background: coverGradients[index % coverGradients.length]}}
                />
                <div>
                  <h3>{rec.title}</h3>
                  <div className="history-preview">{rec.contentPreview ?? rec.preview ?? rec.content ?? ''}</div>
                </div>
              </div>

              {/* Topic column */}
              <div>
                <span className={`history-topic-tag ${rec.topicType ?? rec.topic}`}>
                  {getLocalizedTopic(rec.topicType ?? rec.topic)}
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
                  onClick={() => handleCopy(rec.content ?? rec.contentPreview ?? rec.preview ?? rec.title)}
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
            {isLoading
              ? (isEn ? 'Loading records...' : '正在加载历史记录...')
              : (isEn ? 'No matching records found' : '没有找到匹配的记录')}
          </div>
        )}

        {/* Pagination */}
        <div className="history-pagination">
          <span>{t('totalRecords', {count: total})}</span>
          <div className="history-pages-container">
            <Button
              className="history-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              ‹
            </Button>
            <Button className="history-page-btn active">{currentPage}</Button>
            <Button
              className="history-page-btn"
              disabled={currentPage * 10 >= total}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              ›
            </Button>
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
              <strong>{total}</strong>
            </div>
            <div className="history-metric-item">
              <small>{t('statMonthly')}</small>
              <strong>{records.length}</strong>
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
