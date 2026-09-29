import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import { ArrowForward as ArrowForwardIcon, Description as DescriptionIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';

interface InvestigationSummary {
  _id: string;
  investigation_title: string;
  target_trend?: string;
  transcript_summary?: string;
  source_urls?: string[];
  created_at?: string;
}

const API_BASE_URL = 'http://127.0.0.1:8100/api/v1';
const LATEST_INVESTIGATIONS_LIMIT = 6;

const isInvestigationSummary = (value: unknown): value is InvestigationSummary =>
  typeof value === 'object'
  && value !== null
  && '_id' in value
  && typeof value._id === 'string'
  && 'investigation_title' in value
  && typeof value.investigation_title === 'string';

const Home = () => {
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadLatestInvestigations = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/investigations/latest?limit=${LATEST_INVESTIGATIONS_LIMIT}`,
          {
            headers: { accept: '*/*' },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Unable to load investigations (HTTP ${response.status})`);
        }

        const payload: unknown = await response.json();
        const entries = Array.isArray(payload) ? payload : [payload];
        const latest = entries.filter(isInvestigationSummary);

        if (entries.length > 0 && latest.length === 0) {
          throw new Error('The investigations service returned data in an unexpected format.');
        }

        setInvestigations(latest);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load investigations.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadLatestInvestigations();
    return () => controller.abort();
  }, []);

  const sourceCount = investigations.reduce(
    (total, investigation) => total + (investigation.source_urls?.length ?? 0),
    0
  );

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: { xs: 3, md: 6 },
          mb: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f8ff 0%, #ffffff 70%)',
        }}
      >
        <Typography variant="overline" color="primary" sx={{ letterSpacing: 2 }}>
          Investigative Journalism Workspace
        </Typography>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mt: 1, mb: 2 }}>
          Welcome.
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 760, mb: 3 }}>
          Explore recent investigations, their emerging trends, and the sources behind each story.
        </Typography>
        <Button
          component={Link}
          to="/trends"
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          size="large"
        >
          Browse investigations
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Recent investigations', value: investigations.length },
          { label: 'Sources in recent results', value: sourceCount },
          {
            label: 'Summaries available',
            value: investigations.filter(item => Boolean(item.transcript_summary?.trim())).length,
          },
        ].map(stat => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>{stat.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            Latest investigations
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            A quick look at the latest work in your workspace.
          </Typography>
        </Box>
        <Button component={Link} to="/trends" endIcon={<ArrowForwardIcon />}>
          View all
        </Button>
      </Box>

      {loading ? (
        <Paper variant="outlined" sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress aria-label="Loading latest investigations" />
        </Paper>
      ) : investigations.length === 0 ? (
        <Paper variant="outlined" sx={{ p: { xs: 4, md: 6 }, textAlign: 'center', borderRadius: 2 }}>
          <DescriptionIcon color="disabled" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h6">No investigations to show yet</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Once investigations are available, they’ll appear here.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {investigations.map(investigation => (
            <Grid item xs={12} md={6} lg={4} key={investigation._id}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                    <DescriptionIcon color="primary" sx={{ mt: 0.25 }} />
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                      {investigation.investigation_title}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Target trend
                  </Typography>
                  <Typography sx={{ mb: 2, overflowWrap: 'anywhere' }}>
                    {investigation.target_trend || 'No target trend provided'}
                  </Typography>
                  {investigation.transcript_summary && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                        overflow: 'hidden',
                      }}
                    >
                      {investigation.transcript_summary}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 'auto' }}>
                    <Chip
                      size="small"
                      label={investigation.created_at
                        ? `Created ${new Date(investigation.created_at).toLocaleDateString()}`
                        : 'Date unavailable'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {investigation.source_urls?.length ?? 0} sources
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Home;
