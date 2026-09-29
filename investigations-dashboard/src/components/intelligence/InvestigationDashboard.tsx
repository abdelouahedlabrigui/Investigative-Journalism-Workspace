import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import TextToSpeech, {
  cleanTextForSpeech,
  splitTextIntoSentences,
} from '../../speech/TextToSpeech';

// Types
type SteeringControls = {
  bias_angle: string;
  tone_selector: string;
  temperature: number;
  top_p: number;
  context_window_depth: number;
};

type Investigation = {
  _id: string;
  title: string;
  target_trend: string;
  raw_notes?: string;
  source_urls?: string[];
  external_info_prompt?: string;
  steering: SteeringControls;
  generated_report?: string | null;
  created_at: string;
  updated_at: string;
};

type InvestigationApiResponse = {
  _id?: string;
  video_id?: string;
  investigation_title?: string;
  title?: string;
  target_trend?: string;
  raw_notes?: string;
  source_urls?: string[];
  external_info_prompt?: string;
  steering_controls?: Partial<SteeringControls>;
  transcript?: {
    video_id?: string;
    text?: string;
  };
  extracted_fields?: {
    investigation_title?: string;
    target_trend?: string;
    raw_notes?: string;
    source_urls?: string[];
    external_info_prompt?: string;
    steering_controls?: Partial<SteeringControls>;
  };
  created_at?: string;
  updated_at?: string;
};

type SSEData = {
  token: string;
  is_finished: boolean;
};

