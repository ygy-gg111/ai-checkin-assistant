'use client';

import {
  PlusOutlined,
  UploadOutlined
} from '@ant-design/icons';
import {App, Button, Card, Col, Input, Row, Space, Typography} from 'antd';
import type {UploadFile} from 'antd';
import {useTranslations} from 'next-intl';
import {useRef, useState} from 'react';

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

// Fake thumbnail previews (no real file needed)
const MOCK_IMAGES: UploadFile[] = [
  {uid: 'mock-1', name: 'swim-01.jpg', status: 'done'},
  {uid: 'mock-2', name: 'swim-02.jpg', status: 'done'},
];

// Mock result to display in preview
const MOCK_RESULT: GeneratedResult = {
  title: '下班后的 45 分钟，继续和水较劲',
  content:
    '今天是游泳打卡第 12 天。下班后还是去了泳池，主要练蛙泳腿。虽然还是不太走水，但比昨天轻松了一点。不励志，也不装自律，就当普通程序员给自己重启一下。',
  tags: ['#游泳打卡', '#普通程序员', '#坚持100天', '#下班后生活', '#小红书日常'],
  coverText: 'DAY 12 · 下班去游泳',
};

export function CreateCheckin() {
  const t = useTranslations('Create');
  const {message} = App.useApp();

  // Pre-filled with mock data so the UI is immediately visible
  const [fileList, setFileList] = useState<UploadFile[]>(MOCK_IMAGES);
  const [description, setDescription] = useState('今天练蛙泳，腿还是不怎么走水，不过感觉比昨天轻松一点。');
  const [topic, setTopic] = useState<Topic>('swimming');
  const [style, setStyle] = useState<Style>('natural');
  const [dayCount, setDayCount] = useState('12');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(MOCK_RESULT);
  const [aiState, setAiState] = useState<'idle' | 'ready' | 'generating' | 'done'>('done');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const descLength = description.length;

  // Simulate generating
  const handleGenerate = async () => {
    if (!description.trim()) {
      message.warning(t('descRequired'));
      return;
    }
    setIsGenerating(true);
    setAiState('generating');
    setResult(null);

    // Simulate AI call
    await new Promise((r) => setTimeout(r, 2000));

    setResult(MOCK_RESULT);
    setIsGenerating(false);
    setAiState('done');
    message.success(t('generateSuccess'));
  };

  const handleClear = () => {
    setDescription('');
    setFileList([]);
    setTopic('swimming');
    setStyle('natural');
    setDayCount('12');
    setResult(null);
    setAiState('ready');
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
    setFileList((prev) => prev.filter((f) => f.uid !== uid));
  };

  // Cover gradient colors per index
  const coverGradients = [
    'linear-gradient(145deg, #93c5fd, #c4b5fd)',
    'linear-gradient(145deg, #bae6fd, #6ee7b7)',
    'linear-gradient(145deg, #fdba74, #fda4af)',
    'linear-gradient(145deg, #86efac, #67e8f9)',
  ];

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
              <div
                className="create-drop-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  style={{display: 'none'}}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const newItems: UploadFile[] = files.slice(0, 9 - fileList.length).map((f, i) => ({
                      uid: `${Date.now()}-${i}`,
                      name: f.name,
                      status: 'done' as const,
                    }));
                    setFileList((prev) => [...prev, ...newItems]);
                    e.target.value = '';
                  }}
                />
                <div className="create-upload-icon">
                  <UploadOutlined style={{fontSize: 22}} />
                </div>
                <h3 style={{fontSize: 14, margin: '10px 0 2px'}}>{t('dropHint')}</h3>
                <p style={{margin: 0, color: '#6b7280', fontSize: 12}}>{t('dropFormats')}</p>

                {fileList.length > 0 && (
                  <div className="create-thumbs" onClick={(e) => e.stopPropagation()}>
                    {fileList.map((f, idx) => (
                      <div
                        key={f.uid}
                        className="create-thumb"
                        style={{background: coverGradients[idx % coverGradients.length]}}
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
                  {descLength} / 500
                </small>
              </label>
              <TextArea
                className="create-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder={t('descPlaceholder')}
                rows={4}
                style={{resize: 'none', borderRadius: 12, fontSize: 14}}
              />
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
                    value={`Day ${dayCount}`}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, '');
                      setDayCount(num || '1');
                    }}
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

            {/* Result Blocks */}
            {result ? (
              <>
                {/* Title */}
                <div className="create-result-block">
                  <div className="create-block-title">
                    <span>{t('resultTitle')}</span>
                    <span>{result.title.length} {t('charUnit')}</span>
                  </div>
                  <Title level={4} style={{margin: 0, fontSize: 17, lineHeight: 1.5}}>
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
                <p>{t('emptyPreview')}</p>
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
