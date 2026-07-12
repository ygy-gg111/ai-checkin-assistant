'use client';

import {
  CopyOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  EyeOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import {App, Button, Card, Dropdown, Image, Modal, Popconfirm, Select, Tag} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useState} from 'react';

import {GuestEmptyState} from '@/components/auth/guest-empty-state';
import {useAuth} from '@/hooks/use-auth';
import {formatTagText, useCopyGeneratedContent} from '@/hooks/use-copy-generated-content';

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
  dayCount?: number | null;
  preview?: string;
  contentPreview?: string;
  content?: string;
  tags: string[];
  coverImage?: string | null;
}

interface HistoryDetail extends HistoryItem {
  style: string;
  inputText: string;
  content: string;
  coverText: string | null;
  provider: string;
  model: string;
  checkinDate: string;
  createdAt: string;
  images: {
    id: string;
    url: string;
  }[];
}

interface RegenerateResponse {
  result: {
    title: string;
    content: string;
    tags: string[];
    coverText?: string | null;
  };
  post: HistoryDetail;
  listItem: HistoryItem;
}

type HistoryApiData = {
  list: HistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

interface HistoryStats {
  total: number;
  monthly: number;
  avgWords: number;
  copyRate: number | null;
  topicDistribution: {
    topic: string;
    count: number;
    percent: number;
  }[];
}

export function HistoryRecords() {
  const t = useTranslations('History');
  const locale = useLocale();
  const {message} = App.useApp();
  const isEn = locale === 'en';
  const {isAuthenticated, status} = useAuth();
  const copyGeneratedContent = useCopyGeneratedContent();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [records, setRecords] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<HistoryStats>({
    total: 0,
    monthly: 0,
    avgWords: 0,
    copyRate: null,
    topicDistribution: [],
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<HistoryDetail | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const topTopic = [...stats.topicDistribution].sort((a, b) => b.count - a.count)[0];

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

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    async function loadStats() {
      try {
        const response = await fetch('/api/history/stats', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load history stats: ${response.status}`);
        }

        const payload = await response.json() as {data: HistoryStats};
        setStats(payload.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setStats({
          total: 0,
          monthly: 0,
          avgWords: 0,
          copyRate: null,
          topicDistribution: [],
        });
      }
    }

    void loadStats();

    return () => controller.abort();
  }, [isAuthenticated, status]);

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

  const loadDetail = async (id: string, shouldOpen = true) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/posts/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to load detail: ${response.status}`);
      }

      const payload = await response.json() as {data: HistoryDetail};
      setSelectedDetail(payload.data);
      if (shouldOpen) {
        setDetailOpen(true);
      }
      return payload.data;
    } catch {
      message.error(isEn ? 'Failed to load detail' : '详情加载失败');
      return null;
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopyRecord = async (record: HistoryItem) => {
    const detail = await loadDetail(record.id, false);
    await copyGeneratedContent(detail ? toGeneratedCopyContent(detail) : toGeneratedCopyContent(record));
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to delete record: ${response.status}`);
      }

      message.success(isEn ? 'Deleted' : '已删除');
      setRecords((items) => items.filter((item) => item.id !== id));
      setTotal((value) => Math.max(0, value - 1));
      setStats((value) => ({
        ...value,
        total: Math.max(0, value.total - 1),
      }));
      if (selectedDetail?.id === id) {
        setDetailOpen(false);
        setSelectedDetail(null);
      }
    } catch {
      message.error(isEn ? 'Delete failed' : '删除失败');
    }
  };

  const handleRegenerate = async (record: Pick<HistoryItem, 'id' | 'style'>) => {
    setRegeneratingId(record.id);
    try {
      const response = await fetch(`/api/posts/${record.id}/regenerate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          style: record.style ?? 'natural',
        }),
      });

      const payload = await response.json() as {message?: string; data?: RegenerateResponse};
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || t('regenerateFailed'));
      }

      setRecords((items) => items.map((item) => (
        item.id === record.id ? payload.data!.listItem : item
      )));

      if (selectedDetail?.id === record.id) {
        setSelectedDetail(payload.data.post);
      }

      message.success(t('regenerateSuccess'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('regenerateFailed'));
    } finally {
      setRegeneratingId(null);
    }
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
      <section className="history-table-card history-list-card">
        <div className="history-table-head">
          <span>{t('tableHeadContent')}</span>
          <span>{t('tableHeadTopic')}</span>
          <span>{t('tableHeadDate')}</span>
          <span>{t('tableHeadActions')}</span>
        </div>

        <div className="history-list-scroll">
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
                  loading={detailLoading && selectedDetail?.id === rec.id}
                  onClick={() => void loadDetail(rec.id, true)}
                  title={t('viewDetail')}
                />
                <Button
                  className="history-mini-btn"
                  icon={<CopyOutlined />}
                  onClick={() => void handleCopyRecord(rec)}
                  title={t('copy')}
                />
                <Button
                  className="history-mini-btn"
                  icon={<ReloadOutlined />}
                  loading={regeneratingId === rec.id}
                  onClick={() => void handleRegenerate(rec)}
                  title={t('regenerate')}
                />
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      {
                        key: 'regenerate',
                        icon: <ReloadOutlined />,
                        label: (
                          <Popconfirm
                            title={t('regenerateConfirm')}
                            description={t('regenerateHint')}
                            okText={t('regenerate')}
                            cancelText={isEn ? 'Cancel' : '取消'}
                            onConfirm={() => void handleRegenerate(rec)}
                          >
                            <span>{t('regenerate')}</span>
                          </Popconfirm>
                        ),
                      },
                      {
                        key: 'delete',
                        danger: true,
                        icon: <DeleteOutlined />,
                        label: (
                          <Popconfirm
                            title={isEn ? 'Delete this record?' : '删除这条记录？'}
                            okText={isEn ? 'Delete' : '删除'}
                            cancelText={isEn ? 'Cancel' : '取消'}
                            onConfirm={() => void handleDelete(rec.id)}
                          >
                            <span>{isEn ? 'Delete' : '删除'}</span>
                          </Popconfirm>
                        ),
                      },
                    ],
                  }}
                >
                  <Button className="history-mini-btn" icon={<EllipsisOutlined />} title={t('more')} />
                </Dropdown>
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
        </div>

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
              <strong>{stats.total}</strong>
            </div>
            <div className="history-metric-item">
              <small>{t('statMonthly')}</small>
              <strong>{stats.monthly}</strong>
            </div>
            <div className="history-metric-item">
              <small>{t('statAvgWords')}</small>
              <strong>{stats.avgWords}</strong>
            </div>
            <div className="history-metric-item">
              <small>{t('statCopyRate')}</small>
              <strong>{stats.copyRate === null ? '-' : `${stats.copyRate}%`}</strong>
            </div>
          </div>
        </Card>

        {/* Topic Distribution Card */}
        <Card className="history-table-card" styles={{body: {padding: 0}}}>
          <div className="history-card-head">
            <h2>{t('topicDistribution')}</h2>
          </div>
          <div className="history-distribution-panel">
            {stats.topicDistribution.map((item) => (
              <div key={item.topic} className="history-dist-row">
                <div className="history-dist-top">
                  <span>{getLocalizedTopic(item.topic)}</span>
                  <b>{item.percent}%</b>
                </div>
                <div className="bar">
                  <span style={{width: `${item.percent}%`, background: getTopicColor(item.topic)}} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Insights Card */}
        <div className="history-insight-box">
          <b>✦ {t('monthlySummary')}</b>
          {formatMonthlySummary(stats, topTopic?.topic, getLocalizedTopic, isEn)}
        </div>
      </aside>

      <Modal
        title={selectedDetail?.title ?? t('viewDetail')}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button
            key="regenerate"
            icon={<ReloadOutlined />}
            loading={selectedDetail ? regeneratingId === selectedDetail.id : false}
            onClick={() => selectedDetail && void handleRegenerate(selectedDetail)}
          >
            {regeneratingId === selectedDetail?.id ? t('regenerating') : t('regenerate')}
          </Button>,
          <Button key="copy" type="primary" onClick={() => selectedDetail && void copyGeneratedContent(toGeneratedCopyContent(selectedDetail))}>
            {t('copy')}
          </Button>,
          <Button key="close" onClick={() => setDetailOpen(false)}>
            {isEn ? 'Close' : '关闭'}
          </Button>,
        ]}
        width={760}
      >
        {selectedDetail ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            {selectedDetail.images.length > 0 ? (
              <Image.PreviewGroup>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 88px)', gap: 8}}>
                  {selectedDetail.images.map((image) => (
                    <Image
                      key={image.id}
                      src={image.url}
                      alt={selectedDetail.title}
                      width={88}
                      height={88}
                      style={{objectFit: 'cover', borderRadius: 8}}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : null}
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              <Tag color="blue">{getLocalizedTopic(selectedDetail.topicType ?? selectedDetail.topic)}</Tag>
              <Tag>{t('tableHeadDate')} {formatDetailDate(selectedDetail, isEn)}</Tag>
              {selectedDetail.dayCount ? <Tag>{isEn ? 'Day' : '第'} {selectedDetail.dayCount}</Tag> : null}
              <Tag>{selectedDetail.model}</Tag>
            </div>
            <div style={{whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#334155'}}>
              {selectedDetail.content}
            </div>
            {selectedDetail.tags.length > 0 ? (
              <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                {selectedDetail.tags.map((tag) => <Tag key={tag} color="blue">{formatTagText(tag)}</Tag>)}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function getTopicColor(topic: string) {
  switch (topic) {
    case 'swimming':
      return '#2563eb';
    case 'study':
      return '#ea580c';
    case 'running':
      return '#059669';
    case 'daily':
      return '#7c3aed';
    default:
      return '#64748b';
  }
}

function toGeneratedCopyContent(record: HistoryItem | HistoryDetail) {
  return {
    title: record.title,
    content: record.content ?? record.contentPreview ?? record.preview ?? '',
    tags: record.tags,
    coverText: 'coverText' in record ? record.coverText : null,
  };
}

function formatDetailDate(detail: HistoryDetail, isEn: boolean) {
  const date = new Date(detail.checkinDate);
  if (Number.isNaN(date.getTime())) {
    return detail.date;
  }

  if (isEn) {
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMonthlySummary(
  stats: HistoryStats,
  topTopic: string | undefined,
  getLocalizedTopic: (type: string) => string,
  isEn: boolean
) {
  if (stats.total === 0) {
    return isEn
      ? 'No history yet. Create the first check-in to build your content archive.'
      : '还没有历史记录，先创建一次打卡，就能开始沉淀内容库。';
  }

  const topicText = topTopic ? getLocalizedTopic(topTopic) : (isEn ? 'Daily' : '日常');
  if (isEn) {
    return `You have ${stats.total} records so far, ${stats.monthly} added this month. ${topicText} is your most frequent topic.`;
  }

  return `你目前累计 ${stats.total} 条记录，本月新增 ${stats.monthly} 条，最常记录的是「${topicText}」。`;
}