const InvestigationDashboard: React.FC = () => {
  // State management
  const [investigations, setInvestigations] = useState<Investigation[]>(() => {
    const saved = localStorage.getItem('investigations');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newInvestigation, setNewInvestigation] = useState<Omit<Investigation, '_id' | 'created_at' | 'updated_at' | 'generated_report'>>({
    title: '',
    target_trend: '',
    raw_notes: '',
    source_urls: [],
    external_info_prompt: '',
    steering: {
      bias_angle: '',
      tone_selector: '',
      temperature: 0.7,
      top_p: 0.9,
      context_window_depth: 5
    }
  });
  const [videoIdInput, setVideoIdInput] = useState('AuHxT_cIhy8');
  const [urlInput, setUrlInput] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [investigationToDelete, setInvestigationToDelete] = useState<string | null>(null);
  const [isReportFullScreen, setIsReportFullScreen] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const reportText = isStreaming
    ? streamContent
    : selectedInvestigation?.generated_report ?? '';
  const reportSentences = splitTextIntoSentences(cleanTextForSpeech(reportText));
  const activeSentence = activeSentenceIndex === null
    ? null
    : reportSentences[activeSentenceIndex] ?? null;

  const highlightChildren = (children: React.ReactNode): React.ReactNode => React.Children.map(
    children,
    child => {
      if (typeof child !== 'string' || !activeSentence) return child;

      const sentenceStart = child.indexOf(activeSentence);
      if (sentenceStart < 0) return child;

      const before = child.slice(0, sentenceStart);
      const spoken = child.slice(sentenceStart, sentenceStart + activeSentence.length);
      const after = child.slice(sentenceStart + activeSentence.length);

      return (
        <>
          {before}
          <Box
            component="span"
            sx={{
              backgroundColor: '#000',
              color: '#fff',
              borderRadius: 0.5,
              px: 0.5,
            }}
          >
            {spoken}
          </Box>
          {after}
        </>
      );
    }
  );

  const renderSpeechAwareReport = () => {
    const markdownComponents = activeSentence
      ? {
        p: ({ children }: { children?: React.ReactNode }) => <p>{highlightChildren(children)}</p>,
        h1: ({ children }: { children?: React.ReactNode }) => <h1>{highlightChildren(children)}</h1>,
        h2: ({ children }: { children?: React.ReactNode }) => <h2>{highlightChildren(children)}</h2>,
        h3: ({ children }: { children?: React.ReactNode }) => <h3>{highlightChildren(children)}</h3>,
        h4: ({ children }: { children?: React.ReactNode }) => <h4>{highlightChildren(children)}</h4>,
        h5: ({ children }: { children?: React.ReactNode }) => <h5>{highlightChildren(children)}</h5>,
        h6: ({ children }: { children?: React.ReactNode }) => <h6>{highlightChildren(children)}</h6>,
        li: ({ children }: { children?: React.ReactNode }) => <li>{highlightChildren(children)}</li>,
        blockquote: ({ children }: { children?: React.ReactNode }) => (
          <blockquote>{highlightChildren(children)}</blockquote>
        ),
        td: ({ children }: { children?: React.ReactNode }) => <td>{highlightChildren(children)}</td>,
        th: ({ children }: { children?: React.ReactNode }) => <th>{highlightChildren(children)}</th>,
      }
      : undefined;

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {reportText || 'Generating report...'}
      </ReactMarkdown>
    );
  };

  // Save to localStorage whenever investigations change
  useEffect(() => {
    localStorage.setItem('investigations', JSON.stringify(investigations));
  }, [investigations]);

  // API base URL - replace with your actual API URL
  const API_BASE_URL = 'http://localhost:8000/api/v1';

  // Fetch all investigations
  const fetchInvestigations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/investigations/?limit=20`);
      if (!response.ok) throw new Error('Failed to fetch investigations');
      const data = await response.json();
      setInvestigations(data);
    } catch (error) {
      showSnackbar('Failed to load investigations', 'error');
      console.error('Error fetching investigations:', error);
    }
  }, []);

  // Search investigations
  const searchInvestigations = useCallback(async (term: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/investigations/search?search=${term}&skip=0&limit=20`);
      if (!response.ok) throw new Error('Failed to search investigations');
      const data = await response.json();
      setInvestigations(data);
    } catch (error) {
      showSnackbar('Search failed', 'error');
      console.error('Error searching investigations:', error);
    }
  }, []);

  const applyInvestigationPayload = (payload: InvestigationApiResponse) => {
    const extracted = payload.extracted_fields ?? payload;
    const steeringControls = extracted.steering_controls ?? payload.steering_controls ?? {};

    setNewInvestigation({
      title: extracted.investigation_title ?? payload.investigation_title ?? payload.title ?? '',
      target_trend: extracted.target_trend ?? payload.target_trend ?? '',
      raw_notes: extracted.raw_notes ?? payload.raw_notes ?? '',
      source_urls: extracted.source_urls ?? payload.source_urls ?? [],
      external_info_prompt: extracted.external_info_prompt ?? payload.external_info_prompt ?? '',
      steering: {
        bias_angle: steeringControls.bias_angle ?? '',
        tone_selector: steeringControls.tone_selector ?? '',
        temperature: steeringControls.temperature ?? 0.7,
        top_p: steeringControls.top_p ?? 0.9,
        context_window_depth: steeringControls.context_window_depth ?? 5,
      }
    });
  };

  // Persist the populated form in the investigations database.
  const createInvestigation = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/investigations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          investigation_title: newInvestigation.title,
          target_trend: newInvestigation.target_trend,
          raw_notes: newInvestigation.raw_notes,
          source_urls: newInvestigation.source_urls,
          external_info_prompt: newInvestigation.external_info_prompt,
          steering_controls: newInvestigation.steering
        }),
      });

      if (!response.ok) throw new Error('Failed to create investigation');
      const data: InvestigationApiResponse = await response.json();
      if (!data._id) {
        throw new Error('Create response did not include a persisted investigation ID');
      }

      const extracted = data.extracted_fields ?? data;
      const steeringControls = extracted.steering_controls ?? data.steering_controls ?? {};
      const now = new Date().toISOString();
      const savedInvestigation: Investigation = {
        _id: data._id,
        title: extracted.investigation_title ?? data.investigation_title ?? data.title ?? newInvestigation.title,
        target_trend: extracted.target_trend ?? data.target_trend ?? newInvestigation.target_trend,
        raw_notes: extracted.raw_notes ?? data.raw_notes ?? newInvestigation.raw_notes,
        source_urls: extracted.source_urls ?? data.source_urls ?? newInvestigation.source_urls,
        external_info_prompt: extracted.external_info_prompt ?? data.external_info_prompt ?? newInvestigation.external_info_prompt,
        steering: {
          bias_angle: steeringControls.bias_angle ?? newInvestigation.steering.bias_angle,
          tone_selector: steeringControls.tone_selector ?? newInvestigation.steering.tone_selector,
          temperature: steeringControls.temperature ?? newInvestigation.steering.temperature,
          top_p: steeringControls.top_p ?? newInvestigation.steering.top_p,
          context_window_depth: steeringControls.context_window_depth ?? newInvestigation.steering.context_window_depth,
        },
        generated_report: null,
        created_at: data.created_at ?? now,
        updated_at: data.updated_at ?? now,
      };
      setInvestigations(prev => [savedInvestigation, ...prev]);
      setIsCreating(false);
      showSnackbar('Investigation created successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to create investigation', 'error');
      console.error('Error creating investigation:', error);
    }
  };
  // Start streaming report
  const startStreaming = async (investigationId: string) => {
    setIsStreaming(true);
    setStreamContent('');
    setSelectedInvestigation(prev => prev ? { ...prev, generated_report: '' } : null);

    try {
      const response = await fetch(`${API_BASE_URL}/investigations/${investigationId}/stream`, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Streaming request failed (${response.status})${details ? `: ${details}` : ''}`);
      }
      if (!response.body) throw new Error('Streaming response has no body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let report = '';

      const processEvent = (event: string) => {
        const data = event
          .split(/\r?\n/)
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).replace(/^ /, ''))
          .join('\n');
        if (!data) return;

        const parsed: unknown = JSON.parse(data);
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          !('token' in parsed) ||
          typeof parsed.token !== 'string'
        ) {
          throw new Error('Received an invalid report stream event');
        }

        const streamData = parsed as SSEData;
        report += streamData.token;
        setStreamContent(report);
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });

        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? '';
        events.forEach(processEvent);

        if (done) {
          if (buffer.trim()) processEvent(buffer);
          break;
        }
      }

      setInvestigations(prev => prev.map(inv =>
        inv._id === investigationId ? { ...inv, generated_report: report } : inv
      ));
      setSelectedInvestigation(prev =>
        prev?._id === investigationId ? { ...prev, generated_report: report } : prev
      );
      setIsStreaming(false);
      showSnackbar('Report generation complete', 'success');
    } catch (error) {
      setIsStreaming(false);
      showSnackbar('Streaming error occurred', 'error');
      console.error('Error starting stream:', error);
    }
  };

  // Get single investigation
  const getInvestigation = async (investigationId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/investigations/${investigationId}`);
      if (!response.ok) throw new Error('Failed to fetch investigation');
      const data = await response.json();
      setSelectedInvestigation(data);
    } catch (error) {
      showSnackbar('Failed to load investigation details', 'error');
      console.error('Error fetching investigation:', error);
    }
  };

  // Delete investigation
  const deleteInvestigation = async (investigationId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/investigations/${investigationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete investigation');

      setInvestigations(prev => prev.filter(inv => inv._id !== investigationId));
      if (selectedInvestigation?._id === investigationId) {
        setSelectedInvestigation(null);
      }
      showSnackbar('Investigation deleted', 'success');
    } catch (error) {
      showSnackbar('Failed to delete investigation', 'error');
      console.error('Error deleting investigation:', error);
    }
  };

  // Helper functions
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleAddUrl = () => {
    if (urlInput.trim() && !newInvestigation.source_urls?.includes(urlInput.trim())) {
      setNewInvestigation(prev => ({
        ...prev,
        source_urls: [...(prev.source_urls || []), urlInput.trim()]
      }));
      setUrlInput('');
    }
  };

  const handleRemoveUrl = (url: string) => {
    setNewInvestigation(prev => ({
      ...prev,
      source_urls: prev.source_urls?.filter(u => u !== url) || []
    }));
  };

  const handleCreateFromVideoId = async (videoId: string) => {
    const trimmedVideoId = videoId.trim();
    if (!trimmedVideoId) {
      showSnackbar('Please enter a video ID', 'error');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8100/api/v1/investigations/?video_id=${encodeURIComponent(trimmedVideoId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || 'Failed to create investigation from video');
      }

      const data: InvestigationApiResponse = await response.json();
      setVideoIdInput(trimmedVideoId);
      applyInvestigationPayload(data);
      setIsCreating(true);
      showSnackbar('Video investigation loaded', 'success');
    } catch (error) {
      showSnackbar('Failed to load investigation from video', 'error');
      console.error('Error loading investigation by video ID:', error);
    }
  };

  const handleDeleteInvestigation = () => {
    if (investigationToDelete) {
      deleteInvestigation(investigationToDelete);
      setOpenDeleteDialog(false);
      setInvestigationToDelete(null);
    }
  };

  // Render functions
  const renderInvestigationForm = () => (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        <AddIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Create New Investigation
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
        <TextField
          fullWidth
          label="Video ID"
          variant="outlined"
          value={videoIdInput}
          onChange={(e) => setVideoIdInput(e.target.value)}
          placeholder="AuHxT_cIhy8"
          helperText="Load values from the investigation API for a specific YouTube video"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleCreateFromVideoId(videoIdInput);
            }
          }}
          sx={{ flex: 1 }}
        />
        <Button
          variant="contained"
          onClick={() => handleCreateFromVideoId(videoIdInput)}
          sx={{ mt: 0.5 }}
        >
          Load API Data
        </Button>
      </Box>

      <TextField
        fullWidth
        label="Investigation Title"
        variant="outlined"
        value={newInvestigation.title}
        onChange={(e) => setNewInvestigation(prev => ({ ...prev, title: e.target.value }))}
        sx={{ mb: 2 }}
        required
      />

      <TextField
        fullWidth
        label="Target Trend"
        variant="outlined"
        value={newInvestigation.target_trend}
        onChange={(e) => setNewInvestigation(prev => ({ ...prev, target_trend: e.target.value }))}
        sx={{ mb: 2 }}
        required
        multiline
        rows={2}
      />

      <TextField
        fullWidth
        label="Raw Notes"
        variant="outlined"
        value={newInvestigation.raw_notes}
        onChange={(e) => setNewInvestigation(prev => ({ ...prev, raw_notes: e.target.value }))}
        sx={{ mb: 2 }}
        multiline
        rows={4}
        helperText="Interview notes, observations, or initial findings"
      />

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Source URLs
        </Typography>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={9}>
            <TextField
              fullWidth
              label="Add source URL"
              variant="outlined"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
            />
          </Grid>
          <Grid item xs={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
            >
              Add
            </Button>
          </Grid>
        </Grid>
        <Box sx={{ mt: 1 }}>
          {newInvestigation.source_urls?.map((url, index) => (
            <Chip
              key={index}
              label={url}
              onDelete={() => handleRemoveUrl(url)}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Box>
      </Box>

      <TextField
        fullWidth
        label="External Info Prompt"
        variant="outlined"
        value={newInvestigation.external_info_prompt}
        onChange={(e) => setNewInvestigation(prev => ({ ...prev, external_info_prompt: e.target.value }))}
        sx={{ mb: 2 }}
        multiline
        rows={2}
        helperText="Instructions for comparing with external sources"
      />

      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        <SettingsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Steering Controls
      </Typography>

      <TextField
        fullWidth
        label="Bias Angle"
        variant="outlined"
        value={newInvestigation.steering.bias_angle}
        onChange={(e) => setNewInvestigation(prev => ({
          ...prev,
          steering: { ...prev.steering, bias_angle: e.target.value }
        }))}
        InputProps={{ readOnly: true }}
        sx={{ mb: 2 }}
        helperText="This is populated from the API response when available"
      />

      <TextField
        fullWidth
        label="Tone Selector"
        variant="outlined"
        value={newInvestigation.steering.tone_selector}
        onChange={(e) => setNewInvestigation(prev => ({
          ...prev,
          steering: { ...prev.steering, tone_selector: e.target.value }
        }))}
        InputProps={{ readOnly: true }}
        sx={{ mb: 2 }}
        helperText="This is populated from the API response when available"
      />

      <Typography gutterBottom>Temperature: {newInvestigation.steering.temperature}</Typography>
      <Slider
        value={newInvestigation.steering.temperature}
        onChange={(e, value) => setNewInvestigation(prev => ({
          ...prev,
          steering: { ...prev.steering, temperature: value as number }
        }))}
        min={0.1}
        max={1.0}
        step={0.1}
        valueLabelDisplay="auto"
        sx={{ mb: 2 }}
      />

      <Typography gutterBottom>Top P: {newInvestigation.steering.top_p}</Typography>
      <Slider
        value={newInvestigation.steering.top_p}
        onChange={(e, value) => setNewInvestigation(prev => ({
          ...prev,
          steering: { ...prev.steering, top_p: value as number }
        }))}
        min={0.1}
        max={1.0}
        step={0.1}
        valueLabelDisplay="auto"
        sx={{ mb: 2 }}
      />

      <Typography gutterBottom>Context Window Depth: {newInvestigation.steering.context_window_depth}</Typography>
      <Slider
        value={newInvestigation.steering.context_window_depth}
        onChange={(e, value) => setNewInvestigation(prev => ({
          ...prev,
          steering: { ...prev.steering, context_window_depth: value as number }
        }))}
        min={1}
        max={10}
        step={1}
        valueLabelDisplay="auto"
        sx={{ mb: 3 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => setIsCreating(false)}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={createInvestigation}
          disabled={!newInvestigation.title || !newInvestigation.target_trend}
        >
          Create Investigation
        </Button>
      </Box>
    </Paper>
  );

  const renderInvestigationList = () => (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          <DescriptionIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Investigations
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setIsCreating(true)}
        >
          New Investigation
        </Button>
      </Box>

      <TextField
        fullWidth
        label="Search investigations"
        variant="outlined"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && searchInvestigations(searchTerm)}
        InputProps={{
          endAdornment: (
            <IconButton onClick={() => searchInvestigations(searchTerm)}>
              <SearchIcon />
            </IconButton>
          ),
        }}
        sx={{ mb: 2 }}
      />

      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={fetchInvestigations}
        sx={{ mb: 2 }}
      >
        Refresh List
      </Button>

      {investigations.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No investigations found. Create your first investigation to get started.
        </Typography>
      ) : (
        <List>
          {investigations.map((investigation) => (
            <React.Fragment key={investigation._id}>
              <ListItem
                secondaryAction={
                  <Box onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="View Details">
                      <IconButton
                        edge="end"
                        onClick={() => getInvestigation(investigation._id)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Generate Report">
                      <IconButton
                        edge="end"
                        onClick={() => startStreaming(investigation._id)}
                        disabled={isStreaming}
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        onClick={() => {
                          setInvestigationToDelete(investigation._id);
                          setOpenDeleteDialog(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                onClick={() => getInvestigation(investigation._id)}
              >
                <ListItemText
                  sx={{
                    // Reserves space on the right so text wraps before reaching the 3 buttons
                    pr: { xs: 14, sm: 18 },
                  }}
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {investigation.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {investigation.target_trend}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={`Bias: ${investigation.steering.bias_angle}`}
                          size="small"
                          sx={{ mr: 1, mb: 0.5 }}
                        />
                        <Chip
                          label={`Tone: ${investigation.steering.tone_selector}`}
                          size="small"
                          sx={{ mr: 1, mb: 0.5 }}
                        />
                        {investigation.generated_report && (
                          <Chip
                            label="Report Generated"
                            size="small"
                            color="success"
                            sx={{ mr: 1, mb: 0.5 }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Created: {new Date(investigation.created_at).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );

  const renderInvestigationDetails = () => {
    if (!selectedInvestigation) return null;

    return (
      <>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              <DescriptionIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              {selectedInvestigation.title}
            </Typography>
            <Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={() => startStreaming(selectedInvestigation._id)}
                disabled={isStreaming}
                sx={{ mr: 1 }}
              >
                {isStreaming ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setInvestigationToDelete(selectedInvestigation._id);
                  setOpenDeleteDialog(true);
                }}
              >
                Delete
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Investigation Details
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Target Trend:</strong> {selectedInvestigation.target_trend}
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
                    <strong>Steering Controls:</strong>
                  </Typography>
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body2">
                      <strong>Bias Angle:</strong> {selectedInvestigation.steering.bias_angle}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Tone:</strong> {selectedInvestigation.steering.tone_selector}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Temperature:</strong> {selectedInvestigation.steering.temperature}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Top P:</strong> {selectedInvestigation.steering.top_p}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Context Window Depth:</strong> {selectedInvestigation.steering.context_window_depth}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Created: {new Date(selectedInvestigation.created_at).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last Updated: {new Date(selectedInvestigation.updated_at).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <div className="row">
                    <div className="col">
                      <Typography variant="h6" gutterBottom>
                        Generated Report
                      </Typography>
                    </div>
                    <div className="col-sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TextToSpeech text={reportText} onSentenceChange={setActiveSentenceIndex} />
                      <Tooltip title="Open report full screen">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => setIsReportFullScreen(true)}
                            disabled={!reportText.trim()}
                            aria-label="Open report full screen"
                          >
                            <FullscreenIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </div>
                  </div>

                  {isStreaming && selectedInvestigation._id === selectedInvestigation?._id ? (
                    <Box sx={{ position: 'relative', minHeight: 200 }}>
                      <Box
                        sx={{
                          backgroundColor: '#f5f5f5',
                          p: 2,
                          borderRadius: 1,
                          minHeight: 200,
                          textAlign: "justify",
                          position: 'relative',
                          '& > *:first-of-type': { mt: 0 },
                          '& p': { mb: 1.5 },
                          '& ul, & ol': { pl: 3, mb: 1.5 },
                          '& pre': { backgroundColor: '#ececec', p: 1.5, borderRadius: 1, overflowX: 'auto' },
                          '& code': { fontFamily: 'monospace' },
                          '& table': { borderCollapse: 'collapse', width: '100%', mb: 1.5 },
                          '& th, & td': { border: '1px solid rgba(0,0,0,0.12)', p: 1 },
                        }}
                      >
                        {renderSpeechAwareReport()}
                        <CircularProgress
                          size={24}
                          sx={{
                            position: 'absolute',
                            bottom: 16,
                            right: 16,
                          }}
                        />
                      </Box>
                    </Box>
                  ) : selectedInvestigation.generated_report ? (
                    <Box
                      sx={{
                        backgroundColor: '#f5f5f5',
                        p: 2,
                        borderRadius: 1,
                        minHeight: 200,
                        maxHeight: 400,
                        overflow: 'auto',
                        '& > *:first-of-type': { mt: 0 },
                        '& p': { mb: 1.5 },
                        '& ul, & ol': { pl: 3, mb: 1.5 },
                        '& pre': { backgroundColor: '#ececec', p: 1.5, borderRadius: 1, overflowX: 'auto' },
                        '& code': { fontFamily: 'monospace' },
                        '& table': { borderCollapse: 'collapse', width: '100%', mb: 1.5 },
                        '& th, & td': { border: '1px solid rgba(0,0,0,0.12)', p: 1 },
                      }}
                    >
                      {renderSpeechAwareReport()}
                    </Box>
                  ) : (
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      No report generated yet. Click "Generate Report" to create one.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        <Dialog
          fullScreen
          open={isReportFullScreen}
          onClose={() => setIsReportFullScreen(false)}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5">Generated Report</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextToSpeech text={reportText} onSentenceChange={setActiveSentenceIndex} />
              <IconButton
                onClick={() => setIsReportFullScreen(false)}
                aria-label="Close full-screen report"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            <Box
              sx={{
                maxWidth: 1200,
                mx: 'auto',
                '& > *:first-of-type': { mt: 0 },
                '& p': { mb: 1.5 },
                '& ul, & ol': { pl: 3, mb: 1.5 },
                '& pre': { backgroundColor: '#ececec', p: 1.5, borderRadius: 1, overflowX: 'auto' },
                '& code': { fontFamily: 'monospace' },
                '& table': { borderCollapse: 'collapse', width: '100%', mb: 1.5 },
                '& th, & td': { border: '1px solid rgba(0,0,0,0.12)', p: 1 },
              }}
            >
              {renderSpeechAwareReport()}
            </Box>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        Investigative Journalism Workspace
      </Typography>

      {/* Main Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {isCreating ? renderInvestigationForm() : renderInvestigationList()}
        </Grid>

        <Grid item xs={12} md={8}>
          {selectedInvestigation ? renderInvestigationDetails() : (
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Select an investigation from the list to view details
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this investigation? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteInvestigation} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InvestigationDashboard;