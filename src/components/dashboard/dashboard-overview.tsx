'use client';

import {
  ArrowRightOutlined,
  CalendarOutlined,
  PlusOutlined,
  RiseOutlined,
  StarOutlined,
  SyncOutlined
} from '@ant-design/icons';
import {App, Button, Card, Col, Row, Tag, Typography} from 'antd';
import {useTranslations} from 'next-intl';

import {useRouter} from '@/i18n/navigation';

const {Title, Paragraph} = Typography;

export function DashboardOverview() {
  const t = useTranslations('Dashboard');
  const router = useRouter();
  const {message} = App.useApp();
  const formattedDate = (() => {
    const now = new Date();
    // Format date in current locale if possible, or fallback to standard format matching the UI sketch: "SUNDAY · JUL 05"
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: '2-digit' };
      const formatted = now.toLocaleDateString(undefined, options).toUpperCase().replace(',', ' ·');
      return formatted;
    } catch {
      return 'TODAY';
    }
  })();

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(t('copied'));
    } catch {
      message.error('Failed to copy');
    }
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
      {/* Hero Section */}
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

      {/* Stats Row */}
      <Row gutter={[16, 16]}>
        {/* Streak */}
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-stat-card" styles={{body: {padding: 20}}}>
            <div className="dashboard-stat-top">
              <span>{t('streak')}</span>
              <span className="dashboard-stat-icon"><RiseOutlined /></span>
            </div>
            <div className="dashboard-stat-value">
              12 <small>{t('dayUnit')}</small>
            </div>
            <div className="dashboard-stat-delta">
              {t('streakDelta')}
            </div>
          </Card>
        </Col>

        {/* Monthly */}
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-stat-card" styles={{body: {padding: 20}}}>
            <div className="dashboard-stat-top">
              <span>{t('monthly')}</span>
              <span className="dashboard-stat-icon" style={{background: '#fff7ed', color: '#ea580c'}}><CalendarOutlined /></span>
            </div>
            <div className="dashboard-stat-value">
              18 <small>{t('timeUnit')}</small>
            </div>
            <div className="dashboard-stat-delta" style={{color: '#ea580c'}}>
              {t('monthlyDelta')}
            </div>
          </Card>
        </Col>

        {/* Total Generated */}
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-stat-card" styles={{body: {padding: 20}}}>
            <div className="dashboard-stat-top">
              <span>{t('generated')}</span>
              <span className="dashboard-stat-icon" style={{background: '#faf5ff', color: '#8b5cf6'}}><StarOutlined /></span>
            </div>
            <div className="dashboard-stat-value">
              36 <small>{t('postUnit')}</small>
            </div>
            <div className="dashboard-stat-delta" style={{color: '#8b5cf6'}}>
              {t('generatedDelta')}
            </div>
          </Card>
        </Col>

        {/* Current Topic */}
        <Col xs={24} sm={12} xl={6}>
          <Card className="dashboard-stat-card" styles={{body: {padding: 20}}}>
            <div className="dashboard-stat-top">
              <span>{t('topic')}</span>
              <span className="dashboard-stat-icon" style={{background: '#ecfdf5', color: '#059669'}}><SyncOutlined /></span>
            </div>
            <div className="dashboard-stat-value">
              {t('topicValue')}
            </div>
            <div className="dashboard-stat-delta" style={{color: '#059669'}}>
              {t('topicDelta')}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Two-column content layout */}
      <div className="dashboard-content-layout">
        {/* Left Column: Recent content list */}
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
            {/* Record Item 1 */}
            <div className="dashboard-record-item">
              <div
                className="dashboard-record-cover"
                style={{
                  background: 'linear-gradient(145deg, #93c5fd, #c4b5fd)',
                  width: 64
                }}
              />
              <div style={{flex: 1, minWidth: 0, paddingRight: 8}}>
                <h4 className="dashboard-record-title" style={{textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}}>
                  {t('record1Title')}
                </h4>
                <div className="dashboard-record-meta">
                  <span
                    className="dashboard-record-tag"
                    style={{background: '#eff6ff', color: '#2563eb'}}
                  >
                    {t('swimmingTag')}
                  </span>
                  <span>{t('time1')}</span>
                  <span>· {t('dayLabel')} 12</span>
                </div>
              </div>
              <Button
                className="dashboard-record-copy-btn"
                onClick={() => handleCopy(t('record1Content'))}
              >
                {t('copy')}
              </Button>
            </div>

            {/* Record Item 2 */}
            <div className="dashboard-record-item">
              <div
                className="dashboard-record-cover"
                style={{
                  background: 'linear-gradient(145deg, #fdba74, #fda4af)',
                  width: 64
                }}
              />
              <div style={{flex: 1, minWidth: 0, paddingRight: 8}}>
                <h4 className="dashboard-record-title" style={{textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}}>
                  {t('record2Title')}
                </h4>
                <div className="dashboard-record-meta">
                  <span
                    className="dashboard-record-tag"
                    style={{background: '#fff7ed', color: '#ea580c'}}
                  >
                    {t('studyTag')}
                  </span>
                  <span>{t('time2')}</span>
                  <span>· {t('dayLabel')} 08</span>
                </div>
              </div>
              <Button
                className="dashboard-record-copy-btn"
                onClick={() => handleCopy(t('record2Content'))}
              >
                {t('copy')}
              </Button>
            </div>

            {/* Record Item 3 */}
            <div className="dashboard-record-item">
              <div
                className="dashboard-record-cover"
                style={{
                  background: 'linear-gradient(145deg, #86efac, #67e8f9)',
                  width: 64
                }}
              />
              <div style={{flex: 1, minWidth: 0, paddingRight: 8}}>
                <h4 className="dashboard-record-title" style={{textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}}>
                  {t('record3Title')}
                </h4>
                <div className="dashboard-record-meta">
                  <span
                    className="dashboard-record-tag"
                    style={{background: '#ecfdf5', color: '#059669'}}
                  >
                    {t('runningTag')}
                  </span>
                  <span>{t('time3')}</span>
                  <span>· {t('dayLabel')} 05</span>
                </div>
              </div>
              <Button
                className="dashboard-record-copy-btn"
                onClick={() => handleCopy(t('record3Content'))}
              >
                {t('copy')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Right Column: Weekly calendar and AI Usage */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
          {/* Weekly Overview */}
          <Card
            className="dashboard-card"
            title={t('weeklyOverview')}
            extra={<span style={{color: '#94a3b8', fontSize: 13, fontWeight: 600}}>{t('currentMonth')}</span>}
          >
            <div className="dashboard-week-grid">
              <span className="dashboard-day-name">{t('mon')}</span>
              <span className="dashboard-day-name">{t('tue')}</span>
              <span className="dashboard-day-name">{t('wed')}</span>
              <span className="dashboard-day-name">{t('thu')}</span>
              <span className="dashboard-day-name">{t('fri')}</span>
              <span className="dashboard-day-name">{t('sat')}</span>
              <span className="dashboard-day-name">{t('sun')}</span>

              <span className="dashboard-day-cell done">29</span>
              <span className="dashboard-day-cell done">30</span>
              <span className="dashboard-day-cell done">1</span>
              <span className="dashboard-day-cell done">2</span>
              <span className="dashboard-day-cell done">3</span>
              <span className="dashboard-day-cell done">4</span>
              <span className="dashboard-day-cell today">5</span>
            </div>
          </Card>

          {/* AI Usage stats */}
          <Card
            className="dashboard-card"
            title={t('aiUsage')}
            extra={<Tag color="purple" style={{borderRadius: 6, fontWeight: 600}}>GPT-4o mini</Tag>}
          >
            <div className="dashboard-usage-container">
              <div className="dashboard-usage-row">
                <span>{t('monthlyCalls')}</span>
                <b>68 / 100</b>
              </div>
              <div className="dashboard-progress-bar">
                <span className="dashboard-progress-fill" style={{width: '68%'}} />
              </div>
              <div className="dashboard-usage-tiny">{t('costDetail')}</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

