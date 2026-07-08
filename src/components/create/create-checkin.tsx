'use client';

import {
  PlusOutlined,
  UploadOutlined
} from '@ant-design/icons';
import {App, Button, Card, Col, Image, Input, Row, Select, Space, Typography} from 'antd';
import type {UploadFile} from 'antd';
import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useMemo, useRef, useState} from 'react';

import {useAuth} from '@/hooks/use-auth';
import {
  MAX_PROMPT_COMPLETION_TOKENS,
  MAX_PROMPT_IMAGE_URLS,
  MAX_PROMPT_INPUT_CHARS,
  MAX_PROMPT_TEMPLATE_CHARS,
} from '@/lib/prompt';

const {Title, Paragraph, Text} = Typography;
const {TextArea} = Input;

type Topic = 'swimming' | 'running' | 'study' | 'daily';
type Style = 'natural' | 'funny' | 'warm' | 'minimal';
type TopicLabelKey = 'topicSwimming' | 'topicRunning' | 'topicStudy' | 'topicDaily';
type StyleLabelKey = 'styleNatural' | 'styleFunny' | 'styleWarm' | 'styleMinimal';

interface GeneratedResult {
  title: string;
  content: string;
  tags: string[];
  coverText: string;
}

interface UploadedImage {
  url: string;
  width: number | null;
  height: number | null;
  size: number;
  mimeType: string;
  filename: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  scene: Topic;
  version: string;
  content: string;
  isActive: boolean;
}

const TOPICS: {key: Topic; labelKey: TopicLabelKey; color: string}[] = [
  {key: 'swimming', labelKey: 'topicSwimming', color: '#2563eb'},
  {key: 'running', labelKey: 'topicRunning', color: '#059669'},
  {key: 'study', labelKey: 'topicStudy', color: '#d97706'},
  {key: 'daily', labelKey: 'topicDaily', color: '#7c3aed'},
];

const STYLES: {key: Style; labelKey: StyleLabelKey}[] = [
  {key: 'natural', labelKey: 'styleNatural'},
  {key: 'funny', labelKey: 'styleFunny'},
  {key: 'warm', labelKey: 'styleWarm'},
  {key: 'minimal', labelKey: 'styleMinimal'},
];

