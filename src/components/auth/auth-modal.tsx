'use client';

import {LockOutlined, MailOutlined, UserOutlined} from '@ant-design/icons';
import {Alert, Button, Form, Input, Modal, Typography, message} from 'antd';
import {useTranslations} from 'next-intl';
import {useEffect, useState} from 'react';

import {useAuth} from '@/hooks/use-auth';

const {Title, Text} = Typography;

// ── Form types ──────────────────────────────────────────────────────────────

interface LoginFields {
  email: string;
  password: string;
}

interface RegisterFields {
  name?: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export function AuthModal() {
  const t = useTranslations('Auth');
  const {
    modalOpen,
    modalMode,
    registeredEmail,
    closeAuthModal,
    setModalMode,
    login,
    register,
  } = useAuth();

  const [loginForm] = Form.useForm<LoginFields>();
  const [registerForm] = Form.useForm<RegisterFields>();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const showSuccess = modalMode === 'login' && Boolean(registeredEmail);

  // When switching back to login after a successful registration, pre-fill email
  useEffect(() => {
    if (modalMode === 'login' && registeredEmail) {
      loginForm.setFieldsValue({email: registeredEmail});
    }
  }, [modalMode, registeredEmail, loginForm]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleLogin = async (values: LoginFields) => {
    setLoading(true);
    setErrorMsg('');
    document.body.style.cursor = 'wait';
    try {
      await login(values.email.trim().toLowerCase(), values.password);
      message.success(t('loginSuccess'));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t('loginFailed'));
    } finally {
      setLoading(false);
      document.body.style.cursor = 'default';
    }
  };

  const handleRegister = async (values: RegisterFields) => {
    setLoading(true);
    setErrorMsg('');
    document.body.style.cursor = 'wait';
    try {
      await register(
        values.email.trim().toLowerCase(),
        values.password,
        values.name?.trim()
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t('registerFailed'));
    } finally {
      setLoading(false);
      document.body.style.cursor = 'default';
    }
  };

  const switchToRegister = () => {
    setErrorMsg('');
    setModalMode('register');
    registerForm.resetFields();
  };

  const switchToLogin = () => {
    setErrorMsg('');
    setModalMode('login');
    registerForm.resetFields();
  };

  const handleClose = () => {
    loginForm.resetFields();
    registerForm.resetFields();
    setErrorMsg('');
    setLoading(false);
    document.body.style.cursor = '';
    closeAuthModal();
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Modal
      open={modalOpen}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
      width={450}
      centered
      className="auth-modal-wrapper"
      styles={{
        body: {padding: 0},
        mask: {backdropFilter: 'blur(10px)', background: 'rgba(15,23,42,0.25)'},
      }}
    >
      {/* Logo */}
      <div className="auth-modal-logo">
        <span className="app-logo-mark" style={{width: 32, height: 32, borderRadius: 9, fontSize: 16}}>
          ✦
        </span>
        <span className="auth-modal-logo-text">AI Check-in</span>
      </div>

      {/* Success alert after registration */}
      {showSuccess && (
        <Alert
          type="success"
          message={t('registerSuccess')}
          showIcon
          style={{marginBottom: 16, borderRadius: 10}}
        />
      )}

      {/* Error alert */}
      {errorMsg && (
        <Alert
          type="error"
          message={errorMsg}
          showIcon
          closable
          onClose={() => setErrorMsg('')}
          style={{marginBottom: 16, borderRadius: 10}}
        />
      )}

      {/* ── Login Form ─────────────────────────────────────────────────── */}
      {modalMode === 'login' && (
        <div className="auth-form-container">
          <Title level={3} style={{marginBottom: 4}}>
            {t('loginTitle')}
          </Title>
          <Text type="secondary" style={{display: 'block', marginBottom: 24}}>
            {t('loginSubtitle')}
          </Text>

          <Form
            form={loginForm}
            layout="vertical"
            requiredMark={false}
            onFinish={handleLogin}
            size="large"
          >
            <Form.Item
              name="email"
              label={t('emailLabel')}
              rules={[
                {required: true, message: t('emailRequired')},
                {type: 'email', message: t('emailInvalid')},
              ]}
            >
              <Input
                prefix={<MailOutlined style={{color: '#9ca3af'}} />}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('passwordLabel')}
              rules={[{required: true, message: t('passwordRequired')}]}
            >
              <Input.Password
                prefix={<LockOutlined style={{color: '#9ca3af'}} />}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{marginBottom: 0, marginTop: 8}}>
              <Button type="primary" htmlType="submit" block loading={loading} className="auth-submit-btn">
                {t('loginBtn')}
              </Button>
            </Form.Item>
          </Form>

          <div className="auth-switch-link">
            {t('noAccount')}
            <a onClick={switchToRegister}>{t('registerNow')}</a>
          </div>
        </div>
      )}

      {/* ── Register Form ──────────────────────────────────────────────── */}
      {modalMode === 'register' && (
        <div className="auth-form-container">
          <Title level={3} style={{marginBottom: 4}}>
            {t('registerTitle')}
          </Title>
          <Text type="secondary" style={{display: 'block', marginBottom: 24}}>
            {t('registerSubtitle')}
          </Text>

          <Form
            form={registerForm}
            layout="vertical"
            requiredMark={false}
            onFinish={handleRegister}
            size="large"
          >
            <Form.Item name="name" label={t('nicknameLabel')}>
              <Input
                prefix={<UserOutlined style={{color: '#9ca3af'}} />}
                placeholder={t('nicknamePlaceholder')}
                autoComplete="name"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={t('emailLabel')}
              rules={[
                {required: true, message: t('emailRequired')},
                {type: 'email', message: t('emailInvalid')},
              ]}
            >
              <Input
                prefix={<MailOutlined style={{color: '#9ca3af'}} />}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('passwordLabel')}
              rules={[
                {required: true, message: t('passwordRequired')},
                {min: 8, message: t('passwordMin')},
                {max: 128, message: t('passwordMax')},
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{color: '#9ca3af'}} />}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={t('confirmPasswordLabel')}
              dependencies={['password']}
              rules={[
                {required: true, message: t('confirmPasswordRequired')},
                ({getFieldValue}) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('passwordMismatch')));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{color: '#9ca3af'}} />}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item style={{marginBottom: 0, marginTop: 8}}>
              <Button type="primary" htmlType="submit" block loading={loading} className="auth-submit-btn">
                {t('registerBtn')}
              </Button>
            </Form.Item>
          </Form>

          <div className="auth-switch-link">
            {t('hasAccount')}
            <a onClick={switchToLogin}>{t('backToLogin')}</a>
          </div>
        </div>
      )}
    </Modal>
  );
}
