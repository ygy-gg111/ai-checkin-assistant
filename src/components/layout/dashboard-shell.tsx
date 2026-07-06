'use client';

import {
  CalendarOutlined,
  DashboardOutlined,
  EditOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuOutlined,
  SettingOutlined,
  UserOutlined
} from '@ant-design/icons';
import {
  App as AntdApp,
  Avatar,
  Button,
  ConfigProvider,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  Space,
  Typography
} from 'antd';
import type {MenuProps} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useState} from 'react';

import {AuthModal} from '@/components/auth/auth-modal';
import {appTheme} from '@/config/theme';
import {useAuth} from '@/hooks/use-auth';
import {usePathname, useRouter} from '@/i18n/navigation';
import type {AppLocale} from '@/i18n/routing';

const {Header, Content, Sider} = Layout;

type NavKey = '/' | '/create' | '/calendar' | '/history' | '/prompt-settings' | '/profile';

export function DashboardShell({children}: {children: React.ReactNode}) {
  const t = useTranslations('Navigation');
  const tAuth = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {user, isAuthenticated, status, openAuthModal, logout} = useAuth();

  const navigationItems: MenuProps['items'] = [
    {key: '/', icon: <DashboardOutlined />, label: t('dashboard')},
    {key: '/create', icon: <EditOutlined />, label: t('create')},
    {key: '/calendar', icon: <CalendarOutlined />, label: t('calendar')},
    {key: '/history', icon: <FileTextOutlined />, label: t('history')},
    {key: '/prompt-settings', icon: <SettingOutlined />, label: t('prompts')},
    {key: '/profile', icon: <UserOutlined />, label: t('profile')}
  ];

  const selectedKey =
    navigationItems.find((item) => item && 'key' in item && item.key !== '/' && pathname.startsWith(String(item.key)))?.key ?? '/';

  const navigate: MenuProps['onClick'] = ({key}) => {
    router.push(key as NavKey);
    setDrawerOpen(false);
  };

  const localeItems: MenuProps['items'] = [
    {key: 'zh-CN', label: '简体中文'},
    {key: 'en', label: 'English'}
  ];

  const switchLocale: MenuProps['onClick'] = ({key}) => {
    router.replace(pathname, {locale: key as AppLocale});
  };

  // ── User dropdown menu (when authenticated) ─────────────────────────────

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: tAuth('userCenter'),
      onClick: () => router.push('/profile'),
    },
    {type: 'divider'},
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: tAuth('logoutButton'),
      danger: true,
      onClick: logout,
    },
  ];

  const navigation = (
    <Menu
      mode="inline"
      items={navigationItems}
      selectedKeys={[String(selectedKey)]}
      onClick={navigate}
      style={{borderInlineEnd: 0, paddingInline: 10}}
    />
  );

  return (
    <ConfigProvider theme={appTheme}>
      <AntdApp>
        <Layout className="app-shell">
          <Sider className="app-sider" theme="light" width={240}>
            <Logo />
            {navigation}
            <div className="app-side-bottom">
              <div className="app-upgrade-card">
                <b>{t('streakTitle')}</b>
                <p>{t('streakDetail')}</p>
                <div className="dashboard-progress-bar">
                  <span className="dashboard-progress-fill" style={{width: '80%'}} />
                </div>
              </div>
            </div>
          </Sider>

          <Drawer
            placement="left"
            size={280}
            title={<Logo compact />}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            styles={{body: {padding: '8px 0'}}}
          >
            {navigation}
          </Drawer>

          <Layout className="app-layout">
            <Header className="app-header">
              <Space size={12}>
                <Button
                  className="app-mobile-menu"
                  type="text"
                  icon={<MenuOutlined />}
                  aria-label="Open navigation"
                  onClick={() => setDrawerOpen(true)}
                />
                {!screens.lg && <Typography.Text strong>AI Check-in</Typography.Text>}
              </Space>

              <Space size={12}>
                {/* Language switcher */}
                <Dropdown
                  menu={{items: localeItems, selectedKeys: [locale], onClick: switchLocale}}
                  trigger={['click']}
                >
                  <Button icon={<GlobalOutlined />}>{screens.sm ? t('language') : locale.toUpperCase()}</Button>
                </Dropdown>

                {/* Auth button / User avatar */}
                {status !== 'loading' && (
                  <>
                    {isAuthenticated && user ? (
                      <Dropdown menu={{items: userMenuItems}} trigger={['click']} placement="bottomRight">
                        <Button type="text" className="auth-user-btn">
                          <Avatar
                            size={28}
                            src={user.avatar}
                            icon={!user.avatar ? <UserOutlined /> : undefined}
                            style={{
                              background: 'linear-gradient(145deg, #2563eb, #7c3aed)',
                              marginRight: 6,
                            }}
                          />
                          {screens.sm && (
                            <span className="auth-user-name">{user.name || user.email.split('@')[0]}</span>
                          )}
                        </Button>
                      </Dropdown>
                    ) : (
                      <Button
                        type="primary"
                        icon={<LoginOutlined />}
                        onClick={() => openAuthModal('login')}
                      >
                        {screens.sm ? tAuth('loginButton') : ''}
                      </Button>
                    )}
                  </>
                )}
              </Space>
            </Header>

            <Content className="app-content">
              <div className="app-content-inner">{children}</div>
            </Content>
          </Layout>
        </Layout>

        {/* Global Auth Modal */}
        <AuthModal />
      </AntdApp>
    </ConfigProvider>
  );
}

function Logo({compact = false}: {compact?: boolean}) {
  return (
    <div className="app-logo" style={compact ? {height: 40, padding: 0} : undefined}>
      <span className="app-logo-mark">✦</span>
      <span>AI Check-in</span>
    </div>
  );
}
