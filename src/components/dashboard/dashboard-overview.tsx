'use client';

import {
  ArrowRightOutlined,
  CalendarOutlined,
  PlusOutlined,
  RiseOutlined,
  StarOutlined,
  SyncOutlined
} from '@ant-design/icons';
import {Alert, App, Button, Card, Col, Row, Tag, Typography} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useState} from 'react';

import {useAuth} from '@/hooks/use-auth';
import {useRouter} from '@/i18n/navigation';

const {Title, Paragraph} = Typography;

interface DashboardStats {
  streakDays: number;
  monthlyCheckins: number;
  generatedCount: number;
  totalGenerated?: number;
  currentTopic: string;
  currentTopicDayCount: number | null;
}

interface DashboardRecentPost {
  id: string;
  topic: string;
  topicType?: string;
  dayCount: number | null;
  title: string;
  contentPreview?: string;
  tags: string[];
  date: string;
  time: string;
  coverImage?: string | null;
}

interface DashboardWeekDay {
  date: string;
  dayNumber: number;
  checked: boolean;
  isToday: boolean;
}

interface DashboardUsage {
  monthlyCalls: number;
  usageLimit: number;
  usagePercent: number;
  totalTokens: number;
  provider: string;
  model: string;
  estimatedCostCny: number;
}

interface DashboardApiData {
  today: {
    date: string;
    displayDate: string;
  };
  stats: DashboardStats;
  recentPosts: DashboardRecentPost[];
  weekly: {
    startDate: string;
    endDate: string;
    days: DashboardWeekDay[];
  };
  usage: DashboardUsage;
  degradedSections?: string[];
}

const TOPIC_STYLES: Record<string, {color: string; background: string}> = {
  swimming: {color: '#2563eb', background: '#eff6ff'},
  study: {color: '#ea580c', background: '#fff7ed'},
  running: {color: '#059669', background: '#ecfdf5'},
  daily: {color: '#7c3aed', background: '#f5f3ff'},
};

