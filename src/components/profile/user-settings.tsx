'use client';

import {
  App,
  Button,
  Card,
  Input,
  Select,
  Space,
  Typography
} from 'antd';
import {SettingOutlined} from '@ant-design/icons';
import {useLocale, useTranslations} from 'next-intl';
import {useState} from 'react';

import {GuestEmptyState} from '@/components/auth/guest-empty-state';
import {useAuth} from '@/hooks/use-auth';

const {Title, Paragraph, Text} = Typography;
const {TextArea} = Input;

export function UserSettings() {
  const t = useTranslations('Profile');
  const tPrompts = useTranslations('Prompts');
  const locale = useLocale();
  const {message} = App.useApp();
  const isEn = locale === 'en';
  const {isAuthenticated, status} = useAuth();

  // Form Initial States
  const [nickname, setNickname] = useState(isEn ? 'Regular Coder' : '普通程序员');
  const [persona, setPersona] = useState(
    isEn
      ? 'A life restart log of an ordinary programmer. Swim after work / run occasionally / slack off occasionally. No grand ambitions, just recording daily steps.'
      : '一个普通程序员的生活重启记录。下班去游泳，偶尔跑步，偶尔摆烂。不励志，只记录。'
  );
  const [defaultTopic, setDefaultTopic] = useState('swimming');
  const [defaultStyle, setDefaultStyle] = useState('natural');
  const [currentModel, setCurrentModel] = useState('gpt-4o-mini');
  const [outputLang, setOutputLang] = useState(isEn ? 'en' : 'zh-CN');
  const [storageMethod, setStorageMethod] = useState('cloudflare-r2');
  const [storageRegion, setStorageRegion] = useState('ap-east');

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <GuestEmptyState
        icon={<SettingOutlined />}
        titleKey="guest_profileTitle"
        descKey="guest_profileDesc"
      />
    );
  }

  const handleSave = () => {
    message.success(isEn ? 'Settings saved successfully!' : '所有设置已保存成功！');
  };

  const handleCancel = () => {
    message.info(isEn ? 'Changes discarded' : '已取消修改');
  };

  const handleLogout = () => {
    message.warning(isEn ? 'Logged out successfully!' : '已成功退出登录！');
  };

  const handleHelp = () => {
    message.info(isEn ? 'Loading help center...' : '正在打开帮助中心...');
  };

  return (
    <div style={{paddingBottom: 24}}>
      {/* ── PAGE HEADER ── */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 10}}>
        <div>
          <Title level={3} style={{margin: 0}}>{t('title')}</Title>
          <Text type="secondary" style={{fontSize: 13}}>{t('subtitle')}</Text>
        </div>
        <Button onClick={handleHelp} style={{borderRadius: 10, fontWeight: 600}}>
          {t('helpCenter')}
        </Button>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="profile-grid">
        {/* Column 1: Info Sidebar */}
        <aside className="profile-card">
          <div className="profile-intro-section">
            <div className="profile-big-avatar">GY</div>
            <div className="profile-online-badge"></div>
            <h2>{nickname}</h2>
            <p>user@example.com</p>
            <Button
              className="profile-edit-btn"
              onClick={() => message.info(isEn ? 'Edit profile avatar clicked' : '编辑头像与基本资料')}
            >
              {t('editProfile')}
            </Button>
          </div>
          <div className="profile-account-list">
            <div className="profile-account-row">
              <span>{t('accType')}</span>
              <b>{t('accTypeVal')}</b>
            </div>
            <div className="profile-account-row">
              <span>{t('joinTime')}</span>
              <b>{t('joinTimeVal')}</b>
            </div>
            <div className="profile-account-row">
              <span>{t('userId')}</span>
              <b>usr_7f2a</b>
            </div>
          </div>
        </aside>

          {/* Column 2: Form Settings */}
          <section className="profile-settings-group">
            {/* Section 1: Account Position */}
            <div className="profile-card profile-settings-section">
              <div className="profile-section-title">
                <span className="profile-section-icon">◎</span>
                <div>
                  <h2>{t('positionTitle')}</h2>
                  <p>{t('positionDesc')}</p>
                </div>
              </div>

              <div className="profile-field">
                <label>{t('nickname')}</label>
                <Input
                  className="profile-control-input"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label>{t('persona')}</label>
                <TextArea
                  className="profile-control-textarea"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                />
              </div>

              <div className="profile-two-columns">
                <div className="profile-field">
                  <label>{t('defaultTopic')}</label>
                  <Select
                    className="profile-control-input"
                    value={defaultTopic}
                    onChange={setDefaultTopic}
                    options={[
                      {value: 'swimming', label: tPrompts('swimming')},
                      {value: 'running', label: tPrompts('running')},
                      {value: 'study', label: tPrompts('study')},
                      {value: 'daily', label: tPrompts('daily')}
                    ]}
                  />
                </div>
                <div className="profile-field">
                  <label>{t('defaultStyle')}</label>
                  <Select
                    className="profile-control-input"
                    value={defaultStyle}
                    onChange={setDefaultStyle}
                    options={[
                      {value: 'natural', label: tPrompts('toneNatural')},
                      {value: 'energetic', label: tPrompts('toneEnergetic')},
                      {value: 'simple', label: tPrompts('toneSimple')},
                      {value: 'warm', label: tPrompts('toneWarm')}
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: AI Provider */}
            <div className="profile-card profile-settings-section">
              <div className="profile-section-title">
                <span className="profile-section-icon">✦</span>
                <div>
                  <h2>{t('aiTitle')}</h2>
                  <p>{t('aiDesc')}</p>
                </div>
              </div>

              <div className="profile-provider-box">
                <div className="profile-provider-left">
                  <span className="profile-provider-logo">AI</span>
                  <div>
                    <b>OpenAI</b>
                    <small>GPT-4o mini · Vision + Text</small>
                  </div>
                </div>
                <span className="profile-active-badge">● {t('inUse')}</span>
              </div>

              <div className="profile-two-columns" style={{marginTop: 12}}>
                <div className="profile-field">
                  <label>{t('currentModel')}</label>
                  <Select
                    className="profile-control-input"
                    value={currentModel}
                    onChange={setCurrentModel}
                    options={[
                      {value: 'gpt-4o-mini', label: 'gpt-4o-mini'},
                      {value: 'gpt-4o', label: 'gpt-4o'},
                      {value: 'claude-3-5-sonnet', label: 'claude-3-5-sonnet'}
                    ]}
                  />
                </div>
                <div className="profile-field">
                  <label>{t('outputLang')}</label>
                  <Select
                    className="profile-control-input"
                    value={outputLang}
                    onChange={setOutputLang}
                    options={[
                      {value: 'zh-CN', label: isEn ? 'Simplified Chinese' : '简体中文'},
                      {value: 'en', label: isEn ? 'English' : 'English'}
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Image Storage */}
            <div className="profile-card profile-settings-section">
              <div className="profile-section-title">
                <span className="profile-section-icon">▱</span>
                <div>
                  <h2>{t('storageTitle')}</h2>
                  <p>{t('storageDesc')}</p>
                </div>
              </div>

              <div className="profile-two-columns">
                <div className="profile-field">
                  <label>{t('storageMethod')}</label>
                  <Select
                    className="profile-control-input"
                    value={storageMethod}
                    onChange={setStorageMethod}
                    options={[
                      {value: 'cloudflare-r2', label: 'Cloudflare R2'},
                      {value: 'local', label: isEn ? 'Local Storage' : '本地存储'}
                    ]}
                  />
                </div>
                <div className="profile-field">
                  <label>{t('storageRegion')}</label>
                  <Select
                    className="profile-control-input"
                    value={storageRegion}
                    onChange={setStorageRegion}
                    options={[
                      {value: 'ap-east', label: 'Asia Pacific (Hong Kong)'},
                      {value: 'us-east', label: 'US East (N. Virginia)'},
                      {value: 'eu-west', label: 'Europe (Frankfurt)'}
                    ]}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Column 3: Usage Stats Sidebar */}
          <aside className="profile-side-panel">
            <div className="profile-card">
              <div className="profile-card-head">
                <h2>{t('statsTitle')}</h2>
                <span style={{color: '#94a3b8', fontSize: 11, fontWeight: 700}}>2026.07</span>
              </div>
              <div className="profile-metrics-list">
                <div className="profile-metric-card">
                  <div className="profile-metric-top">
                    <span>{t('aiCalls')}</span>
                    <b>68%</b>
                  </div>
                  <strong>68 / 100</strong>
                  <div className="profile-metric-bar">
                    <span style={{width: '68%'}}></span>
                  </div>
                </div>

                <div className="profile-metric-card">
                  <div className="profile-metric-top">
                    <span>{t('tokenUsage')}</span>
                    <b>42%</b>
                  </div>
                  <strong>42.6K</strong>
                  <div className="profile-metric-bar">
                    <span style={{width: '42%', background: '#8b5cf6'}}></span>
                  </div>
                </div>

                <div className="profile-metric-card">
                  <div className="profile-metric-top">
                    <span>{t('postsGenerated')}</span>
                    <b>72%</b>
                  </div>
                  <strong>{isEn ? '36 posts' : '36 篇'}</strong>
                  <div className="profile-metric-bar">
                    <span style={{width: '72%', background: '#10b981'}}></span>
                  </div>
                </div>
              </div>

              <div className="profile-cost-box">
                <small>{t('estCost')}</small>
                <strong>¥ 3.18</strong>
              </div>
            </div>

            <div className="profile-card profile-danger-card">
              <Button className="profile-logout-btn" onClick={handleLogout}>
                {t('logout')}
              </Button>
              <p>{t('logoutNotice')}</p>
            </div>
          </aside>

          {/* Save Bar */}
          <div className="profile-savebar">
            <Button className="btn" onClick={handleCancel}>
              {t('cancel')}
            </Button>
            <Button className="btn primary" onClick={handleSave}>
              {t('save')}
            </Button>
          </div>
        </div>
      </div>
  );
}
