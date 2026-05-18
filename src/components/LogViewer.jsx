import React, { useRef, useState, useMemo } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Box, Autocomplete, TextField, Checkbox, ListItemText, Chip, Collapse, IconButton } from '@mui/material';
import { ViewerContainer, LogBox } from './LogViewer.styled';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const OPERATION_OPTIONS = [
  'insert', 'update', 'delete', 'replace', 'drop', 'rename', 'invalidate'
];
const OPERATION_COLORS = {
  insert: 'success',
  update: 'info',
  replace: 'primary',
  delete: 'error',
  drop: 'warning',
  rename: 'secondary',
  invalidate: 'default',
};

const DETAIL_ACTIONS = ['insert', 'update', 'replace'];

const LogViewer = ({ connectionInfo, dbType, collections: propCollections, logs, logError, onClearLog, selectedOps, setSelectedOps, selectedCols, setSelectedCols, searchId, setSearchId, timezoneOffset = 0, paused = false, pausedSnapshot = null, newSincePause = 0, onTogglePause }) => {
  const [clearAnim, setClearAnim] = useState(false);
  const logRef = useRef();

  const settingName = connectionInfo && connectionInfo.settingName ? connectionInfo.settingName : '';
  const dbName = connectionInfo && connectionInfo.database ? connectionInfo.database : '';

  const collections = propCollections || [];
  const [openDetail, setOpenDetail] = useState({});

  const handleToggleDetail = uid => {
    setOpenDetail(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const sourceLogs = paused && pausedSnapshot ? pausedSnapshot : (logs || []);

  const filteredLogs = useMemo(() => {
    const needle = (searchId || '').trim().toLowerCase();
    const filtered = sourceLogs.filter(log => {
      if (selectedOps.length && !selectedOps.includes(log.operation)) return false;
      if (selectedCols.length && !selectedCols.includes(log.collection)) return false;
      if (needle && !String(log._id ?? '').toLowerCase().includes(needle)) return false;
      return true;
    });
    return filtered.slice().reverse();
  }, [sourceLogs, selectedOps, selectedCols, searchId]);

  const sortedCollections = useMemo(() => {
    if (!collections.length) return [];
    const selected = collections.filter(c => selectedCols.includes(c));
    const unselected = collections.filter(c => !selectedCols.includes(c));
    return [...selected, ...unselected];
  }, [collections, selectedCols]);

  const renderMultiSelectValue = (selected, options) => {
    if (selected.length === 0) return '';
    if (selected.length === 1) return selected[0];
    return `${selected.length} selected`;
  };

  const handleClearLog = () => {
    setClearAnim(true);
    setTimeout(() => {
      if (onClearLog) onClearLog();
      setClearAnim(false);
    }, 200);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const local = new Date(date.getTime() + timezoneOffset * 60 * 60 * 1000);
    const pad = n => n.toString().padStart(2, '0');
    return `${local.getUTCFullYear()}-${pad(local.getUTCMonth()+1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
  };

  return (
    <ViewerContainer>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2, mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
          {settingName && (
            <span style={{
              background: '#e3f2fd',
              color: '#1976d2',
              fontWeight: 700,
              borderRadius: 6,
              padding: '2px 10px',
              margin: '0 8px',
              fontSize: 18
            }}>{settingName}</span>
          )}
          {dbName && (
            <span style={{
              background: '#fff3e0',
              color: '#e65100',
              fontWeight: 700,
              borderRadius: 6,
              padding: '2px 10px',
              margin: '0 8px',
              fontSize: 18
            }}>{dbName}</span>
          )}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Autocomplete
            multiple
            options={OPERATION_OPTIONS}
            value={selectedOps}
            onChange={(_, v) => setSelectedOps(v)}
            disableCloseOnSelect
            getOptionLabel={option => option}
            renderOption={(props, option, { selected }) => (
              <li
                {...props}
                style={{
                  background: selected ? '#1976d2' : '#23272f',
                  color: selected ? '#fff' : '#e3eaf3',
                  fontWeight: selected ? 600 : undefined,
                  borderBottom: '1px solid #222',
                  ...props.style,
                }}
              >
                <Checkbox checked={selected} size="small" sx={{ mr: 1, color: '#90caf9' }} />
                <ListItemText primary={option} />
              </li>
            )}
            renderInput={params => <TextField {...params} label="Operation" size="small" 
              sx={{
                '& .MuiInputBase-root': {
                  background: '#23272f',
                  color: '#e3eaf3',
                  borderColor: '#333',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#333',
                },
                '& .MuiInputLabel-root': {
                  color: '#b0b8c1',
                },
                '& .MuiChip-root': {
                  background: '#232b36',
                  color: '#90caf9',
                },
              }}
            />}
            renderTags={(selected) => renderMultiSelectValue(selected, OPERATION_OPTIONS)}
            sx={{ minWidth: 180, maxWidth: '100%', flex: 1, pl: 2 }}
            slotProps={{
              paper: {
                sx: {
                  background: '#23272f',
                  color: '#e3eaf3',
                  '&::-webkit-scrollbar': {
                    width: '10px',
                    background: '#23272f',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#3a3f4b',
                    borderRadius: '8px',
                    border: '2px solid #23272f',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#50576a',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#23272f',
                    borderRadius: '8px',
                  },
                }
              }
            }}
          />
          <Autocomplete
            multiple
            options={sortedCollections}
            value={selectedCols}
            onChange={(_, v) => setSelectedCols(v)}
            disableCloseOnSelect
            getOptionLabel={option => option}
            renderOption={(props, option, { selected }) => (
              <li
                {...props}
                style={{
                  background: selected ? '#1976d2' : '#23272f',
                  color: selected ? '#fff' : '#e3eaf3',
                  fontWeight: selected ? 600 : undefined,
                  borderBottom: '1px solid #222',
                  ...props.style,
                }}
              >
                <Checkbox checked={selected} size="small" sx={{ mr: 1, color: '#90caf9' }} />
                <ListItemText primary={option} />
              </li>
            )}
            renderInput={params => <TextField {...params} label="Collection" size="small" 
              sx={{
                '& .MuiInputBase-root': {
                  background: '#23272f',
                  color: '#e3eaf3',
                  borderColor: '#333',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#333',
                },
                '& .MuiInputLabel-root': {
                  color: '#b0b8c1',
                },
                '& .MuiChip-root': {
                  background: '#232b36',
                  color: '#90caf9',
                },
              }}
            />}
            renderTags={(selected) => renderMultiSelectValue(selected, sortedCollections)}
            sx={{ minWidth: 180, maxWidth: '100%', flex: 1 }}
            slotProps={{
              paper: {
                sx: {
                  background: '#23272f',
                  color: '#e3eaf3',
                  '&::-webkit-scrollbar': {
                    width: '10px',
                    background: '#23272f',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#3a3f4b',
                    borderRadius: '8px',
                    border: '2px solid #23272f',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#50576a',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#23272f',
                    borderRadius: '8px',
                  },
                }
              }
            }}
          />
          <TextField
            label="Search ObjectId..."
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            size="small"
            sx={{ minWidth: 180, maxWidth: '100%', flex: 1, pr: 2 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1, ml: 2, pr: 2 }}>
            <button
              style={{
                background: paused ? '#ffa726' : '#546e7a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 18px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 15,
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={onTogglePause}
              title={paused ? 'Resume live log streaming' : 'Pause log display (logs continue to arrive in background)'}
            >
              {paused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
              {paused ? `Resume${newSincePause > 0 ? ` (+${newSincePause})` : ''}` : 'Pause'}
            </button>
            <button
              style={{
                background: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 32px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 15,
                height: 36,
                transition: 'transform 0.18s cubic-bezier(.4,2,.6,1)',
                transform: clearAnim ? 'scale(0.92)' : 'scale(1)',
                boxShadow: clearAnim ? '0 0 0 2px #f4433633' : undefined
              }}
              onClick={handleClearLog}
            >
              Clear log
            </button>
          </Box>
        </Box>
      </Box>
      {logError && <Alert severity="error">{logError}</Alert>}
      {paused && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, p: 1, background: 'rgba(255,167,38,0.12)', border: '1px solid rgba(255,167,38,0.5)', borderRadius: 1, color: '#ffa726', fontWeight: 600, fontSize: 14 }}>
          Paused — {newSincePause} new log{newSincePause === 1 ? '' : 's'} arrived in background. Click Resume to view.
        </Box>
      )}
      <LogBox ref={logRef}>
        <TableContainer component={Paper} sx={{ maxHeight: '100%', background: 'transparent', boxShadow: 'none', overflowY: 'auto' }}>
          <Table size="small" stickyHeader style={{ width: '100%' }}>
            <TableHead>
              <TableRow>
                <TableCell align="center">Operation</TableCell>
                <TableCell align="center">Collection</TableCell>
                <TableCell align="center">ObjectId</TableCell>
                <TableCell align="center">Time (UTC{timezoneOffset >= 0 ? `+${timezoneOffset}` : timezoneOffset})</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => {
                const canShowDetail = DETAIL_ACTIONS.includes(log.operation);
                const uid = log._uid;
                return (
                  <React.Fragment key={uid}>
                    <TableRow
                      hover={canShowDetail}
                      style={{ cursor: canShowDetail ? 'pointer' : undefined }}
                      onClick={canShowDetail ? () => handleToggleDetail(uid) : undefined}
                    >
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Chip
                            label={log.operation}
                            color={OPERATION_COLORS[log.operation] || 'default'}
                            size="small"
                            sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                          />
                          <Box sx={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {canShowDetail ? (
                              <IconButton
                                size="small"
                                sx={{ ml: 1, verticalAlign: 'middle', transition: 'transform 0.2s', transform: openDetail[uid] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                onClick={e => { e.stopPropagation(); handleToggleDetail(uid); }}
                              >
                                <ExpandMoreIcon />
                              </IconButton>
                            ) : null}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">{log.collection}</TableCell>
                      <TableCell align="center">{String(log._id)}</TableCell>
                      <TableCell align="center">{formatTime(log.time)}</TableCell>
                    </TableRow>
                    {canShowDetail && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ p: 0, background: '#2d3340', borderBottom: '1px solid #333' }}>
                          <Collapse in={!!openDetail[uid]} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, fontFamily: 'Fira Mono, Consolas, monospace', fontSize: 14, color: '#e3eaf3', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#2d3340' }}>
                              {JSON.stringify(log.fullDocument || log.updateDescription || log, null, 2)}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </LogBox>
    </ViewerContainer>
  );
};

export default LogViewer;