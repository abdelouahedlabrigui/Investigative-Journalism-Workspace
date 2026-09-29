import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon,
  Fullscreen as FullscreenIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import TextToSpeech, {
  cleanTextForSpeech,
  splitTextIntoSentences,
} from '../../speech/TextToSpeech';

interface SteeringControls {
  bias_angle: string;
  tone_selector: string;
  temperature: number;
  top_p: number;
  context_window_depth: number;
}

interface Transcript {
  video_id: string;
  text: string;
}

interface ExtractedFields {
  investigation_title: string;
  target_trend: string;
  raw_notes: string;
  source_urls: string[];
  external_info_prompt: string;
  steering_controls: SteeringControls;
}

interface Investigation {
  _id: string;
  investigation_title: string;
  target_trend: string;
  raw_notes: string;
  source_urls: string[];
  external_info_prompt: string;
  steering_controls: SteeringControls;
  transcript: Transcript;
  transcript_summary: string;
  extracted_fields: ExtractedFields;
  created_at: string;
}

interface InvestigationListProps {
  apiBaseUrl?: string;
}

const InvestigationList: React.FC<InvestigationListProps> = ({
  apiBaseUrl = 'http://127.0.0.1:8100/api/v1'
}) => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [activeSpeech, setActiveSpeech] = useState<{ sectionKey: string; sentenceIndex: number } | null>(null);
  const [fullScreenContent, setFullScreenContent] = useState<string | null>(null);
  const [fullScreenSection, setFullScreenSection] = useState<{ key: string; title: string; isMarkdown: boolean } | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const fetchInvestigations = useCallback(async (endpoint: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${apiBaseUrl}${endpoint}`);
      const params = new URLSearchParams();

      if (endpoint.includes('latest')) {
        params.append('limit', limit.toString());
      } else {
        params.append('limit', limit.toString());
        params.append('offset', offset.toString());
      }

      url.search = params.toString();

      const response = await fetch(url.toString(), {
        headers: {
          'accept': '*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setInvestigations(Array.isArray(data) ? data : [data]);

      // For pagination, we'd normally get total count from headers or response
      // Since the API doesn't provide it, we'll estimate based on the response
      if (Array.isArray(data)) {
        setTotalCount(offset + data.length);
      } else {
        setTotalCount(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setInvestigations([]);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, limit, offset]);

  const fetchInvestigationById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/investigations/${id}`, {
        headers: {
          'accept': '*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSelectedInvestigation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setSelectedInvestigation(null);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  const loadLatest = useCallback(() => {
    fetchInvestigations('/investigations/latest');
  }, [fetchInvestigations]);

  const loadPaginated = useCallback(() => {
    fetchInvestigations('/investigations');
  }, [fetchInvestigations]);

  useEffect(() => {
    loadPaginated();
  }, [loadPaginated]);

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const openFullScreen = (content: string, sectionKey: string, title: string, isMarkdown: boolean) => {
    setFullScreenContent(content);
    setFullScreenSection({ key: sectionKey, title, isMarkdown });
    setIsFullScreen(true);
  };

  const closeFullScreen = () => {
    setIsFullScreen(false);
    setFullScreenContent(null);
    setFullScreenSection(null);
  };

  const CustomSyntaxHighlighter = SyntaxHighlighter as unknown as React.ElementType;

  const highlightChildren = (children: React.ReactNode, sentence: string | null): React.ReactNode =>
    React.Children.map(children, child => {
      if (typeof child !== 'string' || !sentence) return child;

      const sentenceStart = child.indexOf(sentence);
      if (sentenceStart < 0) return child;

      return (
        <>
          {child.slice(0, sentenceStart)}
          <Box
            component="span"
            sx={{ backgroundColor: '#000', color: '#fff', borderRadius: 0.5, px: 0.5 }}
          >
            {child.slice(sentenceStart, sentenceStart + sentence.length)}
          </Box>
          {child.slice(sentenceStart + sentence.length)}
        </>
      );
    });

  const renderMarkdown = (content: string, activeSentence: string | null = null) => {
    return (
      <ReactMarkdown
        components={{
          p: ({ children }) => <p>{highlightChildren(children, activeSentence)}</p>,
          h1: ({ children }) => <h1>{highlightChildren(children, activeSentence)}</h1>,
          h2: ({ children }) => <h2>{highlightChildren(children, activeSentence)}</h2>,
          h3: ({ children }) => <h3>{highlightChildren(children, activeSentence)}</h3>,
          h4: ({ children }) => <h4>{highlightChildren(children, activeSentence)}</h4>,
          h5: ({ children }) => <h5>{highlightChildren(children, activeSentence)}</h5>,
          h6: ({ children }) => <h6>{highlightChildren(children, activeSentence)}</h6>,
          li: ({ children }) => <li>{highlightChildren(children, activeSentence)}</li>,
          blockquote: ({ children }) => <blockquote>{highlightChildren(children, activeSentence)}</blockquote>,
          td: ({ children }) => <td>{highlightChildren(children, activeSentence)}</td>,
          th: ({ children }) => <th>{highlightChildren(children, activeSentence)}</th>,
          code({node, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            
            // If there is a language-xxx class, treat it as a code block
            return match ? (
              <CustomSyntaxHighlighter
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </CustomSyntaxHighlighter>
            ) : (
              // Otherwise, it's inline code
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const renderContentSection = (
    title: string,
    content: string,
    sectionKey: string,
    isMarkdown: boolean = false
  ) => {
    const isExpanded = expandedSections[sectionKey] || false;
    const activeSentence = activeSpeech?.sectionKey === sectionKey
      ? splitTextIntoSentences(cleanTextForSpeech(content))[activeSpeech.sentenceIndex] ?? null
      : null;

    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button
              onClick={() => toggleSection(sectionKey)}
              sx={{ justifyContent: 'flex-start', px: 0, fontWeight: 'bold' }}
            >
              {isExpanded ? '▼' : '▶'}&nbsp;{title}
            </Button>
            <Tooltip title={`Open ${title.toLowerCase()} full screen`}>
              <span>
                <IconButton
                  onClick={() => openFullScreen(content, sectionKey, title, isMarkdown)}
                  disabled={!content}
                  aria-label={`Open ${title.toLowerCase()} full screen`}
                >
                  <FullscreenIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          {isExpanded && (
            <Box
              sx={{
                mt: 1,
                maxHeight: 400,
                overflow: 'auto',
                overflowWrap: 'anywhere',
                '& > *:first-of-type': { mt: 0 },
                '& p': { mb: 1.5 },
                '& ul, & ol': { pl: 3, mb: 1.5 },
                '& pre': { backgroundColor: '#ececec', p: 1.5, borderRadius: 1, overflowX: 'auto' },
                '& code': { fontFamily: 'monospace' },
                '& table': { borderCollapse: 'collapse', width: '100%', mb: 1.5 },
                '& th, & td': { border: '1px solid rgba(0,0,0,0.12)', p: 1 },
              }}
            >
              {isMarkdown
                ? renderMarkdown(content, activeSentence)
                : <Typography component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {highlightChildren(content, activeSentence)}
                </Typography>}
              <TextToSpeech
                text={content}
                onSentenceChange={(index) => {
                  setActiveSpeech(current => index === null
                    ? current?.sectionKey === sectionKey ? null : current
                    : { sectionKey, sentenceIndex: index });
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderInvestigationDetails = (investigation: Investigation) => {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Tooltip title="Back to investigations">
            <IconButton onClick={() => setSelectedInvestigation(null)} aria-label="Back to investigations">
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h5" sx={{ fontWeight: 'bold', overflowWrap: 'anywhere' }}>
            <DescriptionIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            {investigation.investigation_title}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Investigation Details</Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Target Trend:</strong> {investigation.target_trend}
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
                  <strong>Steering Controls:</strong>
                </Typography>
                <Box sx={{ ml: 2 }}>
                  <Typography variant="body2"><strong>Bias Angle:</strong> {investigation.steering_controls.bias_angle}</Typography>
                  <Typography variant="body2"><strong>Tone:</strong> {investigation.steering_controls.tone_selector}</Typography>
                  <Typography variant="body2"><strong>Temperature:</strong> {investigation.steering_controls.temperature}</Typography>
                  <Typography variant="body2"><strong>Top P:</strong> {investigation.steering_controls.top_p}</Typography>
                  <Typography variant="body2"><strong>Context Window Depth:</strong> {investigation.steering_controls.context_window_depth}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Created: {new Date(investigation.created_at).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>

            {renderContentSection('Transcript Summary', investigation.transcript_summary, 'transcriptSummary', true)}
            {renderContentSection('Raw Notes', investigation.raw_notes, 'rawNotes', true)}
            {renderContentSection('External Info Prompt', investigation.external_info_prompt, 'externalInfoPrompt', true)}
          </Grid>

          <Grid item xs={12} md={6}>
            {renderContentSection('Transcript', investigation.transcript.text, 'transcript')}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Source URLs</Typography>
                {investigation.source_urls.length > 0 ? (
                  <List dense disablePadding>
                    {investigation.source_urls.map((url, index) => (
                      <ListItem key={`${url}-${index}`} disableGutters>
                        <ListItemText
                          primary={
                            <Typography component="a" href={url} target="_blank" rel="noopener noreferrer" sx={{ overflowWrap: 'anywhere' }}>
                              {url}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">No source URLs available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        Investigative Journalism Workspace
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5">
                <DescriptionIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Investigations
              </Typography>
              <Button onClick={loadLatest} disabled={loading}>Latest</Button>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
              <Button
                size="small"
                onClick={() => handlePageChange(Math.max(0, offset - limit))}
                disabled={offset === 0 || loading}
              >
                Previous
              </Button>
              <Typography variant="caption" sx={{ flex: 1, textAlign: 'center' }}>
                Showing {totalCount === 0 ? 0 : offset + 1} - {Math.min(offset + limit, totalCount)} of {totalCount}
              </Typography>
              <Button
                size="small"
                onClick={() => handlePageChange(offset + limit)}
                disabled={offset + limit >= totalCount || loading}
              >
                Next
              </Button>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" component="label" htmlFor="investigation-page-size" sx={{ mr: 1 }}>
                Items per page
              </Typography>
              <select
                id="investigation-page-size"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={loading}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </Box>

            {error && <Typography color="error" role="alert" sx={{ mb: 2 }}>{error}</Typography>}

            {loading && investigations.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : investigations.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No investigations found.
              </Typography>
            ) : (
              <List disablePadding>
                {investigations.map((investigation, index) => (
                  <React.Fragment key={investigation._id}>
                    <ListItem
                      onClick={() => fetchInvestigationById(investigation._id)}
                      secondaryAction={
                        <Tooltip title="View Details">
                          <IconButton
                            edge="end"
                            aria-label={`View ${investigation.investigation_title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              fetchInvestigationById(investigation._id);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      }
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'action.hover' },
                        ...(selectedInvestigation?._id === investigation._id && { backgroundColor: 'action.selected' }),
                      }}
                    >
                      <ListItemText
                        sx={{ pr: 6 }}
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', overflowWrap: 'anywhere' }}>
                            {investigation.investigation_title}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                              {investigation.target_trend}
                            </Typography>
                            <Chip
                              label={`Created ${new Date(investigation.created_at).toLocaleDateString()}`}
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          </>
                        }
                      />
                    </ListItem>
                    {index < investigations.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {selectedInvestigation ? (
            renderInvestigationDetails(selectedInvestigation)
          ) : (
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Typography variant="h6" color="text.secondary">
                  Select an investigation from the list to view details
                </Typography>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>

      <Dialog
        fullScreen
        open={isFullScreen}
        onClose={closeFullScreen}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5">{fullScreenSection?.title ?? 'Full-screen content'}</Typography>
            {fullScreenContent && fullScreenSection && (
              <TextToSpeech
                text={fullScreenContent}
                onSentenceChange={(index) => {
                  const sectionKey = fullScreenSection.key;
                  setActiveSpeech(current => index === null
                    ? current?.sectionKey === sectionKey ? null : current
                    : { sectionKey, sentenceIndex: index });
                }}
              />
            )}
          </Box>
          <Button onClick={closeFullScreen}>Close</Button>
        </DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              maxWidth: 1200,
              mx: 'auto',
              overflowWrap: 'anywhere',
              '& > *:first-of-type': { mt: 0 },
              '& p': { mb: 1.5 },
              '& ul, & ol': { pl: 3, mb: 1.5 },
              '& pre': { backgroundColor: '#ececec', p: 1.5, borderRadius: 1, overflowX: 'auto' },
              '& code': { fontFamily: 'monospace' },
              '& table': { borderCollapse: 'collapse', width: '100%', mb: 1.5 },
              '& th, & td': { border: '1px solid rgba(0,0,0,0.12)', p: 1 },
            }}
          >
            {fullScreenContent && fullScreenSection?.isMarkdown
              ? renderMarkdown(
                fullScreenContent,
                activeSpeech && activeSpeech.sectionKey === fullScreenSection.key
                  ? splitTextIntoSentences(cleanTextForSpeech(fullScreenContent))[activeSpeech.sentenceIndex] ?? null
                  : null
              )
              : fullScreenContent && (
                <Typography component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {highlightChildren(
                    fullScreenContent,
                    activeSpeech && fullScreenSection && activeSpeech.sectionKey === fullScreenSection.key
                      ? splitTextIntoSentences(cleanTextForSpeech(fullScreenContent))[(activeSpeech).sentenceIndex] ?? null
                      : null
                  )}
                </Typography>
              )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default InvestigationList;