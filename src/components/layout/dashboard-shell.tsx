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
import {useCallback, useEffect, useMemo, useState} from 'react';

import {AuthModal} from '@/components/auth/auth-modal';
import {appTheme} from '@/config/theme';
import {useAuth} from '@/hooks/use-auth';
import {Link, usePathname, useRouter} from '@/i18n/navigation';
import type {AppLocale} from '@/i18n/routing';

const {Header, Content, Sider} = Layout;
const MENU_STYLE = {borderInlineEnd: 0, paddingInline: 10};
const DEFAULT_SIDEBAR_SUMMARY = {currentStreak: 0, progressPercent: 0};

type NavKey = '/' | '/create' | '/calendar' | '/history' | '/prompt-settings' | '/profile';
const PREFETCH_NAV_KEYS: NavKey[] = ['/create', '/calendar', '/history', '/prompt-settings', '/profile'];

export function DashboardShell({children}: {children: React.ReactNode}) {
  const t = useTranslations('Navigation');
  const tAuth = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const screens = Grid.useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarSummary, setSidebarSummary] = useState({
    currentStreak: 0,
    progressPercent: 0,
  });

  const {user, isAuthenticated, status, openAuthModal, logout} = useAuth();

  useEffect(() => {
    const prefetchRouter = router as typeof router & {prefetch?: (href: NavKey) => void};
    PREFETCH_NAV_KEYS.forEach((href) => prefetchRouter.prefetch?.(href));
  }, [router]);

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    async function loadSidebarSummary() {
      try {
        const response = await fetch('/api/user/sidebar-summary', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load sidebar summary: ${response.status}`);
        }

        const payload = await response.json() as {
          data: {
            currentStreak: number;
            progressPercent: number;
          };
        };
        setSidebarSummary(payload.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setSidebarSummary({currentStreak: 0, progressPercent: 0});
      }
    }

    void loadSidebarSummary();

    return () => controller.abort();
  }, [isAuthenticated, status]);

  const visibleSidebarSummary = isAuthenticated ? sidebarSummary : DEFAULT_SIDEBAR_SUMMARY;

  const navigationItems = useMemo<NonNullable<MenuProps['items']>>(() => [
    {key: '/', icon: <DashboardOutlined />, label: <Link href="/">{t('dashboard')}</Link>},
    {key: '/create', icon: <EditOutlined />, label: <Link href="/create">{t('create')}</Link>},
    {key: '/calendar', icon: <CalendarOutlined />, label: <Link href="/calendar">{t('calendar')}</Link>},
    {key: '/history', icon: <FileTextOutlined />, label: <Link href="/history">{t('history')}</Link>},
    {key: '/prompt-settings', icon: <SettingOutlined />, label: <Link href="/prompt-settings">{t('prompts')}</Link>},
    {key: '/profile', icon: <UserOutlined />, label: <Link href="/profile">{t('profile')}</Link>}
  ], [t]);

  const selectedKey = useMemo(
    () => navigationItems.find((item) => item && 'key' in item && item.key !== '/' && pathname.startsWith(String(item.key)))?.key ?? '/',
    [navigationItems, pathname]
  );
  const selectedKeys = useMemo(() => [String(selectedKey)], [selectedKey]);

  const navigate = useCallback<NonNullable<MenuProps['onClick']>>(() => {
    setDrawerOpen(false);
  }, []);

  const localeItems = useMemo<NonNullable<MenuProps['items']>>(() => [
    {key: 'zh-CN', label: '简体中文'},
    {key: 'en', label: 'English'}
  ], []);

  const switchLocale = useCallback<NonNullable<MenuProps['onClick']>>(({key}) => {
    if (key !== locale) {
      router.replace(pathname, {locale: key as AppLocale});
    }
  }, [locale, pathname, router]);

  // ── User dropdown menu (when authenticated) ─────────────────────────────

  const userMenuItems = useMemo<NonNullable<MenuProps['items']>>(() => [
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
  ], [logout, router, tAuth]);

  const navigation = (
    <Menu
      mode="inline"
      items={navigationItems}
      selectedKeys={selectedKeys}
      onClick={navigate}
      style={MENU_STYLE}
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
                <p>{formatSidebarStreak(visibleSidebarSummary.currentStreak, locale)}</p>
                <div className="dashboard-progress-bar">
                  <span className="dashboard-progress-fill" style={{width: `${visibleSidebarSummary.progressPercent}%`}} />
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

function formatSidebarStreak(days: number, locale: string) {
  if (locale === 'en') {
    return days > 0 ? `You have recorded for ${days} days straight` : 'Start today with your first record';
  }

  return days > 0 ? `你已经连续记录 ${days} 天了` : '从今天开始记录第一天';
}

function Logo({compact = false}: {compact?: boolean}) {
  return (
    <div className="app-logo" style={compact ? {height: 40, padding: 0} : undefined}>
      <span className="app-logo-mark">✦</span>
      <span>AI Check-in</span>
    </div>
  );
}