export function DashboardOverview() {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const isEn = locale === 'en';
  const router = useRouter();
  const {message} = App.useApp();
  const {isAuthenticated, status} = useAuth();
  const [data, setData] = useState<DashboardApiData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    async function loadDashboard() {
      setLoadError(false);
      try {
        const response = await fetch(`/api/dashboard?locale=${encodeURIComponent(locale)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load dashboard: ${response.status}`);
        }

        const payload = await response.json() as {data: DashboardApiData};
        setData(payload.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setLoadError(true);
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, [isAuthenticated, locale, reloadKey, status]);

  const stats = data?.stats ?? {
    streakDays: 0,
    monthlyCheckins: 0,
    generatedCount: 0,
    currentTopic: 'daily',
    currentTopicDayCount: null,
  };
  const recentPosts = data?.recentPosts ?? [];
  const weekDays = data?.weekly.days ?? [];
  const usage = data?.usage ?? {
    monthlyCalls: 0,
    usageLimit: 100,
    usagePercent: 0,
    totalTokens: 0,
    provider: 'openai',
    model: 'gpt-4o-mini',
    estimatedCostCny: 0,
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(t('copied'));
    } catch {
      message.error(isEn ? 'Failed to copy' : '复制失败');
    }
  };

  const weeklyLabel = formatWeekRange(weekDays, locale);
  const usageDetail = isEn
    ? `${formatTokenCount(usage.totalTokens)} tokens used · Est. cost RMB ${usage.estimatedCostCny.toFixed(2)}`
    : `已使用 ${formatTokenCount(usage.totalTokens)} tokens · 预计成本 ¥${usage.estimatedCostCny.toFixed(2)}`;
  const formattedDate = data?.today?.displayDate ?? formatDashboardDate(new Date(), isEn);

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
      {loadError ? (
        <Alert
          type="error"
          showIcon
          title={isEn ? 'The data connection is unstable' : '数据连接出现波动'}
          description={isEn ? 'The dashboard could not be loaded. Please try again.' : '工作台数据暂时无法加载，请稍后重试。'}
          action={<Button size="small" onClick={() => setReloadKey((value) => value + 1)}>{isEn ? 'Retry' : '重新加载'}</Button>}
        />
      ) : null}
      {data?.degradedSections?.length ? (
        <Alert
          type="warning"
          showIcon
          title={isEn ? 'Some statistics are temporarily unavailable' : '部分统计暂时不可用'}
          description={isEn ? 'Core content remains available. Retry later to refresh all statistics.' : '核心内容仍可使用，稍后重新加载可恢复完整统计。'}
          action={<Button size="small" onClick={() => setReloadKey((value) => value + 1)}>{isEn ? 'Refresh' : '刷新'}</Button>}
        />
      ) : null}
      <Card className="dashboard-hero" styles={{body: {padding: 28}}}>
        <Row align="middle" justify="space-between" gutter={[20, 20]}>
          <Col xs={24} md={18}>
            <div className="dashboard-eyebrow">{formattedDate || t('eyebrow')}</div>
            <Title level={2} style={{margin: '6px 0 7px', fontSize: 26, letterSpacing: '-0.02em'}}>
              {t('welcome')}
            </Title>
            <Paragraph type="secondary" style={{marginBottom: 0, fontSize: 14}}>
              {t('description')}
            </Paragraph>
          </Col>
          <Col xs={24} md={6} style={{textAlign: 'right'}}>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => router.push('/create')}
              style={{
                borderRadius: 11,
                fontWeight: 700,
                height: 44,
                boxShadow: '0 7px 14px rgba(37,99,235,0.3)',
                border: 'none',
                backgroundColor: '#2563eb'
              }}
            >
              {t('createAction')}
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-stat-card" styles={{body: {padding: 20}}}>
            <div className="dashboard-stat-top">
              <span>{t('streak')}</span>
              <span className="dashboard-stat-icon"><RiseOutlined /></span>
            </div>
            <div className="dashboard-stat-value">
              {stats.streakDays} <small>{t('dayUnit')}</small>
            </div>
            <div className="dashboard-stat-delta">
              {stats.currentTopicDayCount ? `${t('dayLabel')} ${stats.currentTopicDayCount}` : t('streakDelta')}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-stat-card" styles={{body: {padding: 20}}}>
            <div className="dashboard-stat-top">
              <span>{t('monthly')}</span>
              <span className="dashboard-stat-icon" style={{background: '#fff7ed', color: '#ea580c'}}><CalendarOutlined /></span>
            </div>
            <div className="dashboard-stat-value">
              {stats.monthlyCheckins} <small>{t('timeUnit')}</small>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-stat-card" styles={{body: {padding: 20}}}>
            <div className="dashboard-stat-top">
              <span>{t('generated')}</span>
              <span className="dashboard-stat-icon" style={{background: '#faf5ff', color: '#8b5cf6'}}><StarOutlined /></span>
            </div>
            <div className="dashboard-stat-value">
              {stats.generatedCount} <small>{t('postUnit')}</small>
            </div>
            <div className="dashboard-stat-delta" style={{color: '#8b5cf6'}}>
              {isEn ? 'Generated this month' : '本月生成'}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-stat-card" styles={{body: {padding: 20}}}>
            <div className="dashboard-stat-top">
              <span>{t('topic')}</span>
              <span className="dashboard-stat-icon" style={{background: '#ecfdf5', color: '#059669'}}><SyncOutlined /></span>
            </div>
            <div className="dashboard-stat-value">
              {formatTopicLabel(stats.currentTopic, isEn)}
            </div>
            <div className="dashboard-stat-delta" style={{color: '#059669'}}>
              {stats.currentTopicDayCount ? `${t('dayLabel')} ${stats.currentTopicDayCount} · ${isEn ? 'In progress' : '持续进行中'}` : t('topicDelta')}
            </div>
          </Card>
        </Col>
      </Row>

      <div className="dashboard-content-layout">
        <Card
          className="dashboard-card"
          title={t('recent')}
          extra={
            <Button
              type="link"
              onClick={() => router.push('/history')}
              icon={<ArrowRightOutlined />}
              iconPlacement="end"
              style={{fontWeight: 650, padding: 0, color: '#2563eb'}}
            >
              {t('viewAll')}
            </Button>
          }
        >
          <div className="dashboard-records-list">
            {recentPosts.length === 0 ? (
              <div style={{color: '#94a3b8', fontSize: 13}}>{t('recentHint')}</div>
            ) : recentPosts.map((post) => {
              const topicKey = post.topicType ?? post.topic;
              const topicStyle = TOPIC_STYLES[topicKey] ?? TOPIC_STYLES.daily;
              return (
                <div key={post.id} className="dashboard-record-item">
                  <div
                    className="dashboard-record-cover"
                    style={post.coverImage
                      ? {
                          backgroundImage: `url(${post.coverImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          width: 64,
                        }
                      : {
                          background: `linear-gradient(145deg, ${topicStyle.background}, #dbeafe)`,
                          width: 64,
                        }}
                  />
                  <div style={{flex: 1, minWidth: 0, paddingRight: 8}}>
                    <h4 className="dashboard-record-title" style={{textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}}>
                      {post.title}
                    </h4>
                    <div className="dashboard-record-meta">
                      <span className="dashboard-record-tag" style={{background: topicStyle.background, color: topicStyle.color}}>
                        {formatTopicLabel(topicKey, isEn)}
                      </span>
                      <span>{formatRecordTime(post, isEn)}</span>
                      {post.dayCount ? <span>· {t('dayLabel')} {post.dayCount}</span> : null}
                    </div>
                  </div>
                  <Button
                    className="dashboard-record-copy-btn"
                    onClick={() => handleCopy(post.contentPreview ?? '')}
                  >
                    {t('copy')}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
          <Card
            className="dashboard-card"
            title={t('weeklyOverview')}
            extra={<span style={{color: '#94a3b8', fontSize: 13, fontWeight: 600}}>{weeklyLabel}</span>}
          >
            <div className="dashboard-week-grid">
              <span className="dashboard-day-name">{t('mon')}</span>
              <span className="dashboard-day-name">{t('tue')}</span>
              <span className="dashboard-day-name">{t('wed')}</span>
              <span className="dashboard-day-name">{t('thu')}</span>
              <span className="dashboard-day-name">{t('fri')}</span>
              <span className="dashboard-day-name">{t('sat')}</span>
              <span className="dashboard-day-name">{t('sun')}</span>

              {weekDays.map((day) => (
                <span
                  key={day.date}
                  className={`dashboard-day-cell${day.checked ? ' done' : ''}${day.isToday ? ' today' : ''}`}
                >
                  {day.dayNumber}
                </span>
              ))}
            </div>
          </Card>

          <Card
            className="dashboard-card"
            title={t('aiUsage')}
            extra={<Tag color="purple" style={{borderRadius: 6, fontWeight: 600}}>{usage.model}</Tag>}
          >
            <div className="dashboard-usage-container">
              <div className="dashboard-usage-row">
                <span>{t('monthlyCalls')}</span>
                <b>{usage.monthlyCalls} / {usage.usageLimit}</b>
              </div>
              <div className="dashboard-progress-bar">
                <span className="dashboard-progress-fill" style={{width: `${usage.usagePercent}%`}} />
              </div>
              <div className="dashboard-usage-tiny">{usageDetail}</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatTopicLabel(topic: string, isEn: boolean) {
  switch (topic) {
    case 'swimming':
      return isEn ? 'Swimming' : '游泳';
    case 'running':
      return isEn ? 'Running' : '跑步';
    case 'study':
      return isEn ? 'Study' : '学习';
    default:
      return isEn ? 'Daily' : '日常';
  }
}

function formatRecordTime(post: DashboardRecentPost, isEn: boolean) {
  if (isEn) {
    return `${post.date} ${post.time}`;
  }
  return `${post.date.slice(5).replace('-', '/')} ${post.time}`;
}

function formatWeekRange(weekDays: DashboardWeekDay[], locale: string) {
  if (weekDays.length === 0) {
    return locale === 'en' ? 'This week' : '本周';
  }

  const first = new Date(weekDays[0].date);
  const last = new Date(weekDays[weekDays.length - 1].date);
  if (locale === 'en') {
    return `${first.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${last.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`;
  }

  return `${first.getMonth() + 1} 月 ${first.getDate()} 日 - ${last.getMonth() + 1} 月 ${last.getDate()} 日`;
}

function formatDashboardDate(date: Date, isEn: boolean) {
  if (isEn) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const day = parts.find((part) => part.type === 'day')?.value ?? '';

    return `${weekday.toUpperCase()} · ${month.toUpperCase()} ${day}`;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekday = new Intl.DateTimeFormat('zh-CN', {weekday: 'long'}).format(date);

  return `${month}${day}日${weekday}`;
}

function formatTokenCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}
