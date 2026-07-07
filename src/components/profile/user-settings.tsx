'use client';

import {SettingOutlined, UserOutlined} from '@ant-design/icons';
import {App, Avatar, Button, Input, Select, Typography} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useRef, useState} from 'react';

import {GuestEmptyState} from '@/components/auth/guest-empty-state';
import {useAuth} from '@/hooks/use-auth';

const {Title, Text} = Typography;
const {TextArea} = Input;

type UploadedImage = {
  url: string;
};

export function UserSettings() {
  const t = useTranslations('Profile');
  const tPrompts = useTranslations('Prompts');
  const locale = useLocale();
  const {message} = App.useApp();
  const isEn = locale === 'en';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {user, isAuthenticated, status, logout, updateUser} = useAuth();
  const defaultNickname = user?.name || user?.email.split('@')[0] || '';
  const defaultAvatar = user?.avatar || null;

  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [persona, setPersona] = useState(
    isEn
      ? 'A life restart log of an ordinary programmer. Swim after work / run occasionally / slack off occasionally. No grand ambitions, just recording daily steps.'
      : '一个普通程序员的生活重启记录。下班去游泳，偶尔跑步，偶尔摆烂。不励志，只记录。'
  );
  const [defaultTopic, setDefaultTopic] = useState('swimming');
  const [defaultStyle, setDefaultStyle] = useState('natural');
  const [currentModel, setCurrentModel] = useState('gpt-4o-mini');
  const [outputLang, setOutputLang] = useState(isEn ? 'en' : 'zh-CN');
  const [storageMethod, setStorageMethod] = useState('local');
  const [storageRegion, setStorageRegion] = useState('ap-east');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <GuestEmptyState
        icon={<SettingOutlined />}
        titleKey="guest_profileTitle"
        descKey="guest_profileDesc"
      />
    );
  }

  const nickname = nicknameDraft ?? defaultNickname;
  const avatar = avatarDraft ?? defaultAvatar;
  const displayName = nickname || user?.name || user?.email.split('@')[0] || (isEn ? 'User' : '用户');
  const avatarInitial = displayName.trim().slice(0, 1).toUpperCase();

  const handleSave = async () => {
    if (!nickname.trim()) {
      message.warning(isEn ? 'Please enter a nickname' : '请输入昵称');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: nickname.trim(),
          avatar: avatar || '',
        }),
      });
      const payload = await response.json() as {
        message?: string;
        data?: {
          id: string;
          email: string;
          name: string | null;
          avatar: string | null;
          createdAt: string;
        };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message || (isEn ? 'Failed to save profile' : '保存资料失败'));
      }

      updateUser(payload.data);
      setNicknameDraft(payload.data.name || payload.data.email.split('@')[0]);
      setAvatarDraft(payload.data.avatar);
      message.success(isEn ? 'Profile updated successfully!' : '资料保存成功！');
    } catch (error) {
      message.error(error instanceof Error ? error.message : (isEn ? 'Failed to save profile' : '保存资料失败'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!user) {
      return;
    }

    setNicknameDraft(null);
    setAvatarDraft(null);
    message.info(isEn ? 'Changes discarded' : '已取消修改');
  };

  const handleLogout = async () => {
    await logout();
    message.warning(isEn ? 'Logged out successfully!' : '已成功退出登录！');
  };

  const handleHelp = () => {
    message.info(isEn ? 'Profile editing and avatar upload are ready here.' : '这里已经支持编辑昵称和上传头像了。');
  };

  const handleAvatarSelect = async (file: File | null) => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingAvatar(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json() as {
        message?: string;
        data?: {
          images?: UploadedImage[];
        };
      };

      const nextAvatar = payload.data?.images?.[0]?.url;
      if (!response.ok || !nextAvatar) {
        throw new Error(payload.message || (isEn ? 'Avatar upload failed' : '头像上传失败'));
      }

      setAvatarDraft(nextAvatar);
      message.success(isEn ? 'Avatar uploaded successfully!' : '头像上传成功！');
    } catch (error) {
      message.error(error instanceof Error ? error.message : (isEn ? 'Avatar upload failed' : '头像上传失败'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div style={{paddingBottom: 24}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 10}}>
        <div>
          <Title level={3} style={{margin: 0}}>{t('title')}</Title>
          <Text type="secondary" style={{fontSize: 13}}>{t('subtitle')}</Text>
        </div>
        <Button onClick={handleHelp} style={{borderRadius: 10, fontWeight: 600}}>
          {t('helpCenter')}
        </Button>
      </div>

      <div className="profile-grid">
        <aside className="profile-card">
          <div className="profile-intro-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{display: 'none'}}
              onChange={(event) => {
                void handleAvatarSelect(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />
            <Avatar
              size={96}
              src={avatar || undefined}
              icon={!avatar ? <UserOutlined /> : undefined}
              style={{
                background: 'linear-gradient(145deg, #2563eb, #7c3aed)',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {!avatar ? avatarInitial : null}
            </Avatar>
            <div className="profile-online-badge"></div>
            <h2>{displayName}</h2>
            <p>{user?.email || 'user@example.com'}</p>
            <Button
              className="profile-edit-btn"
              loading={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
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
              <b>{formatJoinTime(user?.createdAt, isEn)}</b>
            </div>
            <div className="profile-account-row">
              <span>{t('userId')}</span>
              <b>{user ? user.id.slice(0, 8) : 'usr_0000'}</b>
            </div>
          </div>
        </aside>

        <section className="profile-settings-group">
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
                  onChange={(e) => setNicknameDraft(e.target.value)}
                  maxLength={100}
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
                    {value: 'daily', label: tPrompts('daily')},
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
                    {value: 'warm', label: tPrompts('toneWarm')},
                  ]}
                />
              </div>
            </div>
          </div>

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
                    {value: 'claude-3-5-sonnet', label: 'claude-3-5-sonnet'},
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
                    {value: 'en', label: 'English'},
                  ]}
                />
              </div>
            </div>
          </div>

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
                    {value: 'local', label: isEn ? 'Local Storage' : '本地存储'},
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
                    {value: 'eu-west', label: 'Europe (Frankfurt)'},
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

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
            <Button className="profile-logout-btn" onClick={() => void handleLogout()}>
              {t('logout')}
            </Button>
            <p>{t('logoutNotice')}</p>
          </div>
        </aside>

        <div className="profile-savebar">
          <Button className="btn" onClick={handleCancel}>
            {t('cancel')}
          </Button>
          <Button className="btn primary" loading={isSaving} onClick={() => void handleSave()}>
            {t('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatJoinTime(createdAt: string | undefined, isEn: boolean) {
  if (!createdAt) {
    return isEn ? 'Unknown' : '未知';
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return isEn ? 'Unknown' : '未知';
  }

  if (isEn) {
    return date.toLocaleString('en-US', {month: 'long', year: 'numeric'});
  }

  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}
