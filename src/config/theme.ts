import type {ThemeConfig} from 'antd';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorText: '#111827',
    colorTextSecondary: '#6b7280',
    colorBorder: '#e5e7eb',
    borderRadius: 12,
    borderRadiusLG: 16,
    fontFamily: 'Inter, system-ui, "PingFang SC", sans-serif'
  },
  components: {
    Layout: {bodyBg: '#f8fafc', siderBg: '#ffffff', headerBg: '#ffffff'},
    Menu: {itemBorderRadius: 10, itemHeight: 44}
  }
};