export function CreateCheckin() {
  const t = useTranslations('Create');
  const tAuth = useTranslations('Auth');
  const locale = useLocale();
  const {message} = App.useApp();
  const {isAuthenticated, status, openAuthModal} = useAuth();
  const isEn = locale === 'en';

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState('今天练蛙泳，腿还是不怎么走水，不过感觉比昨天轻松一点。');
  const [topic, setTopic] = useState<Topic>('swimming');
  const [style, setStyle] = useState<Style>('natural');
  const [dayCount, setDayCount] = useState('12');
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState<string | undefined>();
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [aiState, setAiState] = useState<'idle' | 'ready' | 'generating' | 'done'>('ready');
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const descLength = description.length;
  const currentPromptTemplates = useMemo(
    () => promptTemplates.filter((template) => template.scene === topic),
    [promptTemplates, topic]
  );
  const selectedPromptTemplate = currentPromptTemplates.find((template) => template.id === selectedPromptTemplateId)
    ?? currentPromptTemplates[0];
  const effectivePromptTemplateId = selectedPromptTemplate?.id;
  const aiImageCount = Math.min(uploadedImages.length, MAX_PROMPT_IMAGE_URLS);

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated) {
      return;
    }

    let ignore = false;
    const loadPromptTemplates = async () => {
      setIsLoadingPrompts(true);
      try {
        const response = await fetch('/api/prompts');
        const payload = await response.json() as {
          message?: string;
          data?: PromptTemplate[];
        };

        if (!response.ok || !Array.isArray(payload.data)) {
          throw new Error(payload.message || 'Failed to load prompt templates');
        }

        if (!ignore) {
          setPromptTemplates(payload.data);
        }
      } catch (error) {
        if (!ignore) {
          message.warning(error instanceof Error ? error.message : 'Prompt templates unavailable');
        }
      } finally {
        if (!ignore) {
          setIsLoadingPrompts(false);
        }
      }
    };

    void loadPromptTemplates();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, message, status]);

  const normalizeDayCount = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return '1';
    }

    return String(parsed);
  };

  // Simulate generating
  const handleGenerate = async () => {
    if (status !== 'loading' && !isAuthenticated) {
      message.warning(tAuth('requireLogin'));
      openAuthModal('login');
      return;
    }
    if (!description.trim()) {
      message.warning(t('descRequired'));
      return;
    }
    if (uploadedImages.length === 0) {
      message.warning('请先上传至少一张打卡图片');
      return;
    }
    setIsGenerating(true);
    setAiState('generating');
    setResult(null);

    try {
      const response = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          topic,
          dayCount: Number.parseInt(dayCount, 10) || 1,
          style,
          inputText: description,
          images: uploadedImages,
          promptTemplateId: effectivePromptTemplateId,
        }),
      });
      const payload = await response.json() as {
        message?: string;
        data?: {
          result?: GeneratedResult;
        };
      };
      if (!response.ok || !payload.data?.result) {
        throw new Error(payload.message || '生成失败');
      }

      setResult(payload.data.result);
      setAiState('done');
      message.success(t('generateSuccess'));
    } catch (error) {
      setAiState('ready');
      message.error(error instanceof Error ? error.message : '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setDescription('');
    setFileList([]);
    setUploadedImages([]);
    setTopic('swimming');
    setStyle('natural');
    setDayCount('12');
    setSelectedPromptTemplateId(undefined);
    setResult(null);
    setAiState('ready');
    setActivePreviewUrl(null);
    setPreviewVisible(false);
  };

  const handleCopyAll = async () => {
    if (!result) return;
    const text = `${result.title}\n\n${result.content}\n\n${result.tags.join(' ')}`;
    try {
      await navigator.clipboard.writeText(text);
      message.success(t('copied'));
    } catch {
      message.error(t('copyFailed'));
    }
  };

  const handleRemoveImage = (uid: string) => {
    const removed = fileList.find((file) => file.uid === uid);
    const nextFileList = fileList.filter((f) => f.uid !== uid);
    setFileList(nextFileList);
    if (removed?.url) {
      setUploadedImages((prev) => prev.filter((image) => image.url !== removed.url));
      if (activePreviewUrl === removed.url) {
        setActivePreviewUrl(nextFileList[0]?.url ?? null);
      }
    }
  };

  const handleUploadFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    if (fileList.length + files.length > 9) {
      message.warning('最多支持上传 9 张图片');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    setIsUploading(true);
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
      if (!response.ok || !payload.data?.images) {
        throw new Error(payload.message || '上传失败');
      }

      const nextFiles: UploadFile[] = payload.data.images.map((image) => ({
        uid: image.url,
        name: image.filename,
        status: 'done',
        url: image.url,
      }));
      setUploadedImages((prev) => [...prev, ...payload.data!.images!]);
      setFileList((prev) => [...prev, ...nextFiles]);
      setActivePreviewUrl((current) => current ?? nextFiles[0]?.url ?? null);
      setAiState('ready');
      message.success('图片上传成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  // Cover gradient colors per index
  const coverGradients = [
    'linear-gradient(145deg, #93c5fd, #c4b5fd)',
    'linear-gradient(145deg, #bae6fd, #6ee7b7)',
    'linear-gradient(145deg, #fdba74, #fda4af)',
    'linear-gradient(145deg, #86efac, #67e8f9)',
  ];
  const previewImageUrl = activePreviewUrl ?? fileList[0]?.url ?? null;

  return (
    <>
      {/* Two-column workspace */}
      <div className="create-workspace">
        {/* ── LEFT PANEL: Input Form ── */}
        <Card className="create-panel" styles={{body: {padding: 0}}}>
          <div className="create-panel-head">
            <Title level={4} style={{margin: '0 0 3px'}}>{t('materialTitle')}</Title>
            <Text type="secondary" style={{fontSize: 12}}>{t('materialDesc')}</Text>
          </div>

          <div className="create-form">
            {/* Image Upload */}
            <div className="create-field">
              <label className="create-field-label">
                <span>{t('uploadLabel')}</span>
                <small style={{color: '#9ca3af', fontWeight: 400}}>{fileList.length} / 9</small>
              </label>
              <div className="field-limit-note">
                <span>{isEn ? 'Upload up to 9 images for the post.' : '页面最多可上传 9 张图片。'}</span>
                <span>{isEn ? `Only the first ${MAX_PROMPT_IMAGE_URLS} image links are sent into the AI prompt.` : `真正送入 AI 的只会是前 ${MAX_PROMPT_IMAGE_URLS} 张图片链接。`}</span>
              </div>
              <div
                className="create-drop-zone"
                onClick={() => {
                  if (status !== 'loading' && !isAuthenticated) {
                    message.warning(tAuth('requireLogin'));
                    openAuthModal('login');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  style={{display: 'none'}}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    void handleUploadFiles(files);
                    e.target.value = '';
                  }}
                />
                <div className="create-upload-icon">
                  <UploadOutlined style={{fontSize: 22}} />
                </div>
                <h3 style={{fontSize: 13, margin: '7px 0 1px'}}>
                  {isUploading ? '正在上传图片...' : t('dropHint')}
                </h3>
                <p style={{margin: 0, color: '#6b7280', fontSize: 11}}>{t('dropFormats')}</p>

                {fileList.length > 0 && (
                  <div className="create-thumbs" onClick={(e) => e.stopPropagation()}>
                    {fileList.map((f, idx) => (
                      <div
                        key={f.uid}
                        className={`create-thumb${previewImageUrl === f.url ? ' active' : ''}`}
                        style={f.url
                          ? {backgroundImage: `url(${f.url})`, backgroundSize: 'cover', backgroundPosition: 'center'}
                          : {background: coverGradients[idx % coverGradients.length]}}
                        onClick={() => setActivePreviewUrl(f.url ?? null)}
                      >
                        <button
                          className="create-thumb-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(f.uid);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {fileList.length < 9 && (
                      <div className="create-thumb create-thumb-add">
                        <PlusOutlined style={{fontSize: 16, color: '#94a3b8'}} />
                        <span style={{fontSize: 11, color: '#94a3b8', marginTop: 4}}>{t('addMore')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="create-field">
              <label className="create-field-label">
                <span>{t('descLabel')}</span>
                <small style={{color: descLength > 450 ? '#ef4444' : '#9ca3af', fontWeight: 400}}>
                  {descLength} / {MAX_PROMPT_INPUT_CHARS}
                </small>
              </label>
              <TextArea
                className="create-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, MAX_PROMPT_INPUT_CHARS))}
                placeholder={t('descPlaceholder')}
                rows={3}
                maxLength={MAX_PROMPT_INPUT_CHARS}
                style={{resize: 'none', borderRadius: 12, fontSize: 14}}
              />
              <div className="field-limit-note">
                <span>{isEn ? `Input cap: ${MAX_PROMPT_INPUT_CHARS} characters.` : `输入上限：${MAX_PROMPT_INPUT_CHARS} 个字符。`}</span>
                <span>{isEn ? `Model output is capped at about ${MAX_PROMPT_COMPLETION_TOKENS} tokens.` : `模型输出已限制在约 ${MAX_PROMPT_COMPLETION_TOKENS} tokens。`}</span>
              </div>
            </div>

            {/* Topic + Day Count */}
            <Row gutter={12}>
              <Col flex="1.3">
                <div className="create-field">
                  <label className="create-field-label"><span>{t('topicLabel')}</span></label>
                  <div className="create-chips">
                    {TOPICS.map(({key, labelKey, color}) => (
                      <button
                        key={key}
                        className={`create-chip${topic === key ? ' active' : ''}`}
                        style={topic === key ? {borderColor: color, background: '#eff6ff', color} : {}}
                        onClick={() => setTopic(key)}
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </Col>
              <Col flex="0.7">
                <div className="create-field">
                  <label className="create-field-label"><span>{t('dayLabel')}</span></label>
                  <Input
                    className="create-input"
                    addonBefore="Day"
                    value={dayCount}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, '');
                      setDayCount(num);
                    }}
                    onBlur={() => setDayCount((current) => normalizeDayCount(current))}
                    inputMode="numeric"
                    placeholder="1"
                    style={{borderRadius: 12}}
                  />
                </div>
              </Col>
            </Row>

            {/* Writing Style */}
            <div className="create-field">
              <label className="create-field-label"><span>{t('styleLabel')}</span></label>
              <div className="create-chips">
                {STYLES.map(({key, labelKey}) => (
                  <button
                    key={key}
                    className={`create-chip${style === key ? ' active' : ''}`}
                    onClick={() => setStyle(key)}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="create-field">
              <label className="create-field-label">
                <span>Prompt 模板</span>
                <small style={{color: '#9ca3af', fontWeight: 400}}>
                  {effectivePromptTemplateId ? '生成时生效' : '使用系统默认'}
                </small>
              </label>
              <Select
                className="create-prompt-select"
                value={effectivePromptTemplateId}
                loading={isLoadingPrompts}
                placeholder={isLoadingPrompts ? '正在加载 Prompt 模板' : '选择当前主题的 Prompt 模板'}
                onChange={setSelectedPromptTemplateId}
                options={currentPromptTemplates.map((template) => ({
                  value: template.id,
                  label: `${template.name} · v${template.version}`,
                }))}
                notFoundContent={isLoadingPrompts ? '加载中...' : '当前主题暂无可用模板'}
              />
              {selectedPromptTemplate ? (
                <div className="create-prompt-preview">
                  <div className="create-prompt-preview-title">
                    <span>当前模板预览</span>
                    <span>{selectedPromptTemplate.scene}</span>
                  </div>
                  <p>{selectedPromptTemplate.content}</p>
                  <div className="field-limit-note compact">
                    <span>{isEn ? `Template: ${selectedPromptTemplate.content.length} / ${MAX_PROMPT_TEMPLATE_CHARS}` : `模板长度：${selectedPromptTemplate.content.length} / ${MAX_PROMPT_TEMPLATE_CHARS}`}</span>
                    <span>{isEn ? `This generation will send ${aiImageCount}/${uploadedImages.length || 0} image links.` : `本次生成会送入 ${aiImageCount}/${uploadedImages.length || 0} 张图片链接。`}</span>
                  </div>
                </div>
              ) : (
                <div className="create-prompt-hint">暂无模板，使用系统默认 Prompt</div>
              )}
            </div>
          </div>
        </Card>

        {/* ── RIGHT PANEL: AI Preview ── */}
        <Card className="create-panel create-preview-panel" styles={{body: {padding: 0}}}>
          <div className="create-panel-head">
            <Title level={4} style={{margin: '0 0 3px'}}>{t('previewTitle')}</Title>
            <Text type="secondary" style={{fontSize: 12}}>{t('previewDesc')}</Text>
          </div>

          <div className="create-preview-body">
            {/* AI State Banner */}
            <div className={`create-ai-state${aiState === 'generating' ? ' generating' : ''}`}>
              <span className="create-spark">✦</span>
              <div>
                {aiState === 'generating' ? (
                  <>
                    <b>{t('generating')}</b>
                    <div><small style={{color: '#6b7280'}}>{t('generatingHint')}</small></div>
                  </>
                ) : aiState === 'done' ? (
                  <>
                    <b>{t('generated')}</b>
                    <div><small style={{color: '#6b7280'}}>{t('generatedHint')}</small></div>
                  </>
                ) : (
                  <>
                    <b>{t('previewReady')}</b>
                    <div><small style={{color: '#6b7280'}}>{t('previewReadyHint')}</small></div>
                  </>
                )}
              </div>
            </div>

            {previewImageUrl && (
              <div className="create-image-preview-block">
                <div className="create-block-title">
                  <span>图片预览</span>
                  <span>{fileList.length} / 9</span>
                </div>
                <div className="create-image-preview-strip">
                  {fileList.map((file, index) => (
                    <button
                      key={file.uid}
                      type="button"
                      className={`create-image-preview-mini${previewImageUrl === file.url ? ' active' : ''}`}
                      style={file.url
                        ? {backgroundImage: `url(${file.url})`, backgroundSize: 'cover', backgroundPosition: 'center'}
                        : undefined}
                      onClick={() => {
                        setActivePreviewUrl(file.url ?? null);
                        setPreviewVisible(true);
                      }}
                      aria-label={`Preview ${file.name}`}
                    >
                      <span className="create-image-preview-order">{index + 1}</span>
                    </button>
                  ))}
                </div>
                <div style={{display: 'none'}}>
                  <Image.PreviewGroup
                    preview={{
                      visible: previewVisible,
                      current: Math.max(0, fileList.findIndex((file) => file.url === previewImageUrl)),
                      onVisibleChange: setPreviewVisible,
                      onChange: (current) => {
                        const nextUrl = fileList[current]?.url ?? null;
                        setActivePreviewUrl(nextUrl);
                      },
                    }}
                  >
                    {fileList.map((file) => (
                      <Image key={file.uid} src={file.url} alt={file.name} />
                    ))}
                  </Image.PreviewGroup>
                </div>
              </div>
            )}

            {/* Result Blocks */}
            {result ? (
              <>
                {/* Title */}
                <div className="create-result-block">
                  <div className="create-block-title">
                    <span>{t('resultTitle')}</span>
                    <span>{result.title.length} {t('charUnit')}</span>
                  </div>
                  <Title level={5} style={{margin: 0, fontSize: 15, lineHeight: 1.45}}>
                    {result.title}
                  </Title>
                </div>

                {/* Content */}
                <div className="create-result-block">
                  <div className="create-block-title">
                    <span>{t('resultContent')}</span>
                    <span>{result.content.length} {t('charUnit')}</span>
                  </div>
                  <Paragraph style={{margin: 0, color: '#475569', lineHeight: 1.8}}>
                    {result.content}
                  </Paragraph>
                </div>

                {/* Tags */}
                <div className="create-result-block">
                  <div className="create-block-title">
                    <span>{t('resultTags')}</span>
                    <span>{result.tags.length} {t('tagUnit')}</span>
                  </div>
                  <div className="create-tags">
                    {result.tags.map((tag) => (
                      <span key={tag} className="create-tag">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Cover Text */}
                <div className="create-result-block">
                  <div className="create-block-title">
                    <span>{t('resultCoverText')}</span>
                    <span>{t('suggestion')}</span>
                  </div>
                  <div className="create-cover-text">{result.coverText}</div>
                </div>
              </>
            ) : (
              <div className="create-empty-preview">
                <div className="create-empty-icon">✦</div>
                <p>{previewImageUrl ? '图片素材已就绪，点击生成后这里会出现文案结果。' : t('emptyPreview')}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="create-sticky-footer">
        <Space size={10}>
          <Button
            className="create-footer-btn"
            onClick={handleClear}
          >
            {t('clearBtn')}
          </Button>
          {result && (
            <Button
              className="create-footer-btn"
              onClick={handleCopyAll}
            >
              {t('copyAllBtn')}
            </Button>
          )}
          <Button
            type="primary"
            className="create-footer-primary"
            loading={isGenerating}
            onClick={handleGenerate}
            icon={<span style={{marginRight: 4}}>✦</span>}
          >
            {t('generateBtn')}
          </Button>
        </Space>
      </div>
    </>
  );
}
